// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — React shell ↔ legacy bridge.
//
// main.ts(entry)가 자신의 imperative legacy 함수를 이 registry 로 묶어
// mountReactShell 에 주입한다. shell(root/router/LegacyView)은 main.ts 를
// import 하지 않으므로 순환 import 가 없다. least-privilege: shell 이 호출해야
// 하는 함수만 노출 (broad main.ts 모듈 노출 금지).
export interface LegacyShellRegistry {
  // 전체 legacy 렌더 파이프라인 (parseRoute → 12 route branch → composeShell →
  // morphdom). LegacyView 가 mount + route 변경 시 호출.
  renderApp: () => void;
  // legacy morphdom 렌더 대상을 LegacyView 컨테이너로 재지정 (INV-2 canvas mount
  // + postMountEffects 가 이 컨테이너에서 실행).
  setLegacyRenderTarget: (el: HTMLElement) => void;
  // boot revalidate (GET /v1/auth/me, cookie). 세션 hint 가 있을 때만 호출하여
  // 익명 첫 방문은 ACA cold-start 를 피한다 (gate + action co-located).
  revalidateOnBoot: () => void;
  // route 변경 시 떠 있는 transient overlay(hotkey help modal) 정리.
  closeTransientOverlays: () => void;

  // S1a/WU2b — pdf-toolbar action 그룹. least-privilege: toolbar 가 호출해야
  // 하는 6종 action 만 노출. 각 wrapper = legacy 분기 본체 그대로 (INV-6).
  pdfToolbar: {
    // 선택 도구 변경 (read/sticky/pen/eraser/text/checklist/table/chart/star).
    setTool: (subjectId: string, tool: string) => void;
    // 이전 페이지 이동.
    prevPage: (subjectId: string) => void;
    // 다음 페이지 이동.
    nextPage: (subjectId: string) => void;
    // 특정 페이지로 이동.
    setPage: (subjectId: string, n: number) => void;
    // 지우개 모양 변경 (circle/square/triangle/line).
    setEraserShape: (subjectId: string, shape: string) => void;
    // 지우개 크기 변경.
    setEraserSize: (subjectId: string, size: number) => void;
    // 전체화면 토글 (renderApp 없음 — fullscreenchange 이벤트로 UI 갱신).
    toggleFullscreen: () => void;
  };
}
