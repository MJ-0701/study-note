// sprint-2026-W22-sprint-4 / layer B/slice-2f/i — chart-content characterization spec.
// 6 invariant ↔ 18 case 매핑 (plan §9.1). 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/pdf-workspace/__tests__/chart-content.spec.ts

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  CHART_TYPE_PREFIX,
  type CsvSeriesPoint,
  type LocalChartFunction,
  type LocalChartType,
  decodeChartContent,
  encodeChartContent,
  inferChartFunctionType,
  normalizeChartInputValue,
  parseCsvSeries
} from "../chart-content.ts";

describe("chart-content — invariant (a) round-trip lossless (non-xy)", () => {
  it("case 1: bar encode → decode → encode 동일", () => {
    const points: CsvSeriesPoint[] = [
      { label: "2026-01", value: 100 },
      { label: "2026-02", value: 200 }
    ];
    const encoded = encodeChartContent("bar", points);
    assert.equal(encoded, "type:bar\n2026-01,100\n2026-02,200");

    const decoded = decodeChartContent(encoded);
    assert.equal(decoded.chartType, "bar");
    assert.deepEqual(decoded.points, points);
    assert.equal(decoded.functionType, undefined);

    const reEncoded = encodeChartContent(decoded.chartType, decoded.points);
    assert.equal(reEncoded, encoded);
  });

  it("case 2: trig explicit + inferred functionType (|value|<=1 → sin)", () => {
    const points: CsvSeriesPoint[] = [{ label: "x", value: 0.5 }];
    const encoded = encodeChartContent("trig", points);
    assert.equal(encoded, "type:trig\nx,0.5");

    const decoded = decodeChartContent(encoded);
    assert.equal(decoded.chartType, "trig");
    assert.equal(decoded.functionType, "sin");
    assert.deepEqual(decoded.points, points);
  });

  it("case 3: sin token → trig + functionType=sin", () => {
    const points: CsvSeriesPoint[] = [];
    const encoded = encodeChartContent("sin", points);
    assert.equal(encoded, "type:sin\n");

    const decoded = decodeChartContent(encoded);
    assert.equal(decoded.chartType, "trig");
    assert.equal(decoded.functionType, "sin");
    assert.deepEqual(decoded.points, []);
  });

  it("case 4: cos token → trig + functionType=cos", () => {
    const decoded = decodeChartContent("type:cos\nx,1");
    assert.equal(decoded.chartType, "trig");
    assert.equal(decoded.functionType, "cos");
    assert.deepEqual(decoded.points, [{ label: "x", value: 1 }]);
  });

  it("case 5: tan token → trig + functionType=tan + inferred |value|>1 = tan", () => {
    const decoded = decodeChartContent("type:tan\nx,1.5");
    assert.equal(decoded.chartType, "trig");
    assert.equal(decoded.functionType, "tan");

    const inferred = inferChartFunctionType([{ label: "x", value: 1.5 }]);
    assert.equal(inferred, "tan");
  });
});

describe("chart-content — invariant (a') xy legacy envelope omit", () => {
  it("case 6: encode xy = CSV only (prefix 부재)", () => {
    const points: CsvSeriesPoint[] = [{ label: "a", value: 1 }];
    const encoded = encodeChartContent("xy", points);
    assert.equal(encoded, "a,1");
    assert.equal(encoded.startsWith(CHART_TYPE_PREFIX), false);
  });

  it("case 7: decode no-prefix → xy fallback (legacy compat)", () => {
    const decoded = decodeChartContent("a,1");
    assert.equal(decoded.chartType, "xy");
    assert.deepEqual(decoded.points, [{ label: "a", value: 1 }]);
    assert.equal(decoded.functionType, undefined);
  });
});

describe("chart-content — invariant (b) envelope token bounded", () => {
  it("case 8: unknown prefix → xy fallback (XSS 차단)", () => {
    const decoded = decodeChartContent("type:malicious\n<svg>,1");
    assert.equal(decoded.chartType, "xy");
    assert.deepEqual(decoded.points, [{ label: "<svg>", value: 1 }]);
  });

  it("case 9: prefix-only no newline → bar with empty points", () => {
    const decoded = decodeChartContent("type:bar");
    assert.equal(decoded.chartType, "bar");
    assert.deepEqual(decoded.points, []);
  });
});

