// sprint-12/slice-4 spec — eraseStrokePointsByShape reducer.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/eraser-tool.spec.ts
//
// 좌표계: normalized 0..1 (PdfInkPoint.x / .y 와 동일 — getSurfacePoint 결과).
// size: 화면 픽셀 단위. circle/square/triangle 는 size bbox 기준, line 은 size/2 거리 기준.
//
// 핵심 동작:
//   - 각 stroke 의 points 중 선택 shape hit-test 에 걸리는 point 를 제거.
//   - pixel-space 거리: dxPx = (pt.x - cx) * surfaceWidth, dyPx = (pt.y - cy) * surfaceHeight.
//   - 연속 생존 point 그룹 = segment. segment 길이 < 2 → drop.
//   - hit 없는 stroke = 원본 reference 그대로.
//   - split 된 segment id = "${origId}-s${segmentIndex}".

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// Minimal type stubs — mirrors packages/domain PdfInkStroke shape.
// Spec is self-contained because the reducer is defined inside main.ts.
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

type EraserShape = "circle" | "square" | "triangle" | "line";
type EraserDragPoint = { x: number; y: number };

interface PixelPoint {
  x: number;
  y: number;
}

interface PixelSegment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

interface PixelBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const ERASER_LINE_SEGMENT_CAP = 50;

// ---------------------------------------------------------------------------
// eraseStrokePointsByShape — inline copy of the pure reducer from main.ts.
// ---------------------------------------------------------------------------
function eraseStrokePointsByShape(
  strokes: InkStroke[],
  shape: EraserShape,
  cx: number,
  cy: number,
  size: number,
  surfaceWidth: number,
  surfaceHeight: number,
  dragPath?: readonly EraserDragPoint[]
): InkStroke[] {
  const result: InkStroke[] = [];
  const safeSize = Number.isFinite(size) ? Math.min(64, Math.max(16, size)) : 16;
  const halfSize = safeSize / 2;
  const cxPx = cx * surfaceWidth;
  const cyPx = cy * surfaceHeight;
  const circleR2 = halfSize * halfSize;
  const lineHit =
    shape === "line"
      ? buildLineHitState(dragPath, surfaceWidth, surfaceHeight, halfSize)
      : undefined;

  for (const stroke of strokes) {
    if (shape === "line") {
      if (!lineHit) {
        result.push(stroke);
        continue;
      }

      const strokeBbox = getStrokePixelBBox(stroke, surfaceWidth, surfaceHeight);

      if (!strokeBbox || !bboxIntersects(strokeBbox, lineHit.bbox)) {
        result.push(stroke);
        continue;
      }
    }

    let hasHit = false;

    for (const pt of stroke.points) {
      if (isPointHitByEraserShape(
        pt,
        shape,
        cxPx,
        cyPx,
        halfSize,
        circleR2,
        safeSize,
        surfaceWidth,
        surfaceHeight,
        lineHit?.segments
      )) {
        hasHit = true;
        break;
      }
    }

    if (!hasHit) {
      result.push(stroke);
      continue;
    }

    const segments: InkPoint[][] = [];
    let current: InkPoint[] = [];

    for (const pt of stroke.points) {
      const inShape = isPointHitByEraserShape(
        pt,
        shape,
        cxPx,
        cyPx,
        halfSize,
        circleR2,
        safeSize,
        surfaceWidth,
        surfaceHeight,
        lineHit?.segments
      );

      if (inShape) {
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

    segments.forEach((pts, i) => {
      if (pts.length < 2) {
        return;
      }

      result.push({
        ...stroke,
        id: `${stroke.id}-s${i}`,
        points: pts
      });
    });
  }

  return result;
}

function isPointHitByEraserShape(
  pt: InkPoint,
  shape: EraserShape,
  cxPx: number,
  cyPx: number,
  halfSize: number,
  circleR2: number,
  size: number,
  surfaceWidth: number,
  surfaceHeight: number,
  lineSegments?: readonly PixelSegment[]
): boolean {
  const px = pt.x * surfaceWidth;
  const py = pt.y * surfaceHeight;
  const dxPx = px - cxPx;
  const dyPx = py - cyPx;

  if (shape === "circle") {
    return dxPx * dxPx + dyPx * dyPx <= circleR2;
  }

  if (shape === "square") {
    return Math.abs(dxPx) <= halfSize && Math.abs(dyPx) <= halfSize;
  }

  if (shape === "triangle") {
    return isPointInEraserTriangle({ x: px, y: py }, cxPx, cyPx, size);
  }

  if (!lineSegments || lineSegments.length === 0) {
    return false;
  }

  for (const segment of lineSegments) {
    if (distancePointToSegmentSq(px, py, segment) <= circleR2) {
      return true;
    }
  }

  return false;
}

function isPointInEraserTriangle(
  point: PixelPoint,
  cxPx: number,
  cyPx: number,
  size: number
): boolean {
  const height = size * Math.sqrt(3) / 2;
  const a = { x: cxPx, y: cyPx - height * 2 / 3 };
  const b = { x: cxPx - size / 2, y: cyPx + height / 3 };
  const c = { x: cxPx + size / 2, y: cyPx + height / 3 };
  const denominator =
    (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);

  if (denominator === 0) {
    return false;
  }

  const alpha =
    ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) /
    denominator;
  const beta =
    ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) /
    denominator;
  const gamma = 1 - alpha - beta;
  const epsilon = -1e-9;

  return alpha >= epsilon && beta >= epsilon && gamma >= epsilon;
}

