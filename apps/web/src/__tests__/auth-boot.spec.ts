// Auth boot UX regression tests.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/auth-boot.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  AUTH_SESSION_HINT_STORAGE_KEY,
  clearAuthSessionHint,
  getAuthBootRetryNotice,
  getAuthBootStateForMode,
  getInitialAuthBootState,
  readAuthSessionHint,
  writeAuthSessionHint,
  type AuthSessionHintStorage
} from "../auth/sessionBoot.ts";

const mainTs = readFileSync(new URL("../main.ts", import.meta.url), "utf8");

function getFunctionBlock(name: string): string {
  const startToken = `function ${name}`;
  const startIndex = mainTs.indexOf(startToken);

  assert.notEqual(startIndex, -1, `expected ${name} to exist`);

  const nextFunctionIndex = mainTs.indexOf("\nfunction ", startIndex + startToken.length);
  return mainTs.slice(startIndex, nextFunctionIndex === -1 ? undefined : nextFunctionIndex);
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

  it("does not block first-time visitors behind the session-check screen", () => {
    assert.match(
      mainTs,
      /let authBootState: AuthBootState = getInitialAuthBootState\(readAuthSessionHint\(\)\);/
    );
    assert.match(
      mainTs,
      /revalidateStoredSession\(\{ blocking: readAuthSessionHint\(\) \}\)/
    );
  });

  it("keeps cold-start session check only for browsers with a prior sign-in hint", () => {
    const beginBlock = getFunctionBlock("beginAuthBootRequest");
    const retryBlock = getFunctionBlock("scheduleAuthBootRetry");

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
    assert.match(mainTs, /from "\.\/auth\/authViews";/);
    assert.doesNotMatch(mainTs, /function renderLoginPage/);
    assert.doesNotMatch(mainTs, /function renderSessionCheckPage/);
    assert.doesNotMatch(mainTs, /interface AuthMeResponse/);
    assert.doesNotMatch(mainTs, /function fetchWithTimeout/);
  });

  it("clears the sign-in hint when auth is invalid", () => {
    const revalidateBlock = getFunctionBlock("revalidateStoredSession");
    const clickBlock = getFunctionBlock("handleDocumentClick");
    const authExpiredBlock = getFunctionBlock("handleAuthExpiredFromSync");
    const materialAuthBlock = getFunctionBlock("handleMaterialAuthError");

    assert.match(revalidateBlock, /clearAuthSessionHint\(\);/);
    assert.match(revalidateBlock, /writeAuthSessionHint\(\);/);
    assert.match(clickBlock, /clearAuthSessionHint\(\);\s*clearAuthSession\(\);/);
    assert.match(authExpiredBlock, /clearAuthSessionHint\(\);\s*clearAuthSession\(\);/);
    assert.match(materialAuthBlock, /clearAuthSessionHint\(\);\s*clearAuthSession\(\);/);
  });

  it("cancels a background /me request before login or signup can attach a new session", () => {
    const cancelBlock = getFunctionBlock("cancelAuthBootRequest");
    const submitBlock = getFunctionBlock("handleDocumentSubmit");

    assert.match(cancelBlock, /authBootRequestId \+= 1;/);
    assert.match(cancelBlock, /clearAuthBootTimers\(\);/);
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
