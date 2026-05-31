// S1a/WU2b — PDF 툴바 React 컴포넌트.
//
// renderPdfToolbar (page-render.ts) 의 HTML 출력을 1:1 복제.
// class/aria/버튼 순서/라벨/kbd 전부 동일 (시각·접근성 동일 보존).
//
// R2b 이중처리 차단: 모든 버튼/input 에 data-action/data-tool/data-subject-id/
// data-eraser-shape 속성을 emit 하지 않는다. legacy document click/input
// 위임이 매칭할 hook 이 없어야 이중 발화 0.
//
// fullscreen 반응성: native fullscreenchange 이벤트 구독 +
// document.fullscreenElement?.id === PDF_WORKSPACE_ROOT_ID 재평가.
// uiStore 에 lift 할 flag 없음 (§2b 정정).
//
// store 구독: PdfToolbarPortal 이 pdfWorkspaceStateStore 를 구독하고
// 필요한 상태를 props 로 주입한다. PdfToolbar 자체는 순수 프레젠테이션
// 컴포넌트 — 테스트 용이성 + 단일 책임 원칙.
//
// 주의: 테스트 러너(node --experimental-strip-types)가 .tsx JSX 변환을
// 지원하지 않으므로, 본 파일은 React.createElement 호출만 사용한다
// (JSX 문법 0). Vite 빌드 + tsc 는 .tsx 로 정상 컴파일된다.
import React from "react";
import { useEffect, useRef, useState } from "react";
import { PDF_WORKSPACE_ROOT_ID } from "../constants.ts";
import type { LegacyShellRegistry } from "../../app/react-shell/registry.ts";

// ─── 타입 ────────────────────────────────────────────────────────────────────

type PdfToolbarRegistry = LegacyShellRegistry["pdfToolbar"];

// 도구 id → hotkey badge 라벨 (main.ts PDF_TOOL_HOTKEY_LABELS 복제).
const PDF_TOOL_HOTKEY_LABELS: Partial<Record<string, string>> = {
  read: "R",
  sticky: "S",
  pen: "P",
  eraser: "E",
  text: "T",
  checklist: "C",
  table: "B",
  chart: "G",
  star: "Y"
};

export interface PdfToolbarWorkspaceState {
  selectedTool: string;
  selectedPage: number;
  pageCount: number;
  eraserShape: string;
  eraserSize: number;
  hasMaterial: boolean;
}

// ─── EraserSubToolbar ────────────────────────────────────────────────────────

interface EraserSubToolbarProps {
  subjectId: string;
  eraserShape: string;
  eraserSize: number;
  disabled: boolean;
  registry: PdfToolbarRegistry;
}

// 지우개 모양 버튼 (renderEraserShapeButton 1:1 복제).
function EraserShapeButton(props: {
  subjectId: string;
  shape: string;
  selectedShape: string;
  label: string;
  ariaLabel: string;
  disabled: boolean;
  registry: PdfToolbarRegistry;
}): React.ReactElement {
  const isActive = props.selectedShape === props.shape;
  return React.createElement(
    "button",
    {
      className: "eraser-shape-button" + (isActive ? " active" : ""),
      type: "button",
      "aria-label": props.ariaLabel,
      "aria-pressed": isActive ? "true" : "false",
      disabled: props.disabled,
      onClick: () => {
        props.registry.setEraserShape(props.subjectId, props.shape);
      }
    },
    props.label
  );
}

// 지우개 서브 툴바 (renderEraserSubToolbar 1:1 복제).
function EraserSubToolbar(props: EraserSubToolbarProps): React.ReactElement {
  const { subjectId, eraserShape, eraserSize, disabled, registry } = props;
  const roundedSize = Math.round(eraserSize);

  return React.createElement(
    "div",
    { className: "pdf-eraser-subtoolbar", "aria-label": "지우개 설정" },
    React.createElement(
      "div",
      { className: "pdf-eraser-shape-picker", role: "group", "aria-label": "지우개 모양" },
      React.createElement(EraserShapeButton, {
        subjectId, shape: "circle", selectedShape: eraserShape,
        label: "원", ariaLabel: "원형 지우개", disabled, registry
      }),
      React.createElement(EraserShapeButton, {
        subjectId, shape: "square", selectedShape: eraserShape,
        label: "네모", ariaLabel: "네모 지우개", disabled, registry
      }),
      React.createElement(EraserShapeButton, {
        subjectId, shape: "triangle", selectedShape: eraserShape,
        label: "세모", ariaLabel: "세모 지우개", disabled, registry
      }),
      React.createElement(EraserShapeButton, {
        subjectId, shape: "line", selectedShape: eraserShape,
        label: "선", ariaLabel: "선 지우개", disabled, registry
      })
    ),
    React.createElement(
      "label",
      { className: "pdf-eraser-size-control" },
      React.createElement("span", null, `지우개 크기: ${roundedSize}px`),
      React.createElement("input", {
        type: "range",
        min: 16,
        max: 64,
        value: roundedSize,
        disabled,
        // onChange: input 이벤트와 동일 — range 슬라이더 연속 반응 (document input 핸들러와 동일 동작).
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          registry.setEraserSize(subjectId, Number(e.target.value));
        }
      })
    )
  );
}

