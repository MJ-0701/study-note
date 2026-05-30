// sprint-2026-W22-sprint-8 / layer B/slice-2f/iv-bis — renderPdfWorkspacePage 본체 추출.
// PDF workspace 의 최상위 container (slice-2f/iv 의 page-render helper 와 결합 → layer B closure).
//
// invariant (AC9 5-layer security closure):
//   (a) user content escape — subject.title 모든 interpolation site escape.
//   (b) id/attribute escape — subject.id / materialId / page number attribute.
//   (c) trusted-input bounded — LocalPdfTool / EraserShape union allowlist.
//   (d) PII no-logging — console / RUM / datadog import 0.
//   (e) permission denylist — canManage=false 시 upload UI element 부재 보장.

import {
  getSubjectPdfWorkspace,
  type PdfChart,
  type PdfChecklist,
  type PdfInkStroke,
  type PdfMaterialDraft,
  type PdfStarMark,
  type PdfTable,
  type PdfTextBox,
  type PdfWorkspaceStore,
  type SubjectNote
} from "@study-note/domain";
import { escapeHtml } from "../app/escape-html";
import { subjectClassPath } from "../app/routes";
import {
  getPdfPreviewPlaceholderDetail,
  getPdfPreviewPlaceholderTitle,
  renderPdfFrameStack,
  renderPdfMaterialStatus,
  type LocalPdfTool,
  type PdfToolbarContext
} from "./page-render";
import { renderInspectorStatRow } from "./drill-highlight";
import { formatSvgPoint } from "./ink-stroke";
import {
  renderChecklist,
  renderEraserCursorStyle,
  renderStickyNote,
  renderTextBox
} from "./simple-widget";
import { getPdfMaterialKey } from "./workspace-store";
import { renderChartMount } from "./chart-widget";
import { renderTableMount } from "./table-widget";
import { renderStarMark } from "./star-mark";

// ─── Public types ────────────────────────────────────────────────────────

export interface WorkspacePageContext {
  // bucket-2 lazy module-state getter (snapshot 금지 — render time 평가).
  // 정확히 8 field — main.ts 의 모듈 상태에만 의존하는 surface.
  getWorkspaceStore: () => PdfWorkspaceStore;
  getInspectorOpen: () => boolean;
  hasIntakeFeedback: () => boolean;
  getActivePdfObjectUrl: (subjectId: string) => string | undefined;
  getActivePdfObjectUrlMaterialId: (subjectId: string) => string | undefined;
  hasActivePdfPreviewLoad: (key: string) => boolean;
  getSubjectPdfMaterials: (subjectId: string) => PdfMaterialDraft[];
  canManagePdfMaterials: () => boolean;
  // bucket-2 sub-context reference (1).
  pdfToolbarContext: PdfToolbarContext;
  // main.ts-defined render hooks (3) — main.ts module state 와 결합되어 직접 import 불가.
  renderIntakeFeedback: (message?: string) => string;
  renderSubjectPdfMaterialBrowser: (
    subject: SubjectNote,
    materials: PdfMaterialDraft[],
    currentKey: string | undefined
  ) => string;
  formatPdfTool: (tool: LocalPdfTool) => string;
}

// ─── Private helpers ─────────────────────────────────────────────────────

// renderInkStroke — workspace-page 전용 private helper.
// main.ts 5604 에서 이동 (sprint-W22-sprint-8). 다른 caller 없음.
// AC9(a): escape applied to stroke.id (attribute interpolation).
// AC9(c): color/width 는 PdfInkStroke domain type 의 number/string field
// — domain layer 가 sanitize (별도 모듈 책임).
function renderInkStroke(stroke: PdfInkStroke): string {
  return `
    <polyline
      class="ink-stroke"
      data-stroke-id="${escapeHtml(stroke.id)}"
      points="${stroke.points.map(formatSvgPoint).join(" ")}"
      style="stroke: ${stroke.color}; stroke-width: ${stroke.width};"
    />
  `;
}

// ─── Render ──────────────────────────────────────────────────────────────

