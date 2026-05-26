// sprint-2026-W22-sprint-10 / layer C/slice-2 — sidebar (home + subject) + admin + class schedule + term grouping.
// main.ts 의 12 renderer + 4 route predicate 단일 module 분리.
// Context 5 field (lazy module-state getter) — notebook + adminRole + sidebarTermsCache
// + sidebarSubjectsCache + sidebarOpenTermIds. snapshot 금지.
// 3 state action (loadSidebarTermsCache / refreshSidebarOpenTermIds / toggleSidebarTermOpen)
// 는 main.ts 잔존 (module state direct write).
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title 모든 site escape (sprint-8/9 lineage).
//   (b) id/attribute escape — subject.id / termId / data-* attribute.
//   (c) href escape — subjectClassPath / subjectIntakePath / subjectPdfWorkspacePath
//       모든 출력에 defensive escapeHtml (sprint-8/9 lineage).
//   (d) denylist negative UI — renderAdminLink 의 role!=master + role!=admin → "".
//   (e) PII/logging boundary — console / RUM / Datadog import 0.

import {
  groupSubjectsByTerm,
  type SidebarGroup,
  type SidebarSubject,
  type SidebarTerm
} from "../sidebar/term-grouping";
import type { Route } from "../app/routes";
import {
  intakePath,
  subjectClassPath,
  subjectIntakePath,
  subjectMcpPath,
  subjectMemorizePath,
  subjectPdfWorkspacePath,
  subjectSummaryPath
} from "../app/routes";
import { escapeHtml } from "../app/escape-html";
import { classSchedule } from "../data/classSchedule";
import type { StudyNotebook, SubjectNote } from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

export interface SidebarContext {
  getNotebook: () => StudyNotebook;
  getAdminRole: () => string | undefined;
  getSidebarTermsCache: () => SidebarTerm[] | null;
  getSidebarSubjectsCache: () => SidebarSubject[] | null;
  getSidebarOpenTermIds: () => Set<string>;
}

// ─── Pure route predicates ───────────────────────────────────────────────

export function isSubjectClassRoute(subject: SubjectNote, route: Route): boolean {
  return (
    (route.name === "subject" ||
      route.name === "subject-class" ||
      route.name === "week") &&
    route.subjectId === subject.id
  );
}

export function isSubjectSummaryRoute(subject: SubjectNote, route: Route): boolean {
  return (
    (route.name === "subject-summaries" || route.name === "subject-summary-detail") &&
    route.subjectId === subject.id
  );
}

export function isSubjectMcpRoute(subject: SubjectNote, route: Route): boolean {
  return route.name === "subject-mcp" && route.subjectId === subject.id;
}

export function isSubjectMemorizeRoute(subject: SubjectNote, route: Route): boolean {
  return route.name === "subject-memorize" && route.subjectId === subject.id;
}

// ─── Pure helpers (no Context) ───────────────────────────────────────────

/**
 * Class schedule pill list. Uses classSchedule trusted const (imported).
 * activeLabel = caller-trust string (route 의 week label, 일반적으로 trusted source).
 */
export function renderClassSchedule(activeLabel?: string): string {
  return `
    <details class="sidebar-details schedule-details">
      <summary>수업 일정</summary>
      <div class="schedule-list" aria-label="중간 이후 수업 일정">
        ${classSchedule.map((entry) => `
          <span class="schedule-pill ${entry.kind === "final" ? "is-final" : ""} ${activeLabel === entry.label ? "active" : ""}">
            <strong>${escapeHtml(entry.label)}</strong>
            <span>${escapeHtml(entry.note)}</span>
          </span>
        `).join("")}
      </div>
    </details>
  `;
}

