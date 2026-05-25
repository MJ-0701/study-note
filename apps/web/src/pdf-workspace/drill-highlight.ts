// sprint-2026-W22-sprint-2 / layer B/slice-2d — inspector drill highlight domain.
// main.ts 의 inspectorDrill state + pendingDrillHighlight + activeDrillHighlights
// Map + activeDrillHighlightTimers Map + DRILL_* 상수 4 + selector/dataset/find
// helper + applyPending/applyTracked/refresh/schedule/queued + readInspectorDrill /
// writeInspectorDrill / toggleInspectorDrillState / normalizeInspectorDrillType /
// getDefaultInspectorDrill + handleDrillItemClick + DrillItemClickResult +
// formatDrillSnippet / getDrillPageNumber / getStickyDrillText /
// getChecklistDrillText / getTableDrillText / getChartDrillTypeLabel /
// formatDrillLabel + InspectorDrillEntry / getDrillItemId / getInspectorDrillEntries +
// renderDrillList / renderInspectorStatRow 격리.
// slice-2a/2b/2c 패턴 (Context + Callbacks + DomainHelpers + named export +
// module-private state + characterization spec) 일관.
//
// invariant:
//   - drill type normalize = 6 known type (sticky/ink/textbox/checklist/table/chart)
//     만 통과; unknown (sin/cos/tan 등 chart subtype 포함) → null (sprint-14 R1/R2
//     fix lineage). decodeChartContent 의 trig subtype 은 차트 본문이지 drill
//     type 이 아니다.
//   - 1.5s pulse = DRILL_HIGHLIGHT_DURATION_MS. setTimeout 으로 class 제거.
//     morphdom DOM 교체 후 refreshActiveDrillHighlights 가 같은 data id 의
//     새 element 에 re-pulse (mainRenderSink postMountEffects).
//   - retry/expires = 50ms × 3 attempt × 4000ms expire. queueMicrotask + setTimeout
//     2단계 — render 직후 DOM 미존재 시 다음 microtask 안 page nav 가 commit 된
//     후 retry.
//   - page nav timing = handleDrillItemClick 가 requestPdfPage + setPdfPage +
//     renderApp 를 순서대로 호출. selectedPage 즉시 변경 + iframe ready 와 무관.
//   - localStorage namespace = "studyNote.pdfWorkspace.inspectorDrill" + 6 type
//     boolean default false. parse 실패 / 1 type 누락 → default 로 채움 + 신규
//     type 추가 시 기존 entry 가 자동 false (forward-compat).
//   - HTML rendering 보안 (Gate 3 review Required) = 모든 text/attribute interpolation
//     은 escapeHtml() 통과. untrusted 입력 = sticky/textbox/checklist/table/chart
//     content + annotation id + drill type string. data-* attribute 값도 escape.
//   - telemetry payload scrub (Gate 3 review Important) = RUM callback 추가 시
//     note 본문 / snippet / cell 내용 / annotation id payload arg 차단; type /
//     count 등 비식별 metadata 만 허용 ([[annotation-sync]] SyncMetricContext 패턴
//     일관).

import type {
  PdfChart,
  PdfChecklist,
  PdfInkStroke,
  PdfTable,
  PdfTextBox,
  SubjectPdfWorkspace
} from "@study-note/domain";

import { escapeHtml } from "../app/escape-html.ts";

// ─── Public constants ────────────────────────────────────────────────────

export const DRILL_HIGHLIGHT_DURATION_MS = 1500;
export const DRILL_HIGHLIGHT_RETRY_DELAY_MS = 50;
export const DRILL_HIGHLIGHT_MAX_ATTEMPTS = 3;
export const DRILL_HIGHLIGHT_EXPIRES_MS = 4000;
export const DRILL_LABEL_LIMIT = 30;
export const DRILL_LIST_LIMIT = 50;
export const inspectorDrillStorageKey = "studyNote.pdfWorkspace.inspectorDrill";

// ─── Public types ────────────────────────────────────────────────────────

export type InspectorDrillType = "sticky" | "ink" | "textbox" | "checklist" | "table" | "chart";

export type InspectorDrillState = Record<InspectorDrillType, boolean>;