function buildLineHitState(
  dragPath: readonly EraserDragPoint[] | undefined,
  surfaceWidth: number,
  surfaceHeight: number,
  radiusPx: number
): { segments: PixelSegment[]; bbox: PixelBBox } | undefined {
  if (!dragPath || dragPath.length < 2) {
    return undefined;
  }

  const cappedPath = dragPath.slice(-(ERASER_LINE_SEGMENT_CAP + 1));
  const segments: PixelSegment[] = [];
  let bbox: PixelBBox | undefined;

  for (let i = 1; i < cappedPath.length; i++) {
    const prev = cappedPath[i - 1];
    const next = cappedPath[i];

    if (!prev || !next) {
      continue;
    }

    const segment: PixelSegment = {
      ax: prev.x * surfaceWidth,
      ay: prev.y * surfaceHeight,
      bx: next.x * surfaceWidth,
      by: next.y * surfaceHeight
    };

    segments.push(segment);
    bbox = includePointInBBox(bbox, segment.ax, segment.ay);
    bbox = includePointInBBox(bbox, segment.bx, segment.by);
  }

  if (!bbox || segments.length === 0) {
    return undefined;
  }

  return { segments, bbox: expandBBox(bbox, radiusPx) };
}

function getStrokePixelBBox(
  stroke: InkStroke,
  surfaceWidth: number,
  surfaceHeight: number
): PixelBBox | undefined {
  let bbox: PixelBBox | undefined;

  for (const point of stroke.points) {
    bbox = includePointInBBox(bbox, point.x * surfaceWidth, point.y * surfaceHeight);
  }

  return bbox;
}

function includePointInBBox(
  bbox: PixelBBox | undefined,
  x: number,
  y: number
): PixelBBox {
  if (!bbox) {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }

  return {
    minX: Math.min(bbox.minX, x),
    minY: Math.min(bbox.minY, y),
    maxX: Math.max(bbox.maxX, x),
    maxY: Math.max(bbox.maxY, y)
  };
}

function expandBBox(bbox: PixelBBox, amount: number): PixelBBox {
  return {
    minX: bbox.minX - amount,
    minY: bbox.minY - amount,
    maxX: bbox.maxX + amount,
    maxY: bbox.maxY + amount
  };
}

function bboxIntersects(a: PixelBBox, b: PixelBBox): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

