// sprint-2026-W22-sprint-2 / layer B/slice-2b — PDF workspace view-state 모듈.
// main.ts 의 togglePdfFullscreen + getActivePdfWorkspaceSubjectId +
// movePdfPage + requestPdfPage + setPdfPage + setPdfTool (6 함수) 격리.
// slice-2a workspace-store 패턴 (named export + Context + Callbacks +
// DomainHelpers 주입) 일치.
//
// invariant:
//   - movePdfPage: delta page 변경은 material.pageCount 한도 + 1 minimum
//     clamp 후 setPdfPage 로 위임. material 없으면 no-op.
//   - requestPdfPage: pageNumber 1..pageCount clamp 후 setPdfPage 동기 commit
//     (pdfjs canvas mount 가 iframe load 게이팅을 대체).
//   - setPdfTool: domain PdfWorkspaceTool 외 "eraser" local extension cast.
//   - togglePdfFullscreen: Fullscreen API 미지원 browser (iOS Safari /
//     legacy WebKit) 에서 probe 후 noop + warn. preventDefault X.

import type {
  PdfWorkspaceStore,
  PdfWorkspaceTool,
  SubjectPdfWorkspace
} from "@study-note/domain";

// ─── Public types ────────────────────────────────────────────────────────

/**
 * view-state stateful 함수가 read-only 로 받는 main.ts state. broad
 * `pdfWorkspaceStore` / `window.location` 노출 X — getter 만.
 */
export interface ViewStateContext {
  getStore: () => PdfWorkspaceStore;
  getRoute: () =>
    | { name: "pdf-workspace"; subjectId: string }
    | { name: string; subjectId?: string };
  domain: {
    getSubjectWorkspace: (
      store: PdfWorkspaceStore,
      subjectId: string
    ) => SubjectPdfWorkspace;
  };
}

/**
 * view-state stateful 함수의 부수효과 callback. broad mutator 노출 X.
 */
export interface ViewStateCallbacks {
  updatePdfWorkspace: (
    subjectId: string,
    updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
  ) => void;
}

/**
 * Fullscreen API adapter. browser global (document.fullscreenElement,
 * Element.requestFullscreen) 의존을 ctx 로 격리해 module 의 unit test 와
 * iOS Safari probe 분기를 명시한다.
 *
 * - isWorkspaceFullscreen: PDF workspace 가 fullscreen 진입 중인지.
 * - getWorkspaceTarget: PDF workspace root DOM. 없으면 null.
 * - exitFullscreen: document.exitFullscreen 호출. API 부재면 null.
 * - requestFullscreen: target.requestFullscreen 호출. API 부재면 null.
 * - warn: probe 실패 + Promise reject 로깅 (console.warn 위임).
 */
export interface FullscreenPort {
  isWorkspaceFullscreen: () => boolean;
  getWorkspaceTarget: () => HTMLElement | null;
  exitFullscreen: () => Promise<void> | null;
  requestFullscreen: (target: HTMLElement) => Promise<void> | null;
  warn: (message: string, payload?: unknown) => void;
}

// ─── 1) Route helper (pure) ──────────────────────────────────────────────

/**
 * 활성 PDF workspace 의 subjectId. route 가 pdf-workspace 가 아니면 undefined.
 */
export function getActivePdfWorkspaceSubjectId(
  context: Pick<ViewStateContext, "getRoute">
): string | undefined {
  const route = context.getRoute();
  return route.name === "pdf-workspace" ? route.subjectId : undefined;
}

// ─── 2) Page / tool mutators ─────────────────────────────────────────────

/**
 * 현재 material 의 selectedPage 를 1..pageCount clamp 후 commit.
 * material 없으면 no-op (workspace 자체는 보존).
 */
