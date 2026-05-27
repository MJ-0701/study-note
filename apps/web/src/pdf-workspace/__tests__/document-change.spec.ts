/**
 * document-change.spec.ts — sprint-2026-W22-sprint-2 / layer B/slice-2b AC3.
 *
 * handleDocumentChange 분기 (chart / classDate legacy / classDate preview /
 * fileImport / pageSel / eraserSize / checklist / weekNote) characterization. 각 branch ≥ 1 case +
 * non-target ignore + branch isolation (early return) case.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/document-change.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  handleDocumentChange,
  type DocumentChangeCallbacks,
  type DocumentChangeContext
} from "../document-change.ts";

// ─── Stub HTMLInputElement / HTMLSelectElement ─────────────────────────

class StubInput {
  dataset: Record<string, string | undefined> = {};
  value = "";
  files: { 0?: File } | null = null;
  closest(_selector: string): HTMLElement | null {
    return null;
  }
}
class StubSelect {
  dataset: Record<string, string | undefined> = {};
  value = "";
  closest(selector: string): HTMLElement | null {
    if (selector === "[data-chart-id]") {
      return {
        querySelector: () => null
      } as unknown as HTMLElement;
    }
    return null;
  }
}

// Patch globals so `target instanceof HTMLInputElement` checks succeed.
(globalThis as { HTMLInputElement?: unknown }).HTMLInputElement = StubInput;
(globalThis as { HTMLSelectElement?: unknown }).HTMLSelectElement = StubSelect;

// ─── Harness ────────────────────────────────────────────────────────────

interface CallLog {
  charts: Array<{ chartId: string; content: string; type: string }>;
  classDate: Array<{ subjectId: string; materialId: string; value: string }>;
  importPdf: Array<{ name: string; subjectId: string }>;
  page: Array<{ subjectId: string; page: number }>;
  eraser: Array<{ subjectId: string; size: number }>;
  checklist: Array<{ subjectId: string; checklistId: string; itemId: string }>;
  weekNote: Array<{ name: string; subjectId: string }>;
  renders: number;
  debounceClears: string[];
}

function makeHarness(): {
  ctx: DocumentChangeContext;
  callbacks: DocumentChangeCallbacks;
  log: CallLog;
} {
  const log: CallLog = {
    charts: [],
    classDate: [],
    importPdf: [],
    page: [],
    eraser: [],
    checklist: [],
    weekNote: [],
    renders: 0,
    debounceClears: []
  };
  const ctx: DocumentChangeContext = {
    getSubjectWorkspace: () => ({
      charts: [{ id: "chart-1", content: "stored", subjectId: "subj-1" }]
    } as unknown as ReturnType<DocumentChangeContext["getSubjectWorkspace"]>)
  };
  const callbacks: DocumentChangeCallbacks = {
    chart: {
      readChartDataFromDom: () => ({ points: [{ x: 1, y: 2 }] }),
      decodeChartContent: () => ({ points: [{ x: 3, y: 4 }] }),
      encodeChartContent: (type, points) =>
        JSON.stringify({ type, points }),
      updateChartContent: (chart, content) => ({
        ...chart,
        content
      } as typeof chart),
      clearChartPointDebounce: (chartId) => {
        log.debounceClears.push(chartId);
      }
    },
    updatePdfWorkspace: (subjectId, updater) => {
      const result = updater({ charts: [{ id: "chart-1", content: "stored" }] } as Parameters<typeof updater>[0]);
      const updatedChart = (result as { charts?: Array<{ id: string; content: string }> }).charts?.[0];
      if (updatedChart) {
        log.charts.push({
          chartId: updatedChart.id,
          content: updatedChart.content,
          type: subjectId
        });
      }
    },
    renderApp: () => {
      log.renders += 1;
    },
    assignPdfMaterialClassDate: (subjectId, materialId, value) => {
      log.classDate.push({ subjectId, materialId, value });
    },
    importPdfMaterialFile: (file, subjectId) => {
      log.importPdf.push({ name: file.name, subjectId });
    },
    requestPdfPage: (subjectId, page) => {
      log.page.push({ subjectId, page });
    },
    applySetEraserSize: (subjectId, size) => {
      log.eraser.push({ subjectId, size });
    },
    applyToggleChecklistItem: (subjectId, checklistId, itemId) => {
      log.checklist.push({ subjectId, checklistId, itemId });
    },
    importWeekNoteFile: (file, subjectId) => {
      log.weekNote.push({ name: file.name, subjectId });
    }
  };
  return { ctx, callbacks, log };
}

function inputEvent(input: StubInput): Event {
  return { target: input } as unknown as Event;
}
function selectEvent(select: StubSelect): Event {
  return { target: select } as unknown as Event;
}
function fileLike(name: string): File {
  return { name } as File;
}

// ─── 1) Non-target ignore ────────────────────────────────────────────────

describe("handleDocumentChange — non-target ignore", () => {
  it("ignores event whose target is neither input nor select", () => {
    const { ctx, callbacks, log } = makeHarness();
    handleDocumentChange({ target: {} } as unknown as Event, ctx, callbacks);
    assert.equal(log.renders, 0);
    assert.equal(log.charts.length, 0);
  });
});

// ─── 2) chart branch ─────────────────────────────────────────────────────

describe("chart branch — update-chart-type", () => {
  it("clears debounce + commits encoded chart content", () => {
    const { ctx, callbacks, log } = makeHarness();
    const select = new StubSelect();
    select.dataset.action = "update-chart-type";
    select.dataset.subjectId = "subj-1";
    select.dataset.chartId = "chart-1";
    select.value = "bar";

    handleDocumentChange(selectEvent(select), ctx, callbacks);

    assert.deepEqual(log.debounceClears, ["chart-1"]);
    assert.equal(log.charts.length, 1);
    assert.equal(log.renders, 1);
  });
});

// ─── 3) classDate branch ─────────────────────────────────────────────────

describe("classDate branch — assign-pdf-class-date", () => {
  it("delegates to assignPdfMaterialClassDate with select.value", () => {
    const { ctx, callbacks, log } = makeHarness();
    const select = new StubSelect();
    select.dataset.action = "assign-pdf-class-date";
    select.dataset.subjectId = "subj-1";
    select.dataset.materialId = "mat-1";
    select.value = "2026-05-25";

    handleDocumentChange(selectEvent(select), ctx, callbacks);

    assert.deepEqual(log.classDate, [
      { subjectId: "subj-1", materialId: "mat-1", value: "2026-05-25" }
    ]);
    // classDate branch does NOT render — assignPdfMaterialClassDate owns its own render.
    assert.equal(log.renders, 0);
  });

  it("previews custom classDate radio choice in the visible summary", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    const current = { textContent: "수업일 미지정" };
    const picker = {
      removed: "",
      removeAttribute(name: string) {
        this.removed = name;
      }
    };
    const field = {
      querySelector(selector: string) {
        if (selector === '[data-role="pdf-class-date-current"]') return current;
        if (selector === '[data-role="pdf-class-date-picker"]') return picker;
        return null;
      }
    };
    input.dataset.action = "preview-pdf-class-date";
    input.dataset.label = "2026-05-28 · 보강 수업";
    input.closest = () => field as unknown as HTMLElement;

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.equal(current.textContent, "2026-05-28 · 보강 수업");
    assert.equal(picker.removed, "open");
    assert.equal(log.classDate.length, 0);
  });
});

// ─── 4) import-pdf-material branch ──────────────────────────────────────

describe("import-pdf-material branch", () => {
  it("calls importPdfMaterialFile + clears target.value", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    input.dataset.action = "import-pdf-material";
    input.dataset.subjectId = "subj-1";
    const file = fileLike("lecture.pdf");
    input.files = { 0: file };
    input.value = "C:\\fakepath\\lecture.pdf";

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.deepEqual(log.importPdf, [{ name: "lecture.pdf", subjectId: "subj-1" }]);
    assert.equal(input.value, "", "target.value must reset for re-select UX");
  });
});

// ─── 5) select-pdf-page branch ───────────────────────────────────────────

describe("select-pdf-page branch", () => {
  it("calls requestPdfPage + renderApp when value is integer", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    input.dataset.action = "select-pdf-page";
    input.dataset.subjectId = "subj-1";
    input.value = "5";

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.deepEqual(log.page, [{ subjectId: "subj-1", page: 5 }]);
    assert.equal(log.renders, 1);
  });

  it("noop when value is non-integer (Number.isInteger guard)", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    input.dataset.action = "select-pdf-page";
    input.dataset.subjectId = "subj-1";
    input.value = "abc";

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.equal(log.page.length, 0);
    assert.equal(log.renders, 0);
  });
});

// ─── 6) set-eraser-size branch ──────────────────────────────────────────

describe("set-eraser-size branch", () => {
  it("calls applySetEraserSize + renderApp", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    input.dataset.action = "set-eraser-size";
    input.dataset.subjectId = "subj-1";
    input.value = "32";

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.deepEqual(log.eraser, [{ subjectId: "subj-1", size: 32 }]);
    assert.equal(log.renders, 1);
  });
});

// ─── 7) toggle-checklist-item branch ─────────────────────────────────────

describe("toggle-checklist-item branch", () => {
  it("calls applyToggleChecklistItem + renderApp when all dataset present", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    input.dataset.action = "toggle-checklist-item";
    input.dataset.subjectId = "subj-1";
    input.dataset.checklistId = "list-1";
    input.dataset.itemId = "item-1";

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.deepEqual(log.checklist, [
      { subjectId: "subj-1", checklistId: "list-1", itemId: "item-1" }
    ]);
    assert.equal(log.renders, 1);
  });
});

// ─── 8) import-week-note branch ─────────────────────────────────────────

describe("import-week-note branch", () => {
  it("calls importWeekNoteFile + clears target.value", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    input.dataset.action = "import-week-note";
    input.dataset.subjectId = "subj-1";
    const file = fileLike("week-3.json");
    input.files = { 0: file };
    input.value = "C:\\fakepath\\week-3.json";

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.deepEqual(log.weekNote, [{ name: "week-3.json", subjectId: "subj-1" }]);
    assert.equal(input.value, "");
  });
});

// ─── 9) Branch isolation (early return) ─────────────────────────────────

describe("branch isolation", () => {
  it("classDate select does NOT fire chart branch even though both are HTMLSelectElement", () => {
    const { ctx, callbacks, log } = makeHarness();
    const select = new StubSelect();
    select.dataset.action = "assign-pdf-class-date";
    select.dataset.subjectId = "subj-1";
    select.dataset.materialId = "mat-1";
    select.value = "2026-05-25";

    handleDocumentChange(selectEvent(select), ctx, callbacks);

    assert.equal(log.charts.length, 0);
    assert.equal(log.debounceClears.length, 0);
    assert.equal(log.classDate.length, 1);
  });

  it("input with unknown action falls through without invoking any callback", () => {
    const { ctx, callbacks, log } = makeHarness();
    const input = new StubInput();
    input.dataset.action = "unknown-action";

    handleDocumentChange(inputEvent(input), ctx, callbacks);

    assert.equal(log.renders, 0);
    assert.equal(log.classDate.length, 0);
    assert.equal(log.importPdf.length, 0);
  });
});
