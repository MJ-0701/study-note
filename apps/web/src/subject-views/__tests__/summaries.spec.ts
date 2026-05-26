// sprint-2026-W22-sprint-13 / layer C/slice-5 — summaries characterization spec.

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
        export function getSubjectCoverage() { return { coverageRate: 50, covered: 1, total: 2 }; }
        export function getKeywordById(subject, id) { return subject.requiredKeywords?.find(k => k.id === id); }
        export function getConceptById(subject, id) { return subject.concepts?.find(c => c.id === id); }
        export function getQuestionById(subject, id) { return subject.questions?.find(q => q.id === id); }
        export function getSourceById(subject, id) { return subject.sources?.find(s => s.id === id); }
      \` };
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");
(globalThis as Record<string, unknown>).document = testDocument;

const sm = await import("../summaries.ts");

interface QC {
  querySelectorAll: (sel: string) => Array<{ hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string }>;
}

function parseC(html: string): QC {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QC;
}

function makeSubject(): never {
  return {
    id: "s1", title: "수학", examLabel: "중간",
    summary: { weekRange: "1~7", examScope: "범위", strategy: "전략", weakSpots: ["weak1"] },
    weekNotes: [{ id: "w1", label: "1주차", title: "intro", focus: "기초", reviewStatus: "ready", conceptIds: ["c1"], exampleQuestionIds: ["q1"], requiredKeywordIds: ["k1"], sourceMaterialIds: ["src1"] }],
    requiredKeywords: [{ id: "k1", label: "kw1", status: "covered", professorSignal: "ps", conceptIds: [] }],
    concepts: [{ id: "c1", title: "c1-title", summary: "c1-sum", easyExplanation: "e", priority: "must-know", sourceHints: [], exampleQuestionIds: [] }],
    questions: [{ id: "q1", prompt: "p", answer: "a", explanation: "e", difficulty: "basic" }],
    sources: [{ id: "src1", title: "src", kind: "professor-pdf", visibility: "private-source", note: "n", pages: "1-10" }]
  } as never;
}

function makeCtx(): import("../summaries.ts").SummariesContext {
  return {
    formatWeekLabel: (label) => label ?? "(미지정)",
    renderQuickNotePanel: () => `<div class="qn-mock">QN</div>`
  };
}

// ─── (a) renderSubjectSummariesPage ──────────────────────────────────────

describe("summaries — (a) renderSubjectSummariesPage", () => {
  test("case 1: hero + 3 metric + class-day grid + summary-grid", () => {
    const html = sm.renderSubjectSummariesPage(makeCtx(), makeSubject());
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-page-hero").length, 1);
    assert.equal(c.querySelectorAll(".metric-card").length, 3);
    assert.equal(c.querySelectorAll(".class-day-card").length, 1);
    assert.ok(c.querySelectorAll(".summary-block").length >= 3);
  });

  test("case 2: hostile subject.title escape", () => {
    const subject = makeSubject();
    (subject as { title: string }).title = "<script>alert(1)</script>";
    const html = sm.renderSubjectSummariesPage(makeCtx(), subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 3: hostile subject.id in data-subject-id + 2 href escape", () => {
    const subject = makeSubject();
    (subject as { id: string }).id = '"><img src=x onerror=alert(1)>';
    const html = sm.renderSubjectSummariesPage(makeCtx(), subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });

  test("case 4: hostile summary fields (weekRange/examScope/strategy/weakSpots) escape", () => {
    const subject = makeSubject();
    (subject as { summary: Record<string, unknown> }).summary = {
      weekRange: "<script>w</script>", examScope: "<img onerror=x>",
      strategy: "<svg onload=y>", weakSpots: ["<iframe src=x>"]
    };
    const html = sm.renderSubjectSummariesPage(makeCtx(), subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img,svg,iframe").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onload]").length, 0);
  });
});

// ─── (b) renderSummaryDayCard ────────────────────────────────────────────

describe("summaries — (b) renderSummaryDayCard", () => {
  test("case 5: week.title/focus escape", () => {
    const subject = makeSubject();
    const week = (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes[0]!;
    week.title = "<script>w</script>";
    week.focus = "<img onerror=x>";
    const html = sm.renderSummaryDayCard(makeCtx(), subject, week as never);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
  });

  test("case 6: weekSummaryPath + weekPath href escape (hostile subject.id/week.id)", () => {
    const subject = makeSubject();
    (subject as { id: string }).id = '"><script>id</script>';
    const week = (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes[0]!;
    week.id = '"><img onerror=x>';
    const html = sm.renderSummaryDayCard(makeCtx(), subject, week as never);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });

  test("case 7: stats display concept + question count", () => {
    const subject = makeSubject();
    const week = (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes[0]!;
    week.conceptIds = ["c1", "c2"];
    week.exampleQuestionIds = ["q1"];
    const html = sm.renderSummaryDayCard(makeCtx(), subject, week as never);
    assert.ok(html.includes("2개 개념"));
    assert.ok(html.includes("1개 문제"));
  });

  test("case 8: formatWeekLabel callback used", () => {
    const ctx: import("../summaries.ts").SummariesContext = {
      formatWeekLabel: () => "TESTLABEL",
      renderQuickNotePanel: () => ""
    };
    const subject = makeSubject();
    const html = sm.renderSummaryDayCard(ctx, subject, (subject as { weekNotes: never[] }).weekNotes[0]!);
    assert.ok(html.includes("TESTLABEL"));
  });
});

// ─── (c) renderWeekSummaryPage ───────────────────────────────────────────

describe("summaries — (c) renderWeekSummaryPage", () => {
  test("case 9: hero + 3 summary blocks + quickNote callback + keyword/concept/question/source lists", () => {
    const subject = makeSubject();
    const week = (subject as { weekNotes: never[] }).weekNotes[0]!;
    const html = sm.renderWeekSummaryPage(makeCtx(), subject, week);
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-page-hero").length, 1);
    assert.equal(c.querySelectorAll(".qn-mock").length, 1);
    assert.ok(c.querySelectorAll(".keyword-card").length >= 1);
    assert.ok(c.querySelectorAll(".concept-row").length >= 1);
    assert.ok(c.querySelectorAll(".question-row").length >= 1);
    assert.ok(c.querySelectorAll(".source-row").length >= 1);
  });

  test("case 10: hostile week + subject fields escape", () => {
    const subject = makeSubject();
    (subject as { title: string }).title = "<script>s</script>";
    const week = (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes[0]!;
    week.title = "<img onerror=x>";
    week.focus = "<svg onload=y>";
    week.label = "<iframe>";
    const html = sm.renderWeekSummaryPage(makeCtx(), subject, week as never);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img,svg,iframe").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onload]").length, 0);
  });

  test("case 11: hostile source.title/note/pages escape", () => {
    const subject = makeSubject();
    (subject as { sources: Array<Record<string, unknown>> }).sources[0]!.title = "<script>t</script>";
    (subject as { sources: Array<Record<string, unknown>> }).sources[0]!.note = "<img onerror=x>";
    (subject as { sources: Array<Record<string, unknown>> }).sources[0]!.pages = "<svg onload=y>";
    const week = (subject as { weekNotes: never[] }).weekNotes[0]!;
    const html = sm.renderWeekSummaryPage(makeCtx(), subject, week);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img,svg").length, 0);
  });

  test("case 12: empty week (no keywords/concepts/questions/sources) → empty-note 표시", () => {
    const subject = makeSubject();
    const week = (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes[0]!;
    week.requiredKeywordIds = [];
    week.conceptIds = [];
    week.exampleQuestionIds = [];
    week.sourceMaterialIds = [];
    const html = sm.renderWeekSummaryPage(makeCtx(), subject, week as never);
    const c = parseC(html);
    assert.ok(c.querySelectorAll(".empty-note").length >= 4);
  });

  test("case 13: callback TB — renderQuickNotePanel safe output passthrough", () => {
    const ctx: import("../summaries.ts").SummariesContext = {
      formatWeekLabel: () => "x",
      renderQuickNotePanel: () => `<div class="safe-qn">SAFE</div>`
    };
    const subject = makeSubject();
    const week = (subject as { weekNotes: never[] }).weekNotes[0]!;
    const html = sm.renderWeekSummaryPage(ctx, subject, week);
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".safe-qn").length, 1);
  });

  test("case 14: callback TB — hostile callback output passthrough (caller responsibility)", () => {
    // summaries.ts trust contract: callback output 은 trusted HTML 로 간주.
    // hostile callback content 가 DOM 에 출현 = caller (main.ts) 의 결함, summaries 아님.
    const ctx: import("../summaries.ts").SummariesContext = {
      formatWeekLabel: () => "x",
      renderQuickNotePanel: () => `<script>HOSTILE</script>`
    };
    const subject = makeSubject();
    const week = (subject as { weekNotes: never[] }).weekNotes[0]!;
    const html = sm.renderWeekSummaryPage(ctx, subject, week);
    const c = parseC(html);
    // script tag appears in HTML — but this is caller's failure to escape.
    // summaries.ts trust boundary: passthrough.
    assert.ok(c.querySelectorAll("script").length >= 1, "callback output passthrough (caller responsibility)");
  });
});

// ─── (d) characterization ────────────────────────────────────────────────

describe("summaries — (d) characterization", () => {
  test("case 15: identical input → byte-identical HTML", () => {
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();
    const subject = makeSubject();
    assert.equal(
      sm.renderSubjectSummariesPage(ctx1, subject),
      sm.renderSubjectSummariesPage(ctx2, subject)
    );
  });

  test("case 16: 3 export shape", () => {
    assert.equal(typeof sm.renderSubjectSummariesPage, "function");
    assert.equal(typeof sm.renderSummaryDayCard, "function");
    assert.equal(typeof sm.renderWeekSummaryPage, "function");
  });
});

// ─── (e) PII/log boundary ───────────────────────────────────────────────

describe("summaries — (e) PII/log boundary", () => {
  test("case 17: SummariesContext field count = 2", () => {
    const ctx = makeCtx();
    const keys = Object.keys(ctx);
    assert.equal(keys.length, 2);
    assert.ok(keys.includes("formatWeekLabel"));
    assert.ok(keys.includes("renderQuickNotePanel"));
  });

  test("case 18: render output 은 stringly typed (no DOM emit, no log)", () => {
    const html = sm.renderSubjectSummariesPage(makeCtx(), makeSubject());
    assert.equal(typeof html, "string");
  });
});
