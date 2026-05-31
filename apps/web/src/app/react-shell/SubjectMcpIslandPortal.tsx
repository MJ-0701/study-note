// S4a React island portal — subject-mcp-island 슬롯에 <SubjectMcpView> 를 createPortal 로 마운트.
//
// uiStore 의 subjectMcpSlot + subjectMcpProps 를 구독해 leaf 에 props 주입.
// slot null(subject-mcp route 외) 이면 null 반환.
// subjectMcpProps 는 JSON-key value-equal guard (uiStore setter) 덕분에
// 동일-값 재발행 시 setState skip → zustand ref 비교 = 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SubjectMcpView } from "../../subject-views/SubjectMcpView.tsx";

export function SubjectMcpIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.subjectMcpSlot);
  const props = useStore(uiStore, (s) => s.subjectMcpProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<SubjectMcpView {...props} />, slot);
}
