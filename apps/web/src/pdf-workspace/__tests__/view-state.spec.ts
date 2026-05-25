/**
 * view-state.spec.ts — sprint-2026-W22-sprint-2 / layer B/slice-2b AC3.
 *
 * 6 함수 (getActivePdfWorkspaceSubjectId, setPdfPage, requestPdfPage,
 * movePdfPage, setPdfTool, togglePdfFullscreen) characterization. page
 * clamp + tool cast + Fullscreen API probe 분기 모두 case.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/view-state.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PdfMaterialDraft,
  PdfWorkspaceStore,
  PdfWorkspaceTool,
  SubjectPdfWorkspace
} from "@study-note/domain";

import {
  getActivePdfWorkspaceSubjectId,
  movePdfPage,
  requestPdfPage,
  setPdfPage,
  setPdfTool,
  togglePdfFullscreen,
  type FullscreenPort,
  type ViewStateCallbacks,
  type ViewStateContext
} from "../view-state.ts";

// ─── Fixtures ────────────────────────────────────────────────────────────

const SUBJECT_ID = "subject-1";

function makeMaterial(overrides: Partial<PdfMaterialDraft> = {}): PdfMaterialDraft {
  return {
    id: "local-1",
    backendMaterialId: "backend-mat-1",
    subjectId: SUBJECT_ID,
    fileName: "lecture.pdf",
    classDate: "2026-05-25",
    pageCount: 10,
    selectedPage: 3,
    selectedTool: "read" as PdfWorkspaceTool,
    uploadedAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides
  } as PdfMaterialDraft;
}

function makeWorkspace(material: PdfMaterialDraft | undefined): SubjectPdfWorkspace {
  return {
    material,
    materials: material ? [material] : [],
    selectedPage: 1,
    selectedTool: "read",
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: [],
    tables: [],
    charts: [],
    starMarks: [],
    eraserSize: 16,
    updatedAt: "2026-05-25T00:00:00.000Z"
  } as unknown as SubjectPdfWorkspace;
}

function makeContext(
  initialMaterial: PdfMaterialDraft | undefined
): { ctx: ViewStateContext; callbacks: ViewStateCallbacks; ref: { current: SubjectPdfWorkspace } } {
  const ref = { current: makeWorkspace(initialMaterial) };
  const store: PdfWorkspaceStore = { workspaces: { [SUBJECT_ID]: ref.current } };
  const ctx: ViewStateContext = {
    getStore: () => store,
    getRoute: () => ({ name: "pdf-workspace", subjectId: SUBJECT_ID }),
    domain: {
      getSubjectWorkspace: (s, id) => (s.workspaces[id] ?? makeWorkspace(undefined))
    }
  };
  const callbacks: ViewStateCallbacks = {
    updatePdfWorkspace: (sid, updater) => {
      const next = updater(ref.current);
      ref.current = next;
      store.workspaces[sid] = next;
    }
  };
  return { ctx, callbacks, ref };
}

// ─── 1) Route helper ─────────────────────────────────────────────────────

describe("getActivePdfWorkspaceSubjectId", () => {
  it("returns subjectId when route is pdf-workspace", () => {
    const ctx: ViewStateContext = {
      getStore: () => ({ workspaces: {} }),
      getRoute: () => ({ name: "pdf-workspace", subjectId: "subj-99" }),
      domain: { getSubjectWorkspace: () => makeWorkspace(undefined) }
    };
    assert.equal(getActivePdfWorkspaceSubjectId(ctx), "subj-99");
  });

  it("returns undefined when route is not pdf-workspace", () => {
    const ctx: ViewStateContext = {
      getStore: () => ({ workspaces: {} }),
      getRoute: () => ({ name: "intake", subjectId: "subj-99" }),
      domain: { getSubjectWorkspace: () => makeWorkspace(undefined) }
    };
    assert.equal(getActivePdfWorkspaceSubjectId(ctx), undefined);
  });
});

// ─── 2) Page mutators ────────────────────────────────────────────────────

describe("setPdfPage", () => {
  it("clamps pageNumber to 1..pageCount and commits", () => {
    const material = makeMaterial({ pageCount: 10, selectedPage: 3 });
    const { callbacks, ref } = makeContext(material);

    setPdfPage(SUBJECT_ID, 99, callbacks);
    assert.equal(ref.current.material?.selectedPage, 10);

    setPdfPage(SUBJECT_ID, -5, callbacks);
    assert.equal(ref.current.material?.selectedPage, 1);

    setPdfPage(SUBJECT_ID, 5, callbacks);
    assert.equal(ref.current.material?.selectedPage, 5);
  });

  it("noop when workspace.material is missing", () => {
    const { callbacks, ref } = makeContext(undefined);

    setPdfPage(SUBJECT_ID, 5, callbacks);
    assert.equal(ref.current.material, undefined);
  });
});

describe("requestPdfPage", () => {
  it("delegates to setPdfPage after clamp", () => {
    const material = makeMaterial({ pageCount: 7, selectedPage: 2 });
    const { ctx, callbacks, ref } = makeContext(material);

    requestPdfPage(SUBJECT_ID, 100, ctx, callbacks);
    assert.equal(ref.current.material?.selectedPage, 7);
  });

  it("noop when material is missing", () => {
    const { ctx, callbacks, ref } = makeContext(undefined);

    requestPdfPage(SUBJECT_ID, 3, ctx, callbacks);
    assert.equal(ref.current.material, undefined);
  });
});

describe("movePdfPage", () => {
  it("delta +1 advances to next page", () => {
    const material = makeMaterial({ pageCount: 10, selectedPage: 3 });
    const { ctx, callbacks, ref } = makeContext(material);

    movePdfPage(SUBJECT_ID, 1, ctx, callbacks);
    assert.equal(ref.current.material?.selectedPage, 4);
  });

  it("delta -1 clamps at minimum 1", () => {
    const material = makeMaterial({ pageCount: 10, selectedPage: 1 });
    const { ctx, callbacks, ref } = makeContext(material);

    movePdfPage(SUBJECT_ID, -1, ctx, callbacks);
    assert.equal(ref.current.material?.selectedPage, 1);
  });

  it("delta +99 clamps at pageCount", () => {
    const material = makeMaterial({ pageCount: 5, selectedPage: 3 });
    const { ctx, callbacks, ref } = makeContext(material);

    movePdfPage(SUBJECT_ID, 99, ctx, callbacks);
    assert.equal(ref.current.material?.selectedPage, 5);
  });
});

// ─── 3) Tool mutator ─────────────────────────────────────────────────────

describe("setPdfTool", () => {
  it("commits PdfWorkspaceTool value", () => {
    const material = makeMaterial({ selectedTool: "read" as PdfWorkspaceTool });
    const { callbacks, ref } = makeContext(material);

    setPdfTool(SUBJECT_ID, "pen" as PdfWorkspaceTool, callbacks);
    assert.equal(ref.current.material?.selectedTool, "pen");
  });

  it("accepts local 'eraser' extension (cast to PdfWorkspaceTool)", () => {
    const material = makeMaterial({ selectedTool: "read" as PdfWorkspaceTool });
    const { callbacks, ref } = makeContext(material);

    setPdfTool(SUBJECT_ID, "eraser", callbacks);
    assert.equal(ref.current.material?.selectedTool, "eraser");
  });

  it("noop when material is missing", () => {
    const { callbacks, ref } = makeContext(undefined);

    setPdfTool(SUBJECT_ID, "pen" as PdfWorkspaceTool, callbacks);
    assert.equal(ref.current.material, undefined);
  });
});

// ─── 4) Fullscreen toggle (port adapter) ─────────────────────────────────

function makePort(overrides: Partial<FullscreenPort> = {}): {
  port: FullscreenPort;
  log: {
    warns: Array<{ message: string; payload?: unknown }>;
    requested: number;
    exited: number;
  };
} {
  const log = { warns: [] as Array<{ message: string; payload?: unknown }>, requested: 0, exited: 0 };
  const target = {} as HTMLElement;
  const port: FullscreenPort = {
    isWorkspaceFullscreen: () => false,
    getWorkspaceTarget: () => target,
    exitFullscreen: () => {
      log.exited += 1;
      return Promise.resolve();
    },
    requestFullscreen: () => {
      log.requested += 1;
      return Promise.resolve();
    },
    warn: (message, payload) => {
      log.warns.push({ message, payload });
    },
    ...overrides
  };
  return { port, log };
}

describe("togglePdfFullscreen", () => {
  it("noop when workspace target is missing", () => {
    const { port, log } = makePort({ getWorkspaceTarget: () => null });

    togglePdfFullscreen(port);

    assert.equal(log.requested, 0);
    assert.equal(log.exited, 0);
    assert.equal(log.warns.length, 0);
  });

  it("calls requestFullscreen when not currently fullscreen", () => {
    const { port, log } = makePort();

    togglePdfFullscreen(port);

    assert.equal(log.requested, 1);
    assert.equal(log.exited, 0);
  });

  it("calls exitFullscreen when currently fullscreen", () => {
    const { port, log } = makePort({ isWorkspaceFullscreen: () => true });

    togglePdfFullscreen(port);

    assert.equal(log.exited, 1);
    assert.equal(log.requested, 0);
  });

  it("warns when requestFullscreen API is unavailable (returns null)", () => {
    const { port, log } = makePort({ requestFullscreen: () => null });

    togglePdfFullscreen(port);

    assert.ok(
      log.warns.some((w) => /requestFullscreen unavailable/.test(w.message)),
      "expected unavailable warning"
    );
  });

  it("warns when exitFullscreen API is unavailable (returns null)", () => {
    const { port, log } = makePort({
      isWorkspaceFullscreen: () => true,
      exitFullscreen: () => null
    });

    togglePdfFullscreen(port);

    assert.ok(log.warns.some((w) => /exitFullscreen unavailable/.test(w.message)));
  });
});
