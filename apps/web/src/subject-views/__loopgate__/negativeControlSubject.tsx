// S4a loop-gate negative control — subject-summaries 포털 A(마운트 루프)/B(클릭 루프).
// 테스트 전용 — __S4A_LOOP_NEG_CTRL_A__/__S4A_LOOP_NEG_CTRL_B__===false 시 dead-branch tree-shake.
//
// A (mount-time): unstable-getSnapshot useSyncExternalStore → mount 시 #185.
// B (click-time, §5-C 맹점 close): click-triggered unstable snapshot.
//    mount 시 GREEN, generate-subject-note 클릭 후 re-render 시 #185 루프 → RED.
import React, { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SubjectSummariesView } from "../SubjectSummariesView.tsx";

// ─── Negative Control A (mount-time unstable snapshot) ──────────────────────

function subscribe(): () => void {
  return () => {};
}
// 매 호출 새 ref → useSyncExternalStore 가 store 변경으로 오인 → #185.
function unstableGetSnapshot(): object {
  return {};
}

export function NegativeControlSubjectSummariesIslandPortalA(): React.ReactElement | null {
  useSyncExternalStore(subscribe, unstableGetSnapshot);
  // 실 portal 을 그대로 사용 — 불안정 snapshot 이 재렌더를 유발.
  const slot = useStore(uiStore, (s) => s.subjectSummariesSlot);
  const props = useStore(uiStore, (s) => s.subjectSummariesProps);
  if (!slot || !props) return null;
  return createPortal(<SubjectSummariesView {...props} />, slot);
}

// ─── Negative Control B (click-time → useSyncExternalStore 불안정 활성화, §5-C) ─
//
// 설계: mount 시 안전(loop 없음). generate-subject-note 클릭 후 첫 subjectSummariesProps
// 변경(uiStore) → portal re-render 시 unstable snapshot 이 활성화 → #185 루프.
//
// 구현: 독립 "flag store" 를 구현. document click listener 가 flag 를 set 하고
// React notify(). useSyncExternalStore(flagSubscribe, getB) 에서:
//   - flag false → STABLE_SNAPSHOT_B (안정 ref, mount 시 GREEN).
//   - flag true  → 매 호출 새 `{}` (불안정 → #185).

// B-전용 flag store
const _bListeners = new Set<() => void>();
let _bFlag = false;

function bSubscribe(listener: () => void): () => void {
  _bListeners.add(listener);
  return () => _bListeners.delete(listener);
}

function bNotify(): void {
  for (const l of _bListeners) l();
}

const STABLE_SNAPSHOT_B = {};

function getSnapshotB(): object {
  if (_bFlag) {
    return {}; // 매 호출 새 ref → React #185
  }
  return STABLE_SNAPSHOT_B;
}

export function NegativeControlSubjectSummariesIslandPortalB(): React.ReactElement | null {
  // click 위임 등록 — generate-subject-note 클릭 시 flag 활성화 + React notify
  React.useEffect(() => {
    function handleClick(e: MouseEvent): void {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-action='generate-subject-note']")) {
        if (!_bFlag) {
          _bFlag = true;
          bNotify(); // React re-render 요청 → getSnapshotB() = new {} → #185
        }
      }
    }
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      _bFlag = false; // unmount 시 reset
    };
  }, []);

  // mount 시 flag=false → stable → GREEN.
  // 클릭 후 flag=true + bNotify → re-render → new {} → #185 → RED.
  useSyncExternalStore(bSubscribe, getSnapshotB);

  const slot = useStore(uiStore, (s) => s.subjectSummariesSlot);
  const props = useStore(uiStore, (s) => s.subjectSummariesProps);
  if (!slot || !props) return null;
  return createPortal(<SubjectSummariesView {...props} />, slot);
}
