/**
 * class-date.spec.ts — sprint-2026-W22-sprint-2 / layer B/slice-2b AC3+AC6.
 *
 * 5 함수 (createClassDateWeekId, normalizePdfMaterialClassDateValue,
 * patchPdfWorkspaceMaterial, replacePdfWorkspaceMaterial,
 * assignPdfMaterialClassDate) characterization. assign 의 5 step (validate
 * → optimistic patch → local-only short-circuit → BE sync → rollback) 모두 case.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/class-date.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PdfMaterialDraft,
  PdfMaterialRecord,
  SubjectNote,
  SubjectPdfWorkspace
} from "@study-note/domain";

import {
  assignPdfMaterialClassDate,
  createClassDateWeekId,
  normalizePdfMaterialClassDateValue,
  patchPdfWorkspaceMaterial,
  replacePdfWorkspaceMaterial,
  type ClassDateCallbacks,
  type ClassDateContext,
  type ClassDateDomainHelpers,
  type ClassDateFeedback
} from "../class-date.ts";
import {
  PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
  PDF_MATERIAL_UNASSIGNED_WIRE_DATE
} from "../constants.ts";

// ─── Test fixtures ──────────────────────────────────────────────────────

const SUBJECT_ID = "subject-1";
const MATERIAL_KEY = "backend-mat-1";
const ISO = "2026-05-25";

function makeMaterial(overrides: Partial<PdfMaterialDraft> = {}): PdfMaterialDraft {
  return {
    id: "local-1",
    backendMaterialId: "backend-mat-1",
    subjectId: SUBJECT_ID,
    fileName: "lecture.pdf",
    classDate: "2026-05-18",
    selectedPage: 1,
    selectedTool: "read",
    uploadedAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides
  } as PdfMaterialDraft;
}

function makeSubject(weekLabels: string[] = [ISO]): SubjectNote {
  return {
    id: SUBJECT_ID,
    name: "Subject 1",
    weekNotes: weekLabels.map((label, i) => ({
      id: `week-${i}`,
      label,
      summary: "",
      keywords: [],
      reflections: ""
    }))
  } as unknown as SubjectNote;
}

function makeWorkspace(material: PdfMaterialDraft): SubjectPdfWorkspace {
  return {
    material,
    materials: [material],
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
    updatedAt: "2026-05-18T00:00:00.000Z"
  } as unknown as SubjectPdfWorkspace;
}

function makeRecord(classDate: string): PdfMaterialRecord {
  return {
    backendMaterialId: "backend-mat-1",
    fileName: "lecture.pdf",
    classDate,
    uploadedAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z"
  } as unknown as PdfMaterialRecord;
}

function makeContext(material: PdfMaterialDraft, subject: SubjectNote): ClassDateContext {
  return {
    apiBaseUrl: "https://api.test",
    getSubject: (sid) => (sid === subject.id ? subject : undefined),
    getSubjectMaterials: (sid) => (sid === subject.id ? [material] : [])
  };
}

interface CallLog {
  feedback: ClassDateFeedback[];
  renders: number;
  updates: Array<{ subjectId: string; resultMaterial: PdfMaterialDraft | undefined }>;
  beCalls: Array<{ id: string; payload: { classDate: string } }>;
  beResult: () => Promise<PdfMaterialRecord>;
}

function makeHelpers(): ClassDateDomainHelpers {
  return {
    getPdfMaterialKey: (m) => m.backendMaterialId ?? m.id,
    getPdfWorkspaceMaterials: (w) => (w.materials ?? []) as PdfMaterialDraft[],
    createPdfMaterialFromBackend: (record, previous) =>
      ({
        id: "local-1",
        backendMaterialId: record.backendMaterialId,
        subjectId: SUBJECT_ID,
        fileName: record.fileName,
        classDate: record.classDate,
        selectedPage: previous?.selectedPage ?? 1,
        selectedTool: previous?.selectedTool ?? "read",
        uploadedAt: record.uploadedAt,
        updatedAt: record.updatedAt
      } as unknown as PdfMaterialDraft),
    formatMaterialError: (err) => (err instanceof Error ? err.message : String(err))
  };
}

function makeCallbacks(
  initialWorkspace: SubjectPdfWorkspace,
  log: CallLog
): { callbacks: ClassDateCallbacks; workspaceRef: { current: SubjectPdfWorkspace } } {
  const workspaceRef = { current: initialWorkspace };
  const callbacks: ClassDateCallbacks = {
    setFeedback: (feedback) => {
      log.feedback.push(feedback);
    },
    renderApp: () => {
      log.renders += 1;
    },
    updatePdfWorkspace: (subjectId, updater) => {
      workspaceRef.current = updater(workspaceRef.current);
      log.updates.push({ subjectId, resultMaterial: workspaceRef.current.material });
    },
    updatePdfMaterialMetadata: async (_baseUrl, id, payload) => {
      log.beCalls.push({ id, payload });
      return log.beResult();
    }
  };
  return { callbacks, workspaceRef };
}

function makeLog(beResult: () => Promise<PdfMaterialRecord>): CallLog {
  return { feedback: [], renders: 0, updates: [], beCalls: [], beResult };
}

// ─── 1) Pure helpers ─────────────────────────────────────────────────────

describe("createClassDateWeekId", () => {
  it("generates a weekId with subject + slugged classDate", () => {
    const id = createClassDateWeekId("subject-A", "2026-05-25");
    assert.match(id, /^week-subject-A-2026-05-25-[0-9a-z]+$/);
  });

  it("falls back to timestamp when slug is empty (non-alphanumeric only)", () => {
    const id = createClassDateWeekId("subj", "@@@");
    assert.match(id, /^week-subj-[0-9a-z]+-[0-9a-z]+$/);
  });
});

describe("normalizePdfMaterialClassDateValue", () => {
  it("trims surrounding whitespace", () => {
    assert.equal(normalizePdfMaterialClassDateValue("  2026-05-25  "), "2026-05-25");
  });

  it("maps empty/whitespace to FE-local sentinel", () => {
    assert.equal(
      normalizePdfMaterialClassDateValue("   "),
      PDF_MATERIAL_UNASSIGNED_CLASS_DATE
    );
  });
});

// ─── 2) Workspace mutators ───────────────────────────────────────────────

describe("patchPdfWorkspaceMaterial", () => {
  it("merges patch into matching material via callbacks.updatePdfWorkspace", () => {
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const log = makeLog(async () => makeRecord(ISO));
    const { callbacks, workspaceRef } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    patchPdfWorkspaceMaterial(
      SUBJECT_ID,
      MATERIAL_KEY,
      { classDate: ISO },
      callbacks,
      helpers
    );

    assert.equal(workspaceRef.current.material?.classDate, ISO);
    assert.equal(workspaceRef.current.materials?.[0]?.classDate, ISO);
  });
});

describe("replacePdfWorkspaceMaterial", () => {
  it("overwrites matching material with next entry", () => {
    const material = makeMaterial();
    const next = makeMaterial({ classDate: ISO, fileName: "renamed.pdf" });
    const workspace = makeWorkspace(material);
    const log = makeLog(async () => makeRecord(ISO));
    const { callbacks, workspaceRef } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    replacePdfWorkspaceMaterial(SUBJECT_ID, MATERIAL_KEY, next, callbacks, helpers);

    assert.equal(workspaceRef.current.material?.fileName, "renamed.pdf");
    assert.equal(workspaceRef.current.material?.classDate, ISO);
  });
});

// ─── 3) assignPdfMaterialClassDate saga ─────────────────────────────────

describe("assignPdfMaterialClassDate", () => {
  it("rejects when subject/material is missing (error feedback)", async () => {
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const log = makeLog(async () => makeRecord(ISO));
    const { callbacks } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();
    const context: ClassDateContext = {
      apiBaseUrl: "https://api.test",
      getSubject: () => undefined,
      getSubjectMaterials: () => []
    };

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      ISO,
      context,
      callbacks,
      helpers
    );

    assert.equal(log.feedback[0]?.kind, "error");
    assert.match(log.feedback[0]?.title ?? "", /PDF 자료를 찾을 수 없습니다/);
    assert.equal(log.beCalls.length, 0);
  });

  it("rejects when classDate label is not in subject.weekNotes", async () => {
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const subject = makeSubject([]);
    const log = makeLog(async () => makeRecord(ISO));
    const { callbacks } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      ISO,
      makeContext(material, subject),
      callbacks,
      helpers
    );

    assert.equal(log.feedback[0]?.kind, "error");
    assert.match(log.feedback[0]?.title ?? "", /없는 수업일/);
    assert.equal(log.beCalls.length, 0);
  });

  it("skips BE sync when material is local-only (no backendMaterialId)", async () => {
    const material = makeMaterial({ backendMaterialId: undefined });
    const workspace = makeWorkspace(material);
    const subject = makeSubject([ISO]);
    const log = makeLog(async () => makeRecord(ISO));
    const { callbacks } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      "local-1", // local-only key
      ISO,
      makeContext(material, subject),
      callbacks,
      helpers
    );

    assert.equal(log.beCalls.length, 0);
    assert.ok(log.feedback.some((f) => /로컬 PDF 수업일/.test(f.title)));
  });

  it("converts sentinel to wire sentinel for BE sync", async () => {
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const subject = makeSubject([ISO]);
    const log = makeLog(async () => makeRecord(PDF_MATERIAL_UNASSIGNED_WIRE_DATE));
    const { callbacks } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
      makeContext(material, subject),
      callbacks,
      helpers
    );

    assert.equal(log.beCalls.length, 1);
    assert.equal(log.beCalls[0]?.payload.classDate, PDF_MATERIAL_UNASSIGNED_WIRE_DATE);
  });

  it("converts non-ISO legacy label to wire sentinel for BE sync", async () => {
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const subject = makeSubject(["5월 14일(목)"]);
    const log = makeLog(async () => makeRecord(PDF_MATERIAL_UNASSIGNED_WIRE_DATE));
    const { callbacks } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      "5월 14일(목)",
      makeContext(material, subject),
      callbacks,
      helpers
    );

    assert.equal(log.beCalls.length, 1);
    assert.equal(log.beCalls[0]?.payload.classDate, PDF_MATERIAL_UNASSIGNED_WIRE_DATE);
  });

  it("passes ISO date through unchanged to BE sync", async () => {
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const subject = makeSubject([ISO]);
    const log = makeLog(async () => makeRecord(ISO));
    const { callbacks } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      ISO,
      makeContext(material, subject),
      callbacks,
      helpers
    );

    assert.equal(log.beCalls.length, 1);
    assert.equal(log.beCalls[0]?.payload.classDate, ISO);
  });

  it("preserves FE-local sentinel when BE returns wire sentinel", async () => {
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const subject = makeSubject([ISO]);
    const log = makeLog(async () => makeRecord(PDF_MATERIAL_UNASSIGNED_WIRE_DATE));
    const { callbacks, workspaceRef } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
      makeContext(material, subject),
      callbacks,
      helpers
    );

    assert.equal(
      workspaceRef.current.material?.classDate,
      PDF_MATERIAL_UNASSIGNED_CLASS_DATE
    );
  });

  it("rollbacks classDate on BE error + emits error feedback", async () => {
    const material = makeMaterial({ classDate: "2026-04-01" });
    const workspace = makeWorkspace(material);
    const subject = makeSubject([ISO]);
    const log = makeLog(async () => {
      throw new Error("BE down");
    });
    const { callbacks, workspaceRef } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    await assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      ISO,
      makeContext(material, subject),
      callbacks,
      helpers
    );

    // optimistic patch → BE error → rollback to previous classDate.
    assert.equal(workspaceRef.current.material?.classDate, "2026-04-01");
    assert.ok(log.feedback.some((f) => f.kind === "error" && /저장하지 못했습니다/.test(f.title)));
  });

  it("emits optimistic 'saving' feedback before BE call completes", async () => {
    let resolveBE: ((record: PdfMaterialRecord) => void) | undefined;
    const material = makeMaterial();
    const workspace = makeWorkspace(material);
    const subject = makeSubject([ISO]);
    const log = makeLog(
      () =>
        new Promise<PdfMaterialRecord>((resolve) => {
          resolveBE = resolve;
        })
    );
    const { callbacks } = makeCallbacks(workspace, log);
    const helpers = makeHelpers();

    const promise = assignPdfMaterialClassDate(
      SUBJECT_ID,
      MATERIAL_KEY,
      ISO,
      makeContext(material, subject),
      callbacks,
      helpers
    );

    // BE 미응답 시점에 optimistic feedback 이 이미 emit.
    assert.ok(log.feedback.some((f) => /저장하는 중/.test(f.title)));
    resolveBE!(makeRecord(ISO));
    await promise;
  });
});
