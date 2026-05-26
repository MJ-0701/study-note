// sprint-2026-W22-sprint-11 / layer C/slice-3 — home + intake characterization spec.

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

interface QC {
  querySelectorAll: (sel: string) => Array<{ hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string }>;
  querySelector: (sel: string) => { hasAttribute: (n: string) => boolean; getAttribute: (n: string) => string | null; textContent: string } | null;
}

function parseC(html: string): QC {
  testDocument.body.innerHTML = html;
  return testDocument.body as unknown as QC;
}

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

function makeNotebook(overrides: Partial<{ title: string; term: string; subjects: unknown[]; sourceWorkspaceUrl: string; _warnings: string[] }> = {}): never {
  return {
    title: overrides.title ?? "노트북",
    term: overrides.term ?? "2026-1",
    subjects: (overrides.subjects ?? [makeSubject()]) as never,
    sharePolicy: {
      rawSourceRule: "원문 PDF 비공개",
      noteRule: "노트만 공유",
      disclaimer: "주의"
    },
    sourceWorkspaceUrl: overrides.sourceWorkspaceUrl,
    _warnings: overrides._warnings ?? []
  } as never;
}

// ─── (a) renderHome — happy + warnings + needsFill ────────────────────────

describe("home-intake — (a) renderHome", () => {
  test("case 1: happy path → hero + metrics + subject grid", () => {
    const notebook = makeNotebook();
    const html = hi.renderHome(notebook);
    const c = parseC(html);
    assert.ok(c.querySelectorAll(".home-hero").length === 1);
    assert.ok(c.querySelectorAll(".metric-card").length === 4);
    assert.ok(c.querySelectorAll(".subject-card").length >= 1);
  });

  test("case 2: needsFill empty → status-good", () => {
    const notebook = makeNotebook();
    const html = hi.renderHome(notebook);
    assert.ok(html.includes("현재 보강 표시된 수업일이 없습니다"));
  });

  test("case 3: needsFill present → compact-list rendered", () => {
    const subject = makeSubject();
    (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes = [
      { id: "w1", label: "1주차", title: "intro", reviewStatus: "needs-fill" }
    ];
    const notebook = makeNotebook({ subjects: [subject] });
    const html = hi.renderHome(notebook);
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".compact-list a").length, 1);
  });

  test("case 4: hostile studyNotebook.title XSS → escaped", () => {
    const notebook = makeNotebook({ title: "<script>alert(1)</script>" });
    const html = hi.renderHome(notebook);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 5: hostile sharePolicy.disclaimer escape", () => {
    const notebook = makeNotebook();
    (notebook as { sharePolicy: { disclaimer: string } }).sharePolicy.disclaimer = "<img onerror=alert(1)>";
    const html = hi.renderHome(notebook);
    const c = parseC(html);
    // hero <img src="/coverage-map.svg"> 는 legitimate. onerror attr 는 XSS sink.
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
    // img with src!=/coverage-map.svg = injected.
    const imgs = c.querySelectorAll("img");
    const xssImgs = imgs.filter((img) => img.getAttribute("src") !== "/coverage-map.svg");
    assert.equal(xssImgs.length, 0);
  });

  test("case 6: warnings non-empty → integrity ul rendered + escape per item", () => {
    const notebook = makeNotebook({ _warnings: ["<script>w</script>", "정상 경고"] });
    const html = hi.renderHome(notebook);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
    assert.equal(c.querySelectorAll("ul li").length, 2);
  });
});

// ─── (b) renderHome — sourceWorkspaceUrl protocol allowlist ──────────────

