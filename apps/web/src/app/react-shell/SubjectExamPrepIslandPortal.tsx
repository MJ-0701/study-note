// React island portal — subject-exam-prep-island 슬롯에 <SubjectExamPrepView> 를 마운트.
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { SubjectExamPrepView } from "../../subject-views/SubjectExamPrepView.tsx";

export function SubjectExamPrepIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.subjectExamPrepSlot);
  const props = useStore(uiStore, (s) => s.subjectExamPrepProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<SubjectExamPrepView {...props} />, slot);
}
