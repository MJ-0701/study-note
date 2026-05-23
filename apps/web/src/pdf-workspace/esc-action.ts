// sprint-W21-sprint-1 / S5 / AC21 — ESC key 동작 우선순위 결정 (pure).
//
// Priority order (plan ADR-8):
//   1. hotkey help modal 열려있으면 → modal close
//   2. selectedTool !== "read" → tool reset (preventDefault + stopPropagation)
//   3. 그 외 → browser default 통과 (전체화면 해제 등)
//
// Pure function. DOM/state mutation 책임 X — caller (handleDocumentKeyDown) 가
// 결정에 따라 side-effect 실행. testability + main.ts 의 broad-entrypoint
// 누적 차단 (sfs-harness-gaps H3 cross-layer DDD guard).

export type EscapeAction = "close-modal" | "reset-tool" | "passthrough";

export interface EscapeStateInput {
  /** hotkey help modal 표시 여부. */
  modalOpen: boolean;
  /** 현재 PDF workspace 의 selectedTool. read 면 도구 미선택. */
  selectedTool: string;
}

export function resolveEscapeAction(state: EscapeStateInput): EscapeAction {
  if (state.modalOpen) return "close-modal";
  if (state.selectedTool !== "read") return "reset-tool";
  return "passthrough";
}
