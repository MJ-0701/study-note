// 잉크 획 저장-직전 점 솎기 (Ramer-Douglas-Peucker). FE-only.
//
// Apple Pencil / 포인터는 거의 일직선 구간에도 점을 촘촘히 emit → JSON payload
// 가 빠르게 4MB cap(be-v0.1.34) 에 도달. 화면에 그려지는 live workspace 는
// full-fidelity 그대로 두고, BE 로 PUT 되는 직렬화 사본의 inkStrokes 만 여기서
// 단순화한다. epsilon 보다 작게 벗어난 중간점만 제거 → 육안 차이 없음.
//
// 좌표는 normalized 0..1 (NormalizedPoint). epsilon 도 같은 단위.
// endpoint(첫·끝점)는 항상 보존. pressure/t 등 부가 필드는 살아남은 점의
// 원본 객체를 그대로 유지하므로 손실 없음.

import type { PdfInkPoint, PdfInkStroke } from "@study-note/domain";

// 0.0015 ≈ 페이지 폭의 0.15% (1200px 기준 ~1.8px). 육안 무손실 보수값.
export const DEFAULT_INK_EPSILON = 0.0015;

// 점 P 에서 선분 A→B 가 정의하는 직선까지의 수직거리(제곱).
function perpDistSq(p: PdfInkPoint, a: PdfInkPoint, b: PdfInkPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // A === B (degenerate) → 점 A 까지 거리.
    const ddx = p.x - a.x;
    const ddy = p.y - a.y;
    return ddx * ddx + ddy * ddy;
  }

  // (B-A) x (A-P) 의 면적 기반 수직거리. cross^2 / lenSq.
  const cross = dx * (a.y - p.y) - (a.x - p.x) * dy;
  return (cross * cross) / lenSq;
}

/**
 * 단일 획의 점 배열을 RDP 로 단순화. 점 2개 이하면 그대로 반환.
 * 재귀 대신 명시 스택 → 긴 획(수천 점)에서도 stack overflow 없음.
 */
export function simplifyPoints(
  points: PdfInkPoint[],
  epsilon: number = DEFAULT_INK_EPSILON
): PdfInkPoint[] {
  const n = points.length;
  if (n <= 2 || epsilon <= 0) {
    return points;
  }

  const epsilonSq = epsilon * epsilon;
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;

  const stack: Array<[number, number]> = [[0, n - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    if (end - start < 2) {
      continue;
    }

    const a = points[start] as PdfInkPoint;
    const b = points[end] as PdfInkPoint;
    let maxDistSq = -1;
    let maxIndex = -1;
    for (let i = start + 1; i < end; i++) {
      const distSq = perpDistSq(points[i] as PdfInkPoint, a, b);
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        maxIndex = i;
      }
    }

    if (maxDistSq > epsilonSq && maxIndex > start) {
      keep[maxIndex] = true;
      stack.push([start, maxIndex]);
      stack.push([maxIndex, end]);
    }
  }

  const result: PdfInkPoint[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) {
      result.push(points[i] as PdfInkPoint);
    }
  }
  return result;
}

/**
 * 획 배열을 점 솎은 새 배열로 반환. 솎은 결과가 원본과 길이가 같으면 원본
 * 획 객체를 그대로(참조 보존) 반환해 불필요한 할당을 피한다.
 */
export function decimateInkStrokes(
  strokes: PdfInkStroke[],
  epsilon: number = DEFAULT_INK_EPSILON
): PdfInkStroke[] {
  return strokes.map((stroke) => {
    const simplified = simplifyPoints(stroke.points, epsilon);
    if (simplified.length === stroke.points.length) {
      return stroke;
    }
    return { ...stroke, points: simplified };
  });
}
