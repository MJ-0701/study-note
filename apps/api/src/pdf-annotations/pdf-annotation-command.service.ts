// S3 (경량 CQRS) — PdfAnnotation 쓰기(Command) 책임 = Hybrid CAS + 보상 트랜잭션.
// mutation-owner 이지만 read-free 가 아니다: 409 STALE 응답에 canonical 본문을 싣기
// 위해 findSavedAt/getJsonObject 를 읽는다. CAS 의사결정/rollback/compare-and-delete
// 로직은 본 service 가 SoT. 조회 전용 경로는 PdfAnnotationQueryService.

import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Optional,
  PayloadTooLargeException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { StoragePort } from "@study-note/storage";
import { MetricsService } from "../observability/metrics.service";
import { PdfMaterialRepository } from "../materials/pdf-material.repository";
import { AnnotationSnapshotRepository } from "./annotation-snapshot.repository";
import {
  type AnnotationBatchResponse,
  annotationKey,
  isMaterialAccessible,
  MAX_PAYLOAD_BYTES,
  parseClientRevision,
  singleEntryResponse,
  throwMaterialNotFound
} from "./annotation-shared";

@Injectable()
export class PdfAnnotationCommandService {
  private readonly logger = new Logger("pdf-annotations");
  // sprint-W22-sprint-24 / AC4 + AC15 — log-derived metric source 전용 logger
  // (별도 context 로 Datadog pipeline 분리). 이 logger 경로로 emit 되는 줄은
  // 사용자 식별자/콘텐츠/토큰을 일절 포함하지 않는다.
  private readonly metricsLogger = new Logger("study-note.metric-event");

  // DDD: Command service 는 Prisma 직접 의존 0 — material/annotation repository +
  // storage 만 사용. CAS 의사결정/보상/에러 분기는 service 에 유지.
  constructor(
    @Inject(StoragePort) private readonly storage: StoragePort,
    private readonly materialRepo: PdfMaterialRepository,
    private readonly annotationRepo: AnnotationSnapshotRepository,
    @Optional() private readonly metrics?: MetricsService
  ) {}

  /** PUT /api/v1/pdf-annotations/:materialId — plan §R4 + §R9 (Hybrid CAS). */
  async putAnnotation(
    ownerId: string,
    materialId: string,
    payload: unknown,
    rawClientRevision?: string
  ): Promise<AnnotationBatchResponse> {
    try {
      const result = await this.putAnnotationUnsafe(
        ownerId,
        materialId,
        payload,
        rawClientRevision
      );
      this.metrics?.observeSyncPut("success");
      // sprint-W22-sprint-24 / AC4 — log-derived metric source (PII 0).
      this.metricsLogger.log("event=study_note.event.annotation_put");
      return result;
    } catch (err) {
      this.metrics?.observeSyncPut(err instanceof ConflictException ? "stale" : "failure");
      throw err;
    }
  }

