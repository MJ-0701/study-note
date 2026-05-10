import { Injectable } from "@nestjs/common";
import type { UserProfile } from "@study-note/domain";
import { PrismaService, toUserProfile } from "@study-note/persistence";

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

  async listAll(): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return users.map(toUserProfile);
  }
}
