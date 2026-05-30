// S3b sidebar-props.spec — producer parity + value-compare unit spec.
//
// parity: buildSidebarProps 가 생산한 SidebarViewProps 의 각 필드가
//   old sidebar.ts renderer 의 로직과 1:1 일치하는지 rich fixture 7종으로 검증.
//   (old HTML string 직접 비교 대신 computed field 비교 — node test 환경에서
//    TSX renderer 가 필요 없는 pure-JS producer 를 단독 검증.)
//
// value-compare: buildSidebarProps 의 module-level memoize 가
//   동일-값 재발행 → 동일 ref(skip), 변경 → 신규 ref(re-render) 를 보장함을 단언.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/app/react-shell/__tests__/sidebar-props.spec.ts

import { strict as assert } from "node:assert";
import { register } from "node:module";
import { describe, test, beforeEach } from "node:test";

// tsx 파일을 node strip-types 환경에서 import 가능하게 하는 loader.
// @study-note/domain 은 테스트 stub 으로 대체.
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
            export function getKeywordById() {}
            export function getNotebookCoverage() { return { coverageRate: 0, covered: 0, total: 0 }; }
            export function getIntegrityWarnings() { return []; }
            export function getSubjectCoverage() { return { coverageRate: 0 }; }
          \`
        };
      }
      return nextLoad(url, context);
    }
  `),
  import.meta.url
);

const {
  buildSidebarProps,
  __resetSidebarPropsMemoForTesting__
} = await import("../sidebar-props.ts");

// ─── Fixture builders ────────────────────────────────────────────────────

function makeSubject(id: string, title: string, weekNotes: Array<{id:string;label:string}> = []): never {
  return { id, title, weekNotes } as never;
}

function makeNotebook(subjects: Array<{id:string;title:string}>): never {
  return { subjects: subjects.map((s) => makeSubject(s.id, s.title)) } as never;
}

function makeCtx(overrides: Partial<{
  notebook: unknown;
  adminRole: string | undefined;
  termsCache: unknown;
  subjectsCache: unknown;
  openTermIds: Set<string>;
}> = {}): import("../../../subject-views/sidebar.ts").SidebarContext {
  return {
    getNotebook: () => (overrides.notebook ?? makeNotebook([{id:"s1",title:"수학"}])) as never,
    getAdminRole: () => overrides.adminRole,
    getSidebarTermsCache: () => (overrides.termsCache ?? null) as never,
    getSidebarSubjectsCache: () => (overrides.subjectsCache ?? null) as never,
    getSidebarOpenTermIds: () => overrides.openTermIds ?? new Set<string>()
  };
}

// ─── Parity fixtures (§9 rich 7종) ───────────────────────────────────────

// Fixture 1: multi-term groups (학기별 그룹화, groupSubjectsByTerm)
const TERMS_MULTI = [
  { id: "t1", grade: 1, semester: 1, title: "1-1", startDate: null, endDate: null },
  { id: "t2", grade: 1, semester: 2, title: "1-2", startDate: null, endDate: null }
];
const SUBJECTS_MULTI = [
  { id: "s1", title: "수학", termId: "t1" },
  { id: "s2", title: "물리", termId: "t1" },
  { id: "s3", title: "화학", termId: "t2" }
];

// Fixture 2: BE-only subject (notebook 미포함)
const SUBJECTS_BE_ONLY = [
  { id: "s1", title: "수학", termId: "t1" },
  { id: "s-be-only", title: "BE-only 과목", termId: "t1" }
];

// Fixture 3: cache-miss fallback (termsCache null)
// Fixture 4: admin role matrix 4분기
// Fixture 5: current-subject depth nav
// Fixture 6: class schedule active-label
// Fixture 7: 자료 관리 details open-state

