// sprint-2026-W22-sprint-9 / layer C/slice-1 — subject-cards leaf renderers + format helpers.
// main.ts 의 8 leaf renderer + 7 format helper 단일 module 분리.
// bottom-up extraction — Context/Callbacks 없음 (pure leaves).
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject/keyword/concept/question 의 모든 string field.
//   (b) id/attribute escape — subject.id / keyword.id / concept.id 의 data-* + id attr.
//   (c) trusted-input bounded — RequiredKeyword.status / Concept.priority /
//       ExampleQuestion.difficulty / WeekNote.reviewStatus / SourceMaterial.kind +
//       visibility / QuickNote.status 의 union literal.
//   (d) PII no-logging — console / RUM / datadog import 0.
//   (e) href escape — subjectClassPath / subjectIntakePath 출력에 defensive escape
//       적용 (sprint-8 lineage). route helper output ≠ trusted encoding boundary.

import {
  getConceptById,
  getQuestionById,
  getSubjectCoverage,
  type Concept,
  type ExampleQuestion,
  type RequiredKeyword,
  type SourceMaterial,
  type SubjectNote,
  type WeekNote
} from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import { subjectClassPath, subjectIntakePath } from "../app/routes";

// ─── Leaf renderers ───────────────────────────────────────────────────────

/**
 * Metric card renderer. **Caller responsibility**: label/value/description
 * are interpolated directly. Pass pre-escaped strings or trusted constants
 * only. Slice-1 trust boundary (TB1) — no internal escapeHtml call.
 */
export function renderMetric(label: string, value: string, description: string): string {
  return `
    <article class="metric-card">
      <p class="meta">${label}</p>
      <strong>${value}</strong>
      <span>${description}</span>
    </article>
  `;
}

export function renderSubjectCard(subject: SubjectNote): string {
  const coverage = getSubjectCoverage(subject);

  return `
    <article class="subject-card">
      <p class="meta">${escapeHtml(subject.examLabel)} · ${escapeHtml(subject.summary.weekRange)}</p>
      <h3>${escapeHtml(subject.title)}</h3>
      <p>${escapeHtml(subject.summary.goal)}</p>
      <div class="subject-card-footer">
        <span>${coverage.coverageRate}% 키워드 반영</span>
        <a href="${escapeHtml(subjectClassPath(subject))}">과목 들어가기</a>
      </div>
    </article>
  `;
}

export function renderSubjectImportCard(subject: SubjectNote): string {
  const coverage = getSubjectCoverage(subject);

  return `
    <article class="subject-card">
      <p class="meta">${escapeHtml(subject.examLabel)} · ${escapeHtml(subject.summary.weekRange)}</p>
      <h3>${escapeHtml(subject.title)}</h3>
      <p>이 과목의 수업일별 Claude JSON만 가져옵니다.</p>
      <div class="subject-card-footer">
        <span>${coverage.coverageRate}% 키워드 반영</span>
        <a href="${escapeHtml(subjectIntakePath(subject))}">자료 넣기</a>
      </div>
    </article>
  `;
}

/**
 * Summary block. **Caller responsibility** — label/value interpolated direct.
 * Trust boundary TB2.
 */
export function renderSummaryBlock(label: string, value: string): string {
  return `
    <article class="summary-block">
      <p class="meta">${label}</p>
      <p>${value}</p>
    </article>
  `;
}

