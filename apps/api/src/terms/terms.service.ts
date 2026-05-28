// sprint-W21-sprint-1 / S1 / AC3 + AC5b + AC7 — Term service.
//
// - CRUD + child count
// - audit log: `[Term] action=... id=... actor=... before=... after=...`
// - admin↔master 위계: master 가 만든 term 은 admin PUT/DELETE 불가 (403)
//   admin 은 본인 created Term 만 가능. master 는 모든 term 가능.
// - delete = 409 HAS_CHILDREN reject only (cascade soft-delete 폐기)

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import type { Term as PrismaTerm } from "@prisma/client";
import type { TermCreateInput, TermUpdateInput } from "./terms.dto";
import { TermRepository } from "./term.repository";

@Injectable()
export class TermsService {
  private readonly logger = new Logger(TermsService.name);

  // DDD Slice 5: TermsService 는 Prisma 직접 의존 0 — TermRepository 만 사용.
  constructor(private readonly termRepo: TermRepository) {}

  async list(): Promise<PrismaTerm[]> {
    return this.termRepo.findAllOrdered();
  }

  async create(input: TermCreateInput, actorId: string): Promise<PrismaTerm> {
    try {
      const created = await this.termRepo.create({
        grade: input.grade,
        semester: input.semester,
        title: input.title,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        createdById: actorId
      });
      this.logger.warn(
        `[Term] action=create id=${created.id} actor=${actorId} grade=${created.grade} semester=${created.semester} title=${created.title}`
      );
      return created;
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException({
          errorCode: "TERM_ALREADY_EXISTS",
          errorMessage: "term with same (grade, semester, title) already exists"
        });
      }
      throw err;
    }
  }

  async update(
    id: string,
    input: TermUpdateInput,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<PrismaTerm> {
    const before = await this.findOrThrow(id);
    ensureTermHierarchyAllowed(before, actorId, actorRole);

    // Merge before + input → validate combined startDate/endDate invariant.
    // Schema-level refine 가 부분 update 의 절반만 검증하던 leak fix (Codex Round-2 P1).
    const mergedStart = input.startDate === undefined ? before.startDate : input.startDate;
    const mergedEnd = input.endDate === undefined ? before.endDate : input.endDate;
    if (mergedStart && mergedEnd && mergedStart.getTime() > mergedEnd.getTime()) {
      throw new BadRequestException({
        errorCode: "INVALID_INPUT",
        errorMessage: "endDate must be on or after startDate"
      });
    }

    try {
      const updated = await this.termRepo.update(id, {
        grade: input.grade ?? undefined,
        semester: input.semester ?? undefined,
        title: input.title ?? undefined,
        startDate: input.startDate === undefined ? undefined : input.startDate,
        endDate: input.endDate === undefined ? undefined : input.endDate
      });
      this.logger.warn(
        `[Term] action=update id=${id} actor=${actorId} before=${termSummary(before)} after=${termSummary(updated)}`
      );
      return updated;
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException({
          errorCode: "TERM_ALREADY_EXISTS",
          errorMessage: "term with same (grade, semester, title) already exists"
        });
      }
      throw err;
    }
  }

  async delete(
    id: string,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<void> {
    const before = await this.findOrThrow(id);
    ensureTermHierarchyAllowed(before, actorId, actorRole);

    // Service-level 409 (fast path). DB FK ON DELETE RESTRICT 가 race condition
    // defense-in-depth (Codex Round-3 P1).
    const childCount = await this.termRepo.countChildSubjects(id);
    if (childCount > 0) {
      throw new ConflictException({
        errorCode: "HAS_CHILDREN",
        errorMessage: "cannot delete term that contains subjects"
      });
    }

    try {
      await this.termRepo.deleteById(id);
    } catch (err) {
      // P2003 = FK constraint failed. concurrent Subject INSERT 가 count-after-check
      // 사이에 끼면 여기서 잡혀서 동일한 409 응답 (race window 보호).
      if (isForeignKeyViolation(err)) {
        throw new ConflictException({
          errorCode: "HAS_CHILDREN",
          errorMessage: "cannot delete term that contains subjects (concurrent insert)"
        });
      }
      throw err;
    }
    this.logger.warn(`[Term] action=delete id=${id} actor=${actorId} before=${termSummary(before)}`);
  }

  async getChildCount(
    id: string,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<{ subjectCount: number }> {
    const term = await this.findOrThrow(id);
    ensureTermHierarchyAllowed(term, actorId, actorRole);
    const subjectCount = await this.termRepo.countChildSubjects(id);
    return { subjectCount };
  }

  private async findOrThrow(id: string): Promise<PrismaTerm> {
    const row = await this.termRepo.findById(id);
    if (!row) {
      throw new NotFoundException({
        errorCode: "TERM_NOT_FOUND",
        errorMessage: "term not found"
      });
    }
    return row;
  }
}

export function ensureTermHierarchyAllowed(
  term: { createdById: string },
  actorId: string,
  actorRole: "master" | "admin" | "normal"
): void {
  if (actorRole === "master") return;
  if (actorRole !== "admin") {
    throw new ForbiddenException({
      errorCode: "FORBIDDEN_ROLE",
      errorMessage: "role not authorized"
    });
  }
  if (term.createdById === actorId) return;
  throw new ForbiddenException({
    errorCode: "ROLE_HIERARCHY_VIOLATION",
    errorMessage: "admin cannot modify term owned by another user"
  });
}

function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "P2002";
}

function isForeignKeyViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "P2003";
}

function termSummary(term: PrismaTerm): string {
  const start = term.startDate ? term.startDate.toISOString().slice(0, 10) : "null";
  const end = term.endDate ? term.endDate.toISOString().slice(0, 10) : "null";
  return `g=${term.grade}/s=${term.semester}/t=${term.title}/start=${start}/end=${end}`;
}
