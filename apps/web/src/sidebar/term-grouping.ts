// sprint-W21-sprint-1 / S2 / AC8-AC10 — sidebar term grouping (pure).
//
// renderSubjectSidebar 에서 subject 목록을 학기별로 group + sort.
// AC8: (grade, semester, title) 오름차순.
// AC9: 현재 학기 default open (now ∈ [startDate, endDate]). 다른 학기 collapsed.
//      localStorage open state override (caller 가 read/write).
// AC10: subject 라우팅 = 기존 유지. term 은 sidebar 표시만 (route 영향 0).

export interface SidebarTerm {
  id: string;
  grade: number;
  semester: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
}

export interface SidebarSubject {
  id: string;
  title: string;
  termId: string | null;
}

export interface SidebarGroup {
  term: SidebarTerm | null;
  /** label for orphan group (term === null). */
  label: string;
  subjects: SidebarSubject[];
}

const ORPHAN_LABEL = "기타 (학기 미배정)";

export function groupSubjectsByTerm(
  subjects: ReadonlyArray<SidebarSubject>,
  terms: ReadonlyArray<SidebarTerm>
): SidebarGroup[] {
  const termById = new Map<string, SidebarTerm>();
  for (const term of terms) termById.set(term.id, term);

  const groupMap = new Map<string | null, SidebarGroup>();
  for (const term of terms) {
    groupMap.set(term.id, { term, label: termLabel(term), subjects: [] });
  }

  for (const subject of subjects) {
    const termIdKey = subject.termId && termById.has(subject.termId) ? subject.termId : null;
    if (termIdKey === null) {
      let orphan = groupMap.get(null);
      if (!orphan) {
        orphan = { term: null, label: ORPHAN_LABEL, subjects: [] };
        groupMap.set(null, orphan);
      }
      orphan.subjects.push(subject);
    } else {
      const group = groupMap.get(termIdKey);
      if (group) group.subjects.push(subject);
    }
  }

  const groups = Array.from(groupMap.values()).filter((g) => g.subjects.length > 0);

  for (const group of groups) {
    group.subjects.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }

  groups.sort((a, b) => {
    if (a.term === null) return 1; // orphan 마지막
    if (b.term === null) return -1;
    if (a.term.grade !== b.term.grade) return a.term.grade - b.term.grade;
    if (a.term.semester !== b.term.semester) return a.term.semester - b.term.semester;
    return a.term.title.localeCompare(b.term.title, "ko");
  });

  return groups;
}

function termLabel(term: SidebarTerm): string {
  return `${term.grade}학년 ${term.semester}학기 ${term.title}`;
}

/**
 * 현재 시점(now) 에 활성화된 학기 id 집합 + sidebar 빈 공간 회피.
 * 조건:
 *   1. term.startDate ≤ now ≤ term.endDate 인 학기는 default open (활성 학기 우선).
 *   2. 매칭 없으면 모든 학기 default open (sprint-W22-be-sync hotfix).
 *      이전엔 첫 group 의 termId 1개만 default open 이었지만, 학기가 1개 뿐인
 *      신규 사용자 + startDate/endDate 없는 default Term backfill 시점에 closed
 *      상태가 sidebar 빈 공간 만들어서 "UI 잘못 개발된 듯" 인상.
 *   3. 사용자 명시 close (stored=false) 는 resolveOpenTermIds 에서 우선 — 본 함수의
 *      default 가 모든 학기여도, 명시 close 한 학기는 그대로 closed.
 */
export function getDefaultOpenTermIds(
  groups: ReadonlyArray<SidebarGroup>,
  nowIso: string
): string[] {
  const now = new Date(nowIso);
  if (Number.isNaN(now.getTime())) return [];
  const matched: string[] = [];
  for (const group of groups) {
    if (!group.term) continue;
    // PR #49 codex R2 P2 — Invalid Date (malformed startDate/endDate) 면 NaN
    // 보장 X. parse 결과 NaN 이면 그 boundary 는 무시 (해당 row 가 default
    // open 으로 false-positive 잡히지 않게).
    const parseOrNull = (raw: string | null): Date | null => {
      if (!raw) return null;
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const start = parseOrNull(group.term.startDate);
    const end = parseOrNull(group.term.endDate);
    if (!start && !end) continue;
    if (start && now.getTime() < start.getTime()) continue;
    if (end && now.getTime() > end.getTime() + 24 * 60 * 60 * 1000 - 1) continue; // inclusive endDate (end of day)
    matched.push(group.term.id);
  }
  if (matched.length > 0) return matched;
  return groups.filter((g) => g.term !== null).map((g) => g.term!.id);
}

/**
 * localStorage 의 open state 와 default open 을 merge.
 * - localStorage 명시 open=true: 그대로 open.
 * - localStorage 명시 open=false: 그대로 closed (default open 무시).
 * - localStorage 항목 없음: default open 적용.
 */
export function resolveOpenTermIds(
  groups: ReadonlyArray<SidebarGroup>,
  defaultOpenIds: ReadonlyArray<string>,
  storedState: Record<string, boolean>
): Set<string> {
  const result = new Set<string>();
  for (const group of groups) {
    if (!group.term) continue;
    const stored = storedState[group.term.id];
    if (stored === true) result.add(group.term.id);
    else if (stored === false) continue;
    else if (defaultOpenIds.includes(group.term.id)) result.add(group.term.id);
  }
  return result;
}

/** localStorage key — userId namespacing (memory project_sprint3_s1_handoff). */
export function sidebarTermOpenStorageKey(userId: string): string {
  return `study-note.sidebar-term-open.v1:${userId}`;
}

export function parseStoredOpenState(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "boolean" && typeof k === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
