import { Injectable } from "@nestjs/common";
import type { UserProfile } from "@study-note/domain";
import { PrismaService, toUserProfile } from "@study-note/persistence";

/** Raw user row including devUserFlag — used for auth allowlist checks only. */
export interface AuthCandidate {
  profile: UserProfile;
  devUserFlag: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByNameAndStudentNumber(
    displayName: string,
    studentNumber: string
  ): Promise<UserProfile | undefined> {
    const user = await this.prisma.user.findFirst({
      where: {
        displayName: displayName.trim(),
        studentNumber: studentNumber.trim()
      }
    });

    return user ? toUserProfile(user) : undefined;
  }

  /**
   * Looks up a user by name + studentNumber and returns both the UserProfile and
   * the raw devUserFlag field. Used exclusively by AuthService.login for the
   * allowlist check (plan §8 F1 / spec §3).
   */
  async findAuthCandidate(
    name: string,
    studentNumber: string
  ): Promise<AuthCandidate | undefined> {
    const user = await this.prisma.user.findFirst({
      where: {
        displayName: name.trim(),
        studentNumber: studentNumber.trim()
      }
    });

    if (!user) return undefined;

    return {
      profile: toUserProfile(user),
      devUserFlag: user.devUserFlag
    };
  }

  async findByStudentNumber(
    studentNumber: string
  ): Promise<UserProfile | undefined> {
    const user = await this.prisma.user.findFirst({
      where: { studentNumber: studentNumber.trim() }
    });

    return user ? toUserProfile(user) : undefined;
  }

  async createUser(input: {
    name: string;
    studentNumber: string;
    role: "NORMAL" | "ADMIN" | "REVIEWER" | "MASTER";
    devUserFlag: boolean;
  }): Promise<UserProfile> {
    const user = await this.prisma.user.create({
      data: {
        displayName: input.name.trim(),
        studentNumber: input.studentNumber.trim(),
        role: input.role,
        devUserFlag: input.devUserFlag
      }
    });

    return toUserProfile(user);
  }

  async findById(userId: string): Promise<UserProfile | undefined> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    return user ? toUserProfile(user) : undefined;
  }

  async listAll(): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return users.map(toUserProfile);
  }
}
