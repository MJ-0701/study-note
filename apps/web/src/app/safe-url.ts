// sprint-2026-W22-sprint-13 / app — shared URL allowlist helper.
// sprint-11 home-intake 의 sanitizeExternalUrl 을 shared module 로 승격.
// 모든 user-controllable href surface 에서 재사용.

/**
 * Protocol allowlist for external/user-controllable href.
 * Allows: http:, https:, relative `#/...`, relative `/...`.
 * Blocks: javascript:, data:, mailto:, file:, vbscript:, protocol-relative `//host`.
 * Empty/blocked input → "" (caller 가 link 미렌더).
 */
export function sanitizeExternalUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  // Protocol-relative `//host/...` 차단 — 같은 origin 의 https page 에서는
  // attacker host 로 navigation 됨 (sprint-11 Gate 6 R1 finding lineage).
  if (trimmed.startsWith("//")) return "";
  // Hash route + 같은 origin absolute path — safe.
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  // Absolute http/https only.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Block everything else.
  return "";
}
