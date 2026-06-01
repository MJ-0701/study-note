// sprint-2026-W22-sprint-1 / layer B/slice-1 — annotation sync 모듈.
// main.ts 의 R2 PUT/GET + revision/CAS + STALE_REVISION_NO_RECORD 복원 +
// batch hydrate + sync metric tracker + auth-expired 401 처리 를 격리한다.
// main.ts 와 단방향 dependency — Context (least-privilege read) + Callbacks
// (least-privilege write) 만 주입받는다.

import type { SubjectPdfWorkspace } from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

/**
 * sync metric event context allowlist. payload / userId / revisionToken /
 * raw materialId / raw error.message 같은 sensitive field 노출 금지.
 */
export interface SyncMetricContext {
  materialIdHash?: string;
  subjectIdHash?: string;
  httpStatus?: number;
  errorClass?: string;
  durationMs?: number;
  retryCount?: number;
}

export type SyncMetricEvent =
  | "put.success"
  | "put.failure"
  | "fetch.success"
  | "fetch.failure";

/**
 * annotation-sync 호출 시 main.ts 가 주입하는 read-only context. broad
 * PdfWorkspaceStore 노출 X — 한 subject 만 읽는 narrow API.
 */
export interface AnnotationSyncContext {
  apiBaseUrl: string;
  getSessionUserId: () => string | undefined;
  getSyncBackendPaused: () => boolean;
  readSubjectWorkspace: (subjectId: string) => SubjectPdfWorkspace | undefined;
}

/**
 * annotation-sync 의 부수효과 callback. broad PdfWorkspaceStore set 노출
 * X — narrow annotation-specific hydration callback 만.
 */
export interface AnnotationSyncCallbacks {
  setSyncBackendError: (message: string | undefined) => void;
  setSyncBackendErrorReported: (reported: boolean) => void;
  triggerRenderApp: () => void;
  applyAnnotationHydration: (
    subjectId: string,
    hydration: AnnotationHydrationEntry[]
  ) => void;
  handleAuthExpired: () => void;
  onSyncMetricEvent?: (event: SyncMetricEvent, context?: SyncMetricContext) => void;
}

/**
 * applyAnnotationHydration 의 entry 형태. annotation-sync 는 BE canonical
 * entry 를 이 형태로 normalize 한 뒤 callback 호출.
 */
export interface AnnotationHydrationEntry {
  materialId: string;
  payload: Partial<SubjectPdfWorkspace>;
}

// ─── Constants ───────────────────────────────────────────────────────────

const ANNOTATION_PUT_DEBOUNCE_MS = 750;
const SYNC_FAILURE_PAUSE_THRESHOLD = 3;
const SYNC_FAILURE_PAUSE_WINDOW_MS = 5 * 60 * 1000;

const PAUSE_BANNER_MESSAGE =
  "메모/필기 BE 저장에 연속 실패했습니다. 자동 동기화를 잠시 멈춥니다. 네트워크/세션 상태를 확인한 뒤 닫기를 눌러 재시작하세요.";

// 413 = annotation payload 가 서버 cap(4MB)을 초과. retry 해도 동일하게 실패하므로
// pause/재시도 대상이 아니다. 로컬 필기는 이미 보존돼 있으니(workspace store +
// localStorage) 데이터 손실은 없고, "서버 동기화만 중단"됐음을 사용자에게 경고한다.
const PAYLOAD_TOO_LARGE_MESSAGE =
  "이 자료의 필기/메모가 너무 커서 서버 자동 저장에 실패했습니다. 작성한 내용은 이 기기에 보존돼 있지만 다른 기기로 동기화되지 않습니다. 필기 일부를 지우면 다시 저장됩니다.";

// ─── Module-private state (annotation 영역만, user-notes 측은 main.ts 잔류) ─

interface SyncFailureTracker {
  recentFailures: number[];
  paused: boolean;
}

const syncFailureTracker: SyncFailureTracker = {
  recentFailures: [],
  paused: false
};

const annotationPutTimers = new Map<string, ReturnType<typeof setTimeout>>();
interface PendingAnnotationPutPayload {
  payload: unknown;
  mergeWithCanonical: boolean;
}

