// sprint-13/slice-3+ — 그래프 도구 CSV parser / 좌표·삼각함수 SVG builder 테스트.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/chart-tool.spec.ts

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

interface CsvSeriesPoint {
  label: string;
  value: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

class TestSvgElement {
  readonly nodeName: string;
  readonly childNodes: TestSvgElement[] = [];
  private readonly attributes = new Map<string, string>();
  private text = "";

  constructor(nodeName: string) {
    this.nodeName = nodeName;
  }

  append(...nodes: TestSvgElement[]): void {
    this.childNodes.push(...nodes);
  }

  replaceChildren(...nodes: TestSvgElement[]): void {
    this.childNodes.splice(0, this.childNodes.length, ...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  set textContent(value: string | null) {
    this.childNodes.splice(0, this.childNodes.length);
    this.text = value ?? "";
  }

  get textContent(): string {
    if (this.childNodes.length > 0) {
      return this.childNodes.map((child) => child.textContent).join("");
    }

    return this.text;
  }

  get innerHTML(): string {
    return escapeText(this.textContent);
  }

  findByNodeName(nodeName: string): TestSvgElement[] {
    const result: TestSvgElement[] = [];

    for (const child of this.childNodes) {
      if (child.nodeName === nodeName) {
        result.push(child);
      }

      result.push(...child.findByNodeName(nodeName));
    }

    return result;
  }
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const testDocument = {
  createElementNS(_namespace: string, tagName: string): TestSvgElement {
    return new TestSvgElement(tagName);
  }
};

(globalThis as unknown as {
  document: typeof testDocument;
  SVGElement: typeof TestSvgElement;
}).document = testDocument;
(globalThis as unknown as {
  document: typeof testDocument;
  SVGElement: typeof TestSvgElement;
}).SVGElement = TestSvgElement;

function parseCsvSeries(source: string): CsvSeriesPoint[] {
  if (source.trim().length === 0) {
    return [];
  }

  return source.split(/\r?\n/).reduce<CsvSeriesPoint[]>((points, line) => {
    const parsedLine = splitCsvSeriesLine(line);

    if (!parsedLine) {
      return points;
    }

    const [label, rawValue] = parsedLine;
    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return points;
    }

    points.push({ label, value });
    return points;
  }, []);
}

function splitCsvSeriesLine(line: string): [label: string, rawValue: string] | null {
  let label = "";

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\\" && (next === "," || next === "\\")) {
      label += next;
      index += 1;
      continue;
    }

    if (char === ",") {
      return [label.trim(), line.slice(index + 1).trim()];
    }

    label += char;
  }

