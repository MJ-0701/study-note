// sprint-2026-W22-sprint-8 / layer B/slice-2f/iv-bis — workspace-page characterization spec.
// AC6 분배 (plan §3): 18~20 case across (a~l) groups.
// AC7: AC9(e) closure — 6 surface (S1~S6) + TB1 helper trust boundary + PD1
//   permission denylist negative UI assertion.

import { strict as assert } from "node:assert";
import { register } from "node:module";
import { describe, test } from "node:test";

register(
  "data:text/javascript," + encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "@study-note/domain") {
        return { url: "study-note-test:domain", shortCircuit: true };
      }
      try {
        return await nextResolve(specifier, context);
      } catch (error) {
        const withoutQuery = specifier.split(/[?#]/, 1)[0] ?? specifier;
        if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.[A-Za-z0-9]+$/.test(withoutQuery)) {
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
            export function formatPdfFileSize(size) { return size + ' B'; }
            export function getSubjectPdfWorkspace(store, subjectId) {
              return store.workspaces[subjectId];
            }
            export function createChart(input) { return { id: "ch", subjectId: input.subjectId, page: input.page, position: input.position, content: "", chartType: "sparkline", collapsed: true, createdAt: "now", updatedAt: "now" }; }
            export function deleteChart(charts, id) { return charts.filter(c => c.id !== id); }
            export function moveChart(c, p) { return Object.assign({}, c, { position: p }); }
            export function toggleChartCollapsed(c) { return Object.assign({}, c, { collapsed: !c.collapsed }); }
            export function updateChartContent(c, content) { return Object.assign({}, c, { content }); }
            export function createTable(input) { return { id: "t", subjectId: input.subjectId, page: input.page, position: input.position, content: "", collapsed: true, createdAt: "now", updatedAt: "now" }; }
            export function deleteTable(tables, id) { return tables.filter(t => t.id !== id); }
            export function moveTable(t, p) { return Object.assign({}, t, { position: p }); }
            export function toggleTableCollapsed(t) { return Object.assign({}, t, { collapsed: !t.collapsed }); }
            export function updateTableContent(t, content) { return Object.assign({}, t, { content }); }
          \`
        };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");
(globalThis as Record<string, unknown>).document = testDocument;

const workspacePage = await import("../workspace-page.ts");

interface QueryContainer {
  innerHTML: string;
  querySelectorAll: (sel: string) => Array<{ hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string }>;
  querySelector: (sel: string) => { hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string } | null;
  textContent: string;
}

function parseContainer(html: string): QueryContainer {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QueryContainer;
}

// ─── Fixture builders ────────────────────────────────────────────────────

interface BuildOpts {
  canManage?: boolean;
  hasMaterial?: boolean;
  hasObjectUrl?: boolean;
  isPreviewLoading?: boolean;
  inspectorOpen?: boolean;
  hasIntakeFeedback?: boolean;
  selectedTool?: string;
  withWidgets?: boolean;
  subjectTitle?: string;
  subjectId?: string;
  materialId?: string;
}

function buildSubject(opts: BuildOpts): { id: string; title: string } {
  return { id: opts.subjectId ?? "subj-1", title: opts.subjectTitle ?? "수학" };
}

function buildWorkspace(opts: BuildOpts): unknown {
  const widget = opts.withWidgets ?? false;
  return {
    subjectId: opts.subjectId ?? "subj-1",
    eraserShape: "circle",
    eraserSize: 24,
    material: opts.hasMaterial
      ? {
          backendMaterialId: opts.materialId ?? "mat-1",
          fileName: "syllabus.pdf",
          fileSize: 1234,
          pageCount: 10,
          selectedPage: 3,
          selectedTool: opts.selectedTool ?? "read",
          uploadStatus: "uploaded"
        }
      : undefined,
    stickyNotes: widget ? [{ id: "n1", pageNumber: 3, anchor: { x: 0.1, y: 0.2 }, blocks: [{ id: "b1", kind: "text", content: "메모" }], updatedAt: "2026-01-01T00:00:00Z" }] : [],
    inkStrokes: widget ? [{ id: "i1", pageNumber: 3, color: "#000000", width: 2, points: [{ x: 1, y: 2, t: 0 }], createdAt: "2026-01-01T00:00:00Z" }] : [],
    textBoxes: widget ? [{ id: "t1", subjectId: opts.subjectId ?? "subj-1", page: 3, position: { x: 0.3, y: 0.4 }, size: { width: 0.2, height: 0.1 }, content: "텍스트", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }] : [],
    checklists: widget ? [{ id: "c1", subjectId: opts.subjectId ?? "subj-1", page: 3, position: { x: 0.5, y: 0.6 }, items: [], collapsed: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }] : [],
    tables: widget ? [{ id: "tb1", subjectId: opts.subjectId ?? "subj-1", page: 3, position: { x: 0.7, y: 0.8 }, content: "| a |\n|---|", collapsed: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }] : [],
    charts: widget ? [{ id: "ch1", subjectId: opts.subjectId ?? "subj-1", page: 3, position: { x: 0.2, y: 0.5 }, content: "x,y\n1,2", chartType: "sparkline", collapsed: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }] : [],
    starMarks: widget ? [{ id: "s1", pageNumber: 3, xRatio: 0.4, yRatio: 0.4, sizeRatio: 0.06, color: "#ff0000", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }] : []
  };
}

function buildContext(opts: BuildOpts): import("../workspace-page.ts").WorkspacePageContext {
  const workspace = buildWorkspace(opts) as never;
  return {
    // store 의 workspaces 가 getSubjectPdfWorkspace 의 lookup 대상이 됨.
    getWorkspaceStore: () => ({ workspaces: { [opts.subjectId ?? "subj-1"]: workspace } } as never),
    getInspectorOpen: () => opts.inspectorOpen ?? false,
    hasIntakeFeedback: () => opts.hasIntakeFeedback ?? false,
    getActivePdfObjectUrl: () => (opts.hasObjectUrl ? "blob:object-url" : undefined),
    getActivePdfObjectUrlMaterialId: () => (opts.hasObjectUrl ? (opts.materialId ?? "mat-1") : undefined),
    hasActivePdfPreviewLoad: () => opts.isPreviewLoading ?? false,
    getSubjectPdfMaterials: () => ((opts.hasMaterial ? [(workspace as { material: unknown }).material] : []) as never),
    canManagePdfMaterials: () => opts.canManage ?? true,
    pdfToolbarContext: {
      isPdfWorkspaceFullscreen: () => false,
      pdfToolHotkeyLabels: {},
      renderEraserSubToolbar: () => ""
    },
    renderIntakeFeedback: () => `<div class="import-feedback intake-feedback">FB</div>`,
    renderSubjectPdfMaterialBrowser: () => `<section class="pdf-material-browser"></section>`,
    formatPdfTool: (tool) => `[${tool}]`
  };
}

// ─── (a) canManage=true × material=true × objectUrl=true × isPreviewLoading=false ──

describe("workspace-page — (a) happy path: canManage + material + objectUrl + !loading", () => {
  test("case 1: viewer rendered, upload form present, no loading state", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, hasObjectUrl: true, isPreviewLoading: false });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('input[data-action="import-pdf-material"]').length, 1);
    assert.equal(c.querySelectorAll('label.file-drop').length, 1);
    assert.equal(c.querySelectorAll('.pdf-page-binding-notice').length, 1);
    assert.ok(html.includes("페이지 3 / 10"));
  });
});

// ─── (b) canManage=true × material=true × objectUrl=true × isPreviewLoading=true ──

describe("workspace-page — (b) loading state", () => {
  test("case 2: viewer + isPreviewLoading=true (workspace render unchanged)", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, hasObjectUrl: true, isPreviewLoading: true });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('.pdf-workspace').length, 1);
    // material status block 의 isPreviewLoading 인자가 전달되어 placeholder 호출 안함.
    assert.equal(c.querySelectorAll('.pdf-placeholder').length, 0);
  });
});

// ─── (c) canManage=true × material=true × objectUrl=undefined ──

describe("workspace-page — (c) preview not ready", () => {
  test("case 3: placeholder displayed when objectUrl undefined", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, hasObjectUrl: false });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('.pdf-placeholder').length, 1);
    assert.equal(c.querySelectorAll('.pdf-page-binding-notice').length, 0);
  });
});

// ─── (d) canManage=true × material=undefined ──

describe("workspace-page — (d) no material, upload UI present", () => {
  test("case 4: upload input + label visible, no viewer", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: false });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('input[data-action="import-pdf-material"]').length, 1);
    assert.equal(c.querySelectorAll('label.file-drop').length, 1);
    assert.equal(c.querySelectorAll('.pdf-placeholder').length, 1);
  });
});

// ─── (e) canManage=false × material=true × objectUrl=true + PD1 ──

describe("workspace-page — (e) student view, material present, PD1 denylist", () => {
  test("case 5: upload UI ABSENT (file-input/file-drop/upload-hint 0), admin-only policy PRESENT", () => {
    const ctx = buildContext({ canManage: false, hasMaterial: true, hasObjectUrl: true });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    // PD1: upload UI 부재.
    assert.equal(c.querySelectorAll('input[data-action="import-pdf-material"]').length, 0);
    assert.equal(c.querySelectorAll('label.file-drop').length, 0);
    assert.equal(c.querySelectorAll('.pdf-upload-hint').length, 0);
    // PD1: admin-only policy 존재 + 텍스트.
    const policy = c.querySelector('.policy-block.is-standalone');
    assert.ok(policy);
    assert.ok(html.includes("업로드는 관리자만 가능합니다"));
    // viewer 는 정상 렌더.
    assert.equal(c.querySelectorAll('.pdf-workspace').length, 1);
  });
});

// ─── (f) canManage=false × material=undefined + PD1 ──

describe("workspace-page — (f) student view, no material, PD1 denylist", () => {
  test("case 6: upload UI ABSENT + admin-only policy PRESENT", () => {
    const ctx = buildContext({ canManage: false, hasMaterial: false });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('input[data-action="import-pdf-material"]').length, 0);
    assert.equal(c.querySelectorAll('label.file-drop').length, 0);
    assert.equal(c.querySelectorAll('.pdf-upload-hint').length, 0);
    assert.ok(html.includes("업로드는 관리자만 가능합니다"));
  });
});

// ─── (g) inspectorOpen=true / false ──

describe("workspace-page — (g) inspector toggle", () => {
  test("case 7: inspectorOpen=true → aria-hidden=false + 검사기 닫기 label", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, inspectorOpen: true });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    const aside = c.querySelector('#pdf-inspector-aside');
    assert.equal(aside?.getAttribute("aria-hidden"), "false");
    assert.ok(html.includes("검사기 닫기"));
    // is-inspector-open class.
    assert.ok(html.includes("is-inspector-open"));
  });

  test("case 8: inspectorOpen=false → aria-hidden=true + 검사기 열기 label", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, inspectorOpen: false });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    const aside = c.querySelector('#pdf-inspector-aside');
    assert.equal(aside?.getAttribute("aria-hidden"), "true");
    assert.ok(html.includes("검사기 열기"));
    assert.ok(html.includes("pdf-inspector--collapsed"));
  });
});

// ─── (h) selectedTool ∈ {read, pen, eraser, sticky} ──

describe("workspace-page — (h) selectedTool class application", () => {
  test("case 9: selectedTool=read → is-read-mode class", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, selectedTool: "read" });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    assert.ok(html.includes("is-read-mode"));
  });
  test("case 10: selectedTool=pen → is-pen-mode class", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, selectedTool: "pen" });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    assert.ok(html.includes("is-pen-mode"));
  });
  test("case 11: selectedTool=eraser → is-eraser-mode + cursor style", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, selectedTool: "eraser" });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    assert.ok(html.includes("is-eraser-mode"));
    // eraser 시 style attribute 가 surface 에 추가.
    assert.ok(/<div\s[^>]*class="pdf-annotation-surface is-eraser-mode"[^>]*style="/.test(html));
  });
  test("case 12: selectedTool=sticky → is-sticky-mode class", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, selectedTool: "sticky" });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    assert.ok(html.includes("is-sticky-mode"));
  });
});

// ─── (i) widget arrays empty / non-empty ──

describe("workspace-page — (i) widget rendering", () => {
  test("case 13: widget arrays empty → 0 widget mount element", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, withWidgets: false });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('.sticky-note,.text-box,.checklist-widget,.table-mount,.chart-mount,.star-mark').length, 0);
    // ink-layer 2 (static + live) — widget array 와 무관하게 항상 존재.
    assert.equal(c.querySelectorAll('svg.ink-layer').length, 2);
  });

  test("case 14: widget arrays non-empty → each renderer invoked once", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, withWidgets: true });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    // real module renderer 의 식별 attribute.
    assert.equal(c.querySelectorAll('[data-chart-mount-id]').length, 1);
    assert.equal(c.querySelectorAll('[data-table-mount-id]').length, 1);
    assert.equal(c.querySelectorAll('.pdf-star-mark').length, 1);
    // ink-stroke <polyline> 가 ink-layer 안에 1개.
    assert.equal(c.querySelectorAll('polyline.ink-stroke').length, 1);
  });
});

// ─── (j) AC9(e) security: 6 surface + TB1 + PD1 ──

describe("workspace-page — (j) AC9(e) permission denylist + user-content surface closure", () => {
  test("case 15: hostile subject.title (S1) + subject.id (S4) + selectedPage (S2) + materialCount (S3) + selectedTool (S6) — DOM = 0 script/img/event-attr; TB1 helper input bounded; PD1 negative UI (canManage=false)", () => {
    // S1 subject.title XSS
    // S4 subject.id XSS in attribute
    // S6 selectedTool XSS in class name (LocalPdfTool union 외 cast — runtime fallback)
    const hostileSubject = {
      id: '"><img src=x onerror=alert(1)>',
      title: "<script>alert('xss')</script>"
    };
    const ctx = buildContext({
      subjectId: hostileSubject.id,
      canManage: false,
      hasMaterial: true,
      hasObjectUrl: true,
      selectedTool: '<script>x</script>' // S6: union 외 값 의도적 주입.
    });
    const html = workspacePage.renderPdfWorkspacePage(ctx, hostileSubject as never);
    const c = parseContainer(html);
    // S1+S4+S6 — XSS sink 0.
    assert.equal(c.querySelectorAll("script").length, 0);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onfocus],[onload]").length, 0);
    // S2 selectedPage = number 3 → numeric stringify (escape applied via selectedPageLabel).
    assert.ok(html.includes("페이지 3"));
    // S3 materialCount = 1 (numeric).
    // S5 material.pageCount = 10 (numeric).
    assert.ok(html.includes("페이지 3 / 10"));
    // PD1 — canManage=false 의 negative UI.
    assert.equal(c.querySelectorAll('input[data-action="import-pdf-material"]').length, 0);
    assert.equal(c.querySelectorAll('label.file-drop').length, 0);
    assert.equal(c.querySelectorAll('.pdf-upload-hint').length, 0);
    assert.ok(html.includes("업로드는 관리자만 가능합니다"));
    // TB1 — eraser 시 style="${renderEraserCursorStyle(...)}" interpolated; non-eraser 시
    // style attr 미적용. helper 호출 site = workspace.eraserShape/eraserSize 만 전달.
    // 본 case 는 selectedTool != "eraser" 이므로 style attr 없음.
    const surface = c.querySelector('.pdf-annotation-surface');
    assert.ok(surface, "annotation surface element exists");
    assert.equal(surface?.hasAttribute("style"), false, "non-eraser tool: style attr not emitted (TB1 helper trust boundary respected)");
  });
});

// ─── (k) intakeFeedback truthy / falsy ──

describe("workspace-page — (k) intakeFeedback branches", () => {
  test("case 16: hasIntakeFeedback=true → intake-feedback element rendered", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, hasIntakeFeedback: true });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('.intake-feedback').length, 1);
  });

  test("case 17: hasIntakeFeedback=false → import-feedback default element rendered", () => {
    const ctx = buildContext({ canManage: true, hasMaterial: true, hasIntakeFeedback: false });
    const html = workspacePage.renderPdfWorkspacePage(ctx, buildSubject({}));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll('.intake-feedback').length, 0);
    assert.ok(c.querySelectorAll('.import-feedback').length >= 1);
  });
});

// ─── (l) characterization: determinism ──

describe("workspace-page — (l) characterization (refactor 무결성)", () => {
  test("case 18: identical context + subject → byte-identical HTML", () => {
    const ctx1 = buildContext({ canManage: true, hasMaterial: true, hasObjectUrl: true });
    const ctx2 = buildContext({ canManage: true, hasMaterial: true, hasObjectUrl: true });
    const s = buildSubject({});
    const h1 = workspacePage.renderPdfWorkspacePage(ctx1, s);
    const h2 = workspacePage.renderPdfWorkspacePage(ctx2, s);
    assert.equal(h1, h2, "deterministic render");
  });

  test("case 19: export shape — renderPdfWorkspacePage exported function, no Callbacks interface", () => {
    assert.equal(typeof workspacePage.renderPdfWorkspacePage, "function");
    // AC4: Callbacks 미정의 — module 내부에 Callbacks symbol 없음.
    assert.equal((workspacePage as unknown as Record<string, unknown>).WorkspacePageCallbacks, undefined);
  });
});