const annotationPendingPutPayloads = new Map<string, PendingAnnotationPutPayload>();
const annotationPutAborts = new Map<string, AbortController>();
const annotationPutChains = new Map<string, Promise<void>>();
const annotationFetchedKeys = new Set<string>();
const lastHydratedAnnotationByMaterial = new Map<string, string>();
const lastHydratedAnnotationRevision = new Map<string, string>();
const annotationSubjectBatchFetched = new Set<string>();
const annotationSubjectBatchInflight = new Set<string>();

let syncBackendErrorReportedLocal = false;

// ─── Helpers ─────────────────────────────────────────────────────────────

function emitMetric(
  cb: AnnotationSyncCallbacks,
  event: SyncMetricEvent,
  ctx?: SyncMetricContext
): void {
  cb.onSyncMetricEvent?.(event, ctx);
}

function logScrubbed(prefix: string, ctx: SyncMetricContext): void {
  // scrubbed log — sensitive field 포함 안 한 ctx 만 emit.
  console.warn(`[study-note] ${prefix}`, ctx);
}

function getRevisionKey(userId: string, materialId: string): string {
  return `${userId}:${materialId}`;
}

function getCacheKey(userId: string, subjectId: string, materialId: string): string {
  return `${userId}:${subjectId}:${materialId}`;
}

function getSubjectKey(userId: string, subjectId: string): string {
  return `${userId}:${subjectId}`;
}

function isStillActiveMaterial(
  ctx: AnnotationSyncContext,
  subjectId: string,
  materialId: string
): boolean {
  const ws = ctx.readSubjectWorkspace(subjectId);
  const active = ws?.material?.backendMaterialId ?? ws?.material?.id;
  return active === materialId;
}

