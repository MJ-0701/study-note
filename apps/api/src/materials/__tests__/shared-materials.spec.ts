// 공용 PDF 자료와 사용자별 필기 분리 계약 회귀 테스트.
import "reflect-metadata";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { NotFoundException } from "@nestjs/common";
import { ROLES_KEY } from "@study-note/auth";
import { MaterialsController } from "../materials.controller";
import { MaterialsService, parseMaterialMetadataBody } from "../materials.service";

interface PdfMaterialRow {
  id: string;
  ownerId: string;
  subjectId: string;
  // S3 AC12: Date (was string).
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

interface AnnotationRow {
  id: string;
  materialId: string;
  ownerId: string;
  schemaVersion: number;
  payload: unknown;
  savedAt: Date;
}

interface QuerySpy {
  findManyWhere?: unknown;
  findFirstWheres: unknown[];
  updateArgs?: unknown;
}

function makeMaterial(overrides: Partial<PdfMaterialRow> = {}): PdfMaterialRow {
  return {
    id: "mat-shared",
    ownerId: "admin-1",
    subjectId: "digital-engineering",
    classDate: new Date("2026-05-01T00:00:00.000Z"),
    fileName: "lecture.pdf",
    fileSize: 100,
    pageCount: 5,
    contentType: "application/pdf",
    storageKey: "users/admin-1/materials/mat-shared/lecture.pdf",
    uploadStatus: "uploaded",
    deletedAt: null,
    createdAt: new Date("2026-05-20T00:00:00Z"),
    updatedAt: new Date("2026-05-20T00:00:00Z"),
    ...overrides
  };
}

function makeService(options: {
  material?: PdfMaterialRow | null;
  materials?: PdfMaterialRow[];
  annotations?: AnnotationRow[];
}) {
  const annotations = options.annotations ?? [];
  const queries: QuerySpy = { findFirstWheres: [] };
  let annotationSeq = annotations.length + 1;
  const prisma = {
    pdfMaterial: {
      findMany: async (args: { where: unknown }) => {
        queries.findManyWhere = args.where;
        return options.materials ?? [];
      },
      findFirst: async (args: { where: unknown }) => {
        queries.findFirstWheres.push(args.where);
        return options.material ?? null;
      },
      create: async (args: { data: Record<string, unknown> }) => makeMaterial(args.data as Partial<PdfMaterialRow>),
      update: async (args: { where: unknown; data: Record<string, unknown> }) => {
        queries.updateArgs = args;
        return makeMaterial(args.data as Partial<PdfMaterialRow>);
      },
      updateMany: async () => ({ count: 1 })
    },
    annotationSnapshot: {
      findFirst: async (args: { where: { materialId?: string; ownerId?: string } }) =>
        annotations.find(
          (item) =>
            item.materialId === args.where.materialId &&
            item.ownerId === args.where.ownerId
        ) ?? null,
      update: async (args: { where: { id: string }; data: Partial<AnnotationRow> }) => {
        const index = annotations.findIndex((item) => item.id === args.where.id);
        assert.notEqual(index, -1);
        annotations[index] = { ...annotations[index], ...args.data } as AnnotationRow;
        return annotations[index];
      },
      create: async (args: { data: Omit<AnnotationRow, "id"> }) => {
        const created = { id: `ann-${annotationSeq++}`, ...args.data };
        annotations.push(created);
        return created;
      }
    }
  };
  const storage = {
    createUploadIntent: async () => ({
      method: "PUT" as const,
      uploadUrl: "/api/materials/mat-shared/file",
      storageKey: "key",
      expiresAt: new Date().toISOString(),
      requiredHeaders: {}
    }),
    createDownloadIntent: () => ({
      method: "GET" as const,
      downloadUrl: "/api/materials/mat-shared/file",
      storageKey: "key",
      expiresAt: new Date().toISOString()
    }),
    putObject: async () => {},
    getObject: async () => ({ body: null as unknown as import("node:stream").Readable, contentType: "application/pdf" }),
    createExportBundle: () => null as unknown as import("@study-note/storage").ExportBundle,
    headObject: async () => ({ contentLength: 100 }),
    deleteObject: async () => {},
    readObjectPrefix: async (_key: string, length: number) => Buffer.from("%PDF-").subarray(0, length)
  };

  return {
    service: new MaterialsService(
      prisma as unknown as import("@study-note/persistence").PrismaService,
      storage as unknown as import("@study-note/storage").StoragePort
    ),
    annotations,
    queries
  };
}

describe("Materials shared-read contract", () => {
  it("marks upload endpoints as admin/master only", () => {
    assert.deepEqual(
      Reflect.getMetadata(ROLES_KEY, MaterialsController.prototype.createUploadIntent),
      ["master", "admin"]
    );
    assert.deepEqual(
      Reflect.getMetadata(ROLES_KEY, MaterialsController.prototype.uploadFile),
      ["master", "admin"]
    );
    assert.deepEqual(
      Reflect.getMetadata(ROLES_KEY, MaterialsController.prototype.completeUpload),
      ["master", "admin"]
    );
    assert.deepEqual(
      Reflect.getMetadata(ROLES_KEY, MaterialsController.prototype.updateMaterialMetadata),
      ["master", "admin"]
    );
  });

  it("updates classDate only for uploader-owned materials (S3 AC12 — Date)", async () => {
    const { service, queries } = makeService({
      material: makeMaterial({ ownerId: "admin-1" })
    });

    const material = await service.updateMaterialMetadata("admin-1", "mat-shared", {
      classDate: "2026-05-07"
    });

    assert.equal(material.classDate, "2026-05-07");
    assert.deepEqual(queries.findFirstWheres[0], {
      id: "mat-shared",
      ownerId: "admin-1",
      deletedAt: null
    });
    const updateArgs = queries.updateArgs as { where: unknown; data: { classDate: Date } };
    assert.deepEqual(updateArgs.where, { id: "mat-shared" });
    assert.ok(updateArgs.data.classDate instanceof Date);
    assert.equal(updateArgs.data.classDate.toISOString().slice(0, 10), "2026-05-07");
  });

  it("(S3 AC12) update with invalid classDate → 400", async () => {
    const { service } = makeService({
      material: makeMaterial({ ownerId: "admin-1" })
    });
    await assert.rejects(
      () => service.updateMaterialMetadata("admin-1", "mat-shared", { classDate: "5월 7일(목)" }),
      /classDate/
    );
  });

  it("(S3 AC12) update with calendar overflow → 400", async () => {
    const { service } = makeService({
      material: makeMaterial({ ownerId: "admin-1" })
    });
    await assert.rejects(
      () => service.updateMaterialMetadata("admin-1", "mat-shared", { classDate: "2026-02-30" }),
      /calendar overflow|invalid/
    );
  });

  it("parses material metadata update body (string passthrough)", () => {
    // parseMaterialMetadataBody 는 dto 단계 (string pass-through). Date 변환은
    // service.updateMaterialMetadata 내부 parseIsoDateOrThrow 에서 수행.
    assert.deepEqual(parseMaterialMetadataBody({ classDate: "2026-05-07" }), {
      classDate: "2026-05-07"
    });
  });

  it("emits uploaderId as a non-null alias of ownerId", async () => {
    const { service } = makeService({ material: makeMaterial() });

    const material = await service.getMaterial("student-1", "mat-shared");

    assert.equal(material.ownerId, "admin-1");
    assert.equal(material.uploaderId, "admin-1");
  });

  it("lists own materials plus uploaded admin/master materials", async () => {
    const { service, queries } = makeService({
      materials: [makeMaterial()]
    });

    const materials = await service.listMaterials("student-1");

    assert.equal(materials.length, 1);
    assert.deepEqual(queries.findManyWhere, {
      deletedAt: null,
      OR: [
        { ownerId: "student-1" },
        {
          uploadStatus: "uploaded",
          owner: {
            role: {
              in: ["MASTER", "ADMIN"]
            }
          }
        }
      ]
    });
  });

  it("returns 200-compatible empty materials array when no shared material exists", async () => {
    const { service } = makeService({ materials: [] });
    const controller = new MaterialsController(service);

    const result = await controller.listMaterials({
      user: {
        id: "student-empty"
      }
    } as Parameters<MaterialsController["listMaterials"]>[0]);

    assert.deepEqual(result, { materials: [] });
  });

  it("queries shared detail without exposing normal-owned legacy materials", async () => {
    const { service, queries } = makeService({ material: makeMaterial() });

    await service.getMaterial("student-1", "mat-shared");

    assert.deepEqual(queries.findFirstWheres[0], {
      id: "mat-shared",
      deletedAt: null,
      OR: [
        { ownerId: "student-1" },
        {
          uploadStatus: "uploaded",
          owner: {
            role: {
              in: ["MASTER", "ADMIN"]
            }
          }
        }
      ]
    });
  });

  it("returns privacy-preserving 404 for unreadable material", async () => {
    const { service } = makeService({ material: null });

    await assert.rejects(
      () => service.getMaterial("student-1", "mat-private"),
      (error) => {
        assert.ok(error instanceof NotFoundException);
        assert.deepEqual(error.getResponse(), {
          errorCode: "MATERIAL_NOT_FOUND",
          errorMessage: "PDF material not found"
        });
        return true;
      }
    );
  });

  it("keeps annotation snapshots isolated per current user", async () => {
    const { service, annotations } = makeService({ material: makeMaterial() });

    await service.saveAnnotation("student-a", "mat-shared", {
      schemaVersion: 1,
      stickyNotes: [{ id: "note-a", pageNumber: 1, anchor: { x: 0.1, y: 0.2 }, blocks: [], updatedAt: "2026-05-20T00:00:00Z" }],
      inkStrokes: []
    });
    await service.saveAnnotation("student-b", "mat-shared", {
      schemaVersion: 1,
      stickyNotes: [{ id: "note-b", pageNumber: 1, anchor: { x: 0.3, y: 0.4 }, blocks: [], updatedAt: "2026-05-20T00:00:00Z" }],
      inkStrokes: []
    });

    const a = await service.getAnnotation("student-a", "mat-shared");
    const b = await service.getAnnotation("student-b", "mat-shared");

    assert.equal(annotations.length, 2);
    assert.equal(a.ownerId, "student-a");
    assert.equal(a.stickyNotes[0]?.id, "note-a");
    assert.equal(b.ownerId, "student-b");
    assert.equal(b.stickyNotes[0]?.id, "note-b");
  });

  it("returns an empty current-user annotation object when no snapshot exists", async () => {
    const material = makeMaterial({ updatedAt: new Date("2026-05-21T00:00:00Z") });
    const { service } = makeService({ material });

    const annotation = await service.getAnnotation("student-a", "mat-shared");

    assert.deepEqual(annotation, {
      materialId: "mat-shared",
      ownerId: "student-a",
      schemaVersion: 1,
      stickyNotes: [],
      inkStrokes: [],
      savedAt: "2026-05-21T00:00:00.000Z"
    });
  });
});
