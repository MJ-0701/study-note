/**
 * annotations.spec.ts — sprint-W21-sprint-2/S2 + S3 controller/service spec.
 *
 * 실행 (project-root):
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/api/src/pdf-annotations/__tests__/annotations.spec.ts
 *
 * 검증 AC (plan §3):
 *  - AC2: batch GET indistinguishability (foreign/nonexistent/own-empty 동일
 *    `200 { annotations: {}, truncated: false, total: 0, returned: 0 }`)
 *  - AC4: PUT revision 분기 (stale / future / invalid / missing / valid)
 *  - AC7: batch cap (material 51+ 시 partial 응답)
 *  - AC8: logger redaction (payload + clientRevision 노출 X)
 *  - AC10: CAS + R2 rollback + drift GET
 *  - AC11: single-material indistinguishability (foreign/nonexistent 동일 404)
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  ConflictException,
  GoneException,
  NotFoundException,
  PayloadTooLargeException,
  BadRequestException,
  ServiceUnavailableException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PdfAnnotationQueryService } from "../pdf-annotation-query.service";
import { PdfAnnotationCommandService } from "../pdf-annotation-command.service";
import { PdfMaterialRepository } from "../../materials/pdf-material.repository";
import { AnnotationSnapshotRepository } from "../annotation-snapshot.repository";

// ─── Mock factories ───────────────────────────────────────────────────────────

interface MockPrisma {
  pdfMaterial: {
    findFirst: (args: { where: Record<string, unknown>; select?: unknown }) => Promise<{ id: string } | null>;
    findMany: (args: { where: Record<string, unknown>; select?: unknown; orderBy?: unknown }) => Promise<Array<{ id: string }>>;
  };
  annotationSnapshot: {
    findUnique: (args: { where: { materialId_ownerId: { materialId: string; ownerId: string } } }) => Promise<{ savedAt: Date } | null>;
    findMany: (args: { where: Record<string, unknown>; select?: unknown; orderBy?: unknown; take?: number; cursor?: unknown; skip?: number }) => Promise<Array<{ id?: string; materialId: string; savedAt: Date }>>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
    create: (args: { data: Record<string, unknown>; select?: unknown }) => Promise<{ savedAt: Date }>;
    delete: (args: { where: unknown }) => Promise<unknown>;
  };
}

interface MockStorage {
  getJsonObject: (key: string) => Promise<{ payload: unknown; updatedAt?: string } | null>;
  putJsonObject: (key: string, value: unknown) => Promise<void>;
  // unused but required by StoragePort interface — stub no-op.
  putObject?: unknown;
  getObject?: unknown;
  headObject?: unknown;
  deleteObject?: unknown;
  readObjectPrefix?: unknown;
  listJsonObjects?: unknown;
}

function makeMetricsRecorder(): {
  outcomes: string[];
  metrics: { observeSyncPut: (outcome: "success" | "failure" | "stale") => void };
} {
  const outcomes: string[] = [];
  return {
    outcomes,
    metrics: {
      observeSyncPut: (outcome) => {
        outcomes.push(outcome);
      }
    }
  };
}

// S3 (경량 CQRS): Query/Command 두 service 를 동일 deps 로 구성하고, 기존 단일
// service surface 를 유지하는 facade 를 반환 (테스트 본문 call-site 무변경).
function makeService(
  prisma: MockPrisma,
  storage: MockStorage,
  metrics?: { observeSyncPut: (outcome: "success" | "failure" | "stale") => void }
) {
  // service 는 Prisma 직접 의존 0 — material/annotation repository 가 동일 mock prisma
  // 위임 (spec mock 그대로 투명 동작).
  const ps = prisma as unknown as import("@study-note/persistence").PrismaService;
  const storagePort = storage as unknown as import("@study-note/storage").StoragePort;
  const materialRepo = new PdfMaterialRepository(ps);
  const annotationRepo = new AnnotationSnapshotRepository(ps);
  const query = new PdfAnnotationQueryService(storagePort, materialRepo, annotationRepo);
  const command = new PdfAnnotationCommandService(
    storagePort,
    materialRepo,
    annotationRepo,
    metrics as unknown as import("../../observability/metrics.service").MetricsService
  );
  // facade = command 인스턴스(write path 의 `this.logger` spy 가 그대로 동작)에 query
  // 메서드를 부착. 기존 단일 service surface 를 유지해 테스트 call-site 무변경.
  const facade = command as unknown as {
    listAnnotations: typeof query.listAnnotations;
    getSingleAnnotation: typeof query.getSingleAnnotation;
    batchGetBySubject: typeof query.batchGetBySubject;
  };
  facade.listAnnotations = query.listAnnotations.bind(query);
  facade.getSingleAnnotation = query.getSingleAnnotation.bind(query);
  facade.batchGetBySubject = query.batchGetBySubject.bind(query);
  return command as PdfAnnotationCommandService & typeof facade;
}

const OWNER = "user-001";

// ─── AC11: single-material indistinguishability ───────────────────────────────

describe("AC11: single-material GET/PUT — foreign / nonexistent 동일 404", () => {
  it("GET foreign materialId → NotFoundException with ANNOTATION-equivalent body", async () => {
    const prisma = {
      pdfMaterial: {
        findFirst: async () => null,
        findMany: async () => []
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const recorder = makeMetricsRecorder();
    const service = makeService(prisma, storage, recorder.metrics);

    let foreignError: NotFoundException | null = null;
    try {
      await service.getSingleAnnotation(OWNER, "foreign-mat");
    } catch (err) {
      foreignError = err as NotFoundException;
    }
    let nonexistentError: NotFoundException | null = null;
    try {
      await service.getSingleAnnotation(OWNER, "nonexistent-mat");
    } catch (err) {
      nonexistentError = err as NotFoundException;
    }

    assert.ok(foreignError instanceof NotFoundException);
    assert.ok(nonexistentError instanceof NotFoundException);
    assert.deepEqual(foreignError.getResponse(), nonexistentError.getResponse());
  });

  it("GET own material w/o snapshot → empty canonical response", async () => {
    const prisma = {
      pdfMaterial: {
        findFirst: async () => ({ id: "mat-001" }),
        findMany: async () => []
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const recorder = makeMetricsRecorder();
    const service = makeService(prisma, storage, recorder.metrics);

    const res = await service.getSingleAnnotation(OWNER, "mat-001");
    assert.deepEqual(res, {
      annotations: {},
      truncated: false,
      total: 0,
      returned: 0
    });
  });
});

// ─── AC2: batch GET indistinguishability ──────────────────────────────────────

describe("AC2: batch GET — foreign/nonexistent/own-empty 동일 응답", () => {
  it("세 경우 모두 deep-equal `{ annotations: {}, truncated: false, total: 0, returned: 0 }`", async () => {
    const noMaterials = {
      pdfMaterial: {
        findFirst: async () => null,
        findMany: async () => []
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const service = makeService(noMaterials, storage);

    const foreign = await service.batchGetBySubject(OWNER, "foreign-subj");
    const nonexistent = await service.batchGetBySubject(OWNER, "nonexistent-subj");
    const ownEmpty = await service.batchGetBySubject(OWNER, "own-empty");

    const expected = { annotations: {}, truncated: false, total: 0, returned: 0 };
    assert.deepEqual(foreign, expected);
    assert.deepEqual(nonexistent, expected);
    assert.deepEqual(ownEmpty, expected);
  });

  it("own subject 2 material + snapshot 둘 다 → batch 응답에 두 entry hydrated", async () => {
    const savedA = new Date("2026-05-22T10:00:00Z");
    const savedB = new Date("2026-05-22T11:00:00Z");
    const prisma = {
      pdfMaterial: {
        findFirst: async () => null,
        findMany: async () => [{ id: "mat-a" }, { id: "mat-b" }]
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [
          { materialId: "mat-a", savedAt: savedA },
          { materialId: "mat-b", savedAt: savedB }
        ],
        updateMany: async () => ({ count: 0 }),
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async (key) => {
        if (key.includes("mat-a")) return { payload: { sticky: ["a"] } };
        if (key.includes("mat-b")) return { payload: { sticky: ["b"] } };
        return null;
      },
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);

    const res = await service.batchGetBySubject(OWNER, "subj-1");
    assert.equal(res.truncated, false);
    assert.equal(res.total, 2);
    assert.equal(res.returned, 2);
    assert.deepEqual(res.annotations["mat-a"], { payload: { sticky: ["a"] }, updatedAt: savedA.toISOString() });
    assert.deepEqual(res.annotations["mat-b"], { payload: { sticky: ["b"] }, updatedAt: savedB.toISOString() });
  });
});

// ─── AC7: batch cap (material 51+) ────────────────────────────────────────────

describe("AC7: batch GET 응답 cap — material 50개 초과 시 truncated", () => {
  it("material 60개 + snapshot 60개 → returned=50, truncated=true, total=60", async () => {
    const materials = Array.from({ length: 60 }, (_, i) => ({ id: `mat-${i}` }));
    const snapshots = materials.map((m) => ({
      materialId: m.id,
      savedAt: new Date("2026-05-22T10:00:00Z")
    }));
    const prisma = {
      pdfMaterial: {
        findFirst: async () => null,
        findMany: async () => materials
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => snapshots,
        updateMany: async () => ({ count: 0 }),
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async () => ({ payload: { small: true } }),
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);

    const res = await service.batchGetBySubject(OWNER, "subj-big");
    assert.equal(res.total, 60);
    assert.equal(res.returned, 50);
    assert.equal(res.truncated, true);
    assert.equal(Object.keys(res.annotations).length, 50);
  });
});

// ─── AC4: PUT revision 분기 ───────────────────────────────────────────────────

describe("AC4: PUT revision 분기", () => {
  function basePrisma(overrides: Partial<MockPrisma["annotationSnapshot"]> = {}): MockPrisma {
    return {
      pdfMaterial: {
        findFirst: async () => ({ id: "mat-001" }),
        findMany: async () => []
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [],
        updateMany: async () => ({ count: 0 }),
        create: async () => ({ savedAt: new Date("2026-05-22T12:00:00Z") }),
        delete: async () => undefined,
        ...overrides
      }
    } as MockPrisma;
  }

  it("clientRevision === storedRevision → 200 + 새 updatedAt", async () => {
    const prisma = basePrisma({
      updateMany: async () => ({ count: 1 })
    });
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const recorder = makeMetricsRecorder();
    const service = makeService(prisma, storage, recorder.metrics);
    const res = await service.putAnnotation(
      OWNER,
      "mat-001",
      { sticky: ["x"] },
      "2026-05-22T11:00:00.000Z"
    );
    assert.equal(res.total, 1);
    assert.equal(res.returned, 1);
    assert.ok(res.annotations["mat-001"]);
    assert.deepEqual(recorder.outcomes, ["success"]);
  });

  it("clientRevision past (stale) → 409 + canonical body with server state", async () => {
    const serverSaved = new Date("2026-05-22T12:00:00Z");
    const prisma = basePrisma({
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => ({ savedAt: serverSaved })
    });
    const storage: MockStorage = {
      getJsonObject: async () => ({ payload: { server: true } }),
      putJsonObject: async () => undefined
    };
    const recorder = makeMetricsRecorder();
    const service = makeService(prisma, storage, recorder.metrics);
    let err: ConflictException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", { x: 1 }, "2026-05-22T10:00:00Z");
    } catch (e) {
      err = e as ConflictException;
    }
    assert.ok(err instanceof ConflictException);
    const body = err.getResponse() as {
      errorCode: string;
      annotations: Record<string, { payload: unknown; updatedAt: string }>;
      truncated: boolean;
      total: number;
      returned: number;
    };
    assert.equal(body.errorCode, "STALE_REVISION");
    assert.equal(body.total, 1);
    assert.equal(body.returned, 1);
    assert.equal(body.annotations["mat-001"]?.updatedAt, serverSaved.toISOString());
    assert.deepEqual(body.annotations["mat-001"]?.payload, { server: true });
    assert.deepEqual(recorder.outcomes, ["stale"]);
  });

  it("clientRevision future (위조) → 409 (exact equality)", async () => {
    const serverSaved = new Date("2026-05-22T12:00:00Z");
    const prisma = basePrisma({
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => ({ savedAt: serverSaved })
    });
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const recorder = makeMetricsRecorder();
    const service = makeService(prisma, storage, recorder.metrics);
    let err: ConflictException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", { x: 1 }, "2099-12-31T23:59:59Z");
    } catch (e) {
      err = e as ConflictException;
    }
    assert.ok(err instanceof ConflictException);
  });

  it("clientRevision invalid format → 400", async () => {
    const prisma = basePrisma();
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);
    let err: BadRequestException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", { x: 1 }, "not-an-iso-date");
    } catch (e) {
      err = e as BadRequestException;
    }
    assert.ok(err instanceof BadRequestException);
    const body = err.getResponse() as { errorCode: string };
    assert.equal(body.errorCode, "INVALID_REVISION");
  });

  it("codex round-6 P2: clientRevision 빈 문자열 → 400 INVALID_REVISION (falsy 가 create 로 새지 않음)", async () => {
    const prisma = basePrisma({});
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);
    let err: BadRequestException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", { x: 1 }, "");
    } catch (e) {
      err = e as BadRequestException;
    }
    assert.ok(err instanceof BadRequestException);
    const body = err.getResponse() as { errorCode: string };
    assert.equal(body.errorCode, "INVALID_REVISION");
  });

  it("clientRevision undefined + 신규 storage → 201 정상 create", async () => {
    const createdAt = new Date("2026-05-22T13:00:00Z");
    const prisma = basePrisma({
      create: async () => ({ savedAt: createdAt })
    });
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);
    const res = await service.putAnnotation(OWNER, "mat-001", { fresh: true });
    assert.equal(res.total, 1);
    assert.equal(res.annotations["mat-001"]?.updatedAt, createdAt.toISOString());
  });

  it("sprint-W22-be-sync: clientRevision 보냈는데 snapshot 없음 → create fallback (share material 첫 PUT)", async () => {
    // 신규 share material (MASTER 가 올린 PDF) 의 본인 row 없는 상태에서 FE 가
    // 다른 user 의 stale revision 을 cache → CAS count=0 + existing=null.
    // 'stale' 보다 '신규 create' case 로 fallback. race window 는 unique
    // constraint 가 catch.
    let createCalled = false;
    const prisma = basePrisma({
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => null,
      create: async () => {
        createCalled = true;
        return {
          id: "snap-001",
          materialId: "mat-001",
          ownerId: OWNER,
          savedAt: new Date("2026-05-28T10:00:00Z")
        };
      }
    });
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);
    const res = await service.putAnnotation(OWNER, "mat-001", { x: 1 }, "2026-05-22T10:00:00Z");
    assert.ok(createCalled, "create fallback 호출 됨");
    assert.equal(res.annotations["mat-001"]?.payload !== undefined ? true : false, true);
  });

  it("codex round-4: ownsMaterial pre-check 와 CAS 사이에 material 삭제됨 → 404 MATERIAL_NOT_FOUND (NO_RECORD race fix)", async () => {
    // pre-check 시 자료 존재, CAS 직전 ownership 재확인 시 삭제됨.
    let findFirstCalls = 0;
    const prisma = basePrisma({
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => null
    });
    prisma.pdfMaterial.findFirst = async () => {
      findFirstCalls += 1;
      return findFirstCalls === 1 ? { id: "mat-001" } : null;
    };
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);
    let err: NotFoundException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", { x: 1 }, "2026-05-22T10:00:00Z");
    } catch (e) {
      err = e as NotFoundException;
    }
    assert.ok(err instanceof NotFoundException);
    const body = err.getResponse() as { errorCode: string };
    assert.equal(body.errorCode, "MATERIAL_NOT_FOUND");
    assert.equal(findFirstCalls, 2);
  });

  it("clientRevision undefined + 이미 snapshot 있음 → P2002 unique violation → 409", async () => {
    const serverSaved = new Date("2026-05-22T12:00:00Z");
    const prisma = basePrisma({
      create: async () => {
        const err = new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed",
          { code: "P2002", clientVersion: "test" }
        );
        throw err;
      },
      findUnique: async () => ({ savedAt: serverSaved })
    });
    const storage: MockStorage = {
      getJsonObject: async () => ({ payload: { server: true } }),
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);
    let err: ConflictException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", { x: 1 });
    } catch (e) {
      err = e as ConflictException;
    }
    assert.ok(err instanceof ConflictException);
    const body = err.getResponse() as { errorCode: string; annotations: Record<string, unknown> };
    assert.equal(body.errorCode, "STALE_REVISION");
  });
});

// ─── AC10: CAS + R2 rollback ──────────────────────────────────────────────────

describe("AC10: R2 rollback on failure", () => {
  it("CAS 성공 후 R2 putObject 실패 → Prisma row.savedAt rollback + 5xx", async () => {
    const previous = new Date("2026-05-22T11:00:00Z");
    const rolledBack: Date[] = [];
    const prisma = {
      pdfMaterial: {
        findFirst: async () => ({ id: "mat-001" }),
        findMany: async () => []
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [],
        updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          // 첫 호출 = CAS forward, 두 번째 호출 = rollback.
          if ((args.data as { savedAt: Date }).savedAt instanceof Date) {
            const savedAt = (args.data as { savedAt: Date }).savedAt;
            if (savedAt.getTime() === previous.getTime()) {
              rolledBack.push(savedAt);
              return { count: 1 };
            }
          }
          return { count: 1 };
        },
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => {
        throw new Error("simulated R2 failure");
      }
    };
    const recorder = makeMetricsRecorder();
    const service = makeService(prisma, storage, recorder.metrics);
    let err: ServiceUnavailableException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", { x: 1 }, previous.toISOString());
    } catch (e) {
      err = e as ServiceUnavailableException;
    }
    assert.ok(err instanceof ServiceUnavailableException);
    assert.equal(rolledBack.length, 1);
    assert.equal(rolledBack[0]?.getTime(), previous.getTime());
    assert.deepEqual(recorder.outcomes, ["failure"]);
  });
});

// ─── AC8: logger redaction (logger spy) ───────────────────────────────────────

describe("AC8: logging redaction — payload / clientRevision 노출 X", () => {
  it("R2 rollback warn 로그에 payload string / clientRevision iso 가 포함되지 않음", async () => {
    const previous = new Date("2026-05-22T11:00:00Z");
    const secretMarker = "SECRET-USER-NOTE-XYZ";
    const captured: string[] = [];
    const prisma = {
      pdfMaterial: {
        findFirst: async () => ({ id: "mat-001" }),
        findMany: async () => []
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [],
        updateMany: async () => ({ count: 1 }),
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => {
        throw new Error("simulated R2 failure");
      }
    };
    const service = makeService(prisma, storage);
    // Logger spy: replace internal logger with stub.
    (service as unknown as { logger: { warn: (msg: string) => void; log: (msg: string) => void; error: (msg: string) => void } }).logger = {
      warn: (msg) => captured.push(msg),
      log: (msg) => captured.push(msg),
      error: (msg) => captured.push(msg)
    };

    try {
      await service.putAnnotation(
        OWNER,
        "mat-001",
        { text: secretMarker },
        previous.toISOString()
      );
    } catch {
      /* expected */
    }
    const all = captured.join(" | ");
    assert.equal(all.includes(secretMarker), false, "payload secret leaked to log");
    assert.equal(all.includes(previous.toISOString()), false, "clientRevision leaked to log");
    // 식별자는 OK.
    assert.equal(all.includes("mat-001"), true, "materialId should be present for ops debug");
  });
});