describe("home-intake — (b) renderHome sourceWorkspaceUrl protocol allowlist", () => {
  test("case 7: https URL → anchor rendered", () => {
    const notebook = makeNotebook({ sourceWorkspaceUrl: "https://notion.so/workspace" });
    const html = hi.renderHome(notebook);
    assert.ok(html.includes('href="https://notion.so/workspace"'));
  });

  test("case 8: javascript: URL → anchor NOT rendered (allowlist blocks)", () => {
    const notebook = makeNotebook({ sourceWorkspaceUrl: "javascript:alert(1)" });
    const html = hi.renderHome(notebook);
    const c = parseC(html);
    // Notion 원본 보기 anchor 가 없음.
    assert.ok(!html.includes("기존 Notion 원본 보기"));
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 9: data:text/html URL → blocked", () => {
    const notebook = makeNotebook({ sourceWorkspaceUrl: "data:text/html,<script>alert(1)</script>" });
    const html = hi.renderHome(notebook);
    assert.ok(!html.includes("기존 Notion 원본 보기"));
  });

  test("case 10: mailto: URL → blocked (Notion workspace 는 web URL 만)", () => {
    const notebook = makeNotebook({ sourceWorkspaceUrl: "mailto:attacker@evil.com" });
    const html = hi.renderHome(notebook);
    assert.ok(!html.includes("기존 Notion 원본 보기"));
  });

  test("case 11: undefined sourceWorkspaceUrl → anchor 없음", () => {
    const notebook = makeNotebook({ sourceWorkspaceUrl: undefined });
    const html = hi.renderHome(notebook);
    assert.ok(!html.includes("기존 Notion 원본 보기"));
  });

  test("case 12: relative # path → allowed", () => {
    const notebook = makeNotebook({ sourceWorkspaceUrl: "#/workspace" });
    const html = hi.renderHome(notebook);
    assert.ok(html.includes('href="#/workspace"'));
  });

  test("case 12b: protocol-relative `//host/path` → blocked (gate 6 R1 finding)", () => {
    const notebook = makeNotebook({ sourceWorkspaceUrl: "//evil.com/x" });
    const html = hi.renderHome(notebook);
    assert.ok(!html.includes("기존 Notion 원본 보기"));
    assert.ok(!html.includes("//evil.com"));
  });
});

// ─── (c) renderIntakeGuide ────────────────────────────────────────────────

describe("home-intake — (c) renderIntakeGuide", () => {
  test("case 13: renders all 7 sections + subject import cards", () => {
    const notebook = makeNotebook();
    const html = hi.renderIntakeGuide(notebook);
    const c = parseC(html);
    assert.ok(c.querySelectorAll(".subject-card").length >= 1);
    assert.ok(c.querySelectorAll(".file-role-card").length >= 1);
  });

  test("case 14: hostile localIntakeGuide passthrough (trusted const) — folderTree escape applied", () => {
    const notebook = makeNotebook();
    const html = hi.renderIntakeGuide(notebook);
    const c = parseC(html);
    assert.ok(c.querySelectorAll("pre.code-block").length >= 1);
  });
});

// ─── (d) renderSubjectIntakeGuide + callback injection ───────────────────

describe("home-intake — (d) renderSubjectIntakeGuide (callback inject)", () => {
  test("case 15: callback output 호출되어 import-feedback 영역에 inject", () => {
    const subject = makeSubject();
    const callback = () => '<div class="import-feedback test-feedback">FB</div>';
    const html = hi.renderSubjectIntakeGuide(subject, callback);
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".test-feedback").length, 1);
  });

  test("case 16: hostile subject.title escape (multiple sites)", () => {
    const subject = makeSubject("s1", "<script>alert(1)</script>");
    const html = hi.renderSubjectIntakeGuide(subject, () => "");
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 17: hostile subject.id escape (data-* + code text + JSON example)", () => {
    const subject = makeSubject('"><img src=x onerror=alert(1)>', "x");
    const html = hi.renderSubjectIntakeGuide(subject, () => "");
    const c = parseC(html);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });

  test("case 18: subject.id appears in input data-subject-id (escaped)", () => {
    const subject = makeSubject("normal-id", "수학");
    const html = hi.renderSubjectIntakeGuide(subject, () => "");
    const c = parseC(html);
    const input = c.querySelector('input[data-action="import-week-note"]');
    assert.ok(input);
    assert.equal(input!.getAttribute("data-subject-id"), "normal-id");
  });
});

// ─── (e) getSubjectSamplePayload ──────────────────────────────────────────

describe("home-intake — (e) getSubjectSamplePayload", () => {
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

// ─── (f) characterization ────────────────────────────────────────────────

describe("home-intake — (f) characterization", () => {
  test("case 21: identical input → byte-identical renderHome", () => {
    const n1 = makeNotebook();
    const n2 = makeNotebook();
    assert.equal(hi.renderHome(n1), hi.renderHome(n2));
  });

  test("case 22: 4 export shape", () => {
    assert.equal(typeof hi.renderHome, "function");
    assert.equal(typeof hi.renderIntakeGuide, "function");
    assert.equal(typeof hi.renderSubjectIntakeGuide, "function");
    assert.equal(typeof hi.getSubjectSamplePayload, "function");
  });
});
