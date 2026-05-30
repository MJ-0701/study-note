// MaterialUploadService(F-3 split) 의 업로드 상태머신 회귀 테스트 — createUploadIntent + uploadFile 분기.
import "reflect-metadata";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Readable } from "node:stream";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MaterialUploadService, parseUploadIntentBody } from "../material-upload.service";
import { PdfMaterialRepository } from "../pdf-material.repository";

interface PdfMaterialRow {
  id: string;
  ownerId: string;
  subjectId: string;
  classDate: Date;
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

interface Spy {
  createData?: Record<string, unknown>;
  putObjectCalled: boolean;
  markUploadedId?: string;
  createUploadIntentMaterial?: unknown;
}

function makeRow(overrides: Partial<PdfMaterialRow> = {}): PdfMaterialRow {
  return {
    id: "mat-1",
    ownerId: "admin-1",
    subjectId: "digital-engineering",
    classDate: new Date("2026-05-01T00:00:00.000Z"),
    fileName: "lecture.pdf",
    fileSize: 100,
    pageCount: 5,
    contentType: "application/pdf",
    storageKey: "users/admin-1/materials/mat-1/lecture.pdf",
    uploadStatus: "pending",
    deletedAt: null,
    createdAt: new Date("2026-05-20T00:00:00Z"),
    updatedAt: new Date("2026-05-20T00:00:00Z"),
    ...overrides
  };
}

function makeService(options: {
  subjectExists?: boolean;
  ownedMaterial?: PdfMaterialRow | null;
}) {
  const spy: Spy = { putObjectCalled: false };
  const prisma = {
    subject: {
      findUnique: async (_args: { where: { id: string } }) =>
        options.subjectExists === false ? null : { id: "digital-engineering" }
    },
    pdfMaterial: {
      create: async (args: { data: Record<string, unknown> }) => {
        spy.createData = args.data;
        // 실제 Prisma 는 createdAt/updatedAt 을 Date 로 반환 (createUploadIntent 는 ISO string 전달).
        return makeRow({
          ...(args.data as Partial<PdfMaterialRow>),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      },
      findFirst: async (_args: { where: unknown }) => options.ownedMaterial ?? null,
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        spy.markUploadedId = args.where.id;
        return makeRow({ ...(options.ownedMaterial ?? {}), uploadStatus: "uploaded" });
      }
    }
  };
  const storage = {
    createUploadIntent: async (material: unknown) => {
      spy.createUploadIntentMaterial = material;
      return {
        method: "PUT" as const,
        uploadUrl: "/api/materials/mat-1/file",
        expiresAt: new Date().toISOString(),
        requiredHeaders: {}
      };
    },
    putObject: async () => {
      spy.putObjectCalled = true;
    },
    createDownloadIntent: () => ({
      method: "GET" as const,
      downloadUrl: "/x",
      expiresAt: new Date().toISOString()
    }),
    getObject: async () => ({ body: null as unknown as Readable, contentType: "application/pdf" }),
    headObject: async () => ({ contentLength: 100 }),
    deleteObject: async () => {},
    readObjectPrefix: async (_key: string, length: number) => Buffer.from("%PDF-").subarray(0, length)
  };
  const ps = prisma as unknown as import("@study-note/persistence").PrismaService;
  const service = new MaterialUploadService(
    ps,
    storage as unknown as import("@study-note/storage").StoragePort,
    new PdfMaterialRepository(ps)
  );
  return { service, spy };
}

function intentInput(overrides: Record<string, unknown> = {}) {
  return {
    subjectId: "digital-engineering",
    classDate: "2026-05-07",
    fileName: "lecture.pdf",
    fileSize: 1024,
    pageCount: 5,
    contentType: "application/pdf",
    ...overrides
  } as Parameters<MaterialUploadService["createUploadIntent"]>[1];
}

describe("MaterialUploadService.createUploadIntent", () => {
  it("creates a pending material + storage upload intent for an existing subject", async () => {
    const { service, spy } = makeService({ subjectExists: true });

    const result = await service.createUploadIntent("admin-1", intentInput());

    assert.ok(result.material);
    assert.ok(result.upload);
    assert.equal(spy.createData?.uploadStatus, "pending");
    assert.equal(spy.createData?.ownerId, "admin-1");
    assert.ok(String(spy.createData?.storageKey).startsWith("users/admin-1/materials/"));
    assert.ok(spy.createUploadIntentMaterial, "storage.createUploadIntent invoked");
  });

  it("rejects an unknown subjectId with INVALID_SUBJECT", async () => {
    const { service } = makeService({ subjectExists: false });

    await assert.rejects(
      () => service.createUploadIntent("admin-1", intentInput()),
      (error) => {
        assert.ok(error instanceof BadRequestException);
        assert.deepEqual(error.getResponse(), {
          errorCode: "INVALID_SUBJECT",
          errorMessage: "Unknown subjectId: digital-engineering"
        });
        return true;
      }
    );
  });

  it("rejects a non-PDF fileName", async () => {
    const { service } = makeService({ subjectExists: true });
    await assert.rejects(
      () => service.createUploadIntent("admin-1", intentInput({ fileName: "lecture.docx" })),
      /fileName must be a PDF/
    );
  });

  it("rejects fileSize below the 5-byte PDF magic minimum", async () => {
    const { service } = makeService({ subjectExists: true });
    await assert.rejects(
      () => service.createUploadIntent("admin-1", intentInput({ fileSize: 4 })),
      (error) => {
        assert.ok(error instanceof BadRequestException);
        assert.equal(
          (error.getResponse() as { errorCode: string }).errorCode,
          "VALIDATION_ERROR"
        );
        return true;
      }
    );
  });

  it("rejects a calendar-overflow classDate (S3 AC12)", async () => {
    const { service } = makeService({ subjectExists: true });
    await assert.rejects(
      () => service.createUploadIntent("admin-1", intentInput({ classDate: "2026-02-30" })),
      /calendar overflow|invalid|YYYY-MM-DD/
    );
  });
});

describe("MaterialUploadService.uploadFile", () => {
  function pdfBody(): Readable {
    return Readable.from(Buffer.from("%PDF-1.7\n…rest of file…"));
  }

  it("stores the object and marks the material uploaded on a valid PDF", async () => {
    const material = makeRow({ fileSize: 21 });
    const { service, spy } = makeService({ ownedMaterial: material });

    const result = await service.uploadFile("admin-1", "mat-1", {
      body: pdfBody(),
      contentType: "application/pdf",
      contentLength: 21
    });

    assert.equal(result.uploadStatus, "uploaded");
    assert.ok(spy.putObjectCalled, "storage.putObject invoked");
    assert.equal(spy.markUploadedId, "mat-1");
  });

  it("returns 404 when the material is not owned/exists", async () => {
    const { service } = makeService({ ownedMaterial: null });
    await assert.rejects(
      () =>
        service.uploadFile("admin-1", "missing", {
          body: pdfBody(),
          contentType: "application/pdf",
          contentLength: 21
        }),
      (error) => {
        assert.ok(error instanceof NotFoundException);
        return true;
      }
    );
  });

  it("rejects contentLength that does not match material fileSize", async () => {
    const material = makeRow({ fileSize: 21 });
    const { service } = makeService({ ownedMaterial: material });
    await assert.rejects(
      () =>
        service.uploadFile("admin-1", "mat-1", {
          body: pdfBody(),
          contentType: "application/pdf",
          contentLength: 999
        }),
      /must match material fileSize/
    );
  });

  it("rejects a body whose magic bytes are not %PDF-", async () => {
    const material = makeRow({ fileSize: 10 });
    const { service } = makeService({ ownedMaterial: material });
    await assert.rejects(
      () =>
        service.uploadFile("admin-1", "mat-1", {
          body: Readable.from(Buffer.from("NOTPDFDATA")),
          contentType: "application/pdf",
          contentLength: 10
        }),
      (error) => {
        assert.ok(error instanceof BadRequestException);
        assert.deepEqual(error.getResponse(), {
          errorCode: "VALIDATION_ERROR",
          errorMessage: "PDF file body must start with %PDF-"
        });
        return true;
      }
    );
  });
});

describe("parseUploadIntentBody", () => {
  it("coerces and defaults raw body fields", () => {
    const parsed = parseUploadIntentBody({
      subjectId: "s1",
      classDate: "2026-05-07",
      fileName: "a.pdf",
      fileSize: "2048",
      pageCount: "3"
    });
    assert.equal(parsed.subjectId, "s1");
    assert.equal(parsed.fileSize, 2048);
    assert.equal(parsed.pageCount, 3);
    assert.equal(parsed.contentType, "application/pdf");
  });

  it("rejects a non-object body", () => {
    assert.throws(() => parseUploadIntentBody(null), /Request body is required/);
  });
});
