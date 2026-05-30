// S1a/WU2b — React island portal: pdf-toolbar-island 슬롯에 <PdfToolbar> 마운트.
//
// pdfWorkspaceStateStore 구독은 여기서 수행 — PdfToolbar 는 순수 프레젠테이션
// 컴포넌트(props 주입). slot null(pdf-workspace 외 route) 이면 null 반환.
import { createPortal } from "react-dom";
import { useStore } from "zustand";
import { uiStore } from "../../stores/uiStore.ts";
import { pdfWorkspaceStateStore } from "../../stores/pdfWorkspaceStore.ts";
import { PdfToolbar } from "../../pdf-workspace/react/PdfToolbar.tsx";
import type { LegacyShellRegistry } from "./registry.ts";

interface PdfToolbarPortalProps {
  subjectId: string | null;
  registry: LegacyShellRegistry;
}

export function PdfToolbarPortal(props: PdfToolbarPortalProps): React.ReactElement | null {
  const { subjectId, registry } = props;
  const slot = useStore(uiStore, (s) => s.pdfToolbarSlot);

  // pdfWorkspaceStateStore 구독 → workspaceState 파생.
  const workspaceState = useStore(pdfWorkspaceStateStore, (s) => {
    if (!subjectId) {
      return { selectedTool: "read", selectedPage: 1, pageCount: 1, eraserShape: "circle", eraserSize: 16, hasMaterial: false };
    }
    const ws = s.store.workspaces[subjectId];
    const material = ws?.material;
    return {
      selectedTool: (material?.selectedTool ?? "read") as string,
      selectedPage: material?.selectedPage ?? 1,
      pageCount: material?.pageCount ?? 1,
      eraserShape: ws?.eraserShape ?? "circle",
      eraserSize: ws?.eraserSize ?? 16,
      hasMaterial: Boolean(material)
    };
  });

  if (!slot || !subjectId) {
    return null;
  }

  return createPortal(
    <PdfToolbar
      subjectId={subjectId}
      registry={registry.pdfToolbar}
      workspaceState={workspaceState}
    />,
    slot
  );
}