export interface PendingDrillHighlight {
  subjectId: string;
  drillType: InspectorDrillType;
  annotationId: string;
  remainingAttempts: number;
  expiresAt: number;
}

export interface ActiveDrillHighlight {
  subjectId: string;
  drillType: InspectorDrillType;
  annotationId: string;
  expiresAt: number;
}

export type DrillItemClickResult =
  | {
      ok: true;
      subjectId: string;
      annotationId: string;
      drillType: InspectorDrillType;
      pageNumber: number;
      queued: true;
    }
  | { ok: false; reason: "missing-button" | "missing-dataset" | "invalid-type" | "invalid-page" };

export interface InspectorDrillEntry {
  id: string;
  index: number;
  item: unknown;
  pageNumber: number;
}

// ─── Domain helpers contract (chart/table content 파싱 deps) ─────────────

/**
 * drill format/render 가 read-only 로 쓰는 chart/table content 파서.
 * main.ts 의 decodeChartContent + parseMarkdownTable + CHART_TYPE_PREFIX 를
 * 주입한다. 본 module 안 inline 하지 않는 이유 = chart/table parser 는
 * drill 외에도 main.ts 의 chart widget / table widget / serialize 경로에서
 * 쓰이는 단일 SoT 라서, 본 모듈로 옮기면 다른 surface 의 import 가 깨진다.
 */
export interface DrillHighlightDomainHelpers {
  decodeChartContent: (content: string) => {
    chartType: string;
    points: ReadonlyArray<unknown>;
    functionType?: unknown;
  };
  parseMarkdownTable: (source: string) => { headers: string[]; rows: string[][] } | null;
  CHART_TYPE_PREFIX: string;
}

/**
 * applyTrackedDrillHighlight / refreshActiveDrillHighlights / applyQueuedDrillHighlight
 * 가 read-only 로 보는 app state. broad selector 노출 X — surface root 1개만.
 */
export interface DrillHighlightContext {
  getAppRoot: () => HTMLElement | null;
}

/**
 * handleDrillItemClick 가 호출하는 main.ts 의 side-effect deps.
 * - requestPage = subjectId+pageNumber 로 native PDF iframe nav 요청.
 * - commitPage = view-state 의 selectedPage 즉시 변경 (iframe ready 와 무관).
 * - render = renderApp 호출 (mainRenderSink postMountEffects 가 highlight
 *   pulse 를 즉시 적용).
 */
export interface DrillHighlightCallbacks {
  requestPage: (subjectId: string, pageNumber: number) => void;
  commitPage: (subjectId: string, pageNumber: number) => void;
  render: () => void;
}

// ─── Module-private state ────────────────────────────────────────────────

let pendingDrillHighlight: PendingDrillHighlight | null = null;
const activeDrillHighlights = new Map<string, ActiveDrillHighlight>();
const activeDrillHighlightTimers = new Map<string, ReturnType<typeof setTimeout>>();

// inspectorDrill state 는 module 외부 (main.ts dispatch + renderInspectorStatRow)
// 모두에서 접근하므로 setter API 를 export. raw reassign 금지.
let inspectorDrillState: InspectorDrillState = getDefaultInspectorDrill();

// ─── Storage helpers ─────────────────────────────────────────────────────

export function getDefaultInspectorDrill(): InspectorDrillState {
  return {
    sticky: false,
    ink: false,
    textbox: false,
    checklist: false,
    table: false,
    chart: false
  };
}

export function normalizeInspectorDrillType(value: string | undefined): InspectorDrillType | null {
  return value === "sticky" ||
    value === "ink" ||
    value === "textbox" ||
    value === "checklist" ||
    value === "table" ||
    value === "chart"
    ? value
    : null;
}

export function readInspectorDrill(): InspectorDrillState {
  const base = getDefaultInspectorDrill();

  try {
    const raw = localStorage.getItem(inspectorDrillStorageKey);
    if (raw === null) return base;
    const parsed = JSON.parse(raw) as Partial<Record<InspectorDrillType, unknown>>;

    return {
      sticky: parsed.sticky === true,
      ink: parsed.ink === true,
      textbox: parsed.textbox === true,
      checklist: parsed.checklist === true,
      table: parsed.table === true,
      chart: parsed.chart === true
    };
  } catch {
    return base;
  }
}

