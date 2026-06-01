// sprint-2026-W22-sprint-17 / layer C/slice-9 — pdf-library characterization spec.

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
          export function formatPdfFileSize(size) { return (size / 1024).toFixed(0) + "KB"; }
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

const pl = await import("../pdf-library.ts");

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

function makeSubject(overrides: Partial<{ id: string; title: string; weekLabels: string[] }> = {}): never {
  const weekLabels = overrides.weekLabels ?? ["2026-05-14", "2026-05-21"];
  return {
    id: overrides.id ?? "s1",
    title: overrides.title ?? "수학",
    examLabel: "기말",
    summary: { weekRange: "1~7주차" },
    weekNotes: weekLabels.map((label, i) => ({
      id: `w${i + 1}`,
      label,
      title: `wk${i + 1}`,
      focus: "f",
      reviewStatus: "ready"
    }))
  } as never;
}

function makeMaterial(overrides: Partial<{
  id: string;
  fileName: string;
  classDate: string;
  uploadStatus: string;
  uploaderId: string;
  backendMaterialId: string;
}> = {}): never {
  return {
    id: overrides.id ?? "m1",
    backendMaterialId: overrides.backendMaterialId ?? overrides.id ?? "m1",
    fileName: overrides.fileName ?? "syllabus.pdf",
    fileSize: 1024,
    pageCount: 10,
    classDate: overrides.classDate,
    uploadStatus: overrides.uploadStatus ?? "uploaded",
    uploaderId: overrides.uploaderId
  } as never;
}

function makeCtx(session?: { id: string; role: string }): import("../pdf-library.ts").PdfLibraryContext {
  return {
    getAuthSession: () => (session ? { user: session } : undefined)
  };
}

// ─── (a) canManagePdfMaterials — fail-closed deny-by-default ──────────────

describe("pdf-library — (a) canManagePdfMaterials fail-closed", () => {
  test("case 1: authSession=undefined → false", () => {
    assert.equal(pl.canManagePdfMaterials(makeCtx()), false);
  });

  test("case 2: role=undefined → false", () => {
    assert.equal(pl.canManagePdfMaterials(makeCtx({ id: "u1", role: undefined as never })), false);
  });

  test("case 3: role=\"\" → false", () => {
    assert.equal(pl.canManagePdfMaterials(makeCtx({ id: "u1", role: "" })), false);
  });

  test("case 4: role=\"student\" → false", () => {
    assert.equal(pl.canManagePdfMaterials(makeCtx({ id: "u1", role: "student" })), false);
  });

  test("case 5: role=\"MASTER\" (case-insensitive) → true", () => {
    assert.equal(pl.canManagePdfMaterials(makeCtx({ id: "u1", role: "MASTER" })), true);
  });

  test("case 6: role=\"master\" → true", () => {
    assert.equal(pl.canManagePdfMaterials(makeCtx({ id: "u1", role: "master" })), true);
  });

  test("case 7: role=\"admin\" → true", () => {
    assert.equal(pl.canManagePdfMaterials(makeCtx({ id: "u1", role: "admin" })), true);
  });

  test("case 7b: classDate edit follows manager role", () => {
    const own = makeMaterial({ uploaderId: "u1" });
    const shared = makeMaterial({ uploaderId: "u2" });

    assert.equal(pl.canEditPdfMaterialClassDate(makeCtx({ id: "u1", role: "admin" }), own), true);
    assert.equal(pl.canEditPdfMaterialClassDate(makeCtx({ id: "u1", role: "admin" }), shared), true);
    assert.equal(pl.canEditPdfMaterialClassDate(makeCtx({ id: "u1", role: "student" }), own), false);
  });
});

// ─── (b) getPdfMaterialOwnerLabel — ownership boundary ────────────────────

describe("pdf-library — (b) getPdfMaterialOwnerLabel ownership", () => {
  test("case 8: uploaderId === session.user.id → \"내가 올림\"", () => {
    const ctx = makeCtx({ id: "u1", role: "student" });
    const mat = makeMaterial({ uploaderId: "u1" });
    assert.equal(pl.getPdfMaterialOwnerLabel(ctx, mat), "내가 올림");
  });

  test("case 9: uploaderId mismatch → \"공유 자료\"", () => {
    const ctx = makeCtx({ id: "u1", role: "student" });
    const mat = makeMaterial({ uploaderId: "u2" });
    assert.equal(pl.getPdfMaterialOwnerLabel(ctx, mat), "공유 자료");
  });

  test("case 10: uploaderId undefined + uploadStatus=local → \"로컬 자료\"", () => {
    const ctx = makeCtx({ id: "u1", role: "student" });
    const mat = makeMaterial({ uploadStatus: "local" });
    assert.equal(pl.getPdfMaterialOwnerLabel(ctx, mat), "로컬 자료");
  });

  test("case 11: uploaderId undefined + uploadStatus=uploaded → \"업로드 자료\"", () => {
    const ctx = makeCtx({ id: "u1", role: "student" });
    const mat = makeMaterial({ uploadStatus: "uploaded" });
    assert.equal(pl.getPdfMaterialOwnerLabel(ctx, mat), "업로드 자료");
  });
});

