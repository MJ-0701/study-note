// sprint-2026-W22-sprint-19 / layer D/slice-1 — notebook-storage characterization spec.

import { strict as assert } from "node:assert";
import { register } from "node:module";
import { beforeEach, describe, test } from "node:test";

// Mock @study-note/domain + ../data/sampleLectureNote — minimal shape.
register(
  "data:text/javascript," + encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "@study-note/domain") return { url: "study-note-test:domain", shortCircuit: true };
      if (specifier === "../data/sampleLectureNote") return { url: "study-note-test:sample", shortCircuit: true };
      try { return await nextResolve(specifier, context); }
      catch (error) {
        const withoutQuery = specifier.split(/[?#]/, 1)[0] ?? specifier;
        if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.[A-Za-z0-9]+$/.test(withoutQuery)) {
          return nextResolve(specifier + ".ts", context);
        }
        throw error;
      }
    }
    export async function load(url, context, nextLoad) {
      if (url === "study-note-test:domain") {
        return { format: "module", shortCircuit: true, source: "export const __mock__ = true;" };
      }
      if (url === "study-note-test:sample") {
        return { format: "module", shortCircuit: true, source: \`
          export const sampleLectureNote = {
            id: "nb-sample",
            updatedAt: "2026-01-01T00:00:00.000Z",
            subjects: [
              { id: "s1", title: "수학" },
              { id: "s2", title: "물리" }
            ]
          };
        \` };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

// Mock window.localStorage.
const storageBacking = new Map<string, string>();
let throwOnNextGet = false;
let throwOnNextSet = false;
let throwOnNextRemove = false;

const mockStorage = {
  getItem(key: string): string | null {
    if (throwOnNextGet) {
      throwOnNextGet = false;
      throw new Error("getItem throw");
    }
    return storageBacking.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    if (throwOnNextSet) {
      throwOnNextSet = false;
      throw new Error("setItem throw");
    }
    storageBacking.set(key, value);
  },
  removeItem(key: string): void {
    if (throwOnNextRemove) {
      throwOnNextRemove = false;
      throw new Error("removeItem throw");
    }
    storageBacking.delete(key);
  },
  clear(): void { storageBacking.clear(); },
  key(): string | null { return null; },
  length: 0
} as unknown as Storage;

(globalThis as Record<string, unknown>).window = { localStorage: mockStorage };

const ns = await import("../notebook-storage.ts");

function resetState(): void {
  storageBacking.clear();
  throwOnNextGet = false;
  throwOnNextSet = false;
  throwOnNextRemove = false;
  ns.__resetNotebookStorageStateForTesting__();
}

beforeEach(() => { resetState(); });

const VALID_NOTEBOOK = {
  id: "nb-x",
  updatedAt: "2026-05-27T00:00:00.000Z",
  subjects: [
    { id: "s1", title: "수학" },
    { id: "s2", title: "물리" }
  ]
} as never;

// ─── (a) loadStoredNotebook ───────────────────────────────────────────────

describe("notebook-storage — (a) loadStoredNotebook", () => {
  test("case 1: missing key → sampleLectureNote fallback", () => {
    const nb = ns.loadStoredNotebook("u1");
    assert.equal(nb.id, "nb-sample");
  });

  test("case 2: getItem throw → sampleLectureNote fallback (no remove)", () => {
    storageBacking.set("study-note.notebook.v2:u1", JSON.stringify(VALID_NOTEBOOK));
    throwOnNextGet = true;
    const nb = ns.loadStoredNotebook("u1");
    assert.equal(nb.id, "nb-sample");
    // backing untouched (remove not called)
    assert.ok(storageBacking.has("study-note.notebook.v2:u1"));
  });

  test("case 3: JSON parse fail → sampleLectureNote + remove key", () => {
    storageBacking.set("study-note.notebook.v2:u1", "{not-json}}");
    const nb = ns.loadStoredNotebook("u1");
    assert.equal(nb.id, "nb-sample");
    assert.ok(!storageBacking.has("study-note.notebook.v2:u1"));
  });

  test("case 4: schema mismatch (subjects ids 不一致) → sampleLectureNote + remove key", () => {
    storageBacking.set("study-note.notebook.v2:u1", JSON.stringify({
      id: "nb-x",
      subjects: [{ id: "DIFFERENT" }]
    }));
    const nb = ns.loadStoredNotebook("u1");
    assert.equal(nb.id, "nb-sample");
    assert.ok(!storageBacking.has("study-note.notebook.v2:u1"));
  });

  test("case 5: valid storage → parsed notebook", () => {
    storageBacking.set("study-note.notebook.v2:u1", JSON.stringify(VALID_NOTEBOOK));
    const nb = ns.loadStoredNotebook("u1");
    assert.equal(nb.id, "nb-x");
    assert.equal(nb.subjects.length, 2);
  });
});

// ─── (b) saveNotebook + state transition ──────────────────────────────────

describe("notebook-storage — (b) saveNotebook state transition", () => {
  test("case 6: userId=undefined → return true (no-op, no setItem)", () => {
    const callbacks: number[] = [];
    const result = ns.saveNotebook(VALID_NOTEBOOK, undefined, () => callbacks.push(1));
    assert.equal(result, true);
    assert.equal(storageBacking.size, 0);
    assert.equal(callbacks.length, 0);
  });

  test("case 7: success → setItem + return true (no callback when no prior error)", () => {
    const callbacks: number[] = [];
    const result = ns.saveNotebook(VALID_NOTEBOOK, "u1", () => callbacks.push(1));
    assert.equal(result, true);
    assert.ok(storageBacking.has("study-note.notebook.v2:u1"));
    assert.equal(callbacks.length, 0);
    assert.equal(ns.getNotebookStorageError(), undefined);
  });

  test("case 8: save throw (first) → errorReported true, callback called, return false", () => {
    const callbacks: number[] = [];
    throwOnNextSet = true;
    const result = ns.saveNotebook(VALID_NOTEBOOK, "u1", () => callbacks.push(1));
    assert.equal(result, false);
    assert.notEqual(ns.getNotebookStorageError(), undefined);
    assert.equal(callbacks.length, 1);
  });

  test("case 9: save throw (already reported) → message 갱신, callback 호출 안 함", () => {
    const callbacks: number[] = [];
    throwOnNextSet = true;
    ns.saveNotebook(VALID_NOTEBOOK, "u1", () => callbacks.push(1)); // first fail
    assert.equal(callbacks.length, 1);
    throwOnNextSet = true;
    ns.saveNotebook(VALID_NOTEBOOK, "u1", () => callbacks.push(1)); // second fail
    assert.equal(callbacks.length, 1, "callback must NOT re-fire on subsequent failure");
    assert.notEqual(ns.getNotebookStorageError(), undefined);
  });

  test("case 10: success after error → clear + callback called", () => {
    const callbacks: number[] = [];
    throwOnNextSet = true;
    ns.saveNotebook(VALID_NOTEBOOK, "u1", () => callbacks.push(1)); // fail
    callbacks.length = 0;
    const result = ns.saveNotebook(VALID_NOTEBOOK, "u1", () => callbacks.push(1)); // recover
    assert.equal(result, true);
    assert.equal(ns.getNotebookStorageError(), undefined);
    assert.equal(callbacks.length, 1);
  });
});

// ─── (c) clearNotebookStorageError ────────────────────────────────────────

describe("notebook-storage — (c) clearNotebookStorageError", () => {
  test("case 11: clear (no prior error) → noop, callback 호출 안 함", () => {
    const callbacks: number[] = [];
    ns.clearNotebookStorageError(() => callbacks.push(1));
    assert.equal(callbacks.length, 0);
    assert.equal(ns.getNotebookStorageError(), undefined);
  });

  test("case 12: clear (had error) → undefined + callback called", () => {
    const callbacks: number[] = [];
    throwOnNextSet = true;
    ns.saveNotebook(VALID_NOTEBOOK, "u1", () => callbacks.push(1)); // produce error
    callbacks.length = 0;
    ns.clearNotebookStorageError(() => callbacks.push(1));
    assert.equal(ns.getNotebookStorageError(), undefined);
    assert.equal(callbacks.length, 1);
  });
});

// ─── (d) hasCurrentSubjectSet + export shape ──────────────────────────────

describe("notebook-storage — (d) hasCurrentSubjectSet + shape", () => {
  test("case 13: hasCurrentSubjectSet matching / mismatching / undefined", () => {
    assert.equal(ns.hasCurrentSubjectSet({ subjects: [{ id: "s1" }, { id: "s2" }] as never }), true);
    assert.equal(ns.hasCurrentSubjectSet({ subjects: [{ id: "DIFFERENT" }] as never }), false);
    assert.equal(ns.hasCurrentSubjectSet({}), false);
    assert.equal(ns.hasCurrentSubjectSet({ subjects: undefined } as never), false);
  });

  test("case 14: export shape — 7 surface + 1 test reset", () => {
    assert.equal(typeof ns.notebookStorageKey, "string");
    assert.equal(ns.notebookStorageKey, "study-note.notebook.v2");
    assert.equal(typeof ns.buildNotebookKey, "function");
    assert.equal(typeof ns.loadStoredNotebook, "function");
    assert.equal(typeof ns.hasCurrentSubjectSet, "function");
    assert.equal(typeof ns.saveNotebook, "function");
    assert.equal(typeof ns.getNotebookStorageError, "function");
    assert.equal(typeof ns.clearNotebookStorageError, "function");
    assert.equal(typeof ns.__resetNotebookStorageStateForTesting__, "function");

    assert.equal(ns.buildNotebookKey("u1"), "study-note.notebook.v2:u1");
    assert.equal(ns.buildNotebookKey("user-with-dash"), "study-note.notebook.v2:user-with-dash");
  });
});
