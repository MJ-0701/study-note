// F-12 단위 테스트 — import payload 내부 Concept↔Keyword 참조 일관성 invariant.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test packages/domain/__tests__/lecture-note-import.spec.ts

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { validateWeekNoteImportReferences } from "../src/lecture-note-references.ts";
import type { WeekNoteImportPayload } from "../src/lecture-note-import.ts";

function payload(over: Record<string, unknown>): WeekNoteImportPayload {
  return {
    requiredKeywords: [],
    concepts: [],
    ...over
  } as unknown as WeekNoteImportPayload;
}

describe("validateWeekNoteImportReferences (F-12 invariant)", () => {
  it("returns [] for an internally-consistent payload", () => {
    const p = payload({
      requiredKeywords: [{ id: "k1", conceptIds: ["c1"] }],
      concepts: [{ id: "c1", relatedKeywordIds: ["k1"] }]
    });
    assert.deepEqual(validateWeekNoteImportReferences(p), []);
  });

  it("flags a keyword referencing a concept not in the payload", () => {
    const p = payload({
      requiredKeywords: [{ id: "k1", conceptIds: ["cX"] }],
      concepts: [{ id: "c1", relatedKeywordIds: [] }]
    });
    const errors = validateWeekNoteImportReferences(p);
    assert.equal(errors.length, 1);
    assert.match(errors[0]!, /unknown concept "cX"/);
  });

  it("flags a concept referencing a keyword not in the payload", () => {
    const p = payload({
      requiredKeywords: [{ id: "k1", conceptIds: [] }],
      concepts: [{ id: "c1", relatedKeywordIds: ["kX"] }]
    });
    const errors = validateWeekNoteImportReferences(p);
    assert.equal(errors.length, 1);
    assert.match(errors[0]!, /unknown keyword "kX"/);
  });

  it("accumulates errors from both directions", () => {
    const p = payload({
      requiredKeywords: [{ id: "k1", conceptIds: ["cX"] }],
      concepts: [{ id: "c1", relatedKeywordIds: ["kX"] }]
    });
    assert.equal(validateWeekNoteImportReferences(p).length, 2);
  });

  it("treats an empty payload as consistent", () => {
    assert.deepEqual(validateWeekNoteImportReferences(payload({})), []);
  });
});