// ─── (c) renderPdfMaterialCard XSS ────────────────────────────────────────

describe("pdf-library — (c) renderPdfMaterialCard XSS", () => {
  test("case 19: hostile material.fileName in h4 escape", () => {
    const subject = makeSubject();
    const mat = makeMaterial({ fileName: "<script>alert(1)</script>.pdf" });
    const html = pl.renderPdfMaterialCard(makeCtx(), subject, mat, { isCurrent: false, compact: false });
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 20: hostile material.id in data-material-id escape", () => {
    const subject = makeSubject();
    const mat = makeMaterial({ id: '"><img src=x onerror=alert(1)>' });
    const html = pl.renderPdfMaterialCard(makeCtx(), subject, mat, { isCurrent: false, compact: false });
    const c = parseC(html);
    assert.equal(c.querySelectorAll("img,script").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });

  test("case 21: isCurrent=true + compact=true → is-current + is-compact classes", () => {
    const subject = makeSubject();
    const mat = makeMaterial();
    const html = pl.renderPdfMaterialCard(makeCtx(), subject, mat, { isCurrent: true, compact: true });
    const c = parseC(html);
    assert.equal(c.querySelectorAll(".pdf-material-card.is-current.is-compact").length, 1);
  });
});

// ─── (d) renderPdfMaterialClassDateControl + denylist + week label ────────

describe("pdf-library — (d) renderPdfMaterialClassDateControl", () => {
  test("case 22: canManage=false → picker/button disabled", () => {
    const subject = makeSubject();
    const mat = makeMaterial();
    const html = pl.renderPdfMaterialClassDateControl(makeCtx(), subject, mat, "m1");
    const c = parseC(html);
    assert.equal(c.querySelector("select"), null);
    assert.equal(c.querySelector('[data-role="pdf-class-date-current"]')?.hasAttribute("disabled"), true);
    assert.equal(c.querySelector('button[data-action="assign-pdf-class-date"]')?.hasAttribute("disabled"), true);
  });

  test("case 23: canManage=true + own material → custom picker editable", () => {
    const subject = makeSubject();
    const mat = makeMaterial({ uploaderId: "u1" });
    const html = pl.renderPdfMaterialClassDateControl(makeCtx({ id: "u1", role: "admin" }), subject, mat, "m1");
    const c = parseC(html);
    const picker = c.querySelector('[data-role="pdf-class-date-picker"]');
    assert.notEqual(picker, null);
    assert.equal(c.querySelector("select"), null);
    assert.equal(c.querySelector('button[data-action="assign-pdf-class-date"]')?.hasAttribute("disabled"), false);
    assert.equal(c.querySelectorAll('input[data-role="pdf-class-date-option"]').length, 3);
  });

  test("case 23b: canManage=true + shared material → editable", () => {
    const subject = makeSubject();
    const mat = makeMaterial({ uploaderId: "other-admin" });
    const html = pl.renderPdfMaterialClassDateControl(makeCtx({ id: "u1", role: "admin" }), subject, mat, "m1");
    const c = parseC(html);
    assert.notEqual(c.querySelector('[data-role="pdf-class-date-picker"]'), null);
    assert.match(c.querySelector(".pdf-material-card__field-hint")?.textContent ?? "", /적용/);
  });

  test("case 24: non-ISO week.label → disabled + \"사용 불가\" hint", () => {
    const subject = makeSubject({ weekLabels: ["legacy-label-9999", "2026-05-21"] });
    const mat = makeMaterial();
    const html = pl.renderPdfMaterialClassDateControl(makeCtx({ id: "u1", role: "admin" }), subject, mat, "m1");
    const c = parseC(html);
    const opts = c.querySelectorAll('input[data-role="pdf-class-date-option"][disabled]');
    assert.ok(opts.length >= 1, `expected ≥1 disabled option, got ${opts.length}`);
    const text = c.querySelectorAll(".pdf-material-card__class-date-option.is-disabled")
      .map((o) => o.textContent)
      .join("");
    assert.ok(text.includes("사용 불가"), `expected 사용 불가 hint, got=${text}`);
  });

  test("case 25: hostile week.label escape in option value + text", () => {
    const subject = makeSubject({ weekLabels: ['<script>x</script>', "2026-05-14"] });
    const mat = makeMaterial();
    const html = pl.renderPdfMaterialClassDateControl(makeCtx({ id: "u1", role: "admin" }), subject, mat, "m1");
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });

  test("case 25b: ISO week labels are sorted ascending in dropdown", () => {
    const subject = makeSubject({
      weekLabels: ["2026-06-04", "2026-04-30", "2026-05-28", "2026-05-02"]
    });
    const html = pl.renderPdfMaterialClassDateControl(
      makeCtx({ id: "u1", role: "admin" }),
      subject,
      makeMaterial(),
      "m1"
    );
    const c = parseC(html);
    const labels = Array.from(c.querySelectorAll(".pdf-material-card__class-date-option-label"))
      .map((option) => option.textContent.trim())
      .filter((label) => /^\d{4}-/.test(label));
    assert.deepEqual(labels, [
      "2026-04-30 · wk2",
      "2026-05-02 · wk4",
      "2026-05-28 · wk3",
      "2026-06-04 · wk1"
    ]);
  });
});

// ─── (e) renderSubjectPdfMaterialBrowser ─────────────────────────────────

describe("pdf-library — (e) renderSubjectPdfMaterialBrowser", () => {
  test("case 26: 0 materials → empty string", () => {
    const html = pl.renderSubjectPdfMaterialBrowser(makeCtx(), makeSubject(), [], undefined);
    assert.equal(html, "");
  });

  test("case 27: hostile subject.title in browser aria-label escape", () => {
    const subject = makeSubject({ title: '<script>alert(1)</script>' });
    const mat = makeMaterial();
    const html = pl.renderSubjectPdfMaterialBrowser(makeCtx(), subject, [mat], undefined);
    const c = parseC(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (f) export shape + helpers ──────────────────────────────────────────

describe("pdf-library — (f) export shape + helpers", () => {
  test("case 28: live renderer exports + isUnconfirmedPdfClassDate + getPdfMaterialsForWeek", () => {
    assert.equal(typeof pl.renderSubjectPdfMaterialBrowser, "function");
    assert.equal(typeof pl.renderPdfMaterialCard, "function");
    assert.equal(typeof pl.renderPdfMaterialClassDateControl, "function");
    assert.equal(typeof pl.getPdfMaterialClassDateLabel, "function");
    assert.equal(typeof pl.getPdfMaterialClassDateValue, "function");
    assert.equal(typeof pl.getPdfMaterialClassDateSelectValue, "function");
    assert.equal(typeof pl.getSortedPdfClassDateWeeks, "function");
    assert.equal(typeof pl.isUnconfirmedPdfClassDate, "function");
    assert.equal(typeof pl.getPdfMaterialsForWeek, "function");
    assert.equal(typeof pl.getPdfMaterialStatusLabel, "function");
    assert.equal(typeof pl.getPdfMaterialOwnerLabel, "function");
    assert.equal(typeof pl.canManagePdfMaterials, "function");
    assert.equal(typeof pl.canEditPdfMaterialClassDate, "function");

    const subject = makeSubject({ weekLabels: ["2026-05-14"] });
    assert.equal(pl.isUnconfirmedPdfClassDate(subject, undefined), true);
    assert.equal(pl.isUnconfirmedPdfClassDate(subject, "metadata-pending"), true);
    assert.equal(pl.isUnconfirmedPdfClassDate(subject, "1970-01-01"), true);
    assert.equal(pl.isUnconfirmedPdfClassDate(subject, "2026-05-14"), false);
    assert.equal(pl.isUnconfirmedPdfClassDate(subject, "2026-99-99"), true);

    const mats = [
      makeMaterial({ id: "a", classDate: "2026-05-14" }),
      makeMaterial({ id: "b", classDate: "2026-05-21" }),
      makeMaterial({ id: "c", classDate: undefined })
    ];
    const week = { id: "w1", label: "2026-05-14" } as never;
    const filtered = pl.getPdfMaterialsForWeek(subject, week, mats);
    assert.equal(filtered.length, 1);
    assert.equal((filtered[0] as { id: string }).id, "a");

    assert.equal(pl.getPdfMaterialStatusLabel(makeMaterial({ uploadStatus: "pending" })), "업로드 중");
    assert.equal(pl.getPdfMaterialStatusLabel(makeMaterial({ uploadStatus: "uploaded" })), "공유 가능");
    assert.equal(pl.getPdfMaterialStatusLabel(makeMaterial({ uploadStatus: "local" })), "로컬");

    assert.equal(pl.getPdfMaterialClassDateValue(makeMaterial({ classDate: "  " })), "metadata-pending");
    assert.equal(pl.getPdfMaterialClassDateValue(makeMaterial({ classDate: "2026-05-14" })), "2026-05-14");
    assert.equal(pl.getPdfMaterialClassDateLabel(subject, makeMaterial({ classDate: undefined })), "수업일 미지정");
    assert.equal(pl.getPdfMaterialClassDateLabel(subject, makeMaterial({ classDate: "2026-05-14" })), "2026-05-14");
  });
});
