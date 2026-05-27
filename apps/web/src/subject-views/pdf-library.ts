// sprint-2026-W22-sprint-17 / layer C/slice-9 — pdf-library cluster.
// 13 fn (5 render + 1 control + 5 helper + 2 auth-bound).
// PdfLibraryContext 1 field (getAuthSession lazy) — auth-bound fn 만 Context 받음.
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / material.fileName / classDateLabel / week.label.
//   (b) attribute escape — subject.id / material.id (materialKey) data-*.
//   (c) href escape (3-layer) — subjectPdfWorkspacePath + sanitizeExternalUrl + escapeHtml.
//   (d) denylist UI (canManage=false) — upload card readonly + select.disabled.
//   (e) auth boundary — canManagePdfMaterials role allowlist ("master" / "admin")
//       deny-by-default (undefined session / role / empty / other → false).
//   (f) ownership boundary — getPdfMaterialOwnerLabel auth-derived label.
//   (g) PII/log boundary — console / RUM / datadog import 0.

import {
  formatPdfFileSize,
  type PdfMaterialDraft,
  type StudyNotebook,
  type SubjectNote,
  type WeekNote
} from "@study-note/domain";
import {
  PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
  PDF_MATERIAL_UNASSIGNED_WIRE_DATE
} from "../pdf-workspace/constants";
import { escapeHtml } from "../app/escape-html";
import { sanitizeExternalUrl } from "../app/safe-url";
import { subjectPdfWorkspacePath } from "../app/routes";
import { getPdfMaterialKey } from "../pdf-workspace/workspace-store";
import { renderMetric } from "./subject-cards";

// ─── Public types ────────────────────────────────────────────────────────

interface AuthSessionLike {
  user: { id: string; role: string };
}

export interface PdfLibraryContext {
  getAuthSession: () => AuthSessionLike | undefined;
}

// ─── Auth-bound helpers ──────────────────────────────────────────────────

/**
 * Permission allowlist for PDF material management UI (client-side guardrail).
 * Authoritative permission = backend material API + main.ts onsubmit (외부 scope).
 *
 * Deny-by-default: session 없음 / role 없음 / role 빈 문자열 / 인식 안 되는 role → false.
 * 허용 role (대소문자 무시): "master" / "admin".
 */
export function canManagePdfMaterials(ctx: PdfLibraryContext): boolean {
  const role = ctx.getAuthSession()?.user.role?.toLowerCase();
  return role === "master" || role === "admin";
}

export function canEditPdfMaterialClassDate(
  ctx: PdfLibraryContext,
  _material: PdfMaterialDraft
): boolean {
  return canManagePdfMaterials(ctx);
}

export function getPdfMaterialOwnerLabel(
  ctx: PdfLibraryContext,
  material: PdfMaterialDraft
): string {
  const session = ctx.getAuthSession();
  if (material.uploaderId && material.uploaderId === session?.user.id) {
    return "내가 올림";
  }
  if (material.uploaderId) {
    return "공유 자료";
  }
  return material.uploadStatus === "local" ? "로컬 자료" : "업로드 자료";
}

// ─── Pure helpers ────────────────────────────────────────────────────────

export function getPdfMaterialClassDateLabel(subject: SubjectNote, material: PdfMaterialDraft): string {
  return isUnconfirmedPdfClassDate(subject, material.classDate)
    ? "수업일 미지정"
    : material.classDate?.trim() ?? "수업일 미지정";
}

export function getPdfMaterialClassDateValue(material: PdfMaterialDraft): string {
  const trimmed = material.classDate?.trim();
  return trimmed || PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
}

export function isUnconfirmedPdfClassDate(subject: SubjectNote, classDate: string | undefined): boolean {
  const trimmed = classDate?.trim();
  if (
    !trimmed ||
    trimmed === PDF_MATERIAL_UNASSIGNED_CLASS_DATE ||
    trimmed === PDF_MATERIAL_UNASSIGNED_WIRE_DATE ||
    trimmed === "수업일 미지정"
  ) {
    return true;
  }
  return !subject.weekNotes.some((week) => week.label === trimmed);
}

export function getPdfMaterialsForWeek(
  subject: SubjectNote,
  week: WeekNote,
  materials: PdfMaterialDraft[]
): PdfMaterialDraft[] {
  return materials.filter((material) => {
    const trimmed = material.classDate?.trim();
    return Boolean(trimmed) &&
      trimmed === week.label &&
      !isUnconfirmedPdfClassDate(subject, trimmed);
  });
}

export function getPdfMaterialStatusLabel(material: PdfMaterialDraft): string {
  if (material.uploadStatus === "pending") return "업로드 중";
  if (material.uploadStatus === "uploaded") return "공유 가능";
  return "로컬";
}

