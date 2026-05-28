// DDD Slice 8 — AnnotationSnapshotRepository spec. CAS/보상 query 의 where/data 가
// 정확히 보존되는지 잠금 (concurrency 의미 = where 절이라 1자도 틀리면 안 됨).

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { AnnotationSnapshotRepository } from "../annotation-snapshot.repository";

interface Call {
  method: string;
  arg: unknown;
}

function buildPrisma(opts: { count?: number; row?: unknown } = {}) {
  const calls: Call[] = [];
  const prisma = {
    annotationSnapshot: {
      findMany: async (arg: unknown) => {
        calls.push({ method: "findMany", arg });
        return [];
      },
      findUnique: async (arg: unknown) => {
        calls.push({ method: "findUnique", arg });
        return opts.row ?? null;
      },
      updateMany: async (arg: unknown) => {
        calls.push({ method: "updateMany", arg });
        return { count: opts.count ?? 1 };
      },
      create: async (arg: unknown) => {
        calls.push({ method: "create", arg });
        return { savedAt: new Date(0) };
      },
      deleteMany: async (arg: unknown) => {
        calls.push({ method: "deleteMany", arg });
        return { count: opts.count ?? 1 };
      }
    }
  };
  return { prisma, calls };
}

const REV = new Date("2026-05-28T00:00:00.000Z");
const NEW = new Date("2026-05-28T00:00:01.000Z");

describe("AnnotationSnapshotRepository — CAS critical", () => {
  it("casUpdateSavedAt → updateMany where {materialId, ownerId, savedAt:expected} data {savedAt:new}", async () => {
    const { prisma, calls } = buildPrisma({ count: 1 });
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    const res = await repo.casUpdateSavedAt("m-1", "u-1", REV, NEW);
    assert.equal(res.count, 1);
    assert.deepEqual(calls[0]?.arg, {
      where: { materialId: "m-1", ownerId: "u-1", savedAt: REV },
      data: { savedAt: NEW }
    });
  });

  it("rollbackSavedAt → updateMany current→previous (보상)", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    await repo.rollbackSavedAt("m-1", "u-1", NEW, REV);
    assert.deepEqual(calls[0]?.arg, {
      where: { materialId: "m-1", ownerId: "u-1", savedAt: NEW },
      data: { savedAt: REV }
    });
  });

  it("deleteByRevision → deleteMany where 정확한 revision 만 (data-loss 방지)", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    await repo.deleteByRevision("m-1", "u-1", NEW);
    assert.deepEqual(calls[0]?.arg, {
      where: { materialId: "m-1", ownerId: "u-1", savedAt: NEW }
    });
  });

  it("create → JsonNull payload + select savedAt", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    await repo.create("m-1", "u-1", NEW);
    const arg = calls[0]?.arg as { data: Record<string, unknown>; select: unknown };
    assert.equal(arg.data.materialId, "m-1");
    assert.equal(arg.data.ownerId, "u-1");
    assert.equal(arg.data.schemaVersion, 1);
    assert.equal(arg.data.savedAt, NEW);
    assert.deepEqual(arg.select, { savedAt: true });
  });

  it("findSavedAt → findUnique composite key + select savedAt", async () => {
    const { prisma, calls } = buildPrisma({ row: { savedAt: REV } });
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    const r = await repo.findSavedAt("m-1", "u-1");
    assert.deepEqual(r, { savedAt: REV });
    assert.deepEqual(calls[0]?.arg, {
      where: { materialId_ownerId: { materialId: "m-1", ownerId: "u-1" } },
      select: { savedAt: true }
    });
  });

  it("findManyByMaterialsOwner → in 절 + select materialId/savedAt", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    await repo.findManyByMaterialsOwner(["m-1", "m-2"], "u-1");
    assert.deepEqual(calls[0]?.arg, {
      where: { materialId: { in: ["m-1", "m-2"] }, ownerId: "u-1" },
      select: { materialId: true, savedAt: true }
    });
  });

  it("listByOwnerPaged → take pageSize+1 + cursor skip", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    await repo.listByOwnerPaged("u-1", 50, "cur-1");
    assert.deepEqual(calls[0]?.arg, {
      where: { ownerId: "u-1" },
      select: { id: true, materialId: true, savedAt: true },
      orderBy: { id: "asc" },
      take: 51,
      cursor: { id: "cur-1" },
      skip: 1
    });
  });
});
