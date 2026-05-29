import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@study-note/persistence";

/** Admin-facing user row — 7 fields per §5.3. role is lowercase per UserProfile convention. */
export interface AdminUserRecord {
  id: string;
  studentNumber: string;
  displayName: string;
  role: "master" | "admin" | "reviewer" | "normal";
  devUserFlag: boolean;
  reviewedAt: string | null;
  createdAt: string;
}

type PrismaUserRow = {
  id: string;
  displayName: string;
  studentNumber: string;
  role: "MASTER" | "ADMIN" | "REVIEWER" | "NORMAL";
  devUserFlag: boolean;
  reviewedAt: Date | null;
  createdAt: Date;
};

function toAdminRecord(user: PrismaUserRow): AdminUserRecord {
  return {
    id: user.id,
    studentNumber: user.studentNumber,
    displayName: user.displayName,
    role: user.role.toLowerCase() as AdminUserRecord["role"],
    devUserFlag: user.devUserFlag,
    reviewedAt: user.reviewedAt ? user.reviewedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString()
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Returns all users ordered by createdAt desc — admin dashboard list endpoint. */
  async listAllOrdered(): Promise<AdminUserRecord[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" }
    });
    return users.map(toAdminRecord);
  }

  /**
   * Updates the role of a user.
   * Fetches before update to capture old value for audit log.
   * Throws NotFoundException if user does not exist.
   */
  async updateRole(
    id: string,
    newRole: "MASTER" | "ADMIN" | "REVIEWER" | "NORMAL",
    actorId: string,
    actorRole: string
  ): Promise<AdminUserRecord> {
    const before = await this.findOrThrow(id);
    // admin 은 master role 사용자의 role 변경 금지 (권한 위계 보호 — 사용자 lock).
    if (actorRole === "admin" && before.role.toLowerCase() === "master") {
      throw new ForbiddenException({
        errorCode: "CANNOT_MODIFY_MASTER",
        errorMessage: "admin cannot modify master"
      });
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: newRole }
    });
    const iso = new Date().toISOString();
    this.logger.log(
      `[Admin] role update userId=${id} from=${before.role.toUpperCase()} to=${newRole} actor=${actorId} at=${iso}`
    );
    return toAdminRecord(updated);
  }

  /**
   * Updates the devUserFlag of a user.
   * Fetches before update to capture old value for audit log.
   * Throws NotFoundException if user does not exist.
   */
  async updateDevUserFlag(
    id: string,
    flag: boolean,
    actorId: string
  ): Promise<AdminUserRecord> {
    const before = await this.findOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { devUserFlag: flag }
    });
    const iso = new Date().toISOString();
    this.logger.log(
      `[Admin] devUserFlag update userId=${id} from=${before.devUserFlag} to=${flag} actor=${actorId} at=${iso}`
    );
    return toAdminRecord(updated);
  }

  /**
   * Sets reviewedAt = now(). Idempotent — always updates (spec AC5).
   * Throws NotFoundException if user does not exist.
   */
  async markReviewed(id: string, actorId: string): Promise<AdminUserRecord> {
    await this.findOrThrow(id);
    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id },
      data: { reviewedAt: now }
    });
    this.logger.log(
      `[Admin] review marked userId=${id} reviewedAt=${now.toISOString()} actor=${actorId}`
    );
    return toAdminRecord(updated);
  }

  private async findOrThrow(id: string): Promise<PrismaUserRow> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        errorCode: "USER_NOT_FOUND",
        errorMessage: "user not found"
      });
    }
    return user as PrismaUserRow;
  }
}
