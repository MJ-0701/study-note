// sprint-2026-W22-sprint-21 / layer D/slice-3 — UI ephemeral state.
// Owns transient overlay state independent of identity/session lifecycle.
// 현재 1 entry = hotkeyHelpModalOpen. session 또는 route change 시 close.
//
// invariant:
//   (a) state primitive only — render trigger 는 caller 책임 (main.ts.renderApp).
//   (b) PII no-log — module body 내 production logging 사용 금지.
//
// state transition contract (T1~T5):
//   T1 setHotkeyHelpModalOpen(true) : state=true.
//   T2 setHotkeyHelpModalOpen(false) / closeHotkeyHelpModal() : state=false.
//   T3 toggleHotkeyHelpModal() : state=!state, returns new value.
//   T4 route change (hashchange) : caller invokes closeHotkeyHelpModal().
//   T5 session reset (clearAuthSession) : caller invokes closeHotkeyHelpModal().

let hotkeyHelpModalOpen = false;

export function getHotkeyHelpModalOpen(): boolean {
  return hotkeyHelpModalOpen;
}

export function setHotkeyHelpModalOpen(value: boolean): void {
  hotkeyHelpModalOpen = value;
}

export function toggleHotkeyHelpModal(): boolean {
  hotkeyHelpModalOpen = !hotkeyHelpModalOpen;
  return hotkeyHelpModalOpen;
}

export function closeHotkeyHelpModal(): void {
  hotkeyHelpModalOpen = false;
}

export function __resetEphemeralStateForTesting__(): void {
  hotkeyHelpModalOpen = false;
}
