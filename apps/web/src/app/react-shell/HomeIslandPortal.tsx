// S3 React island portal — home-island 슬롯에 <HomeView> 를 createPortal 로 마운트.
//
// uiStore 의 homeSlot + homeProps 를 구독해 leaf 에 props 주입.
// slot null(home route 외) 이면 null 반환.
// homeProps 는 useShallow 로 얕은 비교 → 동일-값 재발행 시 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";
import { uiStore } from "../../stores/uiStore.ts";
import { HomeView } from "../../subject-views/HomeView.tsx";

export function HomeIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.homeSlot);
  const props = useStore(uiStore, useShallow((s) => s.homeProps));

  if (!slot || !props) {
    return null;
  }

  return createPortal(<HomeView {...props} />, slot);
}
