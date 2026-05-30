// sprint-2026-W22-sprint-11 / layer C/slice-3 — home + intake characterization spec.
// S3 업데이트: renderHome/renderIntakeGuide/renderSubjectIntakeGuide 는 slot
// placeholder 만 반환. XSS/content spec 은 HomeView/IntakeView.spec.ts 로 이관.

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
        return { format: "module", shortCircuit: true, source: \`
          export function getNotebookCoverage(notebook) {
            const total = notebook.subjects.reduce((sum, s) => sum + (s.requiredKeywords?.length ?? 0), 0);
            const covered = notebook.subjects.reduce((sum, s) => sum + (s.requiredKeywords?.filter(k => k.status === "covered").length ?? 0), 0);
            return { covered, total, coverageRate: total > 0 ? Math.round(covered / total * 100) : 0 };
          }
          export function getIntegrityWarnings(notebook) { return notebook._warnings ?? []; }
          export function getSubjectCoverage(subject) {
            const total = subject.requiredKeywords?.length ?? 0;
            const covered = subject.requiredKeywords?.filter(k => k.status === "covered").length ?? 0;
            return { coverageRate: total > 0 ? Math.round(covered / total * 100) : 0 };
          }
          export function getConceptById() { return undefined; }
          export function getQuestionById() { return undefined; }
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

const hi = await import("../home-intake.ts");

function makeSubject(id = "s1", title = "수학"): never {
  return {
    id,
    title,
    examLabel: "중간",
    summary: {
      weekRange: "1~7주차",
      goal: "기초",
      examScope: "범위",
      strategy: "전략",
      weakSpots: []
    },
    weekNotes: [{ id: "w1", label: "1주차", title: "intro", reviewStatus: "ready" }],
    requiredKeywords: [{ id: "k1", label: "kw", status: "covered", professorSignal: "ps", conceptIds: [] }]
  } as never;
}

function makeNotebook(overrides: Partial<{ title: string; term: string; subjects: unknown[] }> = {}): never {
  return {
    title: overrides.title ?? "노트북",
    term: overrides.term ?? "2026-1",
    subjects: (overrides.subjects ?? [makeSubject()]) as never,
    sharePolicy: { rawSourceRule: "원문 PDF 비공개", noteRule: "노트만 공유", disclaimer: "주의" },
    sourceWorkspaceUrl: undefined,
    _warnings: []
  } as never;
}

// ─── (a) S3 slot placeholder 계약 ────────────────────────────────────────────

describe("home-intake S3 — slot placeholder 계약", () => {
  test("renderHome → home-island placeholder", () => {
    const html = hi.renderHome(makeNotebook());
    assert.ok(html.includes('id="home-island"'), 'id="home-island" 포함');
    assert.ok(html.includes('data-react-island="home"'), 'data-react-island="home" 포함');
    // content 없음 — React portal 이 children 소유
    assert.ok(!html.includes("home-hero"), "home-hero section 미포함(portal 담당)");
  });

  test("renderHome: 어떤 notebook 입력이든 동일 placeholder 반환(idempotent)", () => {
    const h1 = hi.renderHome(makeNotebook({ title: "A" }));
    const h2 = hi.renderHome(makeNotebook({ title: "B" }));
    assert.equal(h1, h2, "placeholder 는 입력에 무관하게 동일");
  });

  test("renderIntakeGuide → intake-island placeholder", () => {
    const html = hi.renderIntakeGuide(makeNotebook());
    assert.ok(html.includes('id="intake-island"'), 'id="intake-island" 포함');
    assert.ok(html.includes('data-react-island="intake"'), 'data-react-island="intake" 포함');
    assert.ok(!html.includes("intake-flow"), "intake-flow section 미포함(portal 담당)");
  });

  test("renderSubjectIntakeGuide → intake-island placeholder (subject 무시)", () => {
    const subject = makeSubject("s1", "수학");
    const html = hi.renderSubjectIntakeGuide(subject, () => "FB");
    assert.ok(html.includes('id="intake-island"'));
    assert.ok(html.includes('data-react-island="intake"'));
    // XSS 가능성 있는 subject.title/id 가 placeholder 에 미노출
    assert.ok(!html.includes(subject.title), "subject.title 미노출");
  });

  test("renderSubjectIntakeGuide: callback 호출되지 않음 (slot placeholder only)", () => {
    let called = false;
    const subject = makeSubject();
    hi.renderSubjectIntakeGuide(subject, () => { called = true; return ""; });
    assert.equal(called, false, "callback 미호출(placeholder 반환만)");
  });
});

// ─── (b) getSubjectSamplePayload ──────────────────────────────────────────────

describe("home-intake — (b) getSubjectSamplePayload", () => {
  test("case 19: returns valid sample payload structure", () => {
    const subject = makeSubject("s1", "수학");
    const payload = hi.getSubjectSamplePayload(subject) as Record<string, unknown>;
    assert.equal(payload.schemaVersion, "study-note.week-note.v1");
    assert.equal(payload.subjectId, "s1");
    assert.ok(Array.isArray(payload.sourceMaterials));
    assert.ok(Array.isArray(payload.requiredKeywords));
    assert.ok(Array.isArray(payload.concepts));
    assert.ok(Array.isArray(payload.exampleQuestions));
    assert.ok(payload.weekNote);
  });

  test("case 20: subject.id propagates to nested IDs", () => {
    const payload = hi.getSubjectSamplePayload(makeSubject("subj-X", "x")) as Record<string, unknown>;
    const sources = payload.sourceMaterials as Array<{ id: string }>;
    assert.ok(sources[0]!.id.startsWith("subj-X-"));
  });
});

// ─── (c) export shape ─────────────────────────────────────────────────────────

describe("home-intake — (c) export shape", () => {
  test("4 export 함수 존재", () => {
    assert.equal(typeof hi.renderHome, "function");
    assert.equal(typeof hi.renderIntakeGuide, "function");
    assert.equal(typeof hi.renderSubjectIntakeGuide, "function");
    assert.equal(typeof hi.getSubjectSamplePayload, "function");
  });
});
