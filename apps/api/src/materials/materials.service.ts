// PDF 자료 조회/메타데이터/필기 스냅샷 서비스 (DDD F-3: 업로드 상태머신은 MaterialUploadService 로 분리, 본 서비스는 read/query 책임).
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  AnnotationSnapshotRecord,
  PdfInkStroke,
  PdfMaterialRecord,
  PdfStickyNote
} from "@study-note/domain";
import { toAnnotationPayload, toAnnotationSnapshotRecord, toPdfMaterialRecord } from "@study-note/persistence";
import { StoragePort } from "@study-note/storage";
import { PdfMaterialRepository } from "./pdf-material.repository";
import { AnnotationSnapshotRepository } from "./annotation-snapshot.repository";
import { materialNotFound, parseIsoDateOrThrow, requireObject } from "./material-shared";

interface SaveAnnotationInput {
  schemaVersion: 1;
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
}

interface UpdateMaterialMetadataInput {
  classDate: string;
}

@Injectable()
export class MaterialsService {
  // DDD Slice 7: PdfMaterial / AnnotationSnapshot query 는 repository 위임.
  constructor(
    private readonly storage: StoragePort,
    private readonly materialRepo: PdfMaterialRepository,
    private readonly annotationRepo: AnnotationSnapshotRepository
  ) {}

  async listMaterials(ownerId: string): Promise<PdfMaterialRecord[]> {
    const materials = await this.materialRepo.findAccessibleList(ownerId);

    return materials.map(toPdfMaterialRecord);
  }

  async getMaterial(ownerId: string, materialId: string): Promise<PdfMaterialRecord> {
    const material = await this.materialRepo.findAccessible(ownerId, materialId);

    if (!material) {
      throw materialNotFound();
    }

    return toPdfMaterialRecord(material);
  }

  async getDownload(ownerId: string, materialId: string) {
    const material = await this.getUploadedMaterial(ownerId, materialId);

    return {
      material,
      download: this.storage.createDownloadIntent(material)
    };
  }

  async updateMaterialMetadata(
    ownerId: string,
    materialId: string,
    input: UpdateMaterialMetadataInput
  ): Promise<PdfMaterialRecord> {
    const material = await this.getManageableMaterial(ownerId, materialId);
    const saved = await this.materialRepo.updateClassDate(
      material.id,
      parseIsoDateOrThrow(input.classDate, "classDate")
    );

    return toPdfMaterialRecord(saved);
  }

  async getFile(ownerId: string, materialId: string) {
    const material = await this.getUploadedMaterial(ownerId, materialId);
    const object = await this.readStoredObject(material);

    return {
      material,
      object
    };
  }

  async saveAnnotation(
    ownerId: string,
    materialId: string,
    input: SaveAnnotationInput
  ): Promise<AnnotationSnapshotRecord> {
    const material = await this.getUploadedMaterial(ownerId, materialId);
    const savedAt = new Date();
    const existing = await this.annotationRepo.findByMaterialOwner(material.id, ownerId);
    const snapshot = existing
      ? await this.annotationRepo.update(existing.id, {
          schemaVersion: input.schemaVersion,
          payload: toAnnotationPayload(input),
          savedAt
        })
      : await this.annotationRepo.create({
          materialId: material.id,
          ownerId,
          schemaVersion: input.schemaVersion,
          payload: toAnnotationPayload(input),
          savedAt
        });

    return toAnnotationSnapshotRecord(snapshot);
  }

  async getAnnotation(
    ownerId: string,
    materialId: string
  ): Promise<AnnotationSnapshotRecord> {
    const material = await this.getUploadedMaterial(ownerId, materialId);
    const snapshot = await this.annotationRepo.findByMaterialOwner(material.id, ownerId);

    return snapshot
      ? toAnnotationSnapshotRecord(snapshot)
      : {
          materialId: material.id,
          ownerId,
          schemaVersion: 1,
          stickyNotes: [],
          inkStrokes: [],
          savedAt: material.updatedAt
        };
  }

  async getExportBundle(ownerId: string, materialId: string) {
    const material = await this.getUploadedMaterial(ownerId, materialId);
    const annotation = await this.getAnnotation(ownerId, materialId);

    return this.storage.createExportBundle(material, annotation);
  }

  private async getUploadedMaterial(
    ownerId: string,
    materialId: string
  ): Promise<PdfMaterialRecord> {
    const material = await this.getMaterial(ownerId, materialId);

    if (material.uploadStatus !== "uploaded") {
      throw new ConflictException("PDF upload is not complete");
    }

    return material;
  }

  private async readStoredObject(material: PdfMaterialRecord) {
    try {
      return await this.storage.getObject(material);
    } catch (error) {
      if (isMissingStorageObject(error)) {
        throw new NotFoundException("PDF object not found");
      }

      throw new BadGatewayException("PDF storage read failed");
    }
  }

  private async getManageableMaterial(
    ownerId: string,
    materialId: string
  ): Promise<PdfMaterialRecord> {
    const material = await this.materialRepo.findAccessible(ownerId, materialId);

    if (!material) {
      throw materialNotFound();
    }

    return toPdfMaterialRecord(material);
  }
}

export function parseMaterialMetadataBody(body: unknown): UpdateMaterialMetadataInput {
  const input = requireObject(body);

  return {
    classDate: String(input.classDate ?? "")
  };
}

export function parseAnnotationBody(body: unknown): SaveAnnotationInput {
  const input = requireObject(body);
  const schemaVersion = Number(input.schemaVersion ?? 1);

  if (schemaVersion !== 1) {
    throw new BadRequestException("Only annotation schemaVersion 1 is supported");
  }

  return {
    schemaVersion,
    stickyNotes: Array.isArray(input.stickyNotes) ? (input.stickyNotes as PdfStickyNote[]) : [],
    inkStrokes: Array.isArray(input.inkStrokes) ? (input.inkStrokes as PdfInkStroke[]) : []
  };
}

function isMissingStorageObject(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  return name === "NoSuchKey" || /not found|missing/i.test(message);
}
