// S4c React island portal — pdf-workspaces-island 슬롯에 <PdfWorkspacesView> 를 createPortal 로 마운트.
//
// uiStore 의 pdfWorkspacesSlot + pdfWorkspacesProps 를 구독해 leaf 에 props 주입.
// slot null(pdf-workspaces route 외) 이면 null 반환.
// pdfWorkspacesProps 는 JSON-key value-equal guard (uiStore setter) 덕분에
// 동일-값 재발행 시 setState skip → zustand ref 비교 = 재렌더 차단(무한루프 방지).
//
// key={} 없음 이유: 이 뷰에는 uncontrolled 상태 입력(text/date input 등)이 없다.
// 파일 input의 value 는 프로그래밍으로 설정 불가하므로 uncontrolled-across-rerender
// 함정(S4b-2 key 전략 대상)이 구조적으로 발생하지 않는다. remount 불필요.
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { PdfWorkspacesView } from "../../subject-views/PdfWorkspacesView.tsx";

export function PdfWorkspacesIslandPortal(): React.ReactElement | null {
  const slot = useStore(uiStore, (s) => s.pdfWorkspacesSlot);
  const props = useStore(uiStore, (s) => s.pdfWorkspacesProps);

  if (!slot || !props) {
    return null;
  }

  return createPortal(<PdfWorkspacesView {...props} />, slot);
}
