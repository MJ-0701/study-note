// sprint-2026-W22-sprint-3 / layer B/slice-2g — chart render widget module.
// main.ts 의 chart widget (render + state handler + SVG builder + debounce)
// 단일 module 분리. slice-2f/i (chart-content leaf) + slice-2f/ii (markdown-table)
// 분리 후 chart widget aggregate 만 남았다.
//
// pattern (slice-2c ink-stroke / slice-2d drill-highlight 일관):
//   - ChartWidgetContext (broad selector 노출 X — getWorkspace 만)
//   - ChartWidgetCallbacks (updateWorkspace mutate path)
//   - module-private debounce state (외부 mutate X)
//   - named export 만; handler signature = (ctx, cb, ...args)
//
// invariant:
//   (a) render = DOM tree (innerHTML 0). textContent / setAttribute / dataset /
//       input.value / createElementNS only.
//   (b) renderChartMount template string attribute = escapeHtml() 통과.
//   (c) chartId selector injection 방어 = dataset.chartId === chartId 비교
//       (CSS.escape fallback). 모든 selector 보간 site 적용.
//   (d) debounce map = module-private state. removeChart 만 cleanup.
//   (e) handler = workspace store mutate only (DOM 직접 mutate X).
//   (f) SVG builder = parent.appendChild 만, parent.replaceChildren 으로 reset.
//   (g) refreshChartWidgets idempotent.

import {
  type CsvSeriesPoint,
  type LocalChartFunction,
  type LocalChartType,
  decodeChartContent,
  encodeChartContent,
  normalizeChartInputValue
} from "./chart-content.ts";
import { escapeHtml } from "../app/escape-html.ts";
import type { PdfChart, SubjectPdfWorkspace } from "@study-note/domain";
import {
  createChart,
  deleteChart,
  moveChart,
  toggleChartCollapsed,
  updateChartContent
} from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

export interface ChartWidgetContext {
  getWorkspace: (subjectId: string) => SubjectPdfWorkspace;
}

export interface ChartWidgetCallbacks {
  updateWorkspace: (
    subjectId: string,
    updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
  ) => void;
}

// ─── Public constants ────────────────────────────────────────────────────

export const CHART_PLOT_LEFT = 6;
export const CHART_PLOT_RIGHT = 94;
export const CHART_PLOT_TOP = 4;
export const CHART_PLOT_BOTTOM = 22;
export const CHART_PLOT_WIDTH = CHART_PLOT_RIGHT - CHART_PLOT_LEFT;
export const CHART_PLOT_HEIGHT = CHART_PLOT_BOTTOM - CHART_PLOT_TOP;

const CHART_PLANE_COLOR = "#111111";
const SVG_NS = "http://www.w3.org/2000/svg";

// ─── Module-private state (debounce maps) ────────────────────────────────

// chartContentDebounceMap was used by removed scheduleChartContentUpdate (slice-3).
// slice-5 uses chartPointDebounceMap instead. Kept here for removeChart's clearTimeout.
const chartContentDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

// sprint-13/slice-5: per-chart debounce for data-point editing.
// Key = chartId. No renderApp in callback to avoid focus loss.
const chartPointDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

// ─── Public exports — state handlers ─────────────────────────────────────

export function addChart(
  context: ChartWidgetContext,
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  position: { x: number; y: number }
): void {
  const workspace = context.getWorkspace(subjectId);
  const page = workspace.material?.selectedPage ?? 1;
  const chart = createChart({ subjectId, page, position });

  callbacks.updateWorkspace(subjectId, (current) => ({
    ...current,
    charts: [...current.charts, chart]
  }));
}

export function removeChart(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string
): void {
  const prev = chartContentDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartContentDebounceMap.delete(chartId);
  // sprint-13/slice-5: also cancel any pending point debounce
  const prev2 = chartPointDebounceMap.get(chartId);
  if (prev2) clearTimeout(prev2);
  chartPointDebounceMap.delete(chartId);

  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: deleteChart(workspace.charts, chartId)
  }));
}

export function applyChartMove(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string,
  position: { x: number; y: number }
): void {
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? moveChart(chart, position) : chart
    )
  }));
}

export function applyChartCollapseToggle(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string
): void {
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? toggleChartCollapsed(chart) : chart
    )
  }));
}

/**
 * 외부 caller (예: pdf-workspace bridge) 가 chartId 의 pending point debounce
 * timer 를 cancel 할 수 있게 한다. module-private map 직접 access 차단.
 */
export function clearChartPointDebounce(chartId: string): void {
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
}

export function scheduleChartPointUpdate(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string,
  content: string
): void {
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  const handle = setTimeout(() => {
    chartPointDebounceMap.delete(chartId);
    callbacks.updateWorkspace(subjectId, (workspace) => ({
      ...workspace,
      charts: workspace.charts.map((chart) =>
        chart.id === chartId ? updateChartContent(chart, content) : chart
      )
    }));
  }, 300);
  chartPointDebounceMap.set(chartId, handle);
}

