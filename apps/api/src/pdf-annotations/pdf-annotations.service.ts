import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@study-note/persistence";
import { StoragePort } from "@study-note/storage";

// sprint-2/S1: payload size hard cap.
const MAX_PAYLOAD_BYTES = 256 * 1024;
// sprint-W21-sprint-2/S2 (R7): batch response cap.
const BATCH_MAX_MATERIALS = 50;
const BATCH_MAX_BYTES = 1024 * 1024;

/** canonical wire entry — plan §R2. */
export interface AnnotationEntry {
  payload: unknown;
  updatedAt: string;
}

/** canonical wire response (single / batch / 409 모두 같은 schema) — plan §R2. */
export interface AnnotationBatchResponse {
  annotations: Record<string, AnnotationEntry>;
  truncated: boolean;
  total: number;
  returned: number;
}

@Injectable()
export class PdfAnnotationsService {
  private readonly logger = new Logger("pdf-annotations");

  constructor(
    private readonly prisma: PrismaService,
    @Inject(StoragePort) private readonly storage: StoragePort
  ) {}

  /** R2 key — `annotations/{userId}/material-{materialId}.json`. */
  private key(userId: string, materialId: string): string {
    return `annotations/${encodeURIComponent(userId)}/material-${encodeURIComponent(materialId)}.json`;
  }

  /** R6 material ownership pre-check. material 존재 + ownerId 일치 시 true. */
  private async ownsMaterial(ownerId: string, materialId: string): Promise<boolean> {
    const material = await this.prisma.pdfMaterial.findFirst({
      where: { id: materialId, ownerId, deletedAt: null },
      select: { id: true }
    });
    return material !== null;
  }

  /** plan §R6: foreign / nonexistent material 모두 동일 404. */
  private throwMaterialNotFound(): never {
    throw new NotFoundException({
      errorCode: "MATERIAL_NOT_FOUND",
      errorMessage: "annotation target not accessible"
    });
  }

