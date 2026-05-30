// sprint-2026-W21-sprint-2 / layer A (routing/shell) — app shell view +
// DOM sink. main.ts 의 renderInto / renderShell / 부속 view fragment 를
// 이동. module state 결합은 Context (least-privilege) + Sink (post-mount
// effect callback array) 인터페이스로 끊는다.

import morphdom from "morphdom";
import { escapeHtml } from "./escape-html.ts";

/**
 * AppShellContext — renderShell / renderNotebookStorageBanner /
 * renderHotkeyHelpModal 가 출력할 때 필요한 *최소* 필드만 노출. broad
 * `authSession` / `notebook` 객체 노출 금지 (Gate 3 self R2 finding).
 *
 * trust 분류 (Gate 3 self R7 / cross round-2 P1 반영):
 * - Untrusted text slot: `displayName`, `notebookUpdatedAt`,
 *   `notebookStorageError`, `syncBackendError`. interpolation 시
 *   반드시 `escapeHtml(...)` 적용.
 * - Control-flow-only slot: `hotkeyHelpModalOpen` (boolean),
 *   `activePdfWorkspaceSubjectId` (boolean coerce / early return guard
 *   만). interpolation 슬롯 0.
 */
export interface AppShellContext {
  displayName: string | null;
  notebookUpdatedAt: string;
  notebookStorageError: string | null;
  syncBackendError: string | null;
  hotkeyHelpModalOpen: boolean;
  activePdfWorkspaceSubjectId: string | null;
}

/**
 * RenderSink — `renderInto` 가 사용할 DOM mount 대상 + render 직후 실행할
 * 부수효과 함수 배열. main.ts 가 module init 1회 구성 후 매 renderInto
 * 호출 시 전달.
 */
export interface RenderSink {
  appRoot: HTMLElement;
  postMountEffects: Array<(root: HTMLElement) => void | Promise<void>>;
}

/**
 * renderInto — morphdom 으로 children 만 diff. PDF iframe 교체 / PDF
 * canvas mount 보존 callback 은 본 모듈 내부 helper.
 */
export function renderInto(html: string, sink: RenderSink): void {
  const { appRoot, postMountEffects } = sink;
  if (!appRoot) {
    return;
  }

  // morphdom 가 wrapper element 의 children 만 diff 적용.
  const wrapper = document.createElement("div");
  wrapper.id = appRoot.id;
  wrapper.innerHTML = html;
  morphdom(appRoot, wrapper, {
    childrenOnly: true,
    getNodeKey(node) {
      if (node instanceof HTMLElement && node.dataset.pdfFrameKey) {
        return node.dataset.pdfFrameKey;
      }

      return node instanceof Element ? node.id : undefined;
    },
    onBeforeElUpdated(fromEl, toEl) {
      if (shouldReplacePdfFrame(fromEl, toEl)) {
        fromEl.replaceWith(toEl.cloneNode(true));
        return false;
      }

      // sprint-W21-sprint-4/S1: PDF canvas mount preservation.
      // 동일 (material, page, blob) 의 div 는 fromEl + 자식 canvas 보존,
      // class (is-active/is-preload toggle) 만 sync. 매 render 마다 mountPdfCanvas
      // 호출되어 canvas 재 paint 되는 비효율 차단.
      if (shouldPreservePdfCanvasMount(fromEl, toEl)) {
        if (fromEl instanceof HTMLElement && toEl instanceof HTMLElement) {
          fromEl.className = toEl.className;
        }
        return false;
      }

      // S1a/WU2a: React island = React 가 children 소유, morphdom skip.
      // canvas preserve 와 short-circuit 충돌 없게 canvas 블록 뒤, 최종 return 앞.
      if (shouldPreserveReactIsland(fromEl, toEl)) {
        return false;
      }

      return true;
    }
  });

  for (const effect of postMountEffects) {
    const result = effect(appRoot);
    if (result && typeof (result as Promise<void>).then === "function") {
      void (result as Promise<void>);
    }
  }
}

