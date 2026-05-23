// pdf-canvas-viewer.ts
//
// sprint-W21-sprint-4/S1: PDF rendering 을 native browser PDF viewer
// (`<iframe src="*.pdf#page=N">`) 에서 pdfjs-dist canvas-based viewer 로 교체.
// iOS Safari (`#page` fragment 무시) + Android Chrome (native PDF viewer 부재)
// 등 모바일 환경에서 PDF 가 동작하지 않는 product killer issue 해결.
//
// Public API:
//   - mountPdfCanvas(container, blobUrl, pageNumber, options)
//   - unmountPdfCanvas(container)
//   - getPageViewport(blobUrl, pageNumber): { width, height }
//   - clearPdfDocumentCache(blobUrl?)
//
// 설계:
//   - PDFDocumentProxy 는 blob URL 별 memoize (같은 자료를 page 마다 다시
//     load 하지 않음). clearPdfDocumentCache 로 명시적 dispose.
//   - canvas backing-store DPR clamp = min(devicePixelRatio, 2.0). Retina iPad
//     /iPhone 의 backing-store pixel 폭주 차단.
//   - pixel budget = 2048 × 2048 = 4 MP per page. 초과 시 effective DPR 축소.
//   - annotation overlay (0~1 ratio) 와 정합되도록 viewport.width/height 그대로
//     CSS px 노출 (DPR 은 backing-store 만 키움, 좌표계는 동일).
//   - Web Worker = `pdfjs-dist/build/pdf.worker.min.mjs?url` (Vite native).
//
// Performance:
//   - main bundle 영향 0 (본 모듈은 main.ts 에서 dynamic `import()` 로만 호출).
//   - worker chunk = pdfjs-dist worker 1개. Vite 가 별도 asset.
//   - DOM mount 는 idempotent (같은 container 에 두 번 호출 시 기존 canvas 재사용).

// hotfix(pdf-canvas): "legacy" build 사용. modern build (`pdfjs-dist`) 는
// TC39 upsert proposal (Map.prototype.getOrInsertComputed) / Promise.try /
// Array.fromAsync / Iterator helpers 같은 최신 spec 에 의존한다. iPad Safari
// 18.5 + Mac Safari 18 등이 일부 호환되지만 minor version 분포가 넓어서
// 사용자 환경마다 다른 silent throw 가 발생한다. legacy build 는 core-js
// 가 prototype 패치를 같이 emit 하므로 광범위 브라우저 (Safari 16+, 구
// Chromium, 임베디드 WebView 등) 까지 안전.
//
// Bundle 영향: lazy `await import("./pdf-canvas-viewer")` 안에서만 끌고 오는
// chunk 라 main bundle size 영향 0. worker chunk 만 modern → legacy 로 같이
// 교체 (entry-worker mismatch 시 protocol 불일치로 fail).
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
// Vite native: ?url 은 asset path 를 string 으로 export. worker 가 별도 chunk 로 emit.
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PIXELS_PER_PAGE = 2048 * 2048; // 4 MP backing-store cap
const MAX_DPR = 2.0;

export interface PdfCanvasMountOptions {
  /** Called after canvas paints. viewport size = CSS px. */
  onReady?: (viewport: { width: number; height: number; pageNumber: number }) => void;
  /** Called on document load / page render failure. */
  onError?: (err: unknown) => void;
  /** Abort signal — cancels in-flight render before paint. */
  signal?: AbortSignal;
}

interface RenderHandle {
  task: ReturnType<PDFPageProxy["render"]> | null;
}

const docCache = new Map<string, Promise<PDFDocumentProxy>>();
// container → current render handle (cancel previous on re-mount).
const containerRenderHandles = new WeakMap<HTMLElement, RenderHandle>();

function getDocument(blobUrl: string): Promise<PDFDocumentProxy> {
  const cached = docCache.get(blobUrl);
  if (cached) {
    return cached;
  }
  const promise = pdfjsLib.getDocument({ url: blobUrl }).promise;
  docCache.set(blobUrl, promise);
  return promise;
}

/**
 * Pick effective DPR for a target CSS-px viewport.
 *
 * Returns `min(devicePixelRatio, MAX_DPR=2.0)` capped further so backing-store
 * pixel count (`cssWidth × cssHeight × dpr²`) never exceeds `MAX_PIXELS_PER_PAGE
 * = 4 MP`. Retina iPad/iPhone 의 메모리 폭주 방지 + 50+ page PDF preload 의 heap
 * spike 차단 (plan §3 AC6 + §11 DPR clamp 정책).
 */
export function pickEffectiveDpr(cssWidth: number, cssHeight: number): number {
  const raw = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const clamped = Math.min(raw, MAX_DPR);
  const candidatePx = cssWidth * cssHeight * clamped * clamped;
  if (candidatePx <= MAX_PIXELS_PER_PAGE) {
    return clamped;
  }
  // sqrt: pixel = w * h * dpr^2 → dpr = sqrt(MAX / (w*h)).
  return Math.sqrt(MAX_PIXELS_PER_PAGE / (cssWidth * cssHeight));
}

