// sprint-2026-W22-sprint-12 / layer C/slice-4 — subject-class cluster.
// main.ts L4909~5109 의 6 fn (renderSubjectClassPage + 5 sub-renderer) 추출.
// Context 8 field (2 lazy + 3 fn ref + 3 callback).
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / week.title / week.focus / material.fileName.
//   (b) id/attribute escape — subject.id / week.label / materialId 모든 data-* + value attr.
//   (c) href escape — 4 unit card href + weekPath/weekSummaryPath (defensive).
//   (d) denylist negative UI (client-side UX guardrail, **NOT auth boundary**) —
//       canManagePdfMaterials=false → select.disabled + button.disabled + 운영자
//       권한 메시지. authoritative permission = backend + main.ts onsubmit (scope 외).
//   (e) PII/logging boundary — console / RUM / datadog import 0.

import type { PdfMaterialDraft, SubjectNote, WeekNote } from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import {
  subjectClassPath,
  subjectExamPrepPath,
  subjectMemorizePath,
  subjectPdfWorkspacePath,
  subjectSummaryPath,
  weekPath,
  weekSummaryPath
} from "../app/routes";
import { formatReviewStatus } from "./subject-cards";
import { getPdfMaterialKey } from "../pdf-workspace/workspace-store";

// ─── Public types ────────────────────────────────────────────────────────

export interface SubjectClassContext {
  // 2 lazy module-state getter
  getSubjectPdfMaterials: (subjectId: string) => PdfMaterialDraft[];
  canManagePdfMaterials: () => boolean;
  // 3 pure fn ref (main.ts 잔존 — multi-caller)
  isUnconfirmedPdfClassDate: (subject: SubjectNote, classDate: string | undefined) => boolean;
  formatWeekLabel: (label: string | undefined | null, classDate?: string | null) => string;
  getPdfMaterialsForWeek: (subject: SubjectNote, week: WeekNote, materials: PdfMaterialDraft[]) => PdfMaterialDraft[];
  // 3 callback DI
  renderIntakeFeedback: (emptyText?: string) => string;
  renderPdfLibraryUploadCard: (subject: SubjectNote, materialCount: number) => string;
  renderPdfMaterialCard: (
    subject: SubjectNote,
    material: PdfMaterialDraft,
    opts: { isCurrent: boolean; compact: boolean; showClassDateControl: boolean }
  ) => string;
}

// ─── Public renderers ────────────────────────────────────────────────────

