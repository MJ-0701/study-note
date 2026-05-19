// sprint-12/slice-1 단위 테스트 — PdfWorkspaceTool union + TextBox/Checklist reducers + hydration fail-closed.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test packages/domain/__tests__/pdf-workspace.spec.ts
//
// 또는 root package.json 의 test:domain-pdf-workspace 스크립트.
//
// 위치 결정: packages/domain/__tests__/ (src/ 밖)
//   web tsconfig 가 packages/domain/src/**/*.ts glob 로 domain src 를 sweep 하므로
//   src/__tests__/ 에 두면 tsc 가 spec 파일도 type-check 해 web build 가 실패함.
//   src/ 밖으로 이동해 web tsconfig sweep 에서 제외 (AC9-a whitelist 준수).
//   node --experimental-strip-types 런타임 실행에는 경로 영향 없음.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  // Union
  type PdfWorkspaceTool,
  isPdfWorkspaceTool,
  // TextBox
  createTextBox,
  updateTextBoxContent,
  moveTextBox,
  deleteTextBox,
  // Checklist
  createChecklist,
  addChecklistItem,
  toggleChecklistItem,
  toggleChecklistCollapsed,
  updateChecklistItemLabel,
  deleteChecklistItem,
  moveChecklist,
  deleteChecklist,
  // Table
  createTable,
  updateTableContent,
  moveTable,
  deleteTable,
  toggleTableCollapsed,
  // Chart
  createChart,
  updateChartContent,
  moveChart,
  deleteChart,
  toggleChartCollapsed,
  // Eraser
  setEraserShape,
  setEraserSize,
  // Hydration
  hydrateSubjectPdfWorkspace,
  createEmptyPdfWorkspace,
  // Types (used in buildStateWithChecklists/buildStateWithTextBoxes overloads)
  type SubjectPdfWorkspace,
} from "../src/pdf-workspace.ts";

// ---------------------------------------------------------------------------
// R1 — PdfWorkspaceTool union 확장
// ---------------------------------------------------------------------------
describe("R1: PdfWorkspaceTool union 확장", () => {
  it("모든 신규 값이 union 에 포함됨 (type-level — 런타임 할당으로 검증)", () => {
    const values: PdfWorkspaceTool[] = [
      "read",
      "sticky",
      "pen",
      "eraser",
      "text",
      "checklist",
      "table",
      "chart",
    ];
    assert.equal(values.length, 8);
  });

  it("isPdfWorkspaceTool: table/chart 신규 tool 을 허용함", () => {
    assert.equal(isPdfWorkspaceTool("table"), true);
    assert.equal(isPdfWorkspaceTool("chart"), true);
  });
});