export function setPdfPage(
  subjectId: string,
  pageNumber: number,
  callbacks: ViewStateCallbacks
): void {
  callbacks.updatePdfWorkspace(subjectId, (workspace) => {
    const material = workspace.material;

    if (!material) {
      return workspace;
    }

    return {
      ...workspace,
      material: {
        ...material,
        selectedPage: Math.min(material.pageCount, Math.max(1, pageNumber))
      }
    };
  });
}

/**
 * page 요청. material.pageCount 한도 + 1 minimum clamp 후 setPdfPage 동기 호출.
 */
export function requestPdfPage(
  subjectId: string,
  pageNumber: number,
  context: ViewStateContext,
  callbacks: ViewStateCallbacks
): void {
  const workspace = context.domain.getSubjectWorkspace(context.getStore(), subjectId);
  const material = workspace.material;

  if (!material) {
    return;
  }

  // sprint-W21-sprint-4/S1 P0 fix: pdfjs canvas mount path replaces the iframe
  // load-event gating. `applyPdfCanvasMounts` paints `selectedPage ± 1` on every
  // render, so the next-page canvas is already mounted by the time the user
  // navigates. Commit the new page synchronously — waiting for an iframe `load`
  // signal that never fires would leave the navigation stuck.
  const nextPage = Math.min(material.pageCount, Math.max(1, pageNumber));
  setPdfPage(subjectId, nextPage, callbacks);
}

/**
 * delta page 변경. movePdfPage(±1) = prev/next. material 없으면 no-op.
 */
export function movePdfPage(
  subjectId: string,
  delta: number,
  context: ViewStateContext,
  callbacks: ViewStateCallbacks
): void {
  const workspace = context.domain.getSubjectWorkspace(context.getStore(), subjectId);
  const material = workspace.material;

  if (!material) {
    return;
  }

  requestPdfPage(subjectId, material.selectedPage + delta, context, callbacks);
}

/**
 * material.selectedTool 갱신. PdfWorkspaceTool + local "eraser" extension cast.
 */
export function setPdfTool(
  subjectId: string,
  tool: PdfWorkspaceTool | "eraser",
  callbacks: ViewStateCallbacks
): void {
  callbacks.updatePdfWorkspace(subjectId, (workspace) => {
    const material = workspace.material;

    if (!material) {
      return workspace;
    }

    return {
      ...workspace,
      material: {
        ...material,
        // Cast: "eraser" is a local extension; the domain store accepts PdfWorkspaceTool.
        // The store treats unknown tool values as opaque strings at runtime (JSON.stringify).
        selectedTool: tool as PdfWorkspaceTool
      }
    };
  });
}

// ─── 3) Fullscreen toggle ────────────────────────────────────────────────

/**
 * PDF workspace fullscreen 진입/탈출 toggle. Fullscreen API 미지원 browser
 * 에서 probe 후 noop + warn. exit/request Promise reject 도 warn 으로 흡수
 * (handler 가 sync 로 throw 하지 않게).
 */
export function togglePdfFullscreen(port: FullscreenPort): void {
  const target = port.getWorkspaceTarget();
  if (!target) {
    return;
  }

  // sprint-1/S3 fix (codex P2): the unprefixed Fullscreen API is not universal
  // (notably iOS Safari and older WebKit). Probe the methods before invoking
  // them so a missing API does not throw synchronously from the click/keydown
  // handler.
  if (port.isWorkspaceFullscreen()) {
    const exit = port.exitFullscreen();
    if (!exit) {
      port.warn("[study-note] document.exitFullscreen unavailable");
      return;
    }
    try {
      void exit.catch((error) => {
        port.warn("[study-note] exitFullscreen failed:", error);
      });
    } catch (error) {
      port.warn("[study-note] exitFullscreen threw:", error);
    }
    return;
  }

  const request = port.requestFullscreen(target);
  if (!request) {
    port.warn("[study-note] Element.requestFullscreen unavailable");
    return;
  }
  try {
    void request.catch((error) => {
      port.warn("[study-note] requestFullscreen failed:", error);
    });
  } catch (error) {
    port.warn("[study-note] requestFullscreen threw:", error);
  }
}
