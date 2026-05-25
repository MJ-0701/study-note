// sprint-2026-W22-sprint-4 / layer B/slice-2f/i — chart content leaf module.
// main.ts 의 chart payload encoder/decoder/parser leaf 분리. 9 named export +
// 2 private helper. render/state/morphdom/debounce 와 분리된 pure-function only
// leaf (DOM mutate / global state mutate 안 함).
//
// 3 layer separation (plan §9):
//   (i) LocalChartType (render branch) ∈ {"xy","bar","trig"} — main.ts L3601
//   (ii) LocalChartFunction (trig subtype) ∈ {"sin","cos","tan"} — main.ts L3602
//   (iii) stored envelope token (content 첫 line 의 "type:" 뒤) — encode 출력
//        ∈ {omit (xy legacy), "type:bar", "type:trig", "type:sin", "type:cos",
//        "type:tan"} = 5 prefixed + 1 legacy. decode 가 unknown token →
//        chartType:"xy" fallback.
//
// invariant:
//   (a) round-trip lossless (non-xy): bar/trig/sin/cos/tan encode→decode→encode
//       동일. decode 는 sin/cos/tan token 인식 시 chartType:"trig" + functionType:
//       <token> 으로 표준화.
//   (a') xy legacy envelope omit: chartType="xy" 의 encode = CSV only (prefix
//        부재, sprint-13 backward compat).
//   (b) envelope token bounded: decode unknown prefix → "xy" fallback (XSS 차단).
//   (c) LocalChartType/Function value bounded.
//   (d) finite guard (OWASP A03+A04): parseCsvSeries NaN/Infinity row drop +
//       normalizeChartInputValue Number.isFinite fallback (slice-2e
//       clampStyleRatio lineage).
//   (e) escape + injection block (OWASP A03): splitCsvSeriesLine `\,` / `\\`
//       escape + row split `\r?\n` — comma/newline injection 차단. HTML escape
//       자체는 caller 책임 (main.ts renderChart).
//   (f) leaf 무측효과: pure function only. DOM / debounce / global state
//       mutate 안 함.

export type LocalChartType = "xy" | "bar" | "trig";
export type LocalChartFunction = "sin" | "cos" | "tan";

export const CHART_TYPE_PREFIX = "type:";

export interface CsvSeriesPoint {
  label: string;
  value: number;
}

/**
 * Encodes LocalChartType + CsvSeriesPoint[] into a single content string.
 * Format: "type:<chartType>\n<csv>". chartType="xy" 일 때 prefix omit
 * (sprint-13 backward compat). signature 는 LocalChartType 또는
 * LocalChartFunction (5 token) 직접 받음.
 */
export function encodeChartContent(
  chartType: LocalChartType | LocalChartFunction,
  points: CsvSeriesPoint[]
): string {
  const csv = serializeCsv(points);
  if (chartType === "xy") {
    return csv;
  }
  return CHART_TYPE_PREFIX + chartType + "\n" + csv;
}

/**
 * point.value 의 절대값이 1 을 초과하면 "tan", 그 외 "sin". cos 는 추정
 * 대상이 아니다 (sin/tan 만 분기). main.ts L3632-3634 source 보존.
 */
export function inferChartFunctionType(points: CsvSeriesPoint[]): LocalChartFunction {
  return points.some((point) => Math.abs(point.value) > 1) ? "tan" : "sin";
}

/**
 * Decodes content string → LocalChartType + CsvSeriesPoint[] + (옵셔널)
 * functionType. 첫 line "type:<token>" 인식 시 token 매핑:
 *   - "sin"/"cos"/"tan" → chartType="trig", functionType=<token>
 *   - "bar"/"trig" → chartType=<token>, functionType (trig 일 때 inferred)
 *   - 그 외 → chartType="xy" fallback (XSS 차단)
 * prefix 부재 시 → chartType="xy" (legacy compat).
 */
export function decodeChartContent(
  content: string
): { chartType: LocalChartType; points: CsvSeriesPoint[]; functionType?: LocalChartFunction } {
  const trimmed = content.trimStart();

  if (trimmed.startsWith(CHART_TYPE_PREFIX)) {
    const newline = trimmed.indexOf("\n");
    const typeStr =
      newline < 0
        ? trimmed.slice(CHART_TYPE_PREFIX.length)
        : trimmed.slice(CHART_TYPE_PREFIX.length, newline);
    const csv = newline < 0 ? "" : trimmed.slice(newline + 1);
    const points = parseCsvSeries(csv);

    if (typeStr === "sin" || typeStr === "cos" || typeStr === "tan") {
      return { chartType: "trig", points, functionType: typeStr };
    }

    const chartType: LocalChartType =
      typeStr === "bar" || typeStr === "trig" ? typeStr : "xy";
    return {
      chartType,
      points,
      functionType: chartType === "trig" ? inferChartFunctionType(points) : undefined
    };
  }

  return { chartType: "xy", points: parseCsvSeries(content) };
}

/**
 * Parses CSV string → CsvSeriesPoint[]. row 단위 `\r?\n` split. NaN /
 * Infinity / -Infinity row 는 `Number.isFinite` guard 로 drop (OWASP A03+A04).
 * label 안 `\,` / `\\` escape 는 splitCsvSeriesLine 가 처리.
 */
export function parseCsvSeries(source: string): CsvSeriesPoint[] {
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

/**
 * Coerces user-supplied string → finite number, 0 fallback. NaN / Infinity /
 * "abc" / "" 모두 0. slice-2e `clampStyleRatio` finite guard lineage.
 */
export function normalizeChartInputValue(rawValue: string): number {
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
}

// ─── private helpers (NOT exported) ──────────────────────────────────────

/**
 * label 단위 escape parser. `\,` → `,` / `\\` → `\` decode. 첫 unescaped
 * comma 가 label/value 경계. line 안 unescaped comma 가 없으면 null.
 */
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

/**
 * Serializes CsvSeriesPoint[] → CSV. label 안 `\` 와 `,` escape.
 */
function serializeCsv(points: CsvSeriesPoint[]): string {
  return points
    .map(
      (point) =>
        point.label.replace(/\\/g, "\\\\").replace(/,/g, "\\,") +
        "," +
        String(point.value)
    )
    .join("\n");
}