const ANNOTATION_ARRAY_KEYS = [
  "stickyNotes",
  "inkStrokes",
  "textBoxes",
  "checklists",
  "tables",
  "charts",
  "starMarks"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getAnnotationItemKey(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const id = value.id;
  if (typeof id === "string" || typeof id === "number") {
    return String(id);
  }
  return undefined;
}

function mergeAnnotationArray(canonical: unknown, pending: unknown): unknown[] | undefined {
  if (!Array.isArray(canonical) && !Array.isArray(pending)) {
    return undefined;
  }
  const merged = Array.isArray(canonical) ? [...canonical] : [];
  const indexById = new Map<string, number>();
  for (const [index, item] of merged.entries()) {
    const key = getAnnotationItemKey(item);
    if (key) {
      indexById.set(key, index);
    }
  }
  if (Array.isArray(pending)) {
    for (const item of pending) {
      const key = getAnnotationItemKey(item);
      if (key && indexById.has(key)) {
        merged[indexById.get(key)!] = item;
      } else {
        if (key) {
          indexById.set(key, merged.length);
        }
        merged.push(item);
      }
    }
  }
  return merged;
}

function mergeAnnotationPayloads(
  canonical: unknown,
  pending: unknown,
  options: { mergeCanonicalArrays: boolean }
): unknown {
  if (!isRecord(canonical) && !isRecord(pending)) {
    return pending ?? canonical;
  }
  const canonicalRecord = isRecord(canonical) ? canonical : {};
  const pendingRecord = isRecord(pending) ? pending : {};
  const merged: Record<string, unknown> = { ...canonicalRecord, ...pendingRecord };
  for (const key of ANNOTATION_ARRAY_KEYS) {
    if (Array.isArray(pendingRecord[key])) {
      merged[key] = options.mergeCanonicalArrays
        ? mergeAnnotationArray(canonicalRecord[key], pendingRecord[key])
        : pendingRecord[key];
    } else if (Array.isArray(canonicalRecord[key])) {
      merged[key] = canonicalRecord[key];
    }
  }
  return merged;
}

function mergePendingAnnotationPutPayload(
  materialId: string,
  canonicalPayload: unknown
): Partial<SubjectPdfWorkspace> | undefined {
  const pending = annotationPendingPutPayloads.get(materialId);
  const mergedPayload = mergeAnnotationPayloads(canonicalPayload, pending?.payload, {
    mergeCanonicalArrays: pending?.mergeWithCanonical ?? false
  });
  if (!isRecord(mergedPayload)) {
    return undefined;
  }
  annotationPendingPutPayloads.set(materialId, {
    payload: mergedPayload,
    mergeWithCanonical: false
  });
  return mergedPayload as Partial<SubjectPdfWorkspace>;
}

function shouldMergePendingPutWithCanonical(
  subjectId: string,
  materialId: string,
  ctx: AnnotationSyncContext
): boolean {
  const sessionUserId = ctx.getSessionUserId();
  if (!sessionUserId) {
    return false;
  }
  return lastHydratedAnnotationByMaterial.get(getSubjectKey(sessionUserId, subjectId)) !== materialId;
}

// ─── sync metric tracker ─────────────────────────────────────────────────

export function recordSyncFailure(cb: AnnotationSyncCallbacks): void {
  const now = Date.now();
  syncFailureTracker.recentFailures.push(now);
  syncFailureTracker.recentFailures = syncFailureTracker.recentFailures.filter(
    (ts) => now - ts < SYNC_FAILURE_PAUSE_WINDOW_MS
  );
  if (
    syncFailureTracker.recentFailures.length >= SYNC_FAILURE_PAUSE_THRESHOLD &&
    !syncFailureTracker.paused
  ) {
    syncFailureTracker.paused = true;
    cb.setSyncBackendError(PAUSE_BANNER_MESSAGE);
    if (!syncBackendErrorReportedLocal) {
      syncBackendErrorReportedLocal = true;
      cb.setSyncBackendErrorReported(true);
      cb.triggerRenderApp();
    }
  }
  emitMetric(cb, "put.failure");
}

export function recordSyncSuccess(cb: AnnotationSyncCallbacks): void {
  syncFailureTracker.recentFailures = [];
  if (syncFailureTracker.paused) {
    syncFailureTracker.paused = false;
    cb.setSyncBackendError(undefined);
    syncBackendErrorReportedLocal = false;
    cb.setSyncBackendErrorReported(false);
    cb.triggerRenderApp();
  }
  emitMetric(cb, "put.success");
}

export function recordFetchSuccess(cb: AnnotationSyncCallbacks): void {
  emitMetric(cb, "fetch.success");
}

export function recordFetchFailure(cb: AnnotationSyncCallbacks): void {
  emitMetric(cb, "fetch.failure");
}

// ─── Cache lifecycle ─────────────────────────────────────────────────────

/**
 * user 전환 / sign-out 시 호출. 모든 module-private state 정리.
 */
export function clearAnnotationSyncCaches(): void {
  for (const timer of annotationPutTimers.values()) {
    clearTimeout(timer);
  }
  annotationPutTimers.clear();
  annotationPendingPutPayloads.clear();
  for (const abort of annotationPutAborts.values()) {
    try {
      abort.abort();
    } catch {
      /* ignore */
    }
  }
  annotationPutAborts.clear();
  annotationPutChains.clear();
  annotationFetchedKeys.clear();
  lastHydratedAnnotationByMaterial.clear();
  lastHydratedAnnotationRevision.clear();
  annotationSubjectBatchFetched.clear();
  annotationSubjectBatchInflight.clear();
  syncFailureTracker.recentFailures = [];
  syncFailureTracker.paused = false;
  syncBackendErrorReportedLocal = false;
}

// ─── PUT path ────────────────────────────────────────────────────────────

export async function putAnnotationToBE(
  materialId: string,
  payload: unknown,
  ctx: AnnotationSyncContext,
  cb: AnnotationSyncCallbacks
): Promise<void> {
  if (ctx.getSyncBackendPaused() || syncFailureTracker.paused) {
    return;
  }
  const sessionUserIdAtSchedule = ctx.getSessionUserId();
  if (!sessionUserIdAtSchedule) {
    logScrubbed("annotation PUT skip", { errorClass: "Unauthenticated" });
    return;
  }
  const previous = annotationPutChains.get(materialId) ?? Promise.resolve();
  const work = previous
    .catch(() => {})
    .then(async () => {
      if (ctx.getSessionUserId() !== sessionUserIdAtSchedule) {
        return;
      }
      if (syncFailureTracker.paused) {
        return;
      }
      const abortController = new AbortController();
      annotationPutAborts.set(materialId, abortController);
      try {
        const revisionKey = getRevisionKey(sessionUserIdAtSchedule, materialId);
        const cachedRevision = lastHydratedAnnotationRevision.get(revisionKey);
        const requestBody: Record<string, unknown> = { payload };
        if (cachedRevision !== undefined) {
          requestBody.clientRevision = cachedRevision;
        }
        const response = await fetch(
          `${ctx.apiBaseUrl}/v1/pdf-annotations/${encodeURIComponent(materialId)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: abortController.signal
          }
        );
        if (response.status === 413) {
          logScrubbed("annotation PUT 413", { httpStatus: 413 });
          // 로컬 필기는 그대로 보존(clear 안 함). 사용자에게 "서버 동기화 중단"만 경고.
          cb.setSyncBackendError(PAYLOAD_TOO_LARGE_MESSAGE);
          cb.triggerRenderApp();
          return;
        }
        if (response.status === 400) {
          logScrubbed("annotation PUT 400", { httpStatus: 400 });
          return;
        }
        if (response.status === 401 || response.status === 403) {
          logScrubbed("annotation PUT auth expired", { httpStatus: response.status });
          cb.handleAuthExpired();
          return;
        }
        if (response.status === 404) {
          logScrubbed("annotation PUT 404", { httpStatus: 404 });
          return;
        }
        if (response.status === 409) {
          const recovered = await handleAnnotationStaleResponse(
            sessionUserIdAtSchedule,
            materialId,
            response,
            payload,
            abortController.signal,
            ctx,
            cb
          );
          if (recovered) {
            recordSyncSuccess(cb);
          }
          return;
        }
        if (!response.ok) {
          logScrubbed("annotation PUT failed", { httpStatus: response.status });
          if (response.status >= 500 || response.status === 429) {
            recordSyncFailure(cb);
          }
          return;
        }
        try {
          const json = (await response.json()) as {
            annotations?: Record<string, { payload?: unknown; updatedAt?: unknown }>;
          };
          const entry = json.annotations?.[materialId];
          if (entry && typeof entry.updatedAt === "string") {
            lastHydratedAnnotationRevision.set(revisionKey, entry.updatedAt);
          }
        } catch {
          /* response body parse 실패 — PUT 자체는 성공 */
        }
        recordSyncSuccess(cb);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        logScrubbed("annotation PUT network error", {
          errorClass: error instanceof Error ? error.name : "Unknown"
        });
        recordSyncFailure(cb);
      } finally {
        if (annotationPutAborts.get(materialId) === abortController) {
          annotationPutAborts.delete(materialId);
        }
      }
    });
  annotationPutChains.set(materialId, work);
  try {
    await work;
  } finally {
    if (annotationPutChains.get(materialId) === work) {
      annotationPutChains.delete(materialId);
    }
  }
}

export function scheduleAnnotationPut(
  materialId: string,
  payload: unknown,
  subjectId: string,
  ctx: AnnotationSyncContext,
  cb: AnnotationSyncCallbacks
): void {
  const existing = annotationPutTimers.get(materialId);
  if (existing) {
    clearTimeout(existing);
  }
  annotationPendingPutPayloads.set(materialId, {
    payload,
    mergeWithCanonical: shouldMergePendingPutWithCanonical(subjectId, materialId, ctx)
  });
  const timer = setTimeout(() => {
    annotationPutTimers.delete(materialId);
    const pendingPayload = annotationPendingPutPayloads.get(materialId)?.payload ?? payload;
    annotationPendingPutPayloads.delete(materialId);
    void putAnnotationToBE(materialId, pendingPayload, ctx, cb);
  }, ANNOTATION_PUT_DEBOUNCE_MS);
  annotationPutTimers.set(materialId, timer);
}

// ─── STALE recovery ──────────────────────────────────────────────────────

export async function handleAnnotationStaleResponse(
  userId: string,
  materialId: string,
  response: Response,
  retryPayload: unknown,
  abortSignal: AbortSignal,
  ctx: AnnotationSyncContext,
  cb: AnnotationSyncCallbacks
): Promise<boolean> {
  let json: {
    annotations?: Record<string, { payload?: unknown; updatedAt?: unknown }>;
  };
  try {
    json = (await response.json()) as typeof json;
  } catch {
    return false;
  }
  if (!json || typeof json !== "object" || !("annotations" in json) || typeof json.annotations !== "object") {
    // malformed stale response — defensive guard.
    return false;
  }
  const entry = json.annotations?.[materialId];
  if (!entry) {
    // STALE_REVISION_NO_RECORD — drop cache + retry without clientRevision.
    lastHydratedAnnotationRevision.delete(getRevisionKey(userId, materialId));
    try {
      const retryResp = await fetch(
        `${ctx.apiBaseUrl}/v1/pdf-annotations/${encodeURIComponent(materialId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ payload: retryPayload }),
          signal: abortSignal
        }
      );
      if (retryResp.ok) {
        try {
          const retryJson = (await retryResp.json()) as {
            annotations?: Record<string, { updatedAt?: unknown }>;
          };
          const created = retryJson.annotations?.[materialId];
          if (created && typeof created.updatedAt === "string") {
            lastHydratedAnnotationRevision.set(
              getRevisionKey(userId, materialId),
              created.updatedAt
            );
          }
        } catch {
          /* response parse 실패 — 다음 mutation 이 다시 NO_RECORD path 거침 */
        }
        return true;
      }
      if (retryResp.status === 401 || retryResp.status === 403) {
        cb.handleAuthExpired();
        return false;
      }
      if (retryResp.status === 409) {
        try {
          const retryJson = (await retryResp.json()) as {
            annotations?: Record<string, { payload?: unknown; updatedAt?: unknown }>;
          };
          const retryEntry = retryJson.annotations?.[materialId];
          if (retryEntry) {
            return hydrateAnnotationFromCanonicalEntry(userId, materialId, retryEntry, ctx, cb);
          }
        } catch {
          /* body parse 실패 — recover 불가 */
        }
        return false;
      }
      logScrubbed("annotation NO_RECORD retry failed", { httpStatus: retryResp.status });
      if (retryResp.status >= 500 || retryResp.status === 429) {
        recordSyncFailure(cb);
      }
      return false;
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        logScrubbed("annotation NO_RECORD retry network error", {
          errorClass: err instanceof Error ? err.name : "Unknown"
        });
        recordSyncFailure(cb);
      }
      return false;
    }
  }
  return hydrateAnnotationFromCanonicalEntry(userId, materialId, entry, ctx, cb);
}

