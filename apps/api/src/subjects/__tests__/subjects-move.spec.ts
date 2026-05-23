/**
 * subjects-move.spec.ts — sprint-W21-sprint-1 / S7 / AC32-AC34 spec.
 *
 * 실행 (project-root):
 *   pnpm --filter @study-note/api build && \
 *   node --test apps/api/dist/subjects/__tests__/subjects-move.spec.js
 *
 * 검증 (AC34):
 *  - (a) master 모든 Term 간 move 200
 *  - (b) admin own↔own 200
 *  - (c) admin master Term → own 403 ROLE_HIERARCHY_VIOLATION (출발지 위계)
 *  - (d) admin own → master Term 403 ROLE_HIERARCHY_VIOLATION (도착지 위계)
 *  - (e) NORMAL 호출 403 (controller-level guard reflection 검증)
 *  - (f) anonymous 401 (controller-level guard reflection 검증)
 *  - (g) targetTermId 없음 404 TERM_NOT_FOUND
 *  - (h) 동일 termId no-op 200
 *  - dto: subjectMoveSchema .strict() unknown field reject
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { ROLES_KEY, RoleGuard, SessionAuthGuard } from "@study-note/auth";
import { SubjectsController } from "../subjects.controller";
import { SubjectsService } from "../subjects.service";
import { subjectMoveSchema } from "../subjects.dto";

interface MockTermRow {
  id: string;
  grade: number;
  semester: number;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockSubjectRow {
  id: string;
  title: string;
  termId: string | null;
  createdAt: Date;
}

interface MockPrisma {
  term: {
    findUnique: (args: { where: { id: string } }) => Promise<MockTermRow | null>;
  };
  subject: {
    findUnique: (args: { where: { id: string } }) => Promise<MockSubjectRow | null>;
    findMany: (args?: unknown) => Promise<MockSubjectRow[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<MockSubjectRow>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<MockSubjectRow>;
    delete: (args: { where: { id: string } }) => Promise<MockSubjectRow>;
  };
  pdfMaterial: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

function makeService(prisma: MockPrisma): SubjectsService {
  return new SubjectsService(prisma as unknown as import("@study-note/persistence").PrismaService);
}

function term(overrides: Partial<MockTermRow> = {}): MockTermRow {
  return {
    id: "term-001",
    grade: 1,
    semester: 1,
    title: "1학년 1학기",
    startDate: null,
    endDate: null,
    createdById: "user-master",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function subj(overrides: Partial<MockSubjectRow> = {}): MockSubjectRow {
  return {
    id: "subj-001",
    title: "C언어",
    termId: "term-001",
    createdAt: new Date(),
    ...overrides
  };
}

function makePrismaForMove(opts: {
  sourceTerm: MockTermRow | null;
  targetTerm: MockTermRow | null;
  subject: MockSubjectRow;
}): { prisma: MockPrisma; updates: Array<{ id: string; data: Record<string, unknown> }> } {
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
  const prisma: MockPrisma = {
    term: {
      findUnique: async ({ where }) => {
        if (where.id === opts.sourceTerm?.id) return opts.sourceTerm;
        if (where.id === opts.targetTerm?.id) return opts.targetTerm;
        return null;
      }
    },
    subject: {
      findUnique: async () => opts.subject,
      findMany: async () => [opts.subject],
      create: async () => opts.subject,
      update: async (args) => {
        updates.push({ id: args.where.id, data: args.data });
        return { ...opts.subject, ...(args.data as Partial<MockSubjectRow>) };
      },
      delete: async () => opts.subject
    },
    pdfMaterial: { count: async () => 0 }
  };
  return { prisma, updates };
}

// ─── DTO ──────────────────────────────────────────────────────────────────────

describe("AC32 — subjectMoveSchema .strict()", () => {
  it("valid targetTermId 만 포함 → success", () => {
    const result = subjectMoveSchema.safeParse({ targetTermId: "term-002" });
    assert.equal(result.success, true);
  });

  it("targetTermId 누락 → fail", () => {
    const result = subjectMoveSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("targetTermId 빈 문자열 → fail", () => {
    const result = subjectMoveSchema.safeParse({ targetTermId: "" });
    assert.equal(result.success, false);
  });

  it(".strict() unknown field reject", () => {
    const result = subjectMoveSchema.safeParse({ targetTermId: "term-002", malicious: 1 });
    assert.equal(result.success, false);
  });
});

// ─── AC34 cases ───────────────────────────────────────────────────────────────

describe("AC34 — Subject move hierarchy + edge cases", () => {
  it("(a) master 가 master-created → admin-created Term 으로 move → 200", async () => {
    const sourceTerm = term({ id: "t-master", createdById: "user-master" });
    const targetTerm = term({ id: "t-admin-x", createdById: "user-admin-x" });
    const target = subj({ termId: sourceTerm.id });
    const { prisma, updates } = makePrismaForMove({ sourceTerm, targetTerm, subject: target });
    const service = makeService(prisma);
    const result = await service.move(target.id, targetTerm.id, "user-master", "master");
    assert.equal(result.termId, targetTerm.id);
    assert.equal(updates.length, 1);
  });

  it("(b) admin 가 own → own Term 으로 move → 200", async () => {
    const sourceTerm = term({ id: "t-own-1", createdById: "user-admin" });
    const targetTerm = term({ id: "t-own-2", createdById: "user-admin" });
    const target = subj({ termId: sourceTerm.id });
    const { prisma } = makePrismaForMove({ sourceTerm, targetTerm, subject: target });
    const service = makeService(prisma);
    const result = await service.move(target.id, targetTerm.id, "user-admin", "admin");
    assert.equal(result.termId, targetTerm.id);
  });

  it("(c) admin 가 master-owned Term 의 subject 를 own 으로 move → 403 (출발지 위계)", async () => {
    const sourceTerm = term({ id: "t-master", createdById: "user-master" });
    const targetTerm = term({ id: "t-own", createdById: "user-admin" });
    const target = subj({ termId: sourceTerm.id });
    const { prisma } = makePrismaForMove({ sourceTerm, targetTerm, subject: target });
    const service = makeService(prisma);
    await assert.rejects(
      () => service.move(target.id, targetTerm.id, "user-admin", "admin"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "ROLE_HIERARCHY_VIOLATION";
      }
    );
  });

  it("(d) admin 가 own Term 의 subject 를 master Term 으로 move → 403 (도착지 위계)", async () => {
    const sourceTerm = term({ id: "t-own", createdById: "user-admin" });
    const targetTerm = term({ id: "t-master", createdById: "user-master" });
    const target = subj({ termId: sourceTerm.id });
    const { prisma } = makePrismaForMove({ sourceTerm, targetTerm, subject: target });
    const service = makeService(prisma);
    await assert.rejects(
      () => service.move(target.id, targetTerm.id, "user-admin", "admin"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "ROLE_HIERARCHY_VIOLATION";
      }
    );
  });

  it("(g) targetTermId 가 존재하지 않으면 404 TERM_NOT_FOUND", async () => {
    const sourceTerm = term({ id: "t-master", createdById: "user-master" });
    const target = subj({ termId: sourceTerm.id });
    const { prisma } = makePrismaForMove({ sourceTerm, targetTerm: null, subject: target });
    const service = makeService(prisma);
    await assert.rejects(
      () => service.move(target.id, "missing-term", "user-master", "master"),
      (err: NotFoundException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "TERM_NOT_FOUND";
      }
    );
  });

  it("(h) 동일 termId 로 move → no-op 200 (DB update 호출 없음)", async () => {
    const sourceTerm = term({ id: "t-same", createdById: "user-master" });
    const target = subj({ termId: sourceTerm.id });
    const { prisma, updates } = makePrismaForMove({ sourceTerm, targetTerm: sourceTerm, subject: target });
    const service = makeService(prisma);
    const result = await service.move(target.id, sourceTerm.id, "user-master", "master");
    assert.equal(result.termId, sourceTerm.id);
    assert.equal(updates.length, 0, "no-op must not write to DB");
  });
});

// ─── AC34 (e)(f) — controller guard decorators ────────────────────────────────

describe("AC34 (e)(f) — move endpoint guards (NORMAL=403, anon=401)", () => {
  function getGuardsOn(method: string): unknown[] {
    const fn = (SubjectsController.prototype as unknown as Record<string, Function | undefined>)[method];
    if (!fn) throw new Error(`method ${method} not found`);
    return Reflect.getMetadata("__guards__", fn) || [];
  }

  function getRolesOn(method: string): string[] | undefined {
    const fn = (SubjectsController.prototype as unknown as Record<string, Function | undefined>)[method];
    if (!fn) throw new Error(`method ${method} not found`);
    return Reflect.getMetadata(ROLES_KEY, fn);
  }

  it("PUT /move has SessionAuthGuard + RoleGuard + master/admin only", () => {
    const guards = getGuardsOn("move");
    const roles = getRolesOn("move");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });
});
