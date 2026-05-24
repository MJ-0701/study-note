// sprint-W21-sprint-1 / S1 / AC4 + AC5b — Subject service.
//
// Subject = metadata-only (ADR-4). Subject 자체엔 위계 없음 — 부모 Term 위계만 적용.
// delete = 409 HAS_CHILDREN if PdfMaterial (deletedAt IS NULL) > 0.

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "@study-note/persistence";
import type { Subject as PrismaSubject } from "@prisma/client";
import { ensureTermHierarchyAllowed } from "../terms/terms.service";

function isForeignKeyViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "P2003";
}

function isRecordNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "P2025";
}
import type { SubjectCreateInput, SubjectUpdateInput } from "./subjects.dto";

@Injectable()
export class SubjectsService {
  private readonly logger = new Logger(SubjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PrismaSubject[]> {
    return this.prisma.subject.findMany({
      orderBy: [{ termId: "asc" }, { title: "asc" }]
    });
  }

  async create(
    termId: string,
    input: SubjectCreateInput,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<PrismaSubject> {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException({
        errorCode: "TERM_NOT_FOUND",
        errorMessage: "term not found"
      });
    }
    ensureTermHierarchyAllowed(term, actorId, actorRole);
    const created = await this.prisma.subject.create({
      data: {
        title: input.title,
        termId
      }
    });
    this.logger.warn(
      `[Subject] action=create id=${created.id} termId=${termId} actor=${actorId} title=${created.title}`
    );
    return created;
  }

  async update(
    id: string,
    input: SubjectUpdateInput,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<PrismaSubject> {
    const before = await this.findOrThrow(id);
    await this.ensureParentTermAllowed(before.termId, actorId, actorRole);
    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        title: input.title
      }
    });
    this.logger.warn(
      `[Subject] action=update id=${id} actor=${actorId} before=t=${before.title}/term=${before.termId ?? "null"} after=t=${updated.title}/term=${updated.termId ?? "null"}`
    );
    return updated;
  }

  async delete(
    id: string,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<void> {
    const before = await this.findOrThrow(id);
    await this.ensureParentTermAllowed(before.termId, actorId, actorRole);

    // Service-level 409. DB FK (PdfMaterial.subjectId = default RESTRICT) 는
    // deletedAt=null/not-null 구분 없이 모든 referencing row 를 block 하므로
    // preflight 도 동일하게 count all 해야 UI/DB 정합 (Codex Round-4 P1).
    // 살아있는 / soft-deleted 도 모두 count.
    const materialCount = await this.prisma.pdfMaterial.count({
      where: { subjectId: id }
    });
    if (materialCount > 0) {
      throw new ConflictException({
        errorCode: "HAS_CHILDREN",
        errorMessage: "cannot delete subject that contains materials (including soft-deleted)"
      });
    }

    try {
      await this.prisma.subject.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException({
          errorCode: "HAS_CHILDREN",
          errorMessage: "cannot delete subject that contains materials (concurrent insert or soft-deleted row)"
        });
      }
      throw err;
    }
    this.logger.warn(
      `[Subject] action=delete id=${id} actor=${actorId} title=${before.title} term=${before.termId ?? "null"}`
    );
  }

  /**
   * S7 AC32 — Subject move. Subject.termId 만 변경, 자식 PdfMaterial/R2 key 영향 0
   * (Subject = metadata-only, ADR-4). 출발지 + 도착지 Term 둘 다 위계 검사.
   */
  async move(
    id: string,
    targetTermId: string,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<PrismaSubject> {
    const before = await this.findOrThrow(id);
    await this.ensureParentTermAllowed(before.termId, actorId, actorRole);
    // 동일 termId no-op (AC34 case h).
    if (before.termId === targetTermId) {
      return before;
    }
    // 도착지 Term 존재 + 위계 검사.
    const targetTerm = await this.prisma.term.findUnique({ where: { id: targetTermId } });
    if (!targetTerm) {
      throw new NotFoundException({
        errorCode: "TERM_NOT_FOUND",
        errorMessage: "target term not found"
      });
    }
    ensureTermHierarchyAllowed(targetTerm, actorId, actorRole);

    let updated: PrismaSubject;
    try {
      updated = await this.prisma.subject.update({
        where: { id },
        data: { termId: targetTermId }
      });
    } catch (err) {
      // PR #50 codex Round-1 P2: targetTerm findUnique 와 update 사이에 target
      // term 이 concurrent delete 되면 FK violation. delete 분기 패턴 일관
      // 회기 — P2003 catch → 404 TERM_NOT_FOUND.
      if (isForeignKeyViolation(err)) {
        throw new NotFoundException({
          errorCode: "TERM_NOT_FOUND",
          errorMessage: "target term not found (concurrent delete)"
        });
      }
      // PR #50 codex R2 P2: subject 자체가 findOrThrow 후 update 사이에 삭제되면
      // P2025 (record to update not found). 다른 404 path 와 일관 SUBJECT_NOT_FOUND.
      if (isRecordNotFoundError(err)) {
        throw new NotFoundException({
          errorCode: "SUBJECT_NOT_FOUND",
          errorMessage: "subject not found (concurrent delete)"
        });
      }
      throw err;
    }
    this.logger.warn(
      `[Subject] action=move id=${id} from=${before.termId ?? "null"} to=${targetTermId} actor=${actorId}`
    );
    return updated;
  }

  async getChildCount(
    id: string,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<{ materialCount: number }> {
    const subject = await this.findOrThrow(id);
    await this.ensureParentTermAllowed(subject.termId, actorId, actorRole);
    // Codex Round-4 P1: delete preflight 과 동일하게 deletedAt 무관 count
    // (FK RESTRICT 가 모든 row block 하므로 preflight 도 정합 필요).
    const materialCount = await this.prisma.pdfMaterial.count({
      where: { subjectId: id }
    });
    return { materialCount };
  }

  private async findOrThrow(id: string): Promise<PrismaSubject> {
    const row = await this.prisma.subject.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        errorCode: "SUBJECT_NOT_FOUND",
        errorMessage: "subject not found"
      });
    }
    return row;
  }

  private async ensureParentTermAllowed(
    termId: string | null,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<void> {
    if (!termId) {
      if (actorRole !== "master") {
        throw new NotFoundException({
          errorCode: "TERM_NOT_FOUND",
          errorMessage: "subject has no parent term"
        });
      }
      return;
    }
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException({
        errorCode: "TERM_NOT_FOUND",
        errorMessage: "term not found"
      });
    }
    ensureTermHierarchyAllowed(term, actorId, actorRole);
  }
}
