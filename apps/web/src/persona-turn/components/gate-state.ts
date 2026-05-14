// sprint-7 slice-1 — MCPOnboardingGate dismiss state machine.
//
// plan §3 AC2 lock:
//   - localStorage key = `study-note.mcp.onboarding-completed.v1`
//     value `"true"` => 영구 dismiss (사용자가 "이미 설정 완료" 명시 클릭)
//   - sessionStorage key = `study-note.mcp.onboarding-deferred.v1`
//     value `"true"` => 임시 dismiss (탭/세션 종료 시 소멸)
//
// invariant: gate 의 dismiss 는 "이미 설정 완료" 명시 클릭만 영구화.
// "지금 안내 보기" 클릭 / 외부 닫기 (Escape / X / 배경) 는 영구 dismiss 시키지 않는다.
//
// 본 모듈은 React 의존 없음 — node:test 로 단위 검증 가능.

export const LS_COMPLETED_KEY = "study-note.mcp.onboarding-completed.v1";
export const SS_DEFERRED_KEY = "study-note.mcp.onboarding-deferred.v1";

export type DismissAction = "completed" | "deferred" | "guide" | "external-close";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GateStores {
  local: StorageLike;
  session: StorageLike;
}

/** plan §3 AC2 의 dismiss 조건 평가. gate 표시 = 반환값 === false. */
export function isGateDismissed(stores: GateStores): boolean {
  if (stores.local.getItem(LS_COMPLETED_KEY) === "true") return true;
  if (stores.session.getItem(SS_DEFERRED_KEY) === "true") return true;
  return false;
}

/**
 * 버튼/외부 close 액션을 storage 에 반영한다.
 *
 * @returns 다음 마운트 시 gate 재표시 여부 (= !영구 dismiss).
 *          guide 액션은 storage 미변경 → 사용자가 안내 페이지 다녀온 뒤 다시 떠야 함.
 */
export function applyDismiss(stores: GateStores, action: DismissAction): { willReappear: boolean } {
  switch (action) {
    case "completed":
      stores.local.setItem(LS_COMPLETED_KEY, "true");
      return { willReappear: false };
    case "deferred":
    case "external-close":
      stores.session.setItem(SS_DEFERRED_KEY, "true");
      return { willReappear: true };
    case "guide":
      // storage 미변경 — onboarding 페이지에서 돌아온 뒤 gate 재표시 가능.
      return { willReappear: true };
  }
}

/** 가짜 in-memory storage — node:test 에서 사용. */
export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    }
  };
}
