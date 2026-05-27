// Auth boot UX regression tests.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/auth-boot.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  AUTH_SESSION_HINT_COOKIE_NAME,
  AUTH_SESSION_HINT_STORAGE_KEY,
  clearAuthSessionHint,
  getAuthBootRetryNotice,
  getAuthBootStateForMode,
  getInitialAuthBootState,
  readAuthSessionHintFromCookieHeader,
  readAuthSessionHint,
  writeAuthSessionHint,
  type AuthSessionHintStorage
} from "../auth/sessionBoot.ts";

const mainTs = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
// sprint-W22-sprint-20 / layer D/slice-2: auth boot lifecycle 본체 →
// `auth/sessionState.ts`. main.ts 는 thin wrapper + ctx/cb 공급. 본 spec 은
// behavior site 가 어디든 (main.ts 또는 sessionState.ts) 일관성 유지.
const sessionStateTs = readFileSync(
  new URL("../auth/sessionState.ts", import.meta.url),
  "utf8"
);

function getFunctionBlock(source: string, name: string): string {
  const startToken = `function ${name}`;
  const startIndex = source.indexOf(startToken);

  assert.notEqual(startIndex, -1, `expected ${name} to exist`);

  const nextFunctionIndex = source.indexOf("\nfunction ", startIndex + startToken.length);
  return source.slice(startIndex, nextFunctionIndex === -1 ? undefined : nextFunctionIndex);
}

