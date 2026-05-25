/**
 * touch-swipe.spec.ts — sprint-2026-W22-sprint-2 / layer B/slice-2b AC3+AC6.
 *
 * createTouchSwipe factory + 5 handler 의 characterization. multi-touch
 * abort + threshold (0.2 ratio / 60px min) + listener option metadata
 * (`{ passive: false }` for touchend) + preventDefault timing (nav button
 * branch 한정) 를 spec assertion 으로 잠근다.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/touch-swipe.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
  createTouchSwipe,
  type TouchSwipeCallbacks,
  type TouchSwipeContext,
  type TouchSwipeInstance
} from "../touch-swipe.ts";
import {
  SWIPE_THRESHOLD_MIN_PX,
  SWIPE_THRESHOLD_RATIO
} from "../constants.ts";

// ─── DOM stub helpers ────────────────────────────────────────────────────

interface StubElement {
  classList: { contains: (cls: string) => boolean };
  dataset: Record<string, string | undefined>;
  closest: (selector: string) => StubElement | null;
  disabled?: boolean;
}

function makeSurfaceElement(
  subjectId: string,
  isReadMode = true
): StubElement {
  const surface: StubElement = {
    classList: {
      contains: (cls) => (cls === "is-read-mode" ? isReadMode : false)
    },
    dataset: { subjectId },
    closest: (selector) =>
      selector === "[data-pdf-annotation-surface]" ? surface : null
  };
  return surface;
}

function makeTouchTarget(
  surface: StubElement | null,
  annotationCloseHit = false
): StubElement {
  const target: StubElement = {
    classList: { contains: () => false },
    dataset: {},
    closest: (selector) => {
      if (selector === "[data-pdf-annotation-surface]") {
        return surface;
      }
      if (selector.includes("data-note-id")) {
        // annotation element close selector — return self if hit, null otherwise.
        return annotationCloseHit ? target : null;
      }
      if (selector.startsWith("button[data-action=")) {
        return null;
      }
      return null;
    }
  };
  return target;
}

function makeTouch(target: StubElement | null, x: number, y: number, id = 0) {
  return {
    target,
    identifier: id,
    clientX: x,
    clientY: y
  };
}

function makeTouchEvent(
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  touches: ReturnType<typeof makeTouch>[],
  changed: ReturnType<typeof makeTouch>[],
  eventTarget: StubElement | null
): TouchEvent {
  let prevented = false;
  return {
    type,
    touches,
    changedTouches: changed,
    target: eventTarget,
    preventDefault: () => {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    }
  } as unknown as TouchEvent;
}

// Patch globalThis so `target instanceof Element` works in test runtime.
// node:test 환경엔 DOM Element 가 없으므로 stub 의 prototype 을 가짜 Element 로 본다.
class FakeElement {}
(globalThis as { Element?: unknown }).Element = FakeElement;
(makeSurfaceElement as unknown as { __proto__: typeof FakeElement }).__proto__ =
  FakeElement;

// Override the surface/target prototype chain.
function asElement<T extends object>(stub: T): T {
  return Object.setPrototypeOf(stub, FakeElement.prototype);
}

// ─── Test harness ────────────────────────────────────────────────────────

interface CallLog {
  movePdfPageCalls: Array<{ subjectId: string; delta: number }>;
  renderCalls: number;
}

function makeHarness(opts?: { surfaceWidth?: number }): {
  instance: TouchSwipeInstance;
  log: CallLog;
} {
  const log: CallLog = { movePdfPageCalls: [], renderCalls: 0 };
  const ctx: TouchSwipeContext = {
    querySurface: () => asElement(makeSurfaceElement("subj-1")) as unknown as HTMLElement,
    getSurfaceWidth: () => opts?.surfaceWidth ?? 800
  };
  const callbacks: TouchSwipeCallbacks = {
    movePdfPage: (subjectId, delta) => {
      log.movePdfPageCalls.push({ subjectId, delta });
    },
    renderApp: () => {
      log.renderCalls += 1;
    }
  };
  return { instance: createTouchSwipe(ctx, callbacks), log };
}

// ─── Listener option metadata (AC6 case 4) ───────────────────────────────

describe("createTouchSwipe — listener options metadata", () => {
  it("touchend listener option = { passive: false } (iOS preventDefault enable)", () => {
    const { instance } = makeHarness();
    assert.deepEqual(instance.listenerOptions.touchend, { passive: false });
  });

  it("touchstart/touchmove/touchcancel = { passive: true } (scroll perf)", () => {
    const { instance } = makeHarness();
    assert.deepEqual(instance.listenerOptions.touchstart, { passive: true });
    assert.deepEqual(instance.listenerOptions.touchmove, { passive: true });
    assert.deepEqual(instance.listenerOptions.touchcancel, { passive: true });
  });
});

// ─── handleTouchStart (gesture candidate filtering) ─────────────────────

describe("handleTouchStart", () => {
  let harness: ReturnType<typeof makeHarness>;
  beforeEach(() => {
    harness = makeHarness();
  });

  it("AC6 case 1: multi-touch (touches.length > 1) → aborts active gesture", () => {
    const surface = asElement(makeSurfaceElement("subj-1"));
    const target = asElement(makeTouchTarget(surface));
    // first record a single-touch gesture.
    harness.instance.handleTouchStart(
      makeTouchEvent(
        "touchstart",
        [makeTouch(target as unknown as StubElement, 100, 100)],
        [],
        target as unknown as StubElement
      )
    );
    assert.ok(harness.instance.peekActiveGesture());

    // now multi-touch — gesture must reset.
    harness.instance.handleTouchStart(
      makeTouchEvent(
        "touchstart",
        [
          makeTouch(target as unknown as StubElement, 100, 100, 0),
          makeTouch(target as unknown as StubElement, 200, 200, 1)
        ],
        [],
        target as unknown as StubElement
      )
    );
    assert.equal(harness.instance.peekActiveGesture(), null);
  });

  it("ignores when target is not inside annotation surface", () => {
    const target = asElement(makeTouchTarget(null));
    harness.instance.handleTouchStart(
      makeTouchEvent("touchstart", [makeTouch(target as unknown as StubElement, 100, 100)], [], target as unknown as StubElement)
    );
    assert.equal(harness.instance.peekActiveGesture(), null);
  });

  it("ignores when surface lacks is-read-mode class (tool mode)", () => {
    const surface = asElement(makeSurfaceElement("subj-1", false));
    const target = asElement(makeTouchTarget(surface));
    harness.instance.handleTouchStart(
      makeTouchEvent("touchstart", [makeTouch(target as unknown as StubElement, 100, 100)], [], target as unknown as StubElement)
    );
    assert.equal(harness.instance.peekActiveGesture(), null);
  });

  it("ignores when target is annotation element (drag/click priority)", () => {
    const surface = asElement(makeSurfaceElement("subj-1"));
    const target = asElement(makeTouchTarget(surface, true));
    harness.instance.handleTouchStart(
      makeTouchEvent("touchstart", [makeTouch(target as unknown as StubElement, 100, 100)], [], target as unknown as StubElement)
    );
    assert.equal(harness.instance.peekActiveGesture(), null);
  });

  it("records gesture when single-touch + read mode + non-annotation surface", () => {
    const surface = asElement(makeSurfaceElement("subj-1"));
    const target = asElement(makeTouchTarget(surface));
    harness.instance.handleTouchStart(
      makeTouchEvent("touchstart", [makeTouch(target as unknown as StubElement, 100, 200)], [], target as unknown as StubElement)
    );
    const gesture = harness.instance.peekActiveGesture();
    assert.ok(gesture);
    assert.equal(gesture?.subjectId, "subj-1");
    assert.equal(gesture?.startX, 100);
    assert.equal(gesture?.startY, 200);
  });
});

// ─── handleTouchMove ────────────────────────────────────────────────────

describe("handleTouchMove", () => {
  it("aborts gesture when multi-touch entered mid-move", () => {
    const { instance } = makeHarness();
    const surface = asElement(makeSurfaceElement("subj-1"));
    const target = asElement(makeTouchTarget(surface));
    instance.handleTouchStart(
      makeTouchEvent("touchstart", [makeTouch(target as unknown as StubElement, 0, 0)], [], target as unknown as StubElement)
    );
    assert.ok(instance.peekActiveGesture());

    instance.handleTouchMove(
      makeTouchEvent(
        "touchmove",
        [
          makeTouch(target as unknown as StubElement, 10, 0, 0),
          makeTouch(target as unknown as StubElement, 20, 0, 1)
        ],
        [],
        target as unknown as StubElement
      )
    );
    assert.equal(instance.peekActiveGesture(), null);
  });
});

// ─── handleTouchEnd nav button (AC6 case 5 — preventDefault timing) ────

describe("handleTouchEnd — nav button branch", () => {
  function makeNavButtonTarget(
    action: "pdf-prev-page" | "pdf-next-page",
    subjectId: string
  ): StubElement {
    const target: StubElement = {
      classList: { contains: () => false },
      dataset: {},
      closest: (selector) => {
        if (selector.startsWith("button[data-action=")) {
          const button: StubElement = {
            classList: { contains: () => false },
            dataset: { action, subjectId },
            closest: () => null,
            disabled: false
          };
          return asElement(button);
        }
        return null;
      }
    };
    return asElement(target);
  }

  it("AC6 case 5: prev nav button → preventDefault + movePdfPage(-1)", () => {
    const { instance, log } = makeHarness();
    const target = makeNavButtonTarget("pdf-prev-page", "subj-1");
    const event = makeTouchEvent("touchend", [], [], target);

    instance.handleTouchEnd(event);

    assert.equal((event as unknown as { defaultPrevented: boolean }).defaultPrevented, true);
    assert.deepEqual(log.movePdfPageCalls, [{ subjectId: "subj-1", delta: -1 }]);
    assert.equal(log.renderCalls, 1);
  });

  it("next nav button → preventDefault + movePdfPage(+1)", () => {
    const { instance, log } = makeHarness();
    const target = makeNavButtonTarget("pdf-next-page", "subj-1");
    const event = makeTouchEvent("touchend", [], [], target);

    instance.handleTouchEnd(event);

    assert.equal((event as unknown as { defaultPrevented: boolean }).defaultPrevented, true);
    assert.deepEqual(log.movePdfPageCalls, [{ subjectId: "subj-1", delta: 1 }]);
  });

  it("AC6 case 5 negative: non-nav touchend does NOT call preventDefault before commit", () => {
    const { instance } = makeHarness();
    const surface = asElement(makeSurfaceElement("subj-1"));
    const target = asElement(makeTouchTarget(surface));
    // no active gesture → commit immediately returns w/o preventDefault.
    const event = makeTouchEvent("touchend", [], [], target as unknown as StubElement);

    instance.handleTouchEnd(event);

    assert.equal(
      (event as unknown as { defaultPrevented: boolean }).defaultPrevented,
      false,
      "swipe commit branch must not preventDefault — scroll natural"
    );
  });
});

// ─── commitPdfSwipeGesture (AC6 case 2/3 — threshold) ──────────────────

describe("commitPdfSwipeGesture (via handleTouchEnd)", () => {
  function setupGesture(
    instance: TouchSwipeInstance,
    startX = 100,
    startY = 100
  ): StubElement {
    const surface = asElement(makeSurfaceElement("subj-1"));
    const target = asElement(makeTouchTarget(surface));
    instance.handleTouchStart(
      makeTouchEvent(
        "touchstart",
        [makeTouch(target as unknown as StubElement, startX, startY)],
        [],
        target as unknown as StubElement
      )
    );
    return target as unknown as StubElement;
  }

  it("AC6 case 2: |dx| under threshold (min 60px, ratio 0.2 of width) → no nav", () => {
    const { instance, log } = makeHarness({ surfaceWidth: 800 });
    setupGesture(instance, 100, 100);

    // dx = 50, threshold = max(60, 160) = 160 → under.
    const event = makeTouchEvent(
      "touchend",
      [],
      [makeTouch(null, 150, 100)],
      asElement(makeTouchTarget(null)) as unknown as StubElement
    );
    instance.handleTouchEnd(event);

    assert.equal(log.movePdfPageCalls.length, 0);
  });

  it("AC6 case 3a: dx > 0 over threshold → movePdfPage(-1) (prev)", () => {
    const { instance, log } = makeHarness({ surfaceWidth: 800 });
    setupGesture(instance, 100, 100);

    // dx = 200, threshold = 160. dx > 0 → -1 (prev).
    const event = makeTouchEvent(
      "touchend",
      [],
      [makeTouch(null, 300, 100)],
      asElement(makeTouchTarget(null)) as unknown as StubElement
    );
    instance.handleTouchEnd(event);

    assert.deepEqual(log.movePdfPageCalls, [{ subjectId: "subj-1", delta: -1 }]);
  });

  it("AC6 case 3b: dx < 0 over threshold → movePdfPage(+1) (next)", () => {
    const { instance, log } = makeHarness({ surfaceWidth: 800 });
    setupGesture(instance, 500, 100);

    // dx = -200, threshold = 160. dx < 0 → +1 (next).
    const event = makeTouchEvent(
      "touchend",
      [],
      [makeTouch(null, 300, 100)],
      asElement(makeTouchTarget(null)) as unknown as StubElement
    );
    instance.handleTouchEnd(event);

    assert.deepEqual(log.movePdfPageCalls, [{ subjectId: "subj-1", delta: 1 }]);
  });

  it("vertical scroll guard: |dy| > |dx| → no nav", () => {
    const { instance, log } = makeHarness();
    setupGesture(instance, 100, 100);

    // dy = 300, dx = 50. vertical wins → no nav.
    const event = makeTouchEvent(
      "touchend",
      [],
      [makeTouch(null, 150, 400)],
      asElement(makeTouchTarget(null)) as unknown as StubElement
    );
    instance.handleTouchEnd(event);

    assert.equal(log.movePdfPageCalls.length, 0);
  });

  it("threshold uses MIN_PX when ratio × width is smaller", () => {
    const { instance, log } = makeHarness({ surfaceWidth: 100 });
    setupGesture(instance, 0, 0);

    // dx = 50. threshold = max(60, 20) = 60. under.
    const event = makeTouchEvent(
      "touchend",
      [],
      [makeTouch(null, 50, 0)],
      asElement(makeTouchTarget(null)) as unknown as StubElement
    );
    instance.handleTouchEnd(event);
    assert.equal(log.movePdfPageCalls.length, 0);

    // dx = 70 — above 60.
    setupGesture(instance, 0, 0);
    const event2 = makeTouchEvent(
      "touchend",
      [],
      [makeTouch(null, 70, 0)],
      asElement(makeTouchTarget(null)) as unknown as StubElement
    );
    instance.handleTouchEnd(event2);
    assert.equal(log.movePdfPageCalls.length, 1);
  });
});

// ─── handleTouchCancel ───────────────────────────────────────────────────

describe("handleTouchCancel", () => {
  it("clears active gesture without commit", () => {
    const { instance, log } = makeHarness();
    const surface = asElement(makeSurfaceElement("subj-1"));
    const target = asElement(makeTouchTarget(surface));
    instance.handleTouchStart(
      makeTouchEvent("touchstart", [makeTouch(target as unknown as StubElement, 0, 0)], [], target as unknown as StubElement)
    );
    assert.ok(instance.peekActiveGesture());

    instance.handleTouchCancel(makeTouchEvent("touchcancel", [], [], null));

    assert.equal(instance.peekActiveGesture(), null);
    assert.equal(log.movePdfPageCalls.length, 0);
  });
});

// ─── Constants sanity ────────────────────────────────────────────────────

describe("threshold constants reference", () => {
  it("SWIPE_THRESHOLD_RATIO = 0.2, MIN_PX = 60", () => {
    assert.equal(SWIPE_THRESHOLD_RATIO, 0.2);
    assert.equal(SWIPE_THRESHOLD_MIN_PX, 60);
  });
});
