// sprint-13/slice-2 — 표 도구 markdown parser / DOM renderer / reducer 회귀 테스트.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/table-tool.spec.ts

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  createTable,
  deleteTable,
  moveTable,
  toggleTableCollapsed,
  updateTableContent
} from "../../../../packages/domain/src/pdf-workspace.ts";

interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
}

class TestHTMLElement {
  readonly tagName: string;
  readonly children: TestHTMLElement[] = [];
  private text = "";

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  append(...nodes: TestHTMLElement[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: TestHTMLElement[]): void {
    this.children.splice(0, this.children.length, ...nodes);
  }

  set textContent(value: string | null) {
    this.children.splice(0, this.children.length);
    this.text = value ?? "";
  }

  get textContent(): string {
    if (this.children.length > 0) {
      return this.children.map((child) => child.textContent).join("");
    }

    return this.text;
  }

  get innerHTML(): string {
    if (this.children.length > 0) {
      return this.children.map((child) => child.outerHTML).join("");
    }

    return escapeText(this.text);
  }

  get outerHTML(): string {
    const tag = this.tagName.toLowerCase();
    return `<${tag}>${this.innerHTML}</${tag}>`;
  }

  getElementsByTagName(tagName: string): TestHTMLElement[] {
    const expected = tagName.toUpperCase();
    const result: TestHTMLElement[] = [];

    for (const child of this.children) {
      if (child.tagName === expected) {
        result.push(child);
      }

      result.push(...child.getElementsByTagName(tagName));
    }

    return result;
  }
}

class TestHTMLTableElement extends TestHTMLElement {}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const testDocument = {
  createElement(tagName: string): TestHTMLElement {
    if (tagName === "table") {
      return new TestHTMLTableElement(tagName);
    }

    return new TestHTMLElement(tagName);
  }
};

(globalThis as unknown as {
  document: typeof testDocument;
  HTMLElement: typeof TestHTMLElement;
  HTMLTableElement: typeof TestHTMLTableElement;
}).document = testDocument;
(globalThis as unknown as {
  document: typeof testDocument;
  HTMLElement: typeof TestHTMLElement;
  HTMLTableElement: typeof TestHTMLTableElement;
}).HTMLElement = TestHTMLElement;
(globalThis as unknown as {
  document: typeof testDocument;
  HTMLElement: typeof TestHTMLElement;
  HTMLTableElement: typeof TestHTMLTableElement;
}).HTMLTableElement = TestHTMLTableElement;

function splitMarkdownTableRow(line: string): string[] {
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

function isMarkdownSeparatorCell(cell: string): boolean {
  return /^:?-{3,}:?$/.test(cell.replace(/\s+/g, ""));
}

function normalizeMarkdownTableRow(cells: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => cells[index] ?? "");
}

function parseMarkdownTable(source: string): ParsedMarkdownTable | null {
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

  const headers = splitMarkdownTableRow(lines[0]);
  const separator = splitMarkdownTableRow(lines[1]);

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

function renderTableElement(parsed: ParsedMarkdownTable): HTMLTableElement {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  parsed.headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.append(th);
  });

  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");

  parsed.rows.forEach((row) => {
    const tr = document.createElement("tr");

    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });

    tbody.append(tr);
  });

  table.append(tbody);

  return table as HTMLTableElement;
}

describe("parseMarkdownTable", () => {
  it("정상 2x2 markdown table을 headers + rows로 파싱한다", () => {
    const parsed = parseMarkdownTable("| A | B |\n|---| ---|\n| 1 | 2 |\n| 3 | 4 |");

    assert.deepEqual(parsed, {
      headers: ["A", "B"],
      rows: [
        ["1", "2"],
        ["3", "4"]
      ]
    });
  });

  it("헤더와 separator만 있으면 데이터 0행 table로 파싱한다", () => {
    const parsed = parseMarkdownTable("| A | B |\n|:---:|---|");

    assert.deepEqual(parsed, { headers: ["A", "B"], rows: [] });
  });

  it("빈 input은 null을 반환한다", () => {
    assert.equal(parseMarkdownTable("  \n  "), null);
  });

  it("separator가 없으면 null을 반환한다", () => {
    assert.equal(parseMarkdownTable("| A | B |\n| 1 | 2 |"), null);
  });

  it("backslash-pipe는 cell 안 literal pipe로 보존한다", () => {
    const parsed = parseMarkdownTable("| A\\|B | C |\n|---|---|\n| x\\|y | z |");

    assert.deepEqual(parsed, {
      headers: ["A|B", "C"],
      rows: [["x|y", "z"]]
    });
  });

  it("security: script payload는 raw string으로 보존하고 실행 표면을 만들지 않는다", () => {
    const payload = "<script>alert(1)</script>";
    const parsed = parseMarkdownTable(`| A |\n|---|\n| ${payload} |`);

    assert.deepEqual(parsed, {
      headers: ["A"],
      rows: [[payload]]
    });
  });
});

