// sprint-2026-W22-sprint-1 / layer B/slice-2a — PDF canvas mount + object URL lifecycle 모듈.
// main.ts 의 applyPdfCanvasMounts + setActivePdfObjectUrl/clearActivePdfObjectUrl/
// revokeAllPdfObjectUrls/disposePdfDocumentCache + 4 module-state Map/Set
// (activePdfObjectUrls, activePdfObjectUrlMaterialIds, activePdfPreviewLoads,
// failedPdfPreviewLoadKeys) 를 격리. 외부 read 사이트는 getter API 만 사용.
//
// invariant:
//   - dataset key 4종 (data-pdf-mount, data-material-id, data-page-number,
//     data-blob-url) preservation — morphdom shouldPreservePdfCanvasMount
//     (appShell.ts) 와 일치 필수.
//   - subjectId 당 active blob URL 1개. setActive 호출 시 이전 URL 자동 revoke.
//   - URL.revokeObjectURL 호출 시 pdfjs PDFDocumentProxy 도 함께 destroy.
//   - RUM telemetry payload allowlist (page/cw/ch/dpr/ua slice 만). blobUrl/
//     materialId/subjectId/userId/file name/raw payload/raw error 노출 X.

// ─── Public types ────────────────────────────────────────────────────────

/**
 * Datadog RUM context allowlist — primitive scalar only. Map/Set/object/Array
 * 통과 X — string|number|boolean|undefined 만. observability/datadogRum.ts
 * 의 RumActionContext 와 동일 shape (직접 import 피해 모듈 독립).
 */
export interface CanvasMountRumContext {
  [key: string]: string | number | boolean | undefined;
}

/**
 * applyPdfCanvasMounts 가 부수효과로 호출하는 telemetry/observability 콜백.
 * observability 모듈 직접 import 안 함 — main.ts 가 주입.
 *
 * payload allowlist: page (1-based int), cw/ch (px), dpr (number), ua (90-char
 * prefix), vp_w/vp_h, duration_ms, timeout_ms, error_name. blobUrl/materialId/
 * subjectId/userId/file name/raw payload/err.message/stack 노출 금지.
 */
export interface CanvasMountCallbacks {
  trackRumAction: (name: string, attrs?: CanvasMountRumContext) => void;
  trackRumError: (err: unknown, attrs?: CanvasMountRumContext) => void;
}

// ─── Module-private state ────────────────────────────────────────────────

const activePdfObjectUrls = new Map<string, string>();
const activePdfObjectUrlMaterialIds = new Map<string, string>();
const activePdfPreviewLoads = new Set<string>();
const failedPdfPreviewLoadKeys = new Set<string>();

// ─── 1) Canvas mount ─────────────────────────────────────────────────────

/**
 * renderPdfFrameStack 가 출력한 `<div data-pdf-mount="true">` 마다 pdfjs-dist
 * 호출 + canvas paint. dynamic import 로 lazy bundle (PDF workspace 진입 전
 * main entry 영향 0).
 *
 * idempotent: 같은 (blobUrl, pageNumber) 면 skip. 다른 page 면 re-mount
 * (viewer 내부에서 in-flight render cancel + 새 render).
 *
 * 입력 검증: !blobUrl || !Number.isFinite(pageNumber) || pageNumber < 1 → skip.
 * 추가 URL scheme allowlist 없음 (현 production trust premise 동일,
 * `bl-pdf-blob-url-scheme-allowlist` backlog).
 */
