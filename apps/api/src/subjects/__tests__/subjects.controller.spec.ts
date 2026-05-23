/**
 * subjects.controller.spec.ts — sprint-W21-sprint-1 / S1 / AC4 + AC6(g) spec.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/api/src/subjects/__tests__/subjects.controller.spec.ts
 *
 * 검증:
 *  - Subject 자체엔 위계 없음. 부모 Term 위계 검사 동작 (AC6 case g)
 *  - delete 409 HAS_CHILDREN (PdfMaterial deletedAt IS NULL)
 *  - controller guard 적용 (NORMAL=403, anonymous=401)
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { ROLES_KEY, RoleGuard, SessionAuthGuard } from "@study-note/auth";
import { SubjectsController } from "../subjects.controller";
import { SubjectsService } from "../subjects.service";
import { subjectCreateSchema, subjectUpdateSchema } from "../subjects.dto";

interface MockSubjectRow {
  id: string;
  title: string;
  termId: string | null;
  createdAt: Date;
}

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

// ─── AC4 DTO validation ───────────────────────────────────────────────────────

describe("AC4 — subject DTO validation", () => {
  it("create requires title", () => {
    const result = subjectCreateSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("create .strict() rejects unknown field", () => {
    const result = subjectCreateSchema.safeParse({ title: "C언어", malicious: 1 });
    assert.equal(result.success, false);
  });

  it("update requires title (no other fields allowed — S7 move 별도)", () => {
    const empty = subjectUpdateSchema.safeParse({});
    assert.equal(empty.success, false);
  });

  it("update accepts title only", () => {
    const result = subjectUpdateSchema.safeParse({ title: "Renamed" });
    assert.equal(result.success, true);
  });

  it("update .strict() rejects termId (move is S7 PUT /move)", () => {
    const result = subjectUpdateSchema.safeParse({ title: "Renamed", termId: "term-x" });
    assert.equal(result.success, false);
  });
});

// ─── AC6 (g) — parent Term hierarchy applies to Subject mutations ───────────

describe("AC6(g) — Subject 차원엔 위계 없음, 부모 Term 위계가 적용", () => {
  it("admin → subject under master-created term → update 403 ROLE_HIERARCHY_VIOLATION", async () => {
    const masterTerm = term({ createdById: "user-master" });
    const target = subj({ termId: masterTerm.id });
    const prisma: MockPrisma = {
      term: { findUnique: async () => masterTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      pdfMaterial: { count: async () => 0 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.update(target.id, { title: "Renamed" }, "user-admin", "admin"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "ROLE_HIERARCHY_VIOLATION";
      }
    );
  });

  it("admin → subject under own term → update 200", async () => {
    const ownTerm = term({ createdById: "user-admin" });
    const target = subj({ termId: ownTerm.id });
    const updated = subj({ ...target, title: "Renamed" });
    const prisma: MockPrisma = {
      term: { findUnique: async () => ownTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => updated,
        delete: async () => target
      },
      pdfMaterial: { count: async () => 0 }
    };
    const service = makeService(prisma);
    const result = await service.update(target.id, { title: "Renamed" }, "user-admin", "admin");
    assert.equal(result.title, "Renamed");
  });

  it("master → any subject → update 200", async () => {
    const someTerm = term({ createdById: "user-admin-x" });
    const target = subj({ termId: someTerm.id });
    const updated = subj({ ...target, title: "Renamed" });
    const prisma: MockPrisma = {
      term: { findUnique: async () => someTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => updated,
        delete: async () => target
      },
      pdfMaterial: { count: async () => 0 }
    };
    const service = makeService(prisma);
    const result = await service.update(target.id, { title: "Renamed" }, "user-master", "master");
    assert.equal(result.title, "Renamed");
  });
});

// ─── AC4 delete 409 HAS_CHILDREN ─────────────────────────────────────────────

describe("AC4 — delete = 409 HAS_CHILDREN (PdfMaterial deletedAt IS NULL)", () => {
  it("subject with materials > 0 → 409 HAS_CHILDREN", async () => {
    const parentTerm = term({ createdById: "user-master" });
    const target = subj({ termId: parentTerm.id });
    const prisma: MockPrisma = {
      term: { findUnique: async () => parentTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      pdfMaterial: { count: async () => 4 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.delete(target.id, "user-master", "master"),
      (err: ConflictException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "HAS_CHILDREN";
      }
    );
  });

  it("(Codex Round-3 P1) FK P2003 violation during delete → 409 HAS_CHILDREN (race window)", async () => {
    const parentTerm = term({ createdById: "user-master" });
    const target = subj({ termId: parentTerm.id });
    const prisma: MockPrisma = {
      term: { findUnique: async () => parentTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => {
          throw Object.assign(new Error("FK constraint"), { code: "P2003" });
        }
      },
      pdfMaterial: { count: async () => 0 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.delete(target.id, "user-master", "master"),
      (err: ConflictException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "HAS_CHILDREN";
      }
    );
  });

  it("subject with materials = 0 → success", async () => {
    const parentTerm = term({ createdById: "user-master" });
    const target = subj({ termId: parentTerm.id });
    let deleted = false;
    const prisma: MockPrisma = {
      term: { findUnique: async () => parentTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => {
          deleted = true;
          return target;
        }
      },
      pdfMaterial: { count: async () => 0 }
    };
    const service = makeService(prisma);
    await service.delete(target.id, "user-master", "master");
    assert.equal(deleted, true);
  });

  it("count only PdfMaterial with deletedAt=null (soft-delete 제외)", async () => {
    const parentTerm = term({ createdById: "user-master" });
    const target = subj({ termId: parentTerm.id });
    let capturedWhere: Record<string, unknown> | undefined;
    const prisma: MockPrisma = {
      term: { findUnique: async () => parentTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      pdfMaterial: {
        count: async (args) => {
          capturedWhere = args.where;
          return 0;
        }
      }
    };
    const service = makeService(prisma);
    await service.delete(target.id, "user-master", "master");
    assert.equal((capturedWhere as { deletedAt: null }).deletedAt, null);
  });
});

// ─── AC5b (Codex Round-2 blocking) child-count 위계 ─────────────────────────

describe("AC5b — child-count 부모 Term 위계 검사 (Codex Round-2 blocking)", () => {
  it("admin → subject under master-owned term → child-count 403 ROLE_HIERARCHY_VIOLATION", async () => {
    const masterTerm = term({ createdById: "user-master" });
    const target = subj({ termId: masterTerm.id });
    const prisma: MockPrisma = {
      term: { findUnique: async () => masterTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      pdfMaterial: { count: async () => 4 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.getChildCount(target.id, "user-admin", "admin"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "ROLE_HIERARCHY_VIOLATION";
      }
    );
  });

  it("master → any subject child-count → success", async () => {
    const someTerm = term({ createdById: "user-admin-x" });
    const target = subj({ termId: someTerm.id });
    const prisma: MockPrisma = {
      term: { findUnique: async () => someTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      pdfMaterial: { count: async () => 2 }
    };
    const service = makeService(prisma);
    const result = await service.getChildCount(target.id, "user-master", "master");
    assert.deepEqual(result, { materialCount: 2 });
  });

  it("admin → subject under own term → child-count 성공", async () => {
    const ownTerm = term({ createdById: "user-admin" });
    const target = subj({ termId: ownTerm.id });
    const prisma: MockPrisma = {
      term: { findUnique: async () => ownTerm },
      subject: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      pdfMaterial: { count: async () => 1 }
    };
    const service = makeService(prisma);
    const result = await service.getChildCount(target.id, "user-admin", "admin");
    assert.deepEqual(result, { materialCount: 1 });
  });
});

// ─── AC4 create — term not found → 404 ──────────────────────────────────────

describe("AC4 — create under missing term → 404 TERM_NOT_FOUND", () => {
  it("term not found → 404", async () => {
    const prisma: MockPrisma = {
      term: { findUnique: async () => null },
      subject: {
        findUnique: async () => null,
        findMany: async () => [],
        create: async () => subj(),
        update: async () => subj(),
        delete: async () => subj()
      },
      pdfMaterial: { count: async () => 0 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.create("missing-term", { title: "X" }, "user-master", "master"),
      (err: NotFoundException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "TERM_NOT_FOUND";
      }
    );
  });
});

// ─── AC6 (a)(b) — controller guard decorators applied ─────────────────────────

describe("AC6 — guard decorators on Subject controller methods", () => {
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

  it("GET list has SessionAuthGuard (anonymous=401)", () => {
    const guards = getGuardsOn("list");
    assert.ok(guards.includes(SessionAuthGuard));
  });

  it("POST create has master/admin only", () => {
    const guards = getGuardsOn("create");
    const roles = getRolesOn("create");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });

  it("PUT update has master/admin only", () => {
    const guards = getGuardsOn("update");
    const roles = getRolesOn("update");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });

  it("DELETE delete has master/admin only", () => {
    const guards = getGuardsOn("delete");
    const roles = getRolesOn("delete");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });

  it("GET child-count has master/admin only", () => {
    const guards = getGuardsOn("childCount");
    const roles = getRolesOn("childCount");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });
});
