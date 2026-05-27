// sprint-2026-W22-sprint-21 / layer D/slice-3 — sidebar term cache module.
// Owns 3 module-private mutable state + 3 lifecycle fn + 3 getter + 1 clear.
// ambient identity (authSession) 는 main.ts 잔류 — ctx getter 로 read.
//
// invariant:
//   (a) race guard — load 호출 시 시작 userId 캡처. async await 두 번 모두 후
//       + catch 절 모두 현재 userId 와 비교. user A→B 전환 race 차단.
//   (b) fetch fail (4xx/5xx/network) 시 cache 를 빈 array 로 채우지 않음.
//       null 유지 → sidebar flat fallback. 다음 trigger 가 retry.
//   (c) localStorage error 처리 — refresh getItem + toggle getItem/setItem
//       각각 try/catch + silent skip. in-memory state 는 유지.
//   (d) PII no-log — module body 내 production logging 사용 금지.
//   (e) clearSidebarCache = 3 state 모두 null/empty 초기화. session reset 시
//       caller (main.ts.clearAuthSession + applySessionTransitionForUser) 가 호출.
//
// state transition contract (T1~T7):
//   T1 loadSidebarTermsCache & getAuthSession()=undefined : early return (no fetch).
//   T2 loadSidebarTermsCache success (200+200+userId 일치) : termsCache + subjectsCache
//      write + refreshSidebarOpenTermIds 호출.
//   T3 loadSidebarTermsCache race (userId 중간에 바뀜) : discard. cache 미변경.
//   T4 loadSidebarTermsCache 4xx/5xx 또는 network throw : cache null 유지.
//   T5 refreshSidebarOpenTermIds prerequisite (userId + 2 cache 모두 존재)
//      : groupSubjectsByTerm → resolveOpenTermIds → sidebarOpenTermIds write.
//   T6 toggleSidebarTermOpen : in-memory toggle + localStorage persist (try/catch)
//      + triggerRender.
//   T7 clearSidebarCache : 3 state null/empty 초기화.

import {
  getDefaultOpenTermIds,
  groupSubjectsByTerm,
  parseStoredOpenState,
  resolveOpenTermIds,
  sidebarTermOpenStorageKey,
  type SidebarSubject,
  type SidebarTerm
} from "./term-grouping";
import { type AuthSession } from "../auth/authSession";

export interface SidebarCacheContext {
  readonly apiBaseUrl: string;
  getAuthSession(): AuthSession | undefined;
  readonly isBrowserRuntime: boolean;
}

export interface SidebarCacheCallbacks {
  triggerRender(): void;
}

let sidebarTermsCache: SidebarTerm[] | null = null;
let sidebarSubjectsCache: SidebarSubject[] | null = null;
let sidebarOpenTermIds: Set<string> = new Set();

export function getSidebarTermsCache(): SidebarTerm[] | null {
  return sidebarTermsCache;
}

export function getSidebarSubjectsCache(): SidebarSubject[] | null {
  return sidebarSubjectsCache;
}

export function getSidebarOpenTermIds(): Set<string> {
  return sidebarOpenTermIds;
}

export function clearSidebarCache(): void {
  sidebarTermsCache = null;
  sidebarSubjectsCache = null;
  sidebarOpenTermIds = new Set();
}

