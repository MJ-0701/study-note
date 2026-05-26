// sprint-2026-W22-sprint-7 / layer B/slice-2f/iv — pdf-workspace-page render helpers.
// main.ts 의 5 render helper (frame stack + material status + toolbar +
// fullscreen toggle + tool button) 단일 module 분리.
// renderPdfWorkspacePage 본체는 main.ts 잔류 (heavy module state coupling —
// 다음 sprint scope).
//
// invariant:
//   (a) user content escape — material.fileName / subject.title 등.
//   (b) id/attribute escape — material.id / materialId / frameKey /
//       objectUrl 모든 attribute interpolation.
//   (c) trusted-input bounded — LocalPdfTool / EraserShape literal.
//   (d) PII no-logging — console / RUM / datadog import 0.

import { escapeHtml } from "../app/escape-html.ts";
import { formatPdfFileSize } from "@study-note/domain";

// PDF frame helpers (formerly main.ts).
function getPdfFrameKey(materialId: string, pageNumber: number): string {
  return `pdf-frame:${materialId}:${pageNumber}`;
}

function getPdfFramePages(selectedPage: number, pageCount: number): number[] {
  const pages = [selectedPage];
  if (selectedPage > 1) pages.push(selectedPage - 1);
  if (selectedPage < pageCount) pages.push(selectedPage + 1);
  return [...new Set(pages)].filter((page) => page >= 1 && page <= pageCount);
}
import type {
  SubjectNote,
  SubjectPdfWorkspace
} from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

export type LocalPdfTool = "read" | "sticky" | "pen" | "eraser" | "text" | "checklist" | "table" | "chart" | "star";

export type EraserShape = "circle" | "square" | "triangle" | "line";

export interface PdfToolbarContext {
  isPdfWorkspaceFullscreen: () => boolean;
  pdfToolHotkeyLabels: Record<string, string>;
  renderEraserSubToolbar: (subjectId: string, eraserShape: EraserShape, eraserSize: number, disabled: string) => string;
}

// ─── Renders ─────────────────────────────────────────────────────────────

export function renderPdfFrameStack(
  subject: SubjectNote,
  material: NonNullable<SubjectPdfWorkspace["material"]>,
  objectUrl: string,
  selectedPage: number
): string {
  const materialId = material.backendMaterialId ?? "";

  return getPdfFramePages(selectedPage, material.pageCount).map((pageNumber) => {
    const isActive = pageNumber === selectedPage;
    const frameKey = getPdfFrameKey(materialId, pageNumber);
    const preloadAttrs = isActive ? "" : ' aria-hidden="true"';

    return `<div
      class="pdf-frame ${isActive ? "is-active" : "is-preload"}"
      role="img"
      aria-label="${escapeHtml(subject.title)} PDF page ${pageNumber}"
      data-pdf-mount="true"
      data-pdf-frame-key="${escapeHtml(frameKey)}"
      data-material-id="${escapeHtml(materialId)}"
      data-page-number="${pageNumber}"
      data-blob-url="${escapeHtml(objectUrl)}"${preloadAttrs}
    ></div>`;
  }).join("");
}

export function renderPdfMaterialStatus(
  material: NonNullable<SubjectPdfWorkspace["material"]>,
  hasPreview: boolean,
  isPreviewLoading: boolean
): string {
  const uploadStatus = material.uploadStatus ?? "local";
  const statusLabel =
    uploadStatus === "uploaded"
      ? hasPreview
        ? "backend 저장 완료 · 미리보기 연결됨"
        : isPreviewLoading
          ? "backend 저장 완료 · 미리보기 불러오는 중"
          : "backend 저장 완료 · 미리보기 대기"
      : uploadStatus === "pending"
        ? "backend 업로드 대기/진행 중"
        : "이전 로컬 material";

  return `
    <div class="import-feedback ${uploadStatus === "pending" ? "" : "is-success"}">
      <strong>${escapeHtml(material.fileName)}</strong>
      <p>${formatPdfFileSize(material.fileSize)} · ${material.pageCount}페이지 추정 · ${escapeHtml(statusLabel)}</p>
      ${material.backendMaterialId ? `<p>material id: <code>${escapeHtml(material.backendMaterialId)}</code></p>` : ""}
    </div>
  `;
}

export function getPdfPreviewPlaceholderTitle(
  hasMaterial: boolean,
  isPreviewLoading: boolean
): string {
  if (isPreviewLoading) {
    return "저장된 PDF 미리보기를 불러오는 중입니다.";
  }
  return hasMaterial
    ? "backend에서 PDF 미리보기를 아직 받지 못했습니다."
    : "PDF를 업로드하면 여기에 미리보기가 열립니다.";
}

