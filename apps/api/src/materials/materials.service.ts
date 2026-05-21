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
import { ObjectNotFoundError, StoragePort } from "@study-note/storage";

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

interface UpdateMaterialMetadataInput {
  classDate: string;
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
    const subjectId = await this.requireExistingSubjectId(input.subjectId);
    const fileName = requirePdfFileName(input.fileName);
    const fileSize = requirePdfUploadFileSize(input.fileSize);
    const material = await this.prisma.pdfMaterial.create({
      data: {
        id: materialId,
        ownerId,
        subjectId,
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
    const material = await this.getOwnedMaterial(ownerId, materialId);
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
      throw materialNotFound();
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
      if (error instanceof ObjectNotFoundError) {
        // S3 오브젝트 명시적 미존재 — 사용자 업로드 미완료로 분류
        this.logger.warn(
          `materials.complete.size-mismatch declared=${material.fileSize} actual=not-found materialId=${materialId} reason=${error.message}`
        );
        throw new ConflictException({
          errorCode: "UPLOAD_NOT_FOUND",
          errorMessage: "S3 object not found. The file may not have been uploaded yet."
        });
      }
      // 인프라 장애 (auth / network / S3 outage / transient AWS error) — error 로그 후 rethrow
      // Nest 기본 처리 → 500 InternalServerError (운영자 alert 트리거)
      this.logger.error(
        `materials.complete.headObject-failed materialId=${materialId} error=${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
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

    // Step 3b: PDF magic bytes check — same guard as server-upload path (uploadFile).
    // Prevents non-PDF or corrupted files with matching fileSize from being transitioned.
    // material stays "pending" on failure → FE can re-upload.
    // O(1) S3 cost: 1 Range GET (bytes=0-4) per completion call.
    let prefix: Buffer;
    try {
      prefix = await this.storage.readObjectPrefix(material.storageKey, PDF_MAGIC_PREFIX.length);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        // HEAD 와 Range GET 사이 object 삭제 (orphan cleanup race, transient S3 condition 등)
        this.logger.warn(
          `materials.complete.readObjectPrefix-not-found materialId=${materialId} reason=${error.message}`
        );
        throw new ConflictException({
          errorCode: "UPLOAD_NOT_FOUND",
          errorMessage: "S3 object disappeared between HEAD and content read. Retry upload."
        });
      }
      // 인프라 장애 — error 로그 후 rethrow (500 InternalServerError 운영자 alert 트리거)
      this.logger.error(
        `materials.complete.readObjectPrefix-failed materialId=${materialId} error=${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    if (!prefix.equals(PDF_MAGIC_PREFIX)) {
      this.logger.warn(
        `materials.complete.magic-mismatch materialId=${materialId} prefix=${prefix.toString("hex")}`
      );
      throw new BadRequestException({
        errorCode: "PDF_MAGIC_MISMATCH",
        errorMessage: "Uploaded file is not a valid PDF (magic bytes mismatch)"
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
      throw materialNotFound();
    }

    return toPdfMaterialRecord(updated);
  }

  async listMaterials(ownerId: string): Promise<PdfMaterialRecord[]> {
    const materials = await this.prisma.pdfMaterial.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId },
          {
            uploadStatus: "uploaded",
            owner: {
              role: {
                in: ["MASTER", "ADMIN"]
              }
            }
          }
        ]
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
        deletedAt: null,
        OR: [
          { ownerId },
          {
            uploadStatus: "uploaded",
            owner: {
              role: {
                in: ["MASTER", "ADMIN"]
              }
            }
          }
        ]
      }
    });

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
    const material = await this.getOwnedMaterial(ownerId, materialId);
    const saved = await this.prisma.pdfMaterial.update({
      where: { id: material.id },
      data: {
        classDate: requireString(input.classDate, "classDate")
      }
    });

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
    const existing = await this.prisma.annotationSnapshot.findFirst({
      where: {
        materialId: material.id,
        ownerId
      }
    });
    const snapshot = existing
      ? await this.prisma.annotationSnapshot.update({
          where: { id: existing.id },
          data: {
            schemaVersion: input.schemaVersion,
            payload: toAnnotationPayload(input),
            savedAt
          }
        })
      : await this.prisma.annotationSnapshot.create({
          data: {
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
    const material = await this.getUploadedMaterial(ownerId, materialId);
    const snapshot = await this.prisma.annotationSnapshot.findFirst({
      where: {
        materialId: material.id,
        ownerId
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

  private async getOwnedMaterial(ownerId: string, materialId: string): Promise<PdfMaterialRecord> {
    const material = await this.prisma.pdfMaterial.findFirst({
      where: {
        id: materialId,
        ownerId,
        deletedAt: null
      }
    });

    if (!material) {
      throw materialNotFound();
    }

    return toPdfMaterialRecord(material);
  }

  private async requireExistingSubjectId(value: string): Promise<string> {
    const subjectId = requireString(value, "subjectId");
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true }
    });

    if (!subject) {
      throw new BadRequestException({
        errorCode: "INVALID_SUBJECT",
        errorMessage: `Unknown subjectId: ${subjectId}`
      });
    }

    return subject.id;
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

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new BadRequestException("Request body is required");
  }

  return value as Record<string, unknown>;
}

function materialNotFound(): NotFoundException {
  return new NotFoundException({
    errorCode: "MATERIAL_NOT_FOUND",
    errorMessage: "PDF material not found"
  });
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
