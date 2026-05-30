// S3b React island 마이그레이션 — sidebar view-model producer.
// buildSidebarProps(descriptor, ctx) 가 old sidebar.ts 로직을 1:1 미러.
// 전체 view-model 의 stable serialization 으로 module-level memoize →
// value-equal 재발행 시 동일 객체 ref 반환 (loop-immunity, advisor #3).

import {
  groupSubjectsByTerm,
  type SidebarGroup,
  type SidebarSubject
} from "../../sidebar/term-grouping";
import type { Route } from "../routes";
import {
  intakePath,
  subjectClassPath,
  subjectIntakePath,
  subjectMcpPath,
  subjectMemorizePath,
  subjectPdfWorkspacePath,
  subjectSummaryPath
} from "../routes";
import { classSchedule } from "../../data/classSchedule";
import type { StudyNotebook, SubjectNote } from "@study-note/domain";
import type { SidebarContext } from "../../subject-views/sidebar";
import {
  isSubjectClassRoute,
  isSubjectMemorizeRoute,
  isSubjectMcpRoute,
  isSubjectSummaryRoute
} from "../../subject-views/sidebar";

// ─── Public types ─────────────────────────────────────────────────────────

export type SidebarDescriptor =
  | { variant: "home"; notebook: StudyNotebook; route: Route }
  | { variant: "subject"; subject: SubjectNote; route: Route };

export interface SchedulePill {
  label: string;
  note: string;
  kind: string;
  isActive: boolean;
}

export interface DepthNavLink {
  href: string;
  label: string;
  active: boolean;
}

export interface SubjectNavItemProps {
  id: string;
  title: string;
  href: string;
  isCurrent: boolean;
  depthNav: DepthNavLink[] | null;
}

export interface SidebarGroupProps {
  termId: string;           // "__orphan__" for orphan group
  label: string;
  isOpen: boolean;
  subjects: SubjectNavItemProps[];
}

export interface AdminLinkProps {
  showAdminBlock: boolean;
  showUserMgmt: boolean;
}

// ── 자료 관리 <details> ─────────────────────────────────────────────────
export interface IntakeDetailsProps {
  isOpen: boolean;
  mainIntakeHref: string;
  subjectIntakeItems: Array<{ id: string; title: string; href: string; isCurrentSubject: boolean }>;
  // subject variant 전용 extras
  subjectPdfWorkspaceHref?: string;
  subjectTitle?: string;
}

// ── variant home ────────────────────────────────────────────────────────
export interface HomeSidebarProps {
  variant: "home";
  activeRoute: Route;
  // 워드마크
  wordmarkHref: string;
  // home 그룹 nav
  homeNavActive: boolean;
  // 과목 그룹: groups 존재 시 term-grouped, null 시 flat list
  termGroups: SidebarGroupProps[] | null;
  flatSubjectLinks: Array<{ id: string; title: string; href: string }> | null;
  // PDF 작업공간
  pdfWorkspacesActive: boolean;
  // 수업 일정 pills
  schedulePills: SchedulePill[];
  // 자료 관리 details
  intakeDetails: IntakeDetailsProps;
  // 관리자 링크
  adminLink: AdminLinkProps;
}

// ── variant subject ─────────────────────────────────────────────────────
export interface SubjectSidebarProps {
  variant: "subject";
  activeRoute: Route;
  subjectTitle: string;
  wordmarkHref: string;
  // 과목 그룹
  termGroups: SidebarGroupProps[] | null;
  flatSubjectLinks: Array<SubjectNavItemProps> | null;
  // PDF 작업공간
  pdfWorkspacesActive: boolean;
  currentSubjectPdfWorkspaceHref: string;
  currentSubjectPdfWorkspaceTitle: string;
  // 수업 일정 pills
  schedulePills: SchedulePill[];
  // activeLabel for schedule
  activeScheduleLabel: string | undefined;
  // 자료 관리 details
  intakeDetails: IntakeDetailsProps;
  // 관리자 링크
  adminLink: AdminLinkProps;
}

export type SidebarViewProps = HomeSidebarProps | SubjectSidebarProps;

