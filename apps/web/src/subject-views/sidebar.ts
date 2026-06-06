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
  subjectExamPrepPath,
  subjectIntakePath,
  subjectMcpPath,
  subjectMemorizePath,
  subjectPdfWorkspacePath,
  subjectSummaryPath
} from "../app/routes";
import { escapeHtml } from "../app/escape-html";
import { classSchedule } from "../data/classSchedule";
import type { StudyNotebook, SubjectNote } from "@study-note/domain";
import { hasSubjectExamPrepArtifact } from "./subject-exam-prep-artifacts";

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

export function isSubjectExamPrepRoute(subject: SubjectNote, route: Route): boolean {
  return route.name === "subject-exam-prep" && route.subjectId === subject.id;
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
      ${hasSubjectExamPrepArtifact(subject.id)
        ? `<a class="subject-sidebar-depth__link ${isSubjectExamPrepRoute(subject, route) ? "active" : ""}" href="${escapeHtml(subjectExamPrepPath(subject))}">시험 대비</a>`
        : ""
      }
      <a class="subject-sidebar-depth__link ${isSubjectMcpRoute(subject, route) ? "active" : ""}" href="${escapeHtml(subjectMcpPath(subject))}">MCP 호출</a>
      <a class="subject-sidebar-depth__link ${isSubjectMemorizeRoute(subject, route) ? "active" : ""}" href="${escapeHtml(subjectMemorizePath(subject))}">필수 암기노트</a>
    </div>
  `;
}

export function renderSubjectNavItem(
  item: SubjectNote,
  currentSubject: SubjectNote | null,
  route: Route
): string {
  const isCurrent = currentSubject !== null && item.id === currentSubject.id;

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
  const isAdmin = role === "master" || role === "admin";
  const isReviewer = role === "reviewer";
  if (!isAdmin && !isReviewer) return "";
  // reviewer = 운영지표만 (사용자 관리 숨김). BE 도 사용자관리 endpoint 를 reviewer
  // 거부하므로 FE 숨김은 UX 보강이고 실제 enforcement 는 서버다.
  const userMgmtLink = isAdmin
    ? `<a href="/admin.html#users" aria-label="사용자 관리">사용자 관리</a>`
    : "";
  return `
    <div class="sidebar-group sidebar-group--admin">
      <p class="group-label">🛡️ 관리자</p>
      <nav>
        ${userMgmtLink}
        <a href="/admin.html#ops" aria-label="운영 지표">운영 지표</a>
      </nav>
    </div>
  `;
}

export function renderSidebarTermGroup(
  ctx: SidebarContext,
  group: SidebarGroup,
  currentSubject: SubjectNote | null,
  route: Route
): string {
  const termId = group.term?.id ?? "__orphan__";
  const isOpen = group.term ? ctx.getSidebarOpenTermIds().has(group.term.id) : true;
  const notebook = ctx.getNotebook();
  const subjectsHtml = group.subjects
    .map((s) => {
      const notebookEntry = notebook.subjects.find((n) => n.id === s.id);
      if (notebookEntry) {
        return renderSubjectNavItem(notebookEntry, currentSubject, route);
      }
      // sprint-W22-be-sync: BE-only subject (admin SPA 에서 추가, FE notebook 미반영).
      // rich SubjectNote shape 없으므로 minimal link 만 표시. depth nav X.
      const safeTitle = escapeHtml(s.title);
      return `
        <div class="subject-sidebar-item">
          <a class="subject-sidebar-parent" href="#/subjects/${escapeHtml(s.id)}/class">${safeTitle}</a>
        </div>
      `;
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
  currentSubject: SubjectNote | null,
  route: Route
): string | null {
  const termsCache = ctx.getSidebarTermsCache();
  const subjectsCache = ctx.getSidebarSubjectsCache();
  if (!termsCache || !subjectsCache) return null;
  const notebook = ctx.getNotebook();
  // sprint-W22-be-sync: union of FE notebook + BE Subject API 응답.
  // FE notebook (seed 4과목) 만 표시하면 admin SPA 에서 추가된 새 과목이
  // main sidebar 에 안 보이는 staleness 발생.
  // BE subjectsCache 가 source-of-truth (termId + 모든 row 포함).
  // notebook 안에 있으면 rich title 사용, 없으면 BE title 그대로.
  const notebookById = new Map(notebook.subjects.map((s) => [s.id, s]));
  const enrichedSubjects: SidebarSubject[] = subjectsCache.map((bs) => {
    const notebookEntry = notebookById.get(bs.id);
    return {
      id: bs.id,
      title: notebookEntry?.title ?? bs.title,
      termId: bs.termId ?? null
    };
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
        <nav aria-label="학기/과목 트리">
          ${
            // sprint-W22-be-sync hotfix: home sidebar 도 term group 표시.
            // term cache 가 로드되면 학기별 그룹화. 미로드 (boot 직후 / BE 4xx)
            // 시 fallback = flat list (이전 동작).
            renderSidebarTermGroups(ctx, null, route) ??
            studyNotebook.subjects.map((subject) =>
              `<a href="${escapeHtml(subjectClassPath(subject))}">${escapeHtml(subject.title)}</a>`
            ).join("")
          }
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
