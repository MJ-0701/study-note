// DDD Slice 7 — PdfMaterialRepository spec. mock Prisma query 인자 검증.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { PdfMaterialRepository } from "../pdf-material.repository";

interface Call {
  method: string;
  arg: unknown;
}

function buildPrisma(row: unknown = { id: "m-1" }, count = 1) {
  const calls: Call[] = [];
  const prisma = {
    pdfMaterial: {
      create: async (arg: unknown) => {
        calls.push({ method: "create", arg });
        return row;
      },
      update: async (arg: unknown) => {
        calls.push({ method: "update", arg });
        return row;
      },
      updateMany: async (arg: unknown) => {
        calls.push({ method: "updateMany", arg });
        return { count };
      },
      findFirst: async (arg: unknown) => {
        calls.push({ method: "findFirst", arg });
        return row;
      },
      findMany: async (arg: unknown) => {
        calls.push({ method: "findMany", arg });
        return [row];
      }
    }
  };
  return { prisma, calls };
}

const ACCESSIBLE_OR = [
  { ownerId: "u-1" },
  { uploadStatus: "uploaded", owner: { role: { in: ["MASTER", "ADMIN"] } } }
];

describe("PdfMaterialRepository", () => {
  it("markUploaded → update uploadStatus=uploaded", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new PdfMaterialRepository(prisma as unknown as never);
    await repo.markUploaded("m-1");
    assert.deepEqual(calls[0]?.arg, {
      where: { id: "m-1" },
      data: { uploadStatus: "uploaded" }
    });
  });

  it("markUploadedIfPending → updateMany pending guard + count 반환", async () => {
    const { prisma, calls } = buildPrisma({ id: "m-1" }, 1);
    const repo = new PdfMaterialRepository(prisma as unknown as never);
    const res = await repo.markUploadedIfPending("m-1");
    assert.equal(res.count, 1);
    assert.deepEqual(calls[0]?.arg, {
      where: { id: "m-1", uploadStatus: "pending", deletedAt: null },
      data: { uploadStatus: "uploaded" }
    });
  });

  it("findOwned → owner + deletedAt null", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new PdfMaterialRepository(prisma as unknown as never);
    await repo.findOwned("u-1", "m-1");
    assert.deepEqual(calls[0]?.arg, {
      where: { id: "m-1", ownerId: "u-1", deletedAt: null }
    });
  });

  it("findAccessible → owner OR shared master/admin", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new PdfMaterialRepository(prisma as unknown as never);
    await repo.findAccessible("u-1", "m-1");
    assert.deepEqual(calls[0]?.arg, {
      where: { id: "m-1", deletedAt: null, OR: ACCESSIBLE_OR }
    });
  });

  it("findAccessibleList → accessible where + createdAt desc", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new PdfMaterialRepository(prisma as unknown as never);
    await repo.findAccessibleList("u-1");
    assert.deepEqual(calls[0]?.arg, {
      where: { deletedAt: null, OR: ACCESSIBLE_OR },
      orderBy: { createdAt: "desc" }
    });
  });

  it("updateClassDate → update classDate", async () => {
    const { prisma, calls } = buildPrisma();
    const repo = new PdfMaterialRepository(prisma as unknown as never);
    const d = new Date("2026-05-28");
    await repo.updateClassDate("m-1", d);
    assert.deepEqual(calls[0]?.arg, { where: { id: "m-1" }, data: { classDate: d } });
  });
});