// ─── PayloadTooLarge ──────────────────────────────────────────────────────────

describe("payload size cap (sprint-2/S1 회귀)", () => {
  it("4MB 초과 → PayloadTooLargeException", async () => {
    const prisma = {
      pdfMaterial: {
        findFirst: async () => ({ id: "mat-001" }),
        findMany: async () => []
      },
      annotationSnapshot: {
        findUnique: async () => null,
        findMany: async () => [],
        updateMany: async () => ({ count: 1 }),
        create: async () => ({ savedAt: new Date() }),
        delete: async () => undefined
      }
    } as MockPrisma;
    const storage: MockStorage = {
      getJsonObject: async () => null,
      putJsonObject: async () => undefined
    };
    const service = makeService(prisma, storage);
    const huge = { blob: "x".repeat(5 * 1024 * 1024) };
    let err: PayloadTooLargeException | null = null;
    try {
      await service.putAnnotation(OWNER, "mat-001", huge);
    } catch (e) {
      err = e as PayloadTooLargeException;
    }
    assert.ok(err instanceof PayloadTooLargeException);
  });
});

// ─── Legacy materials annotation 410 ─────────────────────────────────────────

describe("Legacy /api/materials/:materialId/annotation deprecation", () => {
  it("controller 의 saveAnnotationDeprecated / getAnnotationDeprecated → GoneException", async () => {
    // controller spec 은 instance 만 만들어 메서드 동작 검증.
    const { MaterialsController } = await import("../../materials/materials.controller");
    const controller = new MaterialsController(
      {} as unknown as import("../../materials/material-upload.service").MaterialUploadService,
      {} as unknown as import("../../materials/materials.service").MaterialsService
    );
    assert.throws(() => controller.saveAnnotationDeprecated(), GoneException);
    assert.throws(() => controller.getAnnotationDeprecated(), GoneException);
  });
});
