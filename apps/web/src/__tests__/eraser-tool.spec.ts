// sprint-11/slice-2-refine spec — eraseStrokePointsInRadius reducer (AC10 R10-b).
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/eraser-tool.spec.ts
//
// 좌표계: normalized 0..1 (PdfInkPoint.x / .y 와 동일 — getSurfacePoint 결과).
// 반경(radius): normalized distance. 단위 테스트는 DOM-free; 브라우저 픽셀 의존 없음.
//
// 핵심 동작:
//   - 각 stroke 의 points 중 (cx,cy) 로부터 거리 ≤ radius 인 point 를 제거.
//   - 연속 생존 point 그룹 = segment. segment 길이 < 2 → drop.
//   - hit 없는 stroke = 원본 reference 그대로.
//   - split 된 segment id = "${origId}-s${segmentIndex}".

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
// eraseStrokePointsInRadius — inline copy of the pure reducer from main.ts.
// This duplication is intentional: keeps the spec self-contained and runnable
// without the Vite bundler.
//
// Algorithm: O(S × P). For each stroke, remove points within radius of (cx,cy).
// Consecutive surviving points form a segment; segments with < 2 points are dropped.
// Strokes with no hit points are returned as-is (same reference).
// Split segment id = `${origId}-s${segmentIndex}`.
// ---------------------------------------------------------------------------
function eraseStrokePointsInRadius(
  strokes: InkStroke[],
  cx: number,
  cy: number,
  radius: number
): InkStroke[] {
  const result: InkStroke[] = [];

  for (const stroke of strokes) {
    // Fast path: check if ANY point is within radius before splitting.
    let hasHit = false;

    for (const pt of stroke.points) {
      const dx = pt.x - cx;
      const dy = pt.y - cy;

      if (dx * dx + dy * dy <= radius * radius) {
        hasHit = true;
        break;
      }
    }

    if (!hasHit) {
      result.push(stroke);
      continue;
    }

    // Split: collect surviving-point segments. Each gap (erased point) ends
    // the current segment and starts a new one.
    const segments: InkPoint[][] = [];
    let current: InkPoint[] = [];

    for (const pt of stroke.points) {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const inRadius = dx * dx + dy * dy <= radius * radius;

      if (inRadius) {
        if (current.length > 0) {
          segments.push(current);
          current = [];
        }
      } else {
        current.push(pt);
      }
    }

    if (current.length > 0) {
      segments.push(current);
    }

    for (let i = 0; i < segments.length; i++) {
      const pts = segments[i];

      if (pts.length < 2) {
        continue;
      }

      result.push({
        ...stroke,
        id: `${stroke.id}-s${i}`,
        points: pts
      });
    }
  }

  return result;
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

const RADIUS = 0.02; // normalized; ≈ 16px on 800px surface

// 두 점 사이 거리 (normalized).
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("eraseStrokePointsInRadius (sprint-11/slice-2-refine AC10 R10-b)", () => {
  // Case 1: 빈 배열 → 변화 없음
  it("빈 stroke 배열 → 그대로 반환", () => {
    const result = eraseStrokePointsInRadius([], 0.5, 0.5, RADIUS);
    assert.deepEqual(result, []);
  });

  // Case 2: 영역 안 point 없음 → 모든 stroke 그대로 (동일 참조)
  it("영역 안 point 없음 → 모든 stroke 변경 없음 + 동일 참조 유지", () => {
    const s1 = makeStroke("stroke-1", [{ x: 0.9, y: 0.9 }]);
    const s2 = makeStroke("stroke-2", [{ x: 0.1, y: 0.1 }]);
    const strokes = [s1, s2];
    // click at (0.5, 0.5), radius = 0.02 — both strokes far outside
    const result = eraseStrokePointsInRadius(strokes, 0.5, 0.5, RADIUS);
    assert.equal(result.length, 2);
    assert.strictEqual(result[0], s1); // same reference
    assert.strictEqual(result[1], s2);
  });

  // Case 3: stroke 중간 point 1개 영역 안 → 2 segment 로 split
  it("stroke 중간 point 1개 영역 안 → 2 segments 로 split", () => {
    // Points: p0(out), p1(out), p2(IN), p3(out), p4(out)
    // Expected: segment([p0,p1]) id="stroke-A-s0", segment([p3,p4]) id="stroke-A-s1"
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p2 = { x: 0.5, y: 0.5 }; // IN radius
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };

    assert.ok(dist(p2.x, p2.y, 0.5, 0.5) <= RADIUS); // sanity

    const stroke = makeStroke("stroke-A", [p0, p1, p2, p3, p4]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS);

    assert.equal(result.length, 2);
    assert.equal(result[0].id, "stroke-A-s0");
    assert.equal(result[0].points.length, 2);
    assert.deepEqual(result[0].points[0], { ...p0, t: 0 });
    assert.deepEqual(result[0].points[1], { ...p1, t: 0 });

    assert.equal(result[1].id, "stroke-A-s1");
    assert.equal(result[1].points.length, 2);
    assert.deepEqual(result[1].points[0], { ...p3, t: 0 });
    assert.deepEqual(result[1].points[1], { ...p4, t: 0 });
  });

  // Case 4: stroke 중간 연속 point 다수 영역 안 → 그 구간만 제거, 양쪽 segment 보존
  it("stroke 중간 연속 point 다수 영역 안 → 연속 구간 제거, 양쪽 segment 보존", () => {
    // Points: p0(out), p1(out), p2(IN), p3(IN), p4(out), p5(out)
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p2 = { x: 0.5, y: 0.5 };    // IN
    const p3 = { x: 0.505, y: 0.505 }; // IN (dist ≈ 0.007 < 0.02)
    const p4 = { x: 0.8, y: 0.8 };
    const p5 = { x: 0.9, y: 0.9 };

    assert.ok(dist(p2.x, p2.y, 0.5, 0.5) <= RADIUS);
    assert.ok(dist(p3.x, p3.y, 0.5, 0.5) <= RADIUS);

    const stroke = makeStroke("stroke-B", [p0, p1, p2, p3, p4, p5]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS);

    assert.equal(result.length, 2);
    assert.equal(result[0].id, "stroke-B-s0");
    assert.deepEqual(result[0].points.map((p) => ({ x: p.x, y: p.y })), [
      { x: p0.x, y: p0.y },
      { x: p1.x, y: p1.y }
    ]);
    assert.equal(result[1].id, "stroke-B-s1");
    assert.deepEqual(result[1].points.map((p) => ({ x: p.x, y: p.y })), [
      { x: p4.x, y: p4.y },
      { x: p5.x, y: p5.y }
    ]);
  });

  // Case 5: stroke 모든 point 영역 안 → stroke 통째 제거
  it("stroke 모든 point 영역 안 → stroke 통째 제거", () => {
    const stroke = makeStroke("stroke-C", [
      { x: 0.5, y: 0.5 },
      { x: 0.505, y: 0.505 }
    ]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS);
    assert.equal(result.length, 0);
  });

  // Case 6: stroke 끝점만 영역 안 → 끝점 제거, 시작점 측 segment 1개 보존
  it("stroke 마지막 point 만 영역 안 → 마지막 point 제거, 나머지 segment 보존", () => {
    // Points: p0(out), p1(out), p2(out), p3(IN)
    // → segment([p0,p1,p2]) with id "stroke-D-s0"
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p2 = { x: 0.3, y: 0.3 };
    const p3 = { x: 0.5, y: 0.5 }; // IN

    assert.ok(dist(p3.x, p3.y, 0.5, 0.5) <= RADIUS);

    const stroke = makeStroke("stroke-D", [p0, p1, p2, p3]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS);

    assert.equal(result.length, 1);
    assert.equal(result[0].id, "stroke-D-s0");
    assert.equal(result[0].points.length, 3);
    assert.deepEqual(result[0].points.map((p) => ({ x: p.x, y: p.y })), [
      { x: p0.x, y: p0.y },
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p2.y }
    ]);
  });

  // Case 7: split 후 segment 길이 1 → drop
  it("split 후 segment 길이 1 (point 1개) → 해당 segment drop", () => {
    // Points: p0(IN), p1(out-alone), p2(IN), p3(out), p4(out)
    // After erase: p0 removed, current=[p1] → flush as segment([p1])
    //              p2 removed, current=[] → nothing to flush
    //              p3,p4 → segment([p3,p4])
    // segments: [[p1], [p3,p4]]
    // [[p1]] length < 2 → drop. Only [[p3,p4]] survives → id "stroke-E-s1"
    const p0 = { x: 0.5, y: 0.5 };   // IN
    const p1 = { x: 0.3, y: 0.3 };   // OUT (alone after p0 removed)
    const p2 = { x: 0.5, y: 0.5 };   // IN
    const p3 = { x: 0.8, y: 0.8 };   // OUT
    const p4 = { x: 0.9, y: 0.9 };   // OUT

    assert.ok(dist(p0.x, p0.y, 0.5, 0.5) <= RADIUS);
    assert.ok(dist(p2.x, p2.y, 0.5, 0.5) <= RADIUS);

    const stroke = makeStroke("stroke-E", [p0, p1, p2, p3, p4]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS);

    // segment index 0 ([p1]) was dropped (length 1).
    // segment index 1 ([p3,p4]) survives with id "stroke-E-s1".
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "stroke-E-s1");
    assert.equal(result[0].points.length, 2);
    assert.deepEqual(result[0].points.map((p) => ({ x: p.x, y: p.y })), [
      { x: p3.x, y: p3.y },
      { x: p4.x, y: p4.y }
    ]);
  });

  // Case 8: 다중 stroke 동시 처리 — 1개만 영향, 1개 그대로
  it("다중 stroke — 영향받은 stroke 만 처리, 나머지 동일 참조 유지", () => {
    // stroke-hit: p0(out), p1(IN), p2(out) → split [p0] drop, [p2] drop → 0 survivors (both len 1)
    // stroke-safe: all points out → same reference
    const pOut1 = { x: 0.1, y: 0.1 };
    const pIn   = { x: 0.5, y: 0.5 }; // IN
    const pOut2 = { x: 0.9, y: 0.9 };

    assert.ok(dist(pIn.x, pIn.y, 0.5, 0.5) <= RADIUS);
    assert.ok(dist(pOut1.x, pOut1.y, 0.5, 0.5) > RADIUS);
    assert.ok(dist(pOut2.x, pOut2.y, 0.5, 0.5) > RADIUS);

    const strokeHit  = makeStroke("stroke-hit",  [pOut1, pIn, pOut2]);
    const strokeSafe = makeStroke("stroke-safe", [{ x: 0.0, y: 0.0 }, { x: 0.05, y: 0.05 }]);

    const result = eraseStrokePointsInRadius([strokeHit, strokeSafe], 0.5, 0.5, RADIUS);

    // strokeHit: both surviving segments have length 1 → all dropped → 0 from strokeHit.
    // strokeSafe: untouched → same reference.
    assert.equal(result.length, 1);
    assert.strictEqual(result[0], strokeSafe); // same reference confirms no-op path
  });
});
