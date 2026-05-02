import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { UserProfile } from "../domain/workspace.types";
import { AuthService } from "./auth.service";
import { getBearerToken, SessionAuthGuard } from "./session-auth.guard";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("auth/login")
  async login(@Body() body: unknown) {
    const input = parseLoginBody(body);

    return this.auth.login(input.name, input.studentNumber);
  }

  @Post("auth/logout")
  @UseGuards(SessionAuthGuard)
  async logout(@Req() request: { headers: { authorization?: string } }) {
    const token = getBearerToken(request.headers.authorization);

    if (token) {
      await this.auth.logout(token);
    }

    return { ok: true };
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  getMe(@Req() request: { user: UserProfile }) {
    return { user: request.user };
  }
}

function parseLoginBody(body: unknown): { name: string; studentNumber: string } {
  if (!body || typeof body !== "object") {
    throw new BadRequestException("Login body is required");
  }

  const input = body as Record<string, unknown>;
  const name = String(input.name ?? input.displayName ?? "").trim();
  const studentNumber = String(input.studentNumber ?? input.studentNo ?? "").trim();

  if (!name || !studentNumber) {
    throw new BadRequestException("name and studentNumber are required");
  }

  return { name, studentNumber };
}