  /** plan §R4: clientRevision 형식 검증 + ISO 8601 Date 로 파싱. */
  private parseClientRevision(raw: string): Date {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        errorCode: "INVALID_REVISION",
        errorMessage: "clientRevision must be a valid ISO 8601 timestamp"
      });
    }
    return date;
  }

  /** canonical schema 의 단일 entry 응답. */
  private singleEntryResponse(
    materialId: string,
    payload: unknown,
    savedAt: Date
  ): AnnotationBatchResponse {
    return {
      annotations: {
        [materialId]: { payload, updatedAt: savedAt.toISOString() }
      },
      truncated: false,
      total: 1,
      returned: 1
    };
  }

  /** canonical empty response — plan §R2 fail-closed. */
  private emptyResponse(): AnnotationBatchResponse {
    return { annotations: {}, truncated: false, total: 0, returned: 0 };
  }

  /**
   * GET /api/v1/pdf-annotations — cursor 기반 listing (admin/export 용).
   * sprint-2/S1 의 R2 prefix-list 패턴을 Hybrid 로 이식. cursor = base64 의
   * Prisma snapshot id (cuid). page size = 50 고정.
   */
  async listAnnotations(
    ownerId: string,
    cursor?: string
  ): Promise<{ items: Array<{ materialId: string; payload: unknown; updatedAt: string }>; nextCursor: string | null }> {
    const pageSize = 50;
    const snapshots = await this.prisma.annotationSnapshot.findMany({
      where: { ownerId },
      select: { id: true, materialId: true, savedAt: true },
      orderBy: { id: "asc" },
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasNext = snapshots.length > pageSize;
    const page = hasNext ? snapshots.slice(0, pageSize) : snapshots;
    const items = [];
    for (const snap of page) {
      const obj = await this.storage.getJsonObject<{ payload: unknown }>(
        this.key(ownerId, snap.materialId)
      );
      items.push({
        materialId: snap.materialId,
        payload: obj?.payload ?? null,
        updatedAt: snap.savedAt.toISOString()
      });
    }
    return {
      items,
      nextCursor: hasNext && page.length > 0 ? page[page.length - 1]!.id : null
    };
  }

  /** GET /api/v1/pdf-annotations/:materialId — plan §R6. */
  async getSingleAnnotation(
    ownerId: string,
    materialId: string
  ): Promise<AnnotationBatchResponse> {
    if (!(await this.ownsMaterial(ownerId, materialId))) {
      this.throwMaterialNotFound();
    }

    const snapshot = await this.prisma.annotationSnapshot.findUnique({
      where: { materialId_ownerId: { materialId, ownerId } },
      select: { savedAt: true }
    });

    if (!snapshot) {
      return this.emptyResponse();
    }

    const obj = await this.storage.getJsonObject<{ payload: unknown }>(
      this.key(ownerId, materialId)
    );

    return this.singleEntryResponse(materialId, obj?.payload ?? null, snapshot.savedAt);
  }

  /** GET /api/v1/pdf-annotations/by-subject/:subjectId — plan §R2 + §R7. */
  async batchGetBySubject(
    ownerId: string,
    subjectId: string
  ): Promise<AnnotationBatchResponse> {
    // R2: server-side material enumeration via materials repository
    // (subjectId × ownerId). client materialId 입력을 신뢰 X.
    const materials = await this.prisma.pdfMaterial.findMany({
      where: { subjectId, ownerId, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: "asc" }
    });

    if (materials.length === 0) {
      return this.emptyResponse();
    }

    const materialIds = materials.map((m) => m.id);
    const snapshots = await this.prisma.annotationSnapshot.findMany({
      where: { materialId: { in: materialIds }, ownerId },
      select: { materialId: true, savedAt: true }
    });

    const snapshotByMaterial = new Map<string, Date>(
      snapshots.map((s) => [s.materialId, s.savedAt])
    );

    const annotations: Record<string, AnnotationEntry> = {};
    let totalBytes = 0;
    let truncated = false;
    let returned = 0;
    const total = snapshots.length;

    // ordered iteration by material createdAt asc, R7 cap (50 material / 1MB).
    for (const { id: materialId } of materials) {
      const savedAt = snapshotByMaterial.get(materialId);
      if (!savedAt) {
        continue;
      }
      if (returned >= BATCH_MAX_MATERIALS) {
        truncated = true;
        break;
      }

      const obj = await this.storage.getJsonObject<{ payload: unknown }>(
        this.key(ownerId, materialId)
      );
      const entry: AnnotationEntry = {
        payload: obj?.payload ?? null,
        updatedAt: savedAt.toISOString()
      };
      const entrySize = Buffer.byteLength(JSON.stringify(entry), "utf-8");
      if (totalBytes + entrySize > BATCH_MAX_BYTES) {
        truncated = true;
        break;
      }

      annotations[materialId] = entry;
      totalBytes += entrySize;
      returned += 1;
    }

    return { annotations, truncated, total, returned };
  }

  /** PUT /api/v1/pdf-annotations/:materialId — plan §R4 + §R9 (Hybrid CAS). */
  async putAnnotation(
    ownerId: string,
    materialId: string,
    payload: unknown,
    rawClientRevision?: string
  ): Promise<AnnotationBatchResponse> {
    if (!(await this.ownsMaterial(ownerId, materialId))) {
      this.throwMaterialNotFound();
    }

    // sprint-2/S1: payload size hard cap (unchanged).
    const payloadJson = JSON.stringify({ payload });
    const payloadBytes = Buffer.byteLength(payloadJson, "utf-8");
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      throw new PayloadTooLargeException({
        errorCode: "PAYLOAD_TOO_LARGE",
        errorMessage: `pdf-annotations payload exceeds ${MAX_PAYLOAD_BYTES} bytes`
      });
    }

    const clientRevision = rawClientRevision
      ? this.parseClientRevision(rawClientRevision)
      : undefined;
    const newSavedAt = new Date();

    if (clientRevision !== undefined) {
      // R9 step 2: atomic CAS on Prisma metadata.
      const cas = await this.prisma.annotationSnapshot.updateMany({
        where: { materialId, ownerId, savedAt: clientRevision },
        data: { savedAt: newSavedAt }
      });

      if (cas.count === 1) {
        return this.writePayloadOrRollbackUpdate(
          ownerId,
          materialId,
          payload,
          newSavedAt,
          clientRevision
        );
      }

      // R9 step 4: count === 0 → stale or missing.
      const existing = await this.prisma.annotationSnapshot.findUnique({
        where: { materialId_ownerId: { materialId, ownerId } },
        select: { savedAt: true }
      });
      if (existing) {
        const obj = await this.storage.getJsonObject<{ payload: unknown }>(
          this.key(ownerId, materialId)
        );
        throw new ConflictException({
          errorCode: "STALE_REVISION",
          annotations: {
            [materialId]: {
              payload: obj?.payload ?? null,
              updatedAt: existing.savedAt.toISOString()
            }
          },
          truncated: false,
          total: 1,
          returned: 1
        });
      }
      // record 없음 + clientRevision != undefined → stale empty (canonical).
      throw new ConflictException({
        errorCode: "STALE_REVISION_NO_RECORD",
        annotations: {},
        truncated: false,
        total: 0,
        returned: 0
      });
    }

    // R9 step 4 last: clientRevision undefined + storage 신규 → create.
    return this.createWithPayloadOrRollback(ownerId, materialId, payload, newSavedAt);
  }

  /** R9 step 3 (update path): R2 write + Prisma rollback on R2 failure. */
  private async writePayloadOrRollbackUpdate(
    ownerId: string,
    materialId: string,
    payload: unknown,
    newSavedAt: Date,
    previousSavedAt: Date
  ): Promise<AnnotationBatchResponse> {
    try {
      await this.storage.putJsonObject(this.key(ownerId, materialId), {
        payload,
        updatedAt: newSavedAt.toISOString()
      });
    } catch (err) {
      // compensating: rollback Prisma row.savedAt to previous.
      await this.prisma.annotationSnapshot
        .updateMany({
          where: { materialId, ownerId, savedAt: newSavedAt },
          data: { savedAt: previousSavedAt }
        })
        .catch(() => undefined);
      this.logger.warn(
        `pdf-annotations.put.r2-failed ownerId=${ownerId} materialId=${materialId} rolled-back`
      );
      throw new ServiceUnavailableException({
        errorCode: "STORAGE_WRITE_FAILED",
        errorMessage: "annotation payload write failed; please retry"
      });
    }
    return this.singleEntryResponse(materialId, payload, newSavedAt);
  }

  /** R9 step 4 (create path): atomic create via unique constraint + R2 write + rollback. */
  private async createWithPayloadOrRollback(
    ownerId: string,
    materialId: string,
    payload: unknown,
    newSavedAt: Date
  ): Promise<AnnotationBatchResponse> {
    let created: { savedAt: Date };
    try {
      created = await this.prisma.annotationSnapshot.create({
        data: {
          materialId,
          ownerId,
          schemaVersion: 1,
          payload: Prisma.JsonNull,
          savedAt: newSavedAt
        },
        select: { savedAt: true }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          // R9: unique violation = another concurrent create won.
          const existing = await this.prisma.annotationSnapshot.findUnique({
            where: { materialId_ownerId: { materialId, ownerId } },
            select: { savedAt: true }
          });
          const obj = existing
            ? await this.storage.getJsonObject<{ payload: unknown }>(
                this.key(ownerId, materialId)
              )
            : null;
          throw new ConflictException({
            errorCode: "STALE_REVISION",
            annotations: existing
              ? {
                  [materialId]: {
                    payload: obj?.payload ?? null,
                    updatedAt: existing.savedAt.toISOString()
                  }
                }
              : {},
            truncated: false,
            total: existing ? 1 : 0,
            returned: existing ? 1 : 0
          });
        }
        if (err.code === "P2003" || err.code === "P2025") {
          // codex P2 (PR #35 round-3): pre-check 후 material delete race —
          // FK violation (P2003) 또는 RecordNotFound (P2025) 발생. ownership
          // pre-check 가 보장하던 invariant 가 사이에 무너졌으므로 R6 의
          // foreign/nonexistent 와 동일 응답 (404). 5xx 로 leak 차단.
          this.throwMaterialNotFound();
        }
      }
      throw err;
    }

    try {
      await this.storage.putJsonObject(this.key(ownerId, materialId), {
        payload,
        updatedAt: created.savedAt.toISOString()
      });
    } catch (err) {
      // compensating: delete Prisma row.
      await this.prisma.annotationSnapshot
        .delete({ where: { materialId_ownerId: { materialId, ownerId } } })
        .catch(() => undefined);
      this.logger.warn(
        `pdf-annotations.create.r2-failed ownerId=${ownerId} materialId=${materialId} rolled-back`
      );
      throw new ServiceUnavailableException({
        errorCode: "STORAGE_WRITE_FAILED",
        errorMessage: "annotation payload write failed; please retry"
      });
    }
    return this.singleEntryResponse(materialId, payload, created.savedAt);
  }
}