export function writeInspectorDrill(value: InspectorDrillState): void {
  try {
    localStorage.setItem(inspectorDrillStorageKey, JSON.stringify(value));
  } catch { /* QuotaExceededError 등 → UI 만 영향 */ }
}

export function toggleInspectorDrillState(
  value: InspectorDrillState,
  type: InspectorDrillType
): InspectorDrillState {
  return {
    ...value,
    [type]: !value[type]
  };
}

/**
 * module 내부 inspectorDrill state 의 getter. renderInspectorStatRow 가 호출.
 */
export function getInspectorDrill(): InspectorDrillState {
  return inspectorDrillState;
}

/**
 * module 내부 inspectorDrill state 를 외부에서 재설정. boot 시 main.ts 가
 * readInspectorDrill 결과로 호출, dispatch 시 toggleInspectorDrillState 결과로
 * 호출. raw mutate 차단.
 */
export function setInspectorDrill(value: InspectorDrillState): void {
  inspectorDrillState = value;
}

// ─── Pure DOM helpers ────────────────────────────────────────────────────

export function getDrillHighlightSelector(type: InspectorDrillType): string {
  if (type === "sticky") return "[data-note-id]";
  if (type === "ink") return "[data-stroke-id]";
  if (type === "textbox") return "[data-textbox-id]";
  if (type === "checklist") return "[data-checklist-id]";
  if (type === "table") return "[data-table-id]";
  return "[data-chart-id]";
}

export function getDrillHighlightDatasetKey(type: InspectorDrillType): string {
  if (type === "sticky") return "noteId";
  if (type === "ink") return "strokeId";
  if (type === "textbox") return "textboxId";
  if (type === "checklist") return "checklistId";
  if (type === "table") return "tableId";
  return "chartId";
}

function getElementDataset(element: Element): Record<string, string | undefined> {
  return (element as HTMLElement | SVGElement).dataset as Record<string, string | undefined>;
}

export function findDrillHighlightElement(
  container: ParentNode,
  drillType: InspectorDrillType,
  annotationId: string
): Element | null {
  const selector = getDrillHighlightSelector(drillType);
  const datasetKey = getDrillHighlightDatasetKey(drillType);
  return Array.from(container.querySelectorAll(selector))
    .find((element) => getElementDataset(element)[datasetKey] === annotationId) ?? null;
}

function findPdfAnnotationSurface(container: ParentNode, subjectId: string): ParentNode | null {
  return Array.from(container.querySelectorAll("[data-pdf-annotation-surface]"))
    .find((element) => getElementDataset(element).subjectId === subjectId) ?? null;
}

function getDrillHighlightKey(target: Pick<ActiveDrillHighlight, "subjectId" | "drillType" | "annotationId">): string {
  return `${target.subjectId}:${target.drillType}:${target.annotationId}`;
}

// ─── Pulse + highlight tracking ──────────────────────────────────────────

export function applyPendingDrillHighlight(
  container: ParentNode,
  drillType: InspectorDrillType,
  annotationId: string
): boolean {
  const element = findDrillHighlightElement(container, drillType, annotationId);

  if (!element) {
    return false;
  }

  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  element.classList.add("is-highlight-pulse");
  setTimeout(() => {
    element.classList.remove("is-highlight-pulse");
  }, DRILL_HIGHLIGHT_DURATION_MS);
  return true;
}

