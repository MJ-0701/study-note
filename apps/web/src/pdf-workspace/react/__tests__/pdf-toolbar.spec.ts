// S1a/WU2b — <PdfToolbar> 구조 동등성 + registry action + R2b(data-action 부재) 검증.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/pdf-workspace/react/__tests__/pdf-toolbar.spec.ts
//
// 주의: tsconfig 가 spec 파일을 exclude 하므로 `pnpm exec tsc --noEmit` 은
// 본 파일을 검사하지 않는다.
//
// tsx 파일 import 전략: stripTypeScriptTypes(mode:"strip") + shortCircuit 로더.
// PdfToolbar.tsx 는 React.createElement 만 사용 (JSX 문법 0) — 로더가 type
// annotation 만 제거하면 유효한 ESM 이 된다.
//
// store 격리 전략: PdfToolbar 는 순수 프레젠테이션 컴포넌트(workspaceState prop
// 주입). 별도 store 구독 없으므로 module cache 분리 이슈 없음.
import { register } from "node:module";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

// tsx 파일 → stripTypeScriptTypes(mode:"strip") 로 변환하는 loader.
register(
  "data:text/javascript," + encodeURIComponent(`
    import { stripTypeScriptTypes } from "node:module";
    import { readFileSync } from "node:fs";
    import { fileURLToPath } from "node:url";

    export async function load(url, context, nextLoad) {
      if (!url.endsWith(".tsx")) return nextLoad(url, context);
      const path = fileURLToPath(url);
      const src = readFileSync(path, "utf-8");
      // type annotation 제거 (JSX 문법 없으므로 strip mode 안전).
      const stripped = stripTypeScriptTypes(src, { mode: "strip" });
      return { format: "module", shortCircuit: true, source: stripped };
    }
  `),
  import.meta.url
);

// ─── linkedom 전역 설정 ──────────────────────────────────────────────────────
// react-dom/server + linkedom: document/Node 등 DOM 전역이 필요.
// @ts-ignore
import { parseHTML, HTMLElement, Element, Node } from "linkedom";

const g = globalThis as Record<string, unknown>;
const { document: linkedomDoc } = parseHTML("<!doctype html><html><body></body></html>");
g["document"] = linkedomDoc;
g["HTMLElement"] = HTMLElement;
g["Element"] = Element;
g["Node"] = Node;

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// PdfToolbar.tsx 는 tsx loader 를 통해 import.
const { PdfToolbar } = await import("../PdfToolbar.tsx");

// ─── fixtures ────────────────────────────────────────────────────────────────

type WorkspaceState = {
  selectedTool: string;
  selectedPage: number;
  pageCount: number;
  eraserShape: string;
  eraserSize: number;
  hasMaterial: boolean;
};

function makeWorkspaceState(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    selectedTool: "read",
    selectedPage: 1,
    pageCount: 5,
    eraserShape: "circle",
    eraserSize: 16,
    hasMaterial: true,
    ...overrides
  };
}

// 최소 registry mock — 각 action 호출 여부 추적.
function makeMockRegistry(): {
  calls: Record<string, unknown[][]>;
  registry: {
    setTool: (subjectId: string, tool: string) => void;
    prevPage: (subjectId: string) => void;
    nextPage: (subjectId: string) => void;
    setPage: (subjectId: string, n: number) => void;
    setEraserShape: (subjectId: string, shape: string) => void;
    setEraserSize: (subjectId: string, size: number) => void;
    toggleFullscreen: () => void;
  };
} {
  const calls: Record<string, unknown[][]> = {
    setTool: [], prevPage: [], nextPage: [], setPage: [],
    setEraserShape: [], setEraserSize: [], toggleFullscreen: []
  };
  return {
    calls,
    registry: {
      setTool: (...args) => { calls.setTool!.push(args); },
      prevPage: (...args) => { calls.prevPage!.push(args); },
      nextPage: (...args) => { calls.nextPage!.push(args); },
      setPage: (...args) => { calls.setPage!.push(args); },
      setEraserShape: (...args) => { calls.setEraserShape!.push(args); },
      setEraserSize: (...args) => { calls.setEraserSize!.push(args); },
      toggleFullscreen: (...args) => { calls.toggleFullscreen!.push(args); }
    }
  };
}

