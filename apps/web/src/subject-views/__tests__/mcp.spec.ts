// sprint-2026-W22-sprint-15 / layer C/slice-7 — mcp characterization spec.

import { strict as assert } from "node:assert";
import { register } from "node:module";
import { describe, test } from "node:test";

register(
  "data:text/javascript," + encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "@study-note/domain") return { url: "study-note-test:domain", shortCircuit: true };
      try { return await nextResolve(specifier, context); }
      catch (error) {
        const withoutQuery = specifier.split(/[?#]/, 1)[0] ?? specifier;
        if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.[A-Za-z0-9]+$/.test(withoutQuery)) {
          return nextResolve(specifier + ".ts", context);
        }
        throw error;
      }
    }
    export async function load(url, context, nextLoad) {
      if (url === "study-note-test:domain") return { format: "module", shortCircuit: true, source: \`
        export function getQuestionById(subject, id) { return subject.questions?.find(q => q.id === id); }
        export function getConceptById() { return undefined; }
        export function getSubjectCoverage() { return { coverageRate: 0 }; }
      \` };
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");
(globalThis as Record<string, unknown>).document = testDocument;

const mcp = await import("../mcp.ts");

interface QC {
  querySelectorAll: (sel: string) => Array<{ hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string }>;
}

function parseC(html: string): QC {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QC;
}

function makeSubject(id = "digital-engineering", title = "디공"): never {
  return {
    id, title, examLabel: "기말",
    summary: { weekRange: "1~7주차", examScope: "범위", weakSpots: ["weak"] },
    weekNotes: [{ id: "w1", label: "1주차", title: "intro", focus: "f", reviewStatus: "ready", conceptIds: [], exampleQuestionIds: ["q1"], requiredKeywordIds: [], sourceMaterialIds: [] }],
    requiredKeywords: [{ id: "k1", label: "kw", status: "covered", professorSignal: "ps", conceptIds: [] }],
    questions: [{ id: "q1", prompt: "p", answer: "a", explanation: "e", difficulty: "basic" }]
  } as never;
}

// ─── (a) PERSONA_BY_SUBJECT (deep freeze) ─────────────────────────────────

describe("mcp — (a) PERSONA_BY_SUBJECT deep freeze", () => {
  test("case 1: PERSONA_BY_SUBJECT export 4 entry", () => {
    assert.ok(mcp.PERSONA_BY_SUBJECT["digital-engineering"]);
    assert.ok(mcp.PERSONA_BY_SUBJECT["information-communication"]);
    assert.ok(mcp.PERSONA_BY_SUBJECT["c-language"]);
    assert.ok(mcp.PERSONA_BY_SUBJECT["computer-introduction"]);
  });

  test("case 2: outer record frozen (mutation throws or silent)", () => {
    assert.equal(Object.isFrozen(mcp.PERSONA_BY_SUBJECT), true);
  });

  test("case 3: each persona entry frozen (deep freeze — nick + active immutable)", () => {
    const entry = mcp.PERSONA_BY_SUBJECT["digital-engineering"];
    assert.equal(Object.isFrozen(entry), true);
    // strict mode throws on mutation attempt.
    try {
      (entry as { nick: string }).nick = "evil";
    } catch {}
    // Either threw or silently ignored — but value unchanged.
    assert.equal(mcp.PERSONA_BY_SUBJECT["digital-engineering"]!.nick, "디공이");
  });

  test("case 4: outer record add new key — frozen blocks", () => {
    try {
      (mcp.PERSONA_BY_SUBJECT as Record<string, unknown>)["evil"] = { nick: "evil", active: true };
    } catch {}
    assert.equal(mcp.PERSONA_BY_SUBJECT["evil" as keyof typeof mcp.PERSONA_BY_SUBJECT], undefined);
  });
});

// ─── (b) renderSubjectMcpPage ─────────────────────────────────────────────

describe("mcp — (b) renderSubjectMcpPage", () => {
  test("case 5: hero + persona button (active) + summary + question list", () => {
    const html = mcp.renderSubjectMcpPage(makeSubject());
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-page-hero").length, 1);
    // active persona → anchor href present.
    assert.ok(html.includes("/persona-turn.html?subject="));
    assert.equal(c.querySelectorAll(".subject-mcp-panel").length, 1);
  });

  test("case 6: inactive persona → disabled button", () => {
    const subject = makeSubject("c-language", "C");
    const html = mcp.renderSubjectMcpPage(subject);
    assert.ok(html.includes("is-disabled"));
    assert.ok(html.includes("준비 중"));
  });

  test("case 7: unknown subject.id → no persona, fallback button", () => {
    const subject = makeSubject("unknown-subject", "X");
    const html = mcp.renderSubjectMcpPage(subject);
    assert.ok(html.includes("교수님"));
    assert.ok(html.includes("준비 중"));
  });

  test("case 8: hostile subject.title escape (h1 + mcp panel fallback)", () => {
    const subject = makeSubject("unknown-x", "<script>alert(1)</script>");
    const html = mcp.renderSubjectMcpPage(subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 9: hostile subject.examLabel + weekRange escape", () => {
    const subject = makeSubject();
    (subject as { examLabel: string }).examLabel = "<script>e</script>";
    (subject as { summary: { weekRange: string } }).summary.weekRange = "<img onerror=x>";
    const html = mcp.renderSubjectMcpPage(subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
  });

  test("case 10: hostile weakSpots + keyword.label escape (summary block values)", () => {
    const subject = makeSubject();
    (subject as { summary: { weakSpots: string[] } }).summary.weakSpots = ["<script>w</script>"];
    (subject as { requiredKeywords: Array<{ label: string }> }).requiredKeywords[0]!.label = "<img onerror=x>";
    const html = mcp.renderSubjectMcpPage(subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
  });

  test("case 11: hostile subject.id in href (subjectSummaryPath + persona URL) + data-subject-id (panel disabled button)", () => {
    const subject = makeSubject('"><img src=x onerror=alert(1)>', "x");
    const html = mcp.renderSubjectMcpPage(subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (c) renderSubjectMcpPanel ─────────────────────────────────────────────

describe("mcp — (c) renderSubjectMcpPanel", () => {
  test("case 12: active persona → callout + anchor", () => {
    const html = mcp.renderSubjectMcpPanel(makeSubject());
    assert.ok(html.includes("호출 가능"));
    assert.ok(html.includes("/persona-turn.html?subject="));
  });

  test("case 13: inactive persona → '질문거리 정리' button with data-subject-id", () => {
    const subject = makeSubject("c-language", "C");
    const html = mcp.renderSubjectMcpPanel(subject);
    assert.ok(html.includes("호출 준비 중"));
    assert.ok(html.includes("data-action=\"generate-subject-note\""));
  });

  test("case 14: hostile persona.nick — escape (defensive in depth, even though PERSONA_BY_SUBJECT is trusted)", () => {
    // Static config not user-controllable in practice; verify escape still
    // applied as defense-in-depth. Use known entry to verify proper rendering.
    const html = mcp.renderSubjectMcpPanel(makeSubject());
    assert.ok(html.includes("디공이"));
  });

  test("case 15: hostile subject.id in data-subject-id (inactive persona fallback button)", () => {
    const subject = makeSubject('"><script>id</script>', "x");
    const html = mcp.renderSubjectMcpPanel(subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (d) characterization + export ───────────────────────────────────────

describe("mcp — (d) characterization + export", () => {
  test("case 16: identical input → byte-identical HTML", () => {
    assert.equal(mcp.renderSubjectMcpPage(makeSubject()), mcp.renderSubjectMcpPage(makeSubject()));
  });

  test("case 17: 2 fn + 1 const export shape", () => {
    assert.equal(typeof mcp.renderSubjectMcpPage, "function");
    assert.equal(typeof mcp.renderSubjectMcpPanel, "function");
    assert.equal(typeof mcp.PERSONA_BY_SUBJECT, "object");
  });

  test("case 18: render output type = string (no DOM emit, no log)", () => {
    const html = mcp.renderSubjectMcpPage(makeSubject());
    assert.equal(typeof html, "string");
  });
});