/**
 * AC9(c): chartId selector injection 방어. dataset.chartId === chartId
 * 비교만 사용 — `[data-chart-id="${chartId}"]` template literal 보간 안 함.
 */
function findChartArticle(chartId: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>("[data-chart-id]");
  for (const el of all) {
    if (el.dataset.chartId === chartId && el.tagName.toLowerCase() === "article") {
      return el;
    }
  }
  return null;
}

/**
 * Reads current chart data (chartType + points) from the DOM inputs.
 * Used by structural operations (add/delete point) that must collect all values before mutating.
 */
export function readChartDataFromDom(
  chartId: string
): { chartType: LocalChartType; points: CsvSeriesPoint[] } | null {
  const article = findChartArticle(chartId);
  if (!article) return null;

  // 본 article scope 안에서 element 찾기 (chartId 보간 X).
  let typeSelect: HTMLSelectElement | null = null;
  for (const el of article.querySelectorAll<HTMLSelectElement>(
    'select[data-action="update-chart-type"]'
  )) {
    if (el.dataset.chartId === chartId) {
      typeSelect = el;
      break;
    }
  }
  const rawType = typeSelect?.value ?? "xy";
  const chartType: LocalChartType = rawType === "bar" || rawType === "trig" ? rawType : "xy";

  let countEl: HTMLElement | null = null;
  for (const el of article.querySelectorAll<HTMLElement>("[data-chart-point-count]")) {
    countEl = el;
    break;
  }
  const pointCount = Number(countEl?.dataset.chartPointCount ?? "0");

  const points: CsvSeriesPoint[] = Array.from({ length: pointCount }, (_, idx) => {
    const labelInp =
      findInputByAction(article, "update-chart-point-x", String(idx)) ??
      findInputByAction(article, "update-chart-point-label", String(idx));
    const valueInp = findInputByAction(article, "update-chart-point-value", String(idx));
    return {
      label: labelInp ? labelInp.value : "",
      value: valueInp ? normalizeChartInputValue(valueInp.value) : 0
    };
  });

  return { chartType, points };
}

/**
 * AC9(c): pointIdx selector safety — dataset 비교만.
 */
function findInputByAction(
  article: HTMLElement,
  action: string,
  pointIdx?: string
): HTMLInputElement | null {
  const candidates = article.querySelectorAll<HTMLInputElement>(`input[data-action="${action}"]`);
  for (const el of candidates) {
    if (pointIdx === undefined || el.dataset.pointIdx === pointIdx) {
      return el;
    }
  }
  return null;
}

export function applyAddChartPoint(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string
): void {
  const current = readChartDataFromDom(chartId);
  if (!current) return;
  const nextX = getNextChartXValue(current.points);
  const newPoints = [...current.points, { label: formatChartNumber(nextX), value: 0 }];
  const content = encodeChartContent(current.chartType, newPoints);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
    )
  }));
}

export function applyDeleteChartPoint(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string,
  pointIndex: number
): void {
  const current = readChartDataFromDom(chartId);
  if (!current) return;
  const newPoints = current.points.filter((_, i) => i !== pointIndex);
  const content = encodeChartContent(current.chartType, newPoints);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
    )
  }));
}

export function applyClearChartPoints(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string
): void {
  const current = readChartDataFromDom(chartId);
  const chartType = current?.chartType ?? "xy";
  const content = encodeChartContent(chartType, []);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
    )
  }));
}

export function applyFillChartFunction(
  callbacks: ChartWidgetCallbacks,
  subjectId: string,
  chartId: string
): void {
  const config = readChartFunctionConfigFromDom(chartId);
  if (!config) return;
  const points = buildFunctionChartPoints(config.functionType, config.xMin, config.xMax, config.samples);
  const content = encodeChartContent(config.functionType, points);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  callbacks.updateWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
    )
  }));
}

// ─── private utilities ───────────────────────────────────────────────────

interface CoordinateChartPoint {
  point: CsvSeriesPoint;
  xValue: number;
  yValue: number;
}

function parseChartXValue(point: CsvSeriesPoint, fallbackIndex: number): number {
  const x = Number(point.label.trim());
  return Number.isFinite(x) ? x : fallbackIndex;
}

function getCoordinateChartPoints(points: CsvSeriesPoint[]): CoordinateChartPoint[] {
  const safePoints = points.filter((point) => Number.isFinite(point.value));
  const coordinates = safePoints.map((point, index) => ({
    point,
    xValue: parseChartXValue(point, index),
    yValue: point.value
  }));

  return coordinates.sort((a, b) => a.xValue - b.xValue);
}

export function getNextChartXValue(points: CsvSeriesPoint[]): number {
  const xValues = points
    .map((point, index) => parseChartXValue(point, index))
    .filter((value) => Number.isFinite(value));
  if (xValues.length === 0) return 0;
  return Math.max(...xValues) + 1;
}

function formatChartNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number(value.toFixed(4)).toString();
}

function shouldRenderChartLabel(index: number, total: number): boolean {
  if (total <= 6) return true;
  return index === 0 || index === Math.floor((total - 1) / 2) || index === total - 1;
}

function formatChartPointLabel(point: CsvSeriesPoint): string {
  const xLabel = point.label.trim().length > 0 ? point.label.trim() : "0";
  return "(" + xLabel + ", " + formatChartNumber(point.value) + ")";
}

function mapChartXValue(value: number, xMin: number, xMax: number): number {
  const xRange = xMax - xMin;
  return xRange === 0 ? 50 : CHART_PLOT_LEFT + ((value - xMin) / xRange) * CHART_PLOT_WIDTH;
}

function mapChartYValue(value: number, yMin: number, yMax: number): number {
  const yRange = yMax - yMin;
  return yRange === 0 ? 15 : CHART_PLOT_BOTTOM - ((value - yMin) / yRange) * CHART_PLOT_HEIGHT;
}

function appendChartLabel(
  parent: SVGElement,
  point: CsvSeriesPoint,
  x: number,
  total: number
): void {
  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("x", x.toFixed(2));
  label.setAttribute("y", "29");
  label.setAttribute("font-size", "4");
  label.setAttribute("data-chart-point-label", "true");
  const textAnchor = total === 1
    ? "middle"
    : x <= CHART_PLOT_LEFT
      ? "start"
      : x >= CHART_PLOT_RIGHT
        ? "end"
        : "middle";
  label.setAttribute("text-anchor", textAnchor);
  label.textContent = formatChartPointLabel(point);
  parent.append(label);
}

function appendChartLine(
  parent: SVGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: { opacity: string; strokeWidth: string; dataName?: string; dataValue?: string }
): SVGLineElement {
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", x1.toFixed(2));
  line.setAttribute("x2", x2.toFixed(2));
  line.setAttribute("y1", y1.toFixed(2));
  line.setAttribute("y2", y2.toFixed(2));
  line.setAttribute("stroke", CHART_PLANE_COLOR);
  line.setAttribute("stroke-width", options.strokeWidth);
  line.setAttribute("opacity", options.opacity);
  if (options.dataName && options.dataValue) {
    line.setAttribute(options.dataName, options.dataValue);
  }
  parent.append(line);
  return line;
}