function applyTrackedDrillHighlight(
  ctx: DrillHighlightContext,
  target: ActiveDrillHighlight,
  shouldScroll: boolean
): boolean {
  const appRoot = ctx.getAppRoot();
  if (!appRoot) {
    return false;
  }

  const remainingMs = target.expiresAt - Date.now();
  const key = getDrillHighlightKey(target);

  if (remainingMs <= 0) {
    activeDrillHighlights.delete(key);
    activeDrillHighlightTimers.delete(key);
    return false;
  }

  const surface = findPdfAnnotationSurface(appRoot, target.subjectId);
  const element = surface
    ? findDrillHighlightElement(surface, target.drillType, target.annotationId)
    : null;

  if (!element) {
    return false;
  }

  if (shouldScroll && typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  element.classList.add("is-highlight-pulse");
  activeDrillHighlights.set(key, target);

  const previousTimer = activeDrillHighlightTimers.get(key);
  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  const timer = setTimeout(() => {
    const currentAppRoot = ctx.getAppRoot();
    const currentSurface = currentAppRoot ? findPdfAnnotationSurface(currentAppRoot, target.subjectId) : null;
    const currentElement = currentSurface
      ? findDrillHighlightElement(currentSurface, target.drillType, target.annotationId)
      : null;
    currentElement?.classList.remove("is-highlight-pulse");
    activeDrillHighlights.delete(key);
    activeDrillHighlightTimers.delete(key);
  }, Math.max(0, remainingMs));

  activeDrillHighlightTimers.set(key, timer);
  return true;
}

export function refreshActiveDrillHighlights(ctx: DrillHighlightContext): void {
  for (const target of activeDrillHighlights.values()) {
    applyTrackedDrillHighlight(ctx, target, false);
  }
}

function scheduleDrillHighlightRetry(ctx: DrillHighlightContext, target: PendingDrillHighlight): void {
  queueMicrotask(() => {
    setTimeout(() => {
      if (pendingDrillHighlight === target) {
        applyQueuedDrillHighlight(ctx);
      }
    }, DRILL_HIGHLIGHT_RETRY_DELAY_MS);
  });
}

export function applyQueuedDrillHighlight(ctx: DrillHighlightContext): void {
  const appRoot = ctx.getAppRoot();
  if (!pendingDrillHighlight || !appRoot) {
    return;
  }

  const target = pendingDrillHighlight;

  if (Date.now() > target.expiresAt) {
    pendingDrillHighlight = null;
    return;
  }

  const surface = findPdfAnnotationSurface(appRoot, target.subjectId);
  const applied = surface
    ? applyTrackedDrillHighlight(ctx, {
        subjectId: target.subjectId,
        drillType: target.drillType,
        annotationId: target.annotationId,
        expiresAt: Date.now() + DRILL_HIGHLIGHT_DURATION_MS
      }, true)
    : false;

  if (applied) {
    pendingDrillHighlight = null;
    return;
  }

  target.remainingAttempts -= 1;
  if (target.remainingAttempts <= 0) {
    pendingDrillHighlight = null;
    return;
  }

  scheduleDrillHighlightRetry(ctx, target);
}

// ─── Click handler ───────────────────────────────────────────────────────

/**
 * inspector drill list item button 클릭 핸들러.
 *
 * options 인자 = test 가 main.ts dispatch 의 default (requestPdfPage /
 * setPdfPage / renderApp) 대신 mock 을 주입할 때 사용. main.ts 에서는
 * callbacks 인자를 채워 직접 호출.
 */
export function handleDrillItemClick(
  target: Element,
  options: {
    now?: () => number;
    requestPage?: (subjectId: string, pageNumber: number) => void;
    commitPage?: (subjectId: string, pageNumber: number) => void;
    render?: () => void;
  } = {}
): DrillItemClickResult {
  const closest = (target as { closest?: (selector: string) => Element | null }).closest;
  const button = typeof closest === "function"
    ? closest.call(target, '[data-action="select-drill-item"]')
    : target;

  if (!button || getElementDataset(button).action !== "select-drill-item") {
    return { ok: false, reason: "missing-button" };
  }

  const dataset = getElementDataset(button);
  const subjectId = dataset.subjectId;
  const annotationId = dataset.annotationId;
  const drillType = normalizeInspectorDrillType(dataset.drillType);
  const rawPageNumber = Number(dataset.pageNumber);

  if (!subjectId || !annotationId) {
    return { ok: false, reason: "missing-dataset" };
  }

  if (!drillType) {
    return { ok: false, reason: "invalid-type" };
  }

  if (!Number.isFinite(rawPageNumber) || rawPageNumber <= 0) {
    return { ok: false, reason: "invalid-page" };
  }

  const pageNumber = Math.floor(rawPageNumber);
  pendingDrillHighlight = {
    subjectId,
    drillType,
    annotationId,
    remainingAttempts: DRILL_HIGHLIGHT_MAX_ATTEMPTS,
    expiresAt: (options.now ?? Date.now)() + DRILL_HIGHLIGHT_EXPIRES_MS
  };

  if (options.requestPage) options.requestPage(subjectId, pageNumber);
  // Drill navigation must change selectedPage immediately; requestPdfPage may wait
  // for native PDF iframe readiness before committing normal toolbar transitions.
  if (options.commitPage) options.commitPage(subjectId, pageNumber);
  if (options.render) options.render();

  return { ok: true, subjectId, annotationId, drillType, pageNumber, queued: true };
}

// ─── Format helpers ──────────────────────────────────────────────────────

function formatDrillSnippet(value: string | undefined, emptyLabel: string): string {
  const trimmed = (value ?? "").trim();
  const text = trimmed.length > 0 ? trimmed.slice(0, DRILL_LABEL_LIMIT) : emptyLabel;
  return escapeHtml(text);
}

function getDrillPageNumber(type: InspectorDrillType, item: unknown): number {
  const candidate = item as { page?: unknown; pageNumber?: unknown };
  const rawPage = type === "sticky" || type === "ink" ? candidate.pageNumber : candidate.page;
  const page = Number(rawPage);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function getStickyDrillText(note: SubjectPdfWorkspace["stickyNotes"][number]): string {
  const blocks = Array.isArray(note.blocks) ? note.blocks : [];
  return blocks.find((block) => block.content.trim().length > 0)?.content ?? blocks[0]?.content ?? "";
}

function getChecklistDrillText(checklist: PdfChecklist): string {
  const items = Array.isArray(checklist.items) ? checklist.items : [];
  return items.find((item) => item.label.trim().length > 0)?.label ?? items[0]?.label ?? "";
}

function getTableDrillText(table: PdfTable, helpers: DrillHighlightDomainHelpers): string {
  const parsed = helpers.parseMarkdownTable(table.content);
  const cells = parsed ? [...parsed.headers, ...parsed.rows.flat()] : [];
  return cells.find((cell) => cell.trim().length > 0) ?? "";
}

function getChartDrillTypeLabel(content: string, helpers: DrillHighlightDomainHelpers): string {
  const trimmed = content.trimStart();
  if (trimmed.startsWith(helpers.CHART_TYPE_PREFIX)) {
    const newline = trimmed.indexOf("\n");
    const rawType = (newline < 0
      ? trimmed.slice(helpers.CHART_TYPE_PREFIX.length)
      : trimmed.slice(helpers.CHART_TYPE_PREFIX.length, newline)
    ).trim();
    if (rawType === "sin" || rawType === "cos" || rawType === "tan" || rawType === "bar" || rawType === "xy" || rawType === "trig") {
      return rawType;
    }
  }

  return helpers.decodeChartContent(content).chartType;
}

export function formatDrillLabel(
  type: InspectorDrillType,
  item: unknown,
  index: number = 0,
  helpers: DrillHighlightDomainHelpers
): string {
  const pageNumber = getDrillPageNumber(type, item);

  if (type === "sticky") {
    return `페이지 ${pageNumber} · ${formatDrillSnippet(getStickyDrillText(item as SubjectPdfWorkspace["stickyNotes"][number]), "(빈 메모)")}`;
  }

  if (type === "textbox") {
    const textBox = item as Partial<PdfTextBox>;
    return `페이지 ${pageNumber} · ${formatDrillSnippet(typeof textBox.content === "string" ? textBox.content : "", "(빈 텍스트)")}`;
  }

  if (type === "checklist") {
    return `페이지 ${pageNumber} · ${formatDrillSnippet(getChecklistDrillText(item as PdfChecklist), "(빈 체크리스트)")}`;
  }

  if (type === "table") {
    return `페이지 ${pageNumber} · ${formatDrillSnippet(getTableDrillText(item as PdfTable, helpers), "(빈 표)")}`;
  }

  if (type === "chart") {
    const chart = item as Partial<PdfChart>;
    const content = typeof chart.content === "string" ? chart.content : "";
    const typeLabel = getChartDrillTypeLabel(content, helpers);
    const pointCount = helpers.decodeChartContent(content).points.length;
    return `페이지 ${pageNumber} · ${escapeHtml(typeLabel)} (${pointCount} points)`;
  }

  const stroke = item as Partial<PdfInkStroke>;
  const pointCount = Array.isArray(stroke.points) ? stroke.points.length : 0;
  return `페이지 ${pageNumber} · stroke #${index + 1} (점 ${pointCount}개)`;
}

function getDrillItemId(type: InspectorDrillType, item: unknown, index: number): string {
  const candidate = item as { id?: unknown; strokeId?: unknown };
  const id = typeof candidate.id === "string"
    ? candidate.id
    : typeof candidate.strokeId === "string"
      ? candidate.strokeId
      : "";
  return id.length > 0 ? id : `${type}-${index}`;
}

export function getInspectorDrillEntries(type: InspectorDrillType, workspace: SubjectPdfWorkspace): InspectorDrillEntry[] {
  const items: unknown[] =
    type === "sticky" ? workspace.stickyNotes :
    type === "ink" ? workspace.inkStrokes :
    type === "textbox" ? workspace.textBoxes :
    type === "checklist" ? workspace.checklists :
    type === "table" ? workspace.tables :
    workspace.charts;

  return items
    .map((item, index) => ({
      id: getDrillItemId(type, item, index),
      index,
      item,
      pageNumber: getDrillPageNumber(type, item)
    }))
    .sort((a, b) => a.pageNumber - b.pageNumber || a.index - b.index);
}

// ─── Render helpers ──────────────────────────────────────────────────────

export function renderDrillList(
  type: InspectorDrillType,
  workspace: SubjectPdfWorkspace,
  subjectId: string,
  helpers: DrillHighlightDomainHelpers
): string {
  const entries = getInspectorDrillEntries(type, workspace);
  const visible = entries.slice(0, DRILL_LIST_LIMIT);
  const hiddenCount = entries.length - visible.length;
  const itemsHtml = visible.length > 0
    ? visible.map((entry) => `
        <li>
          <button
            type="button"
            class="pdf-inspector-drill-item"
            data-action="select-drill-item"
            data-drill-type="${escapeHtml(type)}"
            data-subject-id="${escapeHtml(subjectId)}"
            data-annotation-id="${escapeHtml(entry.id)}"
            data-page-number="${escapeHtml(String(entry.pageNumber))}"
          >${formatDrillLabel(type, entry.item, entry.index, helpers)}</button>
        </li>
      `).join("")
    : `<li class="pdf-inspector-drill-empty">없음</li>`;
  const moreHtml = hiddenCount > 0
    ? `<li class="pdf-inspector-drill-more">+ ${hiddenCount}개 더 있음</li>`
    : "";

  return `
    <ul class="pdf-inspector-drill-list" data-drill-type="${escapeHtml(type)}">
      ${itemsHtml}
      ${moreHtml}
    </ul>
  `;
}

export function renderInspectorStatRow(
  type: InspectorDrillType,
  label: string,
  count: number,
  workspace: SubjectPdfWorkspace,
  subjectId: string,
  helpers: DrillHighlightDomainHelpers
): string {
  const isExpanded = inspectorDrillState[type] === true;

  return `
    <div class="pdf-inspector-stat-row">
      <button
        type="button"
        class="pdf-inspector-drill-toggle"
        data-action="toggle-inspector-drill"
        data-drill-type="${escapeHtml(type)}"
        aria-expanded="${isExpanded ? "true" : "false"}"
      >
        <span class="pdf-inspector-stat-label">${escapeHtml(label)}</span>
        <span class="pdf-inspector-stat-count">${count}개</span>
        <span class="pdf-inspector-drill-caret" aria-hidden="true">▾</span>
      </button>
      ${isExpanded ? renderDrillList(type, workspace, subjectId, helpers) : ""}
    </div>
  `;
}

// ─── Test reset ──────────────────────────────────────────────────────────

/**
 * spec only. clears module-private state between cases.
 */
export function __resetDrillHighlightForTest(): void {
  pendingDrillHighlight = null;
  activeDrillHighlights.clear();
  for (const timer of activeDrillHighlightTimers.values()) {
    clearTimeout(timer);
  }
  activeDrillHighlightTimers.clear();
  inspectorDrillState = getDefaultInspectorDrill();
}

/**
 * spec only. inspect module-private state.
 */
export function __peekDrillHighlightForTest() {
  return {
    pending: pendingDrillHighlight,
    activeCount: activeDrillHighlights.size,
    timersCount: activeDrillHighlightTimers.size,
    inspectorDrill: inspectorDrillState
  };
}
