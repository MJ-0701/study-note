// sprint-2026-W22-sprint-6 / layer B/slice-2f/iii — simple widget render module.
// main.ts 의 simple widget render 함수 8개 (sticky / textbox / checklist /
// eraser cursor + sub-toolbar + shape button) → 단일 module 분리.
// render-only scope (handlers main.ts 잔류).
//
// AC9 4-layer security defense in depth:
//   (a) user content escapeHtml — block.content / tb.content / item.label /
//       countLabel.
//   (b) **id + subjectId attribute escape (slice-2f/iii 신규 closure)** —
//       note.id / tb.id / cl.id / item.id / subjectId 모든 attribute
//       interpolation. main.ts 의 pre-existing unescape 패턴 폐기, 새
//       module single source of truth.
//   (c) EraserShape bounded — `"circle"|"square"|"triangle"|"line"`.
//   (d) PII no-logging — console / RUM / Datadog import 0.

import { escapeHtml } from "../app/escape-html.ts";
import type {
  PdfChecklist,
  PdfTextBox,
  StickyNoteBlockKind,
  SubjectPdfWorkspace
} from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

export type EraserShape = "circle" | "square" | "triangle" | "line";

// ─── Public exports — render ─────────────────────────────────────────────

export function formatStickyBlockKind(kind: StickyNoteBlockKind): string {
  const labels: Record<StickyNoteBlockKind, string> = {
    text: "텍스트",
    checklist: "체크",
    table: "표",
    "chart-note": "그래프"
  };

  return labels[kind];
}

export function renderStickyNote(
  subjectId: string,
  note: SubjectPdfWorkspace["stickyNotes"][number]
): string {
  const block = note.blocks[0];

  if (!block) {
    return "";
  }

  const noteId = escapeHtml(note.id);
  const safeSubjectId = escapeHtml(subjectId);

  return `
    <article
      class="sticky-note"
      style="left: ${note.anchor.x * 100}%; top: ${note.anchor.y * 100}%;"
      data-note-id="${noteId}"
    >
      <div
        class="sticky-note-header"
        data-action="sticky-drag-handle"
        data-note-id="${noteId}"
        role="button"
        aria-label="포스트잇 이동"
      >
        <span>${escapeHtml(formatStickyBlockKind(block.kind))}</span>
        <button
          type="button"
          aria-label="포스트잇 삭제"
          data-action="delete-sticky-note"
          data-subject-id="${safeSubjectId}"
          data-note-id="${noteId}"
        >
          ×
        </button>
      </div>
      <textarea
        data-action="update-sticky-note"
        data-subject-id="${safeSubjectId}"
        data-note-id="${noteId}"
      >${escapeHtml(block.content)}</textarea>
    </article>
  `;
}

export function renderTextBox(subjectId: string, tb: PdfTextBox): string {
  const tbId = escapeHtml(tb.id);
  const safeSubjectId = escapeHtml(subjectId);

  return `
    <article
      class="pdf-textbox is-inline"
      style="left: ${tb.position.x * 100}%; top: ${tb.position.y * 100}%;"
      data-textbox-id="${tbId}"
      role="group"
      aria-label="텍스트 박스"
    >
      <span
        class="pdf-textbox-grip"
        data-action="drag-textbox-handle"
        data-textbox-id="${tbId}"
        aria-label="텍스트 박스 이동"
        role="button"
        tabindex="0"
      >⋮⋮</span>
      <textarea
        class="pdf-textbox-inline-input"
        data-action="update-textbox-content"
        data-subject-id="${safeSubjectId}"
        data-textbox-id="${tbId}"
        placeholder="텍스트"
        rows="1"
      >${escapeHtml(tb.content)}</textarea>
      <button
        type="button"
        class="pdf-textbox-delete"
        aria-label="텍스트 박스 삭제"
        data-action="delete-textbox"
        data-subject-id="${safeSubjectId}"
        data-textbox-id="${tbId}"
      >×</button>
    </article>
  `;
}