export function appendChartCoordinatePlane(
  parent: SVGElement,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const frame = document.createElementNS(SVG_NS, "rect");
  frame.setAttribute("x", String(CHART_PLOT_LEFT));
  frame.setAttribute("y", String(CHART_PLOT_TOP));
  frame.setAttribute("width", String(CHART_PLOT_WIDTH));
  frame.setAttribute("height", String(CHART_PLOT_HEIGHT));
  frame.setAttribute("fill", "none");
  frame.setAttribute("stroke", CHART_PLANE_COLOR);
  frame.setAttribute("stroke-width", "0.35");
  frame.setAttribute("opacity", "0.22");
  frame.setAttribute("data-chart-plane", "frame");
  parent.append(frame);

  [0.25, 0.5, 0.75].forEach((ratio) => {
    const x = CHART_PLOT_LEFT + CHART_PLOT_WIDTH * ratio;
    const y = CHART_PLOT_TOP + CHART_PLOT_HEIGHT * ratio;
    appendChartLine(parent, x, CHART_PLOT_TOP, x, CHART_PLOT_BOTTOM, {
      opacity: "0.12",
      strokeWidth: "0.25",
      dataName: "data-chart-plane",
      dataValue: "grid"
    });
    appendChartLine(parent, CHART_PLOT_LEFT, y, CHART_PLOT_RIGHT, y, {
      opacity: "0.12",
      strokeWidth: "0.25",
      dataName: "data-chart-plane",
      dataValue: "grid"
    });
  });

  const xAxisY = yRange === 0
    ? 15
    : yMin <= 0 && yMax >= 0
      ? mapChartYValue(0, yMin, yMax)
      : yMin > 0
        ? CHART_PLOT_BOTTOM
        : CHART_PLOT_TOP;
  const yAxisX = xRange === 0
    ? 50
    : xMin <= 0 && xMax >= 0
      ? mapChartXValue(0, xMin, xMax)
      : xMin > 0
        ? CHART_PLOT_LEFT
        : CHART_PLOT_RIGHT;

  appendChartLine(parent, CHART_PLOT_LEFT, xAxisY, CHART_PLOT_RIGHT, xAxisY, {
    opacity: "0.7",
    strokeWidth: "0.75",
    dataName: "data-chart-axis",
    dataValue: "x"
  });
  appendChartLine(parent, yAxisX, CHART_PLOT_TOP, yAxisX, CHART_PLOT_BOTTOM, {
    opacity: "0.7",
    strokeWidth: "0.75",
    dataName: "data-chart-axis",
    dataValue: "y"
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const cx = CHART_PLOT_LEFT + CHART_PLOT_WIDTH * ratio;
    const xValue = xMin + xRange * ratio;
    const tick = document.createElementNS(SVG_NS, "text");
    tick.setAttribute("x", cx.toFixed(2));
    tick.setAttribute("y", String(xAxisY >= CHART_PLOT_BOTTOM - 1 ? xAxisY - 1 : xAxisY + 2.6));
    tick.setAttribute("font-size", "2.8");
    tick.setAttribute("fill", CHART_PLANE_COLOR);
    tick.setAttribute("opacity", "0.75");
    tick.setAttribute("text-anchor", ratio === 0 ? "start" : ratio === 1 ? "end" : "middle");
    tick.setAttribute("data-chart-axis-tick", "x");
    tick.textContent = formatChartNumber(xValue);
    parent.append(tick);
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const cy = CHART_PLOT_TOP + CHART_PLOT_HEIGHT * ratio;
    const yValue = yMax - yRange * ratio;
    const isLeftEdgeAxis = yAxisX <= CHART_PLOT_LEFT + 1;
    const tick = document.createElementNS(SVG_NS, "text");
    tick.setAttribute("x", String(isLeftEdgeAxis ? yAxisX + 1.2 : yAxisX - 1.2));
    tick.setAttribute("y", String(cy + 0.9));
    tick.setAttribute("font-size", "2.8");
    tick.setAttribute("fill", CHART_PLANE_COLOR);
    tick.setAttribute("opacity", "0.75");
    tick.setAttribute("text-anchor", isLeftEdgeAxis ? "start" : "end");
    tick.setAttribute("data-chart-axis-tick", "y");
    tick.textContent = formatChartNumber(yValue);
    parent.append(tick);
  });

  const xLabel = document.createElementNS(SVG_NS, "text");
  xLabel.setAttribute("x", "96");
  xLabel.setAttribute("y", String(xAxisY >= CHART_PLOT_BOTTOM - 1 ? CHART_PLOT_BOTTOM - 1.2 : xAxisY + 3.8));
  xLabel.setAttribute("font-size", "3.8");
  xLabel.setAttribute("fill", CHART_PLANE_COLOR);
  xLabel.setAttribute("text-anchor", "start");
  xLabel.setAttribute("data-chart-axis-label", "x");
  xLabel.textContent = "X";
  parent.append(xLabel);

  const yLabel = document.createElementNS(SVG_NS, "text");
  yLabel.setAttribute("x", String(Math.min(CHART_PLOT_RIGHT - 1.5, Math.max(CHART_PLOT_LEFT + 1.5, yAxisX + 2))));
  yLabel.setAttribute("y", "3.2");
  yLabel.setAttribute("font-size", "3.8");
  yLabel.setAttribute("fill", CHART_PLANE_COLOR);
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("data-chart-axis-label", "y");
  yLabel.textContent = "Y";
  parent.append(yLabel);
}

function mapCoordinateChartPoints(
  points: CoordinateChartPoint[],
  yBounds?: { min: number; max: number }
): Array<{
  point: CsvSeriesPoint;
  x: number;
  y: number;
}> {
  const xValues = points.map((point) => point.xValue);
  const yValues = points.map((point) => point.yValue);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = yBounds ? yBounds.min : Math.min(...yValues);
  const yMax = yBounds ? yBounds.max : Math.max(...yValues);
  return points.map((point) => ({
    point: point.point,
    x: mapChartXValue(point.xValue, xMin, xMax),
    y: mapChartYValue(point.yValue, yMin, yMax)
  }));
}