/**
 * shouldReplacePdfFrame — morphdom 의 onBeforeElUpdated callback 보조.
 * 다른 material / src 의 PDF iframe 은 update 가 아닌 replace.
 */
export function shouldReplacePdfFrame(fromEl: Element, toEl: Element): boolean {
  if (fromEl.tagName !== "IFRAME" || toEl.tagName !== "IFRAME") {
    return false;
  }

  const fromFrame = fromEl as HTMLElement;
  const toFrame = toEl as HTMLElement;

  if (fromFrame.dataset.pdfFrame !== "true" || toFrame.dataset.pdfFrame !== "true") {
    return false;
  }

  return (
    fromFrame.dataset.materialId !== toFrame.dataset.materialId ||
    fromEl.getAttribute("src") !== toEl.getAttribute("src")
  );
}

/**
 * shouldPreserveReactIsland — S1a/WU2a: data-react-island 가 동일한 두
 * 엘리먼트는 morphdom 이 update 하지 않는다. React 가 해당 subtree 를
 * 소유하므로 morphdom 이 간섭하면 portal mount 가 파괴된다.
 */
export function shouldPreserveReactIsland(fromEl: Element, toEl: Element): boolean {
  if (!(fromEl instanceof HTMLElement) || !(toEl instanceof HTMLElement)) {
    return false;
  }
  const key = fromEl.dataset.reactIsland;
  if (!key) {
    return false;
  }
  return key === toEl.dataset.reactIsland;
}

/**
 * shouldPreservePdfCanvasMount — sprint-W21-sprint-4/S1: same (material,
 * page, blob) PDF canvas mount div 는 morphdom 이 update 하지 않고
 * fromEl + canvas 그대로 두도록 표식.
 */
export function shouldPreservePdfCanvasMount(fromEl: Element, toEl: Element): boolean {
  if (!(fromEl instanceof HTMLElement) || !(toEl instanceof HTMLElement)) {
    return false;
  }
  if (fromEl.dataset.pdfMount !== "true" || toEl.dataset.pdfMount !== "true") {
    return false;
  }
  return (
    fromEl.dataset.materialId === toEl.dataset.materialId &&
    fromEl.dataset.pageNumber === toEl.dataset.pageNumber &&
    fromEl.dataset.blobUrl === toEl.dataset.blobUrl
  );
}

/**
 * renderShell — top-level app frame (sidebar + main content + topbar +
 * footer + hotkey modal). sidebar / mainContent = TrustedHtml (이미
 * escape 된 HTML 문자열). crumb / ctx.displayName / ctx.notebookUpdatedAt
 * = Untrusted text → escapeHtml.
 *
 * sprint-1/S2 (codex P2): hotkey modal 의 `inert` attribute 는 modal 이
 * 실제로 render 될 때만 적용. modal 미 render 면 shell 잠금 회피.
 */
export function renderShell(
  sidebar: string,
  mainContent: string,
  crumb: string,
  ctx: AppShellContext
): string {
  const modalWillRender = ctx.hotkeyHelpModalOpen && !!ctx.activePdfWorkspaceSubjectId;
  const shellInertAttr = modalWillRender ? " inert" : "";
  const displayNamePrefix = ctx.displayName
    ? `${escapeHtml(ctx.displayName)} · `
    : "";
  return `
    <div class="app-shell"${shellInertAttr}>
      ${sidebar}
      <div class="main-area">
        <header class="topbar">
          <span class="crumb">${escapeHtml(crumb)}</span>
          <div class="topbar-session">
            <span class="topbar-meta">${displayNamePrefix}${escapeHtml(ctx.notebookUpdatedAt)} 업데이트</span>
            <button class="text-button" type="button" data-action="logout">로그아웃</button>
          </div>
        </header>
        ${renderNotebookStorageBanner(ctx)}
        <main class="content">${mainContent}</main>
        <footer class="site-footer">
          study-note · 과목 총정리, 날짜별 노트, 로컬 자료 투입 · 원문 PDF 공개 공유 없음
        </footer>
      </div>
    </div>
    ${renderHotkeyHelpModal(ctx)}
  `;
}

