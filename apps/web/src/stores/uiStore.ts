// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — ephemeral UI 상태 store.
//
// roadmap §2: legacy/React 단일 진실원. main.ts 의 mutable singleton
// (`inspectorOpen`) 이전 대상. localStorage persistence 자체(readInspectorOpen
// / writeInspectorOpen)는 main.ts 에 유지 — store 는 in-memory 토글만 보관하고
// main.ts boot 가 setInspectorOpen(readInspectorOpen()) 로 초기화한다.
//
// pdfToolbarSlot (S1a/WU2a): pdf-workspace route 렌더 후 postMount effect 가
// DOM 에서 찾은 #pdf-toolbar-island 를 signal. React PdfToolbarPortal 이 이
// slot 을 구독해 portal target 으로 사용. route 이탈 시 null signal.
//
// 주의: drag/resize 등 다른 ephemeral 상태는 S1 (PDF 컴포넌트화)에서 흡수.
import { createStore } from "zustand/vanilla";

interface UiStoreState {
  inspectorOpen: boolean;
  pdfToolbarSlot: HTMLElement | null;
}

export const uiStore = createStore<UiStoreState>(() => ({
  inspectorOpen: false,
  pdfToolbarSlot: null
}));

export const getInspectorOpen = (): boolean => uiStore.getState().inspectorOpen;
export const setInspectorOpen = (inspectorOpen: boolean): void => {
  uiStore.setState({ inspectorOpen });
};

export const getPdfToolbarSlot = (): HTMLElement | null => uiStore.getState().pdfToolbarSlot;
export const setPdfToolbarSlot = (el: HTMLElement | null): void => {
  uiStore.setState({ pdfToolbarSlot: el });
};