export function splitCoordsByJump(
  coords: Array<{ x: number; y: number; point: CsvSeriesPoint }>,
  pixelJumpThreshold: number = 15
): Array<Array<{ x: number; y: number; point: CsvSeriesPoint }>> {
  const segments: Array<Array<{ x: number; y: number; point: CsvSeriesPoint }>> = [];
  let current: Array<{ x: number; y: number; point: CsvSeriesPoint }> = [];
  for (let i = 0; i < coords.length; i++) {
    const cur = coords[i];
    if (!cur) continue;
    if (current.length === 0) {
      current.push(cur);
      continue;
    }
    const prev = current[current.length - 1];
    if (prev && Math.abs(cur.y - prev.y) > pixelJumpThreshold) {
      segments.push(current);
      current = [cur];
    } else {
      current.push(cur);
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }
  return segments;
}

export function buildPolylineChartSvg(
  parent: SVGElement,
  points: CsvSeriesPoint[],
  options: { markers: boolean; labels?: boolean; discontinuous?: boolean; yBounds?: { min: number; max: number } }
): void {
  parent.replaceChildren();
  parent.setAttribute("viewBox", "0 0 100 30");

  const coordinates = getCoordinateChartPoints(points);

  if (coordinates.length === 0) {
    appendChartCoordinatePlane(
      parent,
      -1,
      1,
      options.yBounds ? options.yBounds.min : -1,
      options.yBounds ? options.yBounds.max : 1
    );
    return;
  }

  const xValues = coordinates.map((point) => point.xValue);
  const yValues = coordinates.map((point) => point.yValue);
  appendChartCoordinatePlane(
    parent,
    Math.min(...xValues),
    Math.max(...xValues),
    options.yBounds ? options.yBounds.min : Math.min(...yValues),
    options.yBounds ? options.yBounds.max : Math.max(...yValues)
  );

  const coords = mapCoordinateChartPoints(coordinates, options.yBounds);

  if (coords.length === 1) {
    const coord = coords[0];
    if (!coord) return;

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", coord.x.toFixed(2));
    circle.setAttribute("cy", coord.y.toFixed(2));
    circle.setAttribute("r", "2");
    circle.setAttribute("fill", "currentColor");
    parent.append(circle);
    if (options.labels !== false) {
      appendChartLabel(parent, coord.point, coord.x, coords.length);
    }
    return;
  }

  const renderPolyline = (segment: Array<{ x: number; y: number; point: CsvSeriesPoint }>) => {
    const polyline = document.createElementNS(SVG_NS, "polyline");
    polyline.setAttribute(
      "points",
      segment.map((coord) => coord.x.toFixed(2) + "," + coord.y.toFixed(2)).join(" ")
    );
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "currentColor");
    polyline.setAttribute("stroke-width", "1.6");
    polyline.setAttribute("stroke-linecap", "round");
    polyline.setAttribute("stroke-linejoin", "round");
    parent.append(polyline);
  };

  if (options.discontinuous === true) {
    splitCoordsByJump(coords).forEach(renderPolyline);
  } else {
    renderPolyline(coords);
  }

  coords.forEach((coord, index) => {
    if (options.markers) {
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", coord.x.toFixed(2));
      circle.setAttribute("cy", coord.y.toFixed(2));
      circle.setAttribute("r", "1.35");
      circle.setAttribute("fill", "currentColor");
      parent.append(circle);
    }

    if (options.labels !== false && shouldRenderChartLabel(index, coords.length)) {
      appendChartLabel(parent, coord.point, coord.x, coords.length);
    }
  });
}

function normalizeChartFunction(rawFunction: string | undefined): LocalChartFunction {
  if (rawFunction === "cos" || rawFunction === "tan") {
    return rawFunction;
  }

  return "sin";
}

export function buildFunctionChartPoints(
  functionType: LocalChartFunction,
  xMin: number,
  xMax: number,
  samples: number
): CsvSeriesPoint[] {
  const safeMin = Number.isFinite(xMin) ? xMin : -Math.PI;
  const safeMax = Number.isFinite(xMax) && xMax > safeMin ? xMax : Math.PI;
  const safeSamples = Math.min(121, Math.max(2, Math.round(samples)));
  const evaluate = (x: number): number => {
    if (functionType === "cos") return Math.cos(x);
    if (functionType === "tan") return Math.tan(x);
    return Math.sin(x);
  };
  const yMin = functionType === "tan" ? -10 : -1;
  const yMax = functionType === "tan" ? 10 : 1;

  return Array.from({ length: safeSamples }, (_, index) => {
    const x = safeMin + ((safeMax - safeMin) * index) / (safeSamples - 1);
    const y = evaluate(x);
    return { label: formatChartNumber(x), value: Number.isFinite(y) ? Number(y.toFixed(4)) : 0 };
  }).filter((point) => Number.isFinite(point.value) && point.value >= yMin && point.value <= yMax);
}

function readChartFunctionConfigFromDom(chartId: string): {
  functionType: LocalChartFunction;
  xMin: number;
  xMax: number;
  samples: number;
} | null {
  const article = findChartArticle(chartId);
  if (!article) return null;

  let fnSel: HTMLSelectElement | null = null;
  for (const el of article.querySelectorAll<HTMLSelectElement>(
    'select[data-action="select-chart-function"]'
  )) {
    if (el.dataset.chartId === chartId) {
      fnSel = el;
      break;
    }
  }

  const xMinEl = findChartFunctionInput(article, "set-chart-function-x-min", chartId);
  const xMaxEl = findChartFunctionInput(article, "set-chart-function-x-max", chartId);
  const samplesEl = findChartFunctionInput(article, "set-chart-function-samples", chartId);

  return {
    functionType: normalizeChartFunction(fnSel?.value),
    xMin: xMinEl ? normalizeChartInputValue(xMinEl.value) : -Math.PI,
    xMax: xMaxEl ? normalizeChartInputValue(xMaxEl.value) : Math.PI,
    samples: samplesEl ? normalizeChartInputValue(samplesEl.value) : 49
  };
}

function findChartFunctionInput(
  article: HTMLElement,
  action: string,
  chartId: string
): HTMLInputElement | null {
  for (const el of article.querySelectorAll<HTMLInputElement>(`input[data-action="${action}"]`)) {
    if (el.dataset.chartId === chartId) return el;
  }
  return null;
}

