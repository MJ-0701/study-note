// sprint-2026-W22-sprint-2 / layer B/slice-2b — PDF 영역 horizontal swipe gesture.
// main.ts 의 handleDocumentTouchStart/Move/End/Cancel + commitPdfSwipeGesture
// (5 함수 + activeSwipeGesture state) 격리. slice-2a 패턴의 factory 형.
// module-private state (activeSwipeGesture) 보유 + listener option metadata
// (`{ passive: false }` for touchend) 노출.
//
// invariant:
//   - touchstart: touches.length !== 1 → swipe 후보 취소 (multi-touch =
//     pinch zoom 등).
//   - touchstart: target 이 `[data-pdf-annotation-surface]` 안 + `is-read-mode`
//     포함 + annotation element/입력 요소 미터치 + subjectId dataset 존재 시
//     에만 후보 기록.
//   - touchmove: 진행 중 swipe 가 multi-touch 로 진입하면 즉시 취소.
//   - touchend: nav button (`data-action="pdf-prev-page"|"pdf-next-page"`)
//     클릭 시 preventDefault + movePdfPage + renderApp + state 초기화
//     (iOS Safari ghost click 차단).
//   - commit: |dy| > |dx| (vertical scroll), surface 미존재, |dx| < threshold
//     (max(width × RATIO, MIN_PX)) → no-op.
//   - commit dx > 0 = prev (-1), dx < 0 = next (+1).
//   - touchend listener 만 `{ passive: false }`. 나머지 (start/move/cancel)
//     = `{ passive: true }`.
//   - preventDefault 는 nav button branch 에서만 호출. swipe commit 에서는
//     호출 X (scroll natural 보존).

import {
  SWIPE_THRESHOLD_MIN_PX,
  SWIPE_THRESHOLD_RATIO
} from "./constants.ts";

// ─── Public types ────────────────────────────────────────────────────────

/**
 * touch-swipe factory 가 외부 DOM/state 를 격리하는 read-only ctx.
 *
 * - querySurface: subjectId 에 해당하는 PDF annotation surface 를 찾는다.
 *   주로 `document.querySelector` wrapper. 미존재 시 null.
 * - getSurfaceWidth: surface 의 client width. 주로 getBoundingClientRect().width.
 */
export interface TouchSwipeContext {
  querySurface: (subjectId: string) => HTMLElement | null;
  getSurfaceWidth: (surface: HTMLElement) => number;
}

/**
 * touch-swipe factory 의 부수효과 callback.
 *
 * - movePdfPage: page nav. 좌 delta=-1, 우 delta=+1.
 * - renderApp: top-level render trigger.
 */
export interface TouchSwipeCallbacks {
  movePdfPage: (subjectId: string, delta: number) => void;
  renderApp: () => void;
}

/**
 * Listener registration option allowlist. touchend 만 non-passive 라 swipe
 * commit + nav button 의 preventDefault 가 작동. 나머지는 scroll perf 보존.
 */
export interface TouchSwipeListenerOptions {
  touchstart: { passive: true };
  touchmove: { passive: true };
  touchend: { passive: false };
  touchcancel: { passive: true };
}

/**
 * Module-level listener option SSoT. main.ts 의 addEventListener 호출이
 * 직접 import 하므로 factory instance 보다 일찍 평가돼야 하는 경우에 사용.
 * factory return 의 listenerOptions 와 동일 ref.
 */
export const TOUCH_SWIPE_LISTENER_OPTIONS: TouchSwipeListenerOptions = {
  touchstart: { passive: true },
  touchmove: { passive: true },
  touchend: { passive: false },
  touchcancel: { passive: true }
};

export interface TouchSwipeInstance {
  handleTouchStart: (event: TouchEvent) => void;
  handleTouchMove: (event: TouchEvent) => void;
  handleTouchEnd: (event: TouchEvent) => void;
  handleTouchCancel: (event: TouchEvent) => void;
  listenerOptions: TouchSwipeListenerOptions;
  /** test 용 — module-private state 의 snapshot. */
  peekActiveGesture: () => SwipeGestureState | null;
}

interface SwipeGestureState {
  subjectId: string;
  pointerId: number;
  startX: number;
  startY: number;
}

// ─── Factory ────────────────────────────────────────────────────────────

/**
 * activeSwipeGesture state + 5 handler 를 보유한 factory. main.ts 가 만든
 * instance 의 handler 4종을 document 의 touch* listener 로 등록한다.
 */
