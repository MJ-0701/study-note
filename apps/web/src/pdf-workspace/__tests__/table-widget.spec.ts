// sprint-2026-W22-sprint-5 / layer B/slice-2g-table — table-widget characterization spec.
// 7 invariant ↔ 14 case (plan §9.1). 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/pdf-workspace/__tests__/table-widget.spec.ts

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
          source: \`
            export function createTable(input) { return { id: "test-table-" + Math.random().toString(36).slice(2,7), subjectId: input.subjectId, page: input.page, position: input.position, content: "", collapsed: true, createdAt: "now", updatedAt: "now" }; }
            export function deleteTable(tables, tableId) { return tables.filter((t) => t.id !== tableId); }
            export function moveTable(table, position) { return Object.assign({}, table, { position: { x: position.x, y: position.y } }); }
            export function toggleTableCollapsed(table) { return Object.assign({}, table, { collapsed: !table.collapsed }); }
            export function updateTableContent(table, content) { return Object.assign({}, table, { content: content }); }
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

const widget = await import("../table-widget.ts");

interface FakeTable {
  id: string;
  subjectId: string;
  page: number;
  position: { x: number; y: number };
  content: string;
  collapsed?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FakeWorkspace {
  tables: FakeTable[];
  material?: { selectedPage: number };
}

function makeTable(id: string, content: string, collapsed = false): FakeTable {
  return {
    id,
    subjectId: "subject-1",
    page: 1,
    position: { x: 0.5, y: 0.5 },
    content,
    collapsed,
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z"
  };
}

function makeContext(workspace: FakeWorkspace) {
  return { getWorkspace: () => workspace as never };
}

function makeCallbacks(ref: { current: FakeWorkspace }) {
  return {
    updateWorkspace: (_subjectId: string, updater: (w: never) => never) => {
      ref.current = updater(ref.current as never) as FakeWorkspace;
    }
  };
}

// ─── invariant (a) render DOM tree XSS safe (innerHTML 0) ────────────────

describe("table-widget — invariant (a) render DOM tree XSS safe", () => {
  test("case 1: renderTable with `<script>` cell — DOM 안 script element 0", () => {
    const table = makeTable("t-1", "| <script>alert(1)</script> | b |\n|---|---|\n| x | y |") as never;
    const result = widget.renderTable("subject-1", table);

    const scripts = (result as unknown as { querySelectorAll: (sel: string) => unknown[] }).querySelectorAll("script");
    assert.equal(scripts.length, 0);
  });

  test("case 2: renderTable with `<img onerror>` cell — DOM 안 img element 0", () => {
    const table = makeTable("t-2", "| a | b |\n|---|---|\n| <img src=x onerror=alert(1)> | y |") as never;
    const result = widget.renderTable("subject-1", table);

    const imgs = (result as unknown as { querySelectorAll: (sel: string) => unknown[] }).querySelectorAll("img");
    assert.equal(imgs.length, 0);
  });

  test("case 3: renderTable user payload — input.value 안에만 raw text, script/img element 0", () => {
    const payload = "<script>x</script>";
    const table = makeTable("t-3", `| ${payload} | b |\n|---|---|\n| 1 | 2 |`) as never;
    const result = widget.renderTable("subject-1", table);

    // user content = input.value DOM property (text), NOT executable HTML.
    const scripts = (result as unknown as { querySelectorAll: (sel: string) => unknown[] }).querySelectorAll("script");
    const imgs = (result as unknown as { querySelectorAll: (sel: string) => unknown[] }).querySelectorAll("img");
    assert.equal(scripts.length, 0);
    assert.equal(imgs.length, 0);

    const inputs = (result as unknown as { querySelectorAll: (sel: string) => Array<{ value: string }> }).querySelectorAll(
      'input[data-cell-kind="header"]'
    );
    const found = inputs.some((inp) => inp.value === payload);
    assert.equal(found, true);
  });
});

// ─── invariant (b) renderTableMount escape ────────────────────────────────

describe("table-widget — invariant (b) renderTableMount escape", () => {
  test("case 4: hostile table.id attribute breakout 0", () => {
    const table = makeTable('"><img src=x onerror=alert(1)>', "") as never;
    const html = widget.renderTableMount("subject-1", table);

    assert.equal(html.includes("&quot;"), true);
    assert.equal(html.includes("&gt;"), true);
    assert.equal(html.includes('"><img'), false);
  });
});

// ─── invariant (c) tableId selector injection 방어 ────────────────────────

describe("table-widget — invariant (c) tableId selector injection 방어", () => {
  test("case 5: hostile tableId parametrized — readTableDataFromDom throw 0, null safe", () => {
    testDocument.body.innerHTML = "";
    const hostile = [
      'a"]b',     // quote
      "a]b",      // bracket
      '"]/* */(', // backslash + comment-like
      "a\rb",     // CR
      "a\nb"      // LF
    ];
    for (const id of hostile) {
      let threw = false;
      let result: unknown;
      try {
        result = widget.readTableDataFromDom(id);
      } catch {
        threw = true;
      }
      assert.equal(threw, false, `tableId=${JSON.stringify(id)} throw`);
      assert.equal(result, null);
    }
  });
});

// ─── invariant (d) debounce map module-private ────────────────────────────

describe("table-widget — invariant (d) debounce map module-private", () => {
  test("case 6: removeTable cancels pending cell debounce", () => {
    const ws: FakeWorkspace = { tables: [makeTable("t-clear", "")] };
    const ref = { current: ws };
    const cb = makeCallbacks(ref);

    let cleared = false;
    const realSet = globalThis.setTimeout;
    const realClear = globalThis.clearTimeout;
    let handle: unknown = null;
    globalThis.setTimeout = (() => {
      handle = "fake";
      return handle as never;
    }) as typeof setTimeout;
    globalThis.clearTimeout = ((h: unknown) => {
      if (h === handle) cleared = true;
    }) as typeof clearTimeout;

    try {
      widget.scheduleTableCellUpdate(cb as never, "subject-1", "t-clear", "| a |\n|---|");
      widget.removeTable(cb as never, "subject-1", "t-clear");
      assert.equal(cleared, true);
    } finally {
      globalThis.setTimeout = realSet;
      globalThis.clearTimeout = realClear;
    }
  });

  test("case 7: clearTableCellDebounce export — external mediation", () => {
    assert.equal(typeof widget.clearTableCellDebounce, "function");
    widget.clearTableCellDebounce("nonexistent");
  });
});

// ─── invariant (e) refreshTableWidgets idempotent ────────────────────────

describe("table-widget — invariant (e) refreshTableWidgets idempotent", () => {
  test("case 8: refreshTableWidgets 2회 호출 동일 결과", () => {
    const ws: FakeWorkspace = { tables: [makeTable("t-a", "| a | b |\n|---|---|\n| 1 | 2 |")] };
    const ctx = makeContext(ws);

    testDocument.body.innerHTML = '<div data-table-mount-id="t-a" data-subject-id="subject-1"></div>';
    widget.refreshTableWidgets(ctx as never);
    const after1 = testDocument.body.innerHTML;
    widget.refreshTableWidgets(ctx as never);
    const after2 = testDocument.body.innerHTML;

    assert.equal(after1, after2);
  });

  test("case 9: refreshTableWidgets orphan mount remove", () => {
    const ws: FakeWorkspace = { tables: [] };
    const ctx = makeContext(ws);

    testDocument.body.innerHTML = '<div data-table-mount-id="orphan" data-subject-id="subject-1"></div>';
    widget.refreshTableWidgets(ctx as never);

    assert.equal(testDocument.body.querySelectorAll("[data-table-mount-id]").length, 0);
  });
});

// ─── invariant (f) handler workspace store mutate only ────────────────────

describe("table-widget — invariant (f) handler workspace store mutate only", () => {
  test("case 10: applyTableMove → workspace.tables position 갱신", () => {
    const ws: FakeWorkspace = { tables: [makeTable("t-m", "")] };
    const ref = { current: ws };
    const cb = makeCallbacks(ref);

    widget.applyTableMove(cb as never, "subject-1", "t-m", { x: 0.7, y: 0.3 });

    const table = ref.current.tables[0]!;
    assert.equal(table.position.x, 0.7);
    assert.equal(table.position.y, 0.3);
  });

  test("case 11: applyTableCollapseToggle → collapsed flip", () => {
    const ws: FakeWorkspace = { tables: [makeTable("t-c", "", false)] };
    const ref = { current: ws };
    const cb = makeCallbacks(ref);

    widget.applyTableCollapseToggle(cb as never, "subject-1", "t-c");
    assert.equal(ref.current.tables[0]!.collapsed, true);
  });

  test("case 12: removeTable → workspace.tables length-1", () => {
    const ws: FakeWorkspace = {
      tables: [makeTable("t-x", ""), makeTable("t-y", "")]
    };
    const ref = { current: ws };
    const cb = makeCallbacks(ref);

    widget.removeTable(cb as never, "subject-1", "t-x");
    assert.equal(ref.current.tables.length, 1);
    assert.equal(ref.current.tables[0]!.id, "t-y");
  });

  test("case 13: addTable → workspace.tables length+1", () => {
    const ws: FakeWorkspace = { tables: [] };
    const ref = { current: ws };
    const ctx = makeContext(ws);
    const cb = makeCallbacks(ref);

    widget.addTable(ctx as never, cb as never, "subject-1", { x: 0.1, y: 0.2 });
    assert.equal(ref.current.tables.length, 1);
    assert.equal(ref.current.tables[0]!.position.x, 0.1);
  });
});

// ─── invariant (f') leaf 무측효과 (export shape) ──────────────────────────

describe("table-widget — invariant (f') leaf 무측효과 (export shape)", () => {
  test("case 14: module exports shape — all function type", () => {
    assert.equal(typeof widget.addTable, "function");
    assert.equal(typeof widget.removeTable, "function");
    assert.equal(typeof widget.applyTableMove, "function");
    assert.equal(typeof widget.applyTableCollapseToggle, "function");
    assert.equal(typeof widget.scheduleTableCellUpdate, "function");
    assert.equal(typeof widget.readTableDataFromDom, "function");
    assert.equal(typeof widget.applyAddTableRow, "function");
    assert.equal(typeof widget.applyAddTableColumn, "function");
    assert.equal(typeof widget.applyDeleteTableRow, "function");
    assert.equal(typeof widget.applyDeleteTableColumn, "function");
    assert.equal(typeof widget.refreshTableWidgets, "function");
    assert.equal(typeof widget.renderTableMount, "function");
    assert.equal(typeof widget.renderTable, "function");
    assert.equal(typeof widget.clearTableCellDebounce, "function");
  });
});
