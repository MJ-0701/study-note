// sprint-2026-W22-sprint-20 / layer D/slice-2 — auth boot lifecycle module.
// Owns 6 module-private mutable state + 8 runtime fn (5 lifecycle + 1 sync
// expiry one-shot + 2 sign-in/sign-out primitives). Ambient identity
// (authSession / authMode / loginFeedback) 는 main.ts 잔류 — ctx getter 로
// read, callback 으로 set.
//
// invariant:
//   (a) requestId monotonic — beginAuthBootRequest / cancelAuthBootRequest /
//       markSignOut 마다 +1, async resolve + timer fire 모두 stale guard.
//   (b) PII no-log — module body 내 production logging 사용 금지. setDatadogRumUser
//       callback 의 인자는 `{ id, role }` 두 field 만 (studentNumber /
//       displayName / email / cookie / raw payload 절대 emit X).
//   (c) cross-domain reset 위임 — sidebar cache / userNotes sync / annotation
//       cache / hotkey modal / PDF blob URL 등은 module 이 직접 접근 X.
//       lifecycle fn 이 callback `clearCrossDomainSession()` 으로만 위임.
//   (d) defense in depth (401/403/parse-invalid attached-session) —
//       revalidate 가 호출되는 일반 시점은 authSession=undefined 이지만,
//       runtime export 이므로 attached-session 시점 호출 가능성을 흡수.
//       attached 면 clearCrossDomainSession + clearDatadogRumUser 도 호출.
//   (e) sync expiry one-shot — `authExpiryHandled` 가 true 일 때 추가 호출
//       모두 no-op. session 새로 attach 되면 false 로 reset (main.ts wiring).
//   (f) catch 절 PII no-log — error.message / stack / network 정보를 console
//       또는 RUM 으로 emit 하지 않음.
//
// state transition contract (T1~T14, plan §4.1.3 참조):
//   T1  beginAuthBootRequest(blocking=true)  : requestId+1, state="checking",
//       notice="checking", noticeTimer set.
//   T2  beginAuthBootRequest(blocking=false) : requestId+1, state="ready",
//       notice="checking", timer 없음.
//   T3  noticeTimer fire & state="checking" & requestId match
//       : notice→"waking", triggerRender.
//   T4  noticeTimer fire & requestId mismatch : no-op (stale fire).
//   T5  cancelAuthBootRequest()              : requestId+1, state="ready",
//       notice="checking", timer clear.
//   T6  markSignOut()                        : requestId+1, timer clear (state/notice 그대로).
//   T7  scheduleAuthBootRetry(attempt < MAX) : state=mode-based,
//       notice="waking"(blocking)/"checking"(non-blocking), retryTimer set.
//   T8  scheduleAuthBootRetry(attempt ≥ MAX) : state=mode-based,
//       notice="retryable"(blocking)/"checking"(non-blocking), no retryTimer.
//   T9  revalidate resolve & requestId mismatch : no-op (stale response).
//   T10 revalidate 500           : noticeTimer clear → scheduleAuthBootRetry.
//   T11a revalidate 401/403/parse-invalid & pre-session (authSession=undefined)
//       : setAuthSession(undefined), clearAuthSessionHint, state="ready",
//         notice="checking", timer clear.
//   T11b revalidate 401/403/parse-invalid & attached-session (defense in depth)
//       : clearCrossDomainSession() + clearDatadogRumUser() + setAuthSession(undefined)
//         + clearAuthSessionHint, state="ready", notice="checking", timer clear.
//   T12 revalidate success       : authExpiryHandled=false,
//       applySessionTransition, restoreUploadedPdfMaterials, requestId
//       재확인, loginFeedback=undefined, state="ready", notice="checking",
//       loadSidebarTermsCache, triggerRender.
//   T13 revalidate catch (network/timeout/abort) & requestId match
//       : timer clear, scheduleAuthBootRetry (authSession 미변경, no log).
//   T14 revalidate catch & requestId mismatch : no-op (stale throw).

import {
  parseAuthMePayload,
  requestAuthMe
} from "./authApi";
import {
  meResponseToSession,
  type AuthMode,
  type AuthSession,
  type LoginFeedback
} from "./authSession";
import {
  clearAuthSessionHint,
  getAuthBootRetryNotice,
  getAuthBootStateForMode,
  readAuthSessionHint,
  writeAuthSessionHint,
  type AuthBootNotice,
  type AuthBootState
} from "./sessionBoot";

