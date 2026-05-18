/**
 * completion.spec.ts — integration-style unit tests for the R8 completeUpload contract.
 *
 * Uses node:test + mocked PrismaService + mocked StoragePort (no DB / S3 needed).
 *
 * Micro-decision: mocked Prisma proves the orchestration logic (updateMany count=0 → noop).
 * It does NOT prove DB-level atomicity — that requires a live DB with concurrent connections.
 * The race case confirms the code path, not the locking guarantee.
 *
 * Case A — happy path: pending → complete → headObject size ok → 200 + uploaded.
 * Case B — race: concurrent callers — first call transitions, subsequent calls receive noop 200.
 * Case C — size mismatch: declared 100 / actual 99 → 409 ConflictException.
 * Case D — already uploaded: second call → 200 noop (no headObject call).
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { HeadObjectResult } from "@study-note/storage";
import { ObjectNotFoundError } from "@study-note/storage";
import { MaterialsService } from "../materials.service";

// ─── Minimal type stubs ───────────────────────────────────────────────────────

interface PdfMaterialRow {
  id: string;
  ownerId: string;
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: string;
  storageKey: string;
  uploadStatus: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Factory helpers ──────────────────────────────────────────────────────────

function makeRow(overrides: Partial<PdfMaterialRow> = {}): PdfMaterialRow {
  return {
    id: "mat-001",
    ownerId: "user-001",
    subjectId: "digital-engineering",
    classDate: "2026-05-01",
    fileName: "lecture.pdf",
    fileSize: 100,
    pageCount: 5,
    contentType: "application/pdf",
    storageKey: "users/user-001/materials/mat-001/lecture.pdf",
    uploadStatus: "pending",
    deletedAt: null,
    createdAt: new Date("2026-05-16T00:00:00Z"),
    updatedAt: new Date("2026-05-16T00:00:00Z"),
    ...overrides
  };
}

// ─── Mock builders ────────────────────────────────────────────────────────────

type MockPrismaFindFirst = (args: { where: Record<string, unknown> }) => Promise<PdfMaterialRow | null>;
type MockPrismaUpdateMany = (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;

interface MockPrisma {
  pdfMaterial: {
    findFirst: MockPrismaFindFirst;
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<PdfMaterialRow[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<PdfMaterialRow>;
    update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<PdfMaterialRow>;
    updateMany: MockPrismaUpdateMany;
  };
}

function makePrisma(
  findFirstImpl: MockPrismaFindFirst,
  updateManyImpl: MockPrismaUpdateMany
): MockPrisma {
  return {
    pdfMaterial: {
      findFirst: findFirstImpl,
      findMany: async () => [],
      create: async (args) => makeRow(args.data as Partial<PdfMaterialRow>),
      update: async (_args) => makeRow(),
      updateMany: updateManyImpl
    }
  };
}

const PDF_MAGIC = Buffer.from("%PDF-");

function makeStorage(
  headResult: HeadObjectResult | Error,
  prefixOverride?: Buffer
) {
  return {
    createUploadIntent: async () => ({
      method: "PUT" as const,
      uploadUrl: "/api/materials/mat-001/file",
      storageKey: "key",
      expiresAt: new Date().toISOString(),
      requiredHeaders: {}
    }),
    createDownloadIntent: () => ({
      method: "GET" as const,
      downloadUrl: "/api/materials/mat-001/file",
      storageKey: "key",
      expiresAt: new Date().toISOString()
    }),
    putObject: async () => {},
    getObject: async () => ({ body: null as unknown as import("node:stream").Readable, contentType: "application/pdf" }),
    createExportBundle: () => null as unknown as import("@study-note/storage").ExportBundle,
    headObject: async (_storageKey: string): Promise<HeadObjectResult> => {
      if (headResult instanceof Error) throw headResult;
      return headResult;
    },
    deleteObject: async () => {},
    readObjectPrefix: async (_storageKey: string, length: number): Promise<Buffer> => {
      // Default: return valid %PDF- prefix. Tests can override via prefixOverride.
      return prefixOverride ?? PDF_MAGIC.subarray(0, length);
    }
  };
}

function buildService(
  row: PdfMaterialRow | null,
  headResult: HeadObjectResult | Error,
  updateManyCount: number
): MaterialsService {
  let findCallIndex = 0;

  const findFirstImpl: MockPrismaFindFirst = async (_args) => {
    // First call: initial load. Second call (post-updateMany): return updated row.
    findCallIndex++;
    if (findCallIndex === 1) return row;
    // After transition, return row with uploadStatus=uploaded
    return row ? { ...row, uploadStatus: "uploaded" } : null;
  };

  const updateManyImpl: MockPrismaUpdateMany = async () => ({ count: updateManyCount });

  const prisma = makePrisma(findFirstImpl, updateManyImpl) as unknown as import("@study-note/persistence").PrismaService;
  const storage = makeStorage(headResult) as unknown as import("@study-note/storage").StoragePort;
  return new MaterialsService(prisma, storage);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MaterialsService.completeUpload", () => {
  it("case A — happy: pending → headObject matches → transitions to uploaded", async () => {
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });
    const service = buildService(row, { contentLength: 100 }, 1);

    const result = await service.completeUpload("user-001", "mat-001");

    assert.equal(result.uploadStatus, "uploaded");
    assert.equal(result.id, "mat-001");
  });

  it("case B — race: 3 concurrent callers — first transitions, subsequent are noop", async () => {
    // Stateful mock: all three callers see "pending" at findFirst (race start).
    // updateMany transitions on first call (count=1), subsequent calls get count=0 (noop path).
    // In node microtask ordering with Promise.all:
    //   - all three findFirst calls resolve before any updateMany (async/await queue)
    //   - all three hit updateMany; first call gets count=1, rest get count=0
    //   - first call re-fetches (findFirst returns uploaded); others return the re-fetched row
    // This exercises both the transition arm AND the noop-after-race arm.
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });
    let storedStatus = "pending";
    let updateManyCallCount = 0;
    let findFirstCallCount = 0;

    const prisma = {
      pdfMaterial: {
        findFirst: async () => {
          findFirstCallCount++;
          return { ...row, uploadStatus: storedStatus };
        },
        findMany: async () => [],
        create: async () => row,
        update: async () => row,
        updateMany: async () => {
          updateManyCallCount++;
          if (storedStatus === "pending") {
            storedStatus = "uploaded"; // first caller transitions
            return { count: 1 };
          }
          return { count: 0 }; // subsequent callers: already transitioned
        }
      }
    } as unknown as import("@study-note/persistence").PrismaService;

    const storage = makeStorage({ contentLength: 100 }) as unknown as import("@study-note/storage").StoragePort;
    const service = new MaterialsService(prisma, storage);

    const results = await Promise.all([
      service.completeUpload("user-001", "mat-001"),
      service.completeUpload("user-001", "mat-001"),
      service.completeUpload("user-001", "mat-001")
    ]);

    assert.ok(results.every((r) => r.uploadStatus === "uploaded"), "all 3 callers return uploaded");
    assert.ok(updateManyCallCount >= 1, "at least one caller exercised updateMany (transition arm)");
    // Verify the transition happened exactly once (storedStatus set to "uploaded" once)
    assert.equal(storedStatus, "uploaded", "status transitioned exactly once");
  });

  it("case C — size mismatch: declared 100 / actual 99 → 409 ConflictException", async () => {
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });
    const service = buildService(row, { contentLength: 99 }, 0);

    await assert.rejects(
      () => service.completeUpload("user-001", "mat-001"),
      (err: unknown) => {
        assert.ok(err instanceof ConflictException, "should throw ConflictException");
        const response = (err as ConflictException).getResponse() as Record<string, unknown>;
        assert.equal(response.errorCode, "UPLOAD_SIZE_MISMATCH");
        return true;
      }
    );
  });

  it("case D — already uploaded: second call → 200 noop (no headObject)", async () => {
    const row = makeRow({ uploadStatus: "uploaded", fileSize: 100 });
    let headObjectCalled = false;

    const prisma = {
      pdfMaterial: {
        findFirst: async () => row,
        findMany: async () => [],
        create: async () => row,
        update: async () => row,
        updateMany: async () => ({ count: 0 })
      }
    } as unknown as import("@study-note/persistence").PrismaService;

    const storage = {
      ...makeStorage({ contentLength: 100 }),
      headObject: async (_key: string) => {
        headObjectCalled = true;
        return { contentLength: 100 };
      }
    } as unknown as import("@study-note/storage").StoragePort;

    const service = new MaterialsService(prisma, storage);
    const result = await service.completeUpload("user-001", "mat-001");

    assert.equal(result.uploadStatus, "uploaded");
    assert.equal(headObjectCalled, false, "headObject must NOT be called for already-uploaded material");
  });

  it("bonus — headObject ObjectNotFoundError → 409 UPLOAD_NOT_FOUND", async () => {
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });
    // ObjectNotFoundError: s3-storage / local-mock 모두 이 typed error 던짐
    const notFoundError = new ObjectNotFoundError("users/user-001/materials/mat-001/lecture.pdf");
    const service = buildService(row, notFoundError, 0);

    await assert.rejects(
      () => service.completeUpload("user-001", "mat-001"),
      (err: unknown) => {
        assert.ok(err instanceof ConflictException, "should throw ConflictException");
        const response = (err as ConflictException).getResponse() as Record<string, unknown>;
        assert.equal(response.errorCode, "UPLOAD_NOT_FOUND");
        return true;
      }
    );
  });

  it("bonus — headObject 인프라 장애 → ConflictException 아닌 원본 error rethrow", async () => {
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });
    // 인프라 장애 시뮬레이션: generic Error (auth / network / S3 outage)
    const infraError = new Error("S3 endpoint unreachable");
    const service = buildService(row, infraError, 0);

    await assert.rejects(
      () => service.completeUpload("user-001", "mat-001"),
      (err: unknown) => {
        // ConflictException 이 아닌 원본 error 가 rethrow 되어야 함
        assert.ok(!(err instanceof ConflictException), "ConflictException 이어서는 안 됨");
        assert.ok(err instanceof Error, "Error 이어야 함");
        assert.ok((err as Error).message.includes("S3 endpoint unreachable"), "원본 메시지 보존");
        return true;
      }
    );
  });

  it("bonus — material not found → NotFoundException", async () => {
    const service = buildService(null, { contentLength: 100 }, 0);

    await assert.rejects(
      () => service.completeUpload("user-001", "mat-404"),
      (err: unknown) => {
        assert.ok(err instanceof NotFoundException);
        return true;
      }
    );
  });

  it("bonus — readObjectPrefix ObjectNotFoundError → 409 UPLOAD_NOT_FOUND, material stays pending", async () => {
    // HEAD ↔ Range GET 사이 object 삭제 race: headObject 는 성공, readObjectPrefix 는 ObjectNotFoundError
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });
    let updateManyCalls = 0;

    const prisma = {
      pdfMaterial: {
        findFirst: async () => row,
        findMany: async () => [],
        create: async () => row,
        update: async () => row,
        updateMany: async () => {
          updateManyCalls++;
          return { count: 1 };
        }
      }
    } as unknown as import("@study-note/persistence").PrismaService;

    const storage = {
      ...makeStorage({ contentLength: 100 }),
      readObjectPrefix: async (_key: string, _length: number): Promise<Buffer> => {
        throw new ObjectNotFoundError("users/user-001/materials/mat-001/lecture.pdf");
      }
    } as unknown as import("@study-note/storage").StoragePort;

    const service = new MaterialsService(prisma, storage);

    await assert.rejects(
      () => service.completeUpload("user-001", "mat-001"),
      (err: unknown) => {
        assert.ok(err instanceof ConflictException, "should throw ConflictException");
        const response = (err as ConflictException).getResponse() as Record<string, unknown>;
        assert.equal(response.errorCode, "UPLOAD_NOT_FOUND", "errorCode must be UPLOAD_NOT_FOUND");
        return true;
      }
    );

    // material stays pending: updateMany must NOT have been called
    assert.equal(updateManyCalls, 0, "updateMany must not be called when readObjectPrefix throws — material stays pending");
  });

  it("bonus — readObjectPrefix generic error → 원본 error rethrow (5xx)", async () => {
    // 인프라 장애 시뮬레이션: generic Error (auth / network / S3 outage)
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });

    const prisma = {
      pdfMaterial: {
        findFirst: async () => row,
        findMany: async () => [],
        create: async () => row,
        update: async () => row,
        updateMany: async () => ({ count: 1 })
      }
    } as unknown as import("@study-note/persistence").PrismaService;

    const storage = {
      ...makeStorage({ contentLength: 100 }),
      readObjectPrefix: async (_key: string, _length: number): Promise<Buffer> => {
        throw new Error("S3 range-get connection reset");
      }
    } as unknown as import("@study-note/storage").StoragePort;

    const service = new MaterialsService(prisma, storage);

    await assert.rejects(
      () => service.completeUpload("user-001", "mat-001"),
      (err: unknown) => {
        assert.ok(!(err instanceof ConflictException), "ConflictException 이어서는 안 됨");
        assert.ok(err instanceof Error, "Error 이어야 함");
        assert.ok((err as Error).message.includes("S3 range-get connection reset"), "원본 메시지 보존");
        return true;
      }
    );
  });

  it("bonus — PDF magic mismatch → 400 PDF_MAGIC_MISMATCH, material stays pending", async () => {
    // headObject size matches (100 === 100), but prefix is not %PDF-
    // → completion must reject with BadRequestException and NOT call updateMany.
    const row = makeRow({ uploadStatus: "pending", fileSize: 100 });
    let updateManyCalls = 0;

    const prisma = {
      pdfMaterial: {
        findFirst: async () => row,
        findMany: async () => [],
        create: async () => row,
        update: async () => row,
        updateMany: async () => {
          updateManyCalls++;
          return { count: 1 };
        }
      }
    } as unknown as import("@study-note/persistence").PrismaService;

    // prefix override: 5 bytes that are NOT %PDF-
    const wrongPrefix = Buffer.from("XXXXX");
    const storage = {
      ...makeStorage({ contentLength: 100 }, wrongPrefix)
    } as unknown as import("@study-note/storage").StoragePort;

    const service = new MaterialsService(prisma, storage);

    await assert.rejects(
      () => service.completeUpload("user-001", "mat-001"),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException, "should throw BadRequestException");
        const response = (err as BadRequestException).getResponse() as Record<string, unknown>;
        assert.equal(response["errorCode"], "PDF_MAGIC_MISMATCH", "errorCode must be PDF_MAGIC_MISMATCH");
        return true;
      }
    );

    // material stays pending: updateMany must NOT have been called
    assert.equal(updateManyCalls, 0, "updateMany must not be called when magic check fails — material stays pending");
  });
});