// ─── Renderers ───────────────────────────────────────────────────────────

export function renderPdfWorkspaceIndex(
  ctx: PdfLibraryContext,
  studyNotebook: StudyNotebook,
  getSubjectPdfMaterials: (subjectId: string) => PdfMaterialDraft[]
): string {
  const subjectSummaries = studyNotebook.subjects.map((subject) => ({
    subject,
    materials: getSubjectPdfMaterials(subject.id)
  }));
  const totalMaterials = subjectSummaries.reduce(
    (total, item) => total + item.materials.length,
    0
  );
  const activeSubjects = subjectSummaries.filter((item) => item.materials.length > 0).length;

  return `
    <section class="subject-page-hero">
      <p class="meta">PDF 자료실</p>
      <h1>수업자료 찾기</h1>
      <p class="lede">관리자가 올린 PDF를 과목별로 골라 열고, 같은 원문 위에 내 필기만 따로 저장합니다.</p>
      <div class="pdf-library-summary" aria-label="PDF 자료 현황">
        ${renderMetric("등록 자료", `${totalMaterials}개`, "업로드된 PDF")}
        ${renderMetric("과목", `${activeSubjects}/${studyNotebook.subjects.length}`, "자료가 있는 과목")}
        ${renderMetric("필기", "개인별", "PDF 원문과 분리 저장")}
      </div>
    </section>
    <section aria-labelledby="pdf-workspaces-title">
      <p class="meta">자료 목록</p>
      <h2 id="pdf-workspaces-title">과목별 PDF</h2>
      <div class="pdf-library">
        ${subjectSummaries.map(({ subject, materials }) =>
          renderPdfSubjectLibrarySection(ctx, subject, materials)
        ).join("")}
      </div>
    </section>
  `;
}

export function renderPdfSubjectLibrarySection(
  ctx: PdfLibraryContext,
  subject: SubjectNote,
  materials: PdfMaterialDraft[]
): string {
  const safeTitle = escapeHtml(subject.title);
  return `
    <section class="pdf-subject-section" aria-labelledby="pdf-subject-${escapeHtml(subject.id)}">
      <div class="pdf-subject-section__header">
        <div>
          <p class="meta">${escapeHtml(subject.examLabel)} · ${escapeHtml(subject.summary.weekRange)}</p>
          <h3 id="pdf-subject-${escapeHtml(subject.id)}">${safeTitle}</h3>
        </div>
        <span class="pdf-count-pill">${materials.length}개 자료</span>
      </div>
      <div class="pdf-material-slider" aria-label="${safeTitle} PDF 자료 슬라이더">
        ${renderPdfLibraryUploadCard(ctx, subject, materials.length)}
        ${materials.map((material) => renderPdfMaterialCard(ctx, subject, material, {
          isCurrent: false,
          compact: false
        })).join("")}
      </div>
    </section>
  `;
}

export function renderSubjectPdfMaterialBrowser(
  ctx: PdfLibraryContext,
  subject: SubjectNote,
  materials: PdfMaterialDraft[],
  currentMaterialKey: string | undefined
): string {
  if (materials.length === 0) {
    return "";
  }
  return `
    <section class="pdf-material-browser" aria-labelledby="subject-pdf-materials-title">
      <div class="pdf-material-browser__header">
        <div>
          <p class="meta">§2 — 자료 선택</p>
          <h2 id="subject-pdf-materials-title">이 과목의 PDF 자료</h2>
        </div>
        <a class="secondary-link" href="#/pdf-workspaces">전체 자료실</a>
      </div>
      <div class="pdf-material-slider is-compact" aria-label="${escapeHtml(subject.title)} PDF 자료 슬라이더">
        ${materials.map((material) => renderPdfMaterialCard(ctx, subject, material, {
          isCurrent: currentMaterialKey === getPdfMaterialKey(material),
          compact: true
        })).join("")}
      </div>
    </section>
  `;
}

