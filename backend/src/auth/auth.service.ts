import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { UserProfile } from "../domain/workspace.types";
import { SessionsService } from "./sessions.service";
import { UsersService } from "./users.service";

export interface AuthSessionResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService
  ) {}

  async login(
    displayName: string,
    studentNumber: string
  ): Promise<AuthSessionResponse> {
    const user = await this.users.findByNameAndStudentNumber(
      displayName,
      studentNumber
    );

    if (!user) {
      throw new UnauthorizedException("Invalid name or student number");
    }

    const session = await this.sessions.createSession(user.id);

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
