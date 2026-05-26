// sprint-2026-W22-sprint-16 / layer C/slice-8 — week characterization spec.

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
        export function getKeywordById(subject, id) { return subject.requiredKeywords?.find(k => k.id === id); }
        export function getQuestionById(subject, id) { return subject.questions?.find(q => q.id === id); }
        export function getSourceById(subject, id) { return subject.sources?.find(s => s.id === id); }
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

const wk = await import("../week.ts");

interface QC {
  querySelectorAll: (sel: string) => Array<{ hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string }>;
  querySelector: (sel: string) => { hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string } | null;
}

function parseC(html: string): QC {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QC;
}

function makeSubject(): never {
  return {
    id: "s1", title: "수학", examLabel: "기말",
    summary: { weekRange: "1~7" },
    weekNotes: [],
    requiredKeywords: [{ id: "k1", label: "kw", status: "covered", professorSignal: "ps", conceptIds: [] }],
    concepts: [{ id: "c1", title: "concept-x", summary: "s", easyExplanation: "e", priority: "must-know", sourceHints: [], exampleQuestionIds: [] }],
    questions: [{ id: "q1", prompt: "p", answer: "a", explanation: "e", difficulty: "basic" }],
    sources: [{ id: "src1", title: "src", kind: "professor-pdf", visibility: "private-source", note: "n", pages: "1-10" }]
  } as never;
}

function makeWeek(overrides: Partial<{ id: string; label: string; title: string; focus: string; userNotes: string }> = {}): never {
  return {
    id: overrides.id ?? "w1",
    label: overrides.label ?? "5월 14일",
    title: overrides.title ?? "intro",
    focus: overrides.focus ?? "f",
    reviewStatus: "ready",
    requiredKeywordIds: ["k1"],
    conceptIds: ["c1"],
    exampleQuestionIds: ["q1"],
    sourceMaterialIds: ["src1"],
    userNotes: overrides.userNotes
  } as never;
}

function makeCtx(materials: unknown[] = []): import("../week.ts").WeekPageContext {
  return {
    getSubjectPdfMaterials: () => materials as never,
    getPdfMaterialsForWeek: (_s, _w, m) => m,
    renderQuickNotePanel: () => `<div class="qn-mock">QN</div>`,
    renderPdfMaterialCard: (s, m) => `<div class="pdf-card-mock" data-subject-id="${s.id}" data-mid="${(m as { id: string }).id}"></div>`
  };
}

// ─── (a) renderWeekPage ───────────────────────────────────────────────────

