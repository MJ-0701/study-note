// sprint-14/slice-2 — inspector drill-down label / markup / storage tests.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/inspector-drill.spec.ts

import { strict as assert } from "node:assert";
import { register } from "node:module";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";

register(
  "data:text/javascript," + encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "@study-note/domain") {
        return { url: "study-note-test:domain", shortCircuit: true };
      }
      if (specifier === "./api/materials") {
        return { url: "study-note-test:materials", shortCircuit: true };
      }
      if (
        specifier === "./data/sampleLectureNote" ||
        specifier === "./data/intakeGuide" ||
        specifier === "./data/classSchedule"
      ) {
        return { url: "study-note-test:data", shortCircuit: true };
      }

      try {
        return await nextResolve(specifier, context);
      } catch (error) {
        const withoutQuery = specifier.split(/[?#]/, 1)[0] ?? specifier;
        if (
          (specifier.startsWith("./") || specifier.startsWith("../")) &&
          !/\\.[A-Za-z0-9]+$/.test(withoutQuery)
        ) {
          return nextResolve(specifier + ".ts", context);
        }
        throw error;
      }
    }

    export async function load(url, context, nextLoad) {
      if (url === "study-note-test:domain") {
        return {
          format: "module",
          shortCircuit: true,
          source: \`
            export const pdfWorkspaceStorageKey = "study-note.pdf-workspace.test";
            export function getConceptById() { return undefined; }
            export function getIntegrityWarnings() { return []; }
            export function getKeywordById() { return undefined; }
            export function getNotebookCoverage() { return { percentage: 0 }; }
            export function getQuestionById() { return undefined; }
            export function getSourceById() { return undefined; }
            export function getSubjectCoverage() { return { percentage: 0 }; }
            export function applyWeekNoteImport(value) { return value; }
            export function sanitizeWeekNoteImportPayload(value) { return value; }
            export function validateWeekNoteImportPayload() { return { ok: true }; }
            export function addChecklistItem(value) { return value; }
            export function createChecklist() { return {}; }
            export function createChart() { return {}; }
            export function createInkStroke() { return {}; }
            export function createPdfMaterialFromBackend() { return {}; }
            export function createStickyNote() { return {}; }
            export function createTable() { return {}; }
            export function createTextBox() { return {}; }
            export function deleteChecklist(value) { return value; }
            export function deleteChecklistItem(value) { return value; }
            export function deleteChart(value) { return value; }
            export function deleteTable(value) { return value; }
            export function deleteTextBox(value) { return value; }
            export function estimatePdfPageCount() { return 1; }
            export function formatPdfFileSize() { return "0 B"; }
            export function getSubjectPdfWorkspace() { return undefined; }
            export function hydrateSubjectPdfWorkspace(value) { return value; }
            export function moveChart(value) { return value; }
            export function moveChecklist(value) { return value; }
            export function moveTable(value) { return value; }
            export function moveTextBox(value) { return value; }
            export function normalizePdfPoint(value) { return value; }
            export function setEraserShape(value) { return value; }
            export function setEraserSize(value) { return value; }
            export function toggleChecklistCollapsed(value) { return value; }
            export function toggleChecklistItem(value) { return value; }
            export function toggleChartCollapsed(value) { return value; }
            export function toggleTableCollapsed(value) { return value; }
            export function updateChartContent(value) { return value; }
            export function updateChecklistItemLabel(value) { return value; }
            export function updateTableContent(value) { return value; }
            export function updateTextBoxContent(value) { return value; }
          \`
        };
      }
      if (url === "study-note-test:materials") {
        return {
          format: "module",
          shortCircuit: true,
          source: \`
            export class MaterialApiError extends Error {}
            export function createMaterialUploadIntent() { return Promise.resolve({}); }
            export function fetchPdfMaterialFile() { return Promise.resolve(new Blob()); }
            export function listPdfMaterials() { return Promise.resolve([]); }
            export function uploadMaterialFile() { return Promise.resolve({}); }
          \`
        };
      }
      if (url === "study-note-test:data") {
        return {
          format: "module",
          shortCircuit: true,
          source: \`
            export const sampleLectureNote = { subjects: [] };
            export const localIntakeGuide = [];
            export const classSchedule = [];
            export function scheduleRangeLabel() { return ""; }
          \`
        };
      }
      if (url.endsWith(".css")) {
        return { format: "module", shortCircuit: true, source: "export default {};" };
      }
      return nextLoad(url, context);
    }
  `),
  pathToFileURL(process.cwd() + "/")
);

type DrillType = "sticky" | "ink" | "textbox" | "checklist" | "table" | "chart";

interface TestWorkspace {
  subjectId: string;
  material?: unknown;
  stickyNotes: Array<{
    id: string;
    pageNumber: number;
    anchor: { x: number; y: number };
    blocks: Array<{ id: string; kind: string; content: string }>;
    updatedAt: string;
  }>;
  inkStrokes: Array<{
    id: string;
    pageNumber: number;
    color: string;
    width: number;
    points: Array<{ x: number; y: number; t: number }>;
    createdAt: string;
  }>;
  eraserShape: string;
  eraserSize: number;
  textBoxes: Array<{
    id: string;
    subjectId: string;
    page: number;
    position: { x: number; y: number };
    size: { width: number; height: number };
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  checklists: Array<{
    id: string;
    subjectId: string;
    page: number;
    position: { x: number; y: number };
    items: Array<{ id: string; label: string; checked: boolean }>;
    collapsed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  tables: Array<{
    id: string;
    subjectId: string;
    page: number;
    position: { x: number; y: number };
    content: string;
    collapsed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  charts: Array<{
    id: string;
    subjectId: string;
    page: number;
    position: { x: number; y: number };
    content: string;
    chartType: string;
    collapsed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  updatedAt: string;
}

class StorageShim {
  private readonly values = new Map<string, string>();

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class TestElement {
  readonly childNodes: TestElement[] = [];
  readonly nodeName: string;
  private readonly attributes = new Map<string, string>();
  private ownText = "";

  constructor(nodeName: string) {
    this.nodeName = nodeName.toLowerCase();
  }

  append(...nodes: TestElement[]): void {
    this.childNodes.push(...nodes);
  }

  appendText(value: string): void {
    this.ownText += value;
  }

  get dataset(): Record<string, string> {
    const data: Record<string, string> = {};
    for (const [name, value] of this.attributes.entries()) {
      if (!name.startsWith("data-")) continue;
      const key = name.slice(5).replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
      data[key] = value;
    }
    return data;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  get textContent(): string {
    return this.ownText + this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value: string | null) {
    this.childNodes.splice(0, this.childNodes.length);
    this.ownText = value ?? "";
  }

  get innerHTML(): string {
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set innerHTML(html: string) {
    this.childNodes.splice(0, this.childNodes.length);
    this.ownText = "";
    parseHtmlInto(this, html);
  }

  findAll(): TestElement[] {
    return this.childNodes.flatMap((child) => [child, ...child.findAll()]);
  }

  querySelector(selector: string): TestElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): TestElement[] {
    const selectors = selector.split(",").map((item) => item.trim()).filter(Boolean);
    return this.findAll().filter((node) => selectors.some((item) => node.matchesSelector(item)));
  }

  private matchesSelector(selector: string): boolean {
    const attrMatch = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attrMatch) {
      const attrName = attrMatch[1]!;
      const expected = attrMatch[2];
      const actual = this.getAttribute(attrName);
      return expected === undefined ? actual !== null : actual === expected;
    }

    return this.nodeName === selector.toLowerCase();
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseHtmlInto(parent: TestElement, html: string): void {
  const stack: TestElement[] = [parent];
  const tokenPattern = /<\/?[^>]+>|[^<]+/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(html)) !== null) {
    const token = match[0];
    const current = stack[stack.length - 1] ?? parent;

    if (!token.startsWith("<")) {
      current.appendText(decodeHtml(token));
      continue;
    }

    if (token.startsWith("</")) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const tagMatch = token.match(/^<\s*([A-Za-z0-9-]+)/);
    if (!tagMatch) continue;
    const node = new TestElement(tagMatch[1]!);
    const attrsSource = token
      .replace(/^<\s*[A-Za-z0-9-]+/, "")
      .replace(/\/?\s*>$/, "");
    const attrPattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrPattern.exec(attrsSource)) !== null) {
      const name = attrMatch[1]!;
      const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
      node.setAttribute(name, decodeHtml(value));
    }

    current.append(node);
    if (!token.endsWith("/>") && node.nodeName !== "img" && node.nodeName !== "input" && node.nodeName !== "br") {
      stack.push(node);
    }
  }
}

const testDocument = {
  createElement(tagName: string): TestElement {
    return new TestElement(tagName);
  },

  createElementNS(_namespace: string, tagName: string): TestElement {
    return new TestElement(tagName);
  }
};

(globalThis as unknown as { document: typeof testDocument }).document = testDocument;
(globalThis as unknown as { localStorage: StorageShim }).localStorage = new StorageShim();

const {
  formatDrillLabel,
  readInspectorDrill,
  renderDrillList,
  toggleInspectorDrillState,
  writeInspectorDrill
} = await import("../main.ts");

const STORAGE_KEY = "studyNote.pdfWorkspace.inspectorDrill";
const NOW = "2026-05-19T00:00:00.000Z";

function baseWorkspace(overrides: Partial<TestWorkspace> = {}): TestWorkspace {
  return {
    subjectId: "subject-1",
    stickyNotes: [],
    inkStrokes: [],
    eraserShape: "circle",
    eraserSize: 16,
    textBoxes: [],
    checklists: [],
    tables: [],
    charts: [],
    updatedAt: NOW,
    ...overrides
  };
}

function sticky(id: string, pageNumber: number, content: string) {
  return {
    id,
    pageNumber,
    anchor: { x: 0.1, y: 0.2 },
    blocks: [{ id: `${id}-block`, kind: "text", content }],
    updatedAt: NOW
  };
}

function ink(id: string, pageNumber: number, points = 2) {
  return {
    id,
    pageNumber,
    color: "#111111",
    width: 3,
    points: Array.from({ length: points }, (_, index) => ({ x: index / 10, y: index / 10, t: index })),
    createdAt: NOW
  };
}

function textbox(id: string, page: number, content: string) {
  return {
    id,
    subjectId: "subject-1",
    page,
    position: { x: 0.1, y: 0.2 },
    size: { width: 0.2, height: 0.1 },
    content,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function checklist(id: string, page: number, label: string) {
  return {
    id,
    subjectId: "subject-1",
    page,
    position: { x: 0.1, y: 0.2 },
    items: label.length > 0 ? [{ id: `${id}-item`, label, checked: false }] : [],
    collapsed: true,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function table(id: string, page: number, cell: string) {
  return {
    id,
    subjectId: "subject-1",
    page,
    position: { x: 0.1, y: 0.2 },
    content: cell.length > 0 ? `| ${cell} |\n|---|\n| value |` : "",
    collapsed: true,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function chart(id: string, page: number, content: string) {
  return {
    id,
    subjectId: "subject-1",
    page,
    position: { x: 0.1, y: 0.2 },
    content,
    chartType: "sparkline",
    collapsed: true,
    createdAt: NOW,
    updatedAt: NOW
  };
}

function renderIntoContainer(html: string): TestElement {
  const container = document.createElement("div") as unknown as TestElement;
  container.innerHTML = html;
  return container;
}

describe("inspector drill state", () => {
  test("read/write/toggle uses one localStorage object", () => {
    localStorage.clear();
    assert.deepEqual(readInspectorDrill(), {
      sticky: false,
      ink: false,
      textbox: false,
      checklist: false,
      table: false,
      chart: false
    });

    const next = toggleInspectorDrillState(readInspectorDrill(), "sticky");
    writeInspectorDrill(next);

    assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").sticky, true);
    assert.deepEqual(readInspectorDrill(), next);
  });
});

describe("formatDrillLabel", () => {
  test("6개 type happy path label을 만든다", () => {
    assert.equal(formatDrillLabel("sticky", sticky("s1", 2, "핵심 메모")), "페이지 2 · 핵심 메모");
    assert.equal(formatDrillLabel("textbox", textbox("tb1", 3, "텍스트")), "페이지 3 · 텍스트");
    assert.equal(formatDrillLabel("checklist", checklist("cl1", 4, "확인 항목")), "페이지 4 · 확인 항목");
    assert.equal(formatDrillLabel("table", table("t1", 5, "표 셀")), "페이지 5 · 표 셀");
    assert.equal(formatDrillLabel("chart", chart("c1", 6, "type:tan\n0,0\n1,1")), "페이지 6 · tan (2 points)");
    assert.equal(formatDrillLabel("ink", ink("i1", 7, 3), 1), "페이지 7 · stroke #2 (점 3개)");
  });

  test("빈 content fallback label을 만든다", () => {
    assert.equal(formatDrillLabel("sticky", sticky("s1", 1, "")), "페이지 1 · (빈 메모)");
    assert.equal(formatDrillLabel("textbox", textbox("tb1", 1, "   ")), "페이지 1 · (빈 텍스트)");
    assert.equal(formatDrillLabel("checklist", checklist("cl1", 1, "")), "페이지 1 · (빈 체크리스트)");
    assert.equal(formatDrillLabel("table", table("t1", 1, "")), "페이지 1 · (빈 표)");
  });

  test("30자 이후 content를 자른다", () => {
    const longText = "123456789012345678901234567890ABCDE";
    const label = formatDrillLabel("sticky", sticky("s1", 1, longText));

    assert(label.includes("123456789012345678901234567890"));
    assert(!label.includes("ABCDE"));
  });
});

describe("renderDrillList security", () => {
  const payloads = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>"
  ];

  for (const payload of payloads) {
    test(`payload is escaped in drill labels: ${payload.slice(0, 12)}`, () => {
      const fixtures: Array<[DrillType, TestWorkspace]> = [
        ["sticky", baseWorkspace({ stickyNotes: [sticky("s1", 1, payload)] })],
        ["textbox", baseWorkspace({ textBoxes: [textbox("tb1", 1, payload)] })],
        ["checklist", baseWorkspace({ checklists: [checklist("cl1", 1, payload)] })],
        ["table", baseWorkspace({ tables: [table("t1", 1, payload)] })],
        ["chart", baseWorkspace({ charts: [chart("c1", 1, payload)] })]
      ];

      for (const [type, workspace] of fixtures) {
        const container = renderIntoContainer(renderDrillList(type, workspace as never, "subject-1"));
        assert.equal(container.querySelectorAll("script,img").length, 0);
      }
    });
  }

  test("malicious annotation ids stay in one data attribute and dataset lookup works", () => {
    for (const id of ["'><img onerror=alert(1)>", "]),*"]) {
      const workspace = baseWorkspace({ stickyNotes: [sticky(id, 1, "safe")] });
      const container = renderIntoContainer(renderDrillList("sticky", workspace as never, "subject-1"));
      const items = container.querySelectorAll("[data-annotation-id]");
      const exactMatch = items.find((item) => item.dataset.annotationId === id);

      assert.equal(container.querySelectorAll("img").length, 0);
      assert.equal(items.length, 1);
      assert.ok(exactMatch);
    }
  });
});

describe("renderDrillList ordering and cap", () => {
  test("page 오름차순 정렬, 같은 page는 insertion order 유지", () => {
    const workspace = baseWorkspace({
      stickyNotes: [
        sticky("page-3", 3, "third"),
        sticky("page-1-a", 1, "first"),
        sticky("page-1-b", 1, "second")
      ]
    });
    const container = renderIntoContainer(renderDrillList("sticky", workspace as never, "subject-1"));

    assert.deepEqual(
      container.querySelectorAll("[data-annotation-id]").map((item) => item.dataset.annotationId),
      ["page-1-a", "page-1-b", "page-3"]
    );
  });

  test("50개까지만 렌더하고 나머지 count를 보여준다", () => {
    const stickyNotes = Array.from({ length: 53 }, (_, index) => sticky(`s-${index}`, index + 1, `note ${index}`));
    const workspace = baseWorkspace({ stickyNotes });
    const container = renderIntoContainer(renderDrillList("sticky", workspace as never, "subject-1"));

    assert.equal(container.querySelectorAll("[data-annotation-id]").length, 50);
    assert(container.textContent.includes("+ 3개 더 있음"));
  });
});
