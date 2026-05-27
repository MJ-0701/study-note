export type AuthBootState = "checking" | "ready";

export type AuthBootNotice = "checking" | "waking" | "retryable";

export type AuthSessionHintStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Non-secret UX hint only. The actual session remains the HttpOnly cookie and
// `/v1/auth/me`; this just prevents first-time visitors from seeing a blocking
// session-check screen when there is no reasonable chance of an existing cookie.
export const AUTH_SESSION_HINT_STORAGE_KEY = "study-note.auth-session-hint.v1";
export const AUTH_SESSION_HINT_COOKIE_NAME = "study_note_session_hint";

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
  const cookieHeader = getBrowserAuthSessionHintCookieHeader();
  if (cookieHeader !== undefined) {
    return readAuthSessionHintFromCookieHeader(cookieHeader);
  }

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
  writeAuthSessionHintCookie();

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
  clearAuthSessionHintCookie();

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

export function readAuthSessionHintFromCookieHeader(rawCookieHeader: string | undefined): boolean {
  if (!rawCookieHeader) {
    return false;
  }

  for (const part of rawCookieHeader.split(";")) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const name = trimmed.slice(0, eqIndex).trim();
    if (name !== AUTH_SESSION_HINT_COOKIE_NAME) continue;

    return trimmed.slice(eqIndex + 1).trim() === "1";
  }

  return false;
}

function getBrowserAuthSessionHintCookieHeader(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  try {
    return document.cookie;
  } catch {
    return "";
  }
}

function writeAuthSessionHintCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_SESSION_HINT_COOKIE_NAME}=1; Path=/; SameSite=Lax${secure}`;
  } catch {
    /* cookie unavailable — auth still works through the HttpOnly cookie. */
  }
}

function clearAuthSessionHintCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_SESSION_HINT_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0${secure}`;
  } catch {
    /* cookie unavailable — no-op. */
  }
}