export function renderCurrentSubjectDepthNav(subject: SubjectNote, route: Route): string {
  const safeTitle = escapeHtml(subject.title);
  return `
    <div class="subject-sidebar-depth" aria-label="${safeTitle} 하위 화면">
      <a class="subject-sidebar-depth__link ${isSubjectClassRoute(subject, route) ? "active" : ""}" href="${escapeHtml(subjectClassPath(subject))}">수업</a>
      <a class="subject-sidebar-depth__link ${isSubjectSummaryRoute(subject, route) ? "active" : ""}" href="${escapeHtml(subjectSummaryPath(subject))}">요약본</a>
      <a class="subject-sidebar-depth__link ${isSubjectMcpRoute(subject, route) ? "active" : ""}" href="${escapeHtml(subjectMcpPath(subject))}">MCP 호출</a>
      <a class="subject-sidebar-depth__link ${isSubjectMemorizeRoute(subject, route) ? "active" : ""}" href="${escapeHtml(subjectMemorizePath(subject))}">필수 암기노트</a>
    </div>
  `;
}

export function renderSubjectNavItem(
  item: SubjectNote,
  currentSubject: SubjectNote,
  route: Route
): string {
  const isCurrent = item.id === currentSubject.id;

  return `
    <div class="subject-sidebar-item ${isCurrent ? "is-current" : ""}">
      <a class="subject-sidebar-parent ${isCurrent ? "is-current" : ""}" href="${escapeHtml(subjectClassPath(item))}">${escapeHtml(item.title)}</a>
      ${isCurrent ? renderCurrentSubjectDepthNav(item, route) : ""}
    </div>
  `;
}

// ─── Context-bound renderers ─────────────────────────────────────────────

/**
 * Admin link visibility. AC9(d) denylist negative UI — role != master/admin → "".
 */
export function renderAdminLink(ctx: SidebarContext): string {
  const role = ctx.getAdminRole();
  if (role !== "master" && role !== "admin") return "";
  return `
    <div class="sidebar-group sidebar-group--admin">
      <p class="group-label">🛡️ 관리자</p>
      <nav>
        <a href="/admin.html" aria-label="관리자 대시보드">사용자 관리</a>
      </nav>
    </div>
  `;
}

export function renderSidebarTermGroup(
  ctx: SidebarContext,
  group: SidebarGroup,
  currentSubject: SubjectNote,
  route: Route
): string {
  const termId = group.term?.id ?? "__orphan__";
  const isOpen = group.term ? ctx.getSidebarOpenTermIds().has(group.term.id) : true;
  const notebook = ctx.getNotebook();
  const subjectsHtml = group.subjects
    .map((s) => {
      const notebookEntry = notebook.subjects.find((n) => n.id === s.id);
      if (!notebookEntry) return "";
      return renderSubjectNavItem(notebookEntry, currentSubject, route);
    })
    .join("");
  return `
    <details class="sidebar-term-group" ${isOpen ? "open" : ""} data-term-id="${escapeHtml(termId)}">
      <summary class="sidebar-term-group__summary" data-action="sidebar-term-toggle" data-term-id="${escapeHtml(termId)}">
        ${escapeHtml(group.label)}
        <span class="sidebar-term-group__count">${group.subjects.length}</span>
      </summary>
      <div class="sidebar-term-group__body">
        ${subjectsHtml}
      </div>
    </details>
  `;
}

export function renderSidebarTermGroups(
  ctx: SidebarContext,
  currentSubject: SubjectNote,
  route: Route
): string | null {
  const termsCache = ctx.getSidebarTermsCache();
  const subjectsCache = ctx.getSidebarSubjectsCache();
  if (!termsCache || !subjectsCache) return null;
  const notebook = ctx.getNotebook();
  // Merge BE subjects with FE notebook subjects (subject.id matching).
  // FE notebook holds rich SubjectNote shape; BE subjects 가 source-of-truth 인
  // termId 만 가져온다.
  const enrichedSubjects: SidebarSubject[] = notebook.subjects.map((s) => {
    const beSubject = subjectsCache.find((bs) => bs.id === s.id);
    return { id: s.id, title: s.title, termId: beSubject?.termId ?? null };
  });
  const groups = groupSubjectsByTerm(enrichedSubjects, termsCache);
  if (groups.length === 0) return null;
  return groups
    .map((group) => renderSidebarTermGroup(ctx, group, currentSubject, route))
    .join("");
}

