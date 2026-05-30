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
// homeSlot / intakeSlot (S3): home/intake route 렌더 후 postMount effect 가
// slot placeholder DOM 노드를 signal. HomeIslandPortal/IntakeIslandPortal 이
// 구독해 portal target 으로 사용. route 이탈 시 null signal.
// homeProps / intakeProps: vanilla renderApp 이 계산한 view props 를 plain
// object 로 발행. portal wrapper 가 useShallow 로 구독해 leaf 에 주입.
//
// sidebarSlot / sidebarProps (S3b): sidebar route 렌더 후 postMount effect 가
// slot placeholder DOM 노드를 signal. SidebarIslandPortal 이 구독해 portal
// target 으로 사용. sidebarProps = buildSidebarProps memoize 객체 ref (value-equal
// 재발행 시 동일 ref → zustand ref 비교로 재렌더 차단, AC6).
//
// 주의: drag/resize 등 다른 ephemeral 상태는 S1 (PDF 컴포넌트화)에서 흡수.
import { createStore } from "zustand/vanilla";
import type { HomeViewProps } from "../subject-views/HomeView.tsx";
import type { IntakeViewProps } from "../subject-views/IntakeView.tsx";
import type { SidebarViewProps } from "../app/react-shell/sidebar-props";

interface UiStoreState {
  inspectorOpen: boolean;
  pdfToolbarSlot: HTMLElement | null;
  homeSlot: HTMLElement | null;
  homeProps: HomeViewProps | null;
  intakeSlot: HTMLElement | null;
  intakeProps: IntakeViewProps | null;
  sidebarSlot: HTMLElement | null;
  sidebarProps: SidebarViewProps | null;
}

export const uiStore = createStore<UiStoreState>(() => ({
  inspectorOpen: false,
  pdfToolbarSlot: null,
  homeSlot: null,
  homeProps: null,
  intakeSlot: null,
  intakeProps: null,
  sidebarSlot: null,
  sidebarProps: null,
}));

export const getInspectorOpen = (): boolean => uiStore.getState().inspectorOpen;
export const setInspectorOpen = (inspectorOpen: boolean): void => {
  uiStore.setState({ inspectorOpen });
};

export const getPdfToolbarSlot = (): HTMLElement | null => uiStore.getState().pdfToolbarSlot;
export const setPdfToolbarSlot = (el: HTMLElement | null): void => {
  uiStore.setState({ pdfToolbarSlot: el });
};

export const getHomeSlot = (): HTMLElement | null => uiStore.getState().homeSlot;
export const setHomeSlot = (el: HTMLElement | null): void => {
  uiStore.setState({ homeSlot: el });
};

export const getHomeProps = (): HomeViewProps | null => uiStore.getState().homeProps;
export const setHomeProps = (props: HomeViewProps | null): void => {
  uiStore.setState({ homeProps: props });
};

export const getIntakeSlot = (): HTMLElement | null => uiStore.getState().intakeSlot;
export const setIntakeSlot = (el: HTMLElement | null): void => {
  uiStore.setState({ intakeSlot: el });
};

export const getIntakeProps = (): IntakeViewProps | null => uiStore.getState().intakeProps;
export const setIntakeProps = (props: IntakeViewProps | null): void => {
  uiStore.setState({ intakeProps: props });
};

export const getSidebarSlot = (): HTMLElement | null => uiStore.getState().sidebarSlot;
export const setSidebarSlot = (el: HTMLElement | null): void => {
  uiStore.setState({ sidebarSlot: el });
};

export const getSidebarProps = (): SidebarViewProps | null => uiStore.getState().sidebarProps;
export const setSidebarProps = (props: SidebarViewProps | null): void => {
  uiStore.setState({ sidebarProps: props });
};