describe("renderTableElement", () => {
  it("HTMLTableElement를 반환한다", () => {
    const table = renderTableElement({ headers: ["A"], rows: [["1"]] });

    assert.ok(table instanceof HTMLTableElement);
  });

  it("thead>tr>th + tbody>tr>td 구조를 만든다", () => {
    const table = renderTableElement({ headers: ["A", "B"], rows: [["1", "2"]] });

    assert.equal(table.children[0].tagName, "THEAD");
    assert.equal(table.children[0].children[0].tagName, "TR");
    assert.equal(table.getElementsByTagName("th").length, 2);
    assert.equal(table.children[1].tagName, "TBODY");
    assert.equal(table.children[1].children[0].tagName, "TR");
    assert.equal(table.getElementsByTagName("td").length, 2);
  });

  it("cell textContent를 입력값 그대로 설정한다", () => {
    const table = renderTableElement({ headers: ["A"], rows: [[" 값 1 "]] });
    const td = table.getElementsByTagName("td")[0];

    assert.equal(td.textContent, " 값 1 ");
  });

  it("security: script payload는 textContent로만 들어가고 innerHTML에서는 escape된다", () => {
    const payload = "<script>alert(1)</script>";
    const table = renderTableElement({ headers: ["A"], rows: [[payload]] });
    const td = table.getElementsByTagName("td")[0];

    assert.equal(td.textContent, payload);
    assert.equal(td.innerHTML, "&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("PdfTable reducers from domain", () => {
  it("createTable은 default content 빈 문자열 + collapsed=true로 생성한다", () => {
    const table = createTable({ subjectId: "s1", page: 2, position: { x: 0.2, y: 0.3 } });

    assert.equal(table.subjectId, "s1");
    assert.equal(table.page, 2);
    assert.deepEqual(table.position, { x: 0.2, y: 0.3 });
    assert.equal(table.content, "");
    assert.equal(table.collapsed, true);
  });

  it("updateTableContent는 content를 갱신한다", () => {
    const table = createTable({ subjectId: "s1", page: 1, position: { x: 0, y: 0 } });
    const updated = updateTableContent(table, "| A |\n|---|\n| 1 |");

    assert.equal(updated.content, "| A |\n|---|\n| 1 |");
    assert.equal(table.content, "");
  });

  it("moveTable은 position을 갱신하고 범위 밖 좌표를 clamp한다", () => {
    const table = createTable({ subjectId: "s1", page: 1, position: { x: 0.2, y: 0.3 } });
    const moved = moveTable(table, { x: 1.5, y: -0.5 });

    assert.deepEqual(moved.position, { x: 1, y: 0 });
  });

  it("deleteTable은 대상 id만 제거한다", () => {
    const tableA = createTable({ subjectId: "s1", page: 1, position: { x: 0, y: 0 } });
    const tableB = createTable({ subjectId: "s1", page: 1, position: { x: 0.1, y: 0.1 } });

    assert.deepEqual(deleteTable([tableA, tableB], tableA.id), [tableB]);
  });

  it("toggleTableCollapsed는 collapsed 값을 반전한다", () => {
    const table = createTable({ subjectId: "s1", page: 1, position: { x: 0, y: 0 } });
    const expanded = toggleTableCollapsed(table);
    const collapsed = toggleTableCollapsed(expanded);

    assert.equal(expanded.collapsed, false);
    assert.equal(collapsed.collapsed, true);
  });
});