function buildCoordinateLineChartSvg(parent: SVGElement, points: CsvSeriesPoint[]): void {
  buildPolylineChartSvg(parent, points, { markers: true });
}

export function buildTrigChartSvg(
  parent: SVGElement,
  points: CsvSeriesPoint[],
  functionType: LocalChartFunction
): void {
  const isTan = functionType === "tan";
  buildPolylineChartSvg(parent, points, {
    markers: false,
    labels: false,
    discontinuous: isTan,
    yBounds: isTan ? { min: -10, max: 10 } : { min: -1, max: 1 }
  });
}

/**
 * Renders bar chart SVG into parent. Each point = one <rect> bar, height normalized to viewBox.
 * viewBox = "0 0 100 30". O(n) where n = number of safe points.
 */
function buildBarChartSvg(parent: SVGElement, points: CsvSeriesPoint[]): void {
  parent.replaceChildren();
  parent.setAttribute("viewBox", "0 0 100 30");

  const safePoints = points.filter((point) => Number.isFinite(point.value));

  if (safePoints.length === 0) {
    return;
  }

  const values = safePoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const toBarHeight = (value: number): number => {
    if (range === 0) {
      return 12;
    }

    const ratio = Math.min(1, Math.max(0, (value - min) / range));
    return ratio * 18 + 2;
  };

  const barWidth = safePoints.length === 1 ? 14 : Math.max(2, 90 / safePoints.length - 1);
  const gap = safePoints.length === 1 ? 0 : (90 - barWidth * safePoints.length) / (safePoints.length - 1);
  const startX = 5;

  safePoints.forEach((point, index) => {
    const barH = toBarHeight(point.value);
    const x = startX + index * (barWidth + (safePoints.length === 1 ? 0 : gap));
    const y = 22 - barH;

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x.toFixed(2));
    rect.setAttribute("y", y.toFixed(2));
    rect.setAttribute("width", barWidth.toFixed(2));
    rect.setAttribute("height", barH.toFixed(2));
    rect.setAttribute("fill", "currentColor");
    parent.append(rect);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", (x + barWidth / 2).toFixed(2));
    label.setAttribute("y", "29");
    label.setAttribute("font-size", "4");
    const textAnchor = safePoints.length === 1
      ? "middle"
      : index === 0
        ? "start"
        : index === safePoints.length - 1
          ? "end"
          : "middle";
    label.setAttribute("text-anchor", textAnchor);
    label.textContent = formatChartPointLabel(point);
    parent.append(label);
  });
}

/**
 * Dispatches to the right SVG builder based on LocalChartType.
 */
function buildChartSvg(
  parent: SVGElement,
  chartType: LocalChartType,
  points: CsvSeriesPoint[],
  functionType: LocalChartFunction = "sin"
): void {
  if (chartType === "bar") {
    buildBarChartSvg(parent, points);
  } else if (chartType === "trig") {
    buildTrigChartSvg(parent, points, functionType);
  } else {
    buildCoordinateLineChartSvg(parent, points);
  }
}

// sprint-13/slice-5: refreshChartPreview updates SVG preview in-place after point input.
// Called in debounce-free path (input event immediate feedback).
export function refreshChartPreview(
  chartId: string,
  chartType: LocalChartType,
  points: CsvSeriesPoint[],
  functionType?: LocalChartFunction
): void {
  // AC9(c): chartId selector injection 방어 — dataset 비교만.
  let preview: SVGElement | null = null;
  for (const el of document.querySelectorAll<SVGElement>("[data-chart-preview-id]")) {
    if (el.dataset.chartPreviewId === chartId) {
      preview = el;
      break;
    }
  }
  if (!preview) return;

  buildChartSvg(preview, chartType, points, functionType);
}

export function refreshChartWidgets(context: ChartWidgetContext): void {
  document
    .querySelectorAll<HTMLElement>("[data-chart-mount-id]")
    .forEach((mount) => {
      const subjectId = mount.dataset.subjectId;
      const chartId = mount.dataset.chartMountId;

      if (!subjectId || !chartId) {
        return;
      }

      const workspace = context.getWorkspace(subjectId);
      const chart = workspace.charts.find((item) => item.id === chartId);

      if (!chart) {
        mount.remove();
        return;
      }

      mount.replaceWith(renderChart(subjectId, chart));
    });
}

// ─── Render ──────────────────────────────────────────────────────────────

export function renderChartMount(subjectId: string, chart: PdfChart): string {
  // AC9(b): template string attribute = escapeHtml() 통과 (chart.id + subjectId).
  return `
    <div
      data-chart-mount-id="${escapeHtml(chart.id)}"
      data-subject-id="${escapeHtml(subjectId)}"
    ></div>
  `;
}

