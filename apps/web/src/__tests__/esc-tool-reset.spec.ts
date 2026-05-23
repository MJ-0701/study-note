/**
 * esc-tool-reset.spec.ts — sprint-W21-sprint-1 / S5 / AC24 spec.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/__tests__/esc-tool-reset.spec.ts
 *
 * 검증 (AC21 priority + AC24 case 매핑):
 *  - (a) selectedTool="pen" + modal closed → "reset-tool"
 *  - (b) selectedTool="read" + modal closed → "passthrough"
 *  - (c) modal open + 어떤 tool 이든 → "close-modal" (tool 미변경)
 *  - (d) in-progress stroke + ESC → tool reset (commit/cancel 은 DOM side-effect
 *        이므로 본 unit spec 은 결정 함수만 검증; commit/cancel 헬퍼는
 *        main.ts:commitActiveInkStrokeOnEsc / cancelActiveDragsOnEsc 코드 회기.
 *        실제 commit 동작은 iPad/Chrome manual + Playwright smoke 대상).
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { resolveEscapeAction } from "../pdf-workspace/esc-action.ts";

describe("AC21 — ESC action priority (resolveEscapeAction)", () => {
  it("(c) modal open + tool=pen → close-modal (tool 미변경)", () => {
    const action = resolveEscapeAction({ modalOpen: true, selectedTool: "pen" });
    assert.equal(action, "close-modal");
  });

  it("(c) modal open + tool=read → close-modal", () => {
    const action = resolveEscapeAction({ modalOpen: true, selectedTool: "read" });
    assert.equal(action, "close-modal");
  });

  it("(a) modal closed + tool=pen → reset-tool", () => {
    const action = resolveEscapeAction({ modalOpen: false, selectedTool: "pen" });
    assert.equal(action, "reset-tool");
  });

  it("(a) modal closed + tool=sticky → reset-tool", () => {
    const action = resolveEscapeAction({ modalOpen: false, selectedTool: "sticky" });
    assert.equal(action, "reset-tool");
  });

  it("(a) modal closed + tool=text → reset-tool", () => {
    const action = resolveEscapeAction({ modalOpen: false, selectedTool: "text" });
    assert.equal(action, "reset-tool");
  });

  it("(a) modal closed + tool=eraser → reset-tool", () => {
    const action = resolveEscapeAction({ modalOpen: false, selectedTool: "eraser" });
    assert.equal(action, "reset-tool");
  });

  it("(b) modal closed + tool=read → passthrough (browser default 통과 = 전체화면 종료 가능)", () => {
    const action = resolveEscapeAction({ modalOpen: false, selectedTool: "read" });
    assert.equal(action, "passthrough");
  });

  it("priority: modal open ALWAYS wins over tool != read", () => {
    // hotkey help modal 이 열린 상태에선 도구 선택 여부와 무관하게 modal 우선.
    for (const tool of ["read", "pen", "sticky", "text", "eraser", "checklist", "table", "chart", "star"]) {
      assert.equal(
        resolveEscapeAction({ modalOpen: true, selectedTool: tool }),
        "close-modal",
        `tool=${tool} should resolve to close-modal when modal is open`
      );
    }
  });

  it("unknown tool 값도 read 가 아니면 reset-tool", () => {
    // 미래에 새 tool 이 추가되어도 회기 동작 보장 — read 가 아니면 reset.
    const action = resolveEscapeAction({ modalOpen: false, selectedTool: "futuristic-tool" });
    assert.equal(action, "reset-tool");
  });
});

describe("AC22 — main.ts ESC handler 가 commit/cancel 헬퍼를 호출하는지 회기 (source 검증)", () => {
  it("main.ts 의 reset-tool branch 가 commitActiveInkStrokeOnEsc + cancelActiveDragsOnEsc 를 호출", async () => {
    const { readFile } = await import("node:fs/promises");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = await readFile(resolve(__dirname, "../main.ts"), "utf-8");

    // reset-tool 분기 안 in-progress stroke commit 호출 회기.
    assert.ok(src.includes("commitActiveInkStrokeOnEsc()"), "main.ts must call commitActiveInkStrokeOnEsc() in reset-tool branch");
    assert.ok(src.includes("cancelActiveDragsOnEsc()"), "main.ts must call cancelActiveDragsOnEsc() in reset-tool branch");
    // PR #48 codex R1 P1: cancelActiveDragsOnEsc 가 모든 drag state 비우는지 source guard.
    const cancelBlockMatch = src.match(/function cancelActiveDragsOnEsc\(\)[\s\S]*?\n\}/);
    assert.ok(cancelBlockMatch, "cancelActiveDragsOnEsc function block must be findable");
    const cancelBlock = cancelBlockMatch[0];
    for (const dragVar of [
      "activeTextBoxDrag",
      "activeStickyDrag",
      "activeChecklistDrag",
      "activeTableDrag",
      "activeChartDrag",
      "activeEraserDrag"
    ]) {
      assert.ok(
        cancelBlock.includes(`${dragVar} = undefined`),
        `cancelActiveDragsOnEsc must clear ${dragVar} (PR #48 codex R1 P1)`
      );
    }
    // setPdfTool("read") 호출 후 renderApp.
    assert.ok(src.includes('setPdfTool(subjectId, "read")'), "main.ts must reset tool to 'read' on ESC");
    // preventDefault + stopPropagation 으로 browser default (fullscreen 종료) 차단.
    assert.ok(src.includes("event.preventDefault()") && src.includes("event.stopPropagation()"), "reset-tool branch must preventDefault + stopPropagation");
  });
});
