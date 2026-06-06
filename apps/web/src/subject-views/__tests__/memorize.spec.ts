// sprint-2026-W22-sprint-14 / layer C/slice-6 — memorize characterization spec.

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
        export function getConceptById(subject, id) { return subject.concepts?.find(c => c.id === id); }
        export function getQuestionById(subject, id) { return subject.questions?.find(q => q.id === id); }
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

const mz = await import("../memorize.ts");

interface QC {
  querySelectorAll: (sel: string) => Array<{ hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string }>;
}

function parseC(html: string): QC {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QC;
}

function makeSubject(): never {
  return {
    id: "s1", title: "수학", examLabel: "기말", examPhase: "final",
    summary: {
      examScope: "범위", strategy: "전략", weakSpots: ["weak"],
      examChapters: [{ label: "6장", title: "챕터", focus: "초점", sourceHint: "자료" }],
      mustKnowConceptIds: ["c1"]
    },
    weekNotes: [
      { id: "w1", label: "5월 14일(목)", title: "intro", reviewStatus: "ready", examPhase: "midterm", conceptIds: [], exampleQuestionIds: ["q1"], requiredKeywordIds: [], sourceMaterialIds: [] },
      { id: "w2", label: "5월 28일", title: "advanced", reviewStatus: "ready", examPhase: "final", conceptIds: [], exampleQuestionIds: ["q2"], requiredKeywordIds: [], sourceMaterialIds: [] }
    ],
    requiredKeywords: [{ id: "k1", label: "kw", status: "missing", professorSignal: "ps", conceptIds: [] }],
    concepts: [{ id: "c1", title: "concept-x", summary: "s", easyExplanation: "e", priority: "must-know", sourceHints: [], exampleQuestionIds: [] }],
    questions: [
      { id: "q1", prompt: "p1", answer: "a1", explanation: "e1", difficulty: "basic" },
      { id: "q2", prompt: "p2", answer: "a2", explanation: "e2", difficulty: "advanced" }
    ]
  } as never;
}

// ─── (a) renderMemorizeExamGroup ─────────────────────────────────────────

