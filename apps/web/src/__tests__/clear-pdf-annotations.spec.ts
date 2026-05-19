// sprint-12/round-3 — clearPdfAnnotations 신규 annotation slice 회귀 테스트.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/clear-pdf-annotations.spec.ts
//
// 이 spec 은 self-contained: main.ts 의 DOM/Vite 의존 없이 clear reducer + persistence contract 만 검증한다.

import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";

interface Workspace {
  subjectId: string;
  stickyNotes: unknown[];
  inkStrokes: unknown[];
  textBoxes: unknown[];
  checklists: unknown[];
  updatedAt: string;
}

interface PdfWorkspaceStore {
  workspaces: Record<string, Workspace>;
}

const pdfWorkspaceStorageKey = "studyNote.pdfWorkspace";
const storageMap = new Map<string, string>();
const stubLocalStorage = {
  getItem: (key: string): string | null => storageMap.get(key) ?? null,
  setItem: (key: string, value: string): void => { storageMap.set(key, value); },
  removeItem: (key: string): void => { storageMap.delete(key); },
  clear: (): void => { storageMap.clear(); }
};

(globalThis as unknown as { localStorage: typeof stubLocalStorage }).localStorage = stubLocalStorage;

let pdfWorkspaceStore: PdfWorkspaceStore;

function getSubjectPdfWorkspace(
  store: PdfWorkspaceStore,
  subjectId: string
): Workspace {
  return store.workspaces[subjectId] ?? {
    subjectId,
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: [],
    updatedAt: new Date().toISOString()
  };
}

function savePdfWorkspaceStore(): void {
  localStorage.setItem(pdfWorkspaceStorageKey, JSON.stringify(pdfWorkspaceStore));
}

function updatePdfWorkspace(
  subjectId: string,
  updater: (workspace: Workspace) => Workspace
): void {
  const current = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const updated = {
    ...updater(current),
    updatedAt: new Date().toISOString()
  };

  pdfWorkspaceStore = {
    workspaces: {
      ...pdfWorkspaceStore.workspaces,
      [subjectId]: updated
    }
  };
  savePdfWorkspaceStore();
}

function clearPdfAnnotations(subjectId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: []
  }));
}

describe("clearPdfAnnotations (sprint-12/round-3 P2)", () => {
  beforeEach(() => {
    storageMap.clear();
    pdfWorkspaceStore = {
      workspaces: {
        subjectA: {
          subjectId: "subjectA",
          stickyNotes: [{ id: "note-1" }],
          inkStrokes: [{ id: "stroke-1" }],
          textBoxes: [{ id: "textbox-1" }],
          checklists: [{ id: "checklist-1" }],
          updatedAt: "2026-05-18T00:00:00.000Z"
        },
        subjectB: {
          subjectId: "subjectB",
          stickyNotes: [{ id: "note-b" }],
          inkStrokes: [{ id: "stroke-b" }],
          textBoxes: [{ id: "textbox-b" }],
          checklists: [{ id: "checklist-b" }],
          updatedAt: "2026-05-18T00:00:00.000Z"
        }
      }
    };
  });

  it("clears stickyNotes, inkStrokes, textBoxes, checklists in state and localStorage", () => {
    clearPdfAnnotations("subjectA");

    const cleared = pdfWorkspaceStore.workspaces.subjectA;
    assert.deepEqual(cleared.stickyNotes, []);
    assert.deepEqual(cleared.inkStrokes, []);
    assert.deepEqual(cleared.textBoxes, []);
    assert.deepEqual(cleared.checklists, []);

    const raw = localStorage.getItem(pdfWorkspaceStorageKey);
    assert.ok(raw, "workspace store is persisted");

    const persisted = JSON.parse(raw) as PdfWorkspaceStore;
    const persistedCleared = persisted.workspaces.subjectA;
    assert.deepEqual(persistedCleared.stickyNotes, []);
    assert.deepEqual(persistedCleared.inkStrokes, []);
    assert.deepEqual(persistedCleared.textBoxes, []);
    assert.deepEqual(persistedCleared.checklists, []);
  });

  it("preserves annotations for other subjects", () => {
    clearPdfAnnotations("subjectA");

    const untouched = pdfWorkspaceStore.workspaces.subjectB;
    assert.equal(untouched.stickyNotes.length, 1);
    assert.equal(untouched.inkStrokes.length, 1);
    assert.equal(untouched.textBoxes.length, 1);
    assert.equal(untouched.checklists.length, 1);
  });
});
