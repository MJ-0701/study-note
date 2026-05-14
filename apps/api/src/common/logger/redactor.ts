/**
 * PII redactor — plan §8 F5 (no-log / no-echo contract).
 *
 * Rules:
 *   - Student number (8-digit): show only the last 4 digits, prefix with "****".
 *     Non-8-digit values are fully masked as "****".
 *   - Name: first character + "**". Empty string → "**".
 *   - Session cookie values and MCP owner env values must NEVER be passed to a
 *     logger at all — call-site prohibition, not handled by this module.
 */

const STUDENT_NUMBER_PATTERN = /^\d{8}$/;

/**
 * Masks a student number. 8-digit → "****{last4}". Anything else → "****".
 */
export function maskStudentNumber(studentNumber: string): string {
  if (STUDENT_NUMBER_PATTERN.test(studentNumber)) {
    return `****${studentNumber.slice(-4)}`;
  }
  return "****";
}

/**
 * Masks a name. Returns first character + "**". Empty string → "**".
 */
export function maskName(name: string): string {
  if (!name) return "**";
  return `${name.charAt(0)}**`;
}

/**
 * Convenience: auto-masks any 8-digit numeric substring in an arbitrary string.
 * Use when logging generic messages that may contain student numbers inline.
 * Names must be masked explicitly via maskName() at the call site.
 */
export function redactPii(value: string): string {
  return value.replace(/\b\d{8}\b/g, (match) => maskStudentNumber(match));
}