// PR #49 codex Round-1 P1 fix: user A 의 fetch 가 resolve 되는 사이 user B 로
// 로그인 전환되면 stale response 가 cache 를 오염시킴. capture user 후 await,
// resolve 시점에 authSession.user.id 가 여전히 동일한지 확인 후에만 write.
export async function loadSidebarTermsCache(
  ctx: SidebarCacheContext,
  cb: SidebarCacheCallbacks
): Promise<void> {
  const userIdAtStart = ctx.getAuthSession()?.user.id;
  if (!userIdAtStart) return;
  try {
    const [termsRes, subjectsRes] = await Promise.all([
      fetch(`${ctx.apiBaseUrl}/v1/terms`, { credentials: "include" }),
      fetch(`${ctx.apiBaseUrl}/v1/subjects`, { credentials: "include" })
    ]);
    // race guard 1 — A 응답이 B 세션에 쓰이지 않게.
    if (ctx.getAuthSession()?.user.id !== userIdAtStart) return;
    // PR #49 codex R2 P2 — fetch fail 시 cache 를 빈 array 로 "loaded" 표시
    // 하면 sidebar 가 grouped (orphan) 로 영구 전환됨. flat fallback 유지.
    if (!termsRes.ok || !subjectsRes.ok) {
      return;
    }
    const termsJson = (await termsRes.json()) as Array<{
      id: string;
      grade: number;
      semester: number;
      title: string;
      startDate: string | null;
      endDate: string | null;
    }>;
    const subjectsJson = (await subjectsRes.json()) as Array<{
      id: string;
      title: string;
      termId: string | null;
    }>;
    // race guard 2 — await json 사이 race 가능.
    if (ctx.getAuthSession()?.user.id !== userIdAtStart) return;
    sidebarTermsCache = termsJson.map((t) => ({
      id: t.id,
      grade: t.grade,
      semester: t.semester,
      title: t.title,
      startDate: t.startDate ?? null,
      endDate: t.endDate ?? null
    }));
    sidebarSubjectsCache = subjectsJson.map((s) => ({
      id: s.id,
      title: s.title,
      termId: s.termId ?? null
    }));
    refreshSidebarOpenTermIds(ctx);
    cb.triggerRender();
  } catch {
    // race guard 3 — catch 절도 보호.
    if (ctx.getAuthSession()?.user.id !== userIdAtStart) return;
    // PR #49 codex R2 P2 — 네트워크 error 도 cache 를 빈 array 로 채우지 않음.
  }
}

export function refreshSidebarOpenTermIds(ctx: SidebarCacheContext): void {
  const userId = ctx.getAuthSession()?.user.id;
  if (!userId || !sidebarTermsCache || !sidebarSubjectsCache) return;
  const groups = groupSubjectsByTerm(sidebarSubjectsCache, sidebarTermsCache);
  const defaults = getDefaultOpenTermIds(groups, new Date().toISOString());
  // PR #49 codex R5 P2 — localStorage getItem SecurityError 보호.
  let stored: Record<string, boolean> = {};
  if (ctx.isBrowserRuntime) {
    try {
      stored = parseStoredOpenState(window.localStorage.getItem(sidebarTermOpenStorageKey(userId)));
    } catch {
      stored = {};
    }
  }
  sidebarOpenTermIds = resolveOpenTermIds(groups, defaults, stored);
}

export function toggleSidebarTermOpen(
  ctx: SidebarCacheContext,
  cb: SidebarCacheCallbacks,
  termId: string
): void {
  const userId = ctx.getAuthSession()?.user.id;
  if (!userId || !ctx.isBrowserRuntime) return;
  const next = !sidebarOpenTermIds.has(termId);
  if (next) sidebarOpenTermIds.add(termId);
  else sidebarOpenTermIds.delete(termId);
  // PR #49 codex R3 P2 — localStorage quota / private window / safari ITP 등
  // throw 가능. in-memory state 는 갱신되었으므로 persist 실패해도 UI 동작 유지.
  try {
    const key = sidebarTermOpenStorageKey(userId);
    const stored = parseStoredOpenState(window.localStorage.getItem(key));
    stored[termId] = next;
    window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // localStorage unavailable / quota — silent skip.
  }
  cb.triggerRender();
}

export function __resetSidebarCacheForTesting__(): void {
  sidebarTermsCache = null;
  sidebarSubjectsCache = null;
  sidebarOpenTermIds = new Set();
}

export function __seedSidebarCacheForTesting__(
  terms: SidebarTerm[] | null,
  subjects: SidebarSubject[] | null,
  openIds: Set<string>
): void {
  sidebarTermsCache = terms;
  sidebarSubjectsCache = subjects;
  sidebarOpenTermIds = openIds;
}

export function __getSidebarTermsCacheForTesting__(): SidebarTerm[] | null {
  return sidebarTermsCache;
}

export function __getSidebarOpenTermIdsForTesting__(): Set<string> {
  return sidebarOpenTermIds;
}