export function renderHomeSidebar(
  ctx: SidebarContext,
  studyNotebook: StudyNotebook,
  route: Route
): string {
  return `
    <aside class="sidebar" aria-label="학습 내비게이션">
      <a class="wordmark" href="#/">study-note</a>
      <div class="sidebar-group sidebar-group--home">
        <p class="group-label">홈</p>
        <nav>
          <a class="${route.name === "home" ? "active" : ""}" href="#/">전체 현황</a>
        </nav>
      </div>
      <div class="sidebar-group sidebar-group--subjects">
        <p class="group-label">과목 공부</p>
        <nav>
          ${studyNotebook.subjects.map((subject) => `
            <a href="${escapeHtml(subjectClassPath(subject))}">${escapeHtml(subject.title)}</a>
          `).join("")}
        </nav>
      </div>
      <div class="sidebar-group sidebar-group--workspaces">
        <p class="group-label">PDF 작업공간</p>
        <nav>
          <a class="${route.name === "pdf-workspaces" || route.name === "pdf-workspace" ? "active" : ""}" href="#/pdf-workspaces">작업공간 목록</a>
        </nav>
      </div>
      ${renderClassSchedule()}
      <details class="sidebar-details" ${route.name === "intake" ? "open" : ""}>
        <summary>자료 관리</summary>
        <nav>
          <a class="${route.name === "intake" ? "active" : ""}" href="${escapeHtml(intakePath())}">자료 투입 가이드</a>
          ${studyNotebook.subjects.map((subject) => `<a href="${escapeHtml(subjectIntakePath(subject))}">${escapeHtml(subject.title)} 자료 넣기</a>`).join("")}
        </nav>
      </details>
      ${renderAdminLink(ctx)}
    </aside>
  `;
}

export function renderSubjectSidebar(
  ctx: SidebarContext,
  subject: SubjectNote,
  route: Route
): string {
  const currentSession =
    route.name === "week"
      ? subject.weekNotes.find((week) => week.id === route.weekId)
      : undefined;
  const notebook = ctx.getNotebook();
  const safeTitle = escapeHtml(subject.title);

  return `
    <aside class="sidebar" aria-label="${safeTitle} 학습 내비게이션">
      <a class="wordmark" href="#/">study-note</a>
      <div class="sidebar-group sidebar-group--subjects">
        <p class="group-label">과목 공부</p>
        <nav aria-label="과목별 학습 화면">
          ${
            // sprint-W21-sprint-1/S2 (AC8-AC10): term cache 로드되면 그룹별 렌더,
            // 아니면 기존 flat 리스트 (fallback).
            renderSidebarTermGroups(ctx, subject, route) ??
            notebook.subjects.map((item) => renderSubjectNavItem(item, subject, route)).join("")
          }
        </nav>
      </div>
      <div class="sidebar-group sidebar-group--workspaces">
        <p class="group-label">PDF 작업공간</p>
        <nav>
          <a class="${route.name === "pdf-workspace" ? "active" : ""}" href="${escapeHtml(subjectPdfWorkspacePath(subject))}">${safeTitle} 작업공간</a>
          <a class="${route.name === "pdf-workspaces" ? "active" : ""}" href="#/pdf-workspaces">전체 작업공간</a>
        </nav>
      </div>
      ${renderClassSchedule(currentSession?.label)}
      <details class="sidebar-details" ${route.name === "subject-intake" ? "open" : ""}>
        <summary>자료 관리</summary>
        <nav>
          <a href="${escapeHtml(intakePath())}">자료 투입 가이드</a>
          <a class="${route.name === "subject-intake" ? "active" : ""}" href="${escapeHtml(subjectIntakePath(subject))}">${safeTitle} 자료 넣기</a>
          <a class="${route.name === "pdf-workspace" ? "active" : ""}" href="${escapeHtml(subjectPdfWorkspacePath(subject))}">${safeTitle} PDF 작업공간</a>
          ${notebook.subjects
            .filter((item) => item.id !== subject.id)
            .map((item) => `<a href="${escapeHtml(subjectIntakePath(item))}">${escapeHtml(item.title)} 자료 넣기</a>`)
            .join("")}
        </nav>
      </details>
      ${renderAdminLink(ctx)}
    </aside>
  `;
}