describe("chart-content — invariant (c) LocalChartType/Function value bounded", () => {
  it("case 10: decode chartType 출력은 항상 LocalChartType (3 종) — sin/cos/tan 은 trig 로 표준화", () => {
    const types = new Set<LocalChartType>(["xy", "bar", "trig"]);
    const tokens = ["xy", "bar", "trig", "sin", "cos", "tan"];
    for (const token of tokens) {
      const decoded = decodeChartContent(`type:${token}\n`);
      assert.equal(types.has(decoded.chartType), true, `${token} → ${decoded.chartType}`);
    }
  });

  it("case 11: functionType 은 chartType==='trig' 일 때만 정의, 그 외 undefined", () => {
    const bar = decodeChartContent("type:bar\nx,1");
    assert.equal(bar.functionType, undefined);

    const xy = decodeChartContent("a,1");
    assert.equal(xy.functionType, undefined);

    const trig = decodeChartContent("type:trig\nx,0.5");
    const allowedFn = new Set<LocalChartFunction>(["sin", "cos", "tan"]);
    assert.equal(typeof trig.functionType === "string" && allowedFn.has(trig.functionType), true);
  });
});

describe("chart-content — invariant (d) finite guard (OWASP A03+A04)", () => {
  it("case 12: parseCsv NaN row drop", () => {
    const points = parseCsvSeries("a,NaN\nb,1");
    assert.deepEqual(points, [{ label: "b", value: 1 }]);
  });

  it("case 13: parseCsv Infinity / -Infinity row drop", () => {
    const points = parseCsvSeries("a,Infinity\nb,-Infinity\nc,2");
    assert.deepEqual(points, [{ label: "c", value: 2 }]);
  });

  it("case 14: normalizeChartInputValue 'abc' → 0 fallback", () => {
    assert.equal(normalizeChartInputValue("abc"), 0);
    assert.equal(normalizeChartInputValue(""), 0);
  });

  it("case 15: normalizeChartInputValue 'Infinity' → 0 fallback", () => {
    assert.equal(normalizeChartInputValue("Infinity"), 0);
    assert.equal(normalizeChartInputValue("-Infinity"), 0);
    assert.equal(normalizeChartInputValue("NaN"), 0);
    assert.equal(normalizeChartInputValue("3.14"), 3.14);
  });
});

describe("chart-content — invariant (e) escape + injection block (OWASP A03)", () => {
  it("case 16: escape comma — '\\,' → ','", () => {
    const points = parseCsvSeries("a\\,b,42");
    assert.deepEqual(points, [{ label: "a,b", value: 42 }]);
  });

  it("case 17: escape backslash — '\\\\' → '\\'", () => {
    const points = parseCsvSeries("a\\\\b,7");
    assert.deepEqual(points, [{ label: "a\\b", value: 7 }]);

    const roundTrip = encodeChartContent("bar", [{ label: "a\\b,c", value: 9 }]);
    assert.equal(roundTrip, "type:bar\na\\\\b\\,c,9");
    const decoded = decodeChartContent(roundTrip);
    assert.deepEqual(decoded.points, [{ label: "a\\b,c", value: 9 }]);
  });
});

describe("chart-content — invariant (f) leaf 무측효과 (pure function)", () => {
  it("case 18: module export shape — function/const/type only, mutate X", () => {
    assert.equal(typeof encodeChartContent, "function");
    assert.equal(typeof decodeChartContent, "function");
    assert.equal(typeof parseCsvSeries, "function");
    assert.equal(typeof normalizeChartInputValue, "function");
    assert.equal(typeof inferChartFunctionType, "function");
    assert.equal(CHART_TYPE_PREFIX, "type:");

    const input = "a,1\nb,2";
    const before = input.length;
    const result1 = parseCsvSeries(input);
    const result2 = parseCsvSeries(input);
    assert.equal(input.length, before);
    assert.deepEqual(result1, result2);
    assert.notEqual(result1, result2);
  });
});
