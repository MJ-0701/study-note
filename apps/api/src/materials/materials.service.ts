import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type {
  AnnotationSnapshotRecord,
  PdfInkStroke,
  PdfMaterialRecord,
  PdfStickyNote
} from "@study-note/domain";
import { PrismaService, toAnnotationPayload, toAnnotationSnapshotRecord, toPdfMaterialRecord } from "@study-note/persistence";
import { StoragePort } from "@study-note/storage";

interface CreateUploadIntentInput {
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: string;
}

interface SaveAnnotationInput {
  schemaVersion: 1;
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
}

interface UploadFileInput {
  body: Readable;
  contentType: string;
  contentLength: number;
}

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StoragePort
  ) {}

  async createUploadIntent(ownerId: string, input: CreateUploadIntentInput) {
    const now = new Date().toISOString();
    const materialId = randomUUID();
    const fileName = requirePdfFileName(input.fileName);
    const fileSize = requirePdfUploadFileSize(input.fileSize);
    const material = await this.prisma.pdfMaterial.create({
      data: {
        id: materialId,
        ownerId,
        subjectId: requireString(input.subjectId, "subjectId"),
        classDate: requireString(input.classDate, "classDate"),
        fileName,
        fileSize,
        pageCount: Math.max(
          1,
          Math.trunc(requirePositiveNumber(input.pageCount, "pageCount"))
        ),
        contentType: requirePdfContentType(input.contentType),
        storageKey: `users/${ownerId}/materials/${materialId}/${sanitizeFileName(fileName)}`,
        uploadStatus: "pending",
        createdAt: now,
        updatedAt: now
      }
    });
    const materialRecord = toPdfMaterialRecord(material);

    return {
      material: materialRecord,
      upload: await this.storage.createUploadIntent(materialRecord)
    };
  }

  async uploadFile(
    ownerId: string,
    materialId: string,
    input: UploadFileInput
  ): Promise<PdfMaterialRecord> {
    const material = await this.getMaterial(ownerId, materialId);
    const contentType = requirePdfContentType(input.contentType);
    const contentLength = requirePositiveNumber(input.contentLength, "contentLength");
    const maxBytes = getMaxPdfUploadBytes();

    if (contentLength > maxBytes) {
      throw new BadRequestException(`PDF upload exceeds ${maxBytes} bytes`);
    }

    if (contentLength !== material.fileSize) {
      throw new BadRequestException("contentLength must match material fileSize");
    }

    const { prefix, body } = await readPdfLeadingBytes(input.body, PDF_MAGIC_PREFIX.length);
    if (!prefix.equals(PDF_MAGIC_PREFIX)) {
      throw new BadRequestException({
        errorCode: "VALIDATION_ERROR",
        errorMessage: "PDF file body must start with %PDF-"
      });
    }

    await this.storage.putObject(material, {
      body: Readable.from(body),
      contentType,
      contentLength,
      maxBytes
    });

    const saved = await this.prisma.pdfMaterial.update({
      where: {
        id: material.id
      },
      data: {
        uploadStatus: "uploaded"
      }
    });

    return toPdfMaterialRecord(saved);
  }

  async completeUpload(ownerId: string, materialId: string): Promise<PdfMaterialRecord> {
    // Step 1: load material (owner scoping + soft-delete guard)
    const material = await this.prisma.pdfMaterial.findFirst({
      where: { id: materialId, ownerId, deletedAt: null }
    });

    if (!material) {
      throw new NotFoundException("PDF material not found");
    }

    // Step 2: idempotent — already uploaded, no headObject call needed
    if (material.uploadStatus === "uploaded") {
      this.logger.log(
        `materials.complete.noop reason=already-uploaded materialId=${materialId}`
      );
      return toPdfMaterialRecord(material);
    }

    // Step 3: headObject verify
    let headSize: number;
    try {
      const head = await this.storage.headObject(material.storageKey);
      headSize = head.contentLength;
    } catch (error) {
      // S3 NoSuchKey: object not yet PUT or was never uploaded
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `materials.complete.size-mismatch declared=${material.fileSize} actual=not-found materialId=${materialId} reason=${msg}`
      );
      throw new ConflictException({
        errorCode: "UPLOAD_NOT_FOUND",
        errorMessage: "S3 object not found. The file may not have been uploaded yet."
      });
    }

    if (headSize !== material.fileSize) {
      this.logger.warn(
        `materials.complete.size-mismatch declared=${material.fileSize} actual=${headSize} materialId=${materialId}`
      );
      throw new ConflictException({
        errorCode: "UPLOAD_SIZE_MISMATCH",
        errorMessage: `File size mismatch: declared ${material.fileSize}, actual ${headSize}`
      });
    }

    // Step 4: race-safe conditional update (updateMany where uploadStatus=pending)
    // Returns {count: 0|1}. count=0 means another concurrent call already transitioned.
    const { count } = await this.prisma.pdfMaterial.updateMany({
      where: { id: materialId, uploadStatus: "pending", deletedAt: null },
      data: { uploadStatus: "uploaded" }
    });

    if (count === 0) {
      // Another concurrent call already transitioned → re-fetch and return current state
      this.logger.log(
        `materials.complete.noop reason=already-uploaded(race) materialId=${materialId}`
      );
    } else {
      this.logger.log(
        `materials.complete.transitioned materialId=${materialId} from=pending to=uploaded headObjectSize=${headSize}`
      );
    }

    const updated = await this.prisma.pdfMaterial.findFirst({
      where: { id: materialId, ownerId, deletedAt: null }
    });

    if (!updated) {
      throw new NotFoundException("PDF material not found after transition");
    }

    return toPdfMaterialRecord(updated);
  }

  async listMaterials(ownerId: string): Promise<PdfMaterialRecord[]> {
    const materials = await this.prisma.pdfMaterial.findMany({
      where: {
        ownerId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return materials.map(toPdfMaterialRecord);
  }

  async getMaterial(ownerId: string, materialId: string): Promise<PdfMaterialRecord> {
    const material = await this.prisma.pdfMaterial.findFirst({
      where: {
        id: materialId,
        ownerId,
        deletedAt: null
      }
    });

    if (!material) {
      throw new NotFoundException("PDF material not found");
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
    const material = await this.getMaterial(ownerId, materialId);
    const savedAt = new Date();
    const snapshot = await this.prisma.annotationSnapshot.upsert({
      where: {
        materialId: material.id
      },
      update: {
        ownerId,
        schemaVersion: input.schemaVersion,
        payload: toAnnotationPayload(input),
        savedAt
      },
      create: {
        materialId: material.id,
        ownerId,
        schemaVersion: input.schemaVersion,
        payload: toAnnotationPayload(input),
        savedAt
      }
    });

    return toAnnotationSnapshotRecord(snapshot);
  }

  async getAnnotation(
    ownerId: string,
    materialId: string
  ): Promise<AnnotationSnapshotRecord> {
    const material = await this.getMaterial(ownerId, materialId);
    const snapshot = await this.prisma.annotationSnapshot.findUnique({
      where: {
        materialId: material.id
      }
    });

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
}

export function parseUploadIntentBody(body: unknown): CreateUploadIntentInput {
  const input = requireObject(body);

  return {
    subjectId: String(input.subjectId ?? ""),
    classDate: String(input.classDate ?? ""),
    fileName: String(input.fileName ?? ""),
    fileSize: Number(input.fileSize ?? 0),
    pageCount: Number(input.pageCount ?? 1),
    contentType: String(input.contentType ?? "application/pdf")
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

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new BadRequestException("Request body is required");
  }

  return value as Record<string, unknown>;
}

function requireString(value: string, name: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new BadRequestException(`${name} is required`);
  }

  return trimmed;
}

function requirePdfFileName(value: string): string {
  const fileName = requireString(value, "fileName");

  if (!fileName.toLowerCase().endsWith(".pdf")) {
    throw new BadRequestException("fileName must be a PDF");
  }

  return fileName;
}

function requirePdfContentType(value: string): string {
  const contentType = ((value.trim().toLowerCase() || "application/pdf")
    .split(";")[0] ?? "application/pdf")
    .trim();

  if (contentType !== "application/pdf") {
    throw new BadRequestException("contentType must be application/pdf");
  }

  return contentType;
}

function requirePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`${name} must be positive`);
  }

  return value;
}

