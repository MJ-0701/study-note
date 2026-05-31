// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — 얇은 hash router.
//
// roadmap §3.4 + Q2: hashchange 구독 → parseRoute(app/routes.ts, 1:1, INV-5)
// → <LegacyView route>. S0 에서는 12 route 전부 LegacyView 로 dispatch 되므로
// 실제 화면은 legacy renderApp 이 그린다(동작 무변경). 후속 slice 에서 route
// 별로 실제 React 컴포넌트로 치환된다.
//
// S1a/WU2b: <PdfToolbarPortal> 을 pdf-workspace route 일 때만 subjectId 와
// 함께 렌더. 다른 route 면 subjectId=null → portal null 반환.
//
// S3: <HomeIslandPortal> / <IntakeIslandPortal> sibling 추가. slot null 이면
// portal null 반환 — 실 slot 발행은 postMountEffect(main.ts).
// __S3_LOOP_NEG_CTRL__ (vite define, 평시 false): RED 빌드에서 negative control
// 컴포넌트로 교체 → loop detector 가 RED 를 확인(gate 유효성 증명).
//
// S3b: <SidebarIslandPortal> sibling 추가. 모든 route 에 사이드바 렌더.
// __S3B_LOOP_NEG_CTRL_A__ / __S3B_LOOP_NEG_CTRL_B__ (vite define, 평시 false):
// A = mount-time loop, B = click-time loop (§5-C 맹점 close).
//
// S4a: <SubjectSummariesIslandPortal> 을 neg-ctrl 빌드에서 교체.
// __S4A_LOOP_NEG_CTRL_A__ / __S4A_LOOP_NEG_CTRL_B__ (vite define, 평시 false):
// A = mount-time loop, B = generate-subject-note 클릭 loop (§5-C 맹점 close).
//
// S4b-1: <WeekIslandPortal> 을 neg-ctrl 빌드에서 교체.
// __S4B_LOOP_NEG_CTRL_A__ / __S4B_LOOP_NEG_CTRL_B__ (vite define, 평시 false):
// A = mount-time loop, B = generate-week-note 클릭 loop (§5-C 맹점 close).
import { useEffect, useState } from "react";
import { parseRoute } from "../routes.ts";
import { LegacyView } from "./LegacyView.tsx";
import { PdfToolbarPortal } from "./PdfToolbarPortal.tsx";
import { HomeIslandPortal } from "./HomeIslandPortal.tsx";
import { IntakeIslandPortal } from "./IntakeIslandPortal.tsx";
import { SidebarIslandPortal } from "./SidebarIslandPortal.tsx";
import { SubjectSummariesIslandPortal } from "./SubjectSummariesIslandPortal.tsx";
import { SubjectSummaryDetailIslandPortal } from "./SubjectSummaryDetailIslandPortal.tsx";
import { SubjectMcpIslandPortal } from "./SubjectMcpIslandPortal.tsx";
import { SubjectMemorizeIslandPortal } from "./SubjectMemorizeIslandPortal.tsx";
import { WeekIslandPortal } from "./WeekIslandPortal.tsx";
import {
  NegativeControlHomeIslandPortal,
  NegativeControlIntakeIslandPortal,
} from "../../subject-views/__loopgate__/negativeControl.tsx";
import {
  NegativeControlSidebarIslandPortalA,
  NegativeControlSidebarIslandPortalB,
} from "../../subject-views/__loopgate__/negativeControlSidebar.tsx";
import {
  NegativeControlSubjectSummariesIslandPortalA,
  NegativeControlSubjectSummariesIslandPortalB,
} from "../../subject-views/__loopgate__/negativeControlSubject.tsx";
import {
  NegativeControlWeekIslandPortalA,
  NegativeControlWeekIslandPortalB,
} from "../../subject-views/__loopgate__/negativeControlWeek.tsx";
import type { LegacyShellRegistry } from "./registry.ts";

// vite define 주입(평시 false → dead-branch tree-shake). S3 loop-gate RED 빌드만 true.
declare const __S3_LOOP_NEG_CTRL__: boolean;
// S3b loop-gate negative control 플래그(평시 false → tree-shake).
declare const __S3B_LOOP_NEG_CTRL_A__: boolean;
declare const __S3B_LOOP_NEG_CTRL_B__: boolean;
// S4a loop-gate negative control 플래그(평시 false → tree-shake).
declare const __S4A_LOOP_NEG_CTRL_A__: boolean;
declare const __S4A_LOOP_NEG_CTRL_B__: boolean;
// S4b-1 loop-gate negative control 플래그(평시 false → tree-shake).
declare const __S4B_LOOP_NEG_CTRL_A__: boolean;
declare const __S4B_LOOP_NEG_CTRL_B__: boolean;

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

  const HomePortal = __S3_LOOP_NEG_CTRL__ ? NegativeControlHomeIslandPortal : HomeIslandPortal;
  const IntakePortal = __S3_LOOP_NEG_CTRL__ ? NegativeControlIntakeIslandPortal : IntakeIslandPortal;

  // S3b sidebar portal 선택: neg-ctrl-A/B 빌드에서만 교체, 평시 = SidebarIslandPortal.
  const SidebarPortal = __S3B_LOOP_NEG_CTRL_A__
    ? NegativeControlSidebarIslandPortalA
    : __S3B_LOOP_NEG_CTRL_B__
      ? NegativeControlSidebarIslandPortalB
      : SidebarIslandPortal;

  // S4a summaries portal 선택: neg-ctrl-A/B 빌드에서만 교체, 평시 = SubjectSummariesIslandPortal.
  const SummariesPortal = __S4A_LOOP_NEG_CTRL_A__
    ? NegativeControlSubjectSummariesIslandPortalA
    : __S4A_LOOP_NEG_CTRL_B__
      ? NegativeControlSubjectSummariesIslandPortalB
      : SubjectSummariesIslandPortal;

  // S4b-1 week portal 선택: neg-ctrl-A/B 빌드에서만 교체, 평시 = WeekIslandPortal.
  const WeekPortal = __S4B_LOOP_NEG_CTRL_A__
    ? NegativeControlWeekIslandPortalA
    : __S4B_LOOP_NEG_CTRL_B__
      ? NegativeControlWeekIslandPortalB
      : WeekIslandPortal;

  return (
    <>
      <LegacyView route={route} registry={registry} />
      <PdfToolbarPortal subjectId={pdfSubjectId} registry={registry} />
      <HomePortal />
      <IntakePortal />
      <SidebarPortal />
      <SummariesPortal />
      <SubjectSummaryDetailIslandPortal />
      <SubjectMcpIslandPortal />
      <SubjectMemorizeIslandPortal />
      <WeekPortal />
    </>
  );
}
