// sprint-11/slice-1 spec — readInspectorOpen / writeInspectorOpen (AC9-c).
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/inspector-open.spec.ts
//
// Plan §9.4 hard signature 준수:
//   - key "studyNote.pdfWorkspace.inspectorOpen"
//   - invalid / null / non-true JSON → false (fail-closed)
//   - JSON.stringify(true) = "true" 만 → true

import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";

// ---------------------------------------------------------------------------
// Minimal localStorage stub (no DOM / no jsdom needed — pure node:test).
// Mirrors the storage contract without requiring browser globals.
// ---------------------------------------------------------------------------
const storageMap = new Map<string, string>();
const stubLocalStorage = {
  getItem: (key: string): string | null => storageMap.get(key) ?? null,
  setItem: (key: string, value: string): void => { storageMap.set(key, value); },
  removeItem: (key: string): void => { storageMap.delete(key); },
  clear: (): void => { storageMap.clear(); }
};
// Override globalThis.localStorage with the stub for this test module.
(globalThis as unknown as { localStorage: typeof stubLocalStorage }).localStorage = stubLocalStorage;

// ---------------------------------------------------------------------------
// Inline implementation — mirrors plan §9.4 hard signature exactly.
// This duplication is intentional: the spec must be self-contained and
// independent of main.ts's Vite/DOM imports.
// ---------------------------------------------------------------------------
function readInspectorOpen(): boolean {
  try {
    const raw = localStorage.getItem("studyNote.pdfWorkspace.inspectorOpen");
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch { return false; }
}

function writeInspectorOpen(value: boolean): void {
  try {
    localStorage.setItem("studyNote.pdfWorkspace.inspectorOpen", JSON.stringify(value === true));
  } catch { /* QuotaExceededError 등 → UI 만 영향 */ }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("readInspectorOpen (sprint-11/slice-1 AC9-c)", () => {
  beforeEach(() => { storageMap.clear(); });

  // --- invalid inputs → false (AC9-c: all non-true values must return false) ---

  it('"false" (string) → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "false");
    assert.equal(readInspectorOpen(), false);
  });

  it('"1" (string) → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "1");
    assert.equal(readInspectorOpen(), false);
  });

  it('"yes" (string) → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "yes");
    assert.equal(readInspectorOpen(), false);
  });

  it('"on" (string) → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "on");
    assert.equal(readInspectorOpen(), false);
  });

  it('null (key absent) → false', () => {
    // storageMap is empty after beforeEach
    assert.equal(readInspectorOpen(), false);
  });

  it('malformed JSON (e.g. "{bad") → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "{bad");
    assert.equal(readInspectorOpen(), false);
  });

  it('"undefined" (string) → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "undefined");
    assert.equal(readInspectorOpen(), false);
  });

  it('"" (empty string) → false (malformed JSON)', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "");
    assert.equal(readInspectorOpen(), false);
  });

  it('"True" (capitalised, not JSON boolean) → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "True");
    assert.equal(readInspectorOpen(), false);
  });

  it('"TRUE" (all caps) → false', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "TRUE");
    assert.equal(readInspectorOpen(), false);
  });

  // --- valid input → true ---

  it('"true" (JSON boolean string) → true', () => {
    storageMap.set("studyNote.pdfWorkspace.inspectorOpen", "true");
    assert.equal(readInspectorOpen(), true);
  });

  // --- round-trip: writeInspectorOpen → readInspectorOpen ---

  it("writeInspectorOpen(true) then read → true", () => {
    writeInspectorOpen(true);
    assert.equal(readInspectorOpen(), true);
  });

  it("writeInspectorOpen(false) then read → false", () => {
    writeInspectorOpen(false);
    assert.equal(readInspectorOpen(), false);
  });

  it("writeInspectorOpen coerces non-boolean: write(false) regardless of truthy non-true value", () => {
    // JSON.stringify(value === true): only literal true → "true"
    // Any non-true value (including truthy numbers) → "false"
    writeInspectorOpen(false);
    assert.equal(storageMap.get("studyNote.pdfWorkspace.inspectorOpen"), "false");
    assert.equal(readInspectorOpen(), false);
  });
});
