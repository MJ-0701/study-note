// sprint-2026-W22-sprint-18 / layer C/slice-10 — quick-note characterization spec.

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
      if (url === "study-note-test:domain") {
        return { format: "module", shortCircuit: true, source: \`
          export function getConceptById(subject, id) { return subject.concepts?.find((c) => c.id === id); }
          export function getKeywordById(subject, id) { return subject.requiredKeywords?.find((k) => k.id === id); }
          export function getQuestionById(subject, id) { return subject.questions?.find((q) => q.id === id); }
          export function getSubjectCoverage() { return { coverageRate: 0 }; }
        \` };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");
(globalThis as Record<string, unknown>).document = testDocument;

const qn = await import("../quick-note.ts");

interface QC {
  querySelectorAll: (sel: string) => Array<{
    hasAttribute: (n: string) => boolean;
    getAttribute: (n: string) => string | null;
    textContent: string;
  }>;
  querySelector: (sel: string) => {
    hasAttribute: (n: string) => boolean;
    getAttribute: (n: string) => string | null;
    textContent: string;
  } | null;
}

function parseC(html: string): QC {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QC;
}

function makeSubject(overrides: Partial<{
  id: string;
  title: string;
  examLabel: string;
  weekRange: string;
  examScope: string;
  strategy: string;
  mustKnowConceptIds: string[];
  missingKeywordLabels: string[];
}> = {}): never {
  return {
    id: overrides.id ?? "s1",
    title: overrides.title ?? "수학",
    examLabel: overrides.examLabel ?? "기말",
    summary: {
      weekRange: overrides.weekRange ?? "1~7주차",
      examScope: overrides.examScope ?? "1단원~5단원",
      strategy: overrides.strategy ?? "개념 → 문제 순",
      mustKnowConceptIds: overrides.mustKnowConceptIds ?? ["c1"]
    },
    requiredKeywords: (overrides.missingKeywordLabels ?? []).map((label, i) => ({
      id: `k${i + 1}`,
      label,
      status: "missing",
      professorSignal: "ps",
      conceptIds: []
    })),
    concepts: [{
      id: "c1", title: "concept-x", summary: "s",
      easyExplanation: "e", priority: "must-know",
      sourceHints: ["src1 p3"], exampleQuestionIds: ["q1"]
    }],
    questions: [{
      id: "q1", prompt: "p", answer: "a", explanation: "e", difficulty: "basic"
    }],
    weekNotes: []
  } as never;
}

function makeKeyword(overrides: Partial<{
  id: string;
  label: string;
  status: "covered" | "missing";
  conceptIds: string[];
}> = {}): never {
  return {
    id: overrides.id ?? "k1",
    label: overrides.label ?? "kw",
    status: overrides.status ?? "covered",
    professorSignal: "ps",
    conceptIds: overrides.conceptIds ?? ["c1"]
  } as never;
}

function makeWeek(overrides: Partial<{ id: string; label: string; title: string; focus: string; reviewStatus: "ready" | "needs-fill" }> = {}): never {
  return {
    id: overrides.id ?? "w1",
    label: overrides.label ?? "5월 14일",
    title: overrides.title ?? "intro",
    focus: overrides.focus ?? "f",
    reviewStatus: overrides.reviewStatus ?? "ready",
    requiredKeywordIds: ["k1"],
    conceptIds: ["c1"],
    exampleQuestionIds: ["q1"],
    sourceMaterialIds: []
  } as never;
}

function makeCtx(quickNote?: ReturnType<typeof qn.buildSubjectQuickNote>): import("../quick-note.ts").QuickNoteContext {
  return { getQuickNote: () => quickNote };
}

// ─── (a) renderQuickNotePanel — characterization ──────────────────────────

describe("quick-note — (a) renderQuickNotePanel characterization", () => {
  test("case 1: getQuickNote=undefined → empty string", () => {
    const html = qn.renderQuickNotePanel(makeCtx(undefined), makeSubject(), ["subject"]);
    assert.equal(html, "");
  });

  test("case 2: subjectId mismatch → empty", () => {
    const note = qn.buildSubjectQuickNote(makeSubject({ id: "s2" }));
    const html = qn.renderQuickNotePanel(makeCtx(note), makeSubject({ id: "s1" }), ["subject"]);
    assert.equal(html, "");
  });

  test("case 3: origin mismatch → empty", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    const html = qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["week"]);
    assert.equal(html, "");
  });

  test("case 4: subject + origin match → panel rendered", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    const html = qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["subject"]);
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".quick-note-panel").length, 1);
    assert.equal(c.querySelectorAll(".quick-note-section").length, 3);
    assert.equal(c.querySelectorAll(".action-link").length, 1);
  });
});

// ─── (b) renderQuickNotePanel — XSS ───────────────────────────────────────

describe("quick-note — (b) renderQuickNotePanel XSS", () => {
  test("case 5: hostile title escape", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    note.title = "<script>alert(1)</script>";
    const html = qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["subject"]);
    assert.equal(parseC(html).querySelectorAll("script").length, 0);
  });

  test("case 6: hostile subtitle escape", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    note.subtitle = "<img src=x onerror=alert(1)>";
    const c = parseC(qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["subject"]));
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });

  test("case 7: hostile section heading + body escape", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    note.sections = [
      { heading: "<script>h</script>", body: ["<svg onload=y>"] }
    ];
    const c = parseC(qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["subject"]));
    assert.equal(c.querySelectorAll("script,svg").length, 0);
    assert.equal(c.querySelectorAll("[onload]").length, 0);
  });

  test("case 8: hostile primaryLabel escape", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    note.primaryLabel = "<script>l</script>";
    const c = parseC(qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["subject"]));
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 9: hostile primaryHref javascript: → no link", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    note.primaryHref = "javascript:alert(1)";
    const c = parseC(qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["subject"]));
    assert.equal(c.querySelectorAll(".action-link").length, 0);
  });

  test("case 10: hostile primaryHref //host protocol-relative → blocked", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    note.primaryHref = "//evil.example.com/path";
    const c = parseC(qn.renderQuickNotePanel(makeCtx(note), makeSubject(), ["subject"]));
    assert.equal(c.querySelectorAll(".action-link").length, 0);
  });
});

// ─── (c) buildSubjectQuickNote ────────────────────────────────────────────

describe("quick-note — (c) buildSubjectQuickNote", () => {
  test("case 11: no missing keywords → status=ready", () => {
    const note = qn.buildSubjectQuickNote(makeSubject());
    assert.equal(note.origin, "subject");
    assert.equal(note.status, "ready");
    assert.equal(note.primaryLabel, "자료 보강하기");
  });

  test("case 12: missing keywords > 0 → status=needs-fill", () => {
    const note = qn.buildSubjectQuickNote(makeSubject({ missingKeywordLabels: ["kw1", "kw2"] }));
    assert.equal(note.status, "needs-fill");
    assert.equal(note.sections.length, 3);
    const lastBody = note.sections[2].body;
    assert.ok(lastBody.some((b) => b.includes("kw1: 강의자료 기반 보강 필요")));
  });

  test("case 13: title + subtitle composed", () => {
    const note = qn.buildSubjectQuickNote(makeSubject({ title: "기하", examLabel: "중간", weekRange: "1~5" }));
    assert.ok(note.title.includes("기하"));
    assert.ok(note.subtitle.includes("중간"));
    assert.ok(note.subtitle.includes("1~5"));
  });
});

// ─── (d) buildKeywordQuickNote ────────────────────────────────────────────

describe("quick-note — (d) buildKeywordQuickNote", () => {
  test("case 14: status=missing → needs-fill template", () => {
    const note = qn.buildKeywordQuickNote(makeSubject(), makeKeyword({ status: "missing", conceptIds: [] }));
    assert.equal(note.origin, "keyword");
    assert.equal(note.status, "needs-fill");
    assert.ok(note.title.includes("보강 템플릿"));
  });

  test("case 15: empty conceptIds → needs-fill", () => {
    const note = qn.buildKeywordQuickNote(makeSubject(), makeKeyword({ status: "covered", conceptIds: [] }));
    assert.equal(note.status, "needs-fill");
  });

  test("case 16: covered + concepts → ready", () => {
    const note = qn.buildKeywordQuickNote(makeSubject(), makeKeyword({ status: "covered", conceptIds: ["c1"] }));
    assert.equal(note.status, "ready");
    assert.ok(note.title.includes("미니 정리노트"));
    assert.equal(note.sections.length, 4);
  });
});

// ─── (e) buildWeekQuickNote ───────────────────────────────────────────────

describe("quick-note — (e) buildWeekQuickNote", () => {
  test("case 17: reviewStatus=ready → status=ready", () => {
    const note = qn.buildWeekQuickNote(makeSubject(), makeWeek({ reviewStatus: "ready" }));
    assert.equal(note.origin, "week");
    assert.equal(note.status, "ready");
    assert.equal(note.primaryLabel, "수업일 노트로 이동");
  });

  test("case 18: reviewStatus=needs-fill → status=needs-fill", () => {
    const note = qn.buildWeekQuickNote(makeSubject(), makeWeek({ reviewStatus: "needs-fill" }));
    assert.equal(note.status, "needs-fill");
  });

  test("case 19: empty concepts → fallback body string", () => {
    const subject = makeSubject();
    (subject as { concepts: unknown[] }).concepts = [];
    const note = qn.buildWeekQuickNote(subject, makeWeek());
    const conceptSection = note.sections.find((s) => s.heading === "개념 요약");
    assert.ok(conceptSection);
    assert.equal(conceptSection!.body[0], "아직 연결된 개념이 없습니다.");
  });
});

// ─── (f) export shape + PII boundary ──────────────────────────────────────

describe("quick-note — (f) export shape + PII boundary", () => {
  test("case 20: 4 fn export + types", () => {
    assert.equal(typeof qn.renderQuickNotePanel, "function");
    assert.equal(typeof qn.buildSubjectQuickNote, "function");
    assert.equal(typeof qn.buildKeywordQuickNote, "function");
    assert.equal(typeof qn.buildWeekQuickNote, "function");
  });
});