  private async putAnnotationUnsafe(
    ownerId: string,
    materialId: string,
    payload: unknown,
    rawClientRevision?: string
  ): Promise<AnnotationBatchResponse> {
    if (!(await isMaterialAccessible(this.materialRepo, ownerId, materialId))) {
      throwMaterialNotFound();
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

    // codex P2 (PR #35 round-6): distinguish "field not provided" from
    // "provided but empty/invalid". A truthy check would silently treat
    // `clientRevision: ""` as undefined and fall into the create path, hiding
    // a client bug behind the wrong status. `parseClientRevision("")` produces
    // an Invalid Date and surfaces the documented 400 INVALID_REVISION.
    const clientRevision =
      rawClientRevision !== undefined
        ? parseClientRevision(rawClientRevision)
        : undefined;
    const newSavedAt = new Date();

    if (clientRevision !== undefined) {
      // R9 step 2: atomic CAS on Prisma metadata.
      const cas = await this.annotationRepo.casUpdateSavedAt(
        materialId,
        ownerId,
        clientRevision,
        newSavedAt
      );

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
      const existing = await this.annotationRepo.findSavedAt(materialId, ownerId);
      if (existing) {
        const obj = await this.storage.getJsonObject<{ payload: unknown }>(
          annotationKey(ownerId, materialId)
        );
        this.logger.warn(
          `pdf-annotations.cas.stale ownerId=${ownerId} materialId=${materialId} metric=annotation.cas.stale`
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
      // codex P2 (PR #35 round-4): CAS count=0 + existing=null 은 (a) snapshot
      // 만 삭제되어 client 가 stale revision 을 보낸 경우, 또는 (b) ownsMaterial
      // pre-check 와 CAS 사이에 material 자체가 삭제된 race.
      // (b) 의 의도는 R6 의 404. ownership 재확인으로 두 case 를 분기.
      if (!(await isMaterialAccessible(this.materialRepo, ownerId, materialId))) {
        throwMaterialNotFound();
      }
      // sprint-W22-be-sync: shared material 의 본인 row 첫 PUT 시 clientRevision
      // 가 정의되지만 DB row 없음 (다른 user 의 annotation row 의 savedAt 을 FE 가
      // 잘못 cache 했을 가능성) → 'stale' 라기보다 신규 create case. 신규 row 로
      // fallback 처리. race window (다른 client 가 동시 create) 는 unique constraint
      // 가 catch.
      this.logger.log(
        `pdf-annotations.put.create-fallback ownerId=${ownerId} materialId=${materialId} reason=clientRevision-without-existing-row metric=sync.put.create-fallback`
      );
      return this.createWithPayloadOrRollback(ownerId, materialId, payload, newSavedAt);
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
      await this.storage.putJsonObject(annotationKey(ownerId, materialId), {
        payload,
        updatedAt: newSavedAt.toISOString()
      });
    } catch (err) {
      // compensating: rollback Prisma row.savedAt to previous.
      await this.annotationRepo
        .rollbackSavedAt(materialId, ownerId, newSavedAt, previousSavedAt)
        .catch(() => undefined);
      this.logger.warn(
        `pdf-annotations.put.r2-failed ownerId=${ownerId} materialId=${materialId} rolled-back metric=sync.put.failure reason=r2_write_failed`
      );
      throw new ServiceUnavailableException({
        errorCode: "STORAGE_WRITE_FAILED",
        errorMessage: "annotation payload write failed; please retry"
      });
    }
    // Datadog metric (per docs/solon/handoff/20260523-datadog-ops-monitoring.md
    // 핵심 비즈니스 API 그룹 = PDF Annotation). log scraper 가 `metric=` field 를
    // 인식해서 count + latency 추출.
    this.logger.log(
      `pdf-annotations.put.success ownerId=${ownerId} materialId=${materialId} metric=sync.put.success type=update`
    );
    return singleEntryResponse(materialId, payload, newSavedAt);
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
      created = await this.annotationRepo.create(materialId, ownerId, newSavedAt);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          // R9: unique violation = another concurrent create won.
          const existing = await this.annotationRepo.findSavedAt(materialId, ownerId);
          const obj = existing
            ? await this.storage.getJsonObject<{ payload: unknown }>(
                annotationKey(ownerId, materialId)
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
          throwMaterialNotFound();
        }
      }
      throw err;
    }

    try {
      await this.storage.putJsonObject(annotationKey(ownerId, materialId), {
        payload,
        updatedAt: created.savedAt.toISOString()
      });
    } catch (err) {
      // codex P1 (PR #35 round-5): compare-and-delete rollback. A concurrent
      // CAS update could land between our `create` and this R2 failure (the
      // newer write happens against the row we just created with savedAt =
      // newSavedAt). An unconditional `delete` on (materialId, ownerId) would
      // wipe that newer write, silently losing data and leaving an R2 orphan.
      // Restrict the compensating delete to the exact revision we created so
      // it rolls back only our own attempt and no-ops if someone else has
      // since taken ownership of the row.
      await this.annotationRepo
        .deleteByRevision(materialId, ownerId, created.savedAt)
        .catch(() => undefined);
      this.logger.warn(
        `pdf-annotations.create.r2-failed ownerId=${ownerId} materialId=${materialId} rolled-back metric=sync.put.failure reason=r2_write_failed`
      );
      throw new ServiceUnavailableException({
        errorCode: "STORAGE_WRITE_FAILED",
        errorMessage: "annotation payload write failed; please retry"
      });
    }
    this.logger.log(
      `pdf-annotations.put.success ownerId=${ownerId} materialId=${materialId} metric=sync.put.success type=create`
    );
    return singleEntryResponse(materialId, payload, created.savedAt);
  }
}