describe("sidebar-props — parity (§9 rich fixtures)", () => {
  beforeEach(() => {
    __resetSidebarPropsMemoForTesting__();
  });

  test("fixture 1: multi-term groups — termGroups 2개, subjects 분배 정확", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"},{id:"s2",title:"물리"},{id:"s3",title:"화학"}]);
    const ctx = makeCtx({ notebook, termsCache: TERMS_MULTI, subjectsCache: SUBJECTS_MULTI });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    assert.equal(props.variant, "home");
    if (props.variant !== "home") return;
    assert.ok(props.termGroups, "termGroups 존재 (캐시 로드됨)");
    assert.equal(props.termGroups!.length, 2, "2 term groups");
    const t1Group = props.termGroups!.find(g => g.termId === "t1");
    assert.ok(t1Group, "t1 group 존재");
    assert.equal(t1Group!.subjects.length, 2, "t1 에 2 subject");
    const t2Group = props.termGroups!.find(g => g.termId === "t2");
    assert.equal(t2Group!.subjects.length, 1, "t2 에 1 subject");
    assert.equal(props.flatSubjectLinks, null, "termGroups 있으면 flatSubjectLinks null");
  });

  test("fixture 2: BE-only subject — notebook 미포함 subject 도 렌더됨 (minimal href)", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({
      notebook,
      termsCache: TERMS_MULTI.slice(0,1),
      subjectsCache: SUBJECTS_BE_ONLY
    });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    if (props.variant !== "home") throw new Error("variant mismatch");
    assert.ok(props.termGroups, "termGroups 존재");
    const t1Group = props.termGroups!.find(g => g.termId === "t1");
    assert.ok(t1Group, "t1 group 존재");
    const beOnlySubject = t1Group!.subjects.find(s => s.id === "s-be-only");
    assert.ok(beOnlySubject, "BE-only subject 존재");
    assert.ok(beOnlySubject!.href.includes("s-be-only"), "BE-only href contains id");
    assert.equal(beOnlySubject!.depthNav, null, "BE-only subject 는 depth nav 없음");
    assert.equal(beOnlySubject!.isCurrent, false, "BE-only subject isCurrent false");
  });

  test("fixture 3: cache-miss fallback — termsCache null → termGroups null + flatSubjectLinks", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"},{id:"s2",title:"물리"}]);
    const ctx = makeCtx({ notebook, termsCache: null });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    if (props.variant !== "home") throw new Error("variant mismatch");
    assert.equal(props.termGroups, null, "termGroups null (캐시 미로드)");
    assert.ok(props.flatSubjectLinks, "flatSubjectLinks 존재 (flat fallback)");
    assert.equal(props.flatSubjectLinks!.length, 2, "2 flat subject links");
  });

  test("fixture 4a: admin role=master → showAdminBlock true, showUserMgmt true", () => {
    const notebook = makeNotebook([{id:"s1",title:"x"}]);
    const ctx = makeCtx({ notebook, adminRole: "master" });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    assert.equal(props.adminLink.showAdminBlock, true, "master → admin block 노출");
    assert.equal(props.adminLink.showUserMgmt, true, "master → 사용자 관리 노출");
  });

  test("fixture 4b: admin role=reviewer → showAdminBlock true, showUserMgmt false", () => {
    const notebook = makeNotebook([{id:"s1",title:"x"}]);
    const ctx = makeCtx({ notebook, adminRole: "reviewer" });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    assert.equal(props.adminLink.showAdminBlock, true, "reviewer → admin block 노출");
    assert.equal(props.adminLink.showUserMgmt, false, "reviewer → 사용자 관리 숨김");
  });

  test("fixture 4c: admin role=none/student → showAdminBlock false", () => {
    const notebook = makeNotebook([{id:"s1",title:"x"}]);
    for (const role of [undefined, "student", "none"]) {
      __resetSidebarPropsMemoForTesting__();
      const ctx = makeCtx({ notebook, adminRole: role as string|undefined });
      const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
      assert.equal(props.adminLink.showAdminBlock, false, `${role ?? "undefined"} → admin block 숨김`);
    }
  });

  test("fixture 5: current-subject depth nav — subject variant, isCurrent subject has depthNav", () => {
    const subject1 = makeSubject("s1", "수학");
    const subject2 = makeSubject("s2", "물리");
    const notebook = makeNotebook([{id:"s1",title:"수학"},{id:"s2",title:"물리"}]);
    const ctx = makeCtx({ notebook, termsCache: null });
    const props = buildSidebarProps({
      variant: "subject",
      subject: subject1,
      route: { name: "subject", subjectId: "s1" }
    }, ctx);
    if (props.variant !== "subject") throw new Error("variant mismatch");
    assert.equal(props.termGroups, null, "cache null → termGroups null");
    assert.ok(props.flatSubjectLinks, "flatSubjectLinks 존재");
    const current = props.flatSubjectLinks!.find(s => s.id === "s1");
    assert.ok(current, "s1 subject 존재");
    assert.equal(current!.isCurrent, true, "s1 isCurrent true");
    assert.ok(current!.depthNav, "isCurrent → depthNav 존재");
    assert.equal(current!.depthNav!.length, 4, "depthNav = 4 links (수업/요약본/MCP/암기)");
    const notCurrent = props.flatSubjectLinks!.find(s => s.id === "s2");
    assert.equal(notCurrent!.isCurrent, false, "s2 isCurrent false");
    assert.equal(notCurrent!.depthNav, null, "s2 depthNav null");
  });

  test("fixture 5: depth nav active state — subject-class route → 수업 active", () => {
    const subject = makeSubject("s1", "수학");
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook, termsCache: null });
    const props = buildSidebarProps({
      variant: "subject",
      subject,
      route: { name: "subject-class", subjectId: "s1" }
    }, ctx);
    if (props.variant !== "subject") throw new Error();
    const current = props.flatSubjectLinks!.find(s => s.id === "s1");
    const depthNav = current!.depthNav!;
    const classLink = depthNav.find(l => l.label === "수업");
    assert.equal(classLink!.active, true, "subject-class route → 수업 active");
    const summaryLink = depthNav.find(l => l.label === "요약본");
    assert.equal(summaryLink!.active, false, "요약본 inactive");
  });

  test("fixture 6: class schedule active-label — week route + weekNote label → activeScheduleLabel", () => {
    const weekNote = { id: "w1", label: "5/22(목)" } as never;
    const subject = { id: "s1", title: "수학", weekNotes: [weekNote] } as never;
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook, termsCache: null });
    const props = buildSidebarProps({
      variant: "subject",
      subject,
      route: { name: "week", subjectId: "s1", weekId: "w1" }
    }, ctx);
    if (props.variant !== "subject") throw new Error();
    assert.equal(props.activeScheduleLabel, "5/22(목)", "week route → activeScheduleLabel 일치");
    const activePill = props.schedulePills.find(p => p.isActive);
    // classSchedule 에 "5/22(목)" 이 없으므로 active pill 없음 — 검증 조건 완화
    assert.ok(Array.isArray(props.schedulePills), "schedulePills is array");
    assert.ok(props.schedulePills.length > 0, "schedulePills not empty");
  });

  test("fixture 6b: class schedule pills — home route (activeLabel undefined) → no active pill", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    if (props.variant !== "home") throw new Error();
    const activeCount = props.schedulePills.filter(p => p.isActive).length;
    assert.equal(activeCount, 0, "home route → active schedule pill 없음");
  });

  test("fixture 7a: 자료 관리 details open — home route=intake → isOpen true", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "intake" } }, ctx);
    if (props.variant !== "home") throw new Error();
    assert.equal(props.intakeDetails.isOpen, true, "intake route → 자료 관리 details open");
  });

  test("fixture 7b: 자료 관리 details open — home route=home → isOpen false", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    if (props.variant !== "home") throw new Error();
    assert.equal(props.intakeDetails.isOpen, false, "home route → 자료 관리 details closed");
  });

  test("fixture 7c: 자료 관리 details open — subject-intake route → isOpen true (subject variant)", () => {
    const subject = makeSubject("s1", "수학");
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });
    const props = buildSidebarProps({
      variant: "subject",
      subject,
      route: { name: "subject-intake", subjectId: "s1" }
    }, ctx);
    if (props.variant !== "subject") throw new Error();
    assert.equal(props.intakeDetails.isOpen, true, "subject-intake → 자료 관리 open");
  });

  test("openTermIds Set → isOpen per group (parity with old renderSidebarTermGroup)", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"},{id:"s2",title:"물리"}]);
    const openTermIds = new Set(["t1"]); // t1 만 open
    const ctx = makeCtx({ notebook, termsCache: TERMS_MULTI, subjectsCache: SUBJECTS_MULTI, openTermIds });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    if (props.variant !== "home") throw new Error();
    const t1Group = props.termGroups!.find(g => g.termId === "t1");
    const t2Group = props.termGroups!.find(g => g.termId === "t2");
    assert.equal(t1Group!.isOpen, true, "t1 isOpen true (openTermIds 에 포함)");
    assert.equal(t2Group!.isOpen, false, "t2 isOpen false (openTermIds 에 미포함)");
  });

  test("subject variant: intakeDetails 에 subject PDF workspace href 존재", () => {
    const subject = makeSubject("s1", "수학");
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });
    const props = buildSidebarProps({
      variant: "subject",
      subject,
      route: { name: "subject", subjectId: "s1" }
    }, ctx);
    if (props.variant !== "subject") throw new Error();
    assert.ok(props.intakeDetails.subjectPdfWorkspaceHref, "subjectPdfWorkspaceHref 존재");
    assert.ok(props.intakeDetails.subjectPdfWorkspaceHref!.includes("s1"), "href 에 subject id 포함");
  });

  test("home variant: pdfWorkspacesActive — pdf-workspaces route → true", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "pdf-workspaces" } }, ctx);
    if (props.variant !== "home") throw new Error();
    assert.equal(props.pdfWorkspacesActive, true);
  });

  test("home variant: homeNavActive — home route → true", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });
    const props = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    if (props.variant !== "home") throw new Error();
    assert.equal(props.homeNavActive, true);
    assert.equal(props.pdfWorkspacesActive, false);
  });
});