export function renderKeyword(keyword: RequiredKeyword, subject: SubjectNote): string {
  const linkedConcepts = keyword.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const buttonLabel =
    keyword.status === "covered" ? "정리노트 만들기" : "보강 템플릿 만들기";

  return `
    <article class="keyword-card ${keyword.status === "covered" ? "is-covered" : "is-missing"}">
      <div class="keyword-card-header">
        <h3>${escapeHtml(keyword.label)}</h3>
        <span>${formatKeywordStatus(keyword.status)}</span>
      </div>
      <p>${escapeHtml(keyword.professorSignal)}</p>
      <div class="linked-concepts">
        ${
          linkedConcepts.length > 0
            ? linkedConcepts.map((concept) => `<span>${escapeHtml(concept.title)}</span>`).join("")
            : "<span>추가 개념 정리 필요</span>"
        }
      </div>
      <div class="keyword-actions">
        <button class="inline-action" type="button" data-action="generate-keyword-note" data-subject-id="${escapeHtml(subject.id)}" data-keyword-id="${escapeHtml(keyword.id)}">
          ${buttonLabel}
        </button>
      </div>
    </article>
  `;
}

export function renderConcept(concept: Concept, subject: SubjectNote): string {
  const questions = concept.exampleQuestionIds
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));

  return `
    <article class="concept-row" id="${escapeHtml(concept.id)}">
      <div class="concept-main">
        <p class="meta">${formatConceptPriority(concept.priority)}</p>
        <h3>${escapeHtml(concept.title)}</h3>
        <p>${escapeHtml(concept.summary)}</p>
        <p class="plain-explanation">${escapeHtml(concept.easyExplanation)}</p>
      </div>
      <aside class="concept-side">
        <strong>출처 힌트</strong>
        <ul>
          ${concept.sourceHints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("")}
        </ul>
        <strong>연결 문제</strong>
        <p>${questions.length}개</p>
      </aside>
    </article>
  `;
}

export function renderQuestion(question: ExampleQuestion): string {
  return `
    <details class="question-row">
      <summary>
        <span class="question-difficulty">${formatQuestionDifficulty(question.difficulty)}</span>
        <span>${escapeHtml(question.prompt)}</span>
      </summary>
      <div class="answer-panel">
        <strong>정답</strong>
        <p>${escapeHtml(question.answer)}</p>
        <strong>해설</strong>
        <p>${escapeHtml(question.explanation)}</p>
      </div>
    </details>
  `;
}

/**
 * Week column. **Caller responsibility** — label interpolated direct. values[]
 * 는 본 함수에서 escapeHtml 적용 (per item). Trust boundary TB3 (label only).
 */
export function renderWeekColumn(label: string, values: string[]): string {
  return `
    <div class="week-column">
      <p class="meta">${label}</p>
      ${
        values.length > 0
          ? `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`
          : '<p class="empty-note">추가 정리 필요</p>'
      }
    </div>
  `;
}

// ─── Format helpers ──────────────────────────────────────────────────────

export function formatQuickNoteStatus(status: "ready" | "needs-fill"): string {
  return status === "ready" ? "바로 읽기" : "보강 필요";
}

export function formatKeywordStatus(status: RequiredKeyword["status"]): string {
  return status === "covered" ? "반영됨" : "보강 필요";
}

export function formatConceptPriority(priority: Concept["priority"]): string {
  const labels: Record<Concept["priority"], string> = {
    "must-know": "필수 개념",
    high: "중요 개념",
    review: "복습 개념"
  };

  return labels[priority];
}

export function formatReviewStatus(status: WeekNote["reviewStatus"]): string {
  return status === "ready" ? "읽기 가능" : "보강 필요";
}

export function formatQuestionDifficulty(difficulty: ExampleQuestion["difficulty"]): string {
  return difficulty === "basic" ? "기본" : "응용";
}

export function formatSourceKind(kind: SourceMaterial["kind"]): string {
  const labels: Record<SourceMaterial["kind"], string> = {
    "professor-pdf": "교수님 PDF",
    "claude-summary": "Claude 요약",
    "manual-keyword": "수동 키워드"
  };

  return labels[kind];
}

export function formatSourceVisibility(visibility: SourceMaterial["visibility"]): string {
  const labels: Record<SourceMaterial["visibility"], string> = {
    "private-source": "원문 비공개",
    "derived-note-only": "생성 노트만 공유"
  };

  return labels[visibility];
}