// ---------------------------------------------------------------------------
// R3 — PdfTextBox reducers
// ---------------------------------------------------------------------------
describe("R3: PdfTextBox reducers", () => {
  it("createTextBox: 기본 값 확인", () => {
    const tb = createTextBox({
      subjectId: "sub-1",
      page: 3,
      position: { x: 0.2, y: 0.4 },
    });

    assert.ok(tb.id.startsWith("textbox-"), `id prefix: ${tb.id}`);
    assert.equal(tb.subjectId, "sub-1");
    assert.equal(tb.page, 3);
    assert.equal(tb.position.x, 0.2);
    assert.equal(tb.position.y, 0.4);
    assert.equal(tb.size.width, 0.2);
    assert.equal(tb.size.height, 0.1);
    assert.equal(tb.content, "");
    assert.ok(typeof tb.createdAt === "string");
    assert.ok(typeof tb.updatedAt === "string");
  });

  it("createTextBox: position 범위 외 → clamp (0..1)", () => {
    const tb = createTextBox({
      subjectId: "sub-1",
      page: 1,
      position: { x: -0.5, y: 1.8 },
    });
    assert.equal(tb.position.x, 0);
    assert.equal(tb.position.y, 1);
  });

  it("updateTextBoxContent: 정상 content 갱신", () => {
    const tb = createTextBox({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const updated = updateTextBoxContent(tb, "hello");
    assert.equal(updated.content, "hello");
  });

  it("updateTextBoxContent: 5000자 초과 → 5000자로 truncate", () => {
    const tb = createTextBox({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const longStr = "a".repeat(6000);
    const updated = updateTextBoxContent(tb, longStr);
    assert.equal(updated.content.length, 5000);
  });

  it("updateTextBoxContent: 정확히 5000자 → 그대로 보존", () => {
    const tb = createTextBox({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const exact = "b".repeat(5000);
    const updated = updateTextBoxContent(tb, exact);
    assert.equal(updated.content.length, 5000);
  });

  it("moveTextBox: 정상 범위 이동", () => {
    const tb = createTextBox({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const moved = moveTextBox(tb, { x: 0.5, y: 0.7 });
    assert.equal(moved.position.x, 0.5);
    assert.equal(moved.position.y, 0.7);
  });

  it("moveTextBox: 범위 외 좌표 → clamp", () => {
    const tb = createTextBox({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const moved = moveTextBox(tb, { x: -1, y: 2 });
    assert.equal(moved.position.x, 0);
    assert.equal(moved.position.y, 1);
  });

  it("deleteTextBox: 해당 id 제거, 나머지 보존", () => {
    const tb1 = createTextBox({ subjectId: "s", page: 1, position: { x: 0.1, y: 0.1 } });
    const tb2 = createTextBox({ subjectId: "s", page: 1, position: { x: 0.2, y: 0.2 } });
    const result = deleteTextBox([tb1, tb2], tb1.id);
    assert.equal(result.length, 1);
    const first = result[0];
    assert.ok(first !== undefined);
    assert.equal(first.id, tb2.id);
  });

  it("deleteTextBox: 없는 id → 변경 없음", () => {
    const tb = createTextBox({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const result = deleteTextBox([tb], "nonexistent");
    assert.equal(result.length, 1);
  });

  it("deleteTextBox: 빈 배열 → 빈 배열", () => {
    const result = deleteTextBox([], "any");
    assert.deepEqual(result, []);
  });

  it("immutability: updateTextBoxContent 는 원본 변경하지 않음", () => {
    const tb = createTextBox({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const original = tb.content;
    updateTextBoxContent(tb, "changed");
    assert.equal(tb.content, original);
  });
});

// ---------------------------------------------------------------------------
// R4 — PdfChecklist reducers
// ---------------------------------------------------------------------------
describe("R4: PdfChecklist reducers", () => {
  it("createChecklist: 기본값 — item 1개 (빈 label), collapsed = true", () => {
    const cl = createChecklist({
      subjectId: "sub-2",
      page: 1,
      position: { x: 0.3, y: 0.5 },
    });

    assert.ok(cl.id.startsWith("checklist-"), `id prefix: ${cl.id}`);
    assert.equal(cl.subjectId, "sub-2");
    assert.equal(cl.page, 1);
    assert.equal(cl.position.x, 0.3);
    assert.equal(cl.position.y, 0.5);
    assert.equal(cl.items.length, 1);
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    assert.equal(firstItem.label, "");
    assert.equal(firstItem.checked, false);
    assert.equal(cl.collapsed, true, "R11: default collapsed = true");
  });

  it("createChecklist: position 범위 외 → clamp", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: -1, y: 2 } });
    assert.equal(cl.position.x, 0);
    assert.equal(cl.position.y, 1);
  });

  it("addChecklistItem: 새 item 추가", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const updated = addChecklistItem(cl, "항목 A");
    assert.equal(updated.items.length, 2);
    const secondItem = updated.items[1];
    assert.ok(secondItem !== undefined);
    assert.equal(secondItem.label, "항목 A");
    assert.equal(secondItem.checked, false);
  });

  it("addChecklistItem: label 없으면 빈 문자열", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const updated = addChecklistItem(cl);
    const secondItem = updated.items[1];
    assert.ok(secondItem !== undefined);
    assert.equal(secondItem.label, "");
  });

  it("addChecklistItem: label 500자 초과 → 500자 truncate", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const updated = addChecklistItem(cl, "x".repeat(700));
    const secondItem = updated.items[1];
    assert.ok(secondItem !== undefined);
    assert.equal(secondItem.label.length, 500);
  });

  it("addChecklistItem: items 100개 초과 → no-op + 원본 반환", () => {
    let cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    // 99개 추가 (초기 1개 포함 = 100개)
    for (let i = 0; i < 99; i++) {
      cl = addChecklistItem(cl, `item-${i}`);
    }
    assert.equal(cl.items.length, 100);
    // 101번째 추가 시도 → no-op
    const result = addChecklistItem(cl, "over-cap");
    assert.equal(result.items.length, 100);
    assert.strictEqual(result, cl); // 동일 참조 (no-op)
  });

  it("toggleChecklistItem: false → true", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    const toggled = toggleChecklistItem(cl, firstItem.id);
    const toggledFirst = toggled.items[0];
    assert.ok(toggledFirst !== undefined);
    assert.equal(toggledFirst.checked, true);
  });

  it("toggleChecklistItem: true → false", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    const toggled1 = toggleChecklistItem(cl, firstItem.id);
    const toggled2 = toggleChecklistItem(toggled1, firstItem.id);
    const resultItem = toggled2.items[0];
    assert.ok(resultItem !== undefined);
    assert.equal(resultItem.checked, false);
  });

  it("toggleChecklistItem: 없는 id → 변경 없음", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const result = toggleChecklistItem(cl, "nonexistent");
    const firstItem = result.items[0];
    assert.ok(firstItem !== undefined);
    assert.equal(firstItem.checked, false);
  });

  it("updateChecklistItemLabel: label 갱신", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    const updated = updateChecklistItemLabel(cl, firstItem.id, "새 항목");
    const updatedFirst = updated.items[0];
    assert.ok(updatedFirst !== undefined);
    assert.equal(updatedFirst.label, "새 항목");
  });

  it("updateChecklistItemLabel: 500자 초과 → truncate", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    const updated = updateChecklistItemLabel(cl, firstItem.id, "y".repeat(700));
    const updatedFirst = updated.items[0];
    assert.ok(updatedFirst !== undefined);
    assert.equal(updatedFirst.label.length, 500);
  });

  it("deleteChecklistItem: 해당 item 제거", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const withItem = addChecklistItem(cl, "B");
    const firstItem = withItem.items[0];
    assert.ok(firstItem !== undefined);
    const result = deleteChecklistItem(withItem, firstItem.id);
    assert.equal(result.items.length, 1);
    const remaining = result.items[0];
    assert.ok(remaining !== undefined);
    assert.equal(remaining.label, "B");
  });

  it("moveChecklist: 정상 이동", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const moved = moveChecklist(cl, { x: 0.6, y: 0.8 });
    assert.equal(moved.position.x, 0.6);
    assert.equal(moved.position.y, 0.8);
  });

  it("moveChecklist: 범위 외 → clamp", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const moved = moveChecklist(cl, { x: -0.1, y: 1.5 });
    assert.equal(moved.position.x, 0);
    assert.equal(moved.position.y, 1);
  });

  it("deleteChecklist: 해당 id 제거, 나머지 보존", () => {
    const cl1 = createChecklist({ subjectId: "s", page: 1, position: { x: 0.1, y: 0 } });
    const cl2 = createChecklist({ subjectId: "s", page: 1, position: { x: 0.2, y: 0 } });
    const result = deleteChecklist([cl1, cl2], cl1.id);
    assert.equal(result.length, 1);
    const first = result[0];
    assert.ok(first !== undefined);
    assert.equal(first.id, cl2.id);
  });

  it("deleteChecklist: 없는 id → 변경 없음", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const result = deleteChecklist([cl], "nonexistent");
    assert.equal(result.length, 1);
  });

  it("immutability: addChecklistItem 는 원본 변경하지 않음", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const originalLen = cl.items.length;
    addChecklistItem(cl, "test");
    assert.equal(cl.items.length, originalLen);
  });

  // R11: toggleChecklistCollapsed
  it("toggleChecklistCollapsed: true → false (펼침)", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    assert.equal(cl.collapsed, true, "default 접힘");
    const expanded = toggleChecklistCollapsed(cl);
    assert.equal(expanded.collapsed, false, "펼침");
  });

  it("toggleChecklistCollapsed: false → true (접힘)", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const expanded = toggleChecklistCollapsed(cl);
    const collapsed = toggleChecklistCollapsed(expanded);
    assert.equal(collapsed.collapsed, true, "재접힘");
  });

  it("toggleChecklistCollapsed: items 미변경", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const withItem = addChecklistItem(cl, "테스트");
    const toggled = toggleChecklistCollapsed(withItem);
    assert.equal(toggled.items.length, 2, "items 개수 미변경");
  });

  it("toggleChecklistCollapsed: 원본 불변", () => {
    const cl = createChecklist({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    toggleChecklistCollapsed(cl);
    assert.equal(cl.collapsed, true, "원본 불변");
  });
});

