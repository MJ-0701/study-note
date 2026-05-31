// sprint-2026-W22-sprint-22 / layer D/slice-4 — user-notes BE sync module.
// Owns 4 cache (Map/Set) + syncFailureTracker + 2 banner state + 3 const
// + 4 record fn + 3 lifecycle fn + 1 clear fn + getter/setter.
// ambient identity (authSession) + notebook in-memory state 는 main.ts 잔류 —
// ctx/cb 로 통신.
//
// invariant:
//   (a) race guard — putUserNoteToBE 의 chain inside 에서 시작 시점 userId
//       캡처 + await prior 후 비교. fetchUserNoteIfMissing 도 fetch resolve
//       후 비교. user A→B 전환 시 stale write/hydrate 차단.
//   (b) chain serialization — per (subjectId, weekId) key 의 PUT 은 prior
//       chain 의 catch.then 위에 등록. 동일 key 두 in-flight 차단.
//   (c) abort cleanup — putUserNote 의 abortController 는 finally 에서
//       delete (delete 시 동일 reference 인지 비교).
//   (d) paused gate — syncFailureTracker.paused === true 면 PUT skip.
//       annotation-sync (다른 모듈) 도 동일 paused 공유 (getter callback).
//   (e) banner one-shot — recordSyncFailure 가 paused 전환 시 banner set,
//       reported flag false → true 일 때만 triggerRender (typing focus loss 방지).
//   (f) cross-domain reset — clearUserNotesSync 가 6 step 통합 (4 cache clear +
//       abort all + tracker reset + banner clear).
//   (g) production logging policy — `console.warn` 5 call (PUT 413 / PUT auth /
//       PUT failed status / PUT network error + GET network error) 만 허용.
//       payload body / studentNumber / displayName / email 절대 emit X.
//
// state transition contract (PUT T1~T8 / fetch T1~T4 / record T1~T3):
//   PUT T1  scheduleUserNotePut : prior timer clear → set new (500ms) → fires putUserNoteToBE.
//   PUT T2  putUserNoteToBE & paused : early return.
//   PUT T3  putUserNoteToBE & no session : early return.
//   PUT T4  putUserNoteToBE chain inside & userId mismatch : discard.
//   PUT T5  putUserNoteToBE 200 : recordSyncSuccess.
//   PUT T6  putUserNoteToBE 4xx (non-401/403/413) : console.warn (5xx/429 만 recordFailure).
//   PUT T7  putUserNoteToBE 401/403 : cb.handleAuthExpired().
//   PUT T8  putUserNoteToBE 5xx/network : console.warn + recordSyncFailure.
//   GET T1  fetchUserNoteIfMissing 200 + race ok + no pending PUT + no local edit
//           : hydrate + persist + render + recordFetchSuccess.
//   GET T2  fetchUserNoteIfMissing 401/403 : release marker + cb.handleAuthExpired.
//   GET T3  fetchUserNoteIfMissing 404 : keep marker (cross-device add 는 reload 시 표시).
//   GET T4  fetchUserNoteIfMissing 5xx/network : release marker + recordFetchFailure (no-op).
//   record T1  recordSyncFailure × 3 (5min window) : paused=true + banner set + report flag.
//   record T2  recordSyncSuccess & paused : paused=false + banner clear + triggerRender.
//   record T3  recordFetchSuccess / recordFetchFailure : no-op (intentional).
//   clear      clearUserNotesSync : 6 step (4 cache clear + abort all + tracker reset + banner clear).

import { type StudyNotebook } from "@study-note/domain";

export const USER_NOTES_PUT_DEBOUNCE_MS = 500;
export const SYNC_FAILURE_PAUSE_THRESHOLD = 3;
export const SYNC_FAILURE_PAUSE_WINDOW_MS = 5 * 60 * 1000;

interface SyncFailureTracker {
  recentFailures: number[];
  paused: boolean;
}