export async function applyPdfCanvasMounts(
  root: HTMLElement,
  callbacks: CanvasMountCallbacks
): Promise<void> {
  const mounts = Array.from(
    root.querySelectorAll<HTMLElement>('[data-pdf-mount="true"]')
  );
  if (mounts.length === 0) {
    return;
  }
  const { mountPdfCanvas } = await import("../pdf/pdf-canvas-viewer");
  for (const div of mounts) {
    const blobUrl = div.dataset.blobUrl;
    const pageRaw = div.dataset.pageNumber;
    const pageNumber = pageRaw ? Number(pageRaw) : NaN;
    if (!blobUrl || !Number.isFinite(pageNumber) || pageNumber < 1) {
      continue;
    }
    const mountedKey = `${blobUrl}:${pageNumber}`;
    if (div.dataset.pdfMounted === mountedKey) {
      continue;
    }
    div.dataset.pdfMounted = mountedKey;
    // codex P2 (PR #40 round-2): mountPdfCanvas swallows worker/render errors
    // via its `onError` callback and resolves cleanly, so the trailing `.catch`
    // alone would never fire and the marker would remain — leaving the page
    // permanently blank until a key change/reload. Clear the marker from inside
    // `onError` so the next render attempt actually remounts. Keep the trailing
    // `.catch` as a defensive net for unexpected rejections (e.g., if the viewer
    // ever throws outside its own try/catch).
    //
    // RUM observability: Datadog dashboard 에서 mount phase + device 분포
    // 추적. iPad blank-canvas (PR #44/#45 fix 회귀 감지) 또는 향후 미지원
    // 브라우저 발견용. user 가 콘솔/Network 직접 접근 못해도 backend-visible.
    const info = {
      page: pageNumber,
      cw: div.clientWidth,
      ch: div.clientHeight,
      dpr: window.devicePixelRatio || 1,
      ua: navigator.userAgent.slice(0, 90)
    };
    callbacks.trackRumAction("pdf-canvas.mount.start", {
      page: info.page,
      cw: info.cw,
      ch: info.ch,
      dpr: info.dpr,
      ua: info.ua
    });
    const mountStartedAt = performance.now();
    const watchdog = window.setTimeout(() => {
      if (div.dataset.pdfMounted === mountedKey) {
        callbacks.trackRumAction("pdf-canvas.mount.timeout", {
          page: info.page,
          cw: info.cw,
          ch: info.ch,
          dpr: info.dpr,
          ua: info.ua,
          timeout_ms: 10000
        });
      }
    }, 10000);
    void mountPdfCanvas(div, blobUrl, pageNumber, {
      onReady: (vp) => {
        window.clearTimeout(watchdog);
        callbacks.trackRumAction("pdf-canvas.mount.ok", {
          page: info.page,
          vp_w: Math.round(vp.width),
          vp_h: Math.round(vp.height),
          dpr: info.dpr,
          cw: info.cw,
          ch: info.ch,
          duration_ms: Math.round(performance.now() - mountStartedAt)
        });
      },
      onError: (err) => {
        window.clearTimeout(watchdog);
        console.warn("[study-note] pdf canvas mount failed", err);
        delete div.dataset.pdfMounted;
        const e = err as { name?: unknown } | null;
        callbacks.trackRumError(err, {
          phase: "pdf-canvas.mount.error",
          page: info.page,
          dpr: info.dpr,
          cw: info.cw,
          ch: info.ch,
          ua: info.ua,
          error_name: String(e?.name ?? ""),
          duration_ms: Math.round(performance.now() - mountStartedAt)
        });
      }
    }).catch((err) => {
      window.clearTimeout(watchdog);
      console.warn("[study-note] pdf canvas mount rejected", err);
      delete div.dataset.pdfMounted;
      const e = err as { name?: unknown } | null;
      callbacks.trackRumError(err, {
        phase: "pdf-canvas.mount.reject",
        page: info.page,
        dpr: info.dpr,
        cw: info.cw,
        ch: info.ch,
        ua: info.ua,
        error_name: String(e?.name ?? ""),
        duration_ms: Math.round(performance.now() - mountStartedAt)
      });
    });
  }
}

// ─── 2) Object URL lifecycle ─────────────────────────────────────────────

/**
 * subjectId 의 active blob URL 을 교체. 이전 URL 자동 revoke + pdfjs cache
 * dispose. failedPdfPreviewLoadKeys 의 `${subjectId}:${materialId}` 항목도
 * 삭제 (성공한 load 가 재시도 차단을 해제).
 */