function distancePointToSegmentSq(
  px: number,
  py: number,
  segment: PixelSegment
): number {
  const vx = segment.bx - segment.ax;
  const vy = segment.by - segment.ay;
  const wx = px - segment.ax;
  const wy = py - segment.ay;
  const lengthSq = vx * vx + vy * vy;

  if (lengthSq === 0) {
    const dx = px - segment.ax;
    const dy = py - segment.ay;
    return dx * dx + dy * dy;
  }

  const t = Math.min(1, Math.max(0, (wx * vx + wy * vy) / lengthSq));
  const closestX = segment.ax + t * vx;
  const closestY = segment.ay + t * vy;
  const dx = px - closestX;
  const dy = py - closestY;

  return dx * dx + dy * dy;
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
    points: points.map((p, index) => ({ ...p, t: index })),
    createdAt: "2026-05-18T00:00:00.000Z"
  };
}

function coords(stroke: InkStroke): Array<{ x: number; y: number }> {
  return stroke.points.map((p) => ({ x: p.x, y: p.y }));
}

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

function triangleTopVertex(cx: number, cy: number, size: number): { x: number; y: number } {
  const height = size * Math.sqrt(3) / 2;
  return { x: cx, y: cy - (height * 2 / 3) / H };
}

function makeHorizontalDragPath(
  segmentCount: number,
  startX: number,
  endX: number,
  y: number
): EraserDragPoint[] {
  return Array.from({ length: segmentCount + 1 }, (_, index) => ({
    x: startX + ((endX - startX) * index) / segmentCount,
    y
  }));
}

function makeSegmentCapDragPath(): EraserDragPoint[] {
  const points: EraserDragPoint[] = [];

  for (let i = 0; i <= 30; i++) {
    points.push({ x: 0.4 + i * 0.01, y: 0.2 });
  }

  for (let i = 31; i <= 80; i++) {
    points.push({ x: 0.31 + (i - 31) * 0.01, y: 0.8 });
  }

  return points;
}

function makePerfDragPath(segmentCount: number): EraserDragPoint[] {
  return Array.from({ length: segmentCount + 1 }, (_, index) => ({
    x: index / segmentCount,
    y: 0.5
  }));
}

function makePerfStrokes(strokeCount: number, pointsPerStroke: number): InkStroke[] {
  return Array.from({ length: strokeCount }, (_, strokeIndex) =>
    makeStroke(
      `perf-${strokeIndex}`,
      Array.from({ length: pointsPerStroke }, (_, pointIndex) => ({
        x: pointIndex / (pointsPerStroke - 1),
        y: 0.5 + ((strokeIndex % 5) - 2) * 0.0005
      }))
    )
  );
}

