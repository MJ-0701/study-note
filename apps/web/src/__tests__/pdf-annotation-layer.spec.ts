// PDF annotation layer regression tests.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-annotation-layer.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const mainTs = readFileSync(new URL("../main.ts", import.meta.url), "utf8");

function getCssRuleBlock(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));

  assert.ok(match, `expected ${selector} rule to exist`);

  return match[1] ?? "";
}

describe("PDF annotation layer page stickiness", () => {
  it("keeps the native PDF frame inert so it cannot scroll away from annotations", () => {
    const frameBlock = getCssRuleBlock(".pdf-frame");

    assert.match(frameBlock, /pointer-events:\s*none;/);
  });

  it("keeps preloaded PDF pages painted behind the active page", () => {
    const frameBlock = getCssRuleBlock(".pdf-frame");
    const activeBlock = getCssRuleBlock(".pdf-frame.is-active");
    const preloadBlock = getCssRuleBlock(".pdf-frame.is-preload");

    assert.match(frameBlock, /opacity:\s*0;/);
    assert.match(frameBlock, /transition:\s*opacity\s+0\.08s\s+ease-out;/);
    assert.match(activeBlock, /opacity:\s*1;/);
    assert.match(activeBlock, /z-index:\s*1;/);
    assert.match(preloadBlock, /opacity:\s*1;/);
    assert.match(preloadBlock, /z-index:\s*0;/);
  });

  it("keeps read mode surface as the pointer target for page-bound annotations", () => {
    const readModeBlock = getCssRuleBlock(".pdf-annotation-surface.is-read-mode");

    assert.match(readModeBlock, /pointer-events:\s*auto;/);
    assert.doesNotMatch(readModeBlock, /pointer-events:\s*none;/);
  });

  it("keys PDF frames by material and page so adjacent pages can be reused", () => {
    assert.match(mainTs, /getNodeKey/);
    assert.match(mainTs, /function shouldReplacePdfFrame/);
    assert.match(mainTs, /function getPdfFramePages/);
    assert.match(mainTs, /loadedPdfFrameKeys/);
    assert.match(mainTs, /PDF_FRAME_READY_DELAY_MS/);
    assert.match(mainTs, /pdfFrameReadyTimers/);
    assert.match(mainTs, /pendingPdfPageTransition/);
    assert.match(mainTs, /function handleDocumentLoad/);
    assert.match(mainTs, /function completePendingPdfPageTransition/);
    assert.match(mainTs, /function requestPdfPage/);
    // sprint-W21-sprint-4/S1: native iframe (`<iframe src="*.pdf#page=N">`) 가
    // iOS Safari `#page` fragment 무시 + Android Chrome native viewer 부재 →
    // pdfjs-dist canvas mount placeholder `<div data-pdf-mount="true">` 로 교체.
    assert.match(mainTs, /data-pdf-mount="true"/);
    assert.match(mainTs, /data-pdf-frame-key="\$\{escapeHtml\(frameKey\)\}"/);
    assert.match(mainTs, /data-page-number="\$\{pageNumber\}"/);
    assert.match(mainTs, /data-blob-url="\$\{escapeHtml\(objectUrl\)\}"/);
    assert.match(mainTs, /pages\.push\(selectedPage - 1\)/);
    assert.match(mainTs, /pages\.push\(selectedPage \+ 1\)/);
    assert.match(mainTs, /pages\.push\(pending\.fromPage, pending\.toPage\)/);
    assert.match(mainTs, /loadedPdfFrameKeys\.has\(frameKey\)/);
    assert.match(mainTs, /setTimeout\(\(\) => \{/);
    assert.match(mainTs, /setPdfPage\(pending\.subjectId, pending\.toPage\)/);
    assert.match(mainTs, /is-preload/);
    assert.match(mainTs, /fromEl\.replaceWith\(toEl\.cloneNode\(true\)\)/);
    // sprint-W21-sprint-4/S1: canvas mount lifecycle.
    assert.match(mainTs, /function applyPdfCanvasMounts/);
    assert.match(mainTs, /function shouldPreservePdfCanvasMount/);
    assert.match(mainTs, /function handleDocumentTouchEnd/);
    // sprint-W21-sprint-4/S1: pdfjs document cache lifecycle wire 검증.
    // clearActivePdfObjectUrl + revokeAllPdfObjectUrls 가 viewer module 의
    // clearPdfDocumentCache 를 lazy dispose. memory leak / AC6 resource cap.
    assert.match(mainTs, /async function disposePdfDocumentCache/);
    assert.match(mainTs, /disposePdfDocumentCache\(previousUrl\)/);
    assert.match(mainTs, /import\(["']\.\/pdf\/pdf-canvas-viewer["']\)/);
  });
});