// ─── Module-level memoization (advisor #3) ───────────────────────────────
// 전체 view-model 을 JSON 직렬화 (Set→sorted array, stable key order) 하여
// value-equal 이면 직전 객체 ref 반환. 직렬화 대상 = computed view-model
// (outputs), 입력 파싱 실수로 stale 객체 반환하지 않는다.

let _lastKey: string | null = null;
let _lastObj: SidebarViewProps | null = null;

/** 테스트 간 residual state 격리용 reset. */
export function __resetSidebarPropsMemoForTesting__(): void {
  _lastKey = null;
  _lastObj = null;
}

function serializeViewModelKey(props: SidebarViewProps): string {
  // Set/function 없는 plain object → JSON.stringify (stable field order guaranteed
  // by construction order in buildSidebar*Props helpers below).
  return JSON.stringify(props);
}

function memoize(next: SidebarViewProps): SidebarViewProps {
  const key = serializeViewModelKey(next);
  if (key === _lastKey && _lastObj !== null) {
    return _lastObj;
  }
  _lastKey = key;
  _lastObj = next;
  return next;
}

// ─── Helpers (mirrors sidebar.ts pure helpers exactly) ───────────────────

function buildSchedulePills(activeLabel: string | undefined): SchedulePill[] {
  return classSchedule.map((entry) => ({
    label: entry.label,
    note: entry.note,
    kind: entry.kind,
    isActive: activeLabel === entry.label
  }));
}

function buildAdminLink(ctx: SidebarContext): AdminLinkProps {
  const role = ctx.getAdminRole();
  const isAdmin = role === "master" || role === "admin";
  const isReviewer = role === "reviewer";
  if (!isAdmin && !isReviewer) {
    return { showAdminBlock: false, showUserMgmt: false };
  }
  return { showAdminBlock: true, showUserMgmt: isAdmin };
}

function buildDepthNav(subject: SubjectNote, route: Route): DepthNavLink[] {
  return [
    {
      href: subjectClassPath(subject),
      label: "수업",
      active: isSubjectClassRoute(subject, route)
    },
    {
      href: subjectSummaryPath(subject),
      label: "요약본",
      active: isSubjectSummaryRoute(subject, route)
    },
    {
      href: subjectMcpPath(subject),
      label: "MCP 호출",
      active: isSubjectMcpRoute(subject, route)
    },
    {
      href: subjectMemorizePath(subject),
      label: "필수 암기노트",
      active: isSubjectMemorizeRoute(subject, route)
    }
  ];
}

function buildSubjectNavItem(
  item: SubjectNote,
  currentSubject: SubjectNote | null,
  route: Route
): SubjectNavItemProps {
  const isCurrent = currentSubject !== null && item.id === currentSubject.id;
  return {
    id: item.id,
    title: item.title,
    href: subjectClassPath(item),
    isCurrent,
    depthNav: isCurrent ? buildDepthNav(item, route) : null
  };
}

// BE-only subject (notebook 에 없는 경우) minimal props
function buildBeOnlySubjectNavItem(s: SidebarSubject): SubjectNavItemProps {
  return {
    id: s.id,
    title: s.title,
    href: `#/subjects/${s.id}/class`,
    isCurrent: false,
    depthNav: null
  };
}

function buildTermGroups(
  ctx: SidebarContext,
  notebook: StudyNotebook,
  currentSubject: SubjectNote | null,
  route: Route
): SidebarGroupProps[] | null {
  const termsCache = ctx.getSidebarTermsCache();
  const subjectsCache = ctx.getSidebarSubjectsCache();
  if (!termsCache || !subjectsCache) return null;

  // sprint-W22-be-sync: union of FE notebook + BE Subject API 응답 (sidebar.ts:199-208)
  const notebookById = new Map(notebook.subjects.map((s) => [s.id, s]));
  const enrichedSubjects: SidebarSubject[] = subjectsCache.map((bs) => {
    const notebookEntry = notebookById.get(bs.id);
    return {
      id: bs.id,
      title: notebookEntry?.title ?? bs.title,
      termId: bs.termId ?? null
    };
  });

  const groups: SidebarGroup[] = groupSubjectsByTerm(enrichedSubjects, termsCache);
  if (groups.length === 0) return null;

  const openTermIds = ctx.getSidebarOpenTermIds();

  return groups.map((group): SidebarGroupProps => {
    const termId = group.term?.id ?? "__orphan__";
    const isOpen = group.term ? openTermIds.has(group.term.id) : true;

    const subjects: SubjectNavItemProps[] = group.subjects.map((s) => {
      const notebookEntry = notebookById.get(s.id);
      if (notebookEntry) {
        return buildSubjectNavItem(notebookEntry, currentSubject, route);
      }
      return buildBeOnlySubjectNavItem(s);
    });

    return {
      termId,
      label: group.label,
      isOpen,
      subjects
    };
  });
}

