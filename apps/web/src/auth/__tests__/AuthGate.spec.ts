// AuthGate 정적 소스 검증 spec (render 없음 — node:test 전용).
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/auth/__tests__/AuthGate.spec.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("../AuthGate.tsx", import.meta.url), "utf8");

describe("AuthGate 정적 소스 검증", () => {
  it("exports the required interface and type names", () => {
    assert.match(src, /export interface AuthGateProps/);
    assert.match(src, /export interface AuthGateCallbacks/);
    assert.match(src, /export function AuthGate/);
    assert.match(src, /export type AuthGateView/);
  });

  it("AC2 — no data-action attribute", () => {
    assert.doesNotMatch(src, /data-action/);
  });

  it("AC4 — pure-props: no store subscriptions or effects", () => {
    assert.doesNotMatch(src, /useEffect/);
    assert.doesNotMatch(src, /useStore/);
    assert.doesNotMatch(src, /useShallow/);
    assert.doesNotMatch(src, /from "zustand/);
    assert.doesNotMatch(src, /uiStore|authStore|pdfWorkspaceStore/);
    assert.doesNotMatch(src, /useState/);
  });

  it("AC7 — XSS: no dangerouslySetInnerHTML or escapeHtml", () => {
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/);
    assert.doesNotMatch(src, /escapeHtml/);
  });

  it("AC3 — no domain logic (no fetch, auth dispatch, sessionState)", () => {
    assert.doesNotMatch(src, /\bfetch\b/);
    assert.doesNotMatch(src, /signIn|signUp/);
    assert.doesNotMatch(src, /sessionState/);
    assert.doesNotMatch(src, /revalidate/);
  });

  it("event wiring: all callbacks and form handler present", () => {
    assert.match(src, /onTabLogin/);
    assert.match(src, /onTabSignup/);
    assert.match(src, /onRetrySession/);
    assert.match(src, /onSubmitAuth/);
    assert.match(src, /onSubmit=/);
    assert.match(src, /new FormData/);
  });

  it("type imports from real homes (authSession + sessionBoot)", () => {
    assert.match(src, /from "\.\/authSession"/);
    assert.match(src, /from "\.\/sessionBoot"/);
  });

  it("markup parity sanity: key structural markers present", () => {
    assert.match(src, /data-login-screen/);
    assert.match(src, /data-session-checking/);
    assert.match(src, /login-form/);
    assert.match(src, /auth-tab/);
    assert.match(src, /세션 확인 중/);
  });
});
