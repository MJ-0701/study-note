// sprint-2026-W22-sprint-3 / layer B/slice-2c — PDF pen ink stroke domain.
// main.ts 의 activeInkStroke state + ActiveInkStroke interface +
// commitActiveInkStrokeOnEsc + pointerdown/move/up 의 pen branch +
// reattachLiveInkPolyline + scheduleLiveStrokeRender + liveStrokeRafId +
// getSurfacePoint + toInkPoint + updateLiveStroke +
// measurePenStrokeNextPaintFromMark + formatSvgPoint 격리.
// slice-2a/2b 패턴 (named export + Context + Callbacks + DomainHelpers
// 주입 + module-private state) 일관.
//
// invariant:
//   - 좌표 0~1 ratio = surface 의 getBoundingClientRect rect 기준
//     normalizePdfPoint((event.clientX-rect.left)/rect.width,
//     (event.clientY-rect.top)/rect.height). 좌표는 ratio model 이므로
//     surface resize 에 무관.
//   - RAF batch = 같은 frame 안 pointermove N회 발사돼도 다음 RAF tick
//     1회만 setAttribute. liveStrokeRafId !== undefined 면 schedule skip.
//   - coalesced events = `PointerEvent.getCoalescedEvents()` 가 iOS
//     Safari 60Hz 보장 위해 단일 pointermove 안 multi-sample 반환. desktop
//     은 length 0 으로 동작 (AC20 회기 lesson — empty 시 event 자체로
//     fallback push).
//   - reattach after rerender = renderApp() 가 live ink layer SVG 를
//     rebuild → off-DOM livePolyline detach. RAF 안에서 새 stroke 가
//     진행 중이면 (carriedStroke === activeInkStroke) fresh polyline
//     재생성 + reference 갱신 (PR #53 R3 P2).
//   - pressure clamp = event.pressure ≤ 0 → undefined (PdfInkPoint
//     optional field).
//   - pointerId mismatch ignore = extend/commit 의 첫 guard.
//   - tap (points≤1) skip metric = pointerup commit 시 points.length>1
//     아니면 createInkStroke X + RUM emit X.
//   - next-paint mark = pen-commit-<ts>-<rand> mark → renderApp paint 후
//     RAF measure → pen-stroke.next-paint RUM emit (PR #53 R1 P2: per-stroke
//     closure markId; R3 P1: paint 완료 후 measure RAF).

import type {
  PdfInkPoint,
  PdfInkStroke,
  PdfMaterialDraft,
  SubjectPdfWorkspace
} from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

/**
 * In-progress ink stroke state. pointerdown 에서 init, pointermove 에서
 * points push, pointerup 에서 commit/reset. livePolyline 은 live ink layer
 * 내부 SVG element ref (rerender 후 reattach 시 fresh element 로 swap).
 */
export interface ActiveInkStroke {
  subjectId: string;
  pointerId: number;
  pageNumber: number;
  points: PdfInkPoint[];
  livePolyline: SVGPolylineElement;
}

/**
 * ink-stroke 함수가 read-only 로 접근하는 main.ts state. broad selector
 * 노출 X — surface 조회 1개만.
 *
 * - querySurface: subjectId 에 해당하는 PDF annotation surface element.
 *   주로 `document.querySelector` wrapper. 미존재 시 null.
 */
export interface InkStrokeContext {
  querySurface: (subjectId: string) => HTMLElement | null;
}

/**
 * ink-stroke 함수의 부수효과 callback. broad mutator 노출 X.
 *
 * - updatePdfWorkspace: workspace-store updater (subject 단위) —
 *   inkStrokes 배열에 commit 된 stroke 추가.
 * - renderApp: top-level render trigger. pointerup commit 시 RAF 안에서
 *   1회 호출 (PR #53 R3 P2).
 * - trackRumAction: Datadog RUM action emit — pen-stroke.next-paint
 *   metric tag (durationMs).
 */
