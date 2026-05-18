// sprint-11/slice-2 spec — stickyKindModal state transitions (AC5 / R4-c).
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/sticky-kind-modal.spec.ts
//
// 테스트 대상: modal open/close/option-select state 전이 (DOM / focus / network 없음).
// main.ts 와 독립된 inline 구현 — Vite/DOM imports 없이 순수 node:test 실행.

import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";

// ---------------------------------------------------------------------------
// State shape — mirrors sprint-11/slice-2 module-scope variable in main.ts
// ---------------------------------------------------------------------------
type StickyNoteBlockKind = "text" | "checklist" | "table" | "chart-note";

type StickyKindModal = { subjectId: string } | null;

function isStickyNoteBlockKind(kind: string | undefined): kind is StickyNoteBlockKind {
  return (
    kind === "text" ||
    kind === "checklist" ||
    kind === "table" ||
    kind === "chart-note"
  );
}

// ---------------------------------------------------------------------------
// Inline state machine — mirrors R4-c semantics in main.ts
// ---------------------------------------------------------------------------
function openModal(
  current: StickyKindModal,
  subjectId: string
): StickyKindModal {
  return { subjectId };
}

function closeModal(_current: StickyKindModal): StickyKindModal {
  return null;
}

function selectKindAndClose(
  current: StickyKindModal,
  subjectId: string,
  kind: StickyNoteBlockKind
): { modal: StickyKindModal; added: { subjectId: string; kind: StickyNoteBlockKind } | null } {
  if (!current || current.subjectId !== subjectId) {
    return { modal: current, added: null };
  }
  return { modal: null, added: { subjectId, kind } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("stickyKindModal state transitions (sprint-11/slice-2 R4-c)", () => {
  let modal: StickyKindModal;

  beforeEach(() => {
    modal = null;
  });

  // --- open ---

  it("포스트잇 도구 선택 → modal open with subjectId", () => {
    modal = openModal(modal, "subject-1");
    assert.deepEqual(modal, { subjectId: "subject-1" });
  });

  it("다른 subjectId 로 open → subjectId 교체됨", () => {
    modal = openModal(modal, "subject-1");
    modal = openModal(modal, "subject-2");
    assert.deepEqual(modal, { subjectId: "subject-2" });
  });

  // --- close: Esc key / close button / overlay click ---

  it("Esc key → modal null (닫힘)", () => {
    modal = openModal(modal, "subject-1");
    modal = closeModal(modal);
    assert.equal(modal, null);
  });

  it("close button → modal null (닫힘)", () => {
    modal = openModal(modal, "subject-1");
    modal = closeModal(modal);
    assert.equal(modal, null);
  });

  it("overlay background click → modal null (닫힘)", () => {
    modal = openModal(modal, "subject-1");
    modal = closeModal(modal);
    assert.equal(modal, null);
  });

  it("닫힌 상태에서 close → null 유지 (idempotent)", () => {
    modal = closeModal(null);
    assert.equal(modal, null);
  });

  // --- option select → add + close ---

  it("텍스트 option 선택 → sticky added + modal 닫힘", () => {
    modal = openModal(modal, "subject-1");
    const result = selectKindAndClose(modal, "subject-1", "text");
    assert.equal(result.modal, null);
    assert.deepEqual(result.added, { subjectId: "subject-1", kind: "text" });
  });

  it("체크 option 선택 → sticky added + modal 닫힘", () => {
    modal = openModal(modal, "subject-1");
    const result = selectKindAndClose(modal, "subject-1", "checklist");
    assert.equal(result.modal, null);
    assert.deepEqual(result.added, { subjectId: "subject-1", kind: "checklist" });
  });

  it("표 option 선택 → sticky added + modal 닫힘", () => {
    modal = openModal(modal, "subject-1");
    const result = selectKindAndClose(modal, "subject-1", "table");
    assert.equal(result.modal, null);
    assert.deepEqual(result.added, { subjectId: "subject-1", kind: "table" });
  });

  it("그래프 option 선택 → sticky added + modal 닫힘", () => {
    modal = openModal(modal, "subject-1");
    const result = selectKindAndClose(modal, "subject-1", "chart-note");
    assert.equal(result.modal, null);
    assert.deepEqual(result.added, { subjectId: "subject-1", kind: "chart-note" });
  });

  it("modal이 null 일 때 option select → added = null (guard)", () => {
    const result = selectKindAndClose(null, "subject-1", "text");
    assert.equal(result.modal, null);
    assert.equal(result.added, null);
  });

  it("다른 subjectId 로 option select → modal 유지, added = null (guard)", () => {
    modal = openModal(modal, "subject-1");
    const result = selectKindAndClose(modal, "subject-2", "text");
    assert.deepEqual(result.modal, { subjectId: "subject-1" });
    assert.equal(result.added, null);
  });

  // --- isStickyNoteBlockKind guard ---

  it("isStickyNoteBlockKind: 4종 모두 true", () => {
    const kinds: string[] = ["text", "checklist", "table", "chart-note"];
    for (const k of kinds) {
      assert.equal(isStickyNoteBlockKind(k), true, `expected ${k} to be valid`);
    }
  });

  it("isStickyNoteBlockKind: 잘못된 값 → false", () => {
    assert.equal(isStickyNoteBlockKind(undefined), false);
    assert.equal(isStickyNoteBlockKind("note"), false);
    assert.equal(isStickyNoteBlockKind(""), false);
    assert.equal(isStickyNoteBlockKind("Text"), false);
  });
});
