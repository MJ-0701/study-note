import { Injectable } from "@nestjs/common";
import { createHmac, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string): Promise<SessionRecord> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const session = {
      token,
      userId,
      expiresAt: expiresAt.toISOString()
    };

    await this.prisma.session.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId,
        expiresAt
      }
    });

    return session;
  }

  async findUserId(token: string): Promise<string | undefined> {
    const session = await this.prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(token)
      }
    });

    if (!session) {
      return undefined;
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.delete({
        where: {
          tokenHash: hashSessionToken(token)
        }
      });
      return undefined;
    }

    return session.userId;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(token)
      }
    });
  }
}

export function hashSessionToken(token: string): string {
  // sprint-2 plan §3 AC10(d) — fail-closed: pepper 미정 시 throw (static fallback 제거).
  // dev 환경은 db-persistent.mjs 의 envContent 가 SESSION_TOKEN_PEPPER 를 inject,
  // .env.example 에도 명시. prod 는 cloud secret manager (별 운영 ADR).
  const pepper =
    process.env.SESSION_TOKEN_PEPPER ?? process.env.STUDY_NOTE_SESSION_TOKEN_PEPPER;
  if (!pepper) {
    throw new Error(
      "SESSION_TOKEN_PEPPER missing — fail-closed (set in .env or environment, see .env.example)."
    );
  }

  return createHmac("sha256", pepper).update(token).digest("hex");
}
