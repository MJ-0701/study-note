// sprint-2026-W22-sprint-20 / layer D/slice-2 — auth boot lifecycle spec.
// T1~T14 transition 1:1 매핑 + edge.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/auth/sessionState.spec.ts

import assert from "node:assert/strict";
import { register } from "node:module";
import { afterEach, beforeEach, describe, it } from "node:test";

// sprint-W22-sprint-20: production sources import siblings without `.ts`
// (vite resolves). Node's strip-types loader needs the extension — register
// a resolve hook that auto-appends `.ts` for relative imports.
register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, nextResolve) {
        try { return await nextResolve(specifier, context); }
        catch (error) {
          const withoutQuery = specifier.split(/[?#]/, 1)[0] ?? specifier;
          if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.[A-Za-z0-9]+$/.test(withoutQuery)) {
            return nextResolve(specifier + ".ts", context);
          }
          throw error;
        }
      }
    `),
  import.meta.url
);

// Dynamic import after register hook is active (static imports would hoist
// above register and miss the resolver).
const sessionStateMod = await import("./sessionState.ts");
const sessionBootMod = await import("./sessionBoot.ts");
type AuthMode = (typeof import("./authSession.ts"))["meResponseToSession"] extends (...args: unknown[]) => infer R
  ? R extends { user: infer U } ? string : string
  : string;
type AuthSession = {
  user: { id: string; displayName: string; studentNumber: string; role: string; email?: string };
};
type LoginFeedback =
  | { kind: "error" | "success"; title: string; detail: string }
  | undefined;

const {
  AUTH_SESSION_MAX_AUTO_RETRIES,
  AUTH_SESSION_REQUEST_TIMEOUT_MS,
  AUTH_SESSION_RETRY_DELAY_MS,
  AUTH_SESSION_WAKE_NOTICE_DELAY_MS,
  __getAuthBootNoticeForTesting__,
  __getAuthBootRequestIdForTesting__,
  __getAuthBootStateForTesting__,
  __resetAuthBootStateForTesting__,
  beginAuthBootRequest,
  cancelAuthBootRequest,
  clearAuthBootTimers,
  getAuthBootNoticeValue,
  getAuthBootStateValue,
  handleAuthExpiredFromSync,
  markSignInSuccess,
  markSignOut,
  revalidateStoredSession,
  scheduleAuthBootRetry
} = sessionStateMod;
type AuthSessionStateContext = sessionStateMod.AuthSessionStateContext;
type AuthSessionStateCallbacks = sessionStateMod.AuthSessionStateCallbacks;
const { AUTH_SESSION_HINT_STORAGE_KEY } = sessionBootMod;

const TEST_API_BASE = "https://test.invalid/api";
const VALID_AUTH_ME = {
  userId: "user-1",
  studentNumber: "20251234",
  name: "테스트",
  role: "STUDENT"
};

interface ScheduledTimer {
  id: number;
  fn: () => void;
  delay: number;
  cleared: boolean;
}

interface FakeTimerHandle {
  setTimeoutFn: typeof setTimeout;
  clearTimeoutFn: typeof clearTimeout;
  timers: ScheduledTimer[];
  fireAll(): void;
  fireById(id: number): void;
}

function createFakeTimer(): FakeTimerHandle {
  const timers: ScheduledTimer[] = [];
  let nextId = 1;
  const handle: FakeTimerHandle = {
    setTimeoutFn: ((fn: () => void, delay: number) => {
      const id = nextId++;
      timers.push({ id, fn, delay, cleared: false });
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout,
    clearTimeoutFn: ((id: ReturnType<typeof setTimeout>) => {
      const numId = id as unknown as number;
      const t = timers.find((entry) => entry.id === numId);
      if (t) {
        t.cleared = true;
      }
    }) as typeof clearTimeout,
    timers,
    fireAll(): void {
      for (const t of timers) {
        if (!t.cleared) {
          t.cleared = true;
          t.fn();
        }
      }
    },
    fireById(id: number): void {
      const t = timers.find((entry) => entry.id === id);
      if (t && !t.cleared) {
        t.cleared = true;
        t.fn();
      }
    }
  };
  return handle;
}

interface CallbackLog {
  setAuthSessionCalls: Array<AuthSession | undefined>;
  setAuthModeCalls: string[];
  setLoginFeedbackCalls: LoginFeedback[];
  clearCrossDomainSessionCount: number;
  applySessionTransitionCalls: string[];
  restoreUploadedPdfMaterialsCalls: AuthSession[];
  setDatadogRumUserCalls: Array<{ id: string; role: string }>;
  clearDatadogRumUserCount: number;
  loadSidebarTermsCacheCount: number;
  triggerRenderCount: number;
}

interface Harness {
  ctx: AuthSessionStateContext;
  cb: AuthSessionStateCallbacks;
  log: CallbackLog;
  timer: FakeTimerHandle;
  setAuthSessionState(session: AuthSession | undefined): void;
  setFetchSequence(responses: Array<() => Promise<Response>>): void;
  fetchCalls(): number;
  restoreFetch(): void;
}

function createHarness(): Harness {
  const log: CallbackLog = {
    setAuthSessionCalls: [],
    setAuthModeCalls: [],
    setLoginFeedbackCalls: [],
    clearCrossDomainSessionCount: 0,
    applySessionTransitionCalls: [],
    restoreUploadedPdfMaterialsCalls: [],
    setDatadogRumUserCalls: [],
    clearDatadogRumUserCount: 0,
    loadSidebarTermsCacheCount: 0,
    triggerRenderCount: 0
  };

  let currentSession: AuthSession | undefined;
  const timer = createFakeTimer();

  const ctx: AuthSessionStateContext = {
    apiBaseUrl: TEST_API_BASE,
    getAuthSession: () => currentSession,
    setTimeoutFn: timer.setTimeoutFn,
    clearTimeoutFn: timer.clearTimeoutFn
  };

  const cb: AuthSessionStateCallbacks = {
    setAuthSession(session) {
      currentSession = session;
      log.setAuthSessionCalls.push(session);
    },
    setAuthMode(mode) {
      log.setAuthModeCalls.push(mode);
    },
    setLoginFeedback(feedback) {
      log.setLoginFeedbackCalls.push(feedback);
    },
    clearCrossDomainSession() {
      log.clearCrossDomainSessionCount += 1;
    },
    applySessionTransition(userId) {
      log.applySessionTransitionCalls.push(userId);
    },
    async restoreUploadedPdfMaterials(session) {
      log.restoreUploadedPdfMaterialsCalls.push(session);
    },
    setDatadogRumUser(user) {
      log.setDatadogRumUserCalls.push(user);
    },
    clearDatadogRumUser() {
      log.clearDatadogRumUserCount += 1;
    },
    async loadSidebarTermsCache() {
      log.loadSidebarTermsCacheCount += 1;
    },
    triggerRender() {
      log.triggerRenderCount += 1;
    }
  };

  let fetchSeq: Array<() => Promise<Response>> = [];
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;

  return {
    ctx,
    cb,
    log,
    timer,
    setAuthSessionState(session) {
      currentSession = session;
    },
    setFetchSequence(responses) {
      fetchSeq = responses;
      fetchCount = 0;
      globalThis.fetch = (async () => {
        const r = fetchSeq[fetchCount];
        fetchCount += 1;
        if (!r) {
          throw new Error("no more fetch responses queued");
        }
        return r();
      }) as typeof fetch;
    },
    fetchCalls() {
      return fetchCount;
    },
    restoreFetch() {
      globalThis.fetch = originalFetch;
    }
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function setupHintStorage(set: boolean): { restore(): void } {
  const original = (globalThis as { localStorage?: Storage }).localStorage;
  const data = new Map<string, string>();
  if (set) {
    data.set(AUTH_SESSION_HINT_STORAGE_KEY, "1");
  }
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
    clear: () => data.clear(),
    key: () => null,
    length: 0
  } as Storage;
  return {
    restore(): void {
      if (original === undefined) {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      } else {
        (globalThis as { localStorage?: Storage }).localStorage = original;
      }
    }
  };
}

describe("auth/sessionState — boot lifecycle (sprint-W22-sprint-20)", () => {
  let harness: Harness;
  let hintGuard: { restore(): void };

  beforeEach(() => {
    __resetAuthBootStateForTesting__();
    harness = createHarness();
    hintGuard = setupHintStorage(false);
  });

  afterEach(() => {
    harness.restoreFetch();
    hintGuard.restore();
  });

  it("T1: beginAuthBootRequest(blocking=true) sets state=checking + notice=checking + noticeTimer + requestId++", () => {
    const reqId = beginAuthBootRequest(harness.ctx, harness.cb, { blocking: true });
    assert.equal(reqId, 1);
    assert.equal(__getAuthBootRequestIdForTesting__(), 1);
    assert.equal(__getAuthBootStateForTesting__(), "checking");
    assert.equal(__getAuthBootNoticeForTesting__(), "checking");
    assert.equal(harness.timer.timers.length, 1);
    assert.equal(harness.timer.timers[0]!.delay, AUTH_SESSION_WAKE_NOTICE_DELAY_MS);
    assert.equal(harness.timer.timers[0]!.cleared, false);
    assert.equal(harness.log.triggerRenderCount, 1);
  });

  it("T2: beginAuthBootRequest(blocking=false) sets state=ready + notice=checking + no timer", () => {
    beginAuthBootRequest(harness.ctx, harness.cb, { blocking: false });
    assert.equal(__getAuthBootStateForTesting__(), "ready");
    assert.equal(__getAuthBootNoticeForTesting__(), "checking");
    assert.equal(harness.timer.timers.length, 0);
  });

  it("T3: noticeTimer fire (state=checking + matching requestId) → notice=waking + triggerRender", () => {
    beginAuthBootRequest(harness.ctx, harness.cb, { blocking: true });
    const renderBefore = harness.log.triggerRenderCount;
    harness.timer.fireById(1);
    assert.equal(__getAuthBootNoticeForTesting__(), "waking");
    assert.equal(harness.log.triggerRenderCount, renderBefore + 1);
  });

  it("T4: noticeTimer fire with mismatched requestId → no-op (stale fire ignored)", () => {
    beginAuthBootRequest(harness.ctx, harness.cb, { blocking: true });
    cancelAuthBootRequest(harness.ctx);
    const renderBefore = harness.log.triggerRenderCount;
    harness.timer.fireById(1);
    assert.equal(__getAuthBootNoticeForTesting__(), "checking");
    assert.equal(harness.log.triggerRenderCount, renderBefore);
  });

  it("T5: cancelAuthBootRequest → requestId++ + state=ready + notice=checking + timers clear", () => {
    beginAuthBootRequest(harness.ctx, harness.cb, { blocking: true });
    const idBefore = __getAuthBootRequestIdForTesting__();
    cancelAuthBootRequest(harness.ctx);
    assert.equal(__getAuthBootRequestIdForTesting__(), idBefore + 1);
    assert.equal(__getAuthBootStateForTesting__(), "ready");
    assert.equal(__getAuthBootNoticeForTesting__(), "checking");
    assert.equal(harness.timer.timers[0]!.cleared, true);
  });

  it("T6: markSignOut → requestId++ + timers cleared (state/notice 그대로)", () => {
    beginAuthBootRequest(harness.ctx, harness.cb, { blocking: true });
    const idBefore = __getAuthBootRequestIdForTesting__();
    const stateBefore = __getAuthBootStateForTesting__();
    const noticeBefore = __getAuthBootNoticeForTesting__();
    markSignOut(harness.ctx);
    assert.equal(__getAuthBootRequestIdForTesting__(), idBefore + 1);
    assert.equal(__getAuthBootStateForTesting__(), stateBefore);
    assert.equal(__getAuthBootNoticeForTesting__(), noticeBefore);
    assert.equal(harness.timer.timers[0]!.cleared, true);
  });

  it("T7: scheduleAuthBootRetry(attempt < MAX, blocking=true) → notice=waking + retryTimer set + identity 보존", () => {
    scheduleAuthBootRetry(harness.ctx, harness.cb, 0, { blocking: true });
    assert.equal(__getAuthBootStateForTesting__(), "checking");
    assert.equal(__getAuthBootNoticeForTesting__(), "waking");
    assert.equal(harness.timer.timers.length, 1);
    assert.equal(harness.timer.timers[0]!.delay, AUTH_SESSION_RETRY_DELAY_MS);
    // sprint-W22-sprint-20 Gate 6 self R2 P1: 5xx/retry path 는 attached session 보존.
    assert.equal(harness.log.setAuthSessionCalls.length, 0);
  });

  it("T8: scheduleAuthBootRetry(attempt >= MAX, blocking=true) → notice=retryable + no retryTimer", () => {
    scheduleAuthBootRetry(harness.ctx, harness.cb, AUTH_SESSION_MAX_AUTO_RETRIES, {
      blocking: true
    });
    assert.equal(__getAuthBootNoticeForTesting__(), "retryable");
    assert.equal(harness.timer.timers.length, 0);
  });

  it("T8 non-blocking: scheduleAuthBootRetry(attempt >= MAX, blocking=false) → notice=checking + state=ready", () => {
    scheduleAuthBootRetry(harness.ctx, harness.cb, AUTH_SESSION_MAX_AUTO_RETRIES, {
      blocking: false
    });
    assert.equal(__getAuthBootNoticeForTesting__(), "checking");
    assert.equal(__getAuthBootStateForTesting__(), "ready");
  });

  it("T9: revalidate resolve with mismatched requestId → no-op (stale response)", async () => {
    let resolveFetch: ((r: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    harness.setFetchSequence([() => pending]);
    const pendingCall = revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    cancelAuthBootRequest(harness.ctx);
    resolveFetch?.(jsonResponse(200, VALID_AUTH_ME));
    await pendingCall;
    assert.equal(harness.log.applySessionTransitionCalls.length, 0);
  });

  it("T10: revalidate 5xx → noticeTimer cleared → scheduleAuthBootRetry (retryTimer set)", async () => {
    harness.setFetchSequence([() => Promise.resolve(jsonResponse(503, {}))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    const retryTimer = harness.timer.timers.find((t) => t.delay === AUTH_SESSION_RETRY_DELAY_MS);
    assert.ok(retryTimer);
    assert.equal(retryTimer.cleared, false);
  });

  it("T10 attached-session: 5xx preserves attached session — no setAuthSession, no clearCrossDomain, no clearDatadogRumUser", async () => {
    harness.setAuthSessionState({
      user: { id: "u-keep", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    harness.setFetchSequence([() => Promise.resolve(jsonResponse(503, {}))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    assert.equal(harness.log.setAuthSessionCalls.length, 0);
    assert.equal(harness.log.clearCrossDomainSessionCount, 0);
    assert.equal(harness.log.clearDatadogRumUserCount, 0);
  });

  it("T7-stale-retry: scheduled retryTimer fires after cancelAuthBootRequest → no revalidate re-entry (defense in depth, Gate 6 cross R1 F1)", () => {
    scheduleAuthBootRetry(harness.ctx, harness.cb, 0, { blocking: true });
    // Snapshot retry timer id, then cancel mid-flight.
    const retryTimer = harness.timer.timers.find((t) => t.delay === AUTH_SESSION_RETRY_DELAY_MS);
    assert.ok(retryTimer);
    cancelAuthBootRequest(harness.ctx);
    // cancelAuthBootRequest already cleared the timer, but force-fire it anyway
    // to verify the in-callback requestId guard would have stopped it.
    const timerId = retryTimer.id;
    retryTimer.cleared = false;
    harness.timer.fireById(timerId);
    // No fetch should have been issued (revalidate would have called fetch).
    assert.equal(harness.fetchCalls(), 0);
  });

  it("T13 attached-session: catch preserves attached session — no setAuthSession, no clearCrossDomain, no clearDatadogRumUser", async () => {
    harness.setAuthSessionState({
      user: { id: "u-keep", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    harness.setFetchSequence([() => Promise.reject(new Error("net"))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    assert.equal(harness.log.setAuthSessionCalls.length, 0);
    assert.equal(harness.log.clearCrossDomainSessionCount, 0);
    assert.equal(harness.log.clearDatadogRumUserCount, 0);
  });

  it("T11a: revalidate 401 with pre-session → no cross-domain reset, setAuthSession(undefined)", async () => {
    harness.setFetchSequence([() => Promise.resolve(jsonResponse(401, {}))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    assert.equal(__getAuthBootStateForTesting__(), "ready");
    assert.equal(__getAuthBootNoticeForTesting__(), "checking");
    assert.equal(harness.log.setAuthSessionCalls.at(-1), undefined);
    assert.equal(harness.log.clearCrossDomainSessionCount, 0);
    assert.equal(harness.log.clearDatadogRumUserCount, 0);
  });

  it("T11b: revalidate 403 with attached-session → defense in depth (clearCrossDomainSession + clearDatadogRumUser)", async () => {
    harness.setAuthSessionState({
      user: { id: "u", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    harness.setFetchSequence([() => Promise.resolve(jsonResponse(403, {}))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    assert.equal(harness.log.clearCrossDomainSessionCount, 1);
    assert.equal(harness.log.clearDatadogRumUserCount, 1);
    assert.equal(harness.log.setAuthSessionCalls.at(-1), undefined);
  });

  it("T11 parse-invalid: revalidate 200 with broken payload → same path as 401/403", async () => {
    harness.setFetchSequence([() => Promise.resolve(jsonResponse(200, { broken: true }))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    assert.equal(__getAuthBootStateForTesting__(), "ready");
    assert.equal(harness.log.setAuthSessionCalls.at(-1), undefined);
  });

  it("T12: revalidate success → setAuthSession + applySessionTransition + restorePdf + RUM {id, role} only", async () => {
    harness.setFetchSequence([() => Promise.resolve(jsonResponse(200, VALID_AUTH_ME))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    assert.equal(harness.log.setAuthSessionCalls.length, 1);
    const setSession = harness.log.setAuthSessionCalls[0];
    assert.equal(setSession?.user.id, VALID_AUTH_ME.userId);
    assert.equal(harness.log.applySessionTransitionCalls.length, 1);
    assert.equal(harness.log.applySessionTransitionCalls[0], VALID_AUTH_ME.userId);
    assert.equal(harness.log.restoreUploadedPdfMaterialsCalls.length, 1);
    assert.equal(harness.log.setDatadogRumUserCalls.length, 1);
    const rumUser = harness.log.setDatadogRumUserCalls[0]!;
    assert.deepEqual(Object.keys(rumUser).sort(), ["id", "role"]);
    assert.equal(rumUser.id, VALID_AUTH_ME.userId);
    assert.equal(rumUser.role, VALID_AUTH_ME.role);
    assert.equal(__getAuthBootStateForTesting__(), "ready");
    assert.equal(__getAuthBootNoticeForTesting__(), "checking");
  });

  it("T13: revalidate catch (network throw) matching requestId → scheduleAuthBootRetry, no logging", async () => {
    harness.setFetchSequence([() => Promise.reject(new Error("network"))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    const retryTimer = harness.timer.timers.find(
      (t) => t.delay === AUTH_SESSION_RETRY_DELAY_MS && !t.cleared
    );
    assert.ok(retryTimer);
  });

  it("T14: revalidate catch with mismatched requestId → no-op (stale throw)", async () => {
    let rejectFetch: ((e: Error) => void) | undefined;
    const pending = new Promise<Response>((_resolve, reject) => {
      rejectFetch = reject;
    });
    harness.setFetchSequence([() => pending]);
    const pendingCall = revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    cancelAuthBootRequest(harness.ctx);
    rejectFetch?.(new Error("late"));
    await pendingCall;
    const retryTimerAfterCancel = harness.timer.timers.find(
      (t) => t.delay === AUTH_SESSION_RETRY_DELAY_MS && !t.cleared
    );
    assert.equal(retryTimerAfterCancel, undefined);
  });

  it("handleAuthExpiredFromSync one-shot — second call is no-op", () => {
    handleAuthExpiredFromSync(harness.ctx, harness.cb);
    assert.equal(harness.log.clearCrossDomainSessionCount, 1);
    assert.equal(harness.log.setAuthModeCalls.at(-1), "login");
    assert.equal(harness.log.setLoginFeedbackCalls.length, 1);
    handleAuthExpiredFromSync(harness.ctx, harness.cb);
    assert.equal(harness.log.clearCrossDomainSessionCount, 1);
  });

  it("markSignInSuccess resets authExpiryHandled (subsequent sync expiry can fire again)", () => {
    handleAuthExpiredFromSync(harness.ctx, harness.cb);
    markSignInSuccess(harness.ctx);
    handleAuthExpiredFromSync(harness.ctx, harness.cb);
    assert.equal(harness.log.clearCrossDomainSessionCount, 2);
  });

  it("clearAuthBootTimers clears both timers without bumping requestId", () => {
    beginAuthBootRequest(harness.ctx, harness.cb, { blocking: true });
    scheduleAuthBootRetry(harness.ctx, harness.cb, 0, { blocking: true });
    const idBefore = __getAuthBootRequestIdForTesting__();
    clearAuthBootTimers(harness.ctx);
    for (const t of harness.timer.timers) {
      assert.equal(t.cleared, true);
    }
    assert.equal(__getAuthBootRequestIdForTesting__(), idBefore);
  });

  it("AC10 PII no-log — revalidate success RUM user 인자에 studentNumber/displayName/email/name 부재", async () => {
    harness.setFetchSequence([() => Promise.resolve(jsonResponse(200, VALID_AUTH_ME))]);
    await revalidateStoredSession(harness.ctx, harness.cb, { blocking: true });
    for (const u of harness.log.setDatadogRumUserCalls) {
      assert.equal(Object.prototype.hasOwnProperty.call(u, "studentNumber"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(u, "displayName"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(u, "email"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(u, "name"), false);
    }
  });

  it("AUTH_SESSION_REQUEST_TIMEOUT_MS exported and exceeds ACA cold start 30s", () => {
    assert.equal(AUTH_SESSION_REQUEST_TIMEOUT_MS, 45000);
  });

  it("getAuthBootStateValue / getAuthBootNoticeValue mirror render-gate read targets", () => {
    beginAuthBootRequest(harness.ctx, harness.cb, { blocking: true });
    assert.equal(getAuthBootStateValue(), __getAuthBootStateForTesting__());
    assert.equal(getAuthBootNoticeValue(), __getAuthBootNoticeForTesting__());
  });
});
