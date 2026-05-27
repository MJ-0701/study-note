import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards
} from "@nestjs/common";
import type { UserProfile } from "@study-note/domain";
import { AuthService, SessionAuthGuard } from "@study-note/auth";
import { isAuthDevEnabled } from "./auth.env";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  parseSessionCookie
} from "./cookie.util";

// Minimal inline types — avoids importing @types/express which is not a dependency.
interface IncomingHeaders {
  cookie?: string;
  [key: string]: string | string[] | undefined;
}
interface NestRequest {
  headers: IncomingHeaders;
  user?: UserProfile;
  authToken?: string;
}
interface NestResponse {
  setHeader(name: string, value: string): void;
}

/** Response body for sign-in and /me — token is excluded (F2). */
interface UserProfileResponse {
  userId: string;
  studentNumber: string;
  name: string;
  role: string;
}

function toProfileResponse(user: UserProfile): UserProfileResponse {
  return {
    userId: user.id,
    studentNumber: user.studentNumber,
    name: user.displayName,
    role: user.role
  };
}

@Controller("v1/auth")
export class AuthController {
  // sprint-W22-sprint-24 / AC4 — log-derived metric source. PII 0 — emit 줄에는
  // event 이름만, name/studentNumber/userId 미포함 (AC15 schema invariant).
  private readonly metricsLogger = new Logger("study-note.metric-event");

  constructor(private readonly auth: AuthService) {}

  // ── POST /v1/auth/sign-in ──────────────────────────────────────────────────
  @Post("sign-in")
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: NestResponse
  ): Promise<UserProfileResponse> {
    this.guardDevEnabled();

    const input = parseSignInBody(body);
    // AuthService.login throws ForbiddenException for unknown or non-allowlist users (F1).
    // ApiExceptionFilter maps ForbiddenException → {errorCode, errorMessage} (CLAUDE.md).
    const session = await this.auth.login(input.name, input.studentNumber);

    // F2: token goes to httpOnly cookie only — never in body.
    res.setHeader("Set-Cookie", buildSessionCookie(session.token));

    // sprint-W22-sprint-24 / AC4 — log-derived metric source.
    this.metricsLogger.log("event=study_note.event.signin");
    return toProfileResponse(session.user);
  }

  // ── POST /v1/auth/sign-up ─────────────────────────────────────────────────
  @Post("sign-up")
  @HttpCode(HttpStatus.OK)
  async signUp(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: NestResponse
  ): Promise<UserProfileResponse> {
    this.guardDevEnabled();

    const input = parseSignUpBody(body);

    // ConflictException (409) bubbles from AuthService.signUp on duplicate studentNumber.
    // ApiExceptionFilter passthrough handles the {errorCode, errorMessage} body.
    const session = await this.auth.signUp(input.name, input.studentNumber);

    res.setHeader("Set-Cookie", buildSessionCookie(session.token));

    // sprint-W22-sprint-24 / AC4 — log-derived metric source.
    this.metricsLogger.log("event=study_note.event.signup");
    return toProfileResponse(session.user);
  }

  // ── POST /v1/auth/sign-out ─────────────────────────────────────────────────
  @Post("sign-out")
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Req() req: NestRequest,
    @Res({ passthrough: true }) res: NestResponse
  ): Promise<{ ok: boolean }> {
    this.guardDevEnabled();

    const token = parseSessionCookie(req.headers.cookie);

    if (token) {
      await this.auth.logout(token);
    }

    // Always clear the cookie — idempotent (spec §1)
    res.setHeader("Set-Cookie", buildClearSessionCookie());

    return { ok: true };
  }

  // ── GET /v1/auth/me ────────────────────────────────────────────────────────
  @Get("me")
  @UseGuards(SessionAuthGuard)
  getMe(
    @Req() req: NestRequest
  ): UserProfileResponse {
    this.guardDevEnabled();
    // SessionAuthGuard guarantees req.user is set
    return toProfileResponse(req.user as UserProfile);
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  /** Throws 503 when STUDY_NOTE_AUTH_DEV_ENABLED=false (AC1-D). */
  private guardDevEnabled(): void {
    if (!isAuthDevEnabled()) {
      throw new ServiceUnavailableException({
        errorCode: "AUTH_DEV_DISABLED",
        errorMessage: "sign-in disabled"
      });
    }
  }
}

// ── Input validation (Shield Pattern — CLAUDE.md) ─────────────────────────
const STUDENT_NUMBER_RE = /^\d{8}$/;

function parseSignUpBody(body: unknown): { name: string; studentNumber: string } {
  if (!body || typeof body !== "object") {
    throw new BadRequestException({
      errorCode: "AUTH_INVALID_INPUT",
      errorMessage: "request body is required"
    });
  }

  const input = body as Record<string, unknown>;

  const name = String(input["name"] ?? "").trim();
  const studentNumber = String(input["studentNumber"] ?? "").trim();

  if (!STUDENT_NUMBER_RE.test(studentNumber)) {
    throw new BadRequestException({
      errorCode: "AUTH_INVALID_INPUT",
      errorMessage: "studentNumber must be 8 digits"
    });
  }

  if (!name || name.length > 50) {
    throw new BadRequestException({
      errorCode: "AUTH_INVALID_INPUT",
      errorMessage: "name must be 1-50 characters"
    });
  }

  return { name, studentNumber };
}

function parseSignInBody(body: unknown): { name: string; studentNumber: string } {
  if (!body || typeof body !== "object") {
    throw new BadRequestException({
      errorCode: "AUTH_INVALID_INPUT",
      errorMessage: "request body is required"
    });
  }

  const input = body as Record<string, unknown>;

  // Spec §1 locks the contract to {name, studentNumber} only — no aliases.
  const name = String(input["name"] ?? "").trim();
  const studentNumber = String(input["studentNumber"] ?? "").trim();

  if (!STUDENT_NUMBER_RE.test(studentNumber)) {
    throw new BadRequestException({
      errorCode: "AUTH_INVALID_INPUT",
      errorMessage: "studentNumber must be 8 digits"
    });
  }

  if (!name || name.length > 50) {
    throw new BadRequestException({
      errorCode: "AUTH_INVALID_INPUT",
      errorMessage: "name must be 1-50 characters"
    });
  }

  return { name, studentNumber };
}
