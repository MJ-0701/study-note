// sprint-2026-W22-sprint-13 / layer C/slice-5 — summaries cluster.
// 3 fn = renderSubjectSummariesPage + renderSummaryDayCard + renderWeekSummaryPage.
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / week.title/focus/label / keyword /
//       concept / source 의 모든 string field.
//   (b) attribute escape — subject.id / week.id data-* attribute.
//   (c) href escape — subjectClassPath / subjectMemorizePath / weekPath /
//       weekSummaryPath 모든 출력.
//   (d) callback TB (renderQuickNotePanel) — caller responsibility (main.ts 가
//       자체 escape 적용 의무, sprint-13 lineage).
//   (e) PII/log boundary — console / RUM / datadog import 0.

import type {
  Concept,
  ExampleQuestion,
  RequiredKeyword,
  SourceMaterial,
  SubjectNote,
  WeekNote
} from "@study-note/domain";
import {
  getConceptById,
  getKeywordById,
  getQuestionById,
  getSourceById,
  getSubjectCoverage
} from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import {
  subjectClassPath,
  subjectMemorizePath,
  subjectSummaryPath,
  weekPath,
  weekSummaryPath
} from "../app/routes";
import {
  formatReviewStatus,
  formatSourceKind,
  formatSourceVisibility,
  renderConcept,
  renderKeyword,
  renderMetric,
  renderQuestion,
  renderSummaryBlock
} from "./subject-cards";

// ─── Public types ────────────────────────────────────────────────────────

export interface SummariesContext {
  formatWeekLabel: (label: string | undefined | null, classDate?: string | null) => string;
  renderQuickNotePanel: (
    subject: SubjectNote,
    origins: Array<"subject" | "week" | "keyword">
  ) => string;
}

// ─── Public renderers ────────────────────────────────────────────────────

export function renderSubjectSummariesPage(
  ctx: SummariesContext,
  subject: SubjectNote
): string {
  const coverage = getSubjectCoverage(subject);
  const safeTitle = escapeHtml(subject.title);

  return `
    <section class="subject-page-hero">
      <p class="meta">${escapeHtml(subject.examLabel)} · ${escapeHtml(subject.summary.weekRange)}</p>
      <h1>${safeTitle} 요약본</h1>
      <p class="lede">요약본은 수업일별로 들어가서 확인합니다. 시험 직전에는 필수 암기노트만 따로 봅니다.</p>
      <div class="hero-actions">
        <button class="action-button" type="button" data-action="generate-subject-note" data-subject-id="${escapeHtml(subject.id)}">
          전체 정리노트 만들기
        </button>
        <a class="secondary-link" href="${escapeHtml(subjectClassPath(subject))}">수업 자료 보기</a>
        <a class="secondary-link" href="${escapeHtml(subjectMemorizePath(subject))}">필수 암기노트</a>
      </div>
    </section>

    <section class="metric-grid" aria-label="${safeTitle} 현황">
      ${renderMetric("키워드 반영률", `${coverage.coverageRate}%`, `${coverage.covered}/${coverage.total}개 반영`)}
      ${renderMetric("수업일", `${subject.weekNotes.length}개 노트`, "날짜별 노트")}
      ${renderMetric("시험 범위", escapeHtml(subject.summary.weekRange), escapeHtml(subject.examLabel))}
    </section>

    <section aria-labelledby="summary-list-title">
      <p class="meta">날짜별 요약</p>
      <h2 id="summary-list-title">수업일별 요약 목록</h2>
      <div class="class-day-grid">
        ${subject.weekNotes.map((week) => renderSummaryDayCard(ctx, subject, week)).join("")}
      </div>
    </section>

    <section aria-labelledby="summary-course-title">
      <p class="meta">과목 단위 메모</p>
      <h2 id="summary-course-title">전체 요약 방향</h2>
      <div class="summary-grid">
        ${renderSummaryBlock("시험 범위", escapeHtml(subject.summary.examScope))}
        ${renderSummaryBlock("복습 전략", escapeHtml(subject.summary.strategy))}
        ${renderSummaryBlock("취약 포인트", escapeHtml(subject.summary.weakSpots.join(", ")))}
      </div>
    </section>
  `;
}