function renderToolbar(
  subjectId: string,
  registry: ReturnType<typeof makeMockRegistry>["registry"],
  workspaceState: WorkspaceState
): string {
  return renderToStaticMarkup(
    React.createElement(PdfToolbar, { subjectId, registry, workspaceState })
  );
}

function parseHtml(html: string): typeof linkedomDoc.body {
  linkedomDoc.body.innerHTML = html;
  return linkedomDoc.body;
}

// ─── (a) 구조 동등성 — class/aria/버튼 집합/순서 ─────────────────────────────

describe("PdfToolbar — (a) 구조 동등성", () => {
  it("case 1: .pdf-toolbar 루트 요소 존재", () => {
    const html = renderToolbar("s1", makeMockRegistry().registry, makeWorkspaceState());
    const body = parseHtml(html);
    assert.equal(body.querySelectorAll(".pdf-toolbar").length, 1);
  });

  it("case 2: .pdf-page-controls 에 이전/페이지/다음 요소 3종 존재", () => {
    const html = renderToolbar("s1", makeMockRegistry().registry, makeWorkspaceState());
    const body = parseHtml(html);
    const controls = body.querySelector(".pdf-page-controls");
    assert.ok(controls !== null, ".pdf-page-controls 존재해야 함");
    assert.equal(controls.querySelectorAll("button").length, 2, "이전/다음 버튼 2개");
    assert.equal(controls.querySelectorAll("input[type='number']").length, 1, "페이지 input 1개");
  });

  it("case 3: 입력 도구 그룹 — read/sticky/pen/eraser 버튼 4종", () => {
    const html = renderToolbar("s1", makeMockRegistry().registry, makeWorkspaceState());
    const body = parseHtml(html);
    const inputGroup = body.querySelector('[aria-label="입력 도구"]');
    assert.ok(inputGroup !== null, "입력 도구 그룹 존재");
    assert.equal(inputGroup.querySelectorAll("button.tool-button").length, 4);
  });

  it("case 4: annotation 도구 그룹 — text/checklist/table/chart/star 버튼 5종", () => {
    const html = renderToolbar("s1", makeMockRegistry().registry, makeWorkspaceState());
    const body = parseHtml(html);
    const annotGroup = body.querySelector('[aria-label="annotation 도구"]');
    assert.ok(annotGroup !== null, "annotation 도구 그룹 존재");
    assert.equal(annotGroup.querySelectorAll("button.tool-button").length, 5);
  });

  it("case 5: 화면 전환 그룹 — fullscreen 버튼 1개", () => {
    const html = renderToolbar("s1", makeMockRegistry().registry, makeWorkspaceState());
    const body = parseHtml(html);
    const fsGroup = body.querySelector('[aria-label="화면 전환"]');
    assert.ok(fsGroup !== null, "화면 전환 그룹 존재");
    assert.equal(fsGroup.querySelectorAll("button.tool-button").length, 1);
  });

  it("case 6: 선택된 도구 버튼에 active class + aria-pressed=true", () => {
    const html = renderToolbar("s1", makeMockRegistry().registry, makeWorkspaceState({ selectedTool: "pen" }));
    const body = parseHtml(html);
    const activeButtons = body.querySelectorAll("button.tool-button.active") as Array<{
      getAttribute: (n: string) => string;
      querySelector: (s: string) => { textContent: string } | null;
    }>;
    assert.equal(activeButtons.length, 1, "active 버튼 1개만");
    const btn = activeButtons[0]!;
    assert.equal(btn.getAttribute("aria-pressed"), "true");
    const labelText = btn.querySelector(".tool-button__label")?.textContent ?? "";
    assert.ok(labelText.includes("펜"), `active 버튼 label = '${labelText}' (should include '펜')`);
  });

  it("case 7: hotkey kbd 배지 — 도구별 올바른 key 존재", () => {
    const html = renderToolbar("s1", makeMockRegistry().registry, makeWorkspaceState());
    const body = parseHtml(html);
    const kbds = body.querySelectorAll("kbd.tool-button__key") as Array<{ textContent: string }>;
    const keyTexts = kbds.map(k => k.textContent.trim());
    for (const key of ["R", "S", "P", "E", "T", "C", "B", "G", "Y"]) {
      assert.ok(keyTexts.some(k => k === key), `hotkey '${key}' 존재해야 함. found: ${JSON.stringify(keyTexts)}`);
    }
  });
});

