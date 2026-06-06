// sprint-2026-W22-sprint-12 / layer C/slice-4 — subject-class characterization spec.

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
          export function getSubjectPdfWorkspace(store, sid) { return store.workspaces[sid]; }
          export function getPdfMaterialKey(m) { return m.id ?? m.backendMaterialId ?? ""; }
          export function getConceptById() { return undefined; }
          export function getQuestionById() { return undefined; }
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

const sc = await import("../subject-class.ts");

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
    id, title, examLabel: "중간", summary: { weekRange: "1~7주차" },
    weekNotes: [{ id: "w1", label: "1주차", title: "intro", focus: "기초", reviewStatus: "ready", requiredKeywordIds: [] }]
  } as never;
}

function makeMaterial(id = "m1", fileName = "syllabus.pdf", classDate?: string): never {
  return { id, backendMaterialId: id, fileName, fileSize: 100, pageCount: 1, classDate } as never;
}

function makeCtx(overrides: Partial<{
  materials: unknown[];
  canManage: boolean;
}> = {}): import("../subject-class.ts").SubjectClassContext {
  return {
    getSubjectPdfMaterials: () => (overrides.materials ?? []) as never,
    canManagePdfMaterials: () => overrides.canManage ?? true,
    isUnconfirmedPdfClassDate: (_subject, classDate) => !classDate || classDate === "",
    formatWeekLabel: (label) => label ?? "(미지정)",
    getPdfMaterialsForWeek: (_subject, week, mats) => mats.filter((m) => (m as { classDate?: string }).classDate === week.label) as never,
    renderIntakeFeedback: () => `<div class="import-feedback test-fb">FB</div>`,
    renderPdfLibraryUploadCard: () => `<div class="upload-card-mock"></div>`,
    renderPdfMaterialCard: (s, m) => `<div class="material-card-mock" data-subject-id="${s.id}" data-mid="${(m as { id: string }).id}"></div>`
  };
}

// ─── (a) renderSubjectClassPage hero + 4 unit cards ─────────────────────

