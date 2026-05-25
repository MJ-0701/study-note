// sprint-2026-W22-sprint-6 / layer B/slice-2f/iii — simple-widget characterization spec.
// 5 invariant ↔ 10 case (plan §9.1).

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
          source: \`\`
        };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");

const widget = await import("../simple-widget.ts");

function parseContainer(html: string): { querySelectorAll: (sel: string) => unknown[] } {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as { querySelectorAll: (sel: string) => unknown[] };
}

// ─── invariant (a) user content escapeHtml ──────────────────────────────

describe("simple-widget — invariant (a) user content escapeHtml", () => {
  test("case 1: renderStickyNote with `<script>` block.content — DOM script element 0", () => {
    const note = {
      id: "n1",
      anchor: { x: 0.1, y: 0.1 },
      blocks: [{ id: "b1", kind: "text" as const, content: "<script>alert(1)</script>" }]
    };
    const html = widget.renderStickyNote("subject-1", note as never);
    const container = parseContainer(html);
    assert.equal(container.querySelectorAll("script").length, 0);
  });

  test("case 2: renderTextBox with `<img onerror>` tb.content — DOM img element 0", () => {
    const tb = { id: "tb1", position: { x: 0.1, y: 0.1 }, content: "<img src=x onerror=alert(1)>" };
    const html = widget.renderTextBox("subject-1", tb as never);
    const container = parseContainer(html);
    assert.equal(container.querySelectorAll("img").length, 0);
    assert.equal(container.querySelectorAll("script").length, 0);
  });

  test("case 3: renderChecklist with `<script>` item.label — DOM script element 0", () => {
    const cl = {
      id: "cl1",
      position: { x: 0.1, y: 0.1 },
      collapsed: false,
      items: [{ id: "i1", label: "<script>alert(1)</script>", checked: false }]
    };
    const html = widget.renderChecklist("subject-1", cl as never);
    const container = parseContainer(html);
    assert.equal(container.querySelectorAll("script").length, 0);
    assert.equal(container.querySelectorAll("img").length, 0);
  });

  test("case 4: renderChecklist collapsed countLabel escape (countLabel has `()` but no XSS)", () => {
    const cl = {
      id: "cl-c",
      position: { x: 0.1, y: 0.1 },
      collapsed: true,
      items: [{ id: "i1", label: "x", checked: true }, { id: "i2", label: "y", checked: false }]
    };
    const html = widget.renderChecklist("subject-1", cl as never);
    const container = parseContainer(html);
    assert.equal(container.querySelectorAll("script").length, 0);
    const title = (container.querySelectorAll(".pdf-checklist-title") as Array<{ textContent: string }>)[0];
    assert.ok(title?.textContent.includes("(1/2)"));
  });
});

// ─── invariant (b) id + subjectId attribute escapeHtml (slice-2f/iii 신규) ──

describe("simple-widget — invariant (b) id + subjectId attribute escape (5 surface × 2 payload)", () => {
  const breakoutPayload = '"><img src=x onerror=alert(1)>';
  const eventPayload = '" autofocus onfocus=alert(1) data-x="';

  test("case 5a: note.id hostile → DOM no img/script + no onerror/onfocus attr", () => {
    for (const payload of [breakoutPayload, eventPayload]) {
      const note = { id: payload, anchor: { x: 0, y: 0 }, blocks: [{ id: "b", kind: "text" as const, content: "ok" }] };
      const container = parseContainer(widget.renderStickyNote("subject-1", note as never));
      assert.equal(container.querySelectorAll("img").length, 0);
      assert.equal(container.querySelectorAll("script").length, 0);
      assert.equal(container.querySelectorAll("[onerror]").length, 0);
      assert.equal(container.querySelectorAll("[onfocus]").length, 0);
    }
  });

  test("case 5b: tb.id hostile → DOM no img/script/event-attr", () => {
    for (const payload of [breakoutPayload, eventPayload]) {
      const tb = { id: payload, position: { x: 0, y: 0 }, content: "ok" };
      const container = parseContainer(widget.renderTextBox("subject-1", tb as never));
      assert.equal(container.querySelectorAll("img,script").length, 0);
      assert.equal(container.querySelectorAll("[onerror],[onfocus]").length, 0);
    }
  });

  test("case 5c: cl.id hostile → DOM no img/script/event-attr", () => {
    for (const payload of [breakoutPayload, eventPayload]) {
      const cl = { id: payload, position: { x: 0, y: 0 }, collapsed: false, items: [] };
      const container = parseContainer(widget.renderChecklist("subject-1", cl as never));
      assert.equal(container.querySelectorAll("img,script").length, 0);
      assert.equal(container.querySelectorAll("[onerror],[onfocus]").length, 0);
    }
  });

  test("case 5d: item.id hostile → DOM no img/script/event-attr", () => {
    for (const payload of [breakoutPayload, eventPayload]) {
      const cl = {
        id: "cl-x",
        position: { x: 0, y: 0 },
        collapsed: false,
        items: [{ id: payload, label: "ok", checked: false }]
      };
      const container = parseContainer(widget.renderChecklist("subject-1", cl as never));
      assert.equal(container.querySelectorAll("img,script").length, 0);
      assert.equal(container.querySelectorAll("[onerror],[onfocus]").length, 0);
    }
  });

  test("case 5e: subjectId hostile → DOM no img/script/event-attr (sticky/textbox/checklist)", () => {
    for (const payload of [breakoutPayload, eventPayload]) {
      const note = { id: "n", anchor: { x: 0, y: 0 }, blocks: [{ id: "b", kind: "text" as const, content: "ok" }] };
      const tb = { id: "t", position: { x: 0, y: 0 }, content: "ok" };
      const cl = { id: "c", position: { x: 0, y: 0 }, collapsed: false, items: [] };

      const a = parseContainer(widget.renderStickyNote(payload, note as never));
      assert.equal(a.querySelectorAll("img,script").length, 0);
      assert.equal(a.querySelectorAll("[onerror],[onfocus]").length, 0);

      const b = parseContainer(widget.renderTextBox(payload, tb as never));
      assert.equal(b.querySelectorAll("img,script").length, 0);
      assert.equal(b.querySelectorAll("[onerror],[onfocus]").length, 0);

      const c = parseContainer(widget.renderChecklist(payload, cl as never));
      assert.equal(c.querySelectorAll("img,script").length, 0);
      assert.equal(c.querySelectorAll("[onerror],[onfocus]").length, 0);
    }
  });
});

// ─── invariant (c) EraserShape bounded ──────────────────────────────────

describe("simple-widget — invariant (c) EraserShape bounded", () => {
  test("case 6: 4 shape render — circle/square/triangle/line", () => {
    for (const shape of ["circle", "square", "triangle", "line"] as const) {
      const html = widget.renderEraserSubToolbar("subj", shape, 24, "");
      assert.ok(html.includes(`data-eraser-shape="${shape}"`));
    }
  });

  test("case 7: renderEraserCursorStyle 4 shape — distinct SVG produced", () => {
    const seen = new Set<string>();
    for (const shape of ["circle", "square", "triangle", "line"] as const) {
      const s = widget.renderEraserCursorStyle(shape, 32);
      assert.ok(s.startsWith("cursor: url('data:image/svg+xml,"));
      seen.add(s);
    }
    assert.equal(seen.size, 4);
  });
});

// ─── invariant (d) leaf pure (determinism) ──────────────────────────────

describe("simple-widget — invariant (d) leaf pure", () => {
  test("case 8: same input → same output", () => {
    const note = { id: "n", anchor: { x: 0, y: 0 }, blocks: [{ id: "b", kind: "text" as const, content: "x" }] };
    const a = widget.renderStickyNote("s", note as never);
    const b = widget.renderStickyNote("s", note as never);
    assert.equal(a, b);
  });
});

// ─── invariant (e) module export shape ──────────────────────────────────

describe("simple-widget — invariant (e) module export shape", () => {
  test("case 9: 8 export type/function", () => {
    assert.equal(typeof widget.renderStickyNote, "function");
    assert.equal(typeof widget.renderTextBox, "function");
    assert.equal(typeof widget.renderChecklist, "function");
    assert.equal(typeof widget.renderEraserSubToolbar, "function");
    assert.equal(typeof widget.renderEraserShapeButton, "function");
    assert.equal(typeof widget.renderEraserCursorStyle, "function");
    assert.equal(typeof widget.renderEraserCursorSvg, "function");
    assert.equal(typeof widget.formatStickyBlockKind, "function");
  });

  test("case 10: formatStickyBlockKind 4 kind map", () => {
    assert.equal(widget.formatStickyBlockKind("text" as never), "텍스트");
    assert.equal(widget.formatStickyBlockKind("checklist" as never), "체크");
    assert.equal(widget.formatStickyBlockKind("table" as never), "표");
    assert.equal(widget.formatStickyBlockKind("chart-note" as never), "그래프");
  });
});
