// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — React shell entry.
//
// INV-1 (최우선): polyfills 를 React/pdf.js 보다 먼저 평가. main.ts top-level
// import 가 이미 1순위로 평가하지만, 이 모듈이 독립적으로 import 될 수 있는
// 진입면이므로 방어적으로 여기서도 최상단 import (idempotent).
import "../../polyfills.ts";
import { createRoot } from "react-dom/client";
import { ReactShellRouter } from "./router.tsx";
import type { LegacyShellRegistry } from "./registry.ts";

// StrictMode 의도적 미사용 (S0 waiver): LegacyView 는 imperative legacy-DOM
// bridge 라 StrictMode 의 dev 이중 mount(mount→cleanup→mount)가 boot revalidate
// (GET /v1/auth/me)를 두 번 쏘고 render target 을 재bind 한다. LegacyView 가
// 순수 React route 로 대체되는 S1+ 에서 재검토.
export function mountReactShell(
  mountTarget: HTMLElement,
  registry: LegacyShellRegistry
): void {
  const root = createRoot(mountTarget);
  root.render(<ReactShellRouter registry={registry} />);
}