// ─── ToolButton ──────────────────────────────────────────────────────────────

interface ToolButtonProps {
  subjectId: string;
  tool: string;
  selectedTool: string;
  label: string;
  registry: PdfToolbarRegistry;
  disabled: boolean;
}

// 도구 선택 버튼 (renderToolButton 1:1 복제).
// R2b: data-action/data-tool/data-subject-id 속성 emit 0.
function ToolButton(props: ToolButtonProps): React.ReactElement {
  const { subjectId, tool, selectedTool, label, registry, disabled } = props;
  const hotkey = PDF_TOOL_HOTKEY_LABELS[tool];
  const isActive = selectedTool === tool;

  return React.createElement(
    "button",
    {
      className: "tool-button" + (isActive ? " active" : ""),
      type: "button",
      "aria-pressed": isActive ? "true" : "false",
      ...(hotkey ? { "aria-keyshortcuts": hotkey } : {}),
      disabled,
      onClick: () => {
        registry.setTool(subjectId, tool);
      }
    },
    React.createElement("span", { className: "tool-button__label" }, label),
    hotkey
      ? React.createElement("kbd", { className: "tool-button__key", "aria-hidden": "true" }, hotkey)
      : null
  );
}

// ─── FullscreenButton ────────────────────────────────────────────────────────

interface FullscreenButtonProps {
  registry: PdfToolbarRegistry;
}

// 전체화면 토글 버튼 (renderFullscreenToggleButton 1:1 복제).
// fullscreen 상태: native fullscreenchange 이벤트 구독 +
// document.fullscreenElement?.id === PDF_WORKSPACE_ROOT_ID 재평가.
function FullscreenButton(props: FullscreenButtonProps): React.ReactElement {
  const { registry } = props;

  // fullscreenchange 이벤트로 reactive. uiStore lift 없음 (§2b 정정).
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return (document.fullscreenElement as HTMLElement | null)?.id === PDF_WORKSPACE_ROOT_ID;
  });

  useEffect(() => {
    const handler = (): void => {
      setIsFullscreen(
        (document.fullscreenElement as HTMLElement | null)?.id === PDF_WORKSPACE_ROOT_ID
      );
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const label = isFullscreen ? "전체화면 종료" : "전체화면";

  return React.createElement(
    "button",
    {
      className: "tool-button",
      type: "button",
      "aria-pressed": isFullscreen ? "true" : "false",
      "aria-keyshortcuts": "F",
      onClick: () => registry.toggleFullscreen()
    },
    React.createElement("span", { className: "tool-button__label" }, label),
    React.createElement("kbd", { className: "tool-button__key", "aria-hidden": "true" }, "F")
  );
}

// ─── PageControls ────────────────────────────────────────────────────────────

interface PageControlsProps {
  subjectId: string;
  selectedPage: number;
  pageCount: number;
  disabled: boolean;
  registry: PdfToolbarRegistry;
}

// 페이지 네비게이션 컨트롤 (renderPdfToolbar 페이지 컨트롤 블록 1:1 복제).
// 페이지 input: legacy `change` 이벤트 (blur/Enter) 동작 재현.
// React onChange 는 매 키입력마다 발화하므로, local controlled state +
// onBlur/Enter 커밋으로 legacy change 이벤트 동작을 1:1 재현한다.
function PageControls(props: PageControlsProps): React.ReactElement {
  const { subjectId, selectedPage, pageCount, disabled, registry } = props;

  // 로컬 입력 상태 — blur/Enter 커밋 전까지 store 업데이트 보류.
  const [localPage, setLocalPage] = useState<string>(String(selectedPage));
  const prevSelectedPageRef = useRef(selectedPage);

  // store 값이 외부에서 바뀌면 (다른 페이지 이동 action) 로컬 상태 동기화.
  if (prevSelectedPageRef.current !== selectedPage) {
    prevSelectedPageRef.current = selectedPage;
    setLocalPage(String(selectedPage));
  }

  const isMacLike =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
  const modifierLabel = isMacLike ? "⌘" : "Ctrl";
  const modifierKey = isMacLike ? "Meta" : "Control";

  const commitPage = (): void => {
    const n = Number(localPage);
    if (Number.isInteger(n) && n >= 1 && n <= pageCount) {
      registry.setPage(subjectId, n);
    } else {
      // 유효하지 않으면 현재 store 값으로 복원.
      setLocalPage(String(selectedPage));
    }
  };

  return React.createElement(
    "div",
    { className: "pdf-page-controls" },
    React.createElement(
      "button",
      {
        className: "secondary-action",
        type: "button",
        "aria-keyshortcuts": `${modifierKey}+[`,
        disabled,
        onClick: () => registry.prevPage(subjectId)
      },
      React.createElement("span", { className: "tool-button__label" }, "이전"),
      React.createElement("kbd", { className: "tool-button__key", "aria-hidden": "true" }, `${modifierLabel}+[`)
    ),
    React.createElement(
      "label",
      null,
      React.createElement("span", null, "페이지"),
      React.createElement("input", {
        type: "number",
        min: 1,
        max: pageCount,
        value: localPage,
        disabled,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setLocalPage(e.target.value);
        },
        onBlur: commitPage,
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            // blur() 가 onBlur=commitPage 를 발화 → 단일 commit.
            // 직접 commitPage() 후 blur() 면 commitPage 재발화 = 같은 page 이중
            // setPage (codex cross review Important, 20260531).
            (e.target as HTMLInputElement).blur();
          }
        }
      })
    ),
    React.createElement(
      "button",
      {
        className: "secondary-action",
        type: "button",
        "aria-keyshortcuts": `${modifierKey}+]`,
        disabled,
        onClick: () => registry.nextPage(subjectId)
      },
      React.createElement("span", { className: "tool-button__label" }, "다음"),
      React.createElement("kbd", { className: "tool-button__key", "aria-hidden": "true" }, `${modifierLabel}+]`)
    )
  );
}