export const AUTH_SESSION_WAKE_NOTICE_DELAY_MS = 2500;
// ACA scale-to-zero cold start can take ~30s on first hit. Keep the per-request
// timeout above that so /v1/auth/me does not abort prematurely; the "waking"
// banner already shows after AUTH_SESSION_WAKE_NOTICE_DELAY_MS so the user sees
// progress while we wait.
export const AUTH_SESSION_REQUEST_TIMEOUT_MS = 45000;
export const AUTH_SESSION_RETRY_DELAY_MS = 3000;
export const AUTH_SESSION_MAX_AUTO_RETRIES = 3;

export interface AuthSessionStateContext {
  readonly apiBaseUrl: string;
  getAuthSession(): AuthSession | undefined;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export interface AuthSessionStateCallbacks {
  setAuthSession(session: AuthSession | undefined): void;
  setAuthMode(mode: AuthMode): void;
  setLoginFeedback(feedback: LoginFeedback): void;
  clearCrossDomainSession(): void;
  applySessionTransition(userId: string): void;
  restoreUploadedPdfMaterials(session: AuthSession): Promise<void>;
  setDatadogRumUser(user: { id: string; role: string }): void;
  clearDatadogRumUser(): void;
  loadSidebarTermsCache(): Promise<void>;
  triggerRender(): void;
}

let authBootState: AuthBootState = getInitialBootState();
let authBootNotice: AuthBootNotice = "checking";
let authBootRequestId = 0;
let authBootNoticeTimer: ReturnType<typeof setTimeout> | undefined;
let authBootRetryTimer: ReturnType<typeof setTimeout> | undefined;
let authExpiryHandled = false;

function getInitialBootState(): AuthBootState {
  if (typeof window === "undefined") {
    return "ready";
  }
  try {
    return readAuthSessionHint() ? "checking" : "ready";
  } catch {
    return "ready";
  }
}

function getSetTimeout(ctx: AuthSessionStateContext): typeof setTimeout {
  return ctx.setTimeoutFn ?? setTimeout;
}

function getClearTimeout(ctx: AuthSessionStateContext): typeof clearTimeout {
  return ctx.clearTimeoutFn ?? clearTimeout;
}

export function getAuthBootStateValue(): AuthBootState {
  return authBootState;
}

export function getAuthBootNoticeValue(): AuthBootNotice {
  return authBootNotice;
}

export function clearAuthBootTimers(ctx: AuthSessionStateContext): void {
  const clearFn = getClearTimeout(ctx);
  if (authBootNoticeTimer) {
    clearFn(authBootNoticeTimer);
    authBootNoticeTimer = undefined;
  }
  if (authBootRetryTimer) {
    clearFn(authBootRetryTimer);
    authBootRetryTimer = undefined;
  }
}

export function cancelAuthBootRequest(ctx: AuthSessionStateContext): void {
  authBootRequestId += 1;
  clearAuthBootTimers(ctx);
  authBootState = "ready";
  authBootNotice = "checking";
}

export function beginAuthBootRequest(
  ctx: AuthSessionStateContext,
  cb: AuthSessionStateCallbacks,
  options: { blocking: boolean }
): number {
  const requestId = authBootRequestId + 1;
  authBootRequestId = requestId;
  clearAuthBootTimers(ctx);
  authBootState = getAuthBootStateForMode(options.blocking);
  authBootNotice = "checking";
  cb.triggerRender();

  if (!options.blocking) {
    return requestId;
  }

  const setFn = getSetTimeout(ctx);
  authBootNoticeTimer = setFn(() => {
    if (authBootState !== "checking" || requestId !== authBootRequestId) {
      return;
    }
    authBootNotice = "waking";
    cb.triggerRender();
  }, AUTH_SESSION_WAKE_NOTICE_DELAY_MS);

  return requestId;
}

export function scheduleAuthBootRetry(
  ctx: AuthSessionStateContext,
  cb: AuthSessionStateCallbacks,
  attempt: number,
  options: { blocking: boolean }
): void {
  // sprint-W22-sprint-20 Gate 6 self R2 P1: 5xx / network catch 는 transient
  // 이므로 attached session 을 보존한다. invariant: T7/T8/T13 = identity
  // unchanged. 식별자 무효화는 T11 (401/403/parse-invalid) 만 책임.
  authBootState = getAuthBootStateForMode(options.blocking);

  if (attempt >= AUTH_SESSION_MAX_AUTO_RETRIES) {
    authBootNotice = getAuthBootRetryNotice(options.blocking, true);
    cb.triggerRender();
    return;
  }

  authBootNotice = getAuthBootRetryNotice(options.blocking, false);
  cb.triggerRender();
  const setFn = getSetTimeout(ctx);
  // sprint-W22-sprint-20 Gate 6 cross R1 F1: retryTimer stale-fire guard
  // (defense in depth). cancelAuthBootRequest / markSignOut 가 timer 를 clear
  // 하지만, fake timer scenario / 비동기 race 에서 stale fire 가능성을 흡수.
  const scheduledRequestId = authBootRequestId;
  authBootRetryTimer = setFn(() => {
    if (scheduledRequestId !== authBootRequestId) {
      return;
    }
    void revalidateStoredSession(ctx, cb, {
      attempt: attempt + 1,
      blocking: options.blocking
    });
  }, AUTH_SESSION_RETRY_DELAY_MS);
}

function applyAuthFailureCleanup(
  ctx: AuthSessionStateContext,
  cb: AuthSessionStateCallbacks
): void {
  // T11a / T11b — pre-session 시점에는 attached 분기가 no-op 로 끝남.
  // attached 시점에는 cross-domain reset + RUM clear (defense in depth).
  if (ctx.getAuthSession() !== undefined) {
    cb.clearCrossDomainSession();
    cb.clearDatadogRumUser();
  }
  cb.setAuthSession(undefined);
  clearAuthSessionHint();
  authBootState = "ready";
  authBootNotice = "checking";
}

export async function revalidateStoredSession(
  ctx: AuthSessionStateContext,
  cb: AuthSessionStateCallbacks,
  options: { attempt?: number; blocking?: boolean } = {}
): Promise<void> {
  const attempt = options.attempt ?? 0;
  const blocking = options.blocking ?? readAuthSessionHint();
  const requestId = beginAuthBootRequest(ctx, cb, { blocking });

  try {
    const response = await requestAuthMe(ctx.apiBaseUrl, AUTH_SESSION_REQUEST_TIMEOUT_MS);

    if (requestId !== authBootRequestId) {
      return;
    }

    clearAuthBootTimers(ctx);

    if (!response.ok) {
      if (response.status >= 500) {
        scheduleAuthBootRetry(ctx, cb, attempt, { blocking });
        return;
      }
      applyAuthFailureCleanup(ctx, cb);
      cb.triggerRender();
      return;
    }

    const payload = parseAuthMePayload(await response.json());

    if (!payload) {
      applyAuthFailureCleanup(ctx, cb);
      cb.triggerRender();
      return;
    }

    const session = meResponseToSession(payload);
    cb.setAuthSession(session);
    writeAuthSessionHint();
    cb.setDatadogRumUser({
      id: session.user.id,
      role: session.user.role
    });
    authExpiryHandled = false;
    cb.applySessionTransition(session.user.id);
    await cb.restoreUploadedPdfMaterials(session);
    if (requestId !== authBootRequestId) {
      return;
    }
    cb.setLoginFeedback(undefined);
    authBootState = "ready";
    authBootNotice = "checking";
    void cb.loadSidebarTermsCache().then(() => cb.triggerRender());
    cb.triggerRender();
  } catch {
    if (requestId !== authBootRequestId) {
      return;
    }
    clearAuthBootTimers(ctx);
    scheduleAuthBootRetry(ctx, cb, attempt, { blocking });
  }
}

export function handleAuthExpiredFromSync(
  ctx: AuthSessionStateContext,
  cb: AuthSessionStateCallbacks
): void {
  if (authExpiryHandled) {
    return;
  }
  authExpiryHandled = true;
  clearAuthSessionHint();
  authBootRequestId += 1;
  clearAuthBootTimers(ctx);
  cb.clearCrossDomainSession();
  cb.clearDatadogRumUser();
  cb.setAuthSession(undefined);
  cb.setAuthMode("login");
  cb.setLoginFeedback({
    kind: "error",
    title: "세션이 만료되었습니다.",
    detail: "자동 저장이 중단되어 다시 로그인이 필요합니다."
  });
  cb.triggerRender();
}

export function markSignInSuccess(ctx: AuthSessionStateContext): void {
  authExpiryHandled = false;
  authBootState = "ready";
  authBootNotice = "checking";
  clearAuthBootTimers(ctx);
}

export function markSignOut(ctx: AuthSessionStateContext): void {
  authBootRequestId += 1;
  clearAuthBootTimers(ctx);
}

export function __resetAuthBootStateForTesting__(): void {
  authBootState = "ready";
  authBootNotice = "checking";
  authBootRequestId = 0;
  authBootNoticeTimer = undefined;
  authBootRetryTimer = undefined;
  authExpiryHandled = false;
}

export function __getAuthBootStateForTesting__(): AuthBootState {
  return authBootState;
}

export function __getAuthBootNoticeForTesting__(): AuthBootNotice {
  return authBootNotice;
}

export function __getAuthBootRequestIdForTesting__(): number {
  return authBootRequestId;
}