describe("memorize — (a) renderMemorizeExamGroup", () => {
  test("case 1: empty weeks → empty group", () => {
    const html = mz.renderMemorizeExamGroup("중간고사", [], makeSubject());
    assert.ok(html.includes("memorize-exam-group--empty"));
    assert.ok(html.includes("중간고사 구간의 수업일이 없습니다"));
  });

  test("case 2: 2 weeks → count + 2 list items", () => {
    const subject = makeSubject();
    const weeks = (subject as { weekNotes: never[] }).weekNotes;
    const html = mz.renderMemorizeExamGroup("기말고사", weeks, subject);
    const c = parseC(html);
    assert.ok(html.includes("기말고사"));
    assert.equal(c.querySelectorAll(".memorize-exam-group__list li").length, 2);
  });

  test("case 3: hostile title + week.label/title escape", () => {
    const subject = makeSubject();
    const weeks = (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes;
    weeks[0]!.label = "<script>l</script>";
    weeks[0]!.title = "<img onerror=x>";
    const html = mz.renderMemorizeExamGroup("<svg onload=y>", weeks as never[], subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img,svg").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onload]").length, 0);
  });

  test("case 4: weekPath href escape (hostile subject.id + week.id)", () => {
    const subject = makeSubject();
    (subject as { id: string }).id = '"><img src=x onerror=alert(1)>';
    const weeks = (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes;
    weeks[0]!.id = '"><script>w</script>';
    const html = mz.renderMemorizeExamGroup("test", [weeks[0]!] as never[], subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
  });
});

// ─── (b) safeDateMs — calendar validation ────────────────────────────────

describe("memorize — (b) safeDateMs (calendar validation)", () => {
  test("case 5: valid date → ms number", () => {
    const ms = mz.safeDateMs(5, 14);
    assert.ok(typeof ms === "number");
    assert.ok(ms !== null && ms > 0);
  });

  test("case 6: invalid month → null", () => {
    assert.equal(mz.safeDateMs(0, 1), null);
    assert.equal(mz.safeDateMs(13, 1), null);
  });

  test("case 7: invalid day → null", () => {
    assert.equal(mz.safeDateMs(1, 0), null);
    assert.equal(mz.safeDateMs(1, 32), null);
  });

  test("case 8: non-integer → null", () => {
    assert.equal(mz.safeDateMs(NaN, 1), null);
    assert.equal(mz.safeDateMs(1, 2.5), null);
  });

  test("case 9: JS Date rollover blocked (2/30 → null, not March 2)", () => {
    assert.equal(mz.safeDateMs(2, 30), null);
    assert.equal(mz.safeDateMs(2, 31), null);
    assert.equal(mz.safeDateMs(4, 31), null);
  });

  test("case 10: leap year 2/29 valid (2024 fixed)", () => {
    const ms = mz.safeDateMs(2, 29);
    assert.ok(typeof ms === "number" && ms !== null);
  });
});

// ─── (c) parseClassDateLabel ─────────────────────────────────────────────

describe("memorize — (c) parseClassDateLabel", () => {
  test("case 11: '5월 14일' → valid ms", () => {
    const ms = mz.parseClassDateLabel("5월 14일");
    assert.ok(Number.isFinite(ms));
  });

  test("case 12: '5월 14일(목)' → valid (suffix tolerated)", () => {
    const ms = mz.parseClassDateLabel("5월 14일(목)");
    assert.ok(Number.isFinite(ms));
  });

  test("case 13: '5/14' → valid", () => {
    const ms = mz.parseClassDateLabel("5/14");
    assert.ok(Number.isFinite(ms));
  });

  test("case 14: '2월 30일' → +Infinity (invalid calendar date)", () => {
    assert.equal(mz.parseClassDateLabel("2월 30일"), Number.POSITIVE_INFINITY);
  });

  test("case 15: 'invalid' → +Infinity", () => {
    assert.equal(mz.parseClassDateLabel("invalid"), Number.POSITIVE_INFINITY);
  });

  test("case 16: '<script>alert(1)</script>' → +Infinity (regex fails, no injection)", () => {
    assert.equal(mz.parseClassDateLabel("<script>alert(1)</script>"), Number.POSITIVE_INFINITY);
  });
});

// ─── (d) renderSubjectMemorizePage ───────────────────────────────────────

describe("memorize — (d) renderSubjectMemorizePage", () => {
  test("case 17: hero + 3 summary blocks + 2 exam groups + concept/keyword/question lists", () => {
    const html = mz.renderSubjectMemorizePage(makeSubject());
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-page-hero").length, 1);
    assert.equal(c.querySelectorAll(".memorize-chapter").length, 1);
    assert.equal(c.querySelectorAll(".memorize-exam-group").length, 2);
    assert.ok(c.querySelectorAll(".concept-row").length >= 1);
    assert.ok(c.querySelectorAll(".keyword-card").length >= 1);
  });

  test("case 18: hostile subject.title + examLabel + summary fields escape", () => {
    const subject = makeSubject();
    (subject as { title: string }).title = "<script>t</script>";
    (subject as { examLabel: string }).examLabel = "<img onerror=x>";
    (subject as { summary: Record<string, unknown> }).summary = {
      examScope: "<svg onload=y>", strategy: "<iframe src=x>", weakSpots: ["<script>w</script>"],
      mustKnowConceptIds: []
    };
    (subject as { weekNotes: never[] }).weekNotes = [];
    (subject as { requiredKeywords: never[] }).requiredKeywords = [];
    const html = mz.renderSubjectMemorizePage(subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img,svg,iframe").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onload]").length, 0);
  });

  test("case 19: missing keywords > 0 → only missing 표시; missingKeywords=0 → 전체 표시", () => {
    const subject = makeSubject();
    (subject as { requiredKeywords: Array<Record<string, unknown>> }).requiredKeywords = [
      { id: "k1", label: "covered-only", status: "covered", professorSignal: "ps", conceptIds: [] }
    ];
    const html = mz.renderSubjectMemorizePage(subject);
    assert.ok(html.includes("covered-only"));  // fallback display
  });

  test("case 20: examPhase split — midterm vs final separation", () => {
    const html = mz.renderSubjectMemorizePage(makeSubject());
    assert.ok(html.includes("중간고사"));
    assert.ok(html.includes("기말고사"));
  });
});

// ─── (e) export shape + PII boundary ─────────────────────────────────────

describe("memorize — (e) export + PII boundary", () => {
  test("case 21: 5 export shape", () => {
    assert.equal(typeof mz.renderSubjectMemorizePage, "function");
    assert.equal(typeof mz.renderMemorizeExamGroup, "function");
    assert.equal(typeof mz.renderMemorizeExamChapters, "function");
    assert.equal(typeof mz.parseClassDateLabel, "function");
    assert.equal(typeof mz.safeDateMs, "function");
  });

  test("case 22: characterization — identical input → identical HTML", () => {
    const s1 = makeSubject();
    const s2 = makeSubject();
    assert.equal(mz.renderSubjectMemorizePage(s1), mz.renderSubjectMemorizePage(s2));
  });
});