function ensureCanvas(container: HTMLElement): HTMLCanvasElement {
  let canvas = container.querySelector<HTMLCanvasElement>("canvas[data-pdf-canvas]");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.dataset.pdfCanvas = "true";
    canvas.style.display = "block";
    // sprint-W21-sprint-4/S2: CSS stretch — annotation overlay (pdf-annotation-surface)
    // 와 정확히 같은 stage 사이즈 100% × 100% 로 표시. backing-store 는 PDF 의
    // native aspect ratio 보존 (선명도 유지). browser GPU 가 bilinear resample
    // 으로 stretch. pointer-events: none — pen/sticky/textBox click 이 surface
    // 로 통과해야 함 (iframe 시절 동작 회귀 X).
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    container.appendChild(canvas);
  }
  return canvas;
}

/**
 * Render `pageNumber` of `blobUrl` PDF into a canvas inside `container`.
 *
 * Idempotent: re-calling with the same container cancels any in-flight render
 * and re-uses the existing canvas. CSS width = container.clientWidth → page
 * aspect-ratio 유지. backing-store width = CSS width × effective DPR (clamp +
 * pixel cap 적용).
 */
export async function mountPdfCanvas(
  container: HTMLElement,
  blobUrl: string,
  pageNumber: number,
  options: PdfCanvasMountOptions = {}
): Promise<void> {
  const { onReady, onError, signal } = options;

  // cancel previous render on same container.
  const prev = containerRenderHandles.get(container);
  if (prev?.task) {
    try {
      prev.task.cancel();
    } catch {
      /* render task 가 이미 끝났거나 cancel 불가 — silent. */
    }
  }
  const handle: RenderHandle = { task: null };
  containerRenderHandles.set(container, handle);

  try {
    const pdf = await getDocument(blobUrl);
    if (signal?.aborted) return;

    const page = await pdf.getPage(pageNumber);
    if (signal?.aborted) return;

    const baseViewport = page.getViewport({ scale: 1 });
    const containerWidth = container.clientWidth || baseViewport.width;
    const scale = containerWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const effectiveDpr = pickEffectiveDpr(viewport.width, viewport.height);

    const canvas = ensureCanvas(container);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas 2d context unavailable");
    }

    // sprint-W21-sprint-4/S2: backing-store 는 viewport.width/height × DPR (PDF
    // native aspect 보존, 선명도 유지). CSS size 는 ensureCanvas 에서 100% × 100%
    // 으로 stretch → surface 와 좌표계 정합 (annotation overlay 의 0~1 ratio 그대로).
    canvas.width = Math.floor(viewport.width * effectiveDpr);
    canvas.height = Math.floor(viewport.height * effectiveDpr);

    ctx.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0);

    const renderTask = page.render({ canvasContext: ctx, viewport, canvas });
    handle.task = renderTask;
    await renderTask.promise;

    if (signal?.aborted) return;
    onReady?.({ width: viewport.width, height: viewport.height, pageNumber });
  } catch (err) {
    if (signal?.aborted) return;
    // pdfjs RenderingCancelledException 은 정상 흐름 (이전 render 가 cancel).
    if ((err as { name?: string } | null)?.name === "RenderingCancelledException") {
      return;
    }
    onError?.(err);
  } finally {
    if (containerRenderHandles.get(container) === handle) {
      handle.task = null;
    }
  }
}

/**
 * Remove the canvas inside `container` and release backing-store memory.
 * docCache 는 그대로 (다음 material 진입 시 재사용). 명시적 dispose 가 필요하면
 * `clearPdfDocumentCache(blobUrl)`.
 */
export function unmountPdfCanvas(container: HTMLElement): void {
  const handle = containerRenderHandles.get(container);
  if (handle?.task) {
    try {
      handle.task.cancel();
    } catch {
      /* silent */
    }
    handle.task = null;
  }
  const canvas = container.querySelector<HTMLCanvasElement>("canvas[data-pdf-canvas]");
  if (canvas) {
    // canvas 의 backing store 즉시 해제: width=0 으로 줄이면 GPU/CPU buffer 회수.
    canvas.width = 0;
    canvas.height = 0;
    canvas.remove();
  }
}

/**
 * Get the CSS-px viewport size of `pageNumber` at scale=1. annotation overlay
 * layout 가 화면 마운트 전 정보가 필요할 때.
 */
export async function getPageViewport(
  blobUrl: string,
  pageNumber: number
): Promise<{ width: number; height: number }> {
  const pdf = await getDocument(blobUrl);
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  return { width: viewport.width, height: viewport.height };
}

/**
 * Release pdfjs PDFDocumentProxy reference + clear cache entry. material switch
 * / unmount 시 호출해서 ArrayBuffer 메모리 회수.
 */
export function clearPdfDocumentCache(blobUrl?: string): void {
  if (blobUrl) {
    const promise = docCache.get(blobUrl);
    docCache.delete(blobUrl);
    promise
      ?.then((pdf) => {
        void pdf.destroy?.();
      })
      .catch(() => undefined);
    return;
  }
  for (const promise of docCache.values()) {
    promise
      .then((pdf) => {
        void pdf.destroy?.();
      })
      .catch(() => undefined);
  }
  docCache.clear();
}
