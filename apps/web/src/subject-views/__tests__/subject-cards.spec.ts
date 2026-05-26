// sprint-2026-W22-sprint-9 / layer C/slice-1 — subject-cards characterization spec.
// AC4: 18~22 case (a~m 군). AC5: AC9 user-content surface + href trust boundary.

import { strict as assert } from "node:assert";
import { register } from "node:module";
import { describe, test } from "node:test";

register(
  "data:text/javascript," + encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "@study-note/domain") {
        return { url: "study-note-test:domain", shortCircuit: true };
      }
      try {
        return await nextResolve(specifier, context);
      } catch (error) {
        const withoutQuery = specifier.split(/[?#]/, 1)[0] ?? specifier;
        if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.[A-Za-z0-9]+$/.test(withoutQuery)) {
          return nextResolve(specifier + ".ts", context);
        }
        throw error;
      }
    }
    export async function load(url, context, nextLoad) {
      if (url === "study-note-test:domain") {
        return {
          format: "module",
          shortCircuit: true,
          source: \`
            export function getSubjectCoverage(subject) {
              const total = subject.requiredKeywords?.length ?? 0;
              const covered = subject.requiredKeywords?.filter(k => k.status === "covered").length ?? 0;
              return { coverageRate: total > 0 ? Math.round(covered / total * 100) : 0 };
            }
            export function getConceptById(subject, conceptId) {
              return subject.concepts?.find(c => c.id === conceptId);
            }
            export function getQuestionById(subject, questionId) {
              return subject.questions?.find(q => q.id === questionId);
            }
          \`
        };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");
(globalThis as Record<string, unknown>).document = testDocument;

const subjectCards = await import("../subject-cards.ts");

interface QueryContainer {
  innerHTML: string;
  querySelectorAll: (sel: string) => Array<{ hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string }>;
  querySelector: (sel: string) => { hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string } | null;
  textContent: string;
}

function parseContainer(html: string): QueryContainer {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QueryContainer;
}

// ─── Fixture builders ────────────────────────────────────────────────────

function makeSubject(overrides: Partial<{ id: string; title: string; examLabel: string; weekRange: string; goal: string }> = {}): never {
  return {
    id: overrides.id ?? "subj-1",
    title: overrides.title ?? "수학",
    examLabel: overrides.examLabel ?? "중간고사",
    summary: {
      weekRange: overrides.weekRange ?? "1~7주차",
      goal: overrides.goal ?? "선형대수 기초"
    },
    concepts: [],
    questions: [],
    requiredKeywords: [{ id: "k1", label: "행렬", status: "covered" }]
  } as never;
}

function makeKeyword(overrides: Partial<{ id: string; label: string; professorSignal: string; status: "covered" | "missing"; conceptIds: string[] }> = {}): never {
  return {
    id: overrides.id ?? "kw-1",
    label: overrides.label ?? "행렬",
    professorSignal: overrides.professorSignal ?? "강의 §2",
    status: overrides.status ?? "covered",
    conceptIds: overrides.conceptIds ?? []
  } as never;
}

function makeConcept(overrides: Partial<{ id: string; title: string; summary: string; easyExplanation: string; priority: "must-know" | "high" | "review"; sourceHints: string[]; exampleQuestionIds: string[] }> = {}): never {
  return {
    id: overrides.id ?? "c1",
    title: overrides.title ?? "행렬 곱셈",
    summary: overrides.summary ?? "AB ≠ BA",
    easyExplanation: overrides.easyExplanation ?? "행 곱 열",
    priority: overrides.priority ?? "must-know",
    sourceHints: overrides.sourceHints ?? ["§2.1", "§2.3"],
    exampleQuestionIds: overrides.exampleQuestionIds ?? []
  } as never;
}

function makeQuestion(overrides: Partial<{ id: string; prompt: string; answer: string; explanation: string; difficulty: "basic" | "advanced" }> = {}): never {
  return {
    id: overrides.id ?? "q1",
    prompt: overrides.prompt ?? "AB = ?",
    answer: overrides.answer ?? "계산",
    explanation: overrides.explanation ?? "정의",
    difficulty: overrides.difficulty ?? "basic"
  } as never;
}

// ─── (a) renderMetric — caller-trust boundary ────────────────────────────

describe("subject-cards — (a) renderMetric (caller trust boundary)", () => {
  test("case 1: renders metric card with trusted constants", () => {
    const html = subjectCards.renderMetric("진도", "85%", "남은 주차 2");
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".metric-card").length, 1);
    assert.ok(html.includes("진도"));
    assert.ok(html.includes("85%"));
    assert.ok(html.includes("남은 주차 2"));
  });
});

// ─── (b) renderSubjectCard — escape + href ───────────────────────────────

describe("subject-cards — (b) renderSubjectCard (escape + href)", () => {
  test("case 2: happy path — escape applied to title/examLabel/weekRange/goal + escaped href", () => {
    const subject = makeSubject({ title: "수학", examLabel: "중간", weekRange: "1~7주차", goal: "기초" });
    const html = subjectCards.renderSubjectCard(subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".subject-card").length, 1);
    assert.ok(html.includes("수학"));
    assert.ok(html.includes("중간"));
    assert.ok(html.includes("기초"));
    const anchor = c.querySelector("a");
    assert.ok(anchor);
    assert.ok((anchor!.getAttribute("href") ?? "").includes("subj-1"));
  });

  test("case 3: hostile subject.title XSS → no script/img element", () => {
    const subject = makeSubject({ title: "<script>alert(1)</script>" });
    const html = subjectCards.renderSubjectCard(subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script").length, 0);
    assert.equal(c.querySelectorAll("img").length, 0);
  });

  test("case 4: AC5 S5a — hostile subject.id in subjectClassPath href escape (defensive)", () => {
    const subject = makeSubject({ id: '"><img src=x onerror=alert(1)>' });
    const html = subjectCards.renderSubjectCard(subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onfocus],[onload]").length, 0);
  });
});

// ─── (c) renderSubjectImportCard — same pattern w/ subjectIntakePath ─────

describe("subject-cards — (c) renderSubjectImportCard (escape + intake href)", () => {
  test("case 5: happy path — escape applied + escaped href", () => {
    const subject = makeSubject({ title: "물리" });
    const html = subjectCards.renderSubjectImportCard(subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".subject-card").length, 1);
    assert.ok(html.includes("물리"));
    assert.ok(html.includes("자료 넣기"));
  });

  test("case 6: AC5 S5b — hostile subject.id in subjectIntakePath href escape", () => {
    const subject = makeSubject({ id: '"><script>x</script>' });
    const html = subjectCards.renderSubjectImportCard(subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (d) renderSummaryBlock — caller-trust ───────────────────────────────

describe("subject-cards — (d) renderSummaryBlock (caller trust boundary)", () => {
  test("case 7: renders summary block with trusted constants", () => {
    const html = subjectCards.renderSummaryBlock("총괄", "80%");
    assert.ok(html.includes("총괄"));
    assert.ok(html.includes("80%"));
  });
});

// ─── (e) renderKeyword — escape × status branch ──────────────────────────

describe("subject-cards — (e) renderKeyword (status branch + escape)", () => {
  test("case 8: status=covered → is-covered class + 정리노트 만들기 button label", () => {
    const subject = makeSubject();
    const keyword = makeKeyword({ status: "covered" });
    const html = subjectCards.renderKeyword(keyword, subject);
    assert.ok(html.includes("is-covered"));
    assert.ok(html.includes("정리노트 만들기"));
    assert.ok(html.includes("반영됨"));
  });

  test("case 9: status=missing → is-missing class + 보강 템플릿 만들기", () => {
    const subject = makeSubject();
    const keyword = makeKeyword({ status: "missing" });
    const html = subjectCards.renderKeyword(keyword, subject);
    assert.ok(html.includes("is-missing"));
    assert.ok(html.includes("보강 템플릿 만들기"));
  });

  test("case 10: hostile keyword.label XSS → escape", () => {
    const subject = makeSubject();
    const keyword = makeKeyword({ label: "<script>alert(1)</script>" });
    const html = subjectCards.renderKeyword(keyword, subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 11: linked concepts non-empty path — each concept.title escape", () => {
    const subject = {
      ...makeSubject(),
      concepts: [{ id: "c-x", title: "<svg/onload=alert(1)>" }]
    } as never;
    const keyword = makeKeyword({ conceptIds: ["c-x"] });
    const html = subjectCards.renderKeyword(keyword, subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("svg").length, 0);
  });

  test("case 12: data-keyword-id / data-subject-id attribute escape (hostile)", () => {
    const subject = makeSubject({ id: '"><img onerror=alert(1)>' });
    const keyword = makeKeyword({ id: '"><script>alert(2)</script>' });
    const html = subjectCards.renderKeyword(keyword, subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("script").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (f) renderConcept — escape + priority branch ────────────────────────

describe("subject-cards — (f) renderConcept (priority + escape)", () => {
  test("case 13: priority=must-know → 필수 개념 + concept.id 가 article id attr 에 escape", () => {
    const subject = makeSubject();
    const concept = makeConcept({ priority: "must-know", id: "c-1" });
    const html = subjectCards.renderConcept(concept, subject);
    assert.ok(html.includes("필수 개념"));
    assert.ok(html.includes('id="c-1"'));
  });

  test("case 14: hostile concept fields (title/summary/easyExplanation/sourceHints) → escape", () => {
    const subject = makeSubject();
    const concept = makeConcept({
      title: "<script>1</script>",
      summary: "<svg/onload=alert(2)>",
      easyExplanation: '"><img onerror=alert(3)>',
      sourceHints: ["<iframe src=x>"]
    });
    const html = subjectCards.renderConcept(concept, subject);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script,svg,img,iframe").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onload]").length, 0);
  });
});

// ─── (g) renderQuestion — escape + difficulty branch ─────────────────────

describe("subject-cards — (g) renderQuestion (difficulty + escape)", () => {
  test("case 15: difficulty=basic → 기본 + escape", () => {
    const question = makeQuestion({ difficulty: "basic" });
    const html = subjectCards.renderQuestion(question);
    assert.ok(html.includes("기본"));
  });

  test("case 16: difficulty=advanced → 응용", () => {
    const question = makeQuestion({ difficulty: "advanced" });
    const html = subjectCards.renderQuestion(question);
    assert.ok(html.includes("응용"));
  });

  test("case 17: hostile question.prompt/answer/explanation escape", () => {
    const question = makeQuestion({
      prompt: "<script>p</script>",
      answer: "<svg/onload=alert(1)>",
      explanation: '"><img onerror=alert(2)>'
    });
    const html = subjectCards.renderQuestion(question);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script,svg,img").length, 0);
  });
});

// ─── (h) renderWeekColumn — empty vs non-empty + value escape ────────────

describe("subject-cards — (h) renderWeekColumn (empty branch + value escape)", () => {
  test("case 18: empty values → 추가 정리 필요 placeholder", () => {
    const html = subjectCards.renderWeekColumn("개념", []);
    assert.ok(html.includes("추가 정리 필요"));
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("ul li").length, 0);
  });

  test("case 19: non-empty values → ul li per item + escape per value", () => {
    const html = subjectCards.renderWeekColumn("개념", ["a", "<script>b</script>"]);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("ul li").length, 2);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (i) Format helpers — union literal returns ──────────────────────────

describe("subject-cards — (i) format helpers (union literal)", () => {
  test("case 20: formatQuickNoteStatus + formatKeywordStatus + formatConceptPriority", () => {
    assert.equal(subjectCards.formatQuickNoteStatus("ready"), "바로 읽기");
    assert.equal(subjectCards.formatQuickNoteStatus("needs-fill"), "보강 필요");
    assert.equal(subjectCards.formatKeywordStatus("covered"), "반영됨");
    assert.equal(subjectCards.formatKeywordStatus("missing"), "보강 필요");
    assert.equal(subjectCards.formatConceptPriority("must-know"), "필수 개념");
    assert.equal(subjectCards.formatConceptPriority("high"), "중요 개념");
    assert.equal(subjectCards.formatConceptPriority("review"), "복습 개념");
  });

  test("case 21: formatReviewStatus + formatQuestionDifficulty + formatSourceKind + formatSourceVisibility", () => {
    assert.equal(subjectCards.formatReviewStatus("ready"), "읽기 가능");
    assert.equal(subjectCards.formatReviewStatus("needs-fill" as never), "보강 필요");
    assert.equal(subjectCards.formatQuestionDifficulty("basic"), "기본");
    assert.equal(subjectCards.formatQuestionDifficulty("advanced" as never), "응용");
    assert.equal(subjectCards.formatSourceKind("professor-pdf"), "교수님 PDF");
    assert.equal(subjectCards.formatSourceKind("claude-summary"), "Claude 요약");
    assert.equal(subjectCards.formatSourceKind("manual-keyword"), "수동 키워드");
    assert.equal(subjectCards.formatSourceVisibility("private-source"), "원문 비공개");
    assert.equal(subjectCards.formatSourceVisibility("derived-note-only"), "생성 노트만 공유");
  });
});

// ─── (j) Characterization — determinism ──────────────────────────────────

describe("subject-cards — (j) characterization (deterministic render)", () => {
  test("case 22: identical input → byte-identical HTML", () => {
    const s1 = makeSubject({ id: "x", title: "데이터" });
    const s2 = makeSubject({ id: "x", title: "데이터" });
    assert.equal(subjectCards.renderSubjectCard(s1), subjectCards.renderSubjectCard(s2));
    const k1 = makeKeyword({ id: "k", label: "행렬" });
    const k2 = makeKeyword({ id: "k", label: "행렬" });
    assert.equal(subjectCards.renderKeyword(k1, s1), subjectCards.renderKeyword(k2, s2));
  });
});