export interface UserNotesSyncContext {
  readonly apiBaseUrl: string;
  getAuthSession(): { user: { id: string } } | undefined;
  getNotebook(): StudyNotebook;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export interface UserNotesSyncCallbacks {
  setNotebook(next: StudyNotebook): void;
  persistNotebook(): void;
  triggerRender(): void;
  handleAuthExpired(): void;
  // GET T1 hydrate 완료 시 호출 — userNotesHydrationVersion 을 bump 해
  // textarea key 변경 → defaultValue 재적용 트리거. PUT 경로에서는 절대 호출 X
  // (타이핑 중 renderApp 가 key 변경 → textarea remount → focus/cursor 손실 방지).
  markServerHydrated(): void;
}

const userNotesPutTimers = new Map<string, ReturnType<typeof setTimeout>>();
const userNotesPutAborts = new Map<string, AbortController>();
const userNotesPutChains = new Map<string, Promise<void>>();
const userNotesFetchedKeys = new Set<string>();
const syncFailureTracker: SyncFailureTracker = {
  recentFailures: [],
  paused: false
};
let syncBackendError: string | undefined;
let syncBackendErrorReported = false;

const SYNC_PAUSED_BANNER_MESSAGE =
  "메모/필기 BE 저장에 연속 실패했습니다. 자동 동기화를 잠시 멈춥니다. 네트워크/세션 상태를 확인한 뒤 닫기를 눌러 재시작하세요.";

function getSetTimeout(ctx: UserNotesSyncContext): typeof setTimeout {
  return ctx.setTimeoutFn ?? setTimeout;
}

function getClearTimeout(ctx: UserNotesSyncContext): typeof clearTimeout {
  return ctx.clearTimeoutFn ?? clearTimeout;
}

export function isSyncBackendPaused(): boolean {
  return syncFailureTracker.paused;
}

export function getSyncBackendError(): string | undefined {
  return syncBackendError;
}

export function setSyncBackendError(message: string | undefined): void {
  syncBackendError = message;
}

export function setSyncBackendErrorReported(reported: boolean): void {
  syncBackendErrorReported = reported;
}

export function dismissSyncBackendError(): void {
  // sprint-W22-sprint-22 Gate 6 codex P2 fix: pre-refactor handler 가 dismiss 시
  // recentFailures 도 [] 로 초기화했음. 누락 시 dismiss 직후 1회 실패만으로
  // 즉시 re-pause (5min window 안에 3 이전 failure 잔존 + 1 신규 = threshold).
  // pre-refactor 동작 그대로 보존.
  syncBackendError = undefined;
  syncBackendErrorReported = false;
  syncFailureTracker.paused = false;
  syncFailureTracker.recentFailures = [];
}

export function recordSyncFailure(cb: UserNotesSyncCallbacks): void {
  const now = Date.now();
  syncFailureTracker.recentFailures.push(now);
  syncFailureTracker.recentFailures = syncFailureTracker.recentFailures.filter(
    (ts) => now - ts < SYNC_FAILURE_PAUSE_WINDOW_MS
  );
  if (
    syncFailureTracker.recentFailures.length >= SYNC_FAILURE_PAUSE_THRESHOLD &&
    !syncFailureTracker.paused
  ) {
    syncFailureTracker.paused = true;
    syncBackendError = SYNC_PAUSED_BANNER_MESSAGE;
    if (!syncBackendErrorReported) {
      syncBackendErrorReported = true;
      cb.triggerRender();
    }
  }
}

// sprint-2/S2 fix (codex P1): PUT success only — unpause autosave (PUT 신호).
// GET success 는 read-only 라 PUT 의 paused 상태를 풀면 안 됨 (사용자가 typing
// 중인데 PUT 은 여전히 500 일 수 있음).
export function recordSyncSuccess(cb: UserNotesSyncCallbacks): void {
  syncFailureTracker.recentFailures = [];
  if (syncFailureTracker.paused) {
    syncFailureTracker.paused = false;
    syncBackendError = undefined;
    syncBackendErrorReported = false;
    cb.triggerRender();
  }
}

// sprint-2/S2 fix (codex P1): GET success — silent. 별도 함수로 분리해 unpause
// 신호 X. 5xx 누적 카운트도 그대로 (PUT 만 카운트).
export function recordFetchSuccess(): void {
  /* no-op intentionally — GET 성공이 PUT paused 상태 변경에 영향 없음. */
}

// sprint-2/S2 fix (codex P2): GET failure — silent. PUT paused 카운트에 영향 X.
// read-side 실패가 write-side 차단을 유발하면 안 됨.
export function recordFetchFailure(): void {
  /* no-op intentionally — GET 실패가 PUT paused 카운트를 키우지 않는다. */
}

export async function putUserNoteToBE(
  ctx: UserNotesSyncContext,
  cb: UserNotesSyncCallbacks,
  subjectId: string,
  weekId: string,
  body: string
): Promise<void> {
  if (syncFailureTracker.paused) {
    return;
  }
  // sprint-2/S3 fix (codex P1 #NEW-22): chain this PUT after any prior PUT
  // for the same (subject, week) so server arrival order matches client-issue
  // order on this device. AbortController inside is for hard termination
  // from logout / user transition — within the chain there is never more
  // than one in-flight at a time, so the abort path only fires on session
  // changes, not on supersession.
  const key = `${subjectId}:${weekId}`;
  const sessionUserIdAtSchedule = ctx.getAuthSession()?.user.id;
  if (!sessionUserIdAtSchedule) {
    return;
  }
  const previous = userNotesPutChains.get(key) ?? Promise.resolve();
  const work = previous
    .catch(() => {})
    .then(async () => {
      // sprint-2/S3 fix (advisor): chain may have awaited seconds while the
      // user logged out and back in. Re-validate session before issuing the
      // PUT so user A's debounced edit cannot land with user B's cookie.
      if (ctx.getAuthSession()?.user.id !== sessionUserIdAtSchedule) {
        return;
      }
      if (syncFailureTracker.paused) {
        return;
      }
      const abortController = new AbortController();
      userNotesPutAborts.set(key, abortController);
      try {
        const response = await fetch(
          `${ctx.apiBaseUrl}/v1/notes/subject/${encodeURIComponent(subjectId)}/week/${encodeURIComponent(weekId)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body }),
            signal: abortController.signal
          }
        );
        if (response.status === 413) {
          console.warn("[study-note] userNotes PUT 413 PAYLOAD_TOO_LARGE", weekId);
          return;
        }
        if (response.status === 401 || response.status === 403) {
          console.warn("[study-note] userNotes PUT auth expired", response.status, weekId);
          cb.handleAuthExpired();
          return;
        }
        if (!response.ok) {
          console.warn("[study-note] userNotes PUT failed", response.status, weekId);
          if (response.status >= 500 || response.status === 429) {
            recordSyncFailure(cb);
          }
          return;
        }
        recordSyncSuccess(cb);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.warn("[study-note] userNotes PUT network error", error);
        recordSyncFailure(cb);
      } finally {
        if (userNotesPutAborts.get(key) === abortController) {
          userNotesPutAborts.delete(key);
        }
      }
    });
  userNotesPutChains.set(key, work);
  try {
    await work;
  } finally {
    if (userNotesPutChains.get(key) === work) {
      userNotesPutChains.delete(key);
    }
  }
}

export function scheduleUserNotePut(
  ctx: UserNotesSyncContext,
  cb: UserNotesSyncCallbacks,
  subjectId: string,
  weekId: string,
  body: string
): void {
  const timerKey = `${subjectId}:${weekId}`;
  const existing = userNotesPutTimers.get(timerKey);
  const clearFn = getClearTimeout(ctx);
  if (existing) {
    clearFn(existing);
  }
  const setFn = getSetTimeout(ctx);
  const timer = setFn(() => {
    userNotesPutTimers.delete(timerKey);
    void putUserNoteToBE(ctx, cb, subjectId, weekId, body);
  }, USER_NOTES_PUT_DEBOUNCE_MS);
  userNotesPutTimers.set(timerKey, timer);
}

export async function fetchUserNoteIfMissing(
  ctx: UserNotesSyncContext,
  cb: UserNotesSyncCallbacks,
  subjectId: string,
  weekId: string
): Promise<void> {
  // sprint-2/S2 fix (codex P1): scope cache key to authenticated user so
  // logout/login on a shared SPA runtime does not skip GET for the new user.
  const sessionUserId = ctx.getAuthSession()?.user.id;
  if (!sessionUserId) {
    return;
  }
  const cacheKey = `${sessionUserId}:${subjectId}:${weekId}`;
  if (userNotesFetchedKeys.has(cacheKey)) {
    return;
  }
  userNotesFetchedKeys.add(cacheKey);
  const releaseNoteCache = () => userNotesFetchedKeys.delete(cacheKey);
  try {
    const response = await fetch(
      `${ctx.apiBaseUrl}/v1/notes/subject/${encodeURIComponent(subjectId)}/week/${encodeURIComponent(weekId)}`,
      { credentials: "include" }
    );
    if (response.status === 404) {
      // sprint-2/S3 fix (codex P2): keep the cache marker on 404. The previous
      // fix released it so cross-device note creation could appear without
      // reload, but `renderApp()` re-invokes fetchUserNoteIfMissing on every
      // week-page render → released cache → re-fetch → 404 → release =
      // per-render request storm for any week without a server note. Trade
      // accepted: cross-device new notes appear after the next page reload
      // instead of mid-session (server data wins on reload).
      return;
    }
    if (response.status === 401 || response.status === 403) {
      // sprint-2/S3 fix (codex P2): GET auth expiry also surfaces re-login.
      releaseNoteCache();
      cb.handleAuthExpired();
      return;
    }
    if (!response.ok) {
      // Allow retry on later view by clearing cache marker.
      userNotesFetchedKeys.delete(cacheKey);
      if (response.status >= 500) {
        recordFetchFailure();
      }
      return;
    }
    const payload = (await response.json()) as { body?: unknown; updatedAt?: unknown };
    if (typeof payload.body !== "string") {
      return;
    }
    // sprint-2/S2 fix (codex P1): session re-validate after async resolves —
    // a logout/login between fetch start and resolve must NOT apply user A's
    // server data into user B's notebook.
    if (ctx.getAuthSession()?.user.id !== sessionUserId) {
      return;
    }
    const incoming = payload.body;
    // sprint-2/S2 fix (codex P1): protect against stale GET overwriting fresh
    // local edits. Skip hydrate when:
    //   (a) the user has a pending debounced PUT for this weekId (still typing),
    //   (b) the active week has a non-empty local userNotes that differs from
    //       the server payload — treat that as a local edit not yet flushed
    //       and let the next PUT carry the local value to the server.
    if (userNotesPutTimers.has(`${subjectId}:${weekId}`)) {
      recordFetchSuccess();
      return;
    }
    const notebook = ctx.getNotebook();
    const localSubject = notebook.subjects.find((subject) => subject.id === subjectId);
    const localWeek = localSubject?.weekNotes.find((week) => week.id === weekId);
    const localValue = typeof localWeek?.userNotes === "string" ? localWeek.userNotes : "";
    if (localValue.length > 0 && localValue !== incoming) {
      recordFetchSuccess();
      return;
    }
    let applied = false;
    const next: StudyNotebook = {
      ...notebook,
      subjects: notebook.subjects.map((subject) =>
        subject.id !== subjectId
          ? subject
          : {
              ...subject,
              weekNotes: subject.weekNotes.map((week) => {
                if (week.id !== weekId) {
                  return week;
                }
                if ((week.userNotes ?? "") === incoming) {
                  return week;
                }
                applied = true;
                return { ...week, userNotes: incoming };
              })
            }
      )
    };
    if (applied) {
      // markServerHydrated → userNotesHydrationVersion bump → 다음 renderApp 에서
      // 새 token → textarea remount → defaultValue 재적용(서버 값). triggerRender
      // 전에 호출해야 render 가 이미 증가된 version 을 읽는다.
      cb.markServerHydrated();
      cb.setNotebook(next);
      cb.persistNotebook();
      cb.triggerRender();
    }
    recordFetchSuccess();
  } catch (error) {
    userNotesFetchedKeys.delete(cacheKey);
    console.warn("[study-note] userNotes GET network error", error);
    recordFetchFailure();
  }
}

export function clearUserNotesSync(ctx: UserNotesSyncContext): void {
  // sprint-2/S2 fix (codex P1): cancel all pending debounced sync timers so a
  // delayed PUT from user A cannot be sent with user B's cookie after a
  // logout/login. Also reset the fetch caches (they are user-scoped, but old
  // entries are stale once the session is gone) and the failure tracker.
  const clearFn = getClearTimeout(ctx);
  for (const timer of userNotesPutTimers.values()) {
    clearFn(timer);
  }
  userNotesPutTimers.clear();
  for (const ac of userNotesPutAborts.values()) {
    ac.abort();
  }
  userNotesPutAborts.clear();
  userNotesPutChains.clear();
  userNotesFetchedKeys.clear();
  syncFailureTracker.paused = false;
  syncFailureTracker.recentFailures = [];
  syncBackendError = undefined;
  syncBackendErrorReported = false;
}

export function __resetUserNotesSyncForTesting__(): void {
  userNotesPutTimers.clear();
  userNotesPutAborts.clear();
  userNotesPutChains.clear();
  userNotesFetchedKeys.clear();
  syncFailureTracker.paused = false;
  syncFailureTracker.recentFailures = [];
  syncBackendError = undefined;
  syncBackendErrorReported = false;
}

export function __getInternalCachesForTesting__(): {
  timers: Map<string, ReturnType<typeof setTimeout>>;
  aborts: Map<string, AbortController>;
  chains: Map<string, Promise<void>>;
  fetched: Set<string>;
  tracker: SyncFailureTracker;
} {
  return {
    timers: userNotesPutTimers,
    aborts: userNotesPutAborts,
    chains: userNotesPutChains,
    fetched: userNotesFetchedKeys,
    tracker: syncFailureTracker
  };
}
