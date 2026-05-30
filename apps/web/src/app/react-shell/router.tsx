// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — 얇은 hash router.
//
// roadmap §3.4 + Q2: hashchange 구독 → parseRoute(app/routes.ts, 1:1, INV-5)
// → <LegacyView route>. S0 에서는 12 route 전부 LegacyView 로 dispatch 되므로
// 실제 화면은 legacy renderApp 이 그린다(동작 무변경). 후속 slice 에서 route
// 별로 실제 React 컴포넌트로 치환된다.
//
// S1a/WU2a: <PdfToolbarPortal> 를 항상 LegacyView 옆에 렌더. route 분기 없음.
// portal 내부의 slot null 가드가 pdf-workspace 외 route 에서 자동으로 null
// 반환하므로 조건 렌더 불필요 — 더 단순한 쪽 선택.
import { useEffect, useState } from "react";
import { parseRoute } from "../routes.ts";
import { LegacyView } from "./LegacyView.tsx";
import { PdfToolbarPortal } from "./PdfToolbarPortal.tsx";
import type { LegacyShellRegistry } from "./registry.ts";

function readHash(): string {
  return typeof window !== "undefined" ? window.location.hash : "";
}

export function ReactShellRouter({
  registry
}: {
  registry: LegacyShellRegistry;
}) {
  const [hash, setHash] = useState(readHash);

  useEffect(() => {
    const onHashChange = (): void => setHash(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <LegacyView route={parseRoute(hash)} registry={registry} />
      <PdfToolbarPortal />
    </>
  );
}