describe("subject-class — (a) renderSubjectClassPage", () => {
  test("case 1: hero + base unit cards + class-day grid + assignment section", () => {
    const ctx = makeCtx({ materials: [makeMaterial("m1", "x.pdf")] });
    const html = sc.renderSubjectClassPage(ctx, makeSubject());
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-page-hero").length, 1);
    assert.equal(c.querySelectorAll(".subject-unit-card").length, 4);
    assert.equal(c.querySelectorAll(".class-day-card").length, 1);
    assert.equal(c.querySelectorAll(".pdf-material-browser").length, 1);
  });

  test("case 1b: artifact subjects expose an exam-prep unit card", () => {
    const ctx = makeCtx();
    const html = sc.renderSubjectClassPage(ctx, makeSubject("digital-engineering", "디지털공학개론"));
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-unit-card").length, 5);
    assert.ok(html.includes("#/subjects/digital-engineering/exam-prep"));
    assert.ok(html.includes("시험 대비"));
  });

  test("case 1c: subjects without artifacts do not expose a dead exam-prep card", () => {
    const ctx = makeCtx();
    const html = sc.renderSubjectClassPage(ctx, makeSubject("no-artifact-subject", "자료 없는 과목"));
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".subject-unit-card").length, 4);
    assert.ok(!html.includes("#/subjects/no-artifact-subject/exam-prep"));
  });

  test("case 2: hostile subject.title escape (multiple sites: h1 + aria-label + 4 cards meta hint)", () => {
    const ctx = makeCtx();
    const subject = makeSubject("s1", "<script>alert(1)</script>");
    const html = sc.renderSubjectClassPage(ctx, subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 3: subject.examLabel + summary.weekRange escape", () => {
    const ctx = makeCtx();
    const subject = makeSubject();
    (subject as { examLabel: string; summary: { weekRange: string } }).examLabel = "<script>e</script>";
    (subject as { summary: { weekRange: string } }).summary.weekRange = "<img onerror=x>";
    const html = sc.renderSubjectClassPage(ctx, subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
  });

  test("case 4: hostile subject.id in 4 unit card href + assignment aria-label", () => {
    const ctx = makeCtx();
    const subject = makeSubject('"><img src=x onerror=alert(1)>', "수학");
    const html = sc.renderSubjectClassPage(ctx, subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (b) renderClassDateAddSection ────────────────────────────────────────

describe("subject-class — (b) renderClassDateAddSection", () => {
  test("case 5: form + hidden subjectId + intake feedback callback", () => {
    const ctx = makeCtx();
    const html = sc.renderClassDateAddSection(ctx, makeSubject());
    const c = parseC(html);
    assert.equal(c.querySelectorAll('form[data-action="add-class-date"]').length, 1);
    assert.equal(c.querySelectorAll(".test-fb").length, 1);
  });

  test("case 6: hostile subject.id in hidden input value escape", () => {
    const ctx = makeCtx();
    const subject = makeSubject('"><script>alert(1)</script>', "x");
    const html = sc.renderClassDateAddSection(ctx, subject);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (c) renderClassDayCard ──────────────────────────────────────────────

describe("subject-class — (c) renderClassDayCard", () => {
  test("case 7: hostile week.title/focus escape", () => {
    const ctx = makeCtx({ materials: [] });
    const subject = makeSubject();
    (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes[0]!.title = "<script>w</script>";
    (subject as { weekNotes: Array<Record<string, unknown>> }).weekNotes[0]!.focus = "<img onerror=x>";
    const html = sc.renderClassDayCard(ctx, subject, (subject as { weekNotes: never[] }).weekNotes[0]!, []);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
  });

  test("case 8: linked materials length displayed", () => {
    const ctx = makeCtx();
    const week = { id: "w1", label: "1주차", title: "t", focus: "f", reviewStatus: "ready" as const, requiredKeywordIds: ["k1"] };
    const mats = [makeMaterial("m1", "a.pdf", "1주차"), makeMaterial("m2", "b.pdf", "1주차")];
    const html = sc.renderClassDayCard(ctx, makeSubject(), week as never, mats);
    assert.ok(html.includes("2개 PDF"));
    assert.ok(html.includes("1개 키워드"));
  });
});

// ─── (d) renderClassDayPdfAttachControl — denylist (TB-CM) ──────────────

describe("subject-class — (d) renderClassDayPdfAttachControl (denylist negative UI)", () => {
  test("case 9: canManage=false → select.disabled + button.disabled + 운영자 권한 메시지", () => {
    const ctx = makeCtx({ canManage: false });
    const subject = makeSubject();
    const mat = makeMaterial("m1", "x.pdf", undefined);  // unassigned
    const html = sc.renderClassDayPdfAttachControl(ctx, subject, [mat], "1주차");
    const c = parseC(html);
    const select = c.querySelector("select[name='materialId']");
    assert.ok(select);
    assert.equal(select!.hasAttribute("disabled"), true);
    const button = c.querySelector("button[type='submit']");
    assert.ok(button);
    assert.equal(button!.hasAttribute("disabled"), true);
    assert.ok(html.includes("PDF 연결은 운영자 권한이 필요합니다"));
  });

  test("case 10: canManage=true + unassigned available → select enabled", () => {
    const ctx = makeCtx({ canManage: true });
    const mat = makeMaterial("m1", "x.pdf", undefined);
    const html = sc.renderClassDayPdfAttachControl(ctx, makeSubject(), [mat], "1주차");
    const c = parseC(html);
    const select = c.querySelector("select[name='materialId']");
    assert.ok(select);
    assert.equal(select!.hasAttribute("disabled"), false);
  });

  test("case 11: canManage=true + no unassigned → 'no available' message", () => {
    const ctx = makeCtx({ canManage: true });
    const html = sc.renderClassDayPdfAttachControl(ctx, makeSubject(), [], "1주차");
    assert.ok(html.includes("연결 가능한 미지정 PDF가 없습니다"));
  });

  test("case 12: hostile material.fileName escape in option text", () => {
    const ctx = makeCtx({ canManage: true });
    const mat = makeMaterial("m1", "<script>alert(1)</script>", undefined);
    const html = sc.renderClassDayPdfAttachControl(ctx, makeSubject(), [mat], "1주차");
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 13: hostile weekLabel + subject.id escape in form data-* attr", () => {
    const ctx = makeCtx({ canManage: true });
    const subject = makeSubject('"><script>id</script>', "x");
    const html = sc.renderClassDayPdfAttachControl(ctx, subject, [], '"><img onerror=x>');
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
  });
});

// ─── (e) renderClassDayPdfLinks ──────────────────────────────────────────

describe("subject-class — (e) renderClassDayPdfLinks", () => {
  test("case 14: empty → '아직 연결된 PDF 없습니다'", () => {
    const html = sc.renderClassDayPdfLinks(makeSubject(), []);
    assert.ok(html.includes("아직 연결된 PDF가 없습니다"));
  });

  test("case 15: 1 material → 1 button", () => {
    const html = sc.renderClassDayPdfLinks(makeSubject(), [makeMaterial("m1", "x.pdf")]);
    const c = parseC(html);
    assert.equal(c.querySelectorAll('button[data-action="open-pdf-material"]').length, 1);
  });

  test("case 16: 3 materials → 2 buttons + '외 1개'", () => {
    const mats = [makeMaterial("m1", "a.pdf"), makeMaterial("m2", "b.pdf"), makeMaterial("m3", "c.pdf")];
    const html = sc.renderClassDayPdfLinks(makeSubject(), mats);
    const c = parseC(html);
    assert.equal(c.querySelectorAll('button[data-action="open-pdf-material"]').length, 2);
    assert.ok(html.includes("외 1개"));
  });

  test("case 17: hostile material.fileName + subject.id + material.id escape", () => {
    const subject = makeSubject('"><img onerror=alert(1)>', "x");
    const mat = makeMaterial('"><script>x</script>', "<script>name</script>");
    const html = sc.renderClassDayPdfLinks(subject, [mat]);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (f) renderPdfMaterialAssignmentSection ──────────────────────────────

describe("subject-class — (f) renderPdfMaterialAssignmentSection", () => {
  test("case 18: header + upload card mock + material card mocks per material", () => {
    const ctx = makeCtx();
    const mats = [makeMaterial("m1"), makeMaterial("m2")];
    const html = sc.renderPdfMaterialAssignmentSection(ctx, makeSubject(), mats);
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".pdf-material-browser").length, 1);
    assert.equal(c.querySelectorAll(".upload-card-mock").length, 1);
    assert.equal(c.querySelectorAll(".material-card-mock").length, 2);
    assert.ok(html.includes("2개 자료"));
  });

  test("case 19: hostile subject.title escape in aria-label", () => {
    const ctx = makeCtx();
    const subject = makeSubject("s1", "<script>alert(1)</script>");
    const html = sc.renderPdfMaterialAssignmentSection(ctx, subject, []);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (g) characterization + export shape ─────────────────────────────────

describe("subject-class — (g) characterization", () => {
  test("case 20: identical input → byte-identical HTML", () => {
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();
    const subject = makeSubject();
    assert.equal(sc.renderSubjectClassPage(ctx1, subject), sc.renderSubjectClassPage(ctx2, subject));
  });

  test("case 21: 6 export shape", () => {
    assert.equal(typeof sc.renderSubjectClassPage, "function");
    assert.equal(typeof sc.renderClassDateAddSection, "function");
    assert.equal(typeof sc.renderClassDayCard, "function");
    assert.equal(typeof sc.renderClassDayPdfAttachControl, "function");
    assert.equal(typeof sc.renderClassDayPdfLinks, "function");
    assert.equal(typeof sc.renderPdfMaterialAssignmentSection, "function");
  });
});