export function renderChecklist(subjectId: string, cl: PdfChecklist): string {
  const isCollapsed = cl.collapsed !== false;
  const checkedCount = cl.items.filter((item) => item.checked).length;
  const totalCount = cl.items.length;
  const countLabel = isCollapsed ? ` (${checkedCount}/${totalCount})` : "";
  const toggleArrow = isCollapsed ? "▶" : "▼";

  const clId = escapeHtml(cl.id);
  const safeSubjectId = escapeHtml(subjectId);
  const itemsContainerId = `pdf-checklist-items-${clId}`;

  const itemsHtml = cl.items.map((item) => {
    const itemId = escapeHtml(item.id);
    return `
    <li class="pdf-checklist-item" data-item-id="${itemId}">
      <input
        type="checkbox"
        data-action="toggle-checklist-item"
        data-subject-id="${safeSubjectId}"
        data-checklist-id="${clId}"
        data-item-id="${itemId}"
        ${item.checked ? "checked" : ""}
      />
      <input
        type="text"
        class="pdf-checklist-item-label"
        data-action="update-checklist-item-label"
        data-subject-id="${safeSubjectId}"
        data-checklist-id="${clId}"
        data-item-id="${itemId}"
        value="${escapeHtml(item.label)}"
        placeholder="항목 이름"
        maxlength="500"
      />
      <button
        type="button"
        class="pdf-checklist-item-delete"
        data-action="delete-checklist-item"
        data-subject-id="${safeSubjectId}"
        data-checklist-id="${clId}"
        data-item-id="${itemId}"
        aria-label="항목 삭제"
      >✕</button>
    </li>
  `;
  }).join("");

  return `
    <div
      class="pdf-checklist${isCollapsed ? " is-collapsed" : ""}"
      data-checklist-id="${clId}"
      style="left: ${cl.position.x * 100}%; top: ${cl.position.y * 100}%;"
    >
      <div
        class="pdf-checklist-header"
        data-action="checklist-drag-handle"
        data-checklist-id="${clId}"
        aria-label="체크리스트 이동"
        role="button"
        tabindex="0"
      >
        <button
          type="button"
          class="pdf-checklist-toggle"
          data-action="toggle-checklist-collapsed"
          data-subject-id="${safeSubjectId}"
          data-checklist-id="${clId}"
          aria-expanded="${isCollapsed ? "false" : "true"}"
          aria-controls="${itemsContainerId}"
          aria-label="${isCollapsed ? "체크리스트 펼치기" : "체크리스트 접기"}"
        >${toggleArrow}</button>
        <span class="pdf-checklist-title">체크리스트${escapeHtml(countLabel)}</span>
        <button
          type="button"
          class="pdf-checklist-delete"
          data-action="delete-checklist"
          data-subject-id="${safeSubjectId}"
          data-checklist-id="${clId}"
          aria-label="체크리스트 삭제"
        >✕</button>
      </div>
      <ul class="pdf-checklist-items" id="${itemsContainerId}">
        ${itemsHtml}
      </ul>
      <button
        type="button"
        class="pdf-checklist-add-item"
        data-action="add-checklist-item"
        data-subject-id="${safeSubjectId}"
        data-checklist-id="${clId}"
      >+ 항목 추가</button>
    </div>
  `;
}

// ─── Eraser cursor + toolbar ─────────────────────────────────────────────

export function renderEraserSubToolbar(
  subjectId: string,
  eraserShape: EraserShape,
  eraserSize: number,
  disabled: string
): string {
  const safeSubjectId = escapeHtml(subjectId);

  return `
    <div class="pdf-eraser-subtoolbar" aria-label="지우개 설정">
      <div class="pdf-eraser-shape-picker" role="group" aria-label="지우개 모양">
        ${renderEraserShapeButton(subjectId, "circle", eraserShape, "원", "원형 지우개", disabled)}
        ${renderEraserShapeButton(subjectId, "square", eraserShape, "네모", "네모 지우개", disabled)}
        ${renderEraserShapeButton(subjectId, "triangle", eraserShape, "세모", "세모 지우개", disabled)}
        ${renderEraserShapeButton(subjectId, "line", eraserShape, "선", "선 지우개", disabled)}
      </div>
      <label class="pdf-eraser-size-control">
        <span>지우개 크기: ${Math.round(eraserSize)}px</span>
        <input
          type="range"
          min="16"
          max="64"
          value="${Math.round(eraserSize)}"
          data-action="set-eraser-size"
          data-subject-id="${safeSubjectId}"
          ${disabled}
        />
      </label>
    </div>
  `;
}

export function renderEraserShapeButton(
  subjectId: string,
  shape: EraserShape,
  selectedShape: EraserShape,
  label: string,
  ariaLabel: string,
  disabled: string
): string {
  const safeSubjectId = escapeHtml(subjectId);

  return `
    <button
      class="eraser-shape-button ${selectedShape === shape ? "active" : ""}"
      type="button"
      data-action="set-eraser-shape"
      data-subject-id="${safeSubjectId}"
      data-eraser-shape="${shape}"
      aria-label="${ariaLabel}"
      aria-pressed="${selectedShape === shape ? "true" : "false"}"
      ${disabled}
    >
      ${label}
    </button>
  `;
}

export function renderEraserCursorStyle(shape: EraserShape, size: number): string {
  const safeSize = Number.isFinite(size) ? Math.min(64, Math.max(16, size)) : 16;
  const viewBoxSize = safeSize + 2;
  const center = viewBoxSize / 2;
  const svg = renderEraserCursorSvg(shape, safeSize, viewBoxSize, center);
  const dataUrl = encodeURIComponent(svg);

  return `cursor: url('data:image/svg+xml,${dataUrl}') ${center} ${center}, crosshair;`;
}

export function renderEraserCursorSvg(
  shape: EraserShape,
  size: number,
  viewBoxSize: number,
  center: number
): string {
  const half = size / 2;
  const stroke = 1.5;
  const common = `fill="none" stroke="black" stroke-width="${stroke}"`;

  if (shape === "circle") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"><circle cx="${center}" cy="${center}" r="${half}" ${common}/></svg>`;
  }

  if (shape === "square") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"><rect x="${center - half}" y="${center - half}" width="${size}" height="${size}" ${common}/></svg>`;
  }

  if (shape === "triangle") {
    const height = size * Math.sqrt(3) / 2;
    const p1 = `${center},${center - height * 2 / 3}`;
    const p2 = `${center - half},${center + height / 3}`;
    const p3 = `${center + half},${center + height / 3}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" overflow="visible"><polygon points="${p1} ${p2} ${p3}" ${common}/></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"><line x1="${center - half}" y1="${center + half}" x2="${center + half}" y2="${center - half}" ${common} stroke-linecap="round"/><circle cx="${center}" cy="${center}" r="2" fill="black"/></svg>`;
}