export function renderSummaryDayCard(
  ctx: SummariesContext,
  subject: SubjectNote,
  week: WeekNote
): string {
  return `
    <article class="class-day-card">
      <div>
        <p class="meta">${escapeHtml(ctx.formatWeekLabel(week.label))} · ${formatReviewStatus(week.reviewStatus)}</p>
        <h3>${escapeHtml(week.title)}</h3>
        <p>${escapeHtml(week.focus)}</p>
      </div>
      <div class="class-day-card__stats">
        <span>${week.conceptIds.length}개 개념</span>
        <span>${week.exampleQuestionIds.length}개 문제</span>
      </div>
      <div class="week-card-actions">
        <a class="action-button" href="${escapeHtml(weekSummaryPath(subject, week))}">요약 상세 보기</a>
        <a class="secondary-link" href="${escapeHtml(weekPath(subject, week))}">수업 상세</a>
      </div>
    </article>
  `;
}

export function renderWeekSummaryPage(
  ctx: SummariesContext,
  subject: SubjectNote,
  week: WeekNote
): string {
  const keywords = week.requiredKeywordIds
    .map((keywordId) => getKeywordById(subject, keywordId))
    .filter((keyword): keyword is RequiredKeyword => Boolean(keyword));
  const concepts = week.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const questions = week.exampleQuestionIds
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));
  const sources = week.sourceMaterialIds
    .map((sourceId) => getSourceById(subject, sourceId))
    .filter((source): source is SourceMaterial => Boolean(source));
  const safeWeekLabel = escapeHtml(week.label);

  return `
    <section class="subject-page-hero">
      <p class="meta">${escapeHtml(subject.title)} · ${safeWeekLabel} · 요약본</p>
      <h1>${escapeHtml(week.title)} 요약</h1>
      <p class="lede">${escapeHtml(week.focus)}</p>
      <div class="hero-actions">
        <button class="action-button" type="button" data-action="generate-week-note" data-subject-id="${escapeHtml(subject.id)}" data-week-id="${escapeHtml(week.id)}">
          이 날짜 요약 만들기
        </button>
        <a class="secondary-link" href="${escapeHtml(weekPath(subject, week))}">수업 상세</a>
        <a class="secondary-link" href="${escapeHtml(subjectSummaryPath(subject))}">요약 목록</a>
      </div>
    </section>

    <section class="summary-grid" aria-label="${safeWeekLabel} 요약 상태">
      ${renderSummaryBlock("키워드", escapeHtml(keywords.map((keyword) => keyword.label).join(", ") || "아직 연결된 키워드가 없습니다."))}
      ${renderSummaryBlock("개념", escapeHtml(concepts.map((concept) => concept.title).join(", ") || "아직 연결된 개념이 없습니다."))}
      ${renderSummaryBlock("자료", escapeHtml(sources.map((source) => source.title).join(", ") || "아직 연결된 자료가 없습니다."))}
    </section>

    ${ctx.renderQuickNotePanel(subject, ["week"])}

    <section aria-labelledby="week-summary-keywords-title">
      <p class="meta">교수님 키워드</p>
      <h2 id="week-summary-keywords-title">이 날짜에 반영할 키워드</h2>
      <div class="keyword-grid">
        ${keywords.map((keyword) => renderKeyword(keyword, subject)).join("") || '<p class="empty-note">아직 연결된 키워드가 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-summary-concepts-title">
      <p class="meta">요약 상세</p>
      <h2 id="week-summary-concepts-title">개념 설명</h2>
      <div class="concept-list">
        ${concepts.map((concept) => renderConcept(concept, subject)).join("") || '<p class="empty-note">아직 연결된 개념이 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-summary-practice-title">
      <p class="meta">문제화</p>
      <h2 id="week-summary-practice-title">시험 전에 바꿔볼 질문</h2>
      <div class="question-list">
        ${questions.map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-summary-sources-title">
      <p class="meta">근거 자료</p>
      <h2 id="week-summary-sources-title">요약 근거</h2>
      <div class="source-grid">
        ${sources.map((source) => `
          <article class="source-row">
            <p class="meta">${formatSourceKind(source.kind)} · ${formatSourceVisibility(source.visibility)}</p>
            <h3>${escapeHtml(source.title)}</h3>
            <p>${escapeHtml(source.note)}</p>
            ${source.pages ? `<p class="source-pages">${escapeHtml(source.pages)}</p>` : ""}
          </article>
        `).join("") || '<p class="empty-note">아직 연결된 자료가 없습니다.</p>'}
      </div>
    </section>
  `;
}
