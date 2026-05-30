// 공용 PDF 자료와 사용자별 필기 분리 계약 회귀 테스트.
import "reflect-metadata";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { NotFoundException } from "@nestjs/common";
import { ROLES_KEY } from "@study-note/auth";
import { MaterialsController } from "../materials.controller";
import { MaterialsService, parseMaterialMetadataBody } from "../materials.service";
import { MaterialUploadService } from "../material-upload.service";
import { PdfMaterialRepository } from "../pdf-material.repository";
import { AnnotationSnapshotRepository } from "../../pdf-annotations/annotation-snapshot.repository";

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
  r2Payload?: unknown;
}) {
  const annotations = options.annotations ?? [];
  const queries: QuerySpy = { findFirstWheres: [] };
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
      // MaterialsService.getAnnotation → AnnotationSnapshotRepository.findFull (findUnique).
      findUnique: async (args: {
        where: { materialId_ownerId: { materialId: string; ownerId: string } };
      }) =>
        annotations.find(
          (item) =>
            item.materialId === args.where.materialId_ownerId.materialId &&
            item.ownerId === args.where.materialId_ownerId.ownerId
        ) ?? null
    }
  };
  const storage = {
    createUploadIntent: async () => ({
      method: "PUT" as const,
      uploadUrl: "/api/materials/mat-shared/file",
      expiresAt: new Date().toISOString(),
      requiredHeaders: {}
    }),
    createDownloadIntent: () => ({
      method: "GET" as const,
      downloadUrl: "/api/materials/mat-shared/file",
      expiresAt: new Date().toISOString()
    }),
    putObject: async () => {},
    getObject: async () => ({ body: null as unknown as import("node:stream").Readable, contentType: "application/pdf" }),
    getJsonObject: async () => options.r2Payload ? { payload: options.r2Payload } : null,
    headObject: async () => ({ contentLength: 100 }),
    deleteObject: async () => {},
    readObjectPrefix: async (_key: string, length: number) => Buffer.from("%PDF-").subarray(0, length)
  };

  const ps = prisma as unknown as import("@study-note/persistence").PrismaService;
  const storagePort = storage as unknown as import("@study-note/storage").StoragePort;
  const materialRepo = new PdfMaterialRepository(ps);
  return {
    service: new MaterialsService(
      storagePort,
      materialRepo,
      new AnnotationSnapshotRepository(ps)
    ),
    uploadService: new MaterialUploadService(ps, storagePort, materialRepo),
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

  it("updates classDate for uploader-owned materials (S3 AC12 — Date)", async () => {
    const { service, queries } = makeService({
      material: makeMaterial({ ownerId: "admin-1" })
    });

    const material = await service.updateMaterialMetadata("admin-1", "mat-shared", {
      classDate: "2026-05-07"
    });

    assert.equal(material.classDate, "2026-05-07");
    assert.deepEqual(queries.findFirstWheres[0], {
      id: "mat-shared",
      deletedAt: null,
      OR: [
        { ownerId: "admin-1" },
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
    const updateArgs = queries.updateArgs as { where: unknown; data: { classDate: Date } };
    assert.deepEqual(updateArgs.where, { id: "mat-shared" });
    assert.ok(updateArgs.data.classDate instanceof Date);
    assert.equal(updateArgs.data.classDate.toISOString().slice(0, 10), "2026-05-07");
  });

  it("updates classDate for uploaded master/admin shared materials", async () => {
    const { service, queries } = makeService({
      material: makeMaterial({ ownerId: "master-1" })
    });

    const material = await service.updateMaterialMetadata("admin-2", "mat-shared", {
      classDate: "2026-05-28"
    });

    assert.equal(material.classDate, "2026-05-28");
    assert.deepEqual(queries.findFirstWheres[0], {
      id: "mat-shared",
      deletedAt: null,
      OR: [
        { ownerId: "admin-2" },
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
    const { service, uploadService } = makeService({ materials: [] });
    const controller = new MaterialsController(uploadService, service);

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

  // per-user annotation write isolation 은 live path(PUT /api/v1/pdf-annotations)로
  // 이관됨 — (materialId, ownerId) composite key + R2 key namespacing 이 보장하며
  // pdf-annotations/__tests__/annotations.spec.ts 가 검증. deprecated saveAnnotation
  // write 경로 테스트는 메서드 제거(S5)와 함께 삭제. read 경로 isolation 은 아래 유지.

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

  // S2 회귀: getAnnotation 이 findFull(findUnique) populated 분기를 거쳐 본인 snapshot 을
  // 매핑하는지 — getAnnotation(live endpoint) 가 이 경로를 탄다.
  // payload SoT = R2 (DB row.payload 는 Hybrid CAS 가 JsonNull). R2 payload 를 r2Payload 로 주입.
  it("returns the populated current-user snapshot via findFull (populated branch)", async () => {
    const savedAt = new Date("2026-05-22T09:00:00Z");
    const r2Payload = {
      stickyNotes: [
        {
          id: "note-a",
          pageNumber: 1,
          anchor: { x: 0.1, y: 0.2 },
          blocks: [],
          updatedAt: "2026-05-20T00:00:00Z"
        }
      ],
      inkStrokes: []
    };
    const { service } = makeService({
      material: makeMaterial(),
      annotations: [
        {
          id: "ann-1",
          materialId: "mat-shared",
          ownerId: "student-a",
          schemaVersion: 1,
          // DB row.payload 는 Hybrid CAS 가 JsonNull 기록 — savedAt 제공용으로만 존재.
          payload: null,
          savedAt
        }
      ],
      r2Payload
    });

    const annotation = await service.getAnnotation("student-a", "mat-shared");

    assert.equal(annotation.ownerId, "student-a");
    assert.equal(annotation.materialId, "mat-shared");
    assert.equal(annotation.savedAt, savedAt.toISOString());
    assert.equal(annotation.stickyNotes[0]?.id, "note-a");
  });
});