export function renderPdfLibraryUploadCard(
  ctx: PdfLibraryContext,
  subject: SubjectNote,
  materialCount: number
): string {
  if (!canManagePdfMaterials(ctx)) {
    return `
      <article class="pdf-upload-card is-readonly">
        <p class="meta">${escapeHtml(subject.title)}</p>
        <h4>새 자료 요청</h4>
        <p>PDF 업로드는 관리자만 가능합니다. 필요한 강의자료가 없으면 관리자에게 요청하세요.</p>
        <a class="secondary-link" href="${escapeHtml(sanitizeExternalUrl(subjectPdfWorkspacePath(subject)))}">${materialCount > 0 ? "공유 자료 보기" : "작업공간 열기"}</a>
      </article>
    `;
  }

  const safeSubjectId = escapeHtml(subject.id);
  const inputId = `pdf-library-upload-${safeSubjectId}`;

  return `
    <article class="pdf-upload-card">
      <input
        id="${inputId}"
        class="file-input"
        type="file"
        accept="application/pdf,.pdf"
        data-action="import-pdf-material"
        data-subject-id="${safeSubjectId}"
      />
      <label class="pdf-upload-card__label" for="${inputId}">
        <span>새 PDF 업로드</span>
        <strong>${escapeHtml(subject.title)} 수업 자료 추가</strong>
        <small>${materialCount > 0 ? `${materialCount}개 자료에 이어 추가합니다.` : "첫 강의 PDF를 바로 올립니다."}</small>
      </label>
    </article>
  `;
}

export function renderPdfMaterialCard(
  ctx: PdfLibraryContext,
  subject: SubjectNote,
  material: PdfMaterialDraft,
  options: { isCurrent: boolean; compact: boolean; showClassDateControl?: boolean }
): string {
  const materialKey = getPdfMaterialKey(material);
  const ownerLabel = getPdfMaterialOwnerLabel(ctx, material);
  const statusLabel = getPdfMaterialStatusLabel(material);
  const classDateLabel = getPdfMaterialClassDateLabel(subject, material);
  const classDateIsUnconfirmed = isUnconfirmedPdfClassDate(subject, material.classDate);

  return `
    <article class="pdf-material-card${options.isCurrent ? " is-current" : ""}${options.compact ? " is-compact" : ""}">
      <div class="pdf-material-card__body">
        <p class="meta">${escapeHtml(subject.title)} · ${escapeHtml(classDateLabel)}</p>
        <h4>${escapeHtml(material.fileName)}</h4>
        <p>${formatPdfFileSize(material.fileSize)} · ${material.pageCount}페이지 · ${escapeHtml(statusLabel)}</p>
        <div class="pdf-material-card__badges">
          <span>${escapeHtml(ownerLabel)}</span>
          ${classDateIsUnconfirmed ? "<span>나중에 수정</span>" : ""}
          ${options.isCurrent ? "<span>현재 열림</span>" : ""}
        </div>
        ${options.showClassDateControl ? renderPdfMaterialClassDateControl(ctx, subject, material, materialKey) : ""}
      </div>
      <div class="pdf-material-card__actions">
        <button
          class="action-button"
          type="button"
          data-action="open-pdf-material"
          data-subject-id="${escapeHtml(subject.id)}"
          data-material-id="${escapeHtml(materialKey)}"
        >${options.isCurrent ? "다시 열기" : "열기"}</button>
      </div>
    </article>
  `;
}

export function renderPdfMaterialClassDateControl(
  ctx: PdfLibraryContext,
  subject: SubjectNote,
  material: PdfMaterialDraft,
  materialKey: string
): string {
  const selectedValue = getPdfMaterialClassDateValue(material);
  const canEdit = canEditPdfMaterialClassDate(ctx, material);
  const visibleOptionCount = Math.min(6, Math.max(2, subject.weekNotes.length + 1));

  return `
    <label class="pdf-material-card__field">
      <span>수업일</span>
      <select
        class="pdf-material-card__class-date-list"
        data-action="assign-pdf-class-date"
        data-subject-id="${escapeHtml(subject.id)}"
        data-material-id="${escapeHtml(materialKey)}"
        size="${visibleOptionCount}"
        ${canEdit ? "" : "disabled"}
      >
        <option value="${PDF_MATERIAL_UNASSIGNED_CLASS_DATE}" ${selectedValue === PDF_MATERIAL_UNASSIGNED_CLASS_DATE ? "selected" : ""}>수업일 미지정</option>
        ${subject.weekNotes.map((week) => {
          // PR #51 codex R7 P1: 비-ISO legacy week.label 은 BE reject.
          // disabled + "[migrate 필요]" hint 표시.
          const ISO = /^\d{4}-\d{2}-\d{2}$/;
          const isIso = ISO.test(week.label);
          const sel = selectedValue === week.label ? "selected" : "";
          const label = isIso ? week.label : `${week.label} (사용 불가 — 이전 형식)`;
          return `<option value="${escapeHtml(week.label)}" ${sel} ${isIso ? "" : "disabled"}>${escapeHtml(label)}</option>`;
        }).join("")}
      </select>
      <small class="pdf-material-card__field-hint">
        ${canEdit ? "날짜를 선택하면 바로 저장됩니다." : "수업일 수정은 관리자만 가능합니다."}
      </small>
    </label>
  `;
}
