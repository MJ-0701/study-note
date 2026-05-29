// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — notebook 도메인 상태 store.
//
// roadmap §2: strangler 기간 동안 legacy 렌더 함수와 (후속 slice 의) React
// 컴포넌트가 **동일 Zustand store 를 단일 진실원**으로 공유한다. legacy 는
// get*/set* accessor shim, React 는 `useStore(notebookStore, selector)`.
//
// 도메인 로직은 store 에 넣지 않는다 (`@study-note/domain` 유지) — store 는
// 상태 holder + thin accessor 만. main.ts 의 mutable singleton
// (`notebook`/`quickNote`/`intakeFeedback`/`pendingPdfRetry`) 이전 대상.
import { createStore } from "zustand/vanilla";
import type { StudyNotebook } from "@study-note/domain";
import { sampleLectureNote } from "../data/sampleLectureNote.ts";
import type { QuickNote } from "../subject-views/quick-note.ts";
import type { MaterialUploadIntent } from "../api/materials.ts";

// main.ts 에서 이동: import 피드백 (자료 업로드/주차노트 import 결과 배너).
export type IntakeFeedback =
  | {
      kind: "success" | "error";
      title: string;
      detail: string;
      href?: string;
      retrySubjectId?: string;
    }
  | undefined;

// slice-2: 마지막 실패 업로드 retry CTA stash.
export interface PendingPdfRetry {
  file: File;
  subjectId: string;
  intent: MaterialUploadIntent;
}

interface NotebookStoreState {
  // sprint-3/S1: userId 없이는 namespaced key 를 못 고르므로 boot 는 fixture
  // 기본값으로 시작. revalidate / sign-in 성공 경로가 setNotebook(loadStoredNotebook(...)).
  notebook: StudyNotebook;
  quickNote: QuickNote | undefined;
  intakeFeedback: IntakeFeedback;
  pendingPdfRetry: PendingPdfRetry | undefined;
}

export const notebookStore = createStore<NotebookStoreState>(() => ({
  notebook: sampleLectureNote,
  quickNote: undefined,
  intakeFeedback: undefined,
  pendingPdfRetry: undefined
}));

export const getNotebook = (): StudyNotebook => notebookStore.getState().notebook;
export const setNotebook = (notebook: StudyNotebook): void => {
  notebookStore.setState({ notebook });
};

export const getQuickNote = (): QuickNote | undefined => notebookStore.getState().quickNote;
export const setQuickNote = (quickNote: QuickNote | undefined): void => {
  notebookStore.setState({ quickNote });
};

export const getIntakeFeedback = (): IntakeFeedback => notebookStore.getState().intakeFeedback;
export const setIntakeFeedback = (intakeFeedback: IntakeFeedback): void => {
  notebookStore.setState({ intakeFeedback });
};

export const getPendingPdfRetry = (): PendingPdfRetry | undefined =>
  notebookStore.getState().pendingPdfRetry;
export const setPendingPdfRetry = (pendingPdfRetry: PendingPdfRetry | undefined): void => {
  notebookStore.setState({ pendingPdfRetry });
};