export function hydrateAnnotationFromCanonicalEntry(
  userId: string,
  materialId: string,
  entry: { payload?: unknown; updatedAt?: unknown },
  _ctx: AnnotationSyncContext,
  cb: AnnotationSyncCallbacks
): boolean {
  if (typeof entry.updatedAt !== "string") {
    return false;
  }
  if (entry.payload && typeof entry.payload === "object") {
    const incoming = entry.payload as Partial<SubjectPdfWorkspace>;
    // active material 인 subject 만 hydrate (defer-on-mismatch invariant).
    // narrow context: readSubjectWorkspace 로 active material 찾는다.
    // main.ts 의 broad walk 대신 callback 으로 적용.
    cb.applyAnnotationHydration(
      // hydration 의 subjectId 는 main.ts 가 active material 의 subject 를
      // 찾아서 적용 (callback 안). 여기서 subjectId 알 수 없으니 빈 string
      // 으로 두고 callback 이 internal walk 수행 — 단, main.ts wrapper 의
      // applyAnnotationHydration 가 subjectId="" 의 의미를 "find by
      // materialId" 로 해석해야. 안전한 wiring 위해 subjectId 를 entry 에
      // 명시 X 인 경우 callback 이 store walk.
      "",
      [{ materialId, payload: incoming }]
    );
  }
  lastHydratedAnnotationRevision.set(getRevisionKey(userId, materialId), entry.updatedAt);
  return true;
}