export function renderChart(subjectId: string, chart: PdfChart): HTMLElement {
  const isCollapsed = chart.collapsed !== false;
  const bodyId = "pdf-chart-body-" + chart.id;
  const { chartType, points, functionType } = decodeChartContent(chart.content);

  const article = document.createElement("article");
  article.className = "pdf-chart" + (isCollapsed ? " is-collapsed" : "");
  article.dataset.chartId = chart.id;
  article.style.left = String(chart.position.x * 100) + "%";
  article.style.top = String(chart.position.y * 100) + "%";

  // --- header ---
  const header = document.createElement("div");
  header.className = "pdf-chart-header";
  header.dataset.action = "chart-drag-handle";
  header.dataset.chartId = chart.id;
  header.setAttribute("aria-label", "그래프 이동");
  header.setAttribute("role", "button");
  header.tabIndex = 0;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "pdf-chart-toggle";
  toggle.dataset.action = "toggle-chart-collapsed";
  toggle.dataset.subjectId = subjectId;
  toggle.dataset.chartId = chart.id;
  toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  toggle.setAttribute("aria-controls", bodyId);
  toggle.setAttribute("aria-label", isCollapsed ? "그래프 펼치기" : "그래프 접기");
  toggle.textContent = isCollapsed ? "▶" : "▼";

  const titleSpan = document.createElement("span");
  titleSpan.className = "pdf-chart-title";
  titleSpan.textContent = "그래프";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "pdf-chart-delete";
  remove.dataset.action = "delete-chart";
  remove.dataset.subjectId = subjectId;
  remove.dataset.chartId = chart.id;
  remove.setAttribute("aria-label", "그래프 삭제");
  remove.textContent = "✕";

  header.append(toggle, titleSpan, remove);

  // --- body ---
  const body = document.createElement("div");
  body.className = "pdf-chart-body";
  body.id = bodyId;
  body.dataset.hiddenWhenCollapsed = "";

  // chart type select
  const typeSelect = document.createElement("select");
  typeSelect.className = "pdf-chart-type-select";
  typeSelect.dataset.action = "update-chart-type";
  typeSelect.dataset.subjectId = subjectId;
  typeSelect.dataset.chartId = chart.id;
  typeSelect.setAttribute("aria-label", "차트 종류");

  const typeOptions: Array<{ value: LocalChartType; label: string }> = [
    { value: "xy", label: "좌표 직접 입력 (x,y)" },
    { value: "trig", label: "삼각함수" },
    { value: "bar", label: "막대" }
  ];
  typeOptions.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === chartType) {
      opt.selected = true;
    }
    typeSelect.append(opt);
  });

  const inputGuide = document.createElement("div");
  inputGuide.className = "pdf-chart-input-guide";
  inputGuide.textContent = chartType === "trig"
    ? "sin/cos/tan 선택 후 x 범위를 정하면 y=f(x)로 계산합니다. tan 은 ±π/2 근방에서 path 가 끊어집니다."
    : chartType === "bar"
      ? "각 항목의 x 라벨과 y 값을 직접 입력합니다."
      : "각 행의 x 좌표와 y 좌표를 직접 입력합니다. 예: (-1, 1), (0, 0), (1, 1).";

  // SVG preview stays above the generated coordinate rows so function fill does not push it away.
  const preview = document.createElementNS(SVG_NS, "svg");
  preview.setAttribute("class", "pdf-chart-preview");
  preview.setAttribute("data-chart-preview-id", chart.id);
  preview.setAttribute("xmlns", SVG_NS);
  buildChartSvg(preview, chartType, points, functionType);

  // data point list container
  const dataContainer = document.createElement("div");
  dataContainer.className = "pdf-chart-data";
  // data-chart-point-count is read by readChartDataFromDom to know how many rows to scan
  dataContainer.dataset.chartPointCount = String(points.length);

  points.forEach((point, idx) => {
    dataContainer.append(buildChartPointRow(subjectId, chart.id, idx, point));
  });

  const addPointBtn = document.createElement("button");
  addPointBtn.type = "button";
  addPointBtn.className = "pdf-chart-add-point";
  addPointBtn.dataset.action = "add-chart-point";
  addPointBtn.dataset.subjectId = subjectId;
  addPointBtn.dataset.chartId = chart.id;
  addPointBtn.textContent = "+ 좌표";

  const clearPointsBtn = document.createElement("button");
  clearPointsBtn.type = "button";
  clearPointsBtn.className = "pdf-chart-clear-points";
  clearPointsBtn.dataset.action = "clear-chart-points";
  clearPointsBtn.dataset.subjectId = subjectId;
  clearPointsBtn.dataset.chartId = chart.id;
  clearPointsBtn.textContent = "좌표 전체 지우기";

  const pointActions = document.createElement("div");
  pointActions.className = "pdf-chart-point-actions";
  pointActions.append(addPointBtn, clearPointsBtn);

  body.append(typeSelect, inputGuide);
  if (chartType === "trig") {
    body.append(buildChartFunctionControls(subjectId, chart.id, functionType ?? "sin"), preview);
  } else {
    body.append(preview, dataContainer, pointActions);
  }
  article.append(header, body);
  return article;
}

