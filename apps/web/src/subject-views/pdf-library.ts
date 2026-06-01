// sprint-2026-W22-sprint-17 / layer C/slice-9 — pdf-library cluster.
// S1 pdf-workspace string route still uses the material browser/card renderers.
// PdfLibraryContext 1 field (getAuthSession lazy) — auth-bound helpers 만 Context 받음.
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title / material.fileName / classDateLabel / week.label.
//   (b) attribute escape — subject.id / material.id (materialKey) data-*.
//   (c) denylist UI (canManage=false) — class-date picker/apply disabled.
//   (d) auth boundary — canManagePdfMaterials role allowlist ("master" / "admin")
//       deny-by-default (undefined session / role / empty / other → false).
//   (e) ownership boundary — getPdfMaterialOwnerLabel auth-derived label.
//   (f) PII/log boundary — console / RUM / datadog import 0.

import {
  formatPdfFileSize,
  type PdfMaterialDraft,
  type SubjectNote,
  type WeekNote
} from "@study-note/domain";
import {
  PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
  PDF_MATERIAL_UNASSIGNED_WIRE_DATE
} from "../pdf-workspace/constants";
import { escapeHtml } from "../app/escape-html";
import { getPdfMaterialKey } from "../pdf-workspace/workspace-store";

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

export function getPdfMaterialClassDateSelectValue(
  subject: SubjectNote,
  material: PdfMaterialDraft
): string {
  const value = getPdfMaterialClassDateValue(material);
  return isUnconfirmedPdfClassDate(subject, value)
    ? PDF_MATERIAL_UNASSIGNED_CLASS_DATE
    : value;
}

export function getSortedPdfClassDateWeeks(subject: SubjectNote): WeekNote[] {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  return [...subject.weekNotes].sort((a, b) => {
    const aIso = ISO.test(a.label);
    const bIso = ISO.test(b.label);
    if (aIso && bIso) {
      return a.label.localeCompare(b.label);
    }
    if (aIso !== bIso) {
      return aIso ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
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
  const selectedValue = getPdfMaterialClassDateSelectValue(subject, material);
  const selectedLabel = getPdfClassDateOptionLabel(subject, selectedValue);
  const canEdit = canEditPdfMaterialClassDate(ctx, material);
  const safeSubjectId = escapeHtml(subject.id);
  const safeMaterialKey = escapeHtml(materialKey);
  const radioName = `pdf-class-date-${subject.id}-${materialKey}`;
  const options = [
    renderPdfClassDateOption(
      radioName,
      PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
      "수업일 미지정",
      selectedValue,
      false
    ),
    ...getSortedPdfClassDateWeeks(subject).map((week) => {
      // PR #51 codex R7 P1: 비-ISO legacy week.label 은 BE reject.
      // disabled + "[migrate 필요]" hint 표시.
      const ISO = /^\d{4}-\d{2}-\d{2}$/;
      const isIso = ISO.test(week.label);
      const displayLabel = week.title ? `${week.label} · ${week.title}` : week.label;
      const label = isIso ? displayLabel : `${displayLabel} (사용 불가 — 이전 형식)`;
      return renderPdfClassDateOption(radioName, week.label, label, selectedValue, !isIso);
    })
  ].join("");

  return `
    <div class="pdf-material-card__field">
      <span>수업일</span>
      <div class="pdf-material-card__class-date-row">
        ${canEdit ? `
          <details class="pdf-material-card__class-date-picker" data-role="pdf-class-date-picker">
            <summary class="pdf-material-card__class-date-summary">
              <span data-role="pdf-class-date-current">${escapeHtml(selectedLabel)}</span>
            </summary>
            <div class="pdf-material-card__class-date-options" role="radiogroup" aria-label="수업일 선택">
              ${options}
            </div>
          </details>
        ` : `
          <button
            class="pdf-material-card__class-date-summary is-disabled"
            type="button"
            data-role="pdf-class-date-current"
            disabled
          >${escapeHtml(selectedLabel)}</button>
        `}
        <button
          class="secondary-action pdf-material-card__class-date-apply"
          type="button"
          data-action="assign-pdf-class-date"
          data-subject-id="${safeSubjectId}"
          data-material-id="${safeMaterialKey}"
          ${canEdit ? "" : "disabled"}
        >적용</button>
      </div>
      <small class="pdf-material-card__field-hint">
        ${canEdit ? "날짜를 고른 뒤 적용을 눌러 저장합니다." : "수업일 수정은 관리자만 가능합니다."}
      </small>
    </div>
  `;
}

function getPdfClassDateOptionLabel(subject: SubjectNote, value: string): string {
  if (value === PDF_MATERIAL_UNASSIGNED_CLASS_DATE) {
    return "수업일 미지정";
  }
  const week = subject.weekNotes.find((item) => item.label === value);
  return week?.title ? `${week.label} · ${week.title}` : value;
}

function renderPdfClassDateOption(
  radioName: string,
  value: string,
  label: string,
  selectedValue: string,
  disabled: boolean
): string {
  return `
    <label class="pdf-material-card__class-date-option${disabled ? " is-disabled" : ""}">
      <input
        class="pdf-material-card__class-date-radio"
        type="radio"
        name="${escapeHtml(radioName)}"
        value="${escapeHtml(value)}"
        data-action="preview-pdf-class-date"
        data-role="pdf-class-date-option"
        data-label="${escapeHtml(label)}"
        ${selectedValue === value ? "checked" : ""}
        ${disabled ? "disabled" : ""}
      />
      <span class="pdf-material-card__class-date-option-label">${escapeHtml(label)}</span>
    </label>
  `;
}
