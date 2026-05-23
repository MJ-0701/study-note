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

    // Service-level 409 (deletedAt=null 만 count). DB FK (PdfMaterial.subjectId
    // = default RESTRICT) 가 race condition defense-in-depth (Codex Round-3 P1).
    const materialCount = await this.prisma.pdfMaterial.count({
      where: { subjectId: id, deletedAt: null }
    });
    if (materialCount > 0) {
      throw new ConflictException({
        errorCode: "HAS_CHILDREN",
        errorMessage: "cannot delete subject that contains materials"
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

  async getChildCount(
    id: string,
    actorId: string,
    actorRole: "master" | "admin" | "normal"
  ): Promise<{ materialCount: number }> {
    const subject = await this.findOrThrow(id);
    await this.ensureParentTermAllowed(subject.termId, actorId, actorRole);
    const materialCount = await this.prisma.pdfMaterial.count({
      where: { subjectId: id, deletedAt: null }
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