// ─── (b) R2b — data-action 속성 부재 ────────────────────────────────────────

describe("PdfToolbar — (b) R2b data-action 속성 부재", () => {
  it("case 8: 모든 버튼/input 에 data-action 속성 0 (이중처리 차단)", () => {
    const html = renderToolbar("s2", makeMockRegistry().registry, makeWorkspaceState({ selectedTool: "eraser" }));
    const body = parseHtml(html);
    const withDataAction = body.querySelectorAll("[data-action]");
    assert.equal(
      withDataAction.length,
      0,
      `data-action 속성이 있는 요소가 있으면 안 됨: ${withDataAction.length}개 발견`
    );
  });

  it("case 9: data-tool / data-subject-id / data-eraser-shape 속성도 0", () => {
    const html = renderToolbar("s2", makeMockRegistry().registry, makeWorkspaceState({ selectedTool: "eraser" }));
    const body = parseHtml(html);
    assert.equal(body.querySelectorAll("[data-tool]").length, 0, "data-tool 0");
    assert.equal(body.querySelectorAll("[data-subject-id]").length, 0, "data-subject-id 0");
    assert.equal(body.querySelectorAll("[data-eraser-shape]").length, 0, "data-eraser-shape 0");
  });
});

// ─── (c) 지우개 서브 툴바 ────────────────────────────────────────────────────

describe("PdfToolbar — (c) 지우개 서브 툴바", () => {
  it("case 10: eraser 선택 시 .pdf-eraser-subtoolbar 렌더", () => {
    const html = renderToolbar("s3", makeMockRegistry().registry, makeWorkspaceState({ selectedTool: "eraser", eraserShape: "square" }));
    const body = parseHtml(html);
    assert.equal(body.querySelectorAll(".pdf-eraser-subtoolbar").length, 1);
  });

  it("case 11: non-eraser 선택 시 .pdf-eraser-subtoolbar 미렌더", () => {
    const html = renderToolbar("s3", makeMockRegistry().registry, makeWorkspaceState({ selectedTool: "pen" }));
    const body = parseHtml(html);
    assert.equal(body.querySelectorAll(".pdf-eraser-subtoolbar").length, 0);
  });

  it("case 12: 지우개 모양 버튼 4종 + 선택 모양 active", () => {
    const html = renderToolbar("s3", makeMockRegistry().registry, makeWorkspaceState({ selectedTool: "eraser", eraserShape: "triangle" }));
    const body = parseHtml(html);
    const shapePicker = body.querySelector(".pdf-eraser-shape-picker");
    assert.ok(shapePicker !== null, ".pdf-eraser-shape-picker 존재");
    assert.equal(shapePicker.querySelectorAll("button.eraser-shape-button").length, 4);
    const activeShape = shapePicker.querySelectorAll("button.eraser-shape-button.active");
    assert.equal(activeShape.length, 1, "active shape 버튼 1개");
  });
});

// ─── (d) disabled 상태 (material 없음) ───────────────────────────────────────

describe("PdfToolbar — (d) disabled (hasMaterial=false)", () => {
  it("case 13: material 없으면 page-controls input 이 disabled", () => {
    const html = renderToolbar("s4", makeMockRegistry().registry, makeWorkspaceState({ hasMaterial: false }));
    const body = parseHtml(html);
    const pageInput = body.querySelector("input[type='number']") as { hasAttribute: (n: string) => boolean } | null;
    assert.ok(pageInput !== null, "페이지 input 존재");
    assert.equal(pageInput.hasAttribute("disabled"), true, "disabled 속성 있어야 함");
  });
});