function buildChartFunctionControls(
  subjectId: string,
  chartId: string,
  selectedFunctionType: LocalChartFunction = "sin"
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "pdf-chart-function-controls";

  const title = document.createElement("div");
  title.className = "pdf-chart-function-title";
  title.textContent = "삼각함수 렌더링";

  const fnLabel = document.createElement("label");
  fnLabel.className = "pdf-chart-function-field";
  const fnText = document.createElement("span");
  fnText.textContent = "함수";
  const fnSelect = document.createElement("select");
  fnSelect.dataset.action = "select-chart-function";
  fnSelect.dataset.chartId = chartId;
  [
    { value: "sin", label: "sin(x)" },
    { value: "cos", label: "cos(x)" },
    { value: "tan", label: "tan(x)" }
  ].forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === selectedFunctionType) {
      opt.selected = true;
    }
    fnSelect.append(opt);
  });
  fnLabel.append(fnText, fnSelect);

  const xMin = buildChartFunctionInput(chartId, "set-chart-function-x-min", "x 최소", "-3.14");
  const xMax = buildChartFunctionInput(chartId, "set-chart-function-x-max", "x 최대", "3.14");
  const yRange = buildChartFunctionInput(chartId, "show-chart-function-y-range", "y축 범위", "자동 결정", true);
  const samples = buildChartFunctionInput(chartId, "set-chart-function-samples", "샘플 개수", "49");

  const fillBtn = document.createElement("button");
  fillBtn.type = "button";
  fillBtn.className = "pdf-chart-function-fill";
  fillBtn.dataset.action = "fill-chart-function";
  fillBtn.dataset.subjectId = subjectId;
  fillBtn.dataset.chartId = chartId;
  fillBtn.textContent = "그래프 그리기";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "pdf-chart-function-clear";
  clearBtn.dataset.action = "clear-chart-points";
  clearBtn.dataset.subjectId = subjectId;
  clearBtn.dataset.chartId = chartId;
  clearBtn.textContent = "지우기";

  wrap.append(title, fnLabel, xMin, xMax, yRange, samples, fillBtn, clearBtn);
  return wrap;
}

function buildChartFunctionInput(
  chartId: string,
  action: string,
  label: string,
  value: string,
  readOnly = false
): HTMLElement {
  const field = document.createElement("label");
  field.className = "pdf-chart-function-field";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = readOnly ? "text" : "number";
  if (!readOnly) {
    input.step = "any";
  }
  input.dataset.action = action;
  input.dataset.chartId = chartId;
  input.value = value;
  if (readOnly) {
    input.readOnly = true;
  }
  field.append(text, input);
  return field;
}

function buildChartPointRow(
  subjectId: string,
  chartId: string,
  idx: number,
  point: CsvSeriesPoint
): HTMLElement {
  const row = document.createElement("div");
  row.className = "pdf-chart-point";

  const xField = document.createElement("label");
  xField.className = "pdf-chart-point-field";
  const xText = document.createElement("span");
  xText.textContent = "x";
  const labelInp = document.createElement("input");
  labelInp.type = "text";
  labelInp.inputMode = "decimal";
  labelInp.className = "pdf-chart-point-x";
  labelInp.dataset.action = "update-chart-point-x";
  labelInp.dataset.subjectId = subjectId;
  labelInp.dataset.chartId = chartId;
  labelInp.dataset.pointIdx = String(idx);
  labelInp.setAttribute("aria-label", "x 좌표");
  labelInp.setAttribute("placeholder", "-3.14");
  labelInp.value = point.label;
  xField.append(xText, labelInp);

  const yField = document.createElement("label");
  yField.className = "pdf-chart-point-field";
  const yText = document.createElement("span");
  yText.textContent = "y";
  const valueInp = document.createElement("input");
  valueInp.type = "number";
  valueInp.step = "any";
  valueInp.className = "pdf-chart-point-value";
  valueInp.dataset.action = "update-chart-point-value";
  valueInp.dataset.subjectId = subjectId;
  valueInp.dataset.chartId = chartId;
  valueInp.dataset.pointIdx = String(idx);
  valueInp.setAttribute("aria-label", "y 좌표");
  valueInp.setAttribute("placeholder", "0");
  valueInp.value = String(point.value);
  yField.append(yText, valueInp);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "pdf-chart-point-delete";
  deleteBtn.dataset.action = "delete-chart-point";
  deleteBtn.dataset.subjectId = subjectId;
  deleteBtn.dataset.chartId = chartId;
  deleteBtn.dataset.pointIdx = String(idx);
  deleteBtn.setAttribute("aria-label", "좌표 삭제");
  deleteBtn.textContent = "✕";

  row.append(xField, yField, deleteBtn);
  return row;
}
