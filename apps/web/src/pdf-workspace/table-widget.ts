// sprint-2026-W22-sprint-5 / layer B/slice-2g-table — table render widget module.
// main.ts 의 table widget (render + state handler + cell debounce + mount) 단일
// module 분리. chart-widget (slice-2g) 패턴 직접 적용. markdown-table (slice-2f/ii)
// leaf 이미 분리 — content parser/serializer 의존.
//
// invariant:
//   (a) render DOM tree XSS safe — innerHTML 0. input.value DOM property +
//       textContent + setAttribute + dataset only.
//   (b) renderTableMount escape — escapeHtml(table.id) + escapeHtml(subjectId)
//       (slice-2f/ii lineage). attribute breakout 0.
//   (c) tableId selector injection 방어 (OWASP A03) — `[data-table-id="${tableId}"]`
//       template literal 보간 X. dataset.tableId === tableId 비교 default.
//       hostile quote / bracket / backslash / CR / LF tableId 도 throw 0, null
//       safe return.
//   (d) debounce map module-private — tableContentDebounceMap +
//       tableCellDebounceMap. 외부 mutate X. removeTable / clearTableCellDebounce
//       만 cleanup.
//   (e) refreshTableWidgets idempotent — postMountEffect 반복 호출 동일 결과.
//   (f) handler workspace store mutate only — DOM 직접 mutate X.
//   (g) PII 무누출 — observability/logging/RUM import 0. table.content / cell
//       value 가 console / Datadog / thrown Error message 안 등장 X.

import { escapeHtml } from "../app/escape-html.ts";
import {
  type ParsedMarkdownTable,
  parseMarkdownTable,
  serializeMarkdownTable
} from "./markdown-table.ts";
import type { PdfTable, SubjectPdfWorkspace } from "@study-note/domain";
import {
  createTable,
  deleteTable,
  moveTable,
  toggleTableCollapsed,
  updateTableContent
} from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

export interface TableWidgetContext {
  getWorkspace: (subjectId: string) => SubjectPdfWorkspace;
}

export interface TableWidgetCallbacks {
  updateWorkspace: (
    subjectId: string,
    updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
  ) => void;
}

// ─── Module-private state (debounce maps) ────────────────────────────────

// tableContentDebounceMap was used by the now-removed scheduleTableContentUpdate
// (slice-2). slice-5 uses tableCellDebounceMap instead. Kept here as named const
// for removeTable's clearTimeout call (legacy slice-2 timers may still be in
// flight during a hot reload).
const tableContentDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

// sprint-13/slice-5: per-table debounce for cell-level editing.
// Key = tableId. No renderApp in callback to avoid focus loss.
const tableCellDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

// ─── Public exports — state handlers ─────────────────────────────────────

export function addTable(
  context: TableWidgetContext,
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  position: { x: number; y: number }
): void {
  const workspace = context.getWorkspace(subjectId);
  const page = workspace.material?.selectedPage ?? 1;
  const table = createTable({ subjectId, page, position });

  callbacks.updateWorkspace(subjectId, (current) => ({
    ...current,
    tables: [...current.tables, table]
  }));
}

export function removeTable(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string
): void {
  const prev = tableContentDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  tableContentDebounceMap.delete(tableId);
  const prev2 = tableCellDebounceMap.get(tableId);
  if (prev2) clearTimeout(prev2);
  tableCellDebounceMap.delete(tableId);

  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: deleteTable(workspace.tables, tableId)
  }));
}

export function applyTableMove(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string,
  position: { x: number; y: number }
): void {
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? moveTable(table, position) : table
    )
  }));
}

export function applyTableCollapseToggle(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string
): void {
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? toggleTableCollapsed(table) : table
    )
  }));
}

export function scheduleTableCellUpdate(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string,
  content: string
): void {
  const prev = tableCellDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  const handle = setTimeout(() => {
    tableCellDebounceMap.delete(tableId);
    callbacks.updateWorkspace(subjectId, (workspace) => ({
      ...workspace,
      tables: workspace.tables.map((table) =>
        table.id === tableId ? updateTableContent(table, content) : table
      )
    }));
  }, 300);
  tableCellDebounceMap.set(tableId, handle);
}

/**
 * 외부 caller 가 tableId 의 pending cell debounce timer 를 cancel 할 수
 * 있게 한다. module-private map 직접 access 차단.
 */
export function clearTableCellDebounce(tableId: string): void {
  const prev = tableCellDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  tableCellDebounceMap.delete(tableId);
}

/**
 * invariant (c): tableId selector injection 방어. dataset 비교만 사용 —
 * `[data-table-id="${tableId}"]` template literal 보간 안 함.
 */
function findTableArticle(tableId: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>("[data-table-id]");
  for (const el of all) {
    if (el.dataset.tableId === tableId && el.tagName.toLowerCase() === "article") {
      return el;
    }
  }
  return null;
}

/**
 * Reads current in-memory table data from the DOM inputs and returns the edited
 * ParsedMarkdownTable. Used by add/delete row/col reducers which must collect
 * all current cell values before mutating.
 */