  return null;
}

function serializeCsv(points: CsvSeriesPoint[]): string {
  return points
    .map((point) => point.label.replace(/\\/g, "\\\\").replace(/,/g, "\\,") + "," + String(point.value))
    .join("\n");
}

function normalizeChartInputValue(rawValue: string): number {
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
}

interface CoordinateChartPoint {
  point: CsvSeriesPoint;
  xValue: number;
  yValue: number;
}

type LocalChartFunction = "sin" | "cos";

const CHART_PLOT_LEFT = 6;
const CHART_PLOT_RIGHT = 94;
const CHART_PLOT_TOP = 4;
const CHART_PLOT_BOTTOM = 22;
const CHART_PLOT_WIDTH = CHART_PLOT_RIGHT - CHART_PLOT_LEFT;
const CHART_PLOT_HEIGHT = CHART_PLOT_BOTTOM - CHART_PLOT_TOP;
const CHART_PLANE_COLOR = "#111111";

function parseChartXValue(point: CsvSeriesPoint, fallbackIndex: number): number {
  const x = Number(point.label.trim());
  return Number.isFinite(x) ? x : fallbackIndex;
}

function getCoordinateChartPoints(points: CsvSeriesPoint[]): CoordinateChartPoint[] {
  return points
    .filter((point) => Number.isFinite(point.value))
    .map((point, index) => ({
      point,
      xValue: parseChartXValue(point, index),
      yValue: point.value
    }))
    .sort((a, b) => a.xValue - b.xValue);
}

function formatChartNumber(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(4)).toString() : "0";
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

function appendChartLabel(parent: TestSvgElement, point: CsvSeriesPoint, x: number, total: number): void {
  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("x", x.toFixed(2));
  label.setAttribute("y", "29");
  label.setAttribute("font-size", "4");
  label.setAttribute("data-chart-point-label", "true");
  label.setAttribute(
    "text-anchor",
    total === 1 ? "middle" : x <= CHART_PLOT_LEFT ? "start" : x >= CHART_PLOT_RIGHT ? "end" : "middle"
  );
  label.textContent = formatChartPointLabel(point);
  parent.append(label);
}

function appendChartLine(
  parent: TestSvgElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: { opacity: string; strokeWidth: string; dataName?: string; dataValue?: string }
): TestSvgElement {
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

function appendChartCoordinatePlane(parent: TestSvgElement, xMin: number, xMax: number, yMin: number, yMax: number): void {
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
): Array<{ point: CsvSeriesPoint; x: number; y: number }> {
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

function buildPolylineChartSvg(
  parent: TestSvgElement,
  points: CsvSeriesPoint[],
  options: { markers: boolean; yBounds?: { min: number; max: number } }
): void {
  parent.replaceChildren();
  parent.setAttribute("viewBox", "0 0 100 30");

  const safePoints = getCoordinateChartPoints(points);

  if (safePoints.length === 0) {
    appendChartCoordinatePlane(
      parent,
      -1,
      1,
      options.yBounds ? options.yBounds.min : -1,
      options.yBounds ? options.yBounds.max : 1
    );
    return;
  }

  appendChartCoordinatePlane(
    parent,
    Math.min(...safePoints.map((point) => point.xValue)),
    Math.max(...safePoints.map((point) => point.xValue)),
    options.yBounds ? options.yBounds.min : Math.min(...safePoints.map((point) => point.yValue)),
    options.yBounds ? options.yBounds.max : Math.max(...safePoints.map((point) => point.yValue))
  );

  const coords = mapCoordinateChartPoints(safePoints, options.yBounds);

  if (coords.length === 1) {
    const coord = coords[0];
    if (!coord) return;
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", coord.x.toFixed(2));
    circle.setAttribute("cy", coord.y.toFixed(2));
    circle.setAttribute("r", "2");
    parent.append(circle);
    appendChartLabel(parent, coord.point, coord.x, coords.length);
    return;
  }

  const polyline = document.createElementNS(SVG_NS, "polyline");
  polyline.setAttribute(
    "points",
    coords.map((coord) => coord.x.toFixed(2) + "," + coord.y.toFixed(2)).join(" ")
  );
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "currentColor");
  polyline.setAttribute("stroke-width", "1.6");
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  parent.append(polyline);

  coords.forEach((coord, index) => {
    if (options.markers) {
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", coord.x.toFixed(2));
      circle.setAttribute("cy", coord.y.toFixed(2));
      circle.setAttribute("r", "1.35");
      parent.append(circle);
    }

    if (shouldRenderChartLabel(index, coords.length)) {
      appendChartLabel(parent, coord.point, coord.x, coords.length);
    }
  });
}

function buildCoordinateLineChartSvg(parent: TestSvgElement, points: CsvSeriesPoint[]): void {
  buildPolylineChartSvg(parent, points, { markers: true });
}

function buildTrigChartSvg(parent: TestSvgElement, points: CsvSeriesPoint[]): void {
  buildPolylineChartSvg(parent, points, { markers: false, yBounds: { min: -1, max: 1 } });
}

function buildFunctionChartPoints(
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
    return Math.sin(x);
  };

  return Array.from({ length: safeSamples }, (_, index) => {
    const x = safeMin + ((safeMax - safeMin) * index) / (safeSamples - 1);
    const y = evaluate(x);
    return { label: formatChartNumber(x), value: Number.isFinite(y) ? Number(y.toFixed(4)) : 0 };
  }).filter((point) => Number.isFinite(point.value) && point.value >= -1 && point.value <= 1);
}

function newSvg(): TestSvgElement {
  return document.createElementNS(SVG_NS, "svg");
}

function yValues(pointsAttr: string): string[] {
  return pointsAttr.split(" ").map((pair) => pair.split(",")[1] ?? "");
}

function pointLabelTexts(svg: TestSvgElement): string[] {
  return svg
    .findByNodeName("text")
    .filter((node) => node.getAttribute("data-chart-point-label") === "true")
    .map((node) => node.textContent);
}

function axisLineValues(svg: TestSvgElement): string[] {
  return svg
    .findByNodeName("line")
    .map((node) => node.getAttribute("data-chart-axis"))
    .filter((value): value is string => typeof value === "string");
}

describe("parseCsvSeries", () => {
  it("정상 label,value 라인을 파싱한다", () => {
    assert.deepEqual(parseCsvSeries("2026-01,100\n2026-02,200"), [
      { label: "2026-01", value: 100 },
      { label: "2026-02", value: 200 }
    ]);
  });

  it("빈 string은 빈 배열을 반환한다", () => {
    assert.deepEqual(parseCsvSeries(""), []);
  });

  it("non-numeric value line은 skip한다", () => {
    assert.deepEqual(parseCsvSeries("foo,bar\nok,1"), [{ label: "ok", value: 1 }]);
  });

  it("음수, 0, 양수를 처리한다", () => {
    assert.deepEqual(parseCsvSeries("minus,-5\nzero,0\nplus,7"), [
      { label: "minus", value: -5 },
      { label: "zero", value: 0 },
      { label: "plus", value: 7 }
    ]);
  });

  it("NaN은 skip한다", () => {
    assert.deepEqual(parseCsvSeries("a,NaN\nb,1"), [{ label: "b", value: 1 }]);
  });

  it("Infinity는 skip한다", () => {
    assert.deepEqual(parseCsvSeries("a,Infinity\nb,-Infinity\nc,2"), [
      { label: "c", value: 2 }
    ]);
  });

  it("label과 value 양쪽 공백을 trim한다", () => {
    assert.deepEqual(parseCsvSeries("  a  ,  42  "), [{ label: "a", value: 42 }]);
  });

  it("escaped comma/backslash label을 round-trip 파싱한다", () => {
    const points = [{ label: "단원, A\\B", value: 3 }];

    assert.equal(serializeCsv(points), "단원\\, A\\\\B,3");
    assert.deepEqual(parseCsvSeries(serializeCsv(points)), points);
  });

  it("label payload는 string으로 보존하고 실행 가능한 DOM으로 만들지 않는다", () => {
    assert.deepEqual(parseCsvSeries('<svg onload="alert(1)">,100'), [
      { label: '<svg onload="alert(1)">', value: 100 }
    ]);
  });
});

describe("normalizeChartInputValue", () => {
  it("finite number string은 number로 변환한다", () => {
    assert.equal(normalizeChartInputValue("-3.5"), -3.5);
  });

  it("입력 중 임시 non-finite 값은 0으로 보정해 NaN persistence를 막는다", () => {
    assert.equal(normalizeChartInputValue("-"), 0);
    assert.equal(normalizeChartInputValue("NaN"), 0);
    assert.equal(normalizeChartInputValue(""), 0);
  });
});

describe("coordinate chart helpers", () => {
  it("numeric x label을 실제 x좌표로 정렬하고 보존한다", () => {
    assert.deepEqual(getCoordinateChartPoints([
      { label: "2", value: 4 },
      { label: "-1", value: 1 },
      { label: "0", value: 0 }
    ]).map((point) => [point.xValue, point.yValue]), [
      [-1, 1],
      [0, 0],
      [2, 4]
    ]);
  });

  it("sin 함수 샘플을 x,y 좌표 목록으로 만든다", () => {
    const points = buildFunctionChartPoints("sin", -Math.PI, Math.PI, 5);

    assert.equal(points.length, 5);
    assert.equal(points[0]?.label, "-3.1416");
    assert.equal(points[2]?.label, "0");
    assert.equal(points[2]?.value, 0);
  });

  it("삼각함수 샘플은 y=-1~1 범위 안에서만 만든다", () => {
    const points = buildFunctionChartPoints("cos", -Math.PI, Math.PI, 49);

    assert.equal(points.length, 49);
    assert.ok(points.every((point) => point.value >= -1 && point.value <= 1));
  });
});

describe("buildCoordinateLineChartSvg", () => {
  it("empty points도 좌표평면 뼈대를 렌더한다", () => {
    const svg = newSvg();

    buildCoordinateLineChartSvg(svg, []);

    assert.equal(svg.findByNodeName("rect")[0]?.getAttribute("data-chart-plane"), "frame");
    assert.equal(svg.findByNodeName("rect")[0]?.getAttribute("stroke"), CHART_PLANE_COLOR);
    assert.deepEqual(axisLineValues(svg).sort(), ["x", "y"]);
    assert.ok(
      svg.findByNodeName("line")
        .filter((node) => node.getAttribute("data-chart-axis"))
        .every((node) => node.getAttribute("stroke") === CHART_PLANE_COLOR)
    );
    assert.deepEqual(
      svg.findByNodeName("text").filter((node) => node.getAttribute("data-chart-axis-label")).map((node) => node.textContent),
      ["X", "Y"]
    );
    assert.ok(
      svg.findByNodeName("text")
        .filter((node) => node.getAttribute("data-chart-axis-label"))
        .every((node) => node.getAttribute("fill") === CHART_PLANE_COLOR)
    );
  });

  it("1 point는 circle element로 렌더한다", () => {
    const svg = newSvg();

    buildCoordinateLineChartSvg(svg, [{ label: "only", value: 10 }]);

    assert.equal(svg.findByNodeName("circle").length, 1);
  });

  it("2+ points는 numeric-only polyline points attribute로 렌더한다", () => {
    const svg = newSvg();

    buildCoordinateLineChartSvg(svg, [
      { label: "a", value: 10 },
      { label: "b", value: 20 },
      { label: "<bad>", value: 30 }
    ]);

    const polyline = svg.findByNodeName("polyline")[0];
    assert.ok(polyline);
    const attr = polyline.getAttribute("points");
    assert.ok(attr);
    assert.match(attr, /^[0-9.,\s-]+$/);
    assert.doesNotMatch(attr, /[<>&]/);
  });

  it("max===min이면 모든 y를 단일 값으로 normalize한다", () => {
    const svg = newSvg();

    buildCoordinateLineChartSvg(svg, [
      { label: "a", value: 5 },
      { label: "b", value: 5 },
      { label: "c", value: 5 }
    ]);

    const polyline = svg.findByNodeName("polyline")[0];
    assert.ok(polyline);
    const attr = polyline.getAttribute("points");
    assert.ok(attr);
    assert.deepEqual(new Set(yValues(attr)).size, 1);
  });

  it("NaN/Infinity points는 skip한다", () => {
    const svg = newSvg();

    buildCoordinateLineChartSvg(svg, [
      { label: "bad", value: Number.NaN },
      { label: "also-bad", value: Number.POSITIVE_INFINITY },
      { label: "ok", value: 3 }
    ]);

    assert.equal(svg.findByNodeName("circle").length, 1);
    assert.deepEqual(pointLabelTexts(svg), ["(ok, 3)"]);
  });

  it("label payload는 textContent로만 격리한다", () => {
    const svg = newSvg();

    buildCoordinateLineChartSvg(svg, [{ label: "<script>", value: 100 }]);

    const text = svg
      .findByNodeName("text")
      .find((node) => node.getAttribute("data-chart-point-label") === "true");
    assert.ok(text);
    assert.equal(text.textContent, "(<script>, 100)");
    assert.equal(text.innerHTML, "(&lt;script&gt;, 100)");
  });

  it("x,y 좌표를 numeric-only polyline과 axis로 렌더한다", () => {
    const svg = newSvg();

    buildCoordinateLineChartSvg(svg, [
      { label: "-1", value: 0 },
      { label: "0", value: 1 },
      { label: "2", value: 0 }
    ]);

    const polyline = svg.findByNodeName("polyline")[0];
    assert.ok(polyline);
    assert.match(polyline.getAttribute("points") ?? "", /^[0-9.,\s-]+$/);
    assert.deepEqual(axisLineValues(svg).sort(), ["x", "y"]);
    assert.ok((svg.findByNodeName("rect")[0]?.getAttribute("data-chart-plane") ?? "") === "frame");
    assert.equal(svg.findByNodeName("circle").length, 3);
    assert.deepEqual(pointLabelTexts(svg), [
      "(-1, 0)",
      "(0, 1)",
      "(2, 0)"
    ]);
  });
});

describe("buildTrigChartSvg", () => {
  it("삼각함수는 y축 -1~1 기준으로 렌더하고 좌표 점 마커는 숨긴다", () => {
    const svg = newSvg();

    buildTrigChartSvg(svg, [
      { label: "-1.5708", value: -1 },
      { label: "0", value: 0 },
      { label: "1.5708", value: 1 }
    ]);

    const polyline = svg.findByNodeName("polyline")[0];
    assert.ok(polyline);
    assert.deepEqual(yValues(polyline.getAttribute("points") ?? ""), ["22.00", "13.00", "4.00"]);
    assert.equal(svg.findByNodeName("circle").length, 0);
    assert.deepEqual(axisLineValues(svg).sort(), ["x", "y"]);
    assert.deepEqual(pointLabelTexts(svg), [
      "(-1.5708, -1)",
      "(0, 0)",
      "(1.5708, 1)"
    ]);
  });
});
