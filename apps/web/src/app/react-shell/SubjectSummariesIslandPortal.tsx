// S4a React island portal — subject-summaries-island 슬롯에 <SubjectSummariesView> 를 createPortal 로 마운트.
//
// uiStore 의 subjectSummariesSlot + subjectSummariesProps 를 구독해 leaf 에 props 주입.
// slot null(subject-summaries route 외) 이면 null 반환.
// subjectSummariesProps 는 JSON-key value-equal guard (uiStore setter) 덕분에
// 동일-값 재발행 시 setState skip → zustand ref 비교 = 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SubjectSummariesView } from "../../subject-views/SubjectSummariesView.tsx";

export function SubjectSummariesIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.subjectSummariesSlot);
  const props = useStore(uiStore, (s) => s.subjectSummariesProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<SubjectSummariesView {...props} />, slot);
}
