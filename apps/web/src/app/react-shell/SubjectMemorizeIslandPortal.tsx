// S4a React island portal — subject-memorize-island 슬롯에 <SubjectMemorizeView> 를 createPortal 로 마운트.
//
// uiStore 의 subjectMemorizeSlot + subjectMemorizeProps 를 구독해 leaf 에 props 주입.
// slot null(subject-memorize route 외) 이면 null 반환.
// subjectMemorizeProps 는 JSON-key value-equal guard (uiStore setter) 덕분에
// 동일-값 재발행 시 setState skip → zustand ref 비교 = 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SubjectMemorizeView } from "../../subject-views/SubjectMemorizeView.tsx";

export function SubjectMemorizeIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.subjectMemorizeSlot);
  const props = useStore(uiStore, (s) => s.subjectMemorizeProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<SubjectMemorizeView {...props} />, slot);
}