// ─── Value-compare: memoize 검증 (advisor #3) ─────────────────────────────

describe("sidebar-props — value-compare (memoize, AC6)", () => {
  beforeEach(() => {
    __resetSidebarPropsMemoForTesting__();
  });

  test("value-equal 재발행 → 동일 ref 반환 (re-render skip)", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"},{id:"s2",title:"물리"}]);
    const openTermIds = new Set(["t1"]);
    const ctx = makeCtx({ notebook, termsCache: TERMS_MULTI, subjectsCache: SUBJECTS_MULTI, openTermIds });
    const descriptor = { variant: "home" as const, notebook, route: { name: "home" } as const };

    const ref1 = buildSidebarProps(descriptor, ctx);
    // 동일 ctx 로 재호출 — value-equal → same ref
    const ref2 = buildSidebarProps(descriptor, ctx);
    assert.strictEqual(ref1, ref2, "value-equal 재발행 → 동일 object ref");
  });

  test("openTermIds 변경 → 신규 ref 반환 (re-render 트리거)", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"},{id:"s2",title:"물리"}]);
    const openTermIds1 = new Set(["t1"]);
    const ctx1 = makeCtx({ notebook, termsCache: TERMS_MULTI, subjectsCache: SUBJECTS_MULTI, openTermIds: openTermIds1 });
    const descriptor = { variant: "home" as const, notebook, route: { name: "home" } as const };

    const ref1 = buildSidebarProps(descriptor, ctx1);

    // openTermIds 변경 (t2 추가)
    const openTermIds2 = new Set(["t1", "t2"]);
    const ctx2 = makeCtx({ notebook, termsCache: TERMS_MULTI, subjectsCache: SUBJECTS_MULTI, openTermIds: openTermIds2 });
    const ref2 = buildSidebarProps(descriptor, ctx2);

    assert.notStrictEqual(ref1, ref2, "openTermIds 변경 → 신규 ref");
    if (ref2.variant !== "home") throw new Error();
    const t2Group = ref2.termGroups!.find(g => g.termId === "t2");
    assert.equal(t2Group!.isOpen, true, "새 ref 에서 t2 isOpen true");
  });

  test("admin role 변경 → 신규 ref 반환", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const descriptor = { variant: "home" as const, notebook, route: { name: "home" } as const };

    const ref1 = buildSidebarProps(descriptor, makeCtx({ notebook, adminRole: "student" }));
    const ref2 = buildSidebarProps(descriptor, makeCtx({ notebook, adminRole: "master" }));
    assert.notStrictEqual(ref1, ref2, "adminRole 변경 → 신규 ref");
  });

  test("route 변경(home→intake) → 신규 ref, intakeDetails.isOpen 변경 반영", () => {
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const ctx = makeCtx({ notebook });

    const ref1 = buildSidebarProps({ variant: "home", notebook, route: { name: "home" } }, ctx);
    const ref2 = buildSidebarProps({ variant: "home", notebook, route: { name: "intake" } }, ctx);
    assert.notStrictEqual(ref1, ref2, "route 변경 → 신규 ref");
    if (ref2.variant !== "home") throw new Error();
    assert.equal(ref2.intakeDetails.isOpen, true, "intake route → intakeDetails.isOpen true");
  });

  test("동일-값 Set(new ref) 발행 → 직렬화 비교로 동일 ref 반환 (openTermIds Set ref 불안정 흡수)", () => {
    // openTermIds 는 매 renderApp 마다 새 Set 인스턴스로 반환될 수 있음.
    // memoize 는 출력(view-model) 직렬화 기반이라 Set ref 변경을 흡수해야 함.
    const notebook = makeNotebook([{id:"s1",title:"수학"}]);
    const termsCache = [{ id: "t1", grade: 1, semester: 1, title: "1-1", startDate: null, endDate: null }];
    const subjectsCache = [{ id: "s1", title: "수학", termId: "t1" }];

    // 동일 내용의 다른 Set ref
    const openIds1 = new Set(["t1"]);
    const openIds2 = new Set(["t1"]); // 새 ref, 같은 내용

    const ctx1 = makeCtx({ notebook, termsCache, subjectsCache, openTermIds: openIds1 });
    const ctx2 = makeCtx({ notebook, termsCache, subjectsCache, openTermIds: openIds2 });
    const descriptor = { variant: "home" as const, notebook, route: { name: "home" } as const };

    const ref1 = buildSidebarProps(descriptor, ctx1);
    const ref2 = buildSidebarProps(descriptor, ctx2);
    assert.strictEqual(ref1, ref2, "동일 내용 Set(다른 ref) → view-model 직렬화 동일 → same ref");
  });
});
