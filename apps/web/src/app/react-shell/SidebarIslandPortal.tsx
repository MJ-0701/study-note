// S3b React island portal — sidebar-island 슬롯에 <SidebarView> 를 createPortal 로 마운트.
//
// uiStore 의 sidebarSlot + sidebarProps 를 구독해 leaf 에 props 주입.
// slot null(sidebar 미활성) 이면 null 반환.
// sidebarProps 는 buildSidebarProps 의 module-level memoize 덕분에 value-equal
// 재발행 시 동일 ref → useStore ref 비교 = 재렌더 차단(무한루프 방지, AC6).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SidebarView } from "./SidebarView.tsx";

export function SidebarIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.sidebarSlot);
  // sidebarProps: buildSidebarProps memoize 로 value-equal = same ref →
  // zustand ref 비교 자체로 재렌더 차단. useShallow 불필요.
  const props = useStore(uiStore, (s) => s.sidebarProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<SidebarView props={props} />, slot);
}
