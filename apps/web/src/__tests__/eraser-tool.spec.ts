// sprint-11/slice-2 spec — eraseClosestStroke reducer (AC10).
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/eraser-tool.spec.ts
//
// 좌표계: normalized 0..1 (PdfInkPoint.x / .y 와 동일 — getSurfacePoint 결과).
// 임계값(threshold): normalized distance. 단위 테스트는 DOM-free; 브라우저 픽셀 의존 없음.
//
// Tie-break 규칙: 동거리(equidistant) stroke 가 복수일 경우 id 가 lexicographically
// 큰(더 새로운) stroke 를 삭제한다. createInkStroke id = "stroke-{timestamp}-{len}"
// 이므로 timestamp 기준 최신 stroke 삭제 = 가장 자연스러운 UX.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Minimal type stubs — mirrors packages/domain PdfInkStroke shape.
// Spec is self-contained (no Vite/DOM imports from main.ts).
// ---------------------------------------------------------------------------
interface InkPoint {
  x: number;
  y: number;
  t: number;
  pressure?: number;
}

interface InkStroke {
  id: string;
  pageNumber: number;
  color: string;
  width: number;
  points: InkPoint[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// eraseClosestStroke — inline copy of the pure reducer from main.ts.
// This duplication is intentional: keeps the spec self-contained and runnable
// without the Vite bundler.
//
// Algorithm: O(S × P). For each stroke, compute min Euclidean distance to any
// point. Hit candidate = any stroke whose min-distance ≤ threshold.
// Among candidates, the one with the smallest distance wins; tie → largest id.
// ---------------------------------------------------------------------------
function eraseClosestStroke(
  strokes: InkStroke[],
  clickX: number,
  clickY: number,
  threshold: number
): InkStroke[] {
  let bestId: string | undefined;
  let bestDist = Infinity;

  for (const stroke of strokes) {
    let minDist = Infinity;

    for (const pt of stroke.points) {
      const dx = pt.x - clickX;
      const dy = pt.y - clickY;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < minDist) {
        minDist = d;
      }
    }

    if (minDist <= threshold) {
      if (
        minDist < bestDist ||
        (minDist === bestDist && stroke.id > (bestId ?? ""))
      ) {
        bestDist = minDist;
        bestId = stroke.id;
      }
    }
  }

  if (bestId === undefined) {
    return strokes;
  }

  return strokes.filter((s) => s.id !== bestId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeStroke(
  id: string,
  points: Array<{ x: number; y: number }>
): InkStroke {
  return {
    id,
    pageNumber: 1,
    color: "#1a1a1a",
    width: 3,
    points: points.map((p) => ({ ...p, t: 0 })),
    createdAt: new Date().toISOString()
  };
}

const THRESHOLD = 0.02; // normalized; ≈ 16px on 800px surface

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("eraseClosestStroke (sprint-11/slice-2 AC10)", () => {
  // Case 1: 빈 배열 — 변화 없음
  it("빈 stroke 배열 → 그대로 반환", () => {
    const result = eraseClosestStroke([], 0.5, 0.5, THRESHOLD);
    assert.deepEqual(result, []);
  });

  // Case 2: hit 없음 (모든 stroke 가 threshold 밖) → 변화 없음
  it("모든 stroke 가 threshold 밖 → 배열 변경 없음", () => {
    const strokes = [
      makeStroke("stroke-1", [{ x: 0.9, y: 0.9 }]),
      makeStroke("stroke-2", [{ x: 0.1, y: 0.1 }])
    ];
    // click at (0.5, 0.5), threshold = 0.02 — both strokes are far away
    const result = eraseClosestStroke(strokes, 0.5, 0.5, THRESHOLD);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, "stroke-1");
    assert.equal(result[1].id, "stroke-2");
  });

  // Case 3: hit 1개 → 그 stroke 만 삭제
  it("반경 안 stroke 1개 → 해당 stroke 삭제, 나머지 유지", () => {
    const strokes = [
      makeStroke("stroke-hit", [{ x: 0.501, y: 0.501 }]), // distance ≈ 0.0014 — 임계 이내
      makeStroke("stroke-far", [{ x: 0.9, y: 0.9 }])       // distance ≈ 0.566  — 임계 밖
    ];
    const result = eraseClosestStroke(strokes, 0.5, 0.5, THRESHOLD);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "stroke-far");
  });

  // Case 4: hit 다수 — 가장 가까운 1개만 삭제
  it("반경 안 stroke 다수 → 가장 가까운 stroke 1개만 삭제", () => {
    const strokes = [
      makeStroke("stroke-close", [{ x: 0.505, y: 0.505 }]), // dist ≈ 0.007
      makeStroke("stroke-near",  [{ x: 0.51,  y: 0.51  }]), // dist ≈ 0.014
      makeStroke("stroke-far",   [{ x: 0.9,   y: 0.9   }])  // dist ≈ 0.566 (밖)
    ];
    const result = eraseClosestStroke(strokes, 0.5, 0.5, THRESHOLD);
    assert.equal(result.length, 2);
    // stroke-close 는 삭제됨
    assert.ok(result.every((s) => s.id !== "stroke-close"));
    // stroke-near 과 stroke-far 는 남음
    assert.ok(result.some((s) => s.id === "stroke-near"));
    assert.ok(result.some((s) => s.id === "stroke-far"));
  });

  // Case 5: 동거리 tie-break — id 가 lexicographically 큰 stroke 삭제
  it("동거리 stroke 2개 → id 가 큰(lexicographically later) stroke 삭제", () => {
    // 두 stroke 모두 (0.5, 0.5) 에 point 를 가짐 → distance = 0 (same)
    const strokes = [
      makeStroke("stroke-2025-1000", [{ x: 0.5, y: 0.5 }]), // 나중 id (larger)
      makeStroke("stroke-2024-0001", [{ x: 0.5, y: 0.5 }])  // 이전 id (smaller)
    ];
    const result = eraseClosestStroke(strokes, 0.5, 0.5, THRESHOLD);
    assert.equal(result.length, 1);
    // 더 큰 id("stroke-2025-1000") 가 삭제됨
    assert.equal(result[0].id, "stroke-2024-0001");
  });

  // Case 6: stroke 의 여러 point 중 하나라도 반경 안이면 hit
  it("stroke 의 일부 point 만 반경 안에 있어도 hit 로 인식", () => {
    const strokes = [
      // 첫 point 는 멀지만 두 번째 point 는 클릭 좌표와 일치
      makeStroke("stroke-partial", [
        { x: 0.9, y: 0.9 },
        { x: 0.5, y: 0.5 }
      ]),
      makeStroke("stroke-far", [{ x: 0.0, y: 0.0 }])
    ];
    const result = eraseClosestStroke(strokes, 0.5, 0.5, THRESHOLD);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "stroke-far");
  });

  // Case 7: 임계 경계값 — threshold 이내 거리 = hit
  it("threshold 이내 거리의 stroke 는 삭제됨", () => {
    // Place point at (0.5 + 0.01, 0.5) → distance = 0.01 < threshold(0.02)
    // Note: exact 0.02 cannot be tested due to floating-point precision (0.52-0.5 > 0.02 in IEEE754).
    const strokes = [
      makeStroke("stroke-boundary", [{ x: 0.51, y: 0.5 }])
    ];
    const result = eraseClosestStroke(strokes, 0.5, 0.5, THRESHOLD);
    assert.equal(result.length, 0); // 삭제됨
  });

  // Case 8: 임계 경계값 — threshold 보다 큰 거리 = miss
  it("distance > threshold 인 stroke 는 삭제하지 않음", () => {
    // Place at distance 0.03 (clearly outside threshold = 0.02)
    const strokes = [
      makeStroke("stroke-outside", [{ x: 0.53, y: 0.5 }])
    ];
    const result = eraseClosestStroke(strokes, 0.5, 0.5, THRESHOLD);
    assert.equal(result.length, 1); // 유지됨
  });

  // Case 9 (선택): 클릭 좌표 = 경계 밖 (음수)
  it("클릭 좌표가 normalized 범위 밖(음수)이어도 오류 없이 동작", () => {
    // stroke at (0.01, 0.01) — positive, within normalized range
    // click at (-0.01, -0.01) — negative (e.g. click on toolbar rendered above surface)
    // distance = sqrt(0.02^2 + 0.02^2) ≈ 0.0283 > threshold=0.02 → miss
    const strokes = [makeStroke("stroke-1", [{ x: 0.01, y: 0.01 }])];
    const result = eraseClosestStroke(strokes, -0.01, -0.01, THRESHOLD);
    assert.equal(result.length, 1); // 삭제 안 됨
  });
});
