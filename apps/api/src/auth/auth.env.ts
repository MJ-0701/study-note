/**
 * Returns true when auth sign-in is enabled (default) and false only when
 * STUDY_NOTE_AUTH_DEV_ENABLED is the literal string "false".
 *
 * Rationale (plan §8 F1): auth is dev-only. Production deployments must set
 * STUDY_NOTE_AUTH_DEV_ENABLED=false to disable all auth routes (HTTP 503).
 */
export function isAuthDevEnabled(): boolean {
  return process.env.STUDY_NOTE_AUTH_DEV_ENABLED !== "false";
}