export function renderPdfWorkspacePage(
  ctx: WorkspacePageContext,
  subject: SubjectNote
): string {
  const workspace = getSubjectPdfWorkspace(ctx.getWorkspaceStore(), subject.id);
  const material = workspace.material;
  const subjectMaterials = ctx.getSubjectPdfMaterials(subject.id);
  const materialCount = subjectMaterials.length;
  const currentMaterialKey = material ? getPdfMaterialKey(material) : undefined;
  const canManageMaterials = ctx.canManagePdfMaterials();
  const inspectorOpen = ctx.getInspectorOpen();
  const uploadTitle = canManageMaterials
    ? materialCount > 0
      ? "강의 PDF 추가 업로드"
      : "강의 PDF 업로드"
    : "공유 자료";
  const selectedPage = material?.selectedPage ?? 1;
  // Cast: "eraser" is stored via LocalPdfTool cast in setPdfTool; recover the wider type here.
  const selectedTool = (material?.selectedTool ?? "read") as LocalPdfTool;
  const objectUrl =
    material?.backendMaterialId &&
    ctx.getActivePdfObjectUrlMaterialId(subject.id) === material.backendMaterialId
      ? ctx.getActivePdfObjectUrl(subject.id)
      : undefined;
  const previewLoadKey = material?.backendMaterialId
    ? `${subject.id}:${material.backendMaterialId}`
    : undefined;
  const isPreviewLoading = previewLoadKey
    ? ctx.hasActivePdfPreviewLoad(previewLoadKey)
    : false;
  const pageNotes = workspace.stickyNotes.filter(
    (note) => note.pageNumber === selectedPage
  );
  const pageStrokes = workspace.inkStrokes.filter(
    (stroke) => stroke.pageNumber === selectedPage
  );
  const pageTextBoxes = workspace.textBoxes.filter(
    (tb) => tb.page === selectedPage
  );
  const pageChecklists = workspace.checklists.filter(
    (cl) => cl.page === selectedPage
  );
  const pageTables = workspace.tables.filter(
    (table) => table.page === selectedPage
  );
  const pageCharts = workspace.charts.filter(
    (chart) => chart.page === selectedPage
  );
  const pageStarMarks = (workspace.starMarks ?? []).filter(
    (mark) => mark.pageNumber === selectedPage
  );
  const inputId = `pdf-file-${subject.id}`;
  const selectedPageLabel = escapeHtml(String(selectedPage));
  const safeSubjectId = escapeHtml(subject.id);
  const safeSubjectTitle = escapeHtml(subject.title);
  // AC9(c) trusted-input bounded — LocalPdfTool union allowlist enforced via escapeHtml
  // on class name interpolation (attribute-context safe even if union breached).
  const safeSelectedTool = escapeHtml(selectedTool);

  return `
    <section class="subject-page-hero">
      <p class="meta">${safeSubjectTitle} · backend PDF 작업공간</p>
      <h1>${safeSubjectTitle} PDF 필기</h1>
      <p class="lede">
        관리자가 올린 공유 PDF를 열고, 내 필기와 메모는 사용자별 작업공간에 따로 저장합니다.
      </p>
      <p><a href="${escapeHtml(subjectClassPath(subject))}">← ${safeSubjectTitle} 수업으로 돌아가기</a></p>
    </section>

    <section class="upload-section pdf-upload-section" aria-labelledby="pdf-upload-title">
      <div>
        <p class="meta">§1 — 자료 관리</p>
        <h2 id="pdf-upload-title">${uploadTitle}</h2>
        <p class="lede">
          ${canManageMaterials
            ? "이미 등록된 자료가 있어도 PDF를 계속 추가할 수 있습니다. 수업일은 자동 배정하지 않고 업로드 후 수정 단계에서 지정합니다."
            : "PDF 업로드는 관리자에게 맡기고, 학생은 등록된 자료를 열어 개인 필기만 저장합니다."}
        </p>
      </div>
      <div class="upload-panel">
        ${canManageMaterials
          ? `<input
              id="${inputId}"
              class="file-input"
              type="file"
              accept="application/pdf,.pdf"
              data-action="import-pdf-material"
              data-subject-id="${safeSubjectId}"
            />
            <label class="file-drop" for="${inputId}">
              <strong>${safeSubjectTitle} PDF ${materialCount > 0 ? "추가 업로드" : "선택 및 업로드"}</strong>
              <span>날짜와 수업일은 자동으로 정하지 않습니다. 먼저 올리고 나중에 자료 정보에서 수정하세요.</span>
            </label>`
          : `<div class="policy-block is-standalone">
              <strong>업로드는 관리자만 가능합니다.</strong>
              <p>필요한 수업자료가 없으면 관리자에게 업로드를 요청하세요. 등록된 자료는 아래 목록에서 바로 열 수 있습니다.</p>
            </div>`}
        ${canManageMaterials
          ? `<div class="pdf-upload-hint">${materialCount > 0
              ? `현재 ${materialCount}개 자료가 등록되어 있습니다. 새 파일을 선택하면 같은 과목 자료에 추가됩니다.`
              : "첫 PDF를 올린 뒤에도 이 영역에서 계속 추가 업로드할 수 있습니다."}</div>`
          : ""}
        ${material ? renderPdfMaterialStatus(material, Boolean(objectUrl), isPreviewLoading) : ""}
        ${ctx.hasIntakeFeedback()
          ? ctx.renderIntakeFeedback("PDF 업로드 상태가 여기에 표시됩니다.")
          : `<div class="import-feedback">${materialCount > 0 ? "새 PDF를 선택하면 이 과목 자료 목록에 추가됩니다." : "아직 업로드한 PDF 파일이 없습니다."}</div>`}
      </div>
    </section>

    ${ctx.renderSubjectPdfMaterialBrowser(subject, subjectMaterials, currentMaterialKey)}

    <section class="pdf-workspace" id="pdf-workspace-root" aria-labelledby="pdf-workspace-title">
      ${objectUrl ? `
        <div class="pdf-page-binding-notice" role="note" aria-live="polite">
          <strong class="pdf-page-binding-notice__title">현재 페이지 ${selectedPageLabel}</strong>
          <span class="pdf-page-binding-notice__body">보이는 화면에 다른 페이지가 함께 나와도 메모/필기는 현재 페이지에만 저장됩니다. 다른 페이지에 메모하려면 페이지를 먼저 이동하세요.</span>
        </div>
      ` : ""}
      <div class="pdf-workspace-header">
        <div>
          <p class="meta">§3 — PDF viewer + annotation layer</p>
          <h2 id="pdf-workspace-title">페이지 ${selectedPage}${material ? ` / ${material.pageCount}` : ""}</h2>
        </div>
        <div class="pdf-toolbar-row">
          <div id="pdf-toolbar-island" data-react-island="pdf-toolbar"></div>
          <button
            class="pdf-inspector-toggle secondary-action"
            type="button"
            data-action="toggle-pdf-inspector"
            aria-expanded="${inspectorOpen ? "true" : "false"}"
            aria-controls="pdf-inspector-aside"
          >${inspectorOpen ? "검사기 닫기" : "검사기 열기"}</button>
        </div>
      </div>

      <div class="pdf-workspace-layout${inspectorOpen ? " is-inspector-open" : ""}">
        <div class="pdf-stage" aria-label="${safeSubjectTitle} PDF page annotation surface">
          ${
            objectUrl && material
              ? renderPdfFrameStack(subject, material, objectUrl, selectedPage)
              : `<div class="pdf-placeholder">
                  <strong>${getPdfPreviewPlaceholderTitle(Boolean(material), isPreviewLoading)}</strong>
                  <span>${getPdfPreviewPlaceholderDetail(Boolean(material), selectedPage)}</span>
                </div>`
          }
          <div
            class="pdf-annotation-surface is-${safeSelectedTool}-mode"
            ${selectedTool === "eraser" ? `style="${renderEraserCursorStyle(workspace.eraserShape, workspace.eraserSize)}"` : ""}
            data-pdf-annotation-surface="true"
            data-subject-id="${safeSubjectId}"
            data-page-number="${selectedPage}"
          >
            ${objectUrl ? `
              <div class="pdf-surface-page-badge" aria-hidden="true" data-current-page-badge="true">페이지 ${selectedPageLabel}</div>
              <div class="pdf-surface-page-end" aria-hidden="true">
                <span class="pdf-surface-page-end__label">↑ 페이지 ${selectedPageLabel} 영역 끝 — 그 아래는 다음 페이지 미리보기</span>
              </div>
            ` : ""}
            <svg class="ink-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true">
              ${pageStrokes.map(renderInkStroke).join("")}
            </svg>
            <svg class="ink-layer is-live-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true" data-live-ink-layer="true"></svg>
            ${pageNotes.map((note) => renderStickyNote(subject.id, note)).join("")}
            ${pageTextBoxes.map((tb: PdfTextBox) => renderTextBox(subject.id, tb)).join("")}
            ${pageChecklists.map((cl: PdfChecklist) => renderChecklist(subject.id, cl)).join("")}
            ${pageTables.map((table: PdfTable) => renderTableMount(subject.id, table)).join("")}
            ${pageCharts.map((chart: PdfChart) => renderChartMount(subject.id, chart)).join("")}
            ${pageStarMarks.map((mark: PdfStarMark) => renderStarMark(subject.id, mark)).join("")}
          </div>
        </div>

        <aside
          class="pdf-inspector${inspectorOpen ? "" : " pdf-inspector--collapsed"}"
          id="pdf-inspector-aside"
          aria-label="PDF annotation state"
          aria-hidden="${inspectorOpen ? "false" : "true"}"
        >
          <p class="meta">§4 — 저장 상태</p>
          <h3>로컬 annotation</h3>
          <dl class="pdf-inspector-stats">
            ${renderInspectorStatRow("sticky", "포스트잇", workspace.stickyNotes.length, workspace, subject.id)}
            ${renderInspectorStatRow("ink", "펜 stroke", workspace.inkStrokes.length, workspace, subject.id)}
            ${renderInspectorStatRow("textbox", "텍스트 박스", workspace.textBoxes.length, workspace, subject.id)}
            ${renderInspectorStatRow("checklist", "체크리스트", workspace.checklists.length, workspace, subject.id)}
            ${renderInspectorStatRow("table", "표", workspace.tables.length, workspace, subject.id)}
            ${renderInspectorStatRow("chart", "그래프", workspace.charts.length, workspace, subject.id)}
            <div class="pdf-inspector-stat-row pdf-inspector-stat-row--plain"><dt>현재 도구</dt><dd>${escapeHtml(String(ctx.formatPdfTool(selectedTool)))}</dd></div>
          </dl>
          <div class="policy-block is-standalone">
            <strong>PDF 원문은 backend material storage가 기준입니다.</strong>
            <p>이 화면은 직접 S3에 올리지 않고 backend proxy API로 업로드/다운로드합니다. 필기 데이터의 backend 동기화는 다음 sprint 후보입니다.</p>
          </div>
          <button class="secondary-action" type="button" data-action="clear-pdf-annotations" data-subject-id="${safeSubjectId}">
            메모/필기 전체 지우기
          </button>
        </aside>
      </div>
    </section>
  `;
}
