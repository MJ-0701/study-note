// PDF 자료 조회/메타데이터/필기 스냅샷 서비스 (DDD F-3: 업로드 상태머신은 MaterialUploadService 로 분리, 본 서비스는 read/query 책임).
import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AnnotationSnapshotRecord, PdfMaterialRecord } from "@study-note/domain";
import { toAnnotationSnapshotRecord, toPdfMaterialRecord } from "@study-note/persistence";
import { StoragePort } from "@study-note/storage";
import { PdfMaterialRepository } from "./pdf-material.repository";
import { AnnotationSnapshotRepository } from "../pdf-annotations/annotation-snapshot.repository";
import { materialNotFound, parseIsoDateOrThrow, requireObject } from "./material-shared";
import { annotationKey } from "../pdf-annotations/annotation-shared";

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

  async getAnnotation(
    ownerId: string,
    materialId: string
  ): Promise<AnnotationSnapshotRecord> {
    const material = await this.getUploadedMaterial(ownerId, materialId);
    const snapshot = await this.annotationRepo.findFull(material.id, ownerId);

    if (!snapshot) {
      return {
        materialId: material.id,
        ownerId,
        schemaVersion: 1,
        stickyNotes: [],
        inkStrokes: [],
        savedAt: material.updatedAt
      };
    }

    // payload SoT = R2 (DB row.payload 는 Hybrid CAS 가 JsonNull 기록). R2 에서 읽어 매핑.
    const obj = await this.storage.getJsonObject<{ payload: unknown }>(
      annotationKey(ownerId, material.id)
    );

    return toAnnotationSnapshotRecord({
      materialId: material.id,
      ownerId,
      payload: obj?.payload ?? null,
      savedAt: snapshot.savedAt
    });
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

function isMissingStorageObject(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  return name === "NoSuchKey" || /not found|missing/i.test(message);
}
