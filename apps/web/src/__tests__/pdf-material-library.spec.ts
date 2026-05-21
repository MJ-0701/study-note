// PDF material library regression tests.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-material-library.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const mainTs = readFileSync(new URL("../main.ts", import.meta.url), "utf8");

function getFunctionBlock(name: string): string {
  const startToken = `function ${name}`;
  const startIndex = mainTs.indexOf(startToken);

  assert.notEqual(startIndex, -1, `expected ${name} to exist`);

  const nextFunctionIndex = mainTs.indexOf("\nfunction ", startIndex + startToken.length);
  return mainTs.slice(startIndex, nextFunctionIndex === -1 ? undefined : nextFunctionIndex);
}

function getCssRuleBlock(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));

  assert.ok(match, `expected ${selector} rule to exist`);

  return match[1] ?? "";
}

describe("PDF material library UI", () => {
  it("renders a course-level PDF library instead of a single-subject upload view", () => {
    const indexBlock = getFunctionBlock("renderPdfWorkspaceIndex");
    const sectionBlock = getFunctionBlock("renderPdfSubjectLibrarySection");

    assert.match(indexBlock, /PDF 자료실/);
    assert.match(indexBlock, /수업자료 찾기/);
    assert.match(indexBlock, /등록 자료/);
    assert.match(indexBlock, /과목별 PDF/);
    assert.match(indexBlock, /renderPdfSubjectLibrarySection/);
    assert.match(sectionBlock, /pdf-material-slider/);
    assert.match(sectionBlock, /renderPdfLibraryUploadCard\(subject, materials\.length\)/);
  });

  it("lets admins upload a new PDF directly from each subject library section", () => {
    const sectionBlock = getFunctionBlock("renderPdfSubjectLibrarySection");
    const uploadCardBlock = getFunctionBlock("renderPdfLibraryUploadCard");

    assert.match(sectionBlock, /renderPdfLibraryUploadCard\(subject, materials\.length\)/);
    assert.match(uploadCardBlock, /pdf-library-upload-\$\{subject\.id\}/);
    assert.match(uploadCardBlock, /data-action="import-pdf-material"/);
    assert.match(uploadCardBlock, /data-subject-id="\$\{escapeHtml\(subject\.id\)\}"/);
    assert.match(uploadCardBlock, /새 PDF 업로드/);
    assert.match(uploadCardBlock, /수업 자료 추가/);
    assert.match(uploadCardBlock, /PDF 업로드는 관리자만 가능합니다/);
  });

  it("uses material cards with shared-source labels and an explicit open action", () => {
    const cardBlock = getFunctionBlock("renderPdfMaterialCard");
    const ownerLabelBlock = getFunctionBlock("getPdfMaterialOwnerLabel");
    const statusLabelBlock = getFunctionBlock("getPdfMaterialStatusLabel");

    assert.match(cardBlock, /pdf-material-card/);
    assert.match(cardBlock, /data-action="open-pdf-material"/);
    assert.match(cardBlock, /data-subject-id="\$\{escapeHtml\(subject\.id\)\}"/);
    assert.match(cardBlock, /data-material-id="\$\{escapeHtml\(materialKey\)\}"/);
    assert.match(cardBlock, /현재 열림/);
    assert.match(cardBlock, /다시 열기/);
    assert.match(cardBlock, /열기/);
    assert.match(cardBlock, /getPdfMaterialClassDateLabel\(subject, material\)/);
    assert.match(cardBlock, /renderPdfMaterialClassDateControl\(subject, material, materialKey\)/);
    assert.match(mainTs, /data-action="assign-pdf-class-date"/);
    assert.match(cardBlock, /나중에 수정/);
    assert.match(ownerLabelBlock, /공유 자료/);
    assert.match(statusLabelBlock, /공유 가능/);
  });

  it("routes card open clicks to the selected PDF material workspace", () => {
    const clickBlock = mainTs.slice(
      mainTs.indexOf('quickNoteButton?.dataset.action === "open-pdf-material"'),
      mainTs.indexOf('quickNoteButton?.dataset.action === "clear-quick-note"')
    );

    assert.match(clickBlock, /const subjectId = quickNoteButton\.dataset\.subjectId;/);
    assert.match(clickBlock, /const materialId = quickNoteButton\.dataset\.materialId;/);
    assert.match(clickBlock, /selectPdfWorkspaceMaterial\(subject\.id, materialId\)/);
    assert.match(clickBlock, /event\.preventDefault\(\);/);
    assert.match(clickBlock, /const targetHash = subjectPdfWorkspacePath\(subject\);/);
    assert.match(clickBlock, /renderApp\(\);/);
    assert.match(clickBlock, /window\.location\.hash = targetHash;/);
  });

  it("keeps students in shared-material read mode while master/admin can upload", () => {
    const workspaceBlock = getFunctionBlock("renderPdfWorkspacePage");
    const canManageBlock = getFunctionBlock("canManagePdfMaterials");

    assert.match(workspaceBlock, /강의 PDF 업로드/);
    assert.match(workspaceBlock, /공유 자료/);
    assert.match(workspaceBlock, /PDF 업로드는 관리자에게 맡기고/);
    assert.match(workspaceBlock, /업로드는 관리자만 가능합니다\./);
    assert.match(workspaceBlock, /등록된 자료는 아래 목록에서 바로 열 수 있습니다\./);
    assert.match(workspaceBlock, /renderSubjectPdfMaterialBrowser/);
    assert.match(canManageBlock, /role === "master" \|\| role === "admin"/);
  });

  it("keeps upload open for additional PDFs without auto-mapping lecture dates", () => {
    const workspaceBlock = getFunctionBlock("renderPdfWorkspacePage");

    assert.match(mainTs, /const PDF_MATERIAL_UNASSIGNED_CLASS_DATE = "metadata-pending";/);
    assert.match(mainTs, /classDate:\s*PDF_MATERIAL_UNASSIGNED_CLASS_DATE/);
    assert.doesNotMatch(mainTs, /classDate:\s*getPdfMaterialClassDate\(subjectId\)/);
    assert.match(workspaceBlock, /강의 PDF 추가 업로드/);
    assert.match(workspaceBlock, /PDF를 계속 추가할 수 있습니다/);
    assert.match(workspaceBlock, /날짜와 수업일은 자동으로 정하지 않습니다/);
    assert.match(workspaceBlock, /새 파일을 선택하면 같은 과목 자료에 추가됩니다/);
  });

  it("normalizes unconfirmed class dates instead of showing inferred first-week values", () => {
    const labelBlock = getFunctionBlock("getPdfMaterialClassDateLabel");
    const unconfirmedBlock = getFunctionBlock("isUnconfirmedPdfClassDate");

    assert.match(labelBlock, /수업일 미지정/);
    assert.match(unconfirmedBlock, /trimmed === PDF_MATERIAL_UNASSIGNED_CLASS_DATE/);
    assert.match(unconfirmedBlock, /trimmed === "수업일 미지정"/);
    assert.match(unconfirmedBlock, /!subject\.weekNotes\.some/);
  });

  it("maps uploaded PDF materials to the shared-available status label", () => {
    const statusLabelBlock = getFunctionBlock("getPdfMaterialStatusLabel");
    const uploadedBranch = statusLabelBlock.slice(
      statusLabelBlock.indexOf('material.uploadStatus === "uploaded"')
    );

    assert.match(uploadedBranch, /material\.uploadStatus === "uploaded"/);
    assert.match(uploadedBranch, /return "공유 가능";/);
  });

  it("keeps the material library responsive on phone-width screens", () => {
    const cardBlock = getCssRuleBlock(".pdf-material-card");
    const sliderBlock = getCssRuleBlock(".pdf-material-slider");
    const summaryBlock = getCssRuleBlock(".pdf-library-summary");
    const mobileBlock = css.slice(css.indexOf("@media (max-width: 820px)"));

    assert.match(summaryBlock, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
    assert.match(sliderBlock, /overflow-x:\s*auto;/);
    assert.match(sliderBlock, /scroll-snap-type:\s*x\s+mandatory;/);
    assert.match(cardBlock, /flex:\s*0\s+0\s+min\(82vw,\s*360px\);/);
    assert.match(cardBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto;/);
    assert.match(css, /\.subject-sidebar-depth__link/);
    assert.match(css, /\.class-day-grid/);
    assert.match(css, /\.class-date-form \.action-button/);
    assert.match(css, /\.class-day-card__pdfs/);
    assert.match(mobileBlock, /\.subject-heading,\s*\n\s*\.week-note-grid,/);
    assert.match(mobileBlock, /\.class-day-grid,\s*\n\s*\.pdf-library-summary,/);
    assert.match(mobileBlock, /\.class-date-form\s*\{\s*\n\s*grid-template-columns:\s*1fr;/m);
    assert.match(mobileBlock, /grid-template-columns:\s*1fr;/);
    assert.match(mobileBlock, /\.pdf-material-card__actions \.action-button\s*\{\s*width:\s*100%;/m);
  });

  it("routes each subject through sidebar-owned class, summaries, MCP, and memorize screens", () => {
    const routeBlock = getFunctionBlock("parseRoute");
    const renderAppBlock = getFunctionBlock("renderApp");
    const sidebarBlock = getFunctionBlock("renderSubjectSidebar");
    const depthBlock = getFunctionBlock("renderCurrentSubjectDepthNav");
    const classBlock = getFunctionBlock("renderSubjectClassPage");
    const summariesBlock = getFunctionBlock("renderSubjectSummariesPage");
    const summaryDetailBlock = getFunctionBlock("renderWeekSummaryPage");
    const memorizeBlock = getFunctionBlock("renderSubjectMemorizePage");
    const mcpPageBlock = getFunctionBlock("renderSubjectMcpPage");
    const mcpPanelBlock = getFunctionBlock("renderSubjectMcpPanel");

    assert.match(routeBlock, /parts\[2\] === "class"/);
    assert.match(routeBlock, /name: "subject-class"/);
    assert.match(routeBlock, /parts\[2\] === "summaries"/);
    assert.match(routeBlock, /name: "subject-summaries"/);
    assert.match(routeBlock, /name: "subject-summary-detail"/);
    assert.match(routeBlock, /parts\[2\] === "mcp"/);
    assert.match(routeBlock, /name: "subject-mcp"/);
    assert.match(routeBlock, /parts\[2\] === "memorize"/);
    assert.match(routeBlock, /name: "subject-memorize"/);
    assert.match(renderAppBlock, /route\.name === "subject" \|\|\s*\n\s*route\.name === "subject-class"/);
    assert.match(renderAppBlock, /renderSubjectClassPage\(subject\)/);
    assert.match(renderAppBlock, /renderSubjectSummariesPage\(subject\)/);
    assert.match(renderAppBlock, /renderWeekSummaryPage\(subject, week\)/);
    assert.match(renderAppBlock, /renderSubjectMcpPage\(subject\)/);
    assert.match(renderAppBlock, /renderSubjectMemorizePage\(subject\)/);
    assert.match(sidebarBlock, /renderSubjectNavItem/);
    assert.match(depthBlock, /subject-sidebar-depth/);
    assert.match(depthBlock, /subjectClassPath\(subject\)/);
    assert.match(depthBlock, />수업<\/a>/);
    assert.match(depthBlock, /subjectSummaryPath\(subject\)/);
    assert.match(depthBlock, />요약본<\/a>/);
    assert.match(depthBlock, /subjectMcpPath\(subject\)/);
    assert.match(depthBlock, />MCP 호출<\/a>/);
    assert.match(depthBlock, /subjectMemorizePath\(subject\)/);
    assert.match(depthBlock, />필수 암기노트<\/a>/);
    assert.doesNotMatch(sidebarBlock, /subject-week-details/);
    assert.match(classBlock, /renderClassDateAddSection\(subject\)/);
    assert.match(classBlock, /renderClassDayCard/);
    assert.match(classBlock, /renderPdfMaterialAssignmentSection\(subject, subjectMaterials\)/);
    assert.match(mainTs, /function renderClassDayPdfLinks/);
    assert.match(mainTs, /data-action="open-pdf-material"/);
    assert.match(mainTs, /연결 PDF/);
    assert.match(summariesBlock, /수업일별 요약 목록/);
    assert.match(summariesBlock, /renderSummaryDayCard\(subject, week\)/);
    assert.match(summaryDetailBlock, /이 날짜 요약 만들기/);
    assert.match(memorizeBlock, /필수 암기노트/);
    assert.match(memorizeBlock, /반드시 외울 개념/);
    assert.match(mcpPageBlock, /<h1>\$\{subject\.title\} MCP 호출<\/h1>/);
    assert.match(mcpPageBlock, /persona-turn\.html\?subject=/);
    assert.match(mcpPageBlock, /질문거리 점검/);
    assert.match(mcpPanelBlock, /교수님 페르소나에게 질문하기/);
    assert.match(css, /\.subject-mcp-callout/);
    assert.doesNotMatch(mainTs, /function renderSubjectLearningFlow/);
    assert.doesNotMatch(mainTs, /subject-learning-flow/);
    assert.doesNotMatch(css, /\.subject-learning-flow/);
    assert.doesNotMatch(css, /\.subject-flow-card/);
  });

  it("supports adding class dates and updating PDF classDate through API", () => {
    const submitBlock = getFunctionBlock("handleDocumentSubmit");
    const addDateBlock = getFunctionBlock("addSubjectClassDate");
    const assignBlock = getFunctionBlock("assignPdfMaterialClassDate");
    const apiTs = readFileSync(new URL("../api/materials.ts", import.meta.url), "utf8");

    assert.match(submitBlock, /action === "add-class-date"/);
    assert.match(addDateBlock, /const newWeek: WeekNote/);
    assert.match(addDateBlock, /saveNotebook\(notebook\)/);
    assert.match(assignBlock, /updatePdfMaterialMetadata\(apiBaseUrl, material\.backendMaterialId/);
    assert.match(apiTs, /export async function updatePdfMaterialMetadata/);
    assert.match(apiTs, /method: "PATCH"/);
    assert.match(apiTs, /classDate: string/);
  });
});