const W = 800;
const H = 800;
const SIZE_PX = 32;
const LINE_SIZE_PX = 16;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("eraseStrokePointsByShape", () => {
  it("shape=circle: 빈 stroke 배열 → 그대로 반환", () => {
    const result = eraseStrokePointsByShape([], "circle", 0.5, 0.5, SIZE_PX, W, H);
    assert.deepEqual(result, []);
  });

  it("shape=circle: 영역 안 point 없음 → 모든 stroke 변경 없음 + 동일 참조 유지", () => {
    const s1 = makeStroke("stroke-1", [{ x: 0.9, y: 0.9 }]);
    const s2 = makeStroke("stroke-2", [{ x: 0.1, y: 0.1 }]);
    const strokes = [s1, s2];

    const result = eraseStrokePointsByShape(strokes, "circle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 2);
    assert.strictEqual(result[0], s1);
    assert.strictEqual(result[1], s2);
  });

  it("shape=circle: stroke 중간 point 1개 영역 안 → 2 segments 로 split", () => {
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p2 = { x: 0.5, y: 0.5 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };

    assert.ok(distPx(p2.x, p2.y, 0.5, 0.5, W, H) <= SIZE_PX / 2);

    const stroke = makeStroke("stroke-A", [p0, p1, p2, p3, p4]);
    const result = eraseStrokePointsByShape([stroke], "circle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 2);
    assert.equal(result[0].id, "stroke-A-s0");
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.equal(result[1].id, "stroke-A-s1");
    assert.deepEqual(coords(result[1]), [p3, p4]);
  });

  it("shape=circle: stroke 중간 연속 point 다수 영역 안 → 연속 구간 제거, 양쪽 segment 보존", () => {
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p2 = { x: 0.5, y: 0.5 };
    const p3 = { x: 0.505, y: 0.505 };
    const p4 = { x: 0.8, y: 0.8 };
    const p5 = { x: 0.9, y: 0.9 };

    assert.ok(distPx(p2.x, p2.y, 0.5, 0.5, W, H) <= SIZE_PX / 2);
    assert.ok(distPx(p3.x, p3.y, 0.5, 0.5, W, H) <= SIZE_PX / 2);

    const stroke = makeStroke("stroke-B", [p0, p1, p2, p3, p4, p5]);
    const result = eraseStrokePointsByShape([stroke], "circle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 2);
    assert.equal(result[0].id, "stroke-B-s0");
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.equal(result[1].id, "stroke-B-s1");
    assert.deepEqual(coords(result[1]), [p4, p5]);
  });

  it("shape=circle: stroke 모든 point 영역 안 → stroke 통째 제거", () => {
    const stroke = makeStroke("stroke-C", [
      { x: 0.5, y: 0.5 },
      { x: 0.505, y: 0.505 }
    ]);

    const result = eraseStrokePointsByShape([stroke], "circle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 0);
  });

  it("shape=circle: stroke 마지막 point 만 영역 안 → 마지막 point 제거, 나머지 segment 보존", () => {
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p2 = { x: 0.3, y: 0.3 };
    const p3 = { x: 0.5, y: 0.5 };

    assert.ok(distPx(p3.x, p3.y, 0.5, 0.5, W, H) <= SIZE_PX / 2);

    const stroke = makeStroke("stroke-D", [p0, p1, p2, p3]);
    const result = eraseStrokePointsByShape([stroke], "circle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 1);
    assert.equal(result[0].id, "stroke-D-s0");
    assert.deepEqual(coords(result[0]), [p0, p1, p2]);
  });

  it("shape=circle: split 후 segment 길이 1 (point 1개) → 해당 segment drop", () => {
    const p0 = { x: 0.5, y: 0.5 };
    const p1 = { x: 0.3, y: 0.3 };
    const p2 = { x: 0.5, y: 0.5 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };

    assert.ok(distPx(p0.x, p0.y, 0.5, 0.5, W, H) <= SIZE_PX / 2);
    assert.ok(distPx(p2.x, p2.y, 0.5, 0.5, W, H) <= SIZE_PX / 2);

    const stroke = makeStroke("stroke-E", [p0, p1, p2, p3, p4]);
    const result = eraseStrokePointsByShape([stroke], "circle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 1);
    assert.equal(result[0].id, "stroke-E-s1");
    assert.deepEqual(coords(result[0]), [p3, p4]);
  });

  it("shape=circle: 다중 stroke — 영향받은 stroke 만 처리, 나머지 동일 참조 유지", () => {
    const pOut1 = { x: 0.1, y: 0.1 };
    const pIn = { x: 0.5, y: 0.5 };
    const pOut2 = { x: 0.9, y: 0.9 };
    const strokeHit = makeStroke("stroke-hit", [pOut1, pIn, pOut2]);
    const strokeSafe = makeStroke("stroke-safe", [{ x: 0.0, y: 0.0 }, { x: 0.05, y: 0.05 }]);

    const result = eraseStrokePointsByShape(
      [strokeHit, strokeSafe],
      "circle",
      0.5,
      0.5,
      SIZE_PX,
      W,
      H
    );

    assert.equal(result.length, 1);
    assert.strictEqual(result[0], strokeSafe);
  });

  it("shape=circle: A4 비율 surface(800×1132) — y축 normalized 동거리가 pixel 초과 시 miss", () => {
    const WA4 = 800;
    const HA4 = 1132;
    const cx = 0.5;
    const cy = 0.5;
    const pointA = { x: 0.5, y: 0.514 };
    const pointB = { x: 0.5, y: 0.515 };

    const dAPx = distPx(pointA.x, pointA.y, cx, cy, WA4, HA4);
    const dBPx = distPx(pointB.x, pointB.y, cx, cy, WA4, HA4);
    const dBSqPx = distPx(pointB.x, pointB.y, cx, cy, W, H);

    assert.ok(dAPx < 16, `pointA distPx=${dAPx.toFixed(2)} should be < 16`);
    assert.ok(dBPx > 16, `pointB distPx=${dBPx.toFixed(2)} should be > 16`);
    assert.ok(dBSqPx < 16, `pointB square distPx=${dBSqPx.toFixed(2)} should be < 16`);

    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const strokeA = makeStroke("stroke-a4-hit", [p0, p1, pointA, p3, p4]);
    const resultA = eraseStrokePointsByShape([strokeA], "circle", cx, cy, 32, WA4, HA4);

    assert.equal(resultA.length, 2);
    assert.deepEqual(coords(resultA[0]), [p0, p1]);
    assert.deepEqual(coords(resultA[1]), [p3, p4]);

    const strokeB = makeStroke("stroke-a4-miss", [
      { x: 0.1, y: 0.1 },
      pointB,
      { x: 0.9, y: 0.9 }
    ]);
    const resultB = eraseStrokePointsByShape([strokeB], "circle", cx, cy, 32, WA4, HA4);

    assert.equal(resultB.length, 1);
    assert.strictEqual(resultB[0], strokeB);
  });

  it("shape=square: bbox 안 point → removed", () => {
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const inside = { x: 0.51, y: 0.51 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const stroke = makeStroke("square-inside", [p0, p1, inside, p3, p4]);

    const result = eraseStrokePointsByShape([stroke], "square", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 2);
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.deepEqual(coords(result[1]), [p3, p4]);
  });

  it("shape=square: bbox 밖 point → preserved", () => {
    const stroke = makeStroke("square-outside", [
      { x: 0.521, y: 0.5 },
      { x: 0.9, y: 0.9 }
    ]);

    const result = eraseStrokePointsByShape([stroke], "square", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 1);
    assert.strictEqual(result[0], stroke);
  });

  it("shape=square: bbox edge 위 point → removed (inclusive)", () => {
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const edge = { x: 0.52, y: 0.5 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const stroke = makeStroke("square-edge", [p0, p1, edge, p3, p4]);

    const result = eraseStrokePointsByShape([stroke], "square", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 2);
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.deepEqual(coords(result[1]), [p3, p4]);
  });

  it("shape=triangle: centroid 부근 point → removed", () => {
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const centroid = { x: 0.5, y: 0.5 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const stroke = makeStroke("triangle-centroid", [p0, p1, centroid, p3, p4]);

    const result = eraseStrokePointsByShape([stroke], "triangle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 2);
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.deepEqual(coords(result[1]), [p3, p4]);
  });

  it("shape=triangle: vertex 근처지만 triangle 밖 point → preserved", () => {
    const top = triangleTopVertex(0.5, 0.5, SIZE_PX);
    const outside = { x: top.x, y: top.y - 0.002 };
    const stroke = makeStroke("triangle-outside-vertex", [
      outside,
      { x: 0.9, y: 0.9 }
    ]);

    const result = eraseStrokePointsByShape([stroke], "triangle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 1);
    assert.strictEqual(result[0], stroke);
  });

  it("shape=triangle: vertex 위 point → removed (inclusive)", () => {
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const vertex = triangleTopVertex(0.5, 0.5, SIZE_PX);
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const stroke = makeStroke("triangle-vertex", [p0, p1, vertex, p3, p4]);

    const result = eraseStrokePointsByShape([stroke], "triangle", 0.5, 0.5, SIZE_PX, W, H);

    assert.equal(result.length, 2);
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.deepEqual(coords(result[1]), [p3, p4]);
  });

  it("shape=line: 1 segment dragPath, point distance ≤ size/2 from segment → removed", () => {
    const dragPath = [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }];
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const near = { x: 0.5, y: 0.505 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const stroke = makeStroke("line-hit", [p0, p1, near, p3, p4]);

    const result = eraseStrokePointsByShape(
      [stroke],
      "line",
      0.5,
      0.5,
      LINE_SIZE_PX,
      W,
      H,
      dragPath
    );

    assert.equal(result.length, 2);
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.deepEqual(coords(result[1]), [p3, p4]);
  });

  it("shape=line: 1 segment dragPath, point distance > size/2 from segment → preserved", () => {
    const dragPath = [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }];
    const stroke = makeStroke("line-miss", [
      { x: 0.5, y: 0.512 },
      { x: 0.9, y: 0.9 }
    ]);

    const result = eraseStrokePointsByShape(
      [stroke],
      "line",
      0.5,
      0.5,
      LINE_SIZE_PX,
      W,
      H,
      dragPath
    );

    assert.equal(result.length, 1);
    assert.strictEqual(result[0], stroke);
  });

  it("shape=line: 5 segment dragPath → point near closest segment is removed", () => {
    const dragPath = makeHorizontalDragPath(5, 0.1, 0.6, 0.5);
    const p0 = { x: 0.1, y: 0.1 };
    const p1 = { x: 0.2, y: 0.2 };
    const nearClosest = { x: 0.35, y: 0.506 };
    const p3 = { x: 0.8, y: 0.8 };
    const p4 = { x: 0.9, y: 0.9 };
    const stroke = makeStroke("line-5-segments", [p0, p1, nearClosest, p3, p4]);

    const result = eraseStrokePointsByShape(
      [stroke],
      "line",
      0.5,
      0.5,
      LINE_SIZE_PX,
      W,
      H,
      dragPath
    );

    assert.equal(result.length, 2);
    assert.deepEqual(coords(result[0]), [p0, p1]);
    assert.deepEqual(coords(result[1]), [p3, p4]);
  });

  it("shape=line: 80 segment dragPath → only last 50 segments are applied", () => {
    const dragPath = makeSegmentCapDragPath();
    const pointNearSegment60BeyondCapA = { x: 0.603, y: 0.205 };
    const pointNearSegment60BeyondCapB = { x: 0.607, y: 0.205 };
    const pointNearSegment79WithinCap = { x: 0.795, y: 0.805 };
    const tail = { x: 0.95, y: 0.95 };
    const stroke = makeStroke("line-segment-cap", [
      pointNearSegment60BeyondCapA,
      pointNearSegment60BeyondCapB,
      pointNearSegment79WithinCap,
      tail
    ]);

    assert.equal(dragPath.length - 1, 80);

    const result = eraseStrokePointsByShape(
      [stroke],
      "line",
      0.5,
      0.5,
      LINE_SIZE_PX,
      W,
      H,
      dragPath
    );

    assert.equal(result.length, 1);
    assert.deepEqual(coords(result[0]), [
      pointNearSegment60BeyondCapA,
      pointNearSegment60BeyondCapB
    ]);
  });

  it("AC9-h: line shape 500-segment drag 100×100 points under 200ms", () => {
    const dragPath = makePerfDragPath(500);
    const strokes = makePerfStrokes(100, 100);
    const totalPoints = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
    const start = performance.now();

    const result = eraseStrokePointsByShape(
      strokes,
      "line",
      0.95,
      0.5,
      LINE_SIZE_PX,
      W,
      H,
      dragPath
    );

    const elapsed = performance.now() - start;

    assert.equal(dragPath.length - 1, 500);
    assert.equal(totalPoints, 10000);
    assert.ok(result.length > 0);
    assert.ok(elapsed < 200, `elapsed=${elapsed.toFixed(2)}ms`);
  });
});
