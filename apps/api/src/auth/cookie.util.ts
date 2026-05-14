const COOKIE_NAME = "study_note_session";

/**
 * Extracts the study_note_session value from a raw Cookie header string.
 * Performs URI-decode; returns undefined if the cookie is absent or empty.
 */
export function parseSessionCookie(rawCookieHeader: string | undefined): string | undefined {
  if (!rawCookieHeader) return undefined;

  for (const part of rawCookieHeader.split(";")) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const name = trimmed.slice(0, eqIndex).trim();
    if (name !== COOKIE_NAME) continue;

    const value = trimmed.slice(eqIndex + 1).trim();
    if (!value) return undefined;

    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Builds a Set-Cookie header value for a new session.
 * Secure is always true (F2/plan §5). Max-Age and Expires are intentionally
 * omitted so the cookie expires when the browser session closes (D-plan-3).
 */
export function buildSessionCookie(token: string): string {
  return (
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/`
  );
}

/**
 * Builds a Set-Cookie header value that clears the session cookie (Max-Age=0).
 */
export function buildClearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