describe("week — (a) renderWeekPage", () => {
  test("case 1: hero + mapped pdf + user notes + qn callback + 3 grid + concepts + questions", () => {
    const html = wk.renderWeekPage(makeCtx(), makeSubject(), makeWeek());
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-page-hero").length, 1);
    assert.equal(c.querySelectorAll(".week-user-notes").length, 1);
    assert.equal(c.querySelectorAll(".qn-mock").length, 1);
    assert.equal(c.querySelectorAll(".week-note-grid").length, 1);
  });

  test("case 2: hostile subject.title escape", () => {
    const subject = makeSubject();
    (subject as { title: string }).title = "<script>s</script>";
    const html = wk.renderWeekPage(makeCtx(), subject, makeWeek());
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 3: hostile week.title/focus/label escape", () => {
    const week = makeWeek({ title: "<script>t</script>", focus: "<img onerror=x>", label: "<svg onload=y>" });
    const html = wk.renderWeekPage(makeCtx(), makeSubject(), week);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img,svg").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onload]").length, 0);
  });

  test("case 4: hostile subject.id in href + data-* + week.id in data-*", () => {
    const subject = makeSubject();
    (subject as { id: string }).id = '"><img src=x onerror=alert(1)>';
    const week = makeWeek({ id: '"><script>w</script>' });
    const html = wk.renderWeekPage(makeCtx(), subject, week);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (b) renderWeekUserNotesSection ──────────────────────────────────────

describe("week — (b) renderWeekUserNotesSection", () => {
  test("case 5: empty userNotes → empty textarea", () => {
    const html = wk.renderWeekUserNotesSection(makeSubject(), makeWeek());
    const c = parseC(html);
    const ta = c.querySelector("textarea");
    assert.ok(ta);
    assert.equal((ta!.textContent || "").trim(), "");
  });

  test("case 6: userNotes value escape (textarea text content)", () => {
    const week = makeWeek({ userNotes: "<script>alert(1)</script>" });
    const html = wk.renderWeekUserNotesSection(makeSubject(), week);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 7: hostile subject.id/week.id in data-* attr escape", () => {
    const subject = makeSubject();
    (subject as { id: string }).id = '"><img onerror=x>';
    const week = makeWeek({ id: '"><script>w</script>' });
    const html = wk.renderWeekUserNotesSection(subject, week);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("img,script").length, 0);
  });

  test("case 8: typeof userNotes !== 'string' → '' fallback", () => {
    const week = makeWeek();
    (week as { userNotes: unknown }).userNotes = { malicious: true };
    const html = wk.renderWeekUserNotesSection(makeSubject(), week);
    const c = parseC(html);
    const ta = c.querySelector("textarea");
    assert.ok(ta);
    assert.equal((ta!.textContent || "").trim(), "");
  });
});

// ─── (c) renderWeekMappedPdfSection ──────────────────────────────────────

describe("week — (c) renderWeekMappedPdfSection", () => {
  test("case 9: empty materials → empty-note", () => {
    const html = wk.renderWeekMappedPdfSection(makeCtx(), makeSubject(), makeWeek(), []);
    assert.ok(html.includes("아직 이 수업일에 연결된 PDF가 없습니다"));
  });

  test("case 10: materials → pdf-card-mock per material", () => {
    const mats = [{ id: "m1" }, { id: "m2" }];
    const html = wk.renderWeekMappedPdfSection(makeCtx(mats), makeSubject(), makeWeek(), mats as never);
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".pdf-card-mock").length, 2);
  });

  test("case 11: hostile week.label escape (h2 + aria-label)", () => {
    const week = makeWeek({ label: "<script>l</script>" });
    const html = wk.renderWeekMappedPdfSection(makeCtx(), makeSubject(), week, []);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 12: hostile subject.id in subjectClassPath href escape", () => {
    const subject = makeSubject();
    (subject as { id: string }).id = '"><img onerror=alert(1)>';
    const html = wk.renderWeekMappedPdfSection(makeCtx(), subject, makeWeek(), []);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (d) Context dependencies ────────────────────────────────────────────

describe("week — (d) Context callback boundaries", () => {
  test("case 13: renderQuickNotePanel callback receives ('week' origin)", () => {
    let calledWith: string[] = [];
    const ctx: import("../week.ts").WeekPageContext = {
      ...makeCtx(),
      renderQuickNotePanel: (_s, origins) => { calledWith = origins; return ""; }
    };
    wk.renderWeekPage(ctx, makeSubject(), makeWeek());
    assert.deepEqual(calledWith, ["week"]);
  });

  test("case 14: renderPdfMaterialCard callback receives compact=true", () => {
    let lastOpts: unknown = null;
    const mat = { id: "m1" };
    const ctx: import("../week.ts").WeekPageContext = {
      ...makeCtx([mat]),
      renderPdfMaterialCard: (_s, _m, opts) => { lastOpts = opts; return ""; }
    };
    wk.renderWeekMappedPdfSection(ctx, makeSubject(), makeWeek(), [mat] as never);
    assert.deepEqual(lastOpts, { isCurrent: false, compact: true });
  });

  test("case 15: getPdfMaterialsForWeek callback dispatched (renderWeekPage)", () => {
    let dispatched = false;
    const ctx: import("../week.ts").WeekPageContext = {
      ...makeCtx(),
      getPdfMaterialsForWeek: (_s, _w, _m) => { dispatched = true; return []; }
    };
    wk.renderWeekPage(ctx, makeSubject(), makeWeek());
    assert.equal(dispatched, true);
  });

  test("case 16: callback TB — hostile callback output passthrough (caller responsibility)", () => {
    const ctx: import("../week.ts").WeekPageContext = {
      ...makeCtx(),
      renderQuickNotePanel: () => `<script>HOSTILE</script>`
    };
    const html = wk.renderWeekPage(ctx, makeSubject(), makeWeek());
    const c = parseC(html);
    // Passthrough — caller's escape responsibility.
    assert.ok(c.querySelectorAll("script").length >= 1);
  });
});

// ─── (e) characterization + export ───────────────────────────────────────

describe("week — (e) characterization + export shape", () => {
  test("case 17: identical input → byte-identical HTML", () => {
    assert.equal(
      wk.renderWeekPage(makeCtx(), makeSubject(), makeWeek()),
      wk.renderWeekPage(makeCtx(), makeSubject(), makeWeek())
    );
  });

  test("case 18: 3 fn export shape", () => {
    assert.equal(typeof wk.renderWeekPage, "function");
    assert.equal(typeof wk.renderWeekUserNotesSection, "function");
    assert.equal(typeof wk.renderWeekMappedPdfSection, "function");
  });
});
