// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — legacy 렌더를 React tree
// 안으로 bridge 하는 컨테이너.
//
// 설계 (roadmap §1/§3 + advisor):
// - React 는 #app 을 소유하고 LegacyView 는 *단일 컨테이너 div* 만 렌더한다.
//   컨테이너 children 은 morphdom(legacy renderApp) 이 소유 — React 는 JSX
//   children 을 절대 렌더하지 않는다(렌더하면 morphdom DOM 을 wipe → canvas/
//   필기 소실 = INV-2 위반). 그래서 children 없는 leaf div + 고정 위치.
// - 컨테이너는 display:contents 로 layout-transparent → 기존 CSS(.app-shell /
//   .main-area / #app{min-width:0})의 box model 이 그대로 유지 (시각 무변경).
// - route 변경 = renderApp() 재호출 (legacy 가 location.hash 를 self-parse).
//   route prop 은 변경 감지 trigger 로만 쓰인다.
import { useEffect, useRef } from "react";
import type { Route } from "../routes.ts";
import type { LegacyShellRegistry } from "./registry.ts";

function serializeRoute(route: Route): string {
  // Route 는 작은 discriminated union — 안정적 직렬화로 effect dep 사용.
  return JSON.stringify(route);
}

export function LegacyView({
  route,
  registry
}: {
  route: Route;
  registry: LegacyShellRegistry;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const booted = useRef(false);

  // mount-once: 렌더 대상 bind → 최초 legacy 렌더 → boot revalidate.
  // useEffect(passive)는 commit/paint 이후 실행되므로 main.ts 모듈 eval 이
  // 완전히 끝난 뒤(L3793+ widget ctx const init 완료) 호출된다 → 기존
  // queueMicrotask 가 회피하던 TDZ ("Cannot access 'tableWidgetContext'…")를
  // 동일하게 회피한다.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    registry.setLegacyRenderTarget(el);
    registry.renderApp();
    registry.revalidateOnBoot();
    booted.current = true;
  }, [registry]);

  // route 변경 → transient overlay 정리 + 재렌더. 최초 mount 는 위 effect 가
  // 이미 렌더했으므로 skip.
  const routeKey = serializeRoute(route);
  useEffect(() => {
    if (!booted.current) {
      return;
    }
    registry.closeTransientOverlays();
    registry.renderApp();
  }, [routeKey, registry]);

  // dangerouslySetInnerHTML={{ __html: "" }} = "이 subtree 는 외부(morphdom)가
  // 소유한다"는 React 명시 신호. React 는 children 재조정을 건너뛰고, __html 값이
  // 안 바뀌면(항상 "") 재커밋 시 DOM 을 건드리지 않는다 → morphdom 이 채운
  // canvas/ink/scroll 이 route 변경 re-render 에도 보존된다 (INV-2 contract-level
  // 보장. empty-children 보다 명시적 — Gemini cross-review P1 반영).
  return (
    <div
      id="legacy-app-root"
      style={{ display: "contents" }}
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: "" }}
    />
  );
}