/**
 * renderNotebookStorageBanner — sprint-2/S2 fix (codex P1): localStorage
 * save fail OR BE sync pause. 두 source 가 독립이고 dismiss 는 둘 다
 * clear. localStorage 우선 (더 치명적).
 */
export function renderNotebookStorageBanner(ctx: AppShellContext): string {
  const message = ctx.notebookStorageError ?? ctx.syncBackendError;
  if (!message) {
    return "";
  }
  return `
    <div class="storage-error-banner" role="alert">
      <p>${escapeHtml(message)}</p>
      <button class="text-button" type="button" data-action="dismiss-notebook-storage-error">닫기</button>
    </div>
  `;
}

/**
 * renderHotkeyHelpModal — sprint-1/S2: 단축키 도움말 modal. PDF workspace
 * route 에서만 render. modal text 는 hardcoded literal (untrusted slot
 * 없음).
 */
export function renderHotkeyHelpModal(ctx: AppShellContext): string {
  if (!ctx.hotkeyHelpModalOpen) {
    return "";
  }

  // sprint-1/S2 fix (codex P2): only render the modal on the PDF workspace
  // route. Outside it the keyboard handler returns early and the user would be
  // unable to close the modal, while the shell `inert` attribute would lock
  // navigation. Defensive — hashchange already clears the flag, but a stale
  // flag from a non-shell path (auth reset, direct deep-link) is possible.
  if (!ctx.activePdfWorkspaceSubjectId) {
    return "";
  }

  const rows: Array<[string, string]> = [
    ["R", "읽기"],
    ["S", "포스트잇"],
    ["P", "펜"],
    ["E", "지우개"],
    ["T", "텍스트 박스"],
    ["C", "체크리스트"],
    ["B", "표"],
    ["G", "그래프"],
    ["Cmd/Ctrl + [", "이전 페이지"],
    ["Cmd/Ctrl + ]", "다음 페이지"],
    ["F", "전체화면 토글"],
    ["?", "이 도움말 열기 / 닫기"],
    ["Esc", "도구 해제 (도구 선택 시) / 도움말 닫기 / 전체화면 종료"]
  ];

  const body = rows
    .map(
      ([key, action]) => `
        <li>
          <kbd class="tool-button__key">${escapeHtml(key)}</kbd>
          <span>${escapeHtml(action)}</span>
        </li>
      `
    )
    .join("");

  return `
    <div class="hotkey-help-modal" role="dialog" aria-modal="true" aria-labelledby="hotkey-help-title" data-action="close-hotkey-help-backdrop">
      <div class="hotkey-help-modal__panel" role="document">
        <header class="hotkey-help-modal__header">
          <h2 id="hotkey-help-title">단축키 도움말</h2>
          <button class="text-button" type="button" data-action="close-hotkey-help" autofocus>닫기</button>
        </header>
        <ul class="hotkey-help-modal__list">${body}</ul>
        <p class="hotkey-help-modal__hint">PDF 작업공간에서 동작합니다. 입력 중에는 단일 키 단축키가 일시 비활성화됩니다.</p>
      </div>
    </div>
  `;
}

/**
 * renderNotFound — route 매치 실패 시 본문. hardcoded literal (untrusted
 * slot 없음).
 */
export function renderNotFound(): string {
  return `
    <section class="subject-page-hero">
      <p class="meta">찾을 수 없음</p>
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p class="lede">홈에서 과목을 다시 선택하세요.</p>
      <p><a href="#/">홈으로 돌아가기</a></p>
    </section>
  `;
}
