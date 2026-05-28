// DDD Slice 4 — TermRepository spec. mock Prisma query 인자 검증.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { TermRepository } from "../term.repository";

interface Call {
  method: string;
  arg: unknown;
}

function buildPrisma(row: unknown = { id: "t-1", grade: 1, semester: 1, title: "T" }) {
  const calls: Call[] = [];
  const prisma = {
    term: {
      findMany: async (arg: unknown) => {
        calls.push({ method: "findMany", arg });
        return [row];
      },
      findUnique: async (arg: unknown) => {
        calls.push({ method: "findUnique", arg });
        return row;
      },
      create: async (arg: unknown) => {
        calls.push({ method: "create", arg });
        return row;
      },
      update: async (arg: unknown) => {
        calls.push({ method: "update", arg });
        return row;
      },
      delete: async (arg: unknown) => {
        calls.push({ method: "delete", arg });
        return row;
      }
    },
    subject: {
      count: async (arg: unknown) => {
        calls.push({ method: "subject.count", arg });
        return 3;
      }
    }
  };
  return { prisma, calls };
}

describe("TermRepository", () => {
  it("findAllOrdered → grade, semester, title asc", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new TermRepository(prisma as unknown as never);
    await repo.findAllOrdered();
    assert.deepEqual(calls[0]?.arg, {
      orderBy: [{ grade: "asc" }, { semester: "asc" }, { title: "asc" }]
    });
  });

  it("findById → where id", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new TermRepository(prisma as unknown as never);
    await repo.findById("t-9");
    assert.deepEqual(calls[0]?.arg, { where: { id: "t-9" } });
  });

  it("create → data passthrough", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new TermRepository(prisma as unknown as never);
    const data = {
      grade: 2,
      semester: 1,
      title: "1학기",
      startDate: null,
      endDate: null,
      createdById: "u-1"
    };
    await repo.create(data);
    assert.deepEqual(calls[0]?.arg, { data });
  });

  it("update → where id + data passthrough", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new TermRepository(prisma as unknown as never);
    await repo.update("t-1", { title: "변경" });
    assert.deepEqual(calls[0]?.arg, { where: { id: "t-1" }, data: { title: "변경" } });
  });

  it("deleteById → where id", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new TermRepository(prisma as unknown as never);
    await repo.deleteById("t-1");
    assert.deepEqual(calls[0]?.arg, { where: { id: "t-1" } });
  });

  it("countChildSubjects → subject.count where termId", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new TermRepository(prisma as unknown as never);
    const n = await repo.countChildSubjects("t-1");
    assert.equal(n, 3);
    assert.equal(calls[0]?.method, "subject.count");
    assert.deepEqual(calls[0]?.arg, { where: { termId: "t-1" } });
  });
});
