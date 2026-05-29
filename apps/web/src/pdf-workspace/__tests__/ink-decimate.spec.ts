/**
 * ink-decimate.spec.ts — 잉크 점 솎기(RDP) characterization.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/ink-decimate.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PdfInkPoint, PdfInkStroke } from "@study-note/domain";
import {
  DEFAULT_INK_EPSILON,
  decimateInkStrokes,
  simplifyPoints
} from "../ink-decimate.ts";

function pt(x: number, y: number, t = 0, pressure?: number): PdfInkPoint {
  return pressure === undefined ? { x, y, t } : { x, y, t, pressure };
}

function stroke(points: PdfInkPoint[], id = "s1"): PdfInkStroke {
  return {
    id,
    pageNumber: 1,
    color: "#000000",
    width: 2,
    points,
    createdAt: "2026-05-29T00:00:00.000Z"
  };
}

describe("simplifyPoints", () => {
  it("점 2개 이하면 그대로 반환 (참조 보존)", () => {
    const one = [pt(0, 0)];
    const two = [pt(0, 0), pt(1, 1)];
    assert.equal(simplifyPoints(one), one);
    assert.equal(simplifyPoints(two), two);
  });

  it("일직선 위 중간점 전부 제거 → endpoint 2개만", () => {
    const pts = [pt(0, 0, 0), pt(0.25, 0.25, 1), pt(0.5, 0.5, 2), pt(0.75, 0.75, 3), pt(1, 1, 4)];
    const out = simplifyPoints(pts);
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], pts[0]);
    assert.deepEqual(out[1], pts[4]);
  });

  it("epsilon 초과 꺾임은 보존", () => {
    // 가운데 점이 직선에서 크게 벗어남 → 유지.
    const pts = [pt(0, 0), pt(0.5, 0.5), pt(1, 0)];
    const out = simplifyPoints(pts);
    assert.equal(out.length, 3);
  });

  it("endpoint 는 항상 보존", () => {
    const pts = [pt(0, 0, 0), pt(0.5, 0.0005, 1), pt(1, 0, 2)];
    const out = simplifyPoints(pts, DEFAULT_INK_EPSILON);
    // 중간점 편차 0.0005 < epsilon 0.0015 → 제거, endpoint 2개만.
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], pts[0]);
    assert.deepEqual(out[1], pts[2]);
  });

  it("살아남은 점의 pressure/t 부가필드 보존", () => {
    const pts = [pt(0, 0, 10, 0.4), pt(0.5, 0.5, 11, 0.6), pt(1, 0, 12, 0.5)];
    const out = simplifyPoints(pts);
    assert.equal(out.length, 3);
    assert.equal(out[0].pressure, 0.4);
    assert.equal(out[0].t, 10);
    assert.equal(out[2].pressure, 0.5);
  });

  it("epsilon<=0 이면 단순화 안 함", () => {
    const pts = [pt(0, 0), pt(0.5, 0.5), pt(1, 1)];
    const out = simplifyPoints(pts, 0);
    assert.equal(out, pts);
  });

  it("긴 직선 획(수천 점)도 stack overflow 없이 2점으로 솎음", () => {
    const pts: PdfInkPoint[] = [];
    for (let i = 0; i <= 5000; i++) {
      pts.push(pt(i / 5000, i / 5000, i));
    }
    const out = simplifyPoints(pts);
    assert.equal(out.length, 2);
  });
});

describe("decimateInkStrokes", () => {
  it("점 안 솎인 획은 원본 객체 참조 그대로", () => {
    const s = stroke([pt(0, 0), pt(0.5, 0.5), pt(1, 0)]); // 꺾임 → 3점 유지
    const out = decimateInkStrokes([s]);
    assert.equal(out[0], s);
  });

  it("솎인 획은 새 객체 + 단순화된 points + 나머지 필드 유지", () => {
    const s = stroke([pt(0, 0, 0), pt(0.5, 0.5, 1), pt(1, 1, 2)]); // 직선 → 2점
    const out = decimateInkStrokes([s]);
    assert.notEqual(out[0], s);
    assert.equal(out[0].points.length, 2);
    assert.equal(out[0].id, "s1");
    assert.equal(out[0].color, "#000000");
    assert.equal(out[0].width, 2);
  });

  it("원본 stroke.points 는 mutate 안 됨 (live workspace 보존)", () => {
    const original = [pt(0, 0, 0), pt(0.5, 0.5, 1), pt(1, 1, 2)];
    const s = stroke(original);
    decimateInkStrokes([s]);
    assert.equal(s.points.length, 3);
    assert.equal(s.points, original);
  });

  it("빈 배열은 빈 배열", () => {
    assert.deepEqual(decimateInkStrokes([]), []);
  });
});
