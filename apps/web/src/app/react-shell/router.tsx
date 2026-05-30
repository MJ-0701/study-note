// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — 얇은 hash router.
//
// roadmap §3.4 + Q2: hashchange 구독 → parseRoute(app/routes.ts, 1:1, INV-5)
// → <LegacyView route>. S0 에서는 12 route 전부 LegacyView 로 dispatch 되므로
// 실제 화면은 legacy renderApp 이 그린다(동작 무변경). 후속 slice 에서 route
// 별로 실제 React 컴포넌트로 치환된다.
//
// S1a/WU2b: <PdfToolbarPortal> 을 pdf-workspace route 일 때만 subjectId 와
// 함께 렌더. 다른 route 면 subjectId=null → portal null 반환.
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

  const route = parseRoute(hash);
  // pdf-workspace route 일 때만 subjectId 추출해 toolbar portal 활성화.
  const pdfSubjectId = route.name === "pdf-workspace" ? route.subjectId : null;

  return (
    <>
      <LegacyView route={route} registry={registry} />
      <PdfToolbarPortal subjectId={pdfSubjectId} registry={registry} />
    </>
  );
}
