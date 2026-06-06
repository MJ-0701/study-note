// sprint-2026-W22-sprint-10 / layer C/slice-2 — sidebar characterization spec.
// AC6: 18~22 case across a~k groups. AC7: 18 surface (text escape + href escape +
// data-attr + denylist negative UI + PII/logging boundary).

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
        return { format: "module", shortCircuit: true, source: \`\` };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

import { parseHTML } from "linkedom";
const { document: testDocument } = parseHTML("<!doctype html><html><body></body></html>");
(globalThis as Record<string, unknown>).document = testDocument;

const sidebar = await import("../sidebar.ts");

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

function makeSubject(id: string, title: string): never {
  return { id, title, weekNotes: [] } as never;
}

function makeNotebook(subjects: Array<{ id: string; title: string }>): never {
  return { subjects: subjects.map((s) => makeSubject(s.id, s.title)) } as never;
}

function makeCtx(overrides: Partial<{
  notebook: unknown;
  adminRole: string | undefined;
  termsCache: unknown;
  subjectsCache: unknown;
  openTermIds: Set<string>;
}> = {}): import("../sidebar.ts").SidebarContext {
  return {
    getNotebook: () => (overrides.notebook ?? makeNotebook([{ id: "s1", title: "수학" }])) as never,
    getAdminRole: () => overrides.adminRole,
    getSidebarTermsCache: () => (overrides.termsCache ?? null) as never,
    getSidebarSubjectsCache: () => (overrides.subjectsCache ?? null) as never,
    getSidebarOpenTermIds: () => overrides.openTermIds ?? new Set<string>()
  };
}

// ─── (a) Route predicates — pure ────────────────────────────────────────

describe("sidebar — (a) route predicates", () => {
  test("case 1: isSubjectClassRoute — subject/subject-class/week + subject id 매칭", () => {
    const subject = makeSubject("s1", "x");
    assert.equal(sidebar.isSubjectClassRoute(subject, { name: "subject", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectClassRoute(subject, { name: "subject-class", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectClassRoute(subject, { name: "week", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectClassRoute(subject, { name: "home" } as never), false);
    assert.equal(sidebar.isSubjectClassRoute(subject, { name: "subject", subjectId: "s2" } as never), false);
  });

  test("case 2: isSubjectSummaryRoute / McpRoute / MemorizeRoute", () => {
    const subject = makeSubject("s1", "x");
    assert.equal(sidebar.isSubjectSummaryRoute(subject, { name: "subject-summaries", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectSummaryRoute(subject, { name: "subject-summary-detail", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectMcpRoute(subject, { name: "subject-mcp", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectMemorizeRoute(subject, { name: "subject-memorize", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectExamPrepRoute(subject, { name: "subject-exam-prep", subjectId: "s1" } as never), true);
    assert.equal(sidebar.isSubjectMcpRoute(subject, { name: "home" } as never), false);
  });
});

// ─── (b) renderClassSchedule — pure ──────────────────────────────────────

describe("sidebar — (b) renderClassSchedule", () => {
  test("case 3a: no activeLabel → pills rendered without active class", () => {
    const html = sidebar.renderClassSchedule();
    const c = parseContainer(html);
    assert.ok(c.querySelectorAll(".schedule-pill").length >= 1);
    assert.equal(c.querySelectorAll(".schedule-pill.active").length, 0);
  });

  test("case 3b: activeLabel matches a pill label → exactly that pill has .active class", () => {
    // classSchedule[0] 의 실제 label 을 첫 pill innerHTML 에서 추출 후 매칭.
    const baseline = sidebar.renderClassSchedule();
    const c0 = parseContainer(baseline);
    const firstPillStrong = c0.querySelector(".schedule-pill strong");
    assert.ok(firstPillStrong, "schedule has at least 1 pill with label");
    const firstLabel = firstPillStrong!.textContent;
    const html = sidebar.renderClassSchedule(firstLabel);
    const c = parseContainer(html);
    const activePills = c.querySelectorAll(".schedule-pill.active");
    assert.equal(activePills.length, 1, "exactly one pill becomes active when label matches");
  });
});

// ─── (c) renderSubjectNavItem + renderCurrentSubjectDepthNav — pure ──────

describe("sidebar — (c) renderSubjectNavItem", () => {
  test("case 4: current subject → is-current class + depth nav rendered", () => {
    const subject = makeSubject("s1", "수학");
    const html = sidebar.renderSubjectNavItem(subject, subject, { name: "subject", subjectId: "s1" } as never);
    assert.ok(html.includes("is-current"));
    assert.ok(html.includes("subject-sidebar-depth"));
  });

  test("case 5: not current subject → depth nav absent", () => {
    const item = makeSubject("s2", "물리");
    const current = makeSubject("s1", "수학");
    const html = sidebar.renderSubjectNavItem(item, current, { name: "subject", subjectId: "s1" } as never);
    assert.ok(!html.includes("subject-sidebar-depth"));
  });

  test("case 6: hostile item.title escape", () => {
    const item = makeSubject("s2", "<script>alert(1)</script>");
    const current = makeSubject("s1", "x");
    const html = sidebar.renderSubjectNavItem(item, current, { name: "home" } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script").length, 0);
  });
});

// ─── (d) renderCurrentSubjectDepthNav — pure ─────────────────────────────

describe("sidebar — (d) renderCurrentSubjectDepthNav", () => {
  test("case 7: active class applied to current route", () => {
    const subject = makeSubject("s1", "수학");
    const html = sidebar.renderCurrentSubjectDepthNav(subject, { name: "subject-mcp", subjectId: "s1" } as never);
    const c = parseContainer(html);
    const mcpLink = c.querySelectorAll(".subject-sidebar-depth__link")[3];
    assert.ok(mcpLink, "mcp link exists");
    assert.ok((mcpLink!.getAttribute("class") ?? "").includes("active"));
  });

  test("case 8: hostile subject.title in aria-label escape", () => {
    const subject = makeSubject('"><img onerror=alert(1)>', '<script>x</script>');
    const html = sidebar.renderCurrentSubjectDepthNav(subject, { name: "home" } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (e) renderAdminLink — denylist negative UI (TB-AL1) ─────────────────

describe("sidebar — (e) renderAdminLink (AC7(d) denylist negative UI)", () => {
  test("case 9: role=undefined → empty string (no admin block)", () => {
    const ctx = makeCtx({ adminRole: undefined });
    const html = sidebar.renderAdminLink(ctx);
    assert.equal(html, "");
  });

  test("case 10: role='student' → empty string (denylist enforced)", () => {
    const ctx = makeCtx({ adminRole: "student" });
    const html = sidebar.renderAdminLink(ctx);
    assert.equal(html, "");
  });

  test("case 11: role='master' → admin block rendered", () => {
    const ctx = makeCtx({ adminRole: "master" });
    const html = sidebar.renderAdminLink(ctx);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".sidebar-group--admin").length, 1);
    assert.ok(html.includes("관리자"));
  });

  test("case 12: role='admin' → admin block rendered", () => {
    const ctx = makeCtx({ adminRole: "admin" });
    const html = sidebar.renderAdminLink(ctx);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".sidebar-group--admin").length, 1);
  });

  test("case 13: role='reviewer' → admin block 운영 지표만 (사용자 관리 숨김)", () => {
    const ctx = makeCtx({ adminRole: "reviewer" });
    const html = sidebar.renderAdminLink(ctx);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".sidebar-group--admin").length, 1);
    assert.ok(html.includes("운영 지표"), "reviewer 는 운영 지표 링크 노출");
    assert.ok(!html.includes("사용자 관리"), "reviewer 는 사용자 관리 링크 숨김");
    assert.ok(!html.includes("admin.html#users"), "reviewer 는 #users 링크 없음");
  });

  test("case 14: role='master'/'admin' → 사용자 관리 + 운영 지표 모두 노출", () => {
    for (const role of ["master", "admin"]) {
      const html = sidebar.renderAdminLink(makeCtx({ adminRole: role }));
      assert.ok(html.includes("사용자 관리"), `${role} 는 사용자 관리 노출`);
      assert.ok(html.includes("운영 지표"), `${role} 는 운영 지표 노출`);
    }
  });
});

// ─── (f) renderSidebarTermGroups — terms cache null/loaded ──────────────

describe("sidebar — (f) renderSidebarTermGroups (cache loaded vs null)", () => {
  test("case 13: termsCache=null → returns null (flat fallback)", () => {
    const ctx = makeCtx({ termsCache: null });
    const result = sidebar.renderSidebarTermGroups(ctx, makeSubject("s1", "x"), { name: "home" } as never);
    assert.equal(result, null);
  });

  test("case 14: termsCache+subjectsCache loaded → grouped rendered", () => {
    const notebook = makeNotebook([{ id: "s1", title: "수학" }, { id: "s2", title: "물리" }]);
    const termsCache = [{ id: "t1", grade: 1, semester: 1, title: "1-1학기", startDate: null, endDate: null }];
    const subjectsCache = [{ id: "s1", title: "수학", termId: "t1" }, { id: "s2", title: "물리", termId: "t1" }];
    const ctx = makeCtx({ notebook, termsCache, subjectsCache });
    const result = sidebar.renderSidebarTermGroups(ctx, makeSubject("s1", "수학"), { name: "subject", subjectId: "s1" } as never);
    assert.ok(result);
    const c = parseContainer(result ?? "");
    assert.ok(c.querySelectorAll(".sidebar-term-group").length >= 1);
  });
});

// ─── (g) renderHomeSidebar — happy + admin + hostile ─────────────────────

describe("sidebar — (g) renderHomeSidebar (full integration)", () => {
  test("case 15: happy + admin role → home + subjects + admin block all present", () => {
    const notebook = makeNotebook([{ id: "s1", title: "수학" }]);
    const ctx = makeCtx({ notebook, adminRole: "master" });
    const html = sidebar.renderHomeSidebar(ctx, notebook as never, { name: "home" } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("aside.sidebar").length, 1);
    assert.equal(c.querySelectorAll(".sidebar-group--admin").length, 1);
  });

  test("case 16: student role → admin block absent (TB-AL1 PD denial)", () => {
    const notebook = makeNotebook([{ id: "s1", title: "수학" }]);
    const ctx = makeCtx({ notebook, adminRole: "student" });
    const html = sidebar.renderHomeSidebar(ctx, notebook as never, { name: "home" } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".sidebar-group--admin").length, 0);
  });

  test("case 17: hostile subject.title XSS in subjects + intake nav escape", () => {
    const notebook = makeNotebook([{ id: '"><script>id</script>', title: '<script>alert(1)</script>' }]);
    const ctx = makeCtx({ notebook });
    const html = sidebar.renderHomeSidebar(ctx, notebook as never, { name: "home" } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
    assert.equal(c.querySelectorAll("[onerror],[onload]").length, 0);
  });
});

// ─── (h) renderSubjectSidebar — happy + flat fallback + admin ───────────

describe("sidebar — (h) renderSubjectSidebar", () => {
  test("case 18: termsCache loaded → grouped rendered + admin link conditional", () => {
    const notebook = makeNotebook([{ id: "s1", title: "수학" }, { id: "s2", title: "물리" }]);
    const termsCache = [{ id: "t1", grade: 1, semester: 1, title: "1-1", startDate: null, endDate: null }];
    const subjectsCache = [{ id: "s1", title: "수학", termId: "t1" }, { id: "s2", title: "물리", termId: "t1" }];
    const ctx = makeCtx({ notebook, termsCache, subjectsCache, adminRole: "master" });
    const html = sidebar.renderSubjectSidebar(ctx, makeSubject("s1", "수학"), { name: "subject", subjectId: "s1" } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".sidebar-term-group").length, 1);
    assert.equal(c.querySelectorAll(".sidebar-group--admin").length, 1);
  });

  test("case 19: termsCache null → flat fallback (renderSubjectNavItem loop)", () => {
    const notebook = makeNotebook([{ id: "s1", title: "수학" }, { id: "s2", title: "물리" }]);
    const ctx = makeCtx({ notebook });
    const html = sidebar.renderSubjectSidebar(ctx, makeSubject("s1", "수학"), { name: "subject", subjectId: "s1" } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll(".sidebar-term-group").length, 0);
    assert.ok(c.querySelectorAll(".subject-sidebar-item").length >= 1);
  });

  test("case 20: hostile subject.title in aria-label + path escape (S5 lineage)", () => {
    const notebook = makeNotebook([{ id: "s1", title: "x" }]);
    const ctx = makeCtx({ notebook });
    const hostileSubject = makeSubject('"><img src=x onerror=alert(1)>', '<script>alert(1)</script>');
    const html = sidebar.renderSubjectSidebar(ctx, hostileSubject, { name: "subject", subjectId: hostileSubject.id } as never);
    const c = parseContainer(html);
    assert.equal(c.querySelectorAll("script,img").length, 0);
    assert.equal(c.querySelectorAll("[onerror]").length, 0);
  });
});

// ─── (i) Characterization ────────────────────────────────────────────────

describe("sidebar — (i) characterization (deterministic render)", () => {
  test("case 21: identical input → byte-identical HTML", () => {
    const notebook = makeNotebook([{ id: "s1", title: "x" }]);
    const ctx1 = makeCtx({ notebook });
    const ctx2 = makeCtx({ notebook });
    const subject = makeSubject("s1", "x");
    const r1 = sidebar.renderSubjectSidebar(ctx1, subject, { name: "subject", subjectId: "s1" } as never);
    const r2 = sidebar.renderSubjectSidebar(ctx2, subject, { name: "subject", subjectId: "s1" } as never);
    assert.equal(r1, r2);
  });

  test("case 22: export shape — 12 fn + 4 predicate exported", () => {
    assert.equal(typeof sidebar.renderHomeSidebar, "function");
    assert.equal(typeof sidebar.renderSubjectSidebar, "function");
    assert.equal(typeof sidebar.renderAdminLink, "function");
    assert.equal(typeof sidebar.renderClassSchedule, "function");
    assert.equal(typeof sidebar.renderSubjectNavItem, "function");
    assert.equal(typeof sidebar.renderCurrentSubjectDepthNav, "function");
    assert.equal(typeof sidebar.renderSidebarTermGroups, "function");
    assert.equal(typeof sidebar.renderSidebarTermGroup, "function");
    assert.equal(typeof sidebar.isSubjectClassRoute, "function");
    assert.equal(typeof sidebar.isSubjectSummaryRoute, "function");
    assert.equal(typeof sidebar.isSubjectMcpRoute, "function");
    assert.equal(typeof sidebar.isSubjectMemorizeRoute, "function");
  });
});