export function setActivePdfObjectUrl(
  subjectId: string,
  materialId: string,
  objectUrl: string
): void {
  clearActivePdfObjectUrl(subjectId);

  activePdfObjectUrls.set(subjectId, objectUrl);
  activePdfObjectUrlMaterialIds.set(subjectId, materialId);
  failedPdfPreviewLoadKeys.delete(`${subjectId}:${materialId}`);
}

/**
 * subjectId 의 active blob URL 을 해제. URL.revokeObjectURL + pdfjs
 * PDFDocumentProxy destroy 동기 호출. material 전환 시 호출됨.
 */
export function clearActivePdfObjectUrl(subjectId: string): void {
  const previousUrl = activePdfObjectUrls.get(subjectId);

  if (previousUrl) {
    URL.revokeObjectURL(previousUrl);
    // sprint-W21-sprint-4/S1: pdfjs-dist document cache dispose. lazy import
    // 으로 viewer module 미 load 시 no-op.
    void disposePdfDocumentCache(previousUrl);
  }

  activePdfObjectUrls.delete(subjectId);
  activePdfObjectUrlMaterialIds.delete(subjectId);
}

/**
 * 모든 subjectId 의 blob URL 일괄 해제 + 4 state Map/Set clear. 로그아웃,
 * wipe, account 전환 시 호출됨.
 */
export function revokeAllPdfObjectUrls(): void {
  const urls = Array.from(activePdfObjectUrls.values());
  urls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  // sprint-W21-sprint-4/S1: bulk dispose pdfjs document cache.
  if (urls.length > 0) {
    void disposePdfDocumentCache();
  }
  activePdfObjectUrls.clear();
  activePdfObjectUrlMaterialIds.clear();
  activePdfPreviewLoads.clear();
  failedPdfPreviewLoadKeys.clear();
}

// sprint-W21-sprint-4/S1: pdf-canvas-viewer 의 PDFDocumentProxy cache 를 lazy
// dispose. viewer module 가 dynamic import 라 module 미 load 시 no-op.
export async function disposePdfDocumentCache(blobUrl?: string): Promise<void> {
  try {
    const { clearPdfDocumentCache } = await import("../pdf/pdf-canvas-viewer");
    clearPdfDocumentCache(blobUrl);
  } catch {
    /* viewer module 미 load — no-op. */
  }
}

// ─── 3) Read-only getters (preview-load + renderer 가 사용) ────────────────

export function getActivePdfObjectUrl(subjectId: string): string | undefined {
  return activePdfObjectUrls.get(subjectId);
}

export function getActivePdfObjectUrlMaterialId(subjectId: string): string | undefined {
  return activePdfObjectUrlMaterialIds.get(subjectId);
}

export function hasActivePdfObjectUrl(subjectId: string): boolean {
  return activePdfObjectUrls.has(subjectId);
}

export function hasActivePdfPreviewLoad(loadKey: string): boolean {
  return activePdfPreviewLoads.has(loadKey);
}

export function hasFailedPdfPreviewLoad(loadKey: string): boolean {
  return failedPdfPreviewLoadKeys.has(loadKey);
}

// ─── 4) Preview load markers (preview-load fn 이 사용) ─────────────────────

export function markPdfPreviewLoadStarted(loadKey: string): void {
  activePdfPreviewLoads.add(loadKey);
}

export function finishPdfPreviewLoad(loadKey: string): void {
  activePdfPreviewLoads.delete(loadKey);
}

export function markFailedPdfPreviewLoad(loadKey: string): void {
  failedPdfPreviewLoadKeys.add(loadKey);
}

export function clearFailedPdfPreviewLoad(loadKey: string): void {
  failedPdfPreviewLoadKeys.delete(loadKey);
}

// ─── 5) Test/teardown helper ─────────────────────────────────────────────

/**
 * 모든 module-private state 를 강제 reset. user 전환 / spec / wipe 용.
 * URL.revokeObjectURL 은 호출하지 않음 (caller 책임 — 보통 revokeAll 사용).
 */
export function clearCanvasMountCaches(): void {
  activePdfObjectUrls.clear();
  activePdfObjectUrlMaterialIds.clear();
  activePdfPreviewLoads.clear();
  failedPdfPreviewLoadKeys.clear();
}
