// sprint-W21-sprint-1 / S1 / AC4 + AC5b + AC6 — Subject controller.

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
import { SubjectsService } from "./subjects.service";
import {
  subjectCreateSchema,
  subjectMoveSchema,
  subjectUpdateSchema,
  toSubjectPublic,
  type SubjectPublicResponse
} from "./subjects.dto";

interface NestRequest {
  user?: UserProfile;
}

@Controller("v1")
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get("subjects")
  @UseGuards(SessionAuthGuard)
  async list(): Promise<SubjectPublicResponse[]> {
    const rows = await this.subjects.list();
    return rows.map(toSubjectPublic);
  }

  @Post("terms/:termId/subjects")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async create(
    @Param("termId") termId: string,
    @Body() body: unknown,
    @Req() req: NestRequest
  ): Promise<SubjectPublicResponse> {
    const actor = req.user as UserProfile;
    const parsed = subjectCreateSchema.safeParse(body);
    if (!parsed.success) throwInvalidInput(parsed.error.issues);
    const created = await this.subjects.create(termId, parsed.data, actor.id, actor.role);
    return toSubjectPublic(created);
  }

  @Put("subjects/:id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: NestRequest
  ): Promise<SubjectPublicResponse> {
    const actor = req.user as UserProfile;
    const parsed = subjectUpdateSchema.safeParse(body);
    if (!parsed.success) throwInvalidInput(parsed.error.issues);
    const updated = await this.subjects.update(id, parsed.data, actor.id, actor.role);
    return toSubjectPublic(updated);
  }

  @Delete("subjects/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async delete(@Param("id") id: string, @Req() req: NestRequest): Promise<void> {
    const actor = req.user as UserProfile;
    await this.subjects.delete(id, actor.id, actor.role);
  }

  @Get("subjects/:id/child-count")
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async childCount(
    @Param("id") id: string,
    @Req() req: NestRequest
  ): Promise<{ materialCount: number }> {
    const actor = req.user as UserProfile;
    return this.subjects.getChildCount(id, actor.id, actor.role);
  }

  // S7 AC32 — Subject move. Subject = metadata-only (ADR-4) — termId 만 변경.
  @Put("subjects/:id/move")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async move(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: NestRequest
  ): Promise<SubjectPublicResponse> {
    const actor = req.user as UserProfile;
    const parsed = subjectMoveSchema.safeParse(body);
    if (!parsed.success) throwInvalidInput(parsed.error.issues);
    const updated = await this.subjects.move(id, parsed.data.targetTermId, actor.id, actor.role);
    return toSubjectPublic(updated);
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
