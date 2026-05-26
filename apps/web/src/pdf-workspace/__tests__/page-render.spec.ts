// sprint-2026-W22-sprint-7 / layer B/slice-2f/iv — page-render characterization spec.
// 5 invariant ↔ 13 case (plan §9.1).

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

const pageRender = await import("../page-render.ts");

function parseContainer(html: string): { querySelectorAll: (sel: string) => unknown[] } {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as { querySelectorAll: (sel: string) => unknown[] };
}

const ctx: import("../page-render.ts").PdfToolbarContext = {
  isPdfWorkspaceFullscreen: () => false,
  pdfToolHotkeyLabels: { read: "R", pen: "P", eraser: "E" },
  renderEraserSubToolbar: (subjectId, shape, size, disabled) =>
    `<div class="pdf-eraser-subtoolbar" data-subject-id="${subjectId}" data-shape="${shape}" data-size="${size}" ${disabled}></div>`
};

// ─── (a) user content escape ──────────────────────────────────────────────

describe("page-render — invariant (a) user content escape", () => {
  test("case 1: renderPdfFrameStack with `<script>` subject.title — no script element", () => {
    const subject = { title: "<script>alert(1)</script>", id: "s1" } as never;
    const material = { backendMaterialId: "m1", pageCount: 1, fileName: "x", fileSize: 1, selectedPage: 1, uploadStatus: "uploaded" } as never;
    const html = pageRender.renderPdfFrameStack(subject, material, "blob:safe", 1);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script").length, 0);
    assert.equal(c.querySelectorAll("img").length, 0);
  });

  test("case 2: renderPdfMaterialStatus with `<script>` material.fileName — escaped", () => {
    const material = { backendMaterialId: "m1", fileName: "<script>x</script>", fileSize: 100, pageCount: 1, uploadStatus: "uploaded" } as never;
    const html = pageRender.renderPdfMaterialStatus(material, true, false);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 3: renderPdfToolbar with `<script>` subjectId — escaped", () => {
    const html = pageRender.renderPdfToolbar(ctx, '"><script>alert(1)</script>', "read", 5, 1, true, "circle", 24);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (b) id/attribute escape ──────────────────────────────────────────────

describe("page-render — invariant (b) id/attribute escape", () => {
  test("case 4: hostile material.id — DOM no img/script/event-attr", () => {
    const subject = { title: "ok", id: "s" } as never;
    const material = { backendMaterialId: '"><img onerror=alert(1)>', pageCount: 1, fileName: "x", fileSize: 1, selectedPage: 1, uploadStatus: "uploaded" } as never;
    const html = pageRender.renderPdfFrameStack(subject, material, "blob:safe", 1);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("img,script").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onfocus]").length, 0);
  });

  test("case 5: hostile objectUrl — attribute breakout 0", () => {
    const subject = { title: "ok", id: "s" } as never;
    const material = { backendMaterialId: "m1", pageCount: 1, fileName: "x", fileSize: 1, selectedPage: 1, uploadStatus: "uploaded" } as never;
    const html = pageRender.renderPdfFrameStack(subject, material, '"><img src=x onerror=alert(1)>', 1);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("img,script").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (c) trusted-input bounded ────────────────────────────────────────────

describe("page-render — invariant (c) trusted-input bounded", () => {
  test("case 6: LocalPdfTool 4종 render dispatch — read/sticky/pen/eraser", () => {
    for (const tool of ["read", "sticky", "pen", "eraser"] as const) {
      const html = pageRender.renderToolButton(ctx, "subj", tool, "read", "label");
      assert.ok(html.includes(`data-tool="${tool}"`));
    }
  });

  test("case 7: same input → same output (determinism)", () => {
    const a = pageRender.renderToolButton(ctx, "subj", "read", "read", "읽기");
    const b = pageRender.renderToolButton(ctx, "subj", "read", "read", "읽기");
    assert.equal(a, b);
  });
});

// ─── (d) module export shape ──────────────────────────────────────────────

describe("page-render — invariant (d) module export shape", () => {
  test("case 8: 9 export type/function", () => {
    assert.equal(typeof pageRender.renderPdfFrameStack, "function");
    assert.equal(typeof pageRender.renderPdfMaterialStatus, "function");
    assert.equal(typeof pageRender.renderPdfToolbar, "function");
    assert.equal(typeof pageRender.renderFullscreenToggleButton, "function");
    assert.equal(typeof pageRender.renderToolButton, "function");
    assert.equal(typeof pageRender.getPdfPreviewPlaceholderTitle, "function");
    assert.equal(typeof pageRender.getPdfPreviewPlaceholderDetail, "function");
  });
});

// ─── (e) renderToolButton hotkey + fullscreen + status ────────────────────

describe("page-render — invariant (e) variant branches", () => {
  test("case 9: renderToolButton with hotkey — kbd badge present", () => {
    const withHotkey = pageRender.renderToolButton(ctx, "s", "read", "read", "읽기");
    const withoutHotkey = pageRender.renderToolButton(ctx, "s", "table" as never, "read", "표");
    assert.ok(withHotkey.includes("<kbd"));
    assert.ok(!withoutHotkey.includes("<kbd"));
  });

  test("case 10: renderFullscreenToggleButton — svg/button output", () => {
    const html = pageRender.renderFullscreenToggleButton(ctx);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("button").length, 1);
    assert.equal(c.querySelectorAll("kbd").length, 1);
  });

  test("case 11: renderPdfMaterialStatus uploading state", () => {
    const material = { backendMaterialId: "m1", fileName: "x", fileSize: 1, pageCount: 1, uploadStatus: "pending" } as never;
    const html = pageRender.renderPdfMaterialStatus(material, false, false);
    assert.ok(html.includes("backend 업로드 대기"));
  });

  test("case 12: renderPdfMaterialStatus success + preview ready state", () => {
    const material = { backendMaterialId: "m1", fileName: "x", fileSize: 1, pageCount: 1, uploadStatus: "uploaded" } as never;
    const html = pageRender.renderPdfMaterialStatus(material, true, false);
    assert.ok(html.includes("미리보기 연결됨"));
  });
});

// ─── (f) permission boundary ──────────────────────────────────────────────

describe("page-render — invariant (f) trusted attribute output (toolbar tool-button)", () => {
  test("case 13: renderPdfToolbar disabled state — no upload data-action emitted in toolbar (hasMaterial=false applies disabled to inputs not denylist denial — render unconditional)", () => {
    // renderPdfToolbar 은 canManagePdfMaterials 자체 검사 X (외부 caller 가
    // 결정). 본 spec 은 disabled prop 가 input 에 적용 (hasMaterial=false) 검증.
    const html = pageRender.renderPdfToolbar(ctx, "s1", "read", 1, 1, false, "circle", 24);
    const c = parseContainer(html);
    const inputs = (c.querySelectorAll('input[type="number"]') as Array<{ hasAttribute: (n: string) => boolean }>);
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0]!.hasAttribute("disabled"), true);
  });
});