export function createTouchSwipe(
  ctx: TouchSwipeContext,
  callbacks: TouchSwipeCallbacks
): TouchSwipeInstance {
  let activeSwipeGesture: SwipeGestureState | null = null;

  // sprint-W21-sprint-4/S1: iOS Safari fast-tap dual handler for page nav
  // buttons. touchend 가 click 보다 먼저 발사되거나 click 이 누락되는 mobile
  // edge case 보완. preventDefault 로 ghost click 중복 차단.
  function handleTouchEnd(event: TouchEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      activeSwipeGesture = null;
      return;
    }
    const navButton = target.closest<HTMLButtonElement>(
      'button[data-action="pdf-prev-page"], button[data-action="pdf-next-page"]'
    );
    if (navButton && !navButton.disabled) {
      const action = navButton.dataset.action;
      const subjectId = navButton.dataset.subjectId;
      if (subjectId && (action === "pdf-prev-page" || action === "pdf-next-page")) {
        // click 중복 발사 차단. desktop 은 touchend 발사 X → 영향 없음.
        event.preventDefault();
        callbacks.movePdfPage(subjectId, action === "pdf-prev-page" ? -1 : 1);
        callbacks.renderApp();
        activeSwipeGesture = null;
        return;
      }
    }

    // sprint-W21-sprint-4/S4: PDF 영역 swipe gesture commit.
    commitPdfSwipeGesture(event);
  }

  // sprint-W21-sprint-4/S4: PDF 빈 영역 touchstart — read tool + single-touch +
  // annotation element 미터치 시에만 swipe 후보 기록.
  function handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) {
      // multi-touch 시작 = pinch zoom 등 — 진행 중 swipe 도 취소.
      activeSwipeGesture = null;
      return;
    }
    const touch = event.touches[0]!;
    const target = touch.target instanceof Element ? touch.target : null;
    if (!target) {
      activeSwipeGesture = null;
      return;
    }

    const surface = target.closest<HTMLElement>("[data-pdf-annotation-surface]");
    if (!surface) {
      activeSwipeGesture = null;
      return;
    }

    // read tool 외 (pen / eraser / sticky / textbox / checklist / table / chart)
    // 에서는 swipe 무시 — tool 우선.
    if (!surface.classList.contains("is-read-mode")) {
      activeSwipeGesture = null;
      return;
    }

    // annotation element (sticky / textBox / checklist / table / chart / ink stroke)
    // 위 touch 시 swipe 무시 — drag/click 우선.
    if (
      target.closest(
        "[data-note-id], [data-textbox-id], [data-checklist-id], [data-table-mount-id], [data-chart-mount-id], [data-stroke-id], button, a, input, textarea"
      )
    ) {
      activeSwipeGesture = null;
      return;
    }

    const subjectId = surface.dataset.subjectId;
    if (!subjectId) {
      activeSwipeGesture = null;
      return;
    }

    activeSwipeGesture = {
      subjectId,
      pointerId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY
    };
  }

  // sprint-W21-sprint-4/S4: touchmove — multi-touch 진입 시 swipe 후보 취소.
  function handleTouchMove(event: TouchEvent): void {
    if (!activeSwipeGesture) {
      return;
    }
    if (event.touches.length !== 1) {
      activeSwipeGesture = null;
    }
  }

  // sprint-W21-sprint-4/S4: touchend / touchcancel 에서 swipe threshold 평가 후
  // page nav 또는 무시.
  function commitPdfSwipeGesture(event: TouchEvent): void {
    const gesture = activeSwipeGesture;
    activeSwipeGesture = null;
    if (!gesture) {
      return;
    }
    const touch = Array.from(event.changedTouches).find(
      (t) => t.identifier === gesture.pointerId
    );
    if (!touch) {
      return;
    }
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    // vertical 우선: |dy| > |dx| = vertical scroll. swipe 아님.
    if (Math.abs(dy) > Math.abs(dx)) {
      return;
    }
    const surface = ctx.querySurface(gesture.subjectId);
    if (!surface) {
      return;
    }
    const surfaceWidth = ctx.getSurfaceWidth(surface);
    const threshold = Math.max(
      SWIPE_THRESHOLD_MIN_PX,
      surfaceWidth * SWIPE_THRESHOLD_RATIO
    );
    if (Math.abs(dx) < threshold) {
      return;
    }
    // 좌→우 dx>0 = 이전 page, 우→좌 dx<0 = 다음 page.
    callbacks.movePdfPage(gesture.subjectId, dx > 0 ? -1 : 1);
    callbacks.renderApp();
  }

  function handleTouchCancel(event: TouchEvent): void {
    if (activeSwipeGesture) {
      // touchcancel = OS / scroll engine 이 gesture 가로챔. commit 없이 cleanup.
      activeSwipeGesture = null;
    }
    void event;
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    listenerOptions: TOUCH_SWIPE_LISTENER_OPTIONS,
    peekActiveGesture: () => activeSwipeGesture
  };
}