export interface InkStrokeCallbacks {
  updatePdfWorkspace: (
    subjectId: string,
    updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
  ) => void;
  renderApp: () => void;
  trackRumAction: (name: string, context?: { durationMs: number }) => void;
}

/**
 * domain runtime helper 를 main.ts 가 주입. workspace-store / class-date
 * 와 동일 패턴 — `@study-note/domain` 을 runtime import 하면 node:test
 * --experimental-strip-types 가 `export * from "./..."` extension-less
 * import 를 해결 못 함.
 */
export interface InkStrokeDomainHelpers {
  createInkStroke: (pageNumber: number, points: PdfInkPoint[]) => PdfInkStroke;
  normalizePdfPoint: (x: number, y: number) => { x: number; y: number };
}

// ─── Module-private state ─────────────────────────────────────────────

let activeInkStroke: ActiveInkStroke | undefined;
let liveStrokeRafId: number | undefined;

// ─── Stateless helpers (named export) ─────────────────────────────────

/**
 * formatSvgPoint — `<polyline points="x1,y1 x2,y2 ...">` 의 single point
 * 직렬화. x = 0~1000 (round 1000×), y = 0~1414 (round 1414× = A4 aspect).
 * renderInkStroke + reattachLiveInkPolyline + updateLiveStroke 가 공유.
 */
export function formatSvgPoint(point: { x: number; y: number }): string {
  return `${Math.round(point.x * 1000)},${Math.round(point.y * 1414)}`;
}

/**
 * toInkPoint — surface-relative normalized point + PointerEvent →
 * PdfInkPoint (pressure clamp + timestamp). pressure ≤ 0 → undefined
 * (optional field, mouse 등 비-pen pointer 에 0 default 가 들어옴).
 */
export function toInkPoint(
  point: { x: number; y: number },
  event: PointerEvent
): PdfInkPoint {
  return {
    x: point.x,
    y: point.y,
    pressure: event.pressure > 0 ? Number(event.pressure.toFixed(3)) : undefined,
    t: Date.now()
  };
}

/**
 * getSurfacePoint — clientX/Y → surface rect → 0~1 ratio normalized
 * point → PdfInkPoint (pressure + t). pointerdown / pointermove ink
 * branch 가 점 1개 계산 시 호출. main.ts 의 다른 도구 branch (sticky /
 * text / checklist / table / chart / star / eraser) 도 본 함수 재사용 —
 * .x/.y 만 쓰고 pressure/t 무시.
 */
export function getSurfacePoint(
  event: PointerEvent,
  surface: HTMLElement,
  helpers: InkStrokeDomainHelpers
): PdfInkPoint {
  const rect = surface.getBoundingClientRect();
  const point = helpers.normalizePdfPoint(
    (event.clientX - rect.left) / rect.width,
    (event.clientY - rect.top) / rect.height
  );
  return toInkPoint(point, event);
}

// ─── Live polyline render (RAF batched) ───────────────────────────────

function updateLiveStroke(): void {
  if (!activeInkStroke) return;
  activeInkStroke.livePolyline.setAttribute(
    "points",
    activeInkStroke.points.map(formatSvgPoint).join(" ")
  );
}

/**
 * scheduleLiveStrokeRender — 같은 frame 안 N회 호출돼도 다음 RAF tick
 * 1회만 setAttribute. liveStrokeRafId !== undefined 면 dedupe (early
 * return). 본 함수는 module-private; main.ts wrapper 가 호출 X (extend
 * 안에서 자동 schedule).
 */
function scheduleLiveStrokeRender(): void {
  if (liveStrokeRafId !== undefined) return;
  liveStrokeRafId = requestAnimationFrame(() => {
    liveStrokeRafId = undefined;
    updateLiveStroke();
  });
}

// ─── Reattach / measure ───────────────────────────────────────────────

/**
 * reattachLiveInkPolyline — renderApp() 가 live ink layer SVG 를 rebuild
 * 한 직후, 새 SVG 안에 stroke.livePolyline 의 fresh element 를 재생성
 * + attribute 복원 + reference 갱신. pointermove 의 setAttribute 가
 * detached element 에 쓰이지 않게 함 (PR #53 R3 P2).
 */
