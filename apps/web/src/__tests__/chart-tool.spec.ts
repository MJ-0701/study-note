// sprint-13/slice-3 — 그래프 도구 CSV parser / SVG sparkline builder 테스트.
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
    const commaIndex = line.indexOf(",");

    if (commaIndex < 0) {
      return points;
    }

    const label = line.slice(0, commaIndex).trim();
    const rawValue = line.slice(commaIndex + 1).trim();
    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return points;
    }

    points.push({ label, value });
    return points;
  }, []);
}

function buildSparklineSvg(parent: TestSvgElement, points: CsvSeriesPoint[]): void {
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
  const toY = (value: number): number => {
    if (range === 0) {
      return 15;
    }

    const ratio = Math.min(1, Math.max(0, (value - min) / range));
    return 22 - ratio * 18;
  };
  const toX = (index: number): number =>
    safePoints.length === 1 ? 50 : (index / (safePoints.length - 1)) * 100;
  const appendLabel = (point: CsvSeriesPoint, x: number): void => {
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", x.toFixed(2));
    label.setAttribute("y", "29");
    label.setAttribute("font-size", "4");
    label.setAttribute("text-anchor", safePoints.length === 1 ? "middle" : x <= 0 ? "start" : x >= 100 ? "end" : "middle");
    label.textContent = point.label;
    parent.append(label);
  };

  if (safePoints.length === 1) {
    const point = safePoints[0];
    const circle = document.createElementNS(SVG_NS, "circle");
    const x = 50;
    const y = 15;
    circle.setAttribute("cx", x.toFixed(2));
    circle.setAttribute("cy", y.toFixed(2));
    circle.setAttribute("r", "2");
    parent.append(circle);
    appendLabel(point, x);
    return;
  }

  const coords = safePoints.map((point, index) => {
    const x = toX(index);
    const y = toY(point.value);
    return { point, x, y };
  });
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

  coords.forEach((coord) => appendLabel(coord.point, coord.x));
}

function newSvg(): TestSvgElement {
  return document.createElementNS(SVG_NS, "svg");
}

function yValues(pointsAttr: string): string[] {
  return pointsAttr.split(" ").map((pair) => pair.split(",")[1] ?? "");
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

  it("label payload는 string으로 보존하고 실행 가능한 DOM으로 만들지 않는다", () => {
    assert.deepEqual(parseCsvSeries('<svg onload="alert(1)">,100'), [
      { label: '<svg onload="alert(1)">', value: 100 }
    ]);
  });
});

describe("buildSparklineSvg", () => {
  it("empty points는 child node를 만들지 않는다", () => {
    const svg = newSvg();

    buildSparklineSvg(svg, []);

    assert.equal(svg.childNodes.length, 0);
  });

  it("1 point는 circle element로 렌더한다", () => {
    const svg = newSvg();

    buildSparklineSvg(svg, [{ label: "only", value: 10 }]);

    assert.equal(svg.findByNodeName("circle").length, 1);
  });

  it("2+ points는 numeric-only polyline points attribute로 렌더한다", () => {
    const svg = newSvg();

    buildSparklineSvg(svg, [
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

    buildSparklineSvg(svg, [
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

    buildSparklineSvg(svg, [
      { label: "bad", value: Number.NaN },
      { label: "also-bad", value: Number.POSITIVE_INFINITY },
      { label: "ok", value: 3 }
    ]);

    assert.equal(svg.findByNodeName("circle").length, 1);
    assert.equal(svg.findByNodeName("text")[0]?.textContent, "ok");
  });

  it("label payload는 textContent로만 격리한다", () => {
    const svg = newSvg();

    buildSparklineSvg(svg, [{ label: "<script>", value: 100 }]);

    const text = svg.findByNodeName("text")[0];
    assert.ok(text);
    assert.equal(text.textContent, "<script>");
    assert.equal(text.innerHTML, "&lt;script&gt;");
  });
});
