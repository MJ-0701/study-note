// sprint-W21-sprint-1 / S1 / AC3 + AC5b + AC6 — Term controller.
//
// - GET /v1/terms: SessionAuthGuard only (anon=401). NORMAL 도 read 가능.
//   response shape role 별 분기: NORMAL=public, master/admin=admin (createdById/updatedAt 포함).
// - POST /v1/terms / PUT /v1/terms/:id / DELETE /v1/terms/:id: master/admin gated.
// - GET /v1/terms/:id/child-count: master/admin gated (admin UI preflight).

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards
} from "@nestjs/common";
import { Roles, RoleGuard, SessionAuthGuard } from "@study-note/auth";
import type { UserProfile } from "@study-note/domain";
import { TermsService } from "./terms.service";
import {
  type TermAdminResponse,
  type TermPublicResponse,
  termCreateSchema,
  termUpdateSchema,
  toTermAdmin,
  toTermPublic
} from "./terms.dto";

interface NestRequest {
  user?: UserProfile;
}

@Controller("v1/terms")
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  async list(@Req() req: NestRequest): Promise<Array<TermPublicResponse | TermAdminResponse>> {
    const actor = req.user as UserProfile;
    const rows = await this.terms.list();
    if (actor.role === "master" || actor.role === "admin") {
      return rows.map(toTermAdmin);
    }
    return rows.map(toTermPublic);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async create(@Body() body: unknown, @Req() req: NestRequest): Promise<TermAdminResponse> {
    const actor = req.user as UserProfile;
    const parsed = termCreateSchema.safeParse(body);
    if (!parsed.success) throwInvalidInput(parsed.error.issues);
    const created = await this.terms.create(parsed.data, actor.id);
    return toTermAdmin(created);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: NestRequest
  ): Promise<TermAdminResponse> {
    const actor = req.user as UserProfile;
    const parsed = termUpdateSchema.safeParse(body);
    if (!parsed.success) throwInvalidInput(parsed.error.issues);
    const updated = await this.terms.update(id, parsed.data, actor.id, actor.role);
    return toTermAdmin(updated);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async delete(@Param("id") id: string, @Req() req: NestRequest): Promise<void> {
    const actor = req.user as UserProfile;
    await this.terms.delete(id, actor.id, actor.role);
  }

  @Get(":id/child-count")
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async childCount(@Param("id") id: string): Promise<{ subjectCount: number }> {
    return this.terms.getChildCount(id);
  }
}

function throwInvalidInput(issues: Array<{ message: string; path: ReadonlyArray<PropertyKey> }>): never {
  const first = issues[0];
  const field = first?.path.join(".") || "body";
  throw new BadRequestException({
    errorCode: "INVALID_INPUT",
    errorMessage: `${field}: ${first?.message ?? "invalid input"}`
  });
}
