// S4a React island portal — subject-summary-detail-island 슬롯에 <SubjectSummaryDetailView> 를 createPortal 로 마운트.
//
// uiStore 의 subjectSummaryDetailSlot + subjectSummaryDetailProps 를 구독해 leaf 에 props 주입.
// slot null(subject-summary-detail route 외) 이면 null 반환.
// subjectSummaryDetailProps 는 JSON-key value-equal guard (uiStore setter) 덕분에
// 동일-값 재발행 시 setState skip → zustand ref 비교 = 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SubjectSummaryDetailView } from "../../subject-views/SubjectSummaryDetailView.tsx";

export function SubjectSummaryDetailIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.subjectSummaryDetailSlot);
  const props = useStore(uiStore, (s) => s.subjectSummaryDetailProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<SubjectSummaryDetailView {...props} />, slot);
}
