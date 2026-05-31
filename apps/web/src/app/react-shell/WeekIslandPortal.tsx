// S4b-1 React island portal — week-island 슬롯에 <WeekView> 를 createPortal 로 마운트.
//
// uiStore 의 weekSlot + weekProps 를 구독해 leaf 에 props 주입.
// slot null(week route 외) 이면 null 반환.
// weekProps 는 JSON-key value-equal guard (uiStore setter) 덕분에
// 동일-값 재발행 시 setState skip → zustand ref 비교 = 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { WeekView } from "../../subject-views/WeekView.tsx";

export function WeekIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.weekSlot);
  const props = useStore(uiStore, (s) => s.weekProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<WeekView {...props} />, slot);
}