// ─── batch GET ───────────────────────────────────────────────────────────

export async function fetchAnnotationsForSubject(
  subjectId: string,
  ctx: AnnotationSyncContext,
  cb: AnnotationSyncCallbacks
): Promise<void> {
  const sessionUserId = ctx.getSessionUserId();
  if (!sessionUserId) {
    logScrubbed("annotation batch GET skip", { errorClass: "Unauthenticated" });
    return;
  }
  const subjectBatchKey = `${sessionUserId}:${subjectId}`;
  if (
    annotationSubjectBatchInflight.has(subjectBatchKey) ||
    annotationSubjectBatchFetched.has(subjectBatchKey)
  ) {
    return;
  }
  annotationSubjectBatchInflight.add(subjectBatchKey);

  const fallbackToSingleGet = () => {
    const ws = ctx.readSubjectWorkspace(subjectId);
    const active = ws?.material?.backendMaterialId ?? ws?.material?.id;
    if (active) {
      void fetchAnnotationIfMissing(subjectId, active, ctx, cb);
    }
  };

  let response: Response;
  try {
    response = await fetch(
      `${ctx.apiBaseUrl}/v1/pdf-annotations/by-subject/${encodeURIComponent(subjectId)}`,
      { credentials: "include" }
    );
  } catch (error) {
    annotationSubjectBatchInflight.delete(subjectBatchKey);
    logScrubbed("annotation batch GET network error", {
      errorClass: error instanceof Error ? error.name : "Unknown"
    });
    recordFetchFailure(cb);
    fallbackToSingleGet();
    return;
  }

  if (response.status === 401 || response.status === 403) {
    annotationSubjectBatchInflight.delete(subjectBatchKey);
    cb.handleAuthExpired();
    return;
  }
  if (!response.ok) {
    annotationSubjectBatchInflight.delete(subjectBatchKey);
    if (response.status >= 500) {
      recordFetchFailure(cb);
    }
    fallbackToSingleGet();
    return;
  }

  let json: {
    annotations?: Record<string, { payload?: unknown; updatedAt?: unknown }>;
    truncated?: boolean;
    total?: number;
    returned?: number;
  };
  try {
    json = (await response.json()) as typeof json;
  } catch {
    annotationSubjectBatchInflight.delete(subjectBatchKey);
    return;
  }

  annotationSubjectBatchFetched.add(subjectBatchKey);
  annotationSubjectBatchInflight.delete(subjectBatchKey);

  if (ctx.getSessionUserId() !== sessionUserId) {
    return;
  }
  recordFetchSuccess(cb);

  const annotations = json.annotations ?? {};
  const hydrationEntries: AnnotationHydrationEntry[] = [];
  const workspace = ctx.readSubjectWorkspace(subjectId);
  const active = workspace?.material?.backendMaterialId ?? workspace?.material?.id;

  for (const [materialId, entry] of Object.entries(annotations)) {
    if (!entry || typeof entry !== "object") {
      logScrubbed("annotation batch entry malformed", { errorClass: "InvalidEntry" });
      continue;
    }
    if (typeof entry.updatedAt === "string") {
      lastHydratedAnnotationRevision.set(
        getRevisionKey(sessionUserId, materialId),
        entry.updatedAt
      );
    } else {
      logScrubbed("annotation batch entry malformed", { errorClass: "InvalidRevision" });
    }
    annotationFetchedKeys.add(getCacheKey(sessionUserId, subjectId, materialId));
    if (active === materialId && entry.payload && typeof entry.payload === "object") {
      const payload = annotationPutTimers.has(materialId)
        ? mergePendingAnnotationPutPayload(materialId, entry.payload)
        : (entry.payload as Partial<SubjectPdfWorkspace>);
      hydrationEntries.push({
        materialId,
        payload: payload ?? (entry.payload as Partial<SubjectPdfWorkspace>)
      });
      lastHydratedAnnotationByMaterial.set(
        getSubjectKey(sessionUserId, subjectId),
        materialId
      );
    }
  }

  if (hydrationEntries.length > 0) {
    cb.applyAnnotationHydration(subjectId, hydrationEntries);
  }

  // truncated / 누락 active material 의 single-GET fallback.
  const workspaceAfter = ctx.readSubjectWorkspace(subjectId);
  const activeAfter =
    workspaceAfter?.material?.backendMaterialId ?? workspaceAfter?.material?.id;
  if (activeAfter && !annotations[activeAfter]) {
    void fetchAnnotationIfMissing(subjectId, activeAfter, ctx, cb);
  }

  cb.triggerRenderApp();
}