export function readTableDataFromDom(tableId: string): ParsedMarkdownTable | null {
  const article = findTableArticle(tableId);
  if (!article) return null;

  const headerInputs = Array.from(
    article.querySelectorAll<HTMLInputElement>(
      'input[data-action="update-table-cell"][data-cell-kind="header"]'
    )
  ).sort((a, b) => Number(a.dataset.cellCol) - Number(b.dataset.cellCol));

  const headers = headerInputs.map((inp) => inp.value);
  if (headers.length === 0) return null;

  let rowCountEl: HTMLElement | null = null;
  for (const el of article.querySelectorAll<HTMLElement>("[data-table-row-count]")) {
    rowCountEl = el;
    break;
  }
  const rowCount = Number(rowCountEl?.dataset.tableRowCount ?? "0");

  const rowInputs = article.querySelectorAll<HTMLInputElement>(
    'input[data-action="update-table-cell"][data-cell-kind="row"]'
  );

  const rows: string[][] = Array.from({ length: rowCount }, (_, rowIdx) =>
    Array.from({ length: headers.length }, (__, colIdx) => {
      const rowStr = String(rowIdx);
      const colStr = String(colIdx);
      for (const inp of rowInputs) {
        if (inp.dataset.cellRow === rowStr && inp.dataset.cellCol === colStr) {
          return inp.value;
        }
      }
      return "";
    })
  );

  return { headers, rows };
}

