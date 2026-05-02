import { Injectable } from "@nestjs/common";
import type { UserProfile } from "../domain/workspace.types";
import { PrismaService } from "../prisma/prisma.service";
import { toUserProfile } from "../prisma/workspace.mappers";

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

  async findById(userId: string): Promise<UserProfile | undefined> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    return user ? toUserProfile(user) : undefined;
  }
}