function requireAllowedFileSize(fileSize: number): void {
  const maxBytes = getMaxPdfUploadBytes();

  if (fileSize > maxBytes) {
    throw new BadRequestException(`fileSize exceeds ${maxBytes} bytes`);
  }
}

function requirePdfUploadFileSize(fileSize: number): number {
  if (!Number.isFinite(fileSize) || fileSize < 5) {
    throw new BadRequestException({
      errorCode: "VALIDATION_ERROR",
      errorMessage: "fileSize must be at least 5 bytes for PDF magic check"
    });
  }

  requireAllowedFileSize(fileSize);
  return fileSize;
}

const PDF_MAGIC_PREFIX = Buffer.from("%PDF-");

async function readPdfLeadingBytes(
  stream: Readable,
  byteCount: number
): Promise<{ prefix: Buffer; body: Buffer }> {
  // sprint-3 round 5 fix: body 전체를 buffer 로 read (max contentLength 가 이미 검증됨,
  // PDF_UPLOAD_MAX_BYTES 보호). prefix 는 첫 byteCount bytes, body 는 전체 (storage 에 그대로
  // 저장). 이전 PassThrough split 패턴은 storage 에 prefix 가 빠져 download mismatch 발생.
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const prefix = body.subarray(0, byteCount);
  return { prefix, body };
}

function getMaxPdfUploadBytes(): number {
  const value = Number(process.env.PDF_UPLOAD_MAX_BYTES ?? 25 * 1024 * 1024);

  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 25 * 1024 * 1024;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isMissingStorageObject(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  return name === "NoSuchKey" || /not found|missing/i.test(message);
}