export function reattachLiveInkPolyline(
  stroke: ActiveInkStroke,
  ctx: InkStrokeContext
): void {
  const surface = ctx.querySurface(stroke.subjectId);
  if (!surface) return;
  const liveLayer = surface.querySelector<SVGElement>("[data-live-ink-layer]");
  if (!liveLayer) return;
  const SVG_NS_LOCAL = "http://www.w3.org/2000/svg";
  const fresh = document.createElementNS(SVG_NS_LOCAL, "polyline");
  for (const attr of Array.from(stroke.livePolyline.attributes)) {
    fresh.setAttribute(attr.name, attr.value);
  }
  fresh.setAttribute("points", stroke.points.map(formatSvgPoint).join(" "));
  liveLayer.appendChild(fresh);
  stroke.livePolyline = fresh;
}

/**
 * measurePenStrokeNextPaintFromMark — pointerup commit 후 RAF 안에서
 * renderApp() paint 완료 → 다음 RAF callback 에서 measure → Datadog RUM
 * emit. mark 가 없으면 RAF 안에서 measure 실패하므로 try/catch 로 본
 * 함수 자체 noop. performance API 미존재 시 (Node runtime) early return.
 */
export function measurePenStrokeNextPaintFromMark(
  markId: string,
  callbacks: InkStrokeCallbacks
): void {
  if (typeof performance === "undefined" || !performance.mark || !performance.measure) {
    return;
  }
  try {
    const measureName = `pen-stroke-next-paint-${markId}`;
    performance.measure(measureName, markId);
    const entries = performance.getEntriesByName(measureName);
    const durationMs =
      entries.length > 0 ? Math.round(entries[entries.length - 1]!.duration) : -1;
    callbacks.trackRumAction("pen-stroke.next-paint", { durationMs });
    performance.clearMarks(markId);
    performance.clearMeasures(measureName);
  } catch {
    // performance.measure 에러 무시 — RUM emit 못해도 stroke commit 정상.
  }
}

// ─── Pointer handlers (named export) ──────────────────────────────────

/**
 * beginInkStroke — pointerdown 의 pen tool branch. live ink layer 미존재
 * 시 noop. setPointerCapture (try/catch — synthetic smoke event 대응) +
 * livePolyline 생성 + activeInkStroke init + updateLiveStroke 1회 (첫
 * point 만 그리기).
 */
export function beginInkStroke(
  event: PointerEvent,
  surface: HTMLElement,
  subjectId: string,
  material: PdfMaterialDraft,
  initialPoint: PdfInkPoint
): void {
  const liveLayer = surface.querySelector<SVGSVGElement>("[data-live-ink-layer]");
  if (!liveLayer) return;

  event.preventDefault();
  try {
    surface.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic smoke events do not always register as active browser pointers.
  }

  const livePolyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  livePolyline.setAttribute("class", "ink-stroke is-live");
  liveLayer.append(livePolyline);

  activeInkStroke = {
    subjectId,
    pointerId: event.pointerId,
    pageNumber: material.selectedPage,
    points: [initialPoint],
    livePolyline
  };
  updateLiveStroke();
}

/**
 * extendInkStroke — pointermove 의 pen branch. pointerId mismatch 시
 * noop. surface 가 사라졌으면 noop (rerender 도중 race 방어). coalesced
 * events 가 있으면 multi-sample push, 없으면 (desktop) event 자체 1
 * point push. setAttribute = RAF batch (scheduleLiveStrokeRender).
 */
export function extendInkStroke(
  event: PointerEvent,
  ctx: InkStrokeContext,
  helpers: InkStrokeDomainHelpers
): void {
  if (!activeInkStroke || activeInkStroke.pointerId !== event.pointerId) {
    return;
  }
  const surface = ctx.querySurface(activeInkStroke.subjectId);
  if (!surface) return;

  event.preventDefault();
  const coalesced =
    typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
  if (coalesced.length > 0) {
    for (const c of coalesced) {
      activeInkStroke.points.push(getSurfacePoint(c, surface, helpers));
    }
  } else {
    activeInkStroke.points.push(getSurfacePoint(event, surface, helpers));
  }
  scheduleLiveStrokeRender();
}

