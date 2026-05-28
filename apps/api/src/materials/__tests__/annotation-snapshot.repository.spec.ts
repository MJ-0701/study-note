// DDD Slice 7 — AnnotationSnapshotRepository spec. mock Prisma query 인자 검증.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { AnnotationSnapshotRepository } from "../annotation-snapshot.repository";

interface Call {
  method: string;
  arg: unknown;
}

function buildPrisma(row: unknown = { id: "snap-1" }) {
  const calls: Call[] = [];
  const prisma = {
    annotationSnapshot: {
      findFirst: async (arg: unknown) => {
        calls.push({ method: "findFirst", arg });
        return row;
      },
      update: async (arg: unknown) => {
        calls.push({ method: "update", arg });
        return row;
      },
      create: async (arg: unknown) => {
        calls.push({ method: "create", arg });
        return row;
      }
    }
  };
  return { prisma, calls };
}

describe("AnnotationSnapshotRepository", () => {
  it("findByMaterialOwner → where materialId + ownerId", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    await repo.findByMaterialOwner("m-1", "u-1");
    assert.deepEqual(calls[0]?.arg, { where: { materialId: "m-1", ownerId: "u-1" } });
  });

  it("update → where id + data passthrough", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    const data = { schemaVersion: 1, savedAt: new Date() };
    await repo.update("snap-1", data as never);
    assert.deepEqual(calls[0]?.arg, { where: { id: "snap-1" }, data });
  });

  it("create → data passthrough", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new AnnotationSnapshotRepository(prisma as unknown as never);
    const data = { materialId: "m-1", ownerId: "u-1", schemaVersion: 1 };
    await repo.create(data as never);
    assert.deepEqual(calls[0]?.arg, { data });
  });
});
