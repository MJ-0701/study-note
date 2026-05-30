// auth React root 마운트 — #auth-root 에 AuthGate 를 단일 root 로 렌더링한다.
import { createRoot, type Root } from "react-dom/client";
import { AuthGate, type AuthGateProps } from "./AuthGate.tsx";
import { NegativeControlAuthGate } from "./__loopgate__/negativeControl.tsx";

// vite define 주입(평시 false → dead-branch tree-shake). WU3 loop-gate RED 빌드만 true.
declare const __AUTH_LOOP_NEG_CTRL__: boolean;

let root: Root | null = null;

export function renderAuthGate(props: AuthGateProps | null): void {
  if (typeof document === "undefined") return;

  if (!root) {
    const container = document.querySelector<HTMLElement>("#auth-root");
    if (!container) {
      throw new Error("Auth mount target #auth-root is missing");
    }
    root = createRoot(container);
  }

  if (props === null) {
    root.render(null);
    return;
  }

  if (__AUTH_LOOP_NEG_CTRL__) {
    root.render(<NegativeControlAuthGate {...props} />);
    return;
  }

  root.render(<AuthGate {...props} />);
}
