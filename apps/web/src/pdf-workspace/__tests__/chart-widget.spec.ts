// sprint-2026-W22-sprint-3 / layer B/slice-2g — chart-widget characterization spec.
// 7 invariant ↔ 16 case (plan §9.1). 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/pdf-workspace/__tests__/chart-widget.spec.ts

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
            export function createChart(input) {
              return { id: "test-chart-" + Math.random().toString(36).slice(2,7), subjectId: input.subjectId, page: input.page, position: input.position, content: "", collapsed: true, createdAt: "now", updatedAt: "now" };
            }
            export function deleteChart(charts, chartId) { return charts.filter((c) => c.id !== chartId); }
            export function moveChart(chart, position) { return Object.assign({}, chart, { position: { x: position.x, y: position.y } }); }
            export function toggleChartCollapsed(chart) { return Object.assign({}, chart, { collapsed: !chart.collapsed }); }
            export function updateChartContent(chart, content) { return Object.assign({}, chart, { content: content }); }
          \`
        };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

// linkedom DOM 환경 — chart-widget 의 document/createElement 사용.
import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");
(globalThis as Record<string, unknown>).document = testDocument;

const widget = await import("../chart-widget.ts");
type ChartWidget = typeof widget;

interface FakeChart {
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
  charts: FakeChart[];
  material?: { selectedPage: number };
}

function makeChart(id: string, content: string, collapsed = false): FakeChart {
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

function makeContext(workspace: FakeWorkspace): ChartWidget["refreshChartWidgets"] extends (ctx: infer C) => unknown ? C : never {
  return { getWorkspace: () => workspace as never } as never;
}

function makeCallbacks(ref: { current: FakeWorkspace }) {
  return {
    updateWorkspace: (_subjectId: string, updater: (w: never) => never) => {
      ref.current = updater(ref.current as never) as FakeWorkspace;
    }
  };
}

// ─── invariant (a) render DOM tree XSS safe (innerHTML 0) ────────────────

describe("chart-widget — invariant (a) render DOM tree XSS safe", () => {
  test("case 1: renderChart with `<script>` payload — DOM 안 script element 0", () => {
    const chart = makeChart("chart-1", "type:bar\n<script>alert(1)</script>,42") as never;
    const result = widget.renderChart("subject-1", chart);

    const scripts = (result as unknown as { querySelectorAll: (sel: string) => unknown[] }).querySelectorAll("script");
    assert.equal(scripts.length, 0);
  });

  test("case 2: renderChart with `<img onerror>` payload — DOM 안 img element 0", () => {
    const chart = makeChart("chart-2", "type:bar\n<img src=x onerror=alert(1)>,10") as never;
    const result = widget.renderChart("subject-1", chart);

    const imgs = (result as unknown as { querySelectorAll: (sel: string) => unknown[] }).querySelectorAll("img");
    assert.equal(imgs.length, 0);
  });

  test("case 3: renderChartMount HTML 안 chart.id / subjectId escape", () => {
    const chart = makeChart('"><svg onload=alert(1)>', "") as never;
    const html = widget.renderChartMount("subject-1", chart);

    assert.equal(html.includes("&quot;"), true);
    assert.equal(html.includes("&gt;"), true);
    assert.equal(html.includes('"><svg onload='), false);
  });
});

// ─── invariant (b) debounce map module-private ────────────────────────────

describe("chart-widget — invariant (b) debounce map module-private", () => {
  test("case 4: removeChart 호출 시 pending point debounce cancel", () => {
    const workspace: FakeWorkspace = { charts: [makeChart("chart-clear", "")] };
    const ref = { current: workspace };
    const cb = makeCallbacks(ref);

    let cleared = false;
    const realClear = globalThis.clearTimeout;
    const realSet = globalThis.setTimeout;
    let setHandle: unknown = null;
    globalThis.setTimeout = ((_fn: () => void, _ms?: number) => {
      setHandle = "fake-handle";
      return setHandle as never;
    }) as typeof setTimeout;
    globalThis.clearTimeout = ((handle: unknown) => {
      if (handle === setHandle) cleared = true;
    }) as typeof clearTimeout;

    try {
      widget.scheduleChartPointUpdate(cb as never, "subject-1", "chart-clear", "type:bar\nx,1");
      widget.removeChart(cb as never, "subject-1", "chart-clear");
      assert.equal(cleared, true);
    } finally {
      globalThis.setTimeout = realSet;
      globalThis.clearTimeout = realClear;
    }
  });

  test("case 5: clearChartPointDebounce export — external mediation", () => {
    assert.equal(typeof widget.clearChartPointDebounce, "function");
    widget.clearChartPointDebounce("nonexistent-id");
  });
});

// ─── invariant (c) refreshChartWidgets idempotent ────────────────────────

describe("chart-widget — invariant (c) refreshChartWidgets idempotent", () => {
  test("case 6: refreshChartWidgets 2회 호출 = 1회 동일 결과", () => {
    const workspace: FakeWorkspace = { charts: [makeChart("chart-a", "type:bar\nx,1")] };
    const ctx = makeContext(workspace);

    testDocument.body.innerHTML = '<div data-chart-mount-id="chart-a" data-subject-id="subject-1"></div>';
    widget.refreshChartWidgets(ctx);
    const after1 = testDocument.body.innerHTML;
    widget.refreshChartWidgets(ctx);
    const after2 = testDocument.body.innerHTML;

    assert.equal(after1, after2);
  });

  test("case 7: refreshChartWidgets — missing chart mount remove", () => {
    const workspace: FakeWorkspace = { charts: [] };
    const ctx = makeContext(workspace);

    testDocument.body.innerHTML = '<div data-chart-mount-id="orphan" data-subject-id="subject-1"></div>';
    widget.refreshChartWidgets(ctx);

    assert.equal(testDocument.body.querySelectorAll("[data-chart-mount-id]").length, 0);
  });
});

// ─── invariant (d) handler workspace store mutate only ────────────────────

describe("chart-widget — invariant (d) handler workspace store mutate only", () => {
  test("case 8: applyChartMove → workspace.charts position 갱신", () => {
    const workspace: FakeWorkspace = { charts: [makeChart("chart-m", "type:bar")] };
    const ref = { current: workspace };
    const cb = makeCallbacks(ref);

    widget.applyChartMove(cb as never, "subject-1", "chart-m", { x: 0.8, y: 0.2 });

    const chart = ref.current.charts[0]!;
    assert.equal(chart.position.x, 0.8);
    assert.equal(chart.position.y, 0.2);
  });

  test("case 9: applyChartCollapseToggle → collapsed flip", () => {
    const workspace: FakeWorkspace = { charts: [makeChart("chart-c", "type:bar", false)] };
    const ref = { current: workspace };
    const cb = makeCallbacks(ref);

    widget.applyChartCollapseToggle(cb as never, "subject-1", "chart-c");
    assert.equal(ref.current.charts[0]!.collapsed, true);
  });

  test("case 10: removeChart → workspace.charts length-1", () => {
    const workspace: FakeWorkspace = {
      charts: [makeChart("chart-x", ""), makeChart("chart-y", "")]
    };
    const ref = { current: workspace };
    const cb = makeCallbacks(ref);

    widget.removeChart(cb as never, "subject-1", "chart-x");
    assert.equal(ref.current.charts.length, 1);
    assert.equal(ref.current.charts[0]!.id, "chart-y");
  });
});

// ─── invariant (e) LocalChartType/Function bounded ────────────────────────

describe("chart-widget — invariant (e) LocalChartType/Function bounded", () => {
  test("case 11: renderChart bar — output 안 xy/trig/bar option 모두", () => {
    const chart = makeChart("chart-bar", "type:bar\na,1\nb,2") as never;
    const result = widget.renderChart("subject-1", chart);
    const html = (result as unknown as { outerHTML: string }).outerHTML;

    assert.equal(html.includes('value="bar"'), true);
    assert.equal(html.includes('value="xy"'), true);
    assert.equal(html.includes('value="trig"'), true);
  });

  test("case 12: getNextChartXValue empty → 0, numeric increment", () => {
    assert.equal(widget.getNextChartXValue([]), 0);
    assert.equal(widget.getNextChartXValue([{ label: "5", value: 0 }]), 6);
  });
});

// ─── invariant (f) leaf 무측효과 (export shape + determinism) ─────────────

describe("chart-widget — invariant (f) leaf 무측효과", () => {
  test("case 13: module exports shape", () => {
    assert.equal(typeof widget.renderChart, "function");
    assert.equal(typeof widget.renderChartMount, "function");
    assert.equal(typeof widget.refreshChartWidgets, "function");
    assert.equal(typeof widget.refreshChartPreview, "function");
    assert.equal(typeof widget.removeChart, "function");
    assert.equal(typeof widget.scheduleChartPointUpdate, "function");
    assert.equal(typeof widget.applyAddChartPoint, "function");
    assert.equal(typeof widget.applyDeleteChartPoint, "function");
    assert.equal(typeof widget.applyClearChartPoints, "function");
    assert.equal(typeof widget.applyFillChartFunction, "function");
    assert.equal(typeof widget.readChartDataFromDom, "function");
    assert.equal(typeof widget.clearChartPointDebounce, "function");
    assert.equal(typeof widget.buildFunctionChartPoints, "function");
    assert.equal(typeof widget.buildPolylineChartSvg, "function");
    assert.equal(typeof widget.buildTrigChartSvg, "function");
    assert.equal(typeof widget.appendChartCoordinatePlane, "function");
    assert.equal(widget.CHART_PLOT_LEFT, 6);
    assert.equal(widget.CHART_PLOT_RIGHT, 94);
  });

  test("case 14: buildFunctionChartPoints determinism", () => {
    const a = widget.buildFunctionChartPoints("sin", -1, 1, 5);
    const b = widget.buildFunctionChartPoints("sin", -1, 1, 5);
    assert.deepEqual(a, b);
  });
});

// ─── invariant (g) chartId selector injection 방어 ────────────────────────

describe("chart-widget — invariant (g) chartId selector injection 방어", () => {
  test("case 15: hostile chartId — readChartDataFromDom throw 0, null return", () => {
    testDocument.body.innerHTML = "";
    const hostile = ['a"]', "a\\b", "a'b", '<img onerror="x">', '"]/* */('];
    for (const id of hostile) {
      let threw = false;
      let result: unknown;
      try {
        result = widget.readChartDataFromDom(id);
      } catch {
        threw = true;
      }
      assert.equal(threw, false, `chartId=${JSON.stringify(id)} 에서 throw 발생`);
      assert.equal(result, null);
    }
  });

  test("case 16: hostile chart.id renderChartMount — attribute breakout 0", () => {
    const chart = makeChart('"><img src=x onerror=alert(1)>', "") as never;
    const html = widget.renderChartMount("subject-1", chart);

    assert.equal(html.includes('"><img src=x onerror'), false);
    assert.equal(html.includes("&quot;"), true);
    assert.equal(html.includes("&gt;"), true);
  });
});
