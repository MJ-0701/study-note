// sprint-2026-W22-sprint-2 / layer B/slice-2f/ii — markdown-table characterization spec.
// 5 invariant ↔ 12 case (plan §9.1). 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/pdf-workspace/__tests__/markdown-table.spec.ts

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  type ParsedMarkdownTable,
  parseMarkdownTable,
  serializeMarkdownTable,
  splitMarkdownTableRow
} from "../markdown-table.ts";

describe("markdown-table — invariant (a) round-trip lossless", () => {
  it("case 1: basic 2x1 round-trip (parse → serialize → parse 동일)", () => {
    const src = "| a | b |\n|---|---|\n| 1 | 2 |";
    const parsed = parseMarkdownTable(src);
    assert.deepEqual(parsed, { headers: ["a", "b"], rows: [["1", "2"]] });

    const serialized = serializeMarkdownTable(parsed!);
    const reParsed = parseMarkdownTable(serialized);
    assert.deepEqual(reParsed, parsed);
  });

  it("case 2: multi-row round-trip (3x3)", () => {
    const src = "| h1 | h2 | h3 |\n|---|---|---|\n| a | b | c |\n| d | e | f |\n| g | h | i |";
    const parsed = parseMarkdownTable(src);
    assert.deepEqual(parsed?.headers, ["h1", "h2", "h3"]);
    assert.equal(parsed?.rows.length, 3);

    const reParsed = parseMarkdownTable(serializeMarkdownTable(parsed!));
    assert.deepEqual(reParsed, parsed);
  });
});

describe("markdown-table — invariant (b) null fallback", () => {
  it("case 3: empty / whitespace-only source → null", () => {
    assert.equal(parseMarkdownTable(""), null);
    assert.equal(parseMarkdownTable("   "), null);
    assert.equal(parseMarkdownTable("\n\n"), null);
  });

  it("case 4: <2 lines → null", () => {
    assert.equal(parseMarkdownTable("| a | b |"), null);
  });

  it("case 5: separator mismatch → null", () => {
    assert.equal(parseMarkdownTable("| a | b |\n| no-sep |"), null);
    assert.equal(parseMarkdownTable("| a | b |\n|---|"), null);
    assert.equal(parseMarkdownTable("| a | b |\n| xxx | xxx |"), null);
  });
});

describe("markdown-table — invariant (c) row width normalize", () => {
  it("case 6: short row → '' padding", () => {
    const parsed = parseMarkdownTable("| a | b | c |\n|---|---|---|\n| x |");
    assert.deepEqual(parsed?.rows, [["x", "", ""]]);
  });

  it("case 7: overflow row → truncate to header width", () => {
    const parsed = parseMarkdownTable("| a |\n|---|\n| x | overflow | extra |");
    assert.deepEqual(parsed?.rows, [["x"]]);
  });
});

describe("markdown-table — invariant (d) pipe delimiter escape", () => {
  it("case 8: parse `\\|` escape decode → `|` in cell", () => {
    const parsed = parseMarkdownTable("| a\\|b |\n|---|\n| x |");
    assert.deepEqual(parsed?.headers, ["a|b"]);
  });

  it("case 9: serialize escape — cell `|` → `\\|` (round-trip symmetry)", () => {
    const input: ParsedMarkdownTable = {
      headers: ["a|b"],
      rows: [["x|y"]]
    };
    const serialized = serializeMarkdownTable(input);
    assert.equal(serialized.includes("a\\|b"), true);
    assert.equal(serialized.includes("x\\|y"), true);

    const reParsed = parseMarkdownTable(serialized);
    assert.deepEqual(reParsed, input);
  });
});

describe("markdown-table — invariant (e) XSS escape caller 책임 (leaf passthrough)", () => {
  it("case 10: attacker `<script>` / `<img onerror>` payload — leaf 는 raw 보존 (escape 안 함, caller 책임)", () => {
    const xssPayload = '<script>alert(1)</script>';
    const xssImg = '<img src=x onerror=alert(1)>';
    const xssJs = 'javascript:alert(1)';
    const src = `| ${xssPayload} | b |\n|---|---|\n| ${xssImg} | ${xssJs} |`;

    const parsed = parseMarkdownTable(src);
    assert.deepEqual(parsed?.headers, [xssPayload, "b"]);
    assert.deepEqual(parsed?.rows, [[xssImg, xssJs]]);

    const serialized = serializeMarkdownTable(parsed!);
    assert.equal(serialized.includes(xssPayload), true);
    assert.equal(serialized.includes(xssImg), true);

    assert.equal(serialized.includes("&lt;"), false);
    assert.equal(serialized.includes("&gt;"), false);
    assert.equal(serialized.includes("&amp;"), false);
  });
});

describe("markdown-table — invariant (f) leaf 무측효과 (pure function)", () => {
  it("case 11: module exports = function/interface only, no class/global mutate", () => {
    assert.equal(typeof parseMarkdownTable, "function");
    assert.equal(typeof serializeMarkdownTable, "function");
    assert.equal(typeof splitMarkdownTableRow, "function");
  });

  it("case 12: determinism — same input → same output, input string unchanged", () => {
    const src = "| a | b |\n|---|---|\n| 1 | 2 |";
    const beforeLen = src.length;

    const r1 = parseMarkdownTable(src);
    const r2 = parseMarkdownTable(src);
    assert.deepEqual(r1, r2);
    assert.notEqual(r1, r2);
    assert.equal(src.length, beforeLen);
  });
});