function sortWeekNotesByLabel(weekNotes: WeekNote[]): WeekNote[] {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  return [...weekNotes].sort((a, b) => {
    const aIso = ISO.test(a.label);
    const bIso = ISO.test(b.label);
    if (aIso && bIso) return a.label.localeCompare(b.label);
    if (aIso !== bIso) return aIso ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

export function renderSubjectClassPage(
  ctx: SubjectClassContext,
  subject: SubjectNote
): string {
  const subjectMaterials = ctx.getSubjectPdfMaterials(subject.id);
  const safeTitle = escapeHtml(subject.title);
  const sortedWeeks = sortWeekNotesByLabel(subject.weekNotes);

  return `
    <section class="subject-page-hero">
      <p class="meta">${escapeHtml(subject.examLabel)} · ${escapeHtml(subject.summary.weekRange)}</p>
      <h1>${safeTitle}</h1>
      <p class="lede">이 진입 화면에서 유닛 카드를 골라 상세로 진입합니다. 카드 click 또는 사이드바의 명시적 메뉴 click 만 상세 라우트를 엽니다.</p>
    </section>

    <section class="subject-unit-grid" aria-label="${safeTitle} 유닛">
      <a class="subject-unit-card" href="${escapeHtml(subjectClassPath(subject))}">
        <span class="subject-unit-card__meta">수업</span>
        <strong>수업일 카드</strong>
        <span class="subject-unit-card__hint">날짜별 자료 + 메모. ${subject.weekNotes.length}회.</span>
      </a>
      <a class="subject-unit-card" href="${escapeHtml(subjectSummaryPath(subject))}">
        <span class="subject-unit-card__meta">요약</span>
        <strong>요약본</strong>
        <span class="subject-unit-card__hint">수업일별 요약 + 키워드 정리.</span>
      </a>
      <a class="subject-unit-card" href="${escapeHtml(subjectMemorizePath(subject))}">
        <span class="subject-unit-card__meta">암기</span>
        <strong>필수 암기노트</strong>
        <span class="subject-unit-card__hint">중간/기말 구간별 + 필수 개념.</span>
      </a>
      <a class="subject-unit-card" href="${escapeHtml(subjectExamPrepPath(subject))}">
        <span class="subject-unit-card__meta">시험</span>
        <strong>시험 대비</strong>
        <span class="subject-unit-card__hint">별도 PDF와 답안집을 과목 안에서 확인.</span>
      </a>
      <a class="subject-unit-card" href="${escapeHtml(subjectPdfWorkspacePath(subject))}">
        <span class="subject-unit-card__meta">PDF</span>
        <strong>PDF 작업공간</strong>
        <span class="subject-unit-card__hint">필기 + 단축키. ${subjectMaterials.length}개 자료.</span>
      </a>
    </section>

    ${renderClassDateAddSection(ctx, subject)}

    <section aria-labelledby="weekly-title">
      <p class="meta">수업일 overview</p>
      <h2 id="weekly-title">수업일별 자료</h2>
      <p class="lede">날짜별 카드에서 수업 상세, 요약 상세, 연결된 PDF 수를 확인합니다.</p>
      <div class="class-day-grid">
        ${sortedWeeks.map((week) =>
          renderClassDayCard(ctx, subject, week, subjectMaterials)
        ).join("")}
      </div>
    </section>

    ${renderPdfMaterialAssignmentSection(ctx, subject, subjectMaterials)}
  `;
}

export function renderClassDateAddSection(
  ctx: SubjectClassContext,
  subject: SubjectNote
): string {
  return `
    <section class="class-date-add-section" aria-labelledby="class-date-add-title">
      <div>
        <p class="meta">수업일 추가</p>
        <h2 id="class-date-add-title">새 수업일 만들기</h2>
        <p class="lede">선업로드한 PDF를 나중에 정확한 날짜와 연결할 수 있도록 수업일 카드를 먼저 추가합니다.</p>
      </div>
      <form class="class-date-form" data-action="add-class-date">
        <input type="hidden" name="subjectId" value="${escapeHtml(subject.id)}" />
        <label>
          <span>수업일</span>
          <input name="classDate" type="date" required autocomplete="off" />
        </label>
        <label>
          <span>수업 제목</span>
          <input name="title" type="text" placeholder="예: 메모리 구조" autocomplete="off" />
        </label>
        <button class="action-button" type="submit">수업일 추가</button>
      </form>
      ${ctx.renderIntakeFeedback("수업일 추가와 PDF 매핑 상태가 여기에 표시됩니다.")}
    </section>
  `;
}

export function renderClassDayCard(
  ctx: SubjectClassContext,
  subject: SubjectNote,
  week: WeekNote,
  materials: PdfMaterialDraft[]
): string {
  const linkedMaterials = ctx.getPdfMaterialsForWeek(subject, week, materials);

  return `
    <article class="class-day-card">
      <div>
        <p class="meta">${escapeHtml(ctx.formatWeekLabel(week.label))} · ${formatReviewStatus(week.reviewStatus)}</p>
        <h3>${escapeHtml(week.title)}</h3>
        <p>${escapeHtml(week.focus)}</p>
      </div>
      <div class="class-day-card__stats">
        <span>${linkedMaterials.length}개 PDF</span>
        <span>${week.requiredKeywordIds.length}개 키워드</span>
      </div>
      ${renderClassDayPdfLinks(subject, linkedMaterials)}
      ${renderClassDayPdfAttachControl(ctx, subject, materials, week.label)}
      <div class="week-card-actions">
        <a class="action-button" href="${escapeHtml(weekPath(subject, week))}">수업 상세</a>
        <a class="secondary-link" href="${escapeHtml(weekSummaryPath(subject, week))}">요약 상세</a>
      </div>
    </article>
  `;
}

export function renderClassDayPdfAttachControl(
  ctx: SubjectClassContext,
  subject: SubjectNote,
  materials: PdfMaterialDraft[],
  weekLabel: string
): string {
  const unassigned = materials.filter((material) =>
    ctx.isUnconfirmedPdfClassDate(subject, material.classDate)
  );
  const options = unassigned.map((material) =>
    `<option value="${escapeHtml(getPdfMaterialKey(material))}">${escapeHtml(material.fileName)}</option>`
  ).join("");

  if (!ctx.canManagePdfMaterials()) {
    // AC9(d) denylist negative UI — client-side UX guardrail only.
    // select.disabled + button.disabled — disabled select 의 name="materialId"
    // 는 form submit 시 데이터에 포함되지 않음. 권한 message 표시.
    return `
      <form class="class-day-card__attach" data-action="attach-pdf-to-week" data-subject-id="${escapeHtml(subject.id)}" data-week-label="${escapeHtml(weekLabel)}">
        <label>
          <span>${escapeHtml("PDF 연결")}</span>
          <select name="materialId" disabled>
            ${options || `<option value="">${escapeHtml("연결 가능한 PDF 없음")}</option>`}
          </select>
        </label>
        <button class="secondary-action" type="submit" disabled>${escapeHtml("연결")}</button>
        <p class="class-day-card__empty">${escapeHtml("PDF 연결은 운영자 권한이 필요합니다.")}</p>
      </form>
    `;
  }

  if (unassigned.length === 0) {
    return `<p class="class-day-card__empty">${escapeHtml("연결 가능한 미지정 PDF가 없습니다. 먼저 PDF 작업공간에서 업로드하세요.")}</p>`;
  }

  return `
    <form class="class-day-card__attach" data-action="attach-pdf-to-week" data-subject-id="${escapeHtml(subject.id)}" data-week-label="${escapeHtml(weekLabel)}">
      <label>
        <span>${escapeHtml("PDF 연결")}</span>
        <select name="materialId">
          ${options}
        </select>
      </label>
      <button class="secondary-action" type="submit">${escapeHtml("연결")}</button>
    </form>
  `;
}

export function renderClassDayPdfLinks(
  subject: SubjectNote,
  materials: PdfMaterialDraft[]
): string {
  if (materials.length === 0) {
    return '<p class="class-day-card__empty">아직 연결된 PDF가 없습니다.</p>';
  }

  return `
    <div class="class-day-card__pdfs" aria-label="연결된 PDF">
      <p class="meta">연결 PDF</p>
      ${materials.slice(0, 2).map((material) => `
        <button
          class="class-day-card__pdf"
          type="button"
          data-action="open-pdf-material"
          data-subject-id="${escapeHtml(subject.id)}"
          data-material-id="${escapeHtml(getPdfMaterialKey(material))}"
        >
          ${escapeHtml(material.fileName)}
        </button>
      `).join("")}
      ${materials.length > 2 ? `<span class="class-day-card__more">외 ${materials.length - 2}개</span>` : ""}
    </div>
  `;
}

export function renderPdfMaterialAssignmentSection(
  ctx: SubjectClassContext,
  subject: SubjectNote,
  materials: PdfMaterialDraft[]
): string {
  return `
    <section class="pdf-material-browser" aria-labelledby="pdf-assignment-title">
      <div class="pdf-material-browser__header">
        <div>
          <p class="meta">PDF 수업일 매핑</p>
          <h2 id="pdf-assignment-title">업로드한 PDF 연결</h2>
          <p class="lede">PDF는 먼저 올리고, 수업일이 확정되면 여기서 날짜를 지정합니다.</p>
        </div>
        <span class="pdf-count-pill">${materials.length}개 자료</span>
      </div>
      <div class="pdf-material-slider" aria-label="${escapeHtml(subject.title)} PDF 수업일 매핑">
        ${ctx.renderPdfLibraryUploadCard(subject, materials.length)}
        ${materials.map((material) => ctx.renderPdfMaterialCard(subject, material, {
          isCurrent: false,
          compact: false,
          showClassDateControl: true
        })).join("")}
      </div>
    </section>
  `;
}