// ─── single-material GET ─────────────────────────────────────────────────

export async function fetchAnnotationIfMissing(
  subjectId: string,
  materialId: string,
  ctx: AnnotationSyncContext,
  cb: AnnotationSyncCallbacks
): Promise<void> {
  const sessionUserId = ctx.getSessionUserId();
  if (!sessionUserId) {
    logScrubbed("annotation GET skip", { errorClass: "Unauthenticated" });
    return;
  }
  const cacheKey = getCacheKey(sessionUserId, subjectId, materialId);
  const subjectKey = getSubjectKey(sessionUserId, subjectId);

  if (
    annotationFetchedKeys.has(cacheKey) &&
    lastHydratedAnnotationByMaterial.get(subjectKey) === materialId
  ) {
    return;
  }
  if (lastHydratedAnnotationByMaterial.get(subjectKey) !== materialId) {
    annotationFetchedKeys.delete(cacheKey);
  }
  if (annotationFetchedKeys.has(cacheKey)) {
    return;
  }
  annotationFetchedKeys.add(cacheKey);
  const releaseCache = () => annotationFetchedKeys.delete(cacheKey);

  try {
    const response = await fetch(
      `${ctx.apiBaseUrl}/v1/pdf-annotations/${encodeURIComponent(materialId)}`,
      { credentials: "include" }
    );
    if (response.status === 404) {
      lastHydratedAnnotationRevision.delete(getRevisionKey(sessionUserId, materialId));
      if (isStillActiveMaterial(ctx, subjectId, materialId)) {
        lastHydratedAnnotationByMaterial.set(subjectKey, materialId);
      } else {
        releaseCache();
      }
      return;
    }
    if (response.status === 401 || response.status === 403) {
      releaseCache();
      cb.handleAuthExpired();
      return;
    }
    if (!response.ok) {
      annotationFetchedKeys.delete(cacheKey);
      if (response.status >= 500) {
        recordFetchFailure(cb);
      }
      return;
    }
    const json = (await response.json()) as {
      annotations?: Record<string, { payload?: unknown; updatedAt?: unknown }>;
    };
    if (ctx.getSessionUserId() !== sessionUserId) {
      return;
    }
    const entry = json.annotations?.[materialId];
    if (annotationPutTimers.has(materialId)) {
      recordFetchSuccess(cb);
      if (entry && typeof entry === "object") {
        if (typeof entry.updatedAt === "string") {
          lastHydratedAnnotationRevision.set(
            getRevisionKey(sessionUserId, materialId),
            entry.updatedAt
          );
        }
        if (entry.payload && typeof entry.payload === "object") {
          const payload = mergePendingAnnotationPutPayload(materialId, entry.payload);
          if (payload && isStillActiveMaterial(ctx, subjectId, materialId)) {
            cb.applyAnnotationHydration(subjectId, [{ materialId, payload }]);
          }
        }
      }
      if (isStillActiveMaterial(ctx, subjectId, materialId)) {
        lastHydratedAnnotationByMaterial.set(subjectKey, materialId);
      } else {
        releaseCache();
      }
      return;
    }
    recordFetchSuccess(cb);

    if (entry && typeof entry === "object") {
      if (typeof entry.updatedAt === "string") {
        lastHydratedAnnotationRevision.set(
          getRevisionKey(sessionUserId, materialId),
          entry.updatedAt
        );
      }
      if (entry.payload && typeof entry.payload === "object") {
        cb.applyAnnotationHydration(subjectId, [
          {
            materialId,
            payload: entry.payload as Partial<SubjectPdfWorkspace>
          }
        ]);
      }
    }
    if (isStillActiveMaterial(ctx, subjectId, materialId)) {
      lastHydratedAnnotationByMaterial.set(subjectKey, materialId);
    } else {
      releaseCache();
    }
  } catch (error) {
    releaseCache();
    logScrubbed("annotation GET network error", {
      errorClass: error instanceof Error ? error.name : "Unknown"
    });
    recordFetchFailure(cb);
  }
}

// ─── Test introspection (sprint-2026-W22-sprint-1 spec only) ─────────────

export function _inspectModuleState() {
  return {
    syncFailureTracker: {
      recentFailuresCount: syncFailureTracker.recentFailures.length,
      paused: syncFailureTracker.paused
    },
    putTimersSize: annotationPutTimers.size,
    putAbortsSize: annotationPutAborts.size,
    putChainsSize: annotationPutChains.size,
    fetchedKeysSize: annotationFetchedKeys.size,
    lastByMaterialSize: lastHydratedAnnotationByMaterial.size,
    lastRevisionSize: lastHydratedAnnotationRevision.size,
    pendingPutPayloadsSize: annotationPendingPutPayloads.size,
    subjectBatchFetchedSize: annotationSubjectBatchFetched.size,
    subjectBatchInflightSize: annotationSubjectBatchInflight.size
  };
}
