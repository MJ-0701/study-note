// sprint-2026-W22-sprint-14 / layer C/slice-6 — memorize cluster.
// 5 fn = renderSubjectMemorizePage + renderMemorizeExamGroup +
//        renderMemorizeExamChapters + parseClassDateLabel + safeDateMs.
// pure leaves. Context 0.
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / examLabel / examScope 등.
//   (b) attribute escape — subject.id / week.id (no current data-* in this slice).
//   (c) href escape — subjectSummaryPath / subjectMcpPath / weekPath (defensive).
//   (d) date parsing trust boundary — parseClassDateLabel + safeDateMs 는 string
//       → number 만 반환. injection 불가능. calendar validation 으로 JS Date
//       rollover (2/30 → 3/2) 차단.
//   (e) PII/log boundary — console / RUM / datadog import 0.
//
// Security N/A (pure renderer): auth/session, secret/token, permission scope,
// side effect (file/fetch/storage/DOM/RUM/Datadog).

import type {
  Concept,
  ExampleQuestion,
  SubjectNote,
  WeekNote
} from "@study-note/domain";
import {
  getConceptById,
  getQuestionById
} from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import {
  subjectMcpPath,
  subjectSummaryPath,
  weekPath
} from "../app/routes";
import {
  renderConcept,
  renderKeyword,
  renderQuestion,
  renderSummaryBlock
} from "./subject-cards";

// ─── Public renderers ────────────────────────────────────────────────────

