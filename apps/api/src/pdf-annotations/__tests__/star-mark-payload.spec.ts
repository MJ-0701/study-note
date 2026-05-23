/**
 * star-mark-payload.spec.ts — sprint-W21-sprint-1 / S6 / AC25 + AC31 + ADR-12.
 *
 * 실행 (project-root):
 *   pnpm --filter @study-note/api build && \
 *   node --test apps/api/dist/pdf-annotations/__tests__/star-mark-payload.spec.js
 *
 * 검증:
 *  - Zod .strict() 가 unknown field reject
 *  - color 가 #rrggbb hex strict regex (3-digit / rgb()/url()/javascript: reject)
 *  - xRatio/yRatio min(0).max(1) reject (clamp 폐기 — ADR-12)
 *  - sizeRatio min(0.02).max(0.3) reject
 *  - cuid pattern enforce
 *  - validateStarMarksInPayload: 1개라도 invalid 면 throw (whole-reject)
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  starMarkSchema,
  starMarkArraySchema,
  validateStarMarksInPayload
} from "../starMark.dto";

const validStarMark = {
  id: "cm123abc456",
  pageNumber: 1,
  xRatio: 0.5,
  yRatio: 0.3,
  sizeRatio: 0.06,
  color: "#f59e0b",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z"
};

describe("AC25 — starMarkSchema strict + regex", () => {
  it("valid starMark passes", () => {
    const result = starMarkSchema.safeParse(validStarMark);
    assert.equal(result.success, true);
  });

  it("unknown field rejected (.strict())", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, malicious: 1 });
    assert.equal(result.success, false);
  });

  it("color: red;onclick=alert(1) rejected", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, color: "red;onclick=alert(1)" });
    assert.equal(result.success, false);
  });

  it("color: url(javascript:alert(1)) rejected", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, color: "url(javascript:alert(1))" });
    assert.equal(result.success, false);
  });

  it("color: 3-digit hex (#fff) rejected", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, color: "#fff" });
    assert.equal(result.success, false);
  });

  it("color: non-hex (#gggggg) rejected", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, color: "#gggggg" });
    assert.equal(result.success, false);
  });

  it("xRatio > 1 rejected (no clamp)", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, xRatio: 1.5 });
    assert.equal(result.success, false);
  });

  it("yRatio < 0 rejected", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, yRatio: -0.1 });
    assert.equal(result.success, false);
  });

  it("sizeRatio out of range (9999) rejected", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, sizeRatio: 9999 });
    assert.equal(result.success, false);
  });

  it("sizeRatio < 0.02 rejected", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, sizeRatio: 0.001 });
    assert.equal(result.success, false);
  });

  it("pageNumber 0 rejected (1-based)", () => {
    const result = starMarkSchema.safeParse({ ...validStarMark, pageNumber: 0 });
    assert.equal(result.success, false);
  });
});

describe("AC31 + ADR-12 — validateStarMarksInPayload whole-reject", () => {
  it("payload 에 starMarks 없으면 no-op", () => {
    assert.doesNotThrow(() => validateStarMarksInPayload({ stickyNotes: [], inkStrokes: [] }));
    assert.doesNotThrow(() => validateStarMarksInPayload({}));
  });

  it("starMarks=[] (empty array) → no-op", () => {
    assert.doesNotThrow(() => validateStarMarksInPayload({ starMarks: [] }));
  });

  it("valid starMarks array → no-op", () => {
    assert.doesNotThrow(() =>
      validateStarMarksInPayload({
        starMarks: [validStarMark, { ...validStarMark, id: "cm999xyz000" }]
      })
    );
  });

  it("1개라도 invalid (color XSS) 면 전체 throw (whole-reject)", () => {
    assert.throws(
      () =>
        validateStarMarksInPayload({
          starMarks: [validStarMark, { ...validStarMark, color: "red;onclick=alert(1)" }]
        }),
      /starMark validation failed/
    );
  });

  it("1개라도 invalid (unknown field) 면 전체 throw", () => {
    assert.throws(
      () =>
        validateStarMarksInPayload({
          starMarks: [{ ...validStarMark, malicious: "x" }]
        }),
      /starMark validation failed/
    );
  });

  it("starMarks 가 array 아닌 type 이면 throw", () => {
    assert.throws(() => validateStarMarksInPayload({ starMarks: "not-array" }), /must be an array/);
    assert.throws(() => validateStarMarksInPayload({ starMarks: 42 }), /must be an array/);
    assert.throws(() => validateStarMarksInPayload({ starMarks: {} }), /must be an array/);
  });

  it("non-object payload → no-op (다른 validator 책임)", () => {
    assert.doesNotThrow(() => validateStarMarksInPayload(null));
    assert.doesNotThrow(() => validateStarMarksInPayload(undefined));
    assert.doesNotThrow(() => validateStarMarksInPayload("string"));
  });
});

describe("starMarkArraySchema (top-level)", () => {
  it("array level safeParse 동일 동작", () => {
    const result = starMarkArraySchema.safeParse([validStarMark]);
    assert.equal(result.success, true);
  });

  it("invalid element 포함 시 fail", () => {
    const result = starMarkArraySchema.safeParse([validStarMark, { ...validStarMark, color: "bad" }]);
    assert.equal(result.success, false);
  });
});
