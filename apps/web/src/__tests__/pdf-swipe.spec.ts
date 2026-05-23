// sprint-W21-sprint-4/S4: PDF 영역 horizontal swipe gesture 의 threshold +
// direction 판정 단위 검증.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/__tests__/pdf-swipe.spec.ts
//
// 본 spec 은 self-contained (textbox-tool.spec.ts pattern) — pure decision
// function 을 inline mirror 해서 검증. main.ts 의 commitPdfSwipeGesture 의
// threshold + direction logic 과 항상 동기화.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// SWIPE thresholds — main.ts mirror.
// ---------------------------------------------------------------------------
const SWIPE_THRESHOLD_RATIO = 0.2;
const SWIPE_THRESHOLD_MIN_PX = 60;

type SwipeOutcome = "ignore" | "prev-page" | "next-page";

function evaluateSwipeOutcome(args: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  surfaceWidth: number;
}): SwipeOutcome {
  const dx = args.endX - args.startX;
  const dy = args.endY - args.startY;
  if (Math.abs(dy) > Math.abs(dx)) {
    return "ignore";
  }
  const threshold = Math.max(
    SWIPE_THRESHOLD_MIN_PX,
    args.surfaceWidth * SWIPE_THRESHOLD_RATIO
  );
  if (Math.abs(dx) < threshold) {
    return "ignore";
  }
  return dx > 0 ? "prev-page" : "next-page";
}

// ---------------------------------------------------------------------------
// Threshold computation
// ---------------------------------------------------------------------------

describe("swipe threshold = max(20%, 60px)", () => {
  it("surface 1000px → threshold = 200px (20% > 60px)", () => {
    // dx 199 → ignore.
    assert.equal(
      evaluateSwipeOutcome({ startX: 0, startY: 0, endX: 199, endY: 0, surfaceWidth: 1000 }),
      "ignore"
    );
    // dx 200 → prev-page (즉 좌→우).
    assert.equal(
      evaluateSwipeOutcome({ startX: 0, startY: 0, endX: 200, endY: 0, surfaceWidth: 1000 }),
      "prev-page"
    );
  });

  it("surface 200px → threshold = 60px (60px > 20% = 40px)", () => {
    // dx 59 → ignore.
    assert.equal(
      evaluateSwipeOutcome({ startX: 0, startY: 0, endX: 59, endY: 0, surfaceWidth: 200 }),
      "ignore"
    );
    // dx 60 → prev-page.
    assert.equal(
      evaluateSwipeOutcome({ startX: 0, startY: 0, endX: 60, endY: 0, surfaceWidth: 200 }),
      "prev-page"
    );
  });

  it("surface 360px (mobile portrait) → threshold = 72px (20% > 60px)", () => {
    assert.equal(
      evaluateSwipeOutcome({ startX: 0, startY: 0, endX: 71, endY: 0, surfaceWidth: 360 }),
      "ignore"
    );
    assert.equal(
      evaluateSwipeOutcome({ startX: 0, startY: 0, endX: 72, endY: 0, surfaceWidth: 360 }),
      "prev-page"
    );
  });
});

// ---------------------------------------------------------------------------
// Direction (좌→우 = 이전, 우→좌 = 다음)
// ---------------------------------------------------------------------------

describe("swipe direction", () => {
  it("좌→우 (dx > 0, threshold 통과) = prev-page", () => {
    assert.equal(
      evaluateSwipeOutcome({
        startX: 100,
        startY: 100,
        endX: 400,
        endY: 100,
        surfaceWidth: 1000
      }),
      "prev-page"
    );
  });

  it("우→좌 (dx < 0, threshold 통과) = next-page", () => {
    assert.equal(
      evaluateSwipeOutcome({
        startX: 400,
        startY: 100,
        endX: 100,
        endY: 100,
        surfaceWidth: 1000
      }),
      "next-page"
    );
  });
});

// ---------------------------------------------------------------------------
// Vertical scroll 우선 (|dy| > |dx| 면 swipe 무시)
// ---------------------------------------------------------------------------

describe("vertical scroll wins (|dy| > |dx|)", () => {
  it("dy=300 / dx=200 = ignore (vertical scroll)", () => {
    assert.equal(
      evaluateSwipeOutcome({
        startX: 100,
        startY: 100,
        endX: 300,
        endY: 400,
        surfaceWidth: 1000
      }),
      "ignore"
    );
  });

  it("dy=100 / dx=300 = prev-page (horizontal 우세)", () => {
    assert.equal(
      evaluateSwipeOutcome({
        startX: 100,
        startY: 100,
        endX: 400,
        endY: 200,
        surfaceWidth: 1000
      }),
      "prev-page"
    );
  });

  it("dy=200 / dx=-200 = ignore (동률 시 vertical 처리, |dy| > |dx| false 면 horizontal — 본 경우 false 라 horizontal)", () => {
    // |dy| (200) > |dx| (200) 가 false → horizontal path. threshold 200 < 0.2 ×1000=200 → ignore (정확히 동일).
    // 단 본 spec 의 의도 = boundary 케이스 명시. 동률 dx 200 = threshold 200 → < threshold false → outcome 계산.
    // 200 < 200 false → outcome = next-page (dx=-200 음수).
    const out = evaluateSwipeOutcome({
      startX: 200,
      startY: 0,
      endX: 0,
      endY: 200,
      surfaceWidth: 1000
    });
    // |dy| = 200, |dx| = 200 → |dy| > |dx| false → horizontal path. threshold = 200. |dx|=200 < 200 false → next-page.
    assert.equal(out, "next-page");
  });
});

// ---------------------------------------------------------------------------
// 미세 movement (tap / drift) ignore
// ---------------------------------------------------------------------------

describe("micro movement ignore", () => {
  it("dx=5 / dy=2 = ignore (tap drift)", () => {
    assert.equal(
      evaluateSwipeOutcome({
        startX: 100,
        startY: 100,
        endX: 105,
        endY: 102,
        surfaceWidth: 1000
      }),
      "ignore"
    );
  });

  it("dx=0 / dy=0 = ignore (정지 tap)", () => {
    assert.equal(
      evaluateSwipeOutcome({
        startX: 100,
        startY: 100,
        endX: 100,
        endY: 100,
        surfaceWidth: 1000
      }),
      "ignore"
    );
  });
});
