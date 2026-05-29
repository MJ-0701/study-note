// React 마이그레이션 S0 (sprint 2026-W22-sprint-3) — auth 세션 상태 store.
//
// roadmap §2: legacy/React 단일 진실원. main.ts 의 mutable singleton
// (`authSession`/`authMode`/`loginFeedback`) 이전 대상.
//
// slice-2 invariant 보존: auth session 은 in-memory only (localStorage 금지).
// boot 시 GET /v1/auth/me (cookie) 로 rehydrate → setAuthSession.
import { createStore } from "zustand/vanilla";
import type { AuthMode, AuthSession, LoginFeedback } from "../auth/authSession.ts";

interface AuthStoreState {
  authSession: AuthSession | undefined;
  authMode: AuthMode;
  loginFeedback: LoginFeedback;
}

export const authStore = createStore<AuthStoreState>(() => ({
  authSession: undefined,
  authMode: "login",
  loginFeedback: undefined
}));

export const getAuthSession = (): AuthSession | undefined => authStore.getState().authSession;
export const setAuthSession = (authSession: AuthSession | undefined): void => {
  authStore.setState({ authSession });
};

export const getAuthMode = (): AuthMode => authStore.getState().authMode;
export const setAuthMode = (authMode: AuthMode): void => {
  authStore.setState({ authMode });
};

export const getLoginFeedback = (): LoginFeedback => authStore.getState().loginFeedback;
export const setLoginFeedback = (loginFeedback: LoginFeedback): void => {
  authStore.setState({ loginFeedback });
};
