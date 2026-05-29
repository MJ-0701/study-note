// DDD Slice 2 — PdfMaterialRepository spec. mock Prisma → repo 가 listMaterials
// share 정책 (`OR: [{ownerId}, {uploaded master/admin}]`) 의 query 를 정확히
// 전달하는지 검증.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { PdfMaterialRepository } from "../../materials/pdf-material.repository";

interface CapturedFindFirstArg {
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

function buildMockPrisma(returnRow: { id: string } | null) {
  const calls: CapturedFindFirstArg[] = [];
  const prisma = {
    pdfMaterial: {
      findFirst: async (arg: CapturedFindFirstArg) => {
        calls.push(arg);
        return returnRow;
      }
    }
  };
  return { prisma, calls };
}

describe("PdfMaterialRepository.findAccessibleForUser", () => {
  it("owner = ownerId 또는 uploaded master/admin 조건 + deletedAt null + select id", async () => {
    const { prisma, calls } = buildMockPrisma({ id: "mat-1" });
    const repo = new PdfMaterialRepository(prisma as unknown as never);

    const result = await repo.findAccessibleForUser("user-1", "mat-1");

    assert.deepEqual(result, { id: "mat-1" });
    assert.equal(calls.length, 1);
    const where = calls[0]?.where as { id: string; deletedAt: null; OR: unknown[] };
    assert.equal(where.id, "mat-1");
    assert.equal(where.deletedAt, null);
    assert.equal(where.OR.length, 2);
    const ownerBranch = where.OR[0] as { ownerId: string };
    assert.equal(ownerBranch.ownerId, "user-1");
    const sharedBranch = where.OR[1] as {
      uploadStatus: string;
      owner: { role: { in: string[] } };
    };
    assert.equal(sharedBranch.uploadStatus, "uploaded");
    assert.deepEqual(sharedBranch.owner.role.in, ["MASTER", "ADMIN"]);
    assert.deepEqual(calls[0]?.select, { id: true });
  });

  it("no match → null 반환", async () => {
    const { prisma } = buildMockPrisma(null);
    const repo = new PdfMaterialRepository(prisma as unknown as never);
    const result = await repo.findAccessibleForUser("user-1", "missing");
    assert.equal(result, null);
  });
});
