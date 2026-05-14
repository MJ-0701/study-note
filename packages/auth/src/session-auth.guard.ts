import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { AuthService } from "./auth.service";

/**
 * Cookie-based session guard (slice-2 migration).
 * Reads the study_note_session cookie from req.headers.cookie.
 * Bearer header support is removed (F2 — httpOnly cookie single source).
 *
 * Env guard is the FIRST check so that /v1/auth/me returns 503 (not 401)
 * when STUDY_NOTE_AUTH_DEV_ENABLED=false (AC1-D).
 * Canonical implementation lives in apps/api/src/auth/auth.env.ts;
 * inlined here because packages/auth must not import from apps/api.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Env check first — must precede cookie parsing so auth-disabled returns 503,
    // not 401. Mirrors isAuthDevEnabled() in apps/api/src/auth/auth.env.ts.
    if (process.env.STUDY_NOTE_AUTH_DEV_ENABLED === "false") {
      throw new ServiceUnavailableException({
        errorCode: "AUTH_DEV_DISABLED",
        errorMessage: "sign-in disabled"
      });
    }

    const request = context.switchToHttp().getRequest<{
      headers: { cookie?: string };
      user?: unknown;
      authToken?: string;
    }>();

    const token = parseSessionCookie(request.headers.cookie);

    if (!token) {
      throw new UnauthorizedException({
        errorCode: "AUTH_REQUIRED",
        errorMessage: "sign-in required"
      });
    }

    const user = await this.auth.getCurrentUser(token);

    if (!user) {
      throw new UnauthorizedException({
        errorCode: "AUTH_REQUIRED",
        errorMessage: "sign-in required"
      });
    }

    request.user = user;
    request.authToken = token;
    return true;
  }
}

/**
 * Cookie parser used internally by SessionAuthGuard.
 * Extracted here so auth.controller can also use it for sign-out.
 * getBearerToken is intentionally NOT exported (removed in slice-2 migration).
 */
export function parseSessionCookie(rawCookieHeader: string | undefined): string | undefined {
  if (!rawCookieHeader) return undefined;

  for (const part of rawCookieHeader.split(";")) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const name = trimmed.slice(0, eqIndex).trim();
    if (name !== "study_note_session") continue;

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