export function applyAddTableRow(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string
): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  const updated: ParsedMarkdownTable = {
    ...current,
    rows: [...current.rows, Array(current.headers.length).fill("")]
  };
  const content = serializeMarkdownTable(updated);
  clearTableCellDebounce(tableId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

export function applyAddTableColumn(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string
): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  const updated: ParsedMarkdownTable = {
    headers: [...current.headers, ""],
    rows: current.rows.map((row) => [...row, ""])
  };
  const content = serializeMarkdownTable(updated);
  clearTableCellDebounce(tableId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

export function applyDeleteTableRow(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string,
  rowIndex: number
): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  if (current.rows.length === 0) return;
  const updated: ParsedMarkdownTable = {
    ...current,
    rows: current.rows.filter((_, i) => i !== rowIndex)
  };
  const content = serializeMarkdownTable(updated);
  clearTableCellDebounce(tableId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

export function applyDeleteTableColumn(
  callbacks: TableWidgetCallbacks,
  subjectId: string,
  tableId: string,
  colIndex: number
): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  if (current.headers.length <= 1) return;
  const updated: ParsedMarkdownTable = {
    headers: current.headers.filter((_, i) => i !== colIndex),
    rows: current.rows.map((row) => row.filter((_, i) => i !== colIndex))
  };
  const content = serializeMarkdownTable(updated);
  clearTableCellDebounce(tableId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

export function refreshTableWidgets(context: TableWidgetContext): void {
  document
    .querySelectorAll<HTMLElement>("[data-table-mount-id]")
    .forEach((mount) => {
      const subjectId = mount.dataset.subjectId;
      const tableId = mount.dataset.tableMountId;
      if (!subjectId || !tableId) return;
      const workspace = context.getWorkspace(subjectId);
      const table = workspace.tables.find((item) => item.id === tableId);
      if (!table) {
        mount.remove();
        return;
      }
      mount.replaceWith(renderTable(subjectId, table));
    });
}

// ─── Render ──────────────────────────────────────────────────────────────

export function renderTableMount(subjectId: string, table: PdfTable): string {
  return `<div data-table-mount-id="${escapeHtml(table.id)}" data-subject-id="${escapeHtml(subjectId)}"></div>`;
}

export function renderTable(subjectId: string, table: PdfTable): HTMLElement {
  const isCollapsed = table.collapsed !== false;
  const bodyId = "pdf-table-body-" + table.id;

  // Parse stored content; fall back to default 2x2 on empty/parse-fail
  const DEFAULT_CONTENT = "| 제목 1 | 제목 2 |\n|---|---|\n| 값 1 | 값 2 |";
  const effectiveContent = table.content.trim().length > 0 ? table.content : DEFAULT_CONTENT;
  const parsed = parseMarkdownTable(effectiveContent) ?? parseMarkdownTable(DEFAULT_CONTENT) ?? {
    headers: ["제목 1", "제목 2"],
    rows: [["값 1", "값 2"]]
  };

  const article = document.createElement("article");
  article.className = "pdf-table" + (isCollapsed ? " is-collapsed" : "");
  article.dataset.tableId = table.id;
  article.style.left = String(table.position.x * 100) + "%";
  article.style.top = String(table.position.y * 100) + "%";

  // --- header ---
  const header = document.createElement("div");
  header.className = "pdf-table-header";
  header.dataset.action = "table-drag-handle";
  header.dataset.tableId = table.id;
  header.setAttribute("aria-label", "표 이동");
  header.setAttribute("role", "button");
  header.tabIndex = 0;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "pdf-table-toggle";
  toggle.dataset.action = "toggle-table-collapsed";
  toggle.dataset.subjectId = subjectId;
  toggle.dataset.tableId = table.id;
  toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  toggle.setAttribute("aria-controls", bodyId);
  toggle.setAttribute("aria-label", isCollapsed ? "표 펼치기" : "표 접기");
  toggle.textContent = isCollapsed ? "▶" : "▼";

  const titleSpan = document.createElement("span");
  titleSpan.className = "pdf-table-title";
  titleSpan.textContent = "표";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "pdf-table-delete";
  remove.dataset.action = "delete-table";
  remove.dataset.subjectId = subjectId;
  remove.dataset.tableId = table.id;
  remove.setAttribute("aria-label", "표 삭제");
  remove.textContent = "✕";

  header.append(toggle, titleSpan, remove);

  // --- body ---
  const body = document.createElement("div");
  body.className = "pdf-table-body";
  body.id = bodyId;
  body.dataset.hiddenWhenCollapsed = "";

  // editable <table>
  const gridTable = document.createElement("table");
  gridTable.className = "pdf-table-grid";

  // thead: header inputs + delete-column buttons
  const thead = document.createElement("thead");
  const headerTr = document.createElement("tr");

  parsed.headers.forEach((headerVal, colIdx) => {
    const th = document.createElement("th");
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "pdf-table-cell-input";
    inp.dataset.action = "update-table-cell";
    inp.dataset.subjectId = subjectId;
    inp.dataset.tableId = table.id;
    inp.dataset.cellKind = "header";
    inp.dataset.cellCol = String(colIdx);
    inp.value = headerVal;
    inp.setAttribute("aria-label", `헤더 ${colIdx + 1}`);
    th.append(inp);
    headerTr.append(th);
  });

  // delete-column buttons in header row (last cell = action column)
  const thColActions = document.createElement("th");
  thColActions.className = "pdf-table-col-actions";
  parsed.headers.forEach((_, colIdx) => {
    const delCol = document.createElement("button");
    delCol.type = "button";
    delCol.className = "pdf-table-delete-col";
    delCol.dataset.action = "delete-table-column";
    delCol.dataset.subjectId = subjectId;
    delCol.dataset.tableId = table.id;
    delCol.dataset.col = String(colIdx);
    delCol.setAttribute("aria-label", `${colIdx + 1}열 삭제`);
    delCol.textContent = "✕";
    thColActions.append(delCol);
  });
  headerTr.append(thColActions);
  thead.append(headerTr);
  gridTable.append(thead);

  // tbody: data rows + delete-row buttons
  const tbody = document.createElement("tbody");
  tbody.dataset.tableRowCount = String(parsed.rows.length);

  parsed.rows.forEach((row, rowIdx) => {
    const tr = document.createElement("tr");

    row.forEach((cellVal, colIdx) => {
      const td = document.createElement("td");
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "pdf-table-cell-input";
      inp.dataset.action = "update-table-cell";
      inp.dataset.subjectId = subjectId;
      inp.dataset.tableId = table.id;
      inp.dataset.cellKind = "row";
      inp.dataset.cellRow = String(rowIdx);
      inp.dataset.cellCol = String(colIdx);
      inp.value = cellVal;
      inp.setAttribute("aria-label", `행 ${rowIdx + 1} 열 ${colIdx + 1}`);
      td.append(inp);
      tr.append(td);
    });

    const tdRowAction = document.createElement("td");
    tdRowAction.className = "pdf-table-row-actions";
    const delRow = document.createElement("button");
    delRow.type = "button";
    delRow.className = "pdf-table-delete-row";
    delRow.dataset.action = "delete-table-row";
    delRow.dataset.subjectId = subjectId;
    delRow.dataset.tableId = table.id;
    delRow.dataset.row = String(rowIdx);
    delRow.setAttribute("aria-label", `${rowIdx + 1}행 삭제`);
    delRow.textContent = "✕";
    tdRowAction.append(delRow);
    tr.append(tdRowAction);
    tbody.append(tr);
  });

  gridTable.append(tbody);

  // add row/col buttons
  const tableActions = document.createElement("div");
  tableActions.className = "pdf-table-actions";

  const addRowBtn = document.createElement("button");
  addRowBtn.type = "button";
  addRowBtn.className = "pdf-table-add-row";
  addRowBtn.dataset.action = "add-table-row";
  addRowBtn.dataset.subjectId = subjectId;
  addRowBtn.dataset.tableId = table.id;
  addRowBtn.textContent = "+ 행";

  const addColBtn = document.createElement("button");
  addColBtn.type = "button";
  addColBtn.className = "pdf-table-add-col";
  addColBtn.dataset.action = "add-table-column";
  addColBtn.dataset.subjectId = subjectId;
  addColBtn.dataset.tableId = table.id;
  addColBtn.textContent = "+ 열";

  tableActions.append(addRowBtn, addColBtn);
  body.append(gridTable, tableActions);
  article.append(header, body);
  return article;
}
