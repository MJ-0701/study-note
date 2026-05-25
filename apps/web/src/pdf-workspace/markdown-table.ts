// sprint-2026-W22-sprint-2 / layer B/slice-2f/ii — markdown table leaf module.
// main.ts 의 markdown table content parser/serializer leaf 분리. 4 named export
// + 2 private helper. render/state/morphdom/debounce 와 분리된 pure-function
// only leaf (DOM mutate / global state mutate 안 함).
//
// invariant:
//   (a) round-trip lossless: parse → serialize → parse 동일.
//   (b) null fallback: source empty / <2 line / separator mismatch → null.
//   (c) row width normalize: rows cell 수 < headers.length → "" 채움, > 잘림.
//   (d) pipe escape (split + serialize 대칭): `\|` ↔ `|` decode.
//       leading/trailing `|` strip.
//   (e) XSS escape caller 책임 (OWASP A07): leaf 는 string passthrough.
//       attacker `<script>` / `<img onerror>` / `javascript:` payload 가
//       cell 에 들어와도 leaf 가 그대로 반환 — caller (drill-highlight
//       formatDrillSnippet → escapeHtml, main.ts renderTable input.value DOM
//       property) 가 escape. slice-2f/i chart-content (e) lineage.
//   (f) leaf 무측효과: pure function only. DOM / global / debounce mutate X.

export interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
}

/**
 * Splits one markdown table row "| a | b |" into ["a", "b"]. `\|` escape
 * decode. leading/trailing `|` strip.
 */
export function splitMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim();
  const cells: string[] = [];
  let current = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const next = trimmed[i + 1];

    if (char === "\\" && next === "|") {
      current += "|";
      i += 1;
      continue;
    }

    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  if (trimmed.startsWith("|")) {
    cells.shift();
  }

  if (trimmed.endsWith("|")) {
    cells.pop();
  }

  return cells;
}

/**
 * Parses markdown table source → ParsedMarkdownTable. null fallback for
 * empty / <2 lines / separator mismatch. row width normalize via
 * normalizeMarkdownTableRow.
 */
export function parseMarkdownTable(source: string): ParsedMarkdownTable | null {
  if (source.trim().length === 0) {
    return null;
  }

  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return null;
  }

  const headerLine = lines[0];
  const separatorLine = lines[1];
  if (headerLine === undefined || separatorLine === undefined) {
    return null;
  }
  const headers = splitMarkdownTableRow(headerLine);
  const separator = splitMarkdownTableRow(separatorLine);

  if (
    headers.length === 0 ||
    headers.every((cell) => cell.length === 0) ||
    separator.length !== headers.length ||
    !separator.every(isMarkdownSeparatorCell)
  ) {
    return null;
  }

  return {
    headers,
    rows: lines.slice(2).map((line) =>
      normalizeMarkdownTableRow(splitMarkdownTableRow(line), headers.length)
    )
  };
}

/**
 * Serializes ParsedMarkdownTable → markdown string. cell `|` 는 `\|` escape.
 * Output: "| h1 | h2 |\n|---|---|\n| v1 | v2 |". O(rows * cols).
 */
export function serializeMarkdownTable(parsed: ParsedMarkdownTable): string {
  const escapeCell = (cell: string): string => cell.replace(/\|/g, "\\|");
  const headerRow = "| " + parsed.headers.map(escapeCell).join(" | ") + " |";
  const separator = "|" + parsed.headers.map(() => "---|").join("");
  const dataRows = parsed.rows.map((row) => "| " + row.map(escapeCell).join(" | ") + " |");
  return [headerRow, separator, ...dataRows].join("\n");
}

// ─── private helpers (NOT exported) ──────────────────────────────────────

/**
 * Tests if cell is markdown separator `---` / `:---` / `---:` / `:---:`.
 * 공백 제거 후 패턴 매치.
 */
function isMarkdownSeparatorCell(cell: string): boolean {
  return /^:?-{3,}:?$/.test(cell.replace(/\s+/g, ""));
}

/**
 * Normalizes row cell list to fixed width — 부족하면 "" 채움, 넘치면 잘림.
 */
function normalizeMarkdownTableRow(cells: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => cells[index] ?? "");
}
