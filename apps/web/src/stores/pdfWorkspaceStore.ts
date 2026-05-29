// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — PDF workspace 상태 store.
//
// roadmap §2: legacy/React 단일 진실원. main.ts 의 mutable singleton
// (`pdfWorkspaceStore`) 이전 대상.
//
// INV-6 보존: `updatePdfWorkspace` 단일 sink 의미 (모든 PDF 변경 → store →
// persist → render) 는 main.ts 의 WorkspaceStoreContext.getStore /
// WorkspaceStoreCallbacks.setStore 가 본 store 의 get/set 으로 위임하여 유지.
// reducer 로직 자체는 pdf-workspace/workspace-store.ts 모듈에 그대로 남는다.
//
// 주의: drag/resize 임시 상태(`activeXxxDrag`)는 본 store 가 아니라 S1 (PDF
// 컴포넌트화)에서 흡수한다 (roadmap §2). S0 에서는 main.ts module `let` 유지.
import { createStore } from "zustand/vanilla";
import type { PdfWorkspaceStore } from "@study-note/domain";

interface PdfWorkspaceStoreState {
  store: PdfWorkspaceStore;
}

export const pdfWorkspaceStateStore = createStore<PdfWorkspaceStoreState>(() => ({
  store: { workspaces: {} }
}));

export const getPdfWorkspaceStore = (): PdfWorkspaceStore =>
  pdfWorkspaceStateStore.getState().store;
export const setPdfWorkspaceStore = (store: PdfWorkspaceStore): void => {
  pdfWorkspaceStateStore.setState({ store });
};
