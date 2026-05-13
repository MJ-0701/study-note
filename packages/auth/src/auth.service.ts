import { ConflictException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import type { UserProfile } from "@study-note/domain";
import { SessionsService } from "./sessions.service";
import { UsersService } from "./users.service";

export interface AuthSessionResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

// Inline PII maskers — mirrors apps/api/src/common/logger/redactor.ts.
// Kept local because packages/auth must not import from apps/api (build boundary).
function maskStudentNumber(sn: string): string {
  return /^\d{8}$/.test(sn) ? `****${sn.slice(-4)}` : "****";
}
function maskName(name: string): string {
  return name ? `${name.charAt(0)}**` : "**";
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService
  ) {}

  async login(
    displayName: string,
    studentNumber: string
  ): Promise<AuthSessionResponse> {
    const candidate = await this.users.findAuthCandidate(displayName, studentNumber);

    if (!candidate) {
      // F5: masked PII only — never echo raw studentNumber or displayName
      this.logger.warn(
        `sign-in denied (user not found): sn=${maskStudentNumber(studentNumber)} name=${maskName(displayName)}`
      );
      throw new ForbiddenException({
        errorCode: "AUTH_DENIED",
        errorMessage: "sign-in denied"
      });
    }

    if (!candidate.devUserFlag) {
      // F5: masked PII only
      this.logger.warn(
        `sign-in denied (devUserFlag=false): sn=${maskStudentNumber(studentNumber)} name=${maskName(displayName)}`
      );
      throw new ForbiddenException({
        errorCode: "AUTH_DENIED",
        errorMessage: "sign-in denied"
      });
    }

    const session = await this.sessions.createSession(candidate.profile.id);

    // F5: session token is never logged (it's in the return value; controller
    // moves it to cookie — never logged here or in controller)
    this.logger.log(
      `sign-in success: userId=${candidate.profile.id} sn=${maskStudentNumber(studentNumber)} name=${maskName(displayName)}`
    );

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      user: candidate.profile
    };
  }

  async signUp(
    displayName: string,
    studentNumber: string
  ): Promise<AuthSessionResponse> {
    const existing = await this.users.findByStudentNumber(studentNumber);

    if (existing) {
      throw new ConflictException({
        errorCode: "AUTH_DUPLICATE_STUDENT",
        errorMessage: "studentNumber already exists"
      });
    }

    const user = await this.users.createUser({
      name: displayName,
      studentNumber,
      role: "NORMAL",
      devUserFlag: true
    });

    const session = await this.sessions.createSession(user.id);

    // D-plan-7: plain-text PII is OK for sign-up audit log (no masking)
    this.logger.log(
      `[Auth] sign-up success userId=${user.id} sn=${studentNumber} name=${displayName}`
    );

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      user
    };
  }

  async getCurrentUser(token: string): Promise<UserProfile | undefined> {
    const userId = await this.sessions.findUserId(token);

    return userId ? this.users.findById(userId) : undefined;
  }

  async logout(token: string): Promise<void> {
    await this.sessions.revoke(token);
  }
}