// ─── Main producer ───────────────────────────────────────────────────────

function buildHomeSidebarProps(
  notebook: StudyNotebook,
  route: Route,
  ctx: SidebarContext
): HomeSidebarProps {
  const termGroups = buildTermGroups(ctx, notebook, null, route);
  const flatSubjectLinks: HomeSidebarProps["flatSubjectLinks"] =
    termGroups === null
      ? notebook.subjects.map((s) => ({
          id: s.id,
          title: s.title,
          href: subjectClassPath(s)
        }))
      : null;

  const intakeDetails: IntakeDetailsProps = {
    isOpen: route.name === "intake",
    mainIntakeHref: intakePath(),
    subjectIntakeItems: notebook.subjects.map((s) => ({
      id: s.id,
      title: s.title,
      href: subjectIntakePath(s),
      isCurrentSubject: false
    }))
  };

  return {
    variant: "home",
    activeRoute: route,
    wordmarkHref: "#/",
    homeNavActive: route.name === "home",
    termGroups,
    flatSubjectLinks,
    pdfWorkspacesActive:
      route.name === "pdf-workspaces" || route.name === "pdf-workspace",
    schedulePills: buildSchedulePills(undefined),
    intakeDetails,
    adminLink: buildAdminLink(ctx)
  };
}

function buildSubjectSidebarProps(
  subject: SubjectNote,
  route: Route,
  ctx: SidebarContext
): SubjectSidebarProps {
  const notebook = ctx.getNotebook();
  const currentSession =
    route.name === "week"
      ? subject.weekNotes.find((week) => week.id === route.weekId)
      : undefined;
  const activeScheduleLabel: string | undefined = currentSession?.label;

  const termGroups = buildTermGroups(ctx, notebook, subject, route);
  const flatSubjectLinks: SubjectSidebarProps["flatSubjectLinks"] =
    termGroups === null
      ? notebook.subjects.map((item) =>
          buildSubjectNavItem(item, subject, route)
        )
      : null;

  const intakeDetails: IntakeDetailsProps = {
    isOpen: route.name === "subject-intake",
    mainIntakeHref: intakePath(),
    subjectIntakeItems: [
      {
        id: subject.id,
        title: subject.title,
        href: subjectIntakePath(subject),
        isCurrentSubject: true
      },
      ...notebook.subjects
        .filter((item) => item.id !== subject.id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          href: subjectIntakePath(item),
          isCurrentSubject: false
        }))
    ],
    subjectPdfWorkspaceHref: subjectPdfWorkspacePath(subject),
    subjectTitle: subject.title
  };

  return {
    variant: "subject",
    activeRoute: route,
    subjectTitle: subject.title,
    wordmarkHref: "#/",
    termGroups,
    flatSubjectLinks,
    pdfWorkspacesActive: route.name === "pdf-workspaces",
    currentSubjectPdfWorkspaceHref: subjectPdfWorkspacePath(subject),
    currentSubjectPdfWorkspaceTitle: subject.title,
    schedulePills: buildSchedulePills(activeScheduleLabel),
    activeScheduleLabel,
    intakeDetails,
    adminLink: buildAdminLink(ctx)
  };
}

export function buildSidebarProps(
  descriptor: SidebarDescriptor,
  ctx: SidebarContext
): SidebarViewProps {
  let next: SidebarViewProps;
  if (descriptor.variant === "home") {
    next = buildHomeSidebarProps(descriptor.notebook, descriptor.route, ctx);
  } else {
    next = buildSubjectSidebarProps(descriptor.subject, descriptor.route, ctx);
  }
  return memoize(next);
}