describe("auth boot UX", () => {
  it("keeps auth boot policy in the auth module instead of main.ts", () => {
    assert.equal(getInitialAuthBootState(false), "ready");
    assert.equal(getInitialAuthBootState(true), "checking");
    assert.equal(getAuthBootStateForMode(false), "ready");
    assert.equal(getAuthBootStateForMode(true), "checking");
    assert.equal(getAuthBootRetryNotice(false, false), "checking");
    assert.equal(getAuthBootRetryNotice(false, true), "checking");
    assert.equal(getAuthBootRetryNotice(true, false), "waking");
    assert.equal(getAuthBootRetryNotice(true, true), "retryable");
  });

  it("stores a non-secret sign-in hint through the auth module", () => {
    const data = new Map<string, string>();
    const storage: AuthSessionHintStorage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => { data.set(key, value); },
      removeItem: (key) => { data.delete(key); }
    };

    assert.equal(AUTH_SESSION_HINT_STORAGE_KEY, "study-note.auth-session-hint.v1");
    assert.equal(readAuthSessionHint(storage), false);
    writeAuthSessionHint(storage);
    assert.equal(data.get(AUTH_SESSION_HINT_STORAGE_KEY), "1");
    assert.equal(readAuthSessionHint(storage), true);
    clearAuthSessionHint(storage);
    assert.equal(readAuthSessionHint(storage), false);
  });

  it("uses a non-secret readable cookie hint before waking /auth/me", () => {
    assert.equal(AUTH_SESSION_HINT_COOKIE_NAME, "study_note_session_hint");
    assert.equal(readAuthSessionHintFromCookieHeader("study_note_session_hint=1"), true);
    assert.equal(readAuthSessionHintFromCookieHeader("other=1; study_note_session_hint=1"), true);
    assert.equal(readAuthSessionHintFromCookieHeader("study_note_session_hint=0"), false);
    assert.equal(readAuthSessionHintFromCookieHeader("other=1"), false);
  });

  it("does not wake the backend for first-time visitors without a session hint", () => {
    // sprint-W22-sprint-20: initial state 계산은 sessionState.ts 의
    // getInitialBootState() 로 이전. main.ts 는 hint 가 있을 때만 /me
    // revalidate 를 호출해야 ACA cold start 를 피한다.
    assert.match(sessionStateTs, /readAuthSessionHint\(\)/);
    assert.match(
      mainTs,
      /if \(readAuthSessionHint\(\)\) \{\s*void revalidateStoredSession\(\{ blocking: true \}\);\s*\}/
    );
    assert.doesNotMatch(mainTs, /revalidateStoredSession\(\{ blocking: readAuthSessionHint\(\) \}\)/);
  });

  it("keeps cold-start session check only for browsers with a prior sign-in hint", () => {
    const beginBlock = getFunctionBlock(sessionStateTs, "beginAuthBootRequest");
    const retryBlock = getFunctionBlock(sessionStateTs, "scheduleAuthBootRetry");

    assert.match(beginBlock, /authBootState = getAuthBootStateForMode\(options\.blocking\);/);
    assert.match(beginBlock, /if \(!options\.blocking\) \{\s*return requestId;\s*\}/);
    assert.match(retryBlock, /authBootState = getAuthBootStateForMode\(options\.blocking\);/);
    assert.match(retryBlock, /authBootNotice = getAuthBootRetryNotice\(options\.blocking, true\);/);
    assert.match(retryBlock, /authBootNotice = getAuthBootRetryNotice\(options\.blocking, false\);/);
    assert.match(retryBlock, /blocking: options\.blocking/);
  });

  it("main.ts delegates auth state, api, and views to auth modules", () => {
    assert.match(mainTs, /from "\.\/auth\/authApi";/);
    assert.match(mainTs, /from "\.\/auth\/authSession";/);
    assert.match(mainTs, /from "\.\/auth\/sessionBoot";/);
    assert.match(mainTs, /from "\.\/auth\/sessionState";/);
    assert.match(mainTs, /from "\.\/auth\/authViews";/);
    assert.doesNotMatch(mainTs, /function renderLoginPage/);
    assert.doesNotMatch(mainTs, /function renderSessionCheckPage/);
    assert.doesNotMatch(mainTs, /interface AuthMeResponse/);
    assert.doesNotMatch(mainTs, /function fetchWithTimeout/);
  });

  it("clears the sign-in hint when auth is invalid", () => {
    // sprint-W22-sprint-20: revalidate / handleAuthExpiredFromSync 본체 →
    // sessionState.ts. clickBlock / materialAuthBlock 은 main.ts 잔류.
    const revalidateBlock = getFunctionBlock(sessionStateTs, "revalidateStoredSession");
    const clickBlock = getFunctionBlock(mainTs, "handleDocumentClick");
    const authExpiredBlock = getFunctionBlock(sessionStateTs, "handleAuthExpiredFromSync");
    const materialAuthBlock = getFunctionBlock(mainTs, "handleMaterialAuthError");

    assert.match(revalidateBlock, /applyAuthFailureCleanup\(ctx, cb\);/);
    assert.match(sessionStateTs, /clearAuthSessionHint\(\);/);
    assert.match(sessionStateTs, /writeAuthSessionHint\(\);/);
    assert.match(clickBlock, /clearAuthSessionHint\(\);\s*clearAuthSession\(\);/);
    assert.match(authExpiredBlock, /clearAuthSessionHint\(\);/);
    assert.match(authExpiredBlock, /cb\.clearCrossDomainSession\(\);/);
    assert.match(materialAuthBlock, /clearAuthSessionHint\(\);\s*clearAuthSession\(\);/);
  });

  it("cancels a background /me request before login or signup can attach a new session", () => {
    const cancelBlock = getFunctionBlock(sessionStateTs, "cancelAuthBootRequest");
    const submitBlock = getFunctionBlock(mainTs, "handleDocumentSubmit");

    assert.match(cancelBlock, /authBootRequestId \+= 1;/);
    assert.match(cancelBlock, /clearAuthBootTimers\(ctx\);/);
    assert.match(cancelBlock, /authBootState = "ready";/);
    assert.match(
      submitBlock,
      /if \(action === "login"\) \{\s*cancelAuthBootRequest\(\);/
    );
    assert.match(
      submitBlock,
      /\/\/ action === "signup"[\s\S]*cancelAuthBootRequest\(\);[\s\S]*await revalidateStoredSession\(\{ blocking: true \}\);/
    );
    assert.match(submitBlock, /writeAuthSessionHint\(\);/);
  });
});
