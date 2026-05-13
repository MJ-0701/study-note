import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
  UseGuards
} from "@nestjs/common";
import { Roles, RoleGuard, SessionAuthGuard } from "@study-note/auth";
import type { UserProfile } from "@study-note/domain";
import { AdminService, AdminUserRecord } from "./admin.service";

// Minimal inline request type — avoids importing @types/express (memory constraint).
interface NestRequest {
  user?: UserProfile;
}

/** Response DTO for admin user list and mutation endpoints — per §5.3 + CLAUDE.md DTO rules. */
interface UserAdminWebResponse {
  id: string;
  studentNumber: string;
  displayName: string;
  role: string;
  devUserFlag: boolean;
  reviewedAt: string | null;
  createdAt: string;
}

function toWebResponse(record: AdminUserRecord): UserAdminWebResponse {
  return {
    id: record.id,
    studentNumber: record.studentNumber,
    displayName: record.displayName,
    role: record.role,
    devUserFlag: record.devUserFlag,
    reviewedAt: record.reviewedAt,
    createdAt: record.createdAt
  };
}

/** Accepted role values for the PUT /role body — uppercase per §5.3. */
const VALID_ROLES = new Set<string>(["MASTER", "ADMIN", "NORMAL"]);

@Controller("v1/admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── GET /v1/admin/users ────────────────────────────────────────────────────
  @Get("users")
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async listUsers(): Promise<UserAdminWebResponse[]> {
    const records = await this.adminService.listAllOrdered();
    return records.map(toWebResponse);
  }

  // ── PUT /v1/admin/users/:id/role ───────────────────────────────────────────
  @Put("users/:id/role")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async updateRole(
    @Param("id") targetId: string,
    @Body() body: unknown,
    @Req() req: NestRequest
  ): Promise<UserAdminWebResponse> {
    const actor = req.user as UserProfile;
    const { role: newRole } = parseRoleBody(body);

    // Self-modify check must precede ADMIN→MASTER check (cheapest check first; D-plan-6).
    if (actor.id === targetId) {
      throw new ForbiddenException({
        errorCode: "CANNOT_MODIFY_SELF",
        errorMessage: "cannot modify own role"
      });
    }

    // admin cannot promote anyone to MASTER (AC3 + R3).
    if (actor.role === "admin" && newRole === "MASTER") {
      throw new BadRequestException({
        errorCode: "ADMIN_CANNOT_PROMOTE_TO_MASTER",
        errorMessage: "admin role cannot promote to master"
      });
    }

    const updated = await this.adminService.updateRole(targetId, newRole, actor.id);
    return toWebResponse(updated);
  }

  // ── PUT /v1/admin/users/:id/dev-user-flag ─────────────────────────────────
  @Put("users/:id/dev-user-flag")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master")
  async updateDevUserFlag(
    @Param("id") targetId: string,
    @Body() body: unknown,
    @Req() req: NestRequest
  ): Promise<UserAdminWebResponse> {
    const actor = req.user as UserProfile;
    const { devUserFlag } = parseDevUserFlagBody(body);

    // Self-modify check — D-plan-6: master cannot alter their own devUserFlag.
    if (actor.id === targetId) {
      throw new ForbiddenException({
        errorCode: "CANNOT_MODIFY_SELF",
        errorMessage: "cannot modify own devUserFlag"
      });
    }

    const updated = await this.adminService.updateDevUserFlag(targetId, devUserFlag, actor.id);
    return toWebResponse(updated);
  }

  // ── PUT /v1/admin/users/:id/review ─────────────────────────────────────────
  @Put("users/:id/review")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async markReviewed(
    @Param("id") targetId: string,
    @Req() req: NestRequest
  ): Promise<UserAdminWebResponse> {
    const actor = req.user as UserProfile;
    const updated = await this.adminService.markReviewed(targetId, actor.id);
    return toWebResponse(updated);
  }
}

// ── Shield Pattern validators (CLAUDE.md) ─────────────────────────────────

function parseRoleBody(body: unknown): { role: "MASTER" | "ADMIN" | "NORMAL" } {
  if (!body || typeof body !== "object") {
    throw new BadRequestException({
      errorCode: "INVALID_INPUT",
      errorMessage: "request body is required"
    });
  }

  const input = body as Record<string, unknown>;
  const role = input["role"];

  if (typeof role !== "string" || !VALID_ROLES.has(role)) {
    throw new BadRequestException({
      errorCode: "INVALID_INPUT",
      errorMessage: "role must be one of MASTER, ADMIN, NORMAL"
    });
  }

  return { role: role as "MASTER" | "ADMIN" | "NORMAL" };
}

function parseDevUserFlagBody(body: unknown): { devUserFlag: boolean } {
  if (!body || typeof body !== "object") {
    throw new BadRequestException({
      errorCode: "INVALID_INPUT",
      errorMessage: "request body is required"
    });
  }

  const input = body as Record<string, unknown>;
  const flag = input["devUserFlag"];

  if (typeof flag !== "boolean") {
    throw new BadRequestException({
      errorCode: "INVALID_INPUT",
      errorMessage: "devUserFlag must be a boolean"
    });
  }

  return { devUserFlag: flag };
}
