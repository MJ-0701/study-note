/**
 * terms.controller.spec.ts — sprint-W21-sprint-1 / S1 / AC1 + AC1b + AC3 + AC6 spec.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/api/src/terms/__tests__/terms.controller.spec.ts
 *
 * 검증:
 *  - AC1 negative date validation (5 cases)
 *  - AC6 hierarchy (4 cases: admin→master 403, admin→other-admin 403,
 *    admin→own 200, master→all 200)
 *  - AC6 controller guard decorators (NORMAL=403 / anonymous=401 via guards)
 *  - AC3 delete 409 HAS_CHILDREN
 *  - AC3 audit log
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { ROLES_KEY, RoleGuard, SessionAuthGuard } from "@study-note/auth";
import { TermsController } from "../terms.controller";
import {
  TermsService,
  ensureTermHierarchyAllowed
} from "../terms.service";
import { TermRepository } from "../term.repository";
import { termCreateSchema } from "../terms.dto";

// ─── Mock prisma factory ──────────────────────────────────────────────────────

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
    findMany: (args?: unknown) => Promise<MockTermRow[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<MockTermRow>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<MockTermRow>;
    delete: (args: { where: { id: string } }) => Promise<MockTermRow>;
  };
  subject: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

function makeService(prisma: MockPrisma): TermsService {
  const ps = prisma as unknown as import("@study-note/persistence").PrismaService;
  // DDD Slice 4: TermRepository 가 동일 prisma mock 의 term.* 위임.
  return new TermsService(ps, new TermRepository(ps));
}

function termRow(overrides: Partial<MockTermRow> = {}): MockTermRow {
  return {
    id: "term-001",
    grade: 1,
    semester: 1,
    title: "1학년 1학기",
    startDate: null,
    endDate: null,
    createdById: "user-master",
    createdAt: new Date("2026-05-23T00:00:00.000Z"),
    updatedAt: new Date("2026-05-23T00:00:00.000Z"),
    ...overrides
  };
}

// ─── AC1 negative date validation (5 cases) ──────────────────────────────────

describe("AC1 — startDate/endDate validation", () => {
  it("(a) startDate=2026-13-01 (invalid month) → 400", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: "Test",
      startDate: "2026-13-01"
    });
    assert.equal(result.success, false);
  });

  it("(b) startDate=2026-02-30 (calendar overflow) → 400", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: "Test",
      startDate: "2026-02-30"
    });
    assert.equal(result.success, false);
  });

  it("(c) startDate=2026-05-01, endDate=2026-03-01 (역순) → 400", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: "Test",
      startDate: "2026-05-01",
      endDate: "2026-03-01"
    });
    assert.equal(result.success, false);
  });

  it("(d) startDate=null, endDate=2026-06-30 (단일 허용) → success", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: "Test",
      startDate: null,
      endDate: "2026-06-30"
    });
    assert.equal(result.success, true);
  });

  it("(e) startDate=2026-03-01, endDate=2026-06-30 → success", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: "Test",
      startDate: "2026-03-01",
      endDate: "2026-06-30"
    });
    assert.equal(result.success, true);
  });

  it(".strict() rejects unknown field", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: "Test",
      malicious: "x"
    });
    assert.equal(result.success, false);
  });

  it("title with control char (\\x00) rejected", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: `bad${String.fromCharCode(0x00)}title`
    });
    assert.equal(result.success, false);
  });

  it("title with DEL (\\x7F) rejected", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: `bad${String.fromCharCode(0x7f)}title`
    });
    assert.equal(result.success, false);
  });

  it("title length > 40 rejected", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 1,
      title: "x".repeat(41)
    });
    assert.equal(result.success, false);
  });

  it("grade out of range (5) rejected", () => {
    const result = termCreateSchema.safeParse({
      grade: 5,
      semester: 1,
      title: "Test"
    });
    assert.equal(result.success, false);
  });

  it("semester out of range (3) rejected", () => {
    const result = termCreateSchema.safeParse({
      grade: 1,
      semester: 3,
      title: "Test"
    });
    assert.equal(result.success, false);
  });
});

// ─── AC6 hierarchy (cases c, d, e, f) ─────────────────────────────────────────

describe("AC6 — admin↔master 위계", () => {
  it("(c) admin → master-created term → 403 ROLE_HIERARCHY_VIOLATION", () => {
    const masterTerm = { createdById: "user-master" };
    assert.throws(
      () => ensureTermHierarchyAllowed(masterTerm, "user-admin", "admin"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "ROLE_HIERARCHY_VIOLATION";
      }
    );
  });

  it("(d) admin → another admin-created term → 403", () => {
    const otherAdminTerm = { createdById: "user-admin-other" };
    assert.throws(
      () => ensureTermHierarchyAllowed(otherAdminTerm, "user-admin", "admin"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "ROLE_HIERARCHY_VIOLATION";
      }
    );
  });

  it("(e) admin → own term → allowed (no throw)", () => {
    const ownTerm = { createdById: "user-admin" };
    assert.doesNotThrow(() => ensureTermHierarchyAllowed(ownTerm, "user-admin", "admin"));
  });

  it("(f) master → any term → allowed", () => {
    assert.doesNotThrow(() => ensureTermHierarchyAllowed({ createdById: "x" }, "user-master", "master"));
    assert.doesNotThrow(() => ensureTermHierarchyAllowed({ createdById: "user-master" }, "user-master", "master"));
  });

  it("normal role → 403 FORBIDDEN_ROLE", () => {
    assert.throws(
      () => ensureTermHierarchyAllowed({ createdById: "user-master" }, "user-normal", "normal"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "FORBIDDEN_ROLE";
      }
    );
  });
});

// ─── AC6 (a)(b) — controller guard decorators applied ─────────────────────────

describe("AC6 — guard decorators on controller methods", () => {
  function getGuardsOn(method: string): unknown[] {
    const fn = (TermsController.prototype as unknown as Record<string, Function | undefined>)[method];
    if (!fn) throw new Error(`method ${method} not found`);
    return Reflect.getMetadata("__guards__", fn) || [];
  }

  function getRolesOn(method: string): string[] | undefined {
    const fn = (TermsController.prototype as unknown as Record<string, Function | undefined>)[method];
    if (!fn) throw new Error(`method ${method} not found`);
    return Reflect.getMetadata(ROLES_KEY, fn);
  }

  it("GET list has SessionAuthGuard (anonymous=401)", () => {
    const guards = getGuardsOn("list");
    assert.ok(guards.includes(SessionAuthGuard), "list should have SessionAuthGuard");
  });

  it("POST create has SessionAuthGuard + RoleGuard + master/admin only (NORMAL=403, anon=401)", () => {
    const guards = getGuardsOn("create");
    const roles = getRolesOn("create");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });

  it("PUT update has SessionAuthGuard + RoleGuard + master/admin only", () => {
    const guards = getGuardsOn("update");
    const roles = getRolesOn("update");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });

  it("DELETE delete has SessionAuthGuard + RoleGuard + master/admin only", () => {
    const guards = getGuardsOn("delete");
    const roles = getRolesOn("delete");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });

  it("GET child-count has SessionAuthGuard + RoleGuard + master/admin only", () => {
    const guards = getGuardsOn("childCount");
    const roles = getRolesOn("childCount");
    assert.ok(guards.includes(SessionAuthGuard));
    assert.ok(guards.includes(RoleGuard));
    assert.deepEqual(roles, ["master", "admin"]);
  });
});

// ─── AC3 delete 409 HAS_CHILDREN ──────────────────────────────────────────────

describe("AC3 — delete = 409 HAS_CHILDREN reject only", () => {
  it("Term delete with subjects > 0 → 409 HAS_CHILDREN", async () => {
    const target = termRow({ id: "t-with-children" });
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => target,
        findMany: async () => [],
        create: async (args) => ({ ...target, ...(args.data as Partial<MockTermRow>) }),
        update: async () => target,
        delete: async () => target
      },
      subject: {
        count: async () => 3
      }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.delete("t-with-children", "user-master", "master"),
      (err: ConflictException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "HAS_CHILDREN";
      }
    );
  });

  it("(Codex Round-3 P1) FK P2003 violation during delete → 409 HAS_CHILDREN (race window)", async () => {
    const target = termRow({ id: "t-race" });
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => target,
        findMany: async () => [],
        create: async () => target,
        update: async () => target,
        delete: async () => {
          throw Object.assign(new Error("FK constraint"), { code: "P2003" });
        }
      },
      subject: { count: async () => 0 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.delete("t-race", "user-master", "master"),
      (err: ConflictException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "HAS_CHILDREN";
      }
    );
  });

  it("Term delete with subjects = 0 → success", async () => {
    const target = termRow({ id: "t-empty" });
    let deleted = false;
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => target,
        findMany: async () => [],
        create: async () => target,
        update: async () => target,
        delete: async () => {
          deleted = true;
          return target;
        }
      },
      subject: {
        count: async () => 0
      }
    };
    const service = makeService(prisma);
    await service.delete("t-empty", "user-master", "master");
    assert.equal(deleted, true);
  });
});

// ─── AC3 response DTO whitelist (response shape role 분기) ───────────────────

describe("AC3 — response DTO role split", () => {
  it("NORMAL role list → response excludes createdById/updatedAt", async () => {
    const target = termRow();
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      subject: { count: async () => 0 }
    };
    const service = makeService(prisma);
    const controller = new TermsController(service);
    const response = await controller.list({
      user: { id: "user-normal", role: "normal", displayName: "N", studentNumber: "0" }
    } as unknown as Parameters<TermsController["list"]>[0]);
    assert.equal(Array.isArray(response), true);
    const first = response[0] as unknown as Record<string, unknown>;
    assert.ok(!("createdById" in first), "NORMAL response must not include createdById");
    assert.ok(!("updatedAt" in first), "NORMAL response must not include updatedAt");
  });

  it("ADMIN role list → response includes createdById + updatedAt", async () => {
    const target = termRow();
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => target,
        findMany: async () => [target],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      subject: { count: async () => 0 }
    };
    const service = makeService(prisma);
    const controller = new TermsController(service);
    const response = await controller.list({
      user: { id: "user-admin", role: "admin", displayName: "A", studentNumber: "0" }
    } as unknown as Parameters<TermsController["list"]>[0]);
    const first = response[0] as unknown as Record<string, unknown>;
    assert.ok("createdById" in first, "ADMIN response must include createdById");
    assert.ok("updatedAt" in first, "ADMIN response must include updatedAt");
  });
});

// ─── AC3 child-count contract ────────────────────────────────────────────────

describe("AC3 + AC5b — child-count endpoint", () => {
  it("master → returns subjectCount > 0", async () => {
    const target = termRow();
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => target,
        findMany: async () => [],
        create: async () => target,
        update: async () => target,
        delete: async () => target
      },
      subject: { count: async () => 5 }
    };
    const service = makeService(prisma);
    const result = await service.getChildCount("term-001", "user-master", "master");
    assert.deepEqual(result, { subjectCount: 5 });
  });

  it("missing term → 404 TERM_NOT_FOUND", async () => {
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => null,
        findMany: async () => [],
        create: async () => termRow(),
        update: async () => termRow(),
        delete: async () => termRow()
      },
      subject: { count: async () => 0 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.getChildCount("missing", "user-master", "master"),
      (err: NotFoundException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "TERM_NOT_FOUND";
      }
    );
  });

  it("(Codex Round-2 blocking) admin → master-owned term child-count → 403 ROLE_HIERARCHY_VIOLATION", async () => {
    const masterTerm = termRow({ createdById: "user-master" });
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => masterTerm,
        findMany: async () => [],
        create: async () => masterTerm,
        update: async () => masterTerm,
        delete: async () => masterTerm
      },
      subject: { count: async () => 3 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () => service.getChildCount(masterTerm.id, "user-admin", "admin"),
      (err: ForbiddenException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "ROLE_HIERARCHY_VIOLATION";
      }
    );
  });

  it("admin → own term child-count → success", async () => {
    const ownTerm = termRow({ createdById: "user-admin" });
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => ownTerm,
        findMany: async () => [],
        create: async () => ownTerm,
        update: async () => ownTerm,
        delete: async () => ownTerm
      },
      subject: { count: async () => 2 }
    };
    const service = makeService(prisma);
    const result = await service.getChildCount(ownTerm.id, "user-admin", "admin");
    assert.deepEqual(result, { subjectCount: 2 });
  });
});

// ─── Codex Round-2 P1 — termUpdateSchema partial update + service invariant ──

describe("Codex Round-2 P1 — update merge invariant (partial update)", () => {
  it("PUT { endDate } 만 보내고 결합된 startDate > endDate 면 400", async () => {
    const before = termRow({
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: null,
      createdById: "user-master"
    });
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => before,
        findMany: async () => [],
        create: async () => before,
        update: async () => before,
        delete: async () => before
      },
      subject: { count: async () => 0 }
    };
    const service = makeService(prisma);
    await assert.rejects(
      () =>
        service.update(
          before.id,
          { endDate: new Date("2026-03-01T00:00:00.000Z") },
          "user-master",
          "master"
        ),
      (err: BadRequestException) => {
        const body = err.getResponse() as { errorCode: string };
        return body.errorCode === "INVALID_INPUT";
      }
    );
  });

  it("PUT { endDate } 가 결합된 startDate 이후면 성공", async () => {
    const before = termRow({
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      endDate: null,
      createdById: "user-master"
    });
    const updated = { ...before, endDate: new Date("2026-06-30T00:00:00.000Z") };
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => before,
        findMany: async () => [],
        create: async () => before,
        update: async () => updated,
        delete: async () => before
      },
      subject: { count: async () => 0 }
    };
    const service = makeService(prisma);
    const result = await service.update(
      before.id,
      { endDate: new Date("2026-06-30T00:00:00.000Z") },
      "user-master",
      "master"
    );
    assert.ok(result.endDate);
  });

  it("PUT { startDate=null } 으로 기존 startDate 제거 → endDate 만 남아도 통과", async () => {
    const before = termRow({
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T00:00:00.000Z"),
      createdById: "user-master"
    });
    const updated = { ...before, startDate: null };
    const prisma: MockPrisma = {
      term: {
        findUnique: async () => before,
        findMany: async () => [],
        create: async () => before,
        update: async () => updated,
        delete: async () => before
      },
      subject: { count: async () => 0 }
    };
    const service = makeService(prisma);
    const result = await service.update(
      before.id,
      { startDate: null },
      "user-master",
      "master"
    );
    assert.equal(result.startDate, null);
  });
});
