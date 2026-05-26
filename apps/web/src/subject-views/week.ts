// sprint-2026-W22-sprint-16 / layer C/slice-8 — subject-week cluster.
// 3 fn = renderWeekPage + renderWeekUserNotesSection + renderWeekMappedPdfSection.
// Context 4 field (1 lazy + 1 fn ref + 2 callback).
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / week.title / week.focus / week.label /
//       week.userNotes.
//   (b) attribute escape — subject.id / week.id data-* attribute.
//   (c) href escape — subjectClassPath (defensive).
//   (d) callback TB — renderQuickNotePanel + renderPdfMaterialCard (caller responsibility).
//   (e) PII/log boundary — console / RUM / datadog import 0.

import type {
  Concept,
  ExampleQuestion,
  PdfMaterialDraft,
  RequiredKeyword,
  SourceMaterial,
  SubjectNote,
  WeekNote
} from "@study-note/domain";
import {
  getConceptById,
  getKeywordById,
  getQuestionById,
  getSourceById
} from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import { sanitizeExternalUrl } from "../app/safe-url";
import { subjectClassPath } from "../app/routes";
import {
  formatReviewStatus,
  renderConcept,
  renderQuestion,
  renderWeekColumn
} from "./subject-cards";

// ─── Public types ────────────────────────────────────────────────────────

export interface WeekPageContext {
  getSubjectPdfMaterials: (subjectId: string) => PdfMaterialDraft[];
  getPdfMaterialsForWeek: (
    subject: SubjectNote,
    week: WeekNote,
    materials: PdfMaterialDraft[]
  ) => PdfMaterialDraft[];
  renderQuickNotePanel: (
    subject: SubjectNote,
    origins: Array<"subject" | "week" | "keyword">
  ) => string;
  renderPdfMaterialCard: (
    subject: SubjectNote,
    material: PdfMaterialDraft,
    opts: { isCurrent: boolean; compact: boolean }
  ) => string;
}

// ─── Public renderers ────────────────────────────────────────────────────

export function renderWeekPage(
  ctx: WeekPageContext,
  subject: SubjectNote,
  week: WeekNote
): string {
  const materials = ctx.getPdfMaterialsForWeek(subject, week, ctx.getSubjectPdfMaterials(subject.id));
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

  return `
    <section class="subject-page-hero">
      <p class="meta">${escapeHtml(subject.title)} · ${escapeHtml(week.label)} · ${formatReviewStatus(week.reviewStatus)}</p>
      <h1>${escapeHtml(week.title)}</h1>
      <p class="lede">${escapeHtml(week.focus)}</p>
      <div class="hero-actions">
        <button class="action-button" type="button" data-action="generate-week-note" data-subject-id="${escapeHtml(subject.id)}" data-week-id="${escapeHtml(week.id)}">
          이 수업일 정리노트 만들기
        </button>
        <a class="action-link" href="${escapeHtml(sanitizeExternalUrl(subjectClassPath(subject)))}">수업으로 돌아가기</a>
      </div>
    </section>

    ${renderWeekMappedPdfSection(ctx, subject, week, materials)}

    ${renderWeekUserNotesSection(subject, week)}

    ${ctx.renderQuickNotePanel(subject, ["week"])}

    <section aria-labelledby="week-overview-title">
      <p class="meta">§1 — 수업일 개요</p>
      <h2 id="week-overview-title">이 수업일에서 볼 것</h2>
      <div class="week-note-grid">
        ${renderWeekColumn("키워드", keywords.map((keyword) => keyword.label))}
        ${renderWeekColumn("개념", concepts.map((concept) => concept.title))}
        ${renderWeekColumn("자료", sources.map((source) => source.title))}
      </div>
    </section>

    <section aria-labelledby="week-concepts-title">
      <p class="meta">§2 — 개념</p>
      <h2 id="week-concepts-title">개념 설명</h2>
      <div class="concept-list">
        ${concepts.map((concept) => renderConcept(concept, subject)).join("") || '<p class="empty-note">아직 연결된 개념이 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-practice-title">
      <p class="meta">§3 — 문제 풀이</p>
      <h2 id="week-practice-title">예제문제</h2>
      <div class="question-list">
        ${questions.map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>
  `;
}

export function renderWeekUserNotesSection(
  subject: SubjectNote,
  week: WeekNote
): string {
  const value = typeof week.userNotes === "string" ? week.userNotes : "";

  return `
    <section class="week-user-notes" aria-labelledby="week-user-notes-title">
      <p class="meta">내 필기</p>
      <h2 id="week-user-notes-title">자유 메모</h2>
      <p class="lede">이 수업일에 대한 자유 형식 메모입니다. 입력 즉시 브라우저에 저장됩니다.</p>
      <textarea
        class="week-user-notes__textarea"
        data-action="update-week-user-notes"
        data-subject-id="${escapeHtml(subject.id)}"
        data-week-id="${escapeHtml(week.id)}"
        aria-labelledby="week-user-notes-title"
        placeholder="강의 중 떠오른 키워드, 질문, 정리 메모를 자유롭게 적으세요."
        rows="8"
      >${escapeHtml(value)}</textarea>
    </section>
  `;
}

export function renderWeekMappedPdfSection(
  ctx: WeekPageContext,
  subject: SubjectNote,
  week: WeekNote,
  materials: PdfMaterialDraft[]
): string {
  return `
    <section class="pdf-material-browser" aria-labelledby="week-pdf-title">
      <div class="pdf-material-browser__header">
        <div>
          <p class="meta">연결된 PDF</p>
          <h2 id="week-pdf-title">${escapeHtml(week.label)} 수업자료</h2>
        </div>
        <a class="secondary-link" href="${escapeHtml(sanitizeExternalUrl(subjectClassPath(subject)))}">PDF 수업일 매핑</a>
      </div>
      ${materials.length > 0
        ? `<div class="pdf-material-slider is-compact" aria-label="${escapeHtml(week.label)} 연결 PDF">
            ${materials.map((material) => ctx.renderPdfMaterialCard(subject, material, {
              isCurrent: false,
              compact: true
            })).join("")}
          </div>`
        : `<p class="empty-note">아직 이 수업일에 연결된 PDF가 없습니다. 수업 화면에서 PDF 수업일을 지정하세요.</p>`}
    </section>
  `;
}
