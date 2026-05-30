// S3 React island portal — intake-island 슬롯에 <IntakeView> 를 createPortal 로 마운트.
//
// uiStore 의 intakeSlot + intakeProps 를 구독해 leaf 에 props 주입.
// slot null(intake route 외) 이면 null 반환.
// intakeProps 는 useShallow 로 얕은 비교 → 동일-값 재발행 시 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";
import { uiStore } from "../../stores/uiStore.ts";
import { IntakeView } from "../../subject-views/IntakeView.tsx";

export function IntakeIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.intakeSlot);
  const props = useStore(uiStore, useShallow((s) => s.intakeProps));

  if (!slot || !props) {
    return null;
  }

  return createPortal(<IntakeView {...props} />, slot);
}