/**
 * commitInkStroke — pointerup 의 pen branch. pointerId mismatch 시 false.
 * points>1 이면 createInkStroke + workspace push + RUM mark/measure
 * pipeline. points≤1 (tap) 이면 commit 안 됨 + RUM emit skip.
 * livePolyline 항상 detach + activeInkStroke = undefined. true 반환 시
 * commit 발생 = caller 가 추가 분기 가능.
 *
 * RAF pipeline: 첫 RAF = renderApp + (carriedStroke 새 stroke 진행 중일
 * 때) reattachLiveInkPolyline. 두 번째 RAF = measurePenStrokeNextPaintFromMark
 * (paint 완료 후 measure — PR #53 R3 P1).
 */
export function commitInkStroke(
  event: PointerEvent,
  ctx: InkStrokeContext,
  callbacks: InkStrokeCallbacks,
  helpers: InkStrokeDomainHelpers
): boolean {
  if (!activeInkStroke || activeInkStroke.pointerId !== event.pointerId) {
    return false;
  }
  const { subjectId, pageNumber, points } = activeInkStroke;
  const committed = points.length > 1;

  if (committed) {
    const stroke = helpers.createInkStroke(pageNumber, points);
    callbacks.updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      inkStrokes: [...workspace.inkStrokes, stroke]
    }));
  }

  activeInkStroke.livePolyline.remove();
  activeInkStroke = undefined;

  if (!committed) {
    return false;
  }

  const markId = `pen-commit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(markId);
  }
  requestAnimationFrame(() => {
    const carriedStroke = activeInkStroke;
    callbacks.renderApp();
    if (carriedStroke && activeInkStroke === carriedStroke) {
      reattachLiveInkPolyline(carriedStroke, ctx);
    }
    requestAnimationFrame(() => {
      measurePenStrokeNextPaintFromMark(markId, callbacks);
    });
  });
  return true;
}

/**
 * commitActiveInkStrokeOnEsc — ESC 키의 reset-tool action. in-progress
 * stroke 가 있으면 points>1 시 workspace push (commit pointerup 분기와
 * 동일 의미), points≤1 시 폐기. livePolyline detach + state reset.
 * RAF / RUM measure 는 미발생 (ESC = synchronous reset, paint timing
 * 측정 의미 없음 — sprint-W21-sprint-1/S5/AC22).
 */
export function commitActiveInkStrokeOnEsc(
  callbacks: InkStrokeCallbacks,
  helpers: InkStrokeDomainHelpers
): void {
  if (!activeInkStroke) return;
  const { subjectId, pageNumber, points } = activeInkStroke;
  if (points.length > 1) {
    const stroke = helpers.createInkStroke(pageNumber, points);
    callbacks.updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      inkStrokes: [...workspace.inkStrokes, stroke]
    }));
  }
  activeInkStroke.livePolyline.remove();
  activeInkStroke = undefined;
}

// ─── Test helpers (named export, test-only usage) ─────────────────────

/** peekActiveInkStroke — test 가 module-private state snapshot 읽기. */
export function peekActiveInkStroke(): ActiveInkStroke | undefined {
  return activeInkStroke;
}

/**
 * __resetInkStrokeForTest — test 가 spec 사이에 state 초기화. liveStrokeRafId
 * 도 함께 reset (pending RAF callback 이 다음 test 를 오염시키지 않게).
 */
export function __resetInkStrokeForTest(): void {
  activeInkStroke = undefined;
  if (liveStrokeRafId !== undefined) {
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(liveStrokeRafId);
    }
    liveStrokeRafId = undefined;
  }
}

/** peekLiveStrokeRafId — test 가 RAF dedup 검증 위해 internal id snapshot. */
export function peekLiveStrokeRafId(): number | undefined {
  return liveStrokeRafId;
}