// ─── PdfToolbar ──────────────────────────────────────────────────────────────

export interface PdfToolbarProps {
  subjectId: string;
  registry: PdfToolbarRegistry;
  workspaceState: PdfToolbarWorkspaceState;
}

// PDF 툴바 루트 컴포넌트 (renderPdfToolbar 1:1 구조 복제).
// workspaceState 는 PdfToolbarPortal 이 pdfWorkspaceStateStore 구독 후 주입.
// 컴포넌트 자체는 순수 프레젠테이션 — store 직접 접근 0.
export function PdfToolbar(props: PdfToolbarProps): React.ReactElement | null {
  const { subjectId, registry, workspaceState } = props;
  const { selectedTool, selectedPage, pageCount, eraserShape, eraserSize, hasMaterial } = workspaceState;
  const disabled = !hasMaterial;

  return React.createElement(
    "div",
    { className: "pdf-toolbar", "aria-label": "PDF 작업 도구" },
    React.createElement(PageControls, {
      subjectId, selectedPage, pageCount, disabled, registry
    }),
    React.createElement(
      "div",
      { className: "pdf-tool-group", role: "group", "aria-label": "입력 도구" },
      React.createElement(ToolButton, { subjectId, tool: "read", selectedTool, label: "읽기", registry, disabled }),
      React.createElement(ToolButton, { subjectId, tool: "sticky", selectedTool, label: "포스트잇", registry, disabled }),
      React.createElement(ToolButton, { subjectId, tool: "pen", selectedTool, label: "펜", registry, disabled }),
      React.createElement(ToolButton, { subjectId, tool: "eraser", selectedTool, label: "지우개", registry, disabled })
    ),
    React.createElement(
      "div",
      { className: "pdf-tool-group", role: "group", "aria-label": "annotation 도구" },
      React.createElement(ToolButton, { subjectId, tool: "text", selectedTool, label: "텍스트 박스", registry, disabled }),
      React.createElement(ToolButton, { subjectId, tool: "checklist", selectedTool, label: "체크리스트", registry, disabled }),
      React.createElement(ToolButton, { subjectId, tool: "table", selectedTool, label: "표", registry, disabled }),
      React.createElement(ToolButton, { subjectId, tool: "chart", selectedTool, label: "그래프", registry, disabled }),
      React.createElement(ToolButton, { subjectId, tool: "star", selectedTool, label: "별표", registry, disabled })
    ),
    React.createElement(
      "div",
      { className: "pdf-tool-group", role: "group", "aria-label": "화면 전환" },
      React.createElement(FullscreenButton, { registry })
    ),
    selectedTool === "eraser"
      ? React.createElement(EraserSubToolbar, {
          subjectId, eraserShape, eraserSize, disabled, registry
        })
      : null
  );
}