export function getPdfPreviewPlaceholderDetail(
  hasMaterial: boolean,
  selectedPage: number
): string {
  return hasMaterial
    ? `포스트잇과 펜 stroke는 페이지 ${selectedPage} 기준으로 계속 편집할 수 있습니다.`
    : "업로드 후 backend에서 다시 내려받은 Blob preview를 사용합니다.";
}

export function renderPdfToolbar(
  context: PdfToolbarContext,
  subjectId: string,
  selectedTool: LocalPdfTool,
  pageCount: number,
  selectedPage: number,
  hasMaterial: boolean,
  eraserShape: EraserShape,
  eraserSize: number
): string {
  const disabled = hasMaterial ? "" : "disabled";
  const safeSubjectId = escapeHtml(subjectId);

  const isMacLike =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
  const modifierLabel = isMacLike ? "⌘" : "Ctrl";

  return `
    <div class="pdf-toolbar" aria-label="PDF 작업 도구">
      <div class="pdf-page-controls">
        <button
          class="secondary-action"
          type="button"
          data-action="pdf-prev-page"
          data-subject-id="${safeSubjectId}"
          aria-keyshortcuts="${isMacLike ? "Meta" : "Control"}+["
          ${disabled}
        >
          <span class="tool-button__label">이전</span>
          <kbd class="tool-button__key" aria-hidden="true">${modifierLabel}+[</kbd>
        </button>
        <label>
          <span>페이지</span>
          <input
            type="number"
            min="1"
            max="${pageCount}"
            value="${selectedPage}"
            data-action="select-pdf-page"
            data-subject-id="${safeSubjectId}"
            ${disabled}
          />
        </label>
        <button
          class="secondary-action"
          type="button"
          data-action="pdf-next-page"
          data-subject-id="${safeSubjectId}"
          aria-keyshortcuts="${isMacLike ? "Meta" : "Control"}+]"
          ${disabled}
        >
          <span class="tool-button__label">다음</span>
          <kbd class="tool-button__key" aria-hidden="true">${modifierLabel}+]</kbd>
        </button>
      </div>
      <div class="pdf-tool-group" role="group" aria-label="입력 도구">
        ${renderToolButton(context, subjectId, "read", selectedTool, "읽기")}
        ${renderToolButton(context, subjectId, "sticky", selectedTool, "포스트잇")}
        ${renderToolButton(context, subjectId, "pen", selectedTool, "펜")}
        ${renderToolButton(context, subjectId, "eraser", selectedTool, "지우개")}
      </div>
      <div class="pdf-tool-group" role="group" aria-label="annotation 도구">
        ${renderToolButton(context, subjectId, "text", selectedTool, "텍스트 박스")}
        ${renderToolButton(context, subjectId, "checklist", selectedTool, "체크리스트")}
        ${renderToolButton(context, subjectId, "table", selectedTool, "표")}
        ${renderToolButton(context, subjectId, "chart", selectedTool, "그래프")}
        ${renderToolButton(context, subjectId, "star", selectedTool, "별표")}
      </div>
      <div class="pdf-tool-group" role="group" aria-label="화면 전환">
        ${renderFullscreenToggleButton(context)}
      </div>
      ${selectedTool === "eraser" ? context.renderEraserSubToolbar(subjectId, eraserShape, eraserSize, disabled) : ""}
    </div>
  `;
}

export function renderFullscreenToggleButton(context: PdfToolbarContext): string {
  const active = context.isPdfWorkspaceFullscreen();
  const label = active ? "전체화면 종료" : "전체화면";
  return `
    <button
      class="tool-button"
      type="button"
      data-action="toggle-pdf-fullscreen"
      aria-pressed="${active ? "true" : "false"}"
      aria-keyshortcuts="F"
    >
      <span class="tool-button__label">${escapeHtml(label)}</span>
      <kbd class="tool-button__key" aria-hidden="true">F</kbd>
    </button>
  `;
}

export function renderToolButton(
  context: PdfToolbarContext,
  subjectId: string,
  tool: LocalPdfTool,
  selectedTool: LocalPdfTool,
  label: string
): string {
  const hotkey = context.pdfToolHotkeyLabels[tool];
  const badgeHtml = hotkey
    ? ` <kbd class="tool-button__key" aria-hidden="true">${escapeHtml(hotkey)}</kbd>`
    : "";
  const ariaShortcut = hotkey ? ` aria-keyshortcuts="${escapeHtml(hotkey)}"` : "";
  const safeSubjectId = escapeHtml(subjectId);
  const safeTool = escapeHtml(tool);

  return `
    <button
      class="tool-button ${selectedTool === tool ? "active" : ""}"
      type="button"
      data-action="set-pdf-tool"
      data-subject-id="${safeSubjectId}"
      data-tool="${safeTool}"
      aria-pressed="${selectedTool === tool ? "true" : "false"}"${ariaShortcut}
    >
      <span class="tool-button__label">${escapeHtml(label)}</span>${badgeHtml}
    </button>
  `;
}
