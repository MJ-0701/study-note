// S3 (경량 CQRS) — PdfAnnotation 조회(Query) 책임. 상태 변경 없음.
// write(CAS) 경로는 PdfAnnotationCommandService 가 담당.

import { Inject, Injectable, Logger } from "@nestjs/common";
import { StoragePort } from "@study-note/storage";
import { PdfMaterialRepository } from "../materials/pdf-material.repository";
import { AnnotationSnapshotRepository } from "./annotation-snapshot.repository";
import {
  type AnnotationBatchResponse,
  type AnnotationEntry,
  annotationKey,
  BATCH_MAX_BYTES,
  BATCH_MAX_MATERIALS,
  emptyResponse,
  isMaterialAccessible,
  singleEntryResponse,
  throwMaterialNotFound
} from "./annotation-shared";

@Injectable()
export class PdfAnnotationQueryService {
  private readonly logger = new Logger("pdf-annotations");

  constructor(
    @Inject(StoragePort) private readonly storage: StoragePort,
    private readonly materialRepo: PdfMaterialRepository,
    private readonly annotationRepo: AnnotationSnapshotRepository
  ) {}

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
    const snapshots = await this.annotationRepo.listByOwnerPaged(ownerId, pageSize, cursor);

    const hasNext = snapshots.length > pageSize;
    const page = hasNext ? snapshots.slice(0, pageSize) : snapshots;
    const items = [];
    for (const snap of page) {
      const obj = await this.storage.getJsonObject<{ payload: unknown }>(
        annotationKey(ownerId, snap.materialId)
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
    if (!(await isMaterialAccessible(this.materialRepo, ownerId, materialId))) {
      throwMaterialNotFound();
    }

    const snapshot = await this.annotationRepo.findSavedAt(materialId, ownerId);

    if (!snapshot) {
      return emptyResponse();
    }

    const obj = await this.storage.getJsonObject<{ payload: unknown }>(
      annotationKey(ownerId, materialId)
    );

    return singleEntryResponse(materialId, obj?.payload ?? null, snapshot.savedAt);
  }

  /** GET /api/v1/pdf-annotations/by-subject/:subjectId — plan §R2 + §R7. */
  async batchGetBySubject(
    ownerId: string,
    subjectId: string
  ): Promise<AnnotationBatchResponse> {
    // R2: server-side material enumeration. share 정책 = listMaterials 와 동일
    // (본인 material + uploaded master/admin material). 다른 user 의 material
    // 위에서도 본인 annotation 가능하므로 batch 도 share 적용.
    // AnnotationSnapshot lookup 은 (currentUserId, materialId) composite 라
    // 다른 user annotation 노출 위험 X.
    const materials = await this.materialRepo.findAccessibleIdsBySubject(ownerId, subjectId);

    if (materials.length === 0) {
      return emptyResponse();
    }

    const materialIds = materials.map((m) => m.id);
    const snapshots = await this.annotationRepo.findManyByMaterialsOwner(materialIds, ownerId);

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
        annotationKey(ownerId, materialId)
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

    // Datadog metric — batch shape distribution (truncated 비율, returned 분포).
    this.logger.log(
      `pdf-annotations.batch.size ownerId=${ownerId} total=${total} returned=${returned} truncated=${truncated} metric=annotation.batch.size`
    );
    return { annotations, truncated, total, returned };
  }
}
