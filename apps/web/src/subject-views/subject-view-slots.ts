// S4a React island 마이그레이션 — subject view slot placeholder 생성 함수.
// home-intake.ts 의 renderHome/renderIntakeGuide 패턴을 미러.
// 각 함수는 morphdom-preserved slot placeholder 만 반환.
// 실 content = 각 IslandPortal (createPortal) 이 담당.
//
// stable id 필수 — morphdom getNodeKey(appShell.ts:62) = node.id.
// style="display:contents" — slot div 가 레이아웃에 영향 주지 않음.

/** subject-summaries route — slot placeholder. */
export function renderSubjectSummariesSlot(): string {
  return `<div id="subject-summaries-island" data-react-island="subject-summaries" style="display:contents"></div>`;
}

/** subject-summary-detail route — slot placeholder. */
export function renderSubjectSummaryDetailSlot(): string {
  return `<div id="subject-summary-detail-island" data-react-island="subject-summary-detail" style="display:contents"></div>`;
}

/** subject-mcp route — slot placeholder. */
export function renderSubjectMcpSlot(): string {
  return `<div id="subject-mcp-island" data-react-island="subject-mcp" style="display:contents"></div>`;
}

/** subject-memorize route — slot placeholder. */
export function renderSubjectMemorizeSlot(): string {
  return `<div id="subject-memorize-island" data-react-island="subject-memorize" style="display:contents"></div>`;
}
