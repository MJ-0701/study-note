/**
 * sidebar-term-nav.spec.ts — sprint-W21-sprint-1 / S2 / AC8-AC10 spec.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/__tests__/sidebar-term-nav.spec.ts
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  getDefaultOpenTermIds,
  groupSubjectsByTerm,
  parseStoredOpenState,
  resolveOpenTermIds,
  sidebarTermOpenStorageKey,
  type SidebarSubject,
  type SidebarTerm
} from "../sidebar/term-grouping.ts";

const term = (id: string, grade: number, semester: number, title: string, startDate: string | null = null, endDate: string | null = null): SidebarTerm =>
  ({ id, grade, semester, title, startDate, endDate });
const subj = (id: string, title: string, termId: string | null): SidebarSubject =>
  ({ id, title, termId });

describe("AC8 — groupSubjectsByTerm (grade,semester,title 오름차순)", () => {
  it("multiple terms sorted by (grade, semester, title)", () => {
    const terms = [
      term("t-2-1", 2, 1, "2학년 1학기"),
      term("t-1-2", 1, 2, "1학년 2학기"),
      term("t-1-1", 1, 1, "1학년 1학기"),
      term("t-2-2", 2, 2, "2학년 2학기")
    ];
    const subjects = [
      subj("s-c", "C언어", "t-1-1"),
      subj("s-d", "디지털공학", "t-1-1"),
      subj("s-p", "물리", "t-2-1")
    ];
    const groups = groupSubjectsByTerm(subjects, terms);
    assert.deepEqual(groups.map((g) => g.term?.id), ["t-1-1", "t-2-1"]); // only non-empty
  });

  it("subjects within group sorted by title (ko collation puts Hangul before ASCII)", () => {
    const terms = [term("t1", 1, 1, "1학년 1학기")];
    const subjects = [
      subj("s-b", "정보통신", "t1"),
      subj("s-a", "C언어", "t1"),
      subj("s-c", "디지털", "t1")
    ];
    const groups = groupSubjectsByTerm(subjects, terms);
    // ko 로케일 정렬: 한글 (ㄴ < ㅈ) → "디지털", "정보통신", 그 후 ASCII "C언어"
    assert.deepEqual(groups[0].subjects.map((s) => s.title), ["디지털", "정보통신", "C언어"]);
  });

  it("orphan (termId IS NULL) → 기타 group, sort 마지막", () => {
    const terms = [term("t1", 1, 1, "1학년 1학기")];
    const subjects = [
      subj("s-o", "Orphan", null),
      subj("s-c", "C언어", "t1")
    ];
    const groups = groupSubjectsByTerm(subjects, terms);
    assert.equal(groups[0].term?.id, "t1");
    assert.equal(groups[1].term, null);
    assert.match(groups[1].label, /기타|미배정/);
  });

  it("subject.termId 가 terms 안에 없으면 orphan 으로 처리", () => {
    const terms = [term("t1", 1, 1, "1학년 1학기")];
    const subjects = [subj("s-x", "Ghost", "nonexistent-term-id")];
    const groups = groupSubjectsByTerm(subjects, terms);
    assert.equal(groups[0].term, null);
    assert.equal(groups[0].subjects.length, 1);
  });

  it("term 자체가 0개여도 모든 subject 가 orphan → 1 group", () => {
    const groups = groupSubjectsByTerm([subj("s-a", "A", null)], []);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].term, null);
  });
});

describe("AC9 — getDefaultOpenTermIds (현재 학기 기준)", () => {
  const now = "2026-05-15T00:00:00.000Z";

  it("now 가 term range 안이면 그 term default open", () => {
    const terms = [
      term("t-active", 1, 1, "활성 학기", "2026-03-01", "2026-06-30"),
      term("t-past", 1, 2, "과거 학기", "2025-09-01", "2025-12-31")
    ];
    const subjects = [subj("s-a", "A", "t-active"), subj("s-b", "B", "t-past")];
    const groups = groupSubjectsByTerm(subjects, terms);
    const open = getDefaultOpenTermIds(groups, now);
    assert.deepEqual(open, ["t-active"]);
  });

  it("now 가 어떤 term range 와도 매칭 X 면 첫 group default open", () => {
    const terms = [
      term("t-future", 2, 1, "미래 학기", "2027-03-01", "2027-06-30"),
      term("t-past", 1, 2, "과거 학기", "2025-09-01", "2025-12-31")
    ];
    const subjects = [subj("s-a", "A", "t-future"), subj("s-b", "B", "t-past")];
    const groups = groupSubjectsByTerm(subjects, terms);
    const open = getDefaultOpenTermIds(groups, now);
    // 1학년 2학기 (t-past) 가 (grade,semester) 기준 첫 group
    assert.equal(open.length, 1);
  });

  it("startDate/endDate 모두 null 인 term 은 활성으로 보지 않음", () => {
    const terms = [
      term("t-unbounded", 1, 1, "기간 미지정", null, null),
      term("t-active", 1, 2, "활성", "2026-03-01", "2026-06-30")
    ];
    const subjects = [subj("s-a", "A", "t-unbounded"), subj("s-b", "B", "t-active")];
    const groups = groupSubjectsByTerm(subjects, terms);
    const open = getDefaultOpenTermIds(groups, now);
    assert.deepEqual(open, ["t-active"]);
  });

  it("term 0개이면 빈 배열", () => {
    const open = getDefaultOpenTermIds([], now);
    assert.deepEqual(open, []);
  });
});

describe("AC9 — resolveOpenTermIds (localStorage merge)", () => {
  const groups = groupSubjectsByTerm(
    [subj("s-a", "A", "t1"), subj("s-b", "B", "t2")],
    [term("t1", 1, 1, "1학기"), term("t2", 1, 2, "2학기")]
  );

  it("stored true → open (default 무시)", () => {
    const open = resolveOpenTermIds(groups, [], { t1: true });
    assert.equal(open.has("t1"), true);
    assert.equal(open.has("t2"), false);
  });

  it("stored false → closed (default open 무시)", () => {
    const open = resolveOpenTermIds(groups, ["t1"], { t1: false });
    assert.equal(open.has("t1"), false);
  });

  it("stored 없으면 default 적용", () => {
    const open = resolveOpenTermIds(groups, ["t2"], {});
    assert.equal(open.has("t1"), false);
    assert.equal(open.has("t2"), true);
  });
});

describe("storage key + parse", () => {
  it("sidebarTermOpenStorageKey namespaces by userId", () => {
    assert.equal(sidebarTermOpenStorageKey("user-001"), "study-note.sidebar-term-open.v1:user-001");
    assert.notEqual(sidebarTermOpenStorageKey("user-001"), sidebarTermOpenStorageKey("user-002"));
  });

  it("parseStoredOpenState handles valid JSON object of booleans", () => {
    assert.deepEqual(parseStoredOpenState('{"t1":true,"t2":false}'), { t1: true, t2: false });
  });

  it("parseStoredOpenState rejects non-object / invalid JSON / non-boolean values", () => {
    assert.deepEqual(parseStoredOpenState(null), {});
    assert.deepEqual(parseStoredOpenState(""), {});
    assert.deepEqual(parseStoredOpenState("not json"), {});
    assert.deepEqual(parseStoredOpenState("[1,2]"), {});
    assert.deepEqual(parseStoredOpenState('{"t1":"yes","t2":true}'), { t2: true });
  });
});
