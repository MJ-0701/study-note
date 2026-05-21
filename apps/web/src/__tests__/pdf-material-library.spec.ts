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
    assert.match(unconfirmedBlock, /trimmed === subject\.weekNotes\[0\]\?\.label/);
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
    assert.match(mobileBlock, /\.subject-heading,\s*\n\s*\.week-note-grid,/);
    assert.match(mobileBlock, /\.pdf-library-summary,\s*\n\s*\.pdf-material-card,/);
    assert.match(mobileBlock, /grid-template-columns:\s*1fr;/);
    assert.match(mobileBlock, /\.pdf-material-card__actions \.action-button\s*\{\s*width:\s*100%;/m);
  });

  it("routes each subject through sidebar-owned class, summary, and MCP screens", () => {
    const routeBlock = getFunctionBlock("parseRoute");
    const renderAppBlock = getFunctionBlock("renderApp");
    const sidebarBlock = getFunctionBlock("renderSubjectSidebar");
    const classBlock = getFunctionBlock("renderSubjectClassPage");
    const summaryBlock = getFunctionBlock("renderSubjectSummaryPage");
    const mcpPageBlock = getFunctionBlock("renderSubjectMcpPage");
    const mcpPanelBlock = getFunctionBlock("renderSubjectMcpPanel");

    assert.match(routeBlock, /parts\[2\] === "class"/);
    assert.match(routeBlock, /name: "subject-class"/);
    assert.match(routeBlock, /parts\[2\] === "summary"/);
    assert.match(routeBlock, /name: "subject-summary"/);
    assert.match(routeBlock, /parts\[2\] === "mcp"/);
    assert.match(routeBlock, /name: "subject-mcp"/);
    assert.match(renderAppBlock, /route\.name === "subject" \|\|\s*\n\s*route\.name === "subject-class"/);
    assert.match(renderAppBlock, /renderSubjectClassPage\(subject\)/);
    assert.match(renderAppBlock, /renderSubjectSummaryPage\(subject\)/);
    assert.match(renderAppBlock, /renderSubjectMcpPage\(subject\)/);
    assert.match(sidebarBlock, /subject-sidebar-depth/);
    assert.match(sidebarBlock, /subjectClassPath\(subject\)/);
    assert.match(sidebarBlock, /<strong>수업<\/strong>/);
    assert.match(sidebarBlock, /subjectSummaryPath\(subject\)/);
    assert.match(sidebarBlock, /<strong>요약본<\/strong>/);
    assert.match(sidebarBlock, /subjectMcpPath\(subject\)/);
    assert.match(sidebarBlock, /<strong>MCP 호출<\/strong>/);
    assert.match(sidebarBlock, /route\.name === "subject-summary"/);
    assert.match(sidebarBlock, /route\.name === "subject-mcp"/);
    assert.match(classBlock, /renderPdfSubjectLibrarySection\(subject, subjectMaterials\)/);
    assert.match(classBlock, /PDF가 이미 있어도 새 자료를 계속 추가/);
    assert.match(classBlock, /수업일별 노트/);
    assert.match(summaryBlock, /<h1>\$\{subject\.title\} 요약본<\/h1>/);
    assert.match(summaryBlock, /generate-subject-note/);
    assert.match(summaryBlock, /교수님 키워드 반영 상태/);
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
});