// ---------------------------------------------------------------------------
// sprint-13 R2 — PdfTable reducers
// ---------------------------------------------------------------------------
describe("R2: PdfTable reducers", () => {
  it("createTable: 기본값 — 빈 content, collapsed = true", () => {
    const table = createTable({
      subjectId: "sub-table",
      page: 2,
      position: { x: 0.25, y: 0.75 },
    });

    assert.match(table.id, /^table-\d+-[0-9a-f]{4}$/);
    assert.equal(table.subjectId, "sub-table");
    assert.equal(table.page, 2);
    assert.equal(table.position.x, 0.25);
    assert.equal(table.position.y, 0.75);
    assert.equal(table.content, "");
    assert.equal(table.collapsed, true);
    assert.ok(typeof table.createdAt === "string");
    assert.ok(typeof table.updatedAt === "string");
  });

  it("createTable: position 범위 외 → clamp", () => {
    const table = createTable({ subjectId: "s", page: 1, position: { x: -1, y: 2 } });
    assert.equal(table.position.x, 0);
    assert.equal(table.position.y, 1);
  });

  it("updateTableContent: 10000자 초과 → 10000자로 truncate", () => {
    const table = createTable({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const updated = updateTableContent(table, "a".repeat(11000));
    assert.equal(updated.content.length, 10000);
    assert.equal(table.content, "", "원본 불변");
  });

  it("moveTable: 정상 이동 및 범위 외 clamp", () => {
    const table = createTable({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const moved = moveTable(table, { x: 0.4, y: 0.8 });
    assert.equal(moved.position.x, 0.4);
    assert.equal(moved.position.y, 0.8);

    const clamped = moveTable(table, { x: -0.1, y: 1.2 });
    assert.equal(clamped.position.x, 0);
    assert.equal(clamped.position.y, 1);
  });

  it("deleteTable: 해당 id 제거, 나머지 보존", () => {
    const table = createTable({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const other = { ...table, id: "table-other" };
    const result = deleteTable([table, other], table.id);
    assert.equal(result.length, 1);
    const first = result[0];
    assert.ok(first !== undefined);
    assert.equal(first.id, "table-other");
  });

  it("toggleTableCollapsed: collapsed 값을 반전하고 원본은 보존", () => {
    const table = createTable({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const expanded = toggleTableCollapsed(table);
    assert.equal(expanded.collapsed, false);
    assert.equal(table.collapsed, true);

    const collapsed = toggleTableCollapsed(expanded);
    assert.equal(collapsed.collapsed, true);
  });
});

// ---------------------------------------------------------------------------
// sprint-13 R3 — PdfChart reducers
// ---------------------------------------------------------------------------
describe("R3: PdfChart reducers", () => {
  it("createChart: 기본값 — sparkline, 빈 content, collapsed = true", () => {
    const chart = createChart({
      subjectId: "sub-chart",
      page: 3,
      position: { x: 0.2, y: 0.6 },
    });

    assert.match(chart.id, /^chart-\d+-[0-9a-f]{4}$/);
    assert.equal(chart.subjectId, "sub-chart");
    assert.equal(chart.page, 3);
    assert.equal(chart.position.x, 0.2);
    assert.equal(chart.position.y, 0.6);
    assert.equal(chart.content, "");
    assert.equal(chart.chartType, "sparkline");
    assert.equal(chart.collapsed, true);
  });

  it("updateChartContent: 5000자 초과 → 5000자로 truncate, chartType 보존", () => {
    const chart = createChart({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const updated = updateChartContent(chart, "a".repeat(6000));
    assert.equal(updated.content.length, 5000);
    assert.equal(updated.chartType, "sparkline");
    assert.equal(chart.content, "", "원본 불변");
  });

  it("moveChart: 이동 및 chartType 보존", () => {
    const chart = createChart({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const moved = moveChart(chart, { x: 0.5, y: 0.7 });
    assert.equal(moved.position.x, 0.5);
    assert.equal(moved.position.y, 0.7);
    assert.equal(moved.chartType, "sparkline");

    const clamped = moveChart(chart, { x: -1, y: 2 });
    assert.equal(clamped.position.x, 0);
    assert.equal(clamped.position.y, 1);
  });

  it("deleteChart: 해당 id 제거, 나머지 보존", () => {
    const chart = createChart({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const other = { ...chart, id: "chart-other" };
    const result = deleteChart([chart, other], chart.id);
    assert.equal(result.length, 1);
    const first = result[0];
    assert.ok(first !== undefined);
    assert.equal(first.id, "chart-other");
  });

  it("toggleChartCollapsed: collapsed 반전 및 chartType 보존", () => {
    const chart = createChart({ subjectId: "s", page: 1, position: { x: 0, y: 0 } });
    const expanded = toggleChartCollapsed(chart);
    assert.equal(expanded.collapsed, false);
    assert.equal(expanded.chartType, "sparkline");

    const collapsed = toggleChartCollapsed(expanded);
    assert.equal(collapsed.collapsed, true);
  });
});

// ---------------------------------------------------------------------------
// R5 — Eraser reducers
// ---------------------------------------------------------------------------
describe("R5: Eraser reducers", () => {
  it("setEraserShape: shape 값 갱신", () => {
    const ws = createEmptyPdfWorkspace("sub-eraser");
    const updated = setEraserShape(ws, "square");
    assert.equal(updated.eraserShape, "square");
    assert.equal(ws.eraserShape, "circle", "원본 불변");
  });

  it("setEraserSize: 16..64 범위 안 값 보존", () => {
    const ws = createEmptyPdfWorkspace("sub-eraser");
    const updated = setEraserSize(ws, 32);
    assert.equal(updated.eraserSize, 32);
  });

  it("setEraserSize: 8 → 16 clamp", () => {
    const ws = createEmptyPdfWorkspace("sub-eraser");
    const updated = setEraserSize(ws, 8);
    assert.equal(updated.eraserSize, 16);
  });

  it("setEraserSize: 80 → 64 clamp", () => {
    const ws = createEmptyPdfWorkspace("sub-eraser");
    const updated = setEraserSize(ws, 80);
    assert.equal(updated.eraserSize, 64);
  });

  it("setEraserSize: NaN → 16 default", () => {
    const ws = createEmptyPdfWorkspace("sub-eraser");
    const updated = setEraserSize(ws, Number.NaN);
    assert.equal(updated.eraserSize, 16);
  });
});

// ---------------------------------------------------------------------------
// AC9-c — hydration fail-closed
// ---------------------------------------------------------------------------
describe("AC9-c: hydrateSubjectPdfWorkspace fail-closed", () => {
  // --- 비정상 최상위 raw ---
  it("null → empty state", () => {
    const result = hydrateSubjectPdfWorkspace(null);
    assert.deepEqual(result.textBoxes, []);
    assert.deepEqual(result.checklists, []);
    assert.deepEqual(result.tables, []);
    assert.deepEqual(result.charts, []);
    assert.deepEqual(result.stickyNotes, []);
    assert.deepEqual(result.inkStrokes, []);
    assert.equal(result.eraserShape, "circle");
    assert.equal(result.eraserSize, 16);
  });

  it("undefined → empty state", () => {
    const result = hydrateSubjectPdfWorkspace(undefined);
    assert.deepEqual(result.textBoxes, []);
    assert.deepEqual(result.checklists, []);
    assert.deepEqual(result.tables, []);
    assert.deepEqual(result.charts, []);
  });

  it("number 42 → empty state", () => {
    const result = hydrateSubjectPdfWorkspace(42);
    assert.deepEqual(result.textBoxes, []);
    assert.deepEqual(result.checklists, []);
    assert.deepEqual(result.tables, []);
    assert.deepEqual(result.charts, []);
  });

  it("string 'abc' → empty state", () => {
    const result = hydrateSubjectPdfWorkspace("abc");
    assert.deepEqual(result.textBoxes, []);
    assert.deepEqual(result.checklists, []);
    assert.deepEqual(result.tables, []);
    assert.deepEqual(result.charts, []);
  });

  // --- 정상 state + 신규 slice 누락 ---
  it("정상 stickyNotes + inkStrokes, 신규 slice 누락 → 신규 빈 배열 + 기존 보존", () => {
    const raw = {
      subjectId: "sub-existing",
      stickyNotes: [
        {
          id: "note-1",
          pageNumber: 1,
          anchor: { x: 0.1, y: 0.1 },
          blocks: [],
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      inkStrokes: [
        {
          id: "stroke-1",
          pageNumber: 1,
          color: "#000",
          width: 2,
          points: [],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      // textBoxes, checklists 누락
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.stickyNotes.length, 1);
    assert.equal(result.inkStrokes.length, 1);
    assert.deepEqual(result.textBoxes, []);
    assert.deepEqual(result.checklists, []);
    assert.deepEqual(result.tables, []);
    assert.deepEqual(result.charts, []);
    assert.equal(result.eraserShape, "circle");
    assert.equal(result.eraserSize, 16);
  });

  it("eraserShape unknown → circle default", () => {
    const raw = {
      ...buildStateWithTextBoxes([]),
      eraserShape: "hexagon",
      eraserSize: 32,
    };
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.eraserShape, "circle");
    assert.equal(result.eraserSize, 32);
  });

  it("eraserShape valid values → 보존", () => {
    for (const shape of ["circle", "square", "triangle", "line"] as const) {
      const result = hydrateSubjectPdfWorkspace({
        ...buildStateWithTextBoxes([]),
        eraserShape: shape,
        eraserSize: 32,
      });
      assert.equal(result.eraserShape, shape);
    }
  });

  it("eraserSize NaN/non-number → 16 default", () => {
    const resultNaN = hydrateSubjectPdfWorkspace({
      ...buildStateWithTextBoxes([]),
      eraserSize: Number.NaN,
    });
    assert.equal(resultNaN.eraserSize, 16);

    const resultString = hydrateSubjectPdfWorkspace({
      ...buildStateWithTextBoxes([]),
      eraserSize: "32",
    });
    assert.equal(resultString.eraserSize, 16);
  });

  it("eraserSize out-of-range → 16..64 clamp", () => {
    const tooSmall = hydrateSubjectPdfWorkspace({
      ...buildStateWithTextBoxes([]),
      eraserSize: 8,
    });
    assert.equal(tooSmall.eraserSize, 16);

    const tooLarge = hydrateSubjectPdfWorkspace({
      ...buildStateWithTextBoxes([]),
      eraserSize: 80,
    });
    assert.equal(tooLarge.eraserSize, 64);
  });

  // --- textBox 검증 ---
  it("textBox position.x = -0.5 → 해당 entry skip", () => {
    const raw = buildStateWithTextBoxes([
      makeRawTextBox({ position: { x: -0.5, y: 0.5 } }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 0);
  });

  it("textBox position.y = 1.5 → 해당 entry skip", () => {
    const raw = buildStateWithTextBoxes([
      makeRawTextBox({ position: { x: 0.5, y: 1.5 } }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 0);
  });

  it("textBox position.x = NaN → 해당 entry skip", () => {
    const raw = buildStateWithTextBoxes([
      makeRawTextBox({ position: { x: NaN, y: 0.5 } }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 0);
  });

  it("textBox size.width = 1.5 → 해당 entry skip", () => {
    const raw = buildStateWithTextBoxes([
      makeRawTextBox({ size: { width: 1.5, height: 0.1 } }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 0);
  });

  it("textBox content 6000자 → 5000자로 truncate", () => {
    const raw = buildStateWithTextBoxes([
      makeRawTextBox({ content: "a".repeat(6000) }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 1);
    const tb = result.textBoxes[0];
    assert.ok(tb !== undefined);
    assert.equal(tb.content.length, 5000);
  });

  it("textBox 1개 corrupt + 1개 정상 → corrupt skip, 정상 보존", () => {
    const raw = buildStateWithTextBoxes([
      makeRawTextBox({ position: { x: NaN, y: 0.5 } }), // corrupt
      makeRawTextBox({ position: { x: 0.2, y: 0.3 } }), // 정상
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 1);
    const tb = result.textBoxes[0];
    assert.ok(tb !== undefined);
    assert.equal(tb.position.x, 0.2);
  });

  it("textBox page = 0 (비양수) → 해당 entry skip", () => {
    const raw = buildStateWithTextBoxes([makeRawTextBox({ page: 0 })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 0);
  });

  it("textBox id 빈 문자열 → 해당 entry skip", () => {
    const raw = buildStateWithTextBoxes([makeRawTextBox({ id: "" })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.textBoxes.length, 0);
  });

  // --- checklist 검증 ---
  it("checklist items 길이 150 → 100으로 truncate", () => {
    const items = Array.from({ length: 150 }, (_, i) => ({
      id: `item-${i}`,
      label: "label",
      checked: false,
    }));
    const raw = buildStateWithChecklists([makeRawChecklist({ items })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.checklists.length, 1);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    assert.equal(cl.items.length, 100);
  });

  it("checklist items[i].label 700자 → 500자 truncate", () => {
    const items = [{ id: "item-0", label: "z".repeat(700), checked: false }];
    const raw = buildStateWithChecklists([makeRawChecklist({ items })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    assert.equal(firstItem.label.length, 500);
  });

  it("checklist items[i].checked = 'true' (string) → false (boolean coercion)", () => {
    const items = [{ id: "item-0", label: "A", checked: "true" as unknown as boolean }];
    const raw = buildStateWithChecklists([makeRawChecklist({ items })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    assert.equal(firstItem.checked, false);
  });

  it("checklist items[i].checked = 1 (number) → false (strict boolean coercion)", () => {
    const items = [{ id: "item-0", label: "A", checked: 1 as unknown as boolean }];
    const raw = buildStateWithChecklists([makeRawChecklist({ items })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    assert.equal(firstItem.checked, false);
  });

  it("checklist items[i].checked = true (boolean) → true 보존", () => {
    const items = [{ id: "item-0", label: "A", checked: true }];
    const raw = buildStateWithChecklists([makeRawChecklist({ items })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    assert.equal(firstItem.checked, true);
  });

  it("checklist position.x = NaN → 해당 entry skip, 나머지 보존", () => {
    const raw = buildStateWithChecklists([
      makeRawChecklist({ position: { x: NaN, y: 0.5 } }), // corrupt
      makeRawChecklist({ position: { x: 0.3, y: 0.4 } }), // 정상
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.checklists.length, 1);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    assert.equal(cl.position.x, 0.3);
  });

  it("checklist items 가 array 아님 → 해당 checklist items = []", () => {
    const raw = buildStateWithChecklists([
      makeRawChecklist({ items: "not-an-array" as unknown as [] }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.checklists.length, 1);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    assert.deepEqual(cl.items, []);
  });

  // R11: collapsed hydration
  it("R11: collapsed 누락 → default true (접힘)", () => {
    const raw = buildStateWithChecklists([makeRawChecklist()]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    assert.equal(cl.collapsed, true, "collapsed 누락 → true");
  });

  it("R11: collapsed: false → false 보존", () => {
    const raw = buildStateWithChecklists([makeRawChecklist({ collapsed: false })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    assert.equal(cl.collapsed, false, "false 명시 → 펼침 유지");
  });

  it("R11: collapsed: true → true 보존", () => {
    const raw = buildStateWithChecklists([makeRawChecklist({ collapsed: true })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    assert.equal(cl.collapsed, true);
  });

  it("R11: collapsed: 'true' (string) → true (not === false → default true)", () => {
    const raw = buildStateWithChecklists([makeRawChecklist({ collapsed: "true" as unknown as boolean })]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    assert.equal(cl.collapsed, true, "string 'true' → boolean coercion → true (접힘)");
  });

  // --- table 검증 ---
  it("table slice 가 array 아님(null/42/'abc') → tables = []", () => {
    for (const tables of [null, 42, "abc"]) {
      const result = hydrateSubjectPdfWorkspace({
        ...buildStateWithTables([]),
        tables,
      });
      assert.deepEqual(result.tables, []);
    }
  });

  it("table position.x = NaN → 해당 entry skip, 나머지 보존", () => {
    const raw = buildStateWithTables([
      makeRawTable({ position: { x: Number.NaN, y: 0.5 } }),
      makeRawTable({ position: { x: 0.2, y: 0.4 } }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.tables.length, 1);
    const table = result.tables[0];
    assert.ok(table !== undefined);
    assert.equal(table.position.x, 0.2);
  });

  it("table content 11000자 → 10000자로 truncate", () => {
    const raw = buildStateWithTables([
      makeRawTable({ content: "a".repeat(11000) }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const table = result.tables[0];
    assert.ok(table !== undefined);
    assert.equal(table.content.length, 10000);
  });

  it("table collapsed: 'true' string/missing → true, false → false", () => {
    const stringValue = hydrateSubjectPdfWorkspace(
      buildStateWithTables([makeRawTable({ collapsed: "true" })])
    );
    const missingValue = hydrateSubjectPdfWorkspace(
      buildStateWithTables([makeRawTable()])
    );
    const falseValue = hydrateSubjectPdfWorkspace(
      buildStateWithTables([makeRawTable({ collapsed: false })])
    );

    assert.equal(stringValue.tables[0]?.collapsed, true);
    assert.equal(missingValue.tables[0]?.collapsed, true);
    assert.equal(falseValue.tables[0]?.collapsed, false);
  });

  it("security: table content script 문자열은 domain hydration 을 통과함", () => {
    const payload = "<script>alert(1)</script>";
    const result = hydrateSubjectPdfWorkspace(
      buildStateWithTables([makeRawTable({ content: payload })])
    );
    const table = result.tables[0];
    assert.ok(table !== undefined);
    assert.equal(table.content, payload);
  });

  // --- chart 검증 ---
  it("chart slice 가 array 아님(null/42/'abc') → charts = []", () => {
    for (const charts of [null, 42, "abc"]) {
      const result = hydrateSubjectPdfWorkspace({
        ...buildStateWithCharts([]),
        charts,
      });
      assert.deepEqual(result.charts, []);
    }
  });

  it("chart position.x = NaN → 해당 entry skip, 나머지 보존", () => {
    const raw = buildStateWithCharts([
      makeRawChart({ position: { x: Number.NaN, y: 0.5 } }),
      makeRawChart({ position: { x: 0.3, y: 0.6 } }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.charts.length, 1);
    const chart = result.charts[0];
    assert.ok(chart !== undefined);
    assert.equal(chart.position.x, 0.3);
  });

  it("chart content 6000자 → 5000자로 truncate", () => {
    const raw = buildStateWithCharts([
      makeRawChart({ content: "a".repeat(6000) }),
    ]);
    const result = hydrateSubjectPdfWorkspace(raw);
    const chart = result.charts[0];
    assert.ok(chart !== undefined);
    assert.equal(chart.content.length, 5000);
  });

  it("chart collapsed: 'true' string/missing → true, false → false", () => {
    const stringValue = hydrateSubjectPdfWorkspace(
      buildStateWithCharts([makeRawChart({ collapsed: "true" })])
    );
    const missingValue = hydrateSubjectPdfWorkspace(
      buildStateWithCharts([makeRawChart()])
    );
    const falseValue = hydrateSubjectPdfWorkspace(
      buildStateWithCharts([makeRawChart({ collapsed: false })])
    );

    assert.equal(stringValue.charts[0]?.collapsed, true);
    assert.equal(missingValue.charts[0]?.collapsed, true);
    assert.equal(falseValue.charts[0]?.collapsed, false);
  });

  it("chartType 이 'sparkline' 외 값이면 sparkline 으로 default", () => {
    const result = hydrateSubjectPdfWorkspace(
      buildStateWithCharts([makeRawChart({ chartType: "bar" })])
    );
    const chart = result.charts[0];
    assert.ok(chart !== undefined);
    assert.equal(chart.chartType, "sparkline");
  });

  // --- 완전한 정상 state round-trip ---
  it("정상 state round-trip: 모든 slice 보존", () => {
    const now = new Date().toISOString();
    const raw: SubjectPdfWorkspace = {
      subjectId: "sub-round",
      stickyNotes: [],
      inkStrokes: [],
      eraserShape: "triangle",
      eraserSize: 40,
      textBoxes: [
        {
          id: "textbox-1",
          subjectId: "sub-round",
          page: 1,
          position: { x: 0.1, y: 0.2 },
          size: { width: 0.2, height: 0.1 },
          content: "hello",
          createdAt: now,
          updatedAt: now,
        },
      ],
      checklists: [
        {
          id: "checklist-1",
          subjectId: "sub-round",
          page: 2,
          position: { x: 0.5, y: 0.5 },
          items: [{ id: "item-0", label: "first", checked: true }],
          collapsed: false, // 명시적 펼침
          createdAt: now,
          updatedAt: now,
        },
      ],
      tables: [
        {
          id: "table-1",
          subjectId: "sub-round",
          page: 1,
          position: { x: 0.2, y: 0.4 },
          content: "| A | B |",
          collapsed: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      charts: [
        {
          id: "chart-1",
          subjectId: "sub-round",
          page: 1,
          position: { x: 0.3, y: 0.6 },
          content: "A,1\nB,2",
          chartType: "sparkline",
          collapsed: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    };
    const result = hydrateSubjectPdfWorkspace(raw);
    assert.equal(result.eraserShape, "triangle");
    assert.equal(result.eraserSize, 40);
    assert.equal(result.textBoxes.length, 1);
    const tb = result.textBoxes[0];
    assert.ok(tb !== undefined);
    assert.equal(tb.content, "hello");
    assert.equal(result.checklists.length, 1);
    const cl = result.checklists[0];
    assert.ok(cl !== undefined);
    const firstItem = cl.items[0];
    assert.ok(firstItem !== undefined);
    assert.equal(firstItem.checked, true);
    assert.equal(cl.collapsed, false, "R11: collapsed: false 명시 → 보존");
    assert.equal(result.tables.length, 1);
    assert.equal(result.tables[0]?.content, "| A | B |");
    assert.equal(result.charts.length, 1);
    assert.equal(result.charts[0]?.chartType, "sparkline");
    assert.equal(result.charts[0]?.collapsed, false);
  });
});

// ---------------------------------------------------------------------------
// createEmptyPdfWorkspace — sprint-12 확장 검증
// ---------------------------------------------------------------------------
describe("createEmptyPdfWorkspace: sprint-12 확장", () => {
  it("textBoxes + checklists + tables + charts + eraser defaults 가 초기화됨", () => {
    const ws = createEmptyPdfWorkspace("sub-test");
    assert.deepEqual(ws.textBoxes, []);
    assert.deepEqual(ws.checklists, []);
    assert.deepEqual(ws.tables, []);
    assert.deepEqual(ws.charts, []);
    assert.deepEqual(ws.stickyNotes, []);
    assert.deepEqual(ws.inkStrokes, []);
    assert.equal(ws.eraserShape, "circle");
    assert.equal(ws.eraserSize, 16);
    assert.equal(ws.subjectId, "sub-test");
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let _counter = 0;

function makeRawTextBox(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString();
  _counter++;
  return {
    id: `textbox-test-${_counter}`,
    subjectId: "sub-test",
    page: 1,
    position: { x: 0.5, y: 0.5 },
    size: { width: 0.2, height: 0.1 },
    content: "test content",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRawChecklist(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString();
  _counter++;
  return {
    id: `checklist-test-${_counter}`,
    subjectId: "sub-test",
    page: 1,
    position: { x: 0.3, y: 0.3 },
    items: [{ id: "item-0", label: "default", checked: false }],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRawTable(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString();
  _counter++;
  return {
    id: `table-test-${_counter}`,
    subjectId: "sub-test",
    page: 1,
    position: { x: 0.4, y: 0.4 },
    content: "| A | B |",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRawChart(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString();
  _counter++;
  return {
    id: `chart-test-${_counter}`,
    subjectId: "sub-test",
    page: 1,
    position: { x: 0.6, y: 0.6 },
    content: "A,1\nB,2",
    chartType: "sparkline",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildStateWithTextBoxes(
  textBoxes: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    subjectId: "sub-test",
    stickyNotes: [],
    inkStrokes: [],
    textBoxes,
    checklists: [],
    tables: [],
    charts: [],
    updatedAt: new Date().toISOString(),
  };
}

function buildStateWithChecklists(
  checklists: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    subjectId: "sub-test",
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists,
    tables: [],
    charts: [],
    updatedAt: new Date().toISOString(),
  };
}

function buildStateWithTables(
  tables: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    subjectId: "sub-test",
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: [],
    tables,
    charts: [],
    updatedAt: new Date().toISOString(),
  };
}

function buildStateWithCharts(
  charts: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    subjectId: "sub-test",
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: [],
    tables: [],
    charts,
    updatedAt: new Date().toISOString(),
  };
}