export function renderMemorizeExamGroup(
  title: string,
  weeks: WeekNote[],
  subject: SubjectNote
): string {
  if (weeks.length === 0) {
    return `
      <div class="memorize-exam-group memorize-exam-group--empty">
        <h3>${escapeHtml(title)}</h3>
        <p class="empty-note">${escapeHtml(title)} 구간의 수업일이 없습니다.</p>
      </div>
    `;
  }
  return `
    <div class="memorize-exam-group">
      <h3>${escapeHtml(title)} <span class="memorize-exam-group__count">${weeks.length}회</span></h3>
      <ul class="memorize-exam-group__list">
        ${weeks
          .map(
            (week) => `
              <li>
                <a href="${escapeHtml(weekPath(subject, week))}">
                  <span class="memorize-exam-group__label">${escapeHtml(week.label)}</span>
                  <span class="memorize-exam-group__title">${escapeHtml(week.title)}</span>
                </a>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

export function renderMemorizeExamChapters(subject: SubjectNote): string {
  const chapters = subject.summary.examChapters ?? [];
  if (chapters.length === 0) return "";

  return `
    <section aria-labelledby="memorize-exam-chapters-title">
      <p class="meta">시험 기준 챕터</p>
      <h2 id="memorize-exam-chapters-title">이번 시험에서 먼저 외울 범위</h2>
      <div class="memorize-chapter-grid">
        ${chapters.map((chapter) => `
          <article class="memorize-chapter">
            <span>${escapeHtml(chapter.label)}</span>
            <h3>${escapeHtml(chapter.title)}</h3>
            <p>${escapeHtml(chapter.focus)}</p>
            ${chapter.sourceHint ? `<small>${escapeHtml(chapter.sourceHint)}</small>` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

// sprint-2/S3: parse "5월 14일(목)" / "5월14일" / "5/14" → millisecond timestamp.
// Failed parses → +Infinity 로 정렬 끝으로 보냄 (stable order 유지).
// sprint-2/S3 fix (codex P3): JS Date 가 invalid combo (e.g., 2/31) 를 silently
// normalize (→ March 3). day-bound 검사를 month 별 max 로 정확화 + Date 재검증.
export function parseClassDateLabel(label: string): number {
  const text = label.trim();
  const kr = /(\d{1,2})\s*월\s*(\d{1,2})/.exec(text);
  if (kr) {
    const ts = safeDateMs(Number(kr[1]), Number(kr[2]));
    if (ts !== null) return ts;
  }
  const slash = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})/.exec(text);
  if (slash) {
    const ts = safeDateMs(Number(slash[1]), Number(slash[2]));
    if (ts !== null) return ts;
  }
  return Number.POSITIVE_INFINITY;
}

export function safeDateMs(month: number, day: number): number | null {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // sprint-2/S3 fix (codex P3): use a leap year (2024) so "2월 29일" stays
  // valid. 학기 비교 정렬 키 용도라 연도 자체는 임의 고정 가능.
  const d = new Date(2024, month - 1, day);
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.getTime();
}

export function renderSubjectMemorizePage(subject: SubjectNote): string {
  const mustKnowConcepts = subject.summary.mustKnowConceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const missingKeywords = subject.requiredKeywords.filter((keyword) => keyword.status !== "covered");
  const examQuestions = subject.weekNotes
    .flatMap((week) => week.exampleQuestionIds)
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));

  // sprint-2/S3: 시험 구간별 수업일 그룹 + 수업일자 ascending 정렬.
  // WeekNote.examPhase override > SubjectNote.examPhase > "final" default.
  const subjectPhase = subject.examPhase ?? "final";
  const sortedWeeks = [...subject.weekNotes].sort((a, b) =>
    parseClassDateLabel(a.label) - parseClassDateLabel(b.label)
  );
  const midtermWeeks = sortedWeeks.filter((week) => (week.examPhase ?? subjectPhase) === "midterm");
  const finalWeeks = sortedWeeks.filter((week) => (week.examPhase ?? subjectPhase) === "final");
  const safeTitle = escapeHtml(subject.title);

  return `
    <section class="subject-page-hero">
      <p class="meta">${escapeHtml(subject.examLabel)} · 시험 직전</p>
      <h1>${safeTitle} 필수 암기노트</h1>
      <p class="lede">날짜별 요약을 다 본 뒤 마지막으로 암기할 범위, 약한 포인트, 필수 개념만 압축해서 확인합니다.</p>
      <div class="hero-actions">
        <a class="action-button" href="${escapeHtml(subjectSummaryPath(subject))}">날짜별 요약 보기</a>
        <a class="secondary-link" href="${escapeHtml(subjectMcpPath(subject))}">MCP 호출 준비</a>
      </div>
    </section>

    <section class="summary-grid" aria-label="${safeTitle} 암기 전략">
      ${renderSummaryBlock("시험 범위", escapeHtml(subject.summary.examScope))}
      ${renderSummaryBlock("복습 전략", escapeHtml(subject.summary.strategy))}
      ${renderSummaryBlock("취약 포인트", escapeHtml(subject.summary.weakSpots.join(", ")))}
    </section>

    ${renderMemorizeExamChapters(subject)}

    <section aria-labelledby="memorize-by-exam-title">
      <p class="meta">시험 구간별 수업일</p>
      <h2 id="memorize-by-exam-title">중간고사 / 기말고사 묶음</h2>
      <p class="lede">현재 학기의 수업일을 시험 구간으로 나눕니다. 수업일자 오름차순.</p>
      ${renderMemorizeExamGroup("중간고사", midtermWeeks, subject)}
      ${renderMemorizeExamGroup("기말고사", finalWeeks, subject)}
    </section>

    <section aria-labelledby="memorize-concepts-title">
      <p class="meta">필수 개념</p>
      <h2 id="memorize-concepts-title">반드시 외울 개념</h2>
      <div class="concept-list">
        ${mustKnowConcepts.map((concept) => renderConcept(concept, subject)).join("") || '<p class="empty-note">아직 필수 개념이 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="memorize-keywords-title">
      <p class="meta">빈칸 점검</p>
      <h2 id="memorize-keywords-title">보강할 교수님 키워드</h2>
      <div class="keyword-grid">
        ${(missingKeywords.length > 0 ? missingKeywords : subject.requiredKeywords)
          .map((keyword) => renderKeyword(keyword, subject))
          .join("")}
      </div>
    </section>

    <section aria-labelledby="memorize-questions-title">
      <p class="meta">직전 점검</p>
      <h2 id="memorize-questions-title">말로 풀어볼 질문</h2>
      <div class="question-list">
        ${examQuestions.map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>
  `;
}
