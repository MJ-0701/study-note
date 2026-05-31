// S4b-2 React island portal — subject-class-island 슬롯에 <SubjectClassView> 를 createPortal 로 마운트.
//
// uiStore 의 subjectClassSlot + subjectClassProps 를 구독해 leaf 에 props 주입.
// slot null(subject-class/subject route 외) 이면 null 반환.
// subjectClassProps 는 JSON-key value-equal guard (uiStore setter) 덕분에
// 동일-값 재발행 시 setState skip → zustand ref 비교 = 재렌더 차단(무한루프 방지).
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SubjectClassView } from "../../subject-views/SubjectClassView.tsx";

export function SubjectClassIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.subjectClassSlot);
  const props = useStore(uiStore, (s) => s.subjectClassProps);

  if (!slot || !props) {
    return null;
  }

  // key={props.subjectId}: subject→subject 이동 시(둘 다 subject-class route, slot
  // identity 유지) uncontrolled input(hidden subjectId defaultValue / 입력 중 title)
  // 이 이전 subject 값 잔존하는 parity break 방지. subject 변경 = remount = fresh
  // defaultValue. 같은 subject 내 재렌더는 key 불변 → remount 없음 → focus 보존.
  return createPortal(<SubjectClassView key={props.subjectId} {...props} />, slot);
}
