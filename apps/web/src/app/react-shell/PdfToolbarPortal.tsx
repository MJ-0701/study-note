// S1a/WU2a — React island portal 인프라 (toolbar 로직 0).
//
// uiStore.pdfToolbarSlot 을 구독해 #pdf-toolbar-island DOM 노드가
// 존재할 때만 portal 을 마운트한다. slot 이 null (pdf-workspace 외
// route) 이면 즉시 null 반환.
//
// WU2a 인프라 검증용 placeholder, WU2b 가 실제 toolbar 로 교체.
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";

export function PdfToolbarPortal() {
  const slot = useStore(uiStore, (s) => s.pdfToolbarSlot);

  if (!slot) {
    return null;
  }

  return createPortal(
    <div data-wu2a-placeholder style={{ display: "none" }} />,
    slot
  );
}
