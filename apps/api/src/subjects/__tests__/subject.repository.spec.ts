// DDD Slice 3 — SubjectRepository spec. mock Prisma 에 query 인자 전달 검증.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { SubjectRepository } from "../subject.repository";

interface Call {
  method: string;
  arg: unknown;
}

function buildPrisma(row: unknown = { id: "s-1", title: "T", termId: "term-1" }) {
  const calls: Call[] = [];
  const prisma = {
    subject: {
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
    pdfMaterial: {
      count: async (arg: unknown) => {
        calls.push({ method: "pdfMaterial.count", arg });
        return 5;
      }
    }
  };
  return { prisma, calls };
}

describe("SubjectRepository", () => {
  it("findAllOrdered → termId asc, title asc", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new SubjectRepository(prisma as unknown as never);
    await repo.findAllOrdered();
    assert.deepEqual(calls[0]?.arg, {
      orderBy: [{ termId: "asc" }, { title: "asc" }]
    });
  });

  it("findById → where id", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new SubjectRepository(prisma as unknown as never);
    await repo.findById("s-9");
    assert.deepEqual(calls[0]?.arg, { where: { id: "s-9" } });
  });

  it("create → data { title, termId }", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new SubjectRepository(prisma as unknown as never);
    await repo.create("term-2", "물리");
    assert.deepEqual(calls[0]?.arg, { data: { title: "물리", termId: "term-2" } });
  });

  it("updateTitle → where id + data title", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new SubjectRepository(prisma as unknown as never);
    await repo.updateTitle("s-1", "화학");
    assert.deepEqual(calls[0]?.arg, { where: { id: "s-1" }, data: { title: "화학" } });
  });

  it("updateTermId → where id + data termId", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new SubjectRepository(prisma as unknown as never);
    await repo.updateTermId("s-1", "term-3");
    assert.deepEqual(calls[0]?.arg, { where: { id: "s-1" }, data: { termId: "term-3" } });
  });

  it("deleteById → where id", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new SubjectRepository(prisma as unknown as never);
    await repo.deleteById("s-1");
    assert.deepEqual(calls[0]?.arg, { where: { id: "s-1" } });
  });

  it("countChildMaterials → pdfMaterial.count where subjectId", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new SubjectRepository(prisma as unknown as never);
    const n = await repo.countChildMaterials("s-1");
    assert.equal(n, 5);
    assert.equal(calls[0]?.method, "pdfMaterial.count");
    assert.deepEqual(calls[0]?.arg, { where: { subjectId: "s-1" } });
  });
});
