// sprint-11/slice-2-refine spec — eraseStrokePointsInRadius reducer (AC10 R10-b).
// codex P2 갱신: hit-test 가 pixel space 로 환산됨. surfaceWidth/Height 인자 추가.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/eraser-tool.spec.ts
//
// 좌표계: normalized 0..1 (PdfInkPoint.x / .y 와 동일 — getSurfacePoint 결과).
// radiusPx: 화면 픽셀 단위. 단위 테스트는 DOM-free; 브라우저 픽셀 의존 없음.
//
// 핵심 동작:
//   - 각 stroke 의 points 중 (cx,cy) 로부터 pixel-space 거리 ≤ radiusPx 인 point 를 제거.
//   - pixel-space 거리: dxPx = (pt.x - cx) * surfaceWidth, dyPx = (pt.y - cy) * surfaceHeight.
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
// Algorithm: O(S × P). For each stroke, remove points whose pixel-space distance
// from (cx,cy) is ≤ radiusPx. dxPx = (pt.x - cx) * surfaceWidth, similarly dyPx.
// This ensures erase area is a circle in screen pixels (not an ellipse on non-square
// surfaces such as A4 = 1:√2).
// Consecutive surviving points form a segment; segments with < 2 points are dropped.
// Strokes with no hit points are returned as-is (same reference).
// Split segment id = `${origId}-s${segmentIndex}`.
// ---------------------------------------------------------------------------
function eraseStrokePointsInRadius(
  strokes: InkStroke[],
  cx: number,
  cy: number,
  radiusPx: number,
  surfaceWidth: number,
  surfaceHeight: number
): InkStroke[] {
  const result: InkStroke[] = [];
  const r2 = radiusPx * radiusPx;

  for (const stroke of strokes) {
    // Fast path: check if ANY point is within radiusPx before splitting.
    let hasHit = false;

    for (const pt of stroke.points) {
      const dxPx = (pt.x - cx) * surfaceWidth;
      const dyPx = (pt.y - cy) * surfaceHeight;

      if (dxPx * dxPx + dyPx * dyPx <= r2) {
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
      const dxPx = (pt.x - cx) * surfaceWidth;
      const dyPx = (pt.y - cy) * surfaceHeight;
      const inRadius = dxPx * dxPx + dyPx * dyPx <= r2;

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

// 정사각형 surface (800×800). 기존 케이스 기준: normalized 0.02 × 800px = 16px.
const W = 800;
const H = 800;
const RADIUS_PX = 16;

// 두 점 사이 pixel-space 거리.
function distPx(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  sw: number,
  sh: number
): number {
  const dxPx = (ax - bx) * sw;
  const dyPx = (ay - by) * sh;
  return Math.sqrt(dxPx * dxPx + dyPx * dyPx);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("eraseStrokePointsInRadius (sprint-11/slice-2-refine AC10 R10-b + codex P2)", () => {
  // Case 1: 빈 배열 → 변화 없음
  it("빈 stroke 배열 → 그대로 반환", () => {
    const result = eraseStrokePointsInRadius([], 0.5, 0.5, RADIUS_PX, W, H);
    assert.deepEqual(result, []);
  });

  // Case 2: 영역 안 point 없음 → 모든 stroke 그대로 (동일 참조)
  it("영역 안 point 없음 → 모든 stroke 변경 없음 + 동일 참조 유지", () => {
    const s1 = makeStroke("stroke-1", [{ x: 0.9, y: 0.9 }]);
    const s2 = makeStroke("stroke-2", [{ x: 0.1, y: 0.1 }]);
    const strokes = [s1, s2];
    // click at (0.5, 0.5), radius = 16px on 800px surface — both strokes far outside
    const result = eraseStrokePointsInRadius(strokes, 0.5, 0.5, RADIUS_PX, W, H);
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

    assert.ok(distPx(p2.x, p2.y, 0.5, 0.5, W, H) <= RADIUS_PX); // sanity

    const stroke = makeStroke("stroke-A", [p0, p1, p2, p3, p4]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS_PX, W, H);

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
    const p3 = { x: 0.505, y: 0.505 }; // IN (dist ≈ 5.7px < 16px)
    const p4 = { x: 0.8, y: 0.8 };
    const p5 = { x: 0.9, y: 0.9 };

    assert.ok(distPx(p2.x, p2.y, 0.5, 0.5, W, H) <= RADIUS_PX);
    assert.ok(distPx(p3.x, p3.y, 0.5, 0.5, W, H) <= RADIUS_PX);

    const stroke = makeStroke("stroke-B", [p0, p1, p2, p3, p4, p5]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS_PX, W, H);

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
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS_PX, W, H);
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

    assert.ok(distPx(p3.x, p3.y, 0.5, 0.5, W, H) <= RADIUS_PX);

    const stroke = makeStroke("stroke-D", [p0, p1, p2, p3]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS_PX, W, H);

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

    assert.ok(distPx(p0.x, p0.y, 0.5, 0.5, W, H) <= RADIUS_PX);
    assert.ok(distPx(p2.x, p2.y, 0.5, 0.5, W, H) <= RADIUS_PX);

    const stroke = makeStroke("stroke-E", [p0, p1, p2, p3, p4]);
    const result = eraseStrokePointsInRadius([stroke], 0.5, 0.5, RADIUS_PX, W, H);

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

    assert.ok(distPx(pIn.x, pIn.y, 0.5, 0.5, W, H) <= RADIUS_PX);
    assert.ok(distPx(pOut1.x, pOut1.y, 0.5, 0.5, W, H) > RADIUS_PX);
    assert.ok(distPx(pOut2.x, pOut2.y, 0.5, 0.5, W, H) > RADIUS_PX);

    const strokeHit  = makeStroke("stroke-hit",  [pOut1, pIn, pOut2]);
    const strokeSafe = makeStroke("stroke-safe", [{ x: 0.0, y: 0.0 }, { x: 0.05, y: 0.05 }]);

    const result = eraseStrokePointsInRadius([strokeHit, strokeSafe], 0.5, 0.5, RADIUS_PX, W, H);

    // strokeHit: both surviving segments have length 1 → all dropped → 0 from strokeHit.
    // strokeSafe: untouched → same reference.
    assert.equal(result.length, 1);
    assert.strictEqual(result[0], strokeSafe); // same reference confirms no-op path
  });

  // Case 9 (codex P2 신규): A4 비율 surface (800×1132) — normalized 동거리지만 axis별 hit/miss 분기.
  // A4 = 1:√2 ≈ 1:1.415. width=800, height=1132.
  //
  // 검증 로직:
  //   - cx=cy=0.5 (center), radiusPx=16.
  //   - point A: x=0.5, y=0.514  → dyPx = 0.014 * 1132 = 15.85px. dxPx=0.  distPx ≈ 15.85 → HIT.
  //   - point B: x=0.5, y=0.515  → dyPx = 0.015 * 1132 = 16.98px. dxPx=0.  distPx ≈ 16.98 → MISS.
  //   - 정사각형 surface(800×800)에서는 B 도 IN (0.015*800=12px < 16px) — 비율 차이 확인.
  it("A4 비율 surface(800×1132) — y축 normalized 동거리가 pixel 초과 시 miss (erase 영역 = 원형 보장)", () => {
    const WA4 = 800;
    const HA4 = 1132; // ≈ 800 * √2
    const cx = 0.5;
    const cy = 0.5;

    // pointA: y 방향 0.014 normalized → 0.014 * 1132 ≈ 15.85px < 16 → IN
    const pointA = { x: 0.5, y: 0.514 };
    const dAPx = distPx(pointA.x, pointA.y, cx, cy, WA4, HA4);
    assert.ok(dAPx < 16, `pointA distPx=${dAPx.toFixed(2)} should be < 16`);

    // pointB: y 방향 0.015 normalized → 0.015 * 1132 ≈ 16.98px > 16 → MISS on A4
    const pointB = { x: 0.5, y: 0.515 };
    const dBPx = distPx(pointB.x, pointB.y, cx, cy, WA4, HA4);
    assert.ok(dBPx > 16, `pointB distPx=${dBPx.toFixed(2)} should be > 16`);

    // 같은 pointB 를 정사각형 surface 에서: 0.015 * 800 = 12px < 16 → IN (차이 확인).
    const dBSqPx = distPx(pointB.x, pointB.y, cx, cy, W, H);
    assert.ok(dBSqPx < 16, `pointB distPx on square=${dBSqPx.toFixed(2)} should be < 16 (contrast)`);

    // Stroke with pointA(IN) in the middle → 2 segments.
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p2 = pointA; // IN on A4
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const strokeA = makeStroke("stroke-a4-hit", [p0, p1, p2, p3, p4]);
    const resultA = eraseStrokePointsInRadius([strokeA], cx, cy, 16, WA4, HA4);
    assert.equal(resultA.length, 2, "pointA(IN on A4) → stroke splits into 2 segments");

    // Stroke with pointB(MISS on A4) → stroke unchanged (same reference).
    const strokeB = makeStroke("stroke-a4-miss", [
      { x: 0.1, y: 0.1 },
      pointB, // MISS on A4 (16.98px > 16)
      { x: 0.9, y: 0.9 }
    ]);
    const resultB = eraseStrokePointsInRadius([strokeB], cx, cy, 16, WA4, HA4);
    assert.equal(resultB.length, 1, "pointB(MISS on A4) → stroke untouched");
    assert.strictEqual(resultB[0], strokeB, "same reference — no-op path");
  });
});
