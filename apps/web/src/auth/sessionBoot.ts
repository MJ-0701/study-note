export type AuthBootState = "checking" | "ready";

export type AuthBootNotice = "checking" | "waking" | "retryable";

export type AuthSessionHintStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Non-secret UX hint only. The actual session remains the HttpOnly cookie and
// `/v1/auth/me`; this just prevents first-time visitors from seeing a blocking
// session-check screen when there is no reasonable chance of an existing cookie.
export const AUTH_SESSION_HINT_STORAGE_KEY = "study-note.auth-session-hint.v1";

function getBrowserAuthSessionHintStorage(): AuthSessionHintStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readAuthSessionHint(
  storage: AuthSessionHintStorage | undefined = getBrowserAuthSessionHintStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(AUTH_SESSION_HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAuthSessionHint(
  storage: AuthSessionHintStorage | undefined = getBrowserAuthSessionHintStorage()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(AUTH_SESSION_HINT_STORAGE_KEY, "1");
  } catch {
    /* storage unavailable — auth still works through the HttpOnly cookie. */
  }
}

export function clearAuthSessionHint(
  storage: AuthSessionHintStorage | undefined = getBrowserAuthSessionHintStorage()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_SESSION_HINT_STORAGE_KEY);
  } catch {
    /* storage unavailable — no-op. */
  }
}

export function getInitialAuthBootState(hasSessionHint: boolean): AuthBootState {
  return hasSessionHint ? "checking" : "ready";
}

export function getAuthBootStateForMode(blocking: boolean): AuthBootState {
  return blocking ? "checking" : "ready";
}

export function getAuthBootRetryNotice(
  blocking: boolean,
  retryLimitReached: boolean
): AuthBootNotice {
  if (!blocking) {
    return "checking";
  }

  return retryLimitReached ? "retryable" : "waking";
}
