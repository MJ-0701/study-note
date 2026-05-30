// 테스트 전용 — WU3 loop-gate negative control. AuthGate.tsx 동결 위반 없이
// S1a #185 회귀 클래스(불안정 snapshot store 구독)를 충실히 재현한다.
// 평시 빌드에서 __AUTH_LOOP_NEG_CTRL__===false dead-branch 로 tree-shake.
import React, { useSyncExternalStore } from "react";
import { AuthGate, type AuthGateProps } from "../AuthGate.tsx";

function subscribe(): () => void {
  return () => {};
}
// 매 호출 새 ref = broken value-equality. useSyncExternalStore 가 store 변경으로
// 오인 → 렌더 중 업데이트 루프 (React #185 / "getSnapshot should be cached").
function unstableGetSnapshot(): object {
  return {};
}

export function NegativeControlAuthGate(props: AuthGateProps): React.ReactElement {
  useSyncExternalStore(subscribe, unstableGetSnapshot);
  return <AuthGate {...props} />;
}
