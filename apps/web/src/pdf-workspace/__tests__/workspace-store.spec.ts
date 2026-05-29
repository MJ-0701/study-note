/**
 * workspace-store.spec.ts — sprint-2026-W22-sprint-1 / layer B/slice-2a AC6.
 *
 * 13 함수 (buildPdfWorkspaceKey, parsePdfWorkspaceStorePayload,
 * loadPdfWorkspaceStore, savePdfWorkspaceStore, updatePdfWorkspace,
 * syncCurrentPdfMaterial, getPdfMaterialKey, getPdfWorkspaceMaterials,
 * sortPdfMaterialsNewestFirst, upsertPdfWorkspaceMaterial,
 * replacePdfWorkspaceMaterials, selectPdfWorkspaceMaterial,
 * getSubjectPdfMaterials) characterization. T2/T3/T4 security cases.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/workspace-store.spec.ts
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type {
  PdfMaterialDraft,
  PdfWorkspaceStore,
  SubjectPdfWorkspace
} from "@study-note/domain";

// pdfWorkspaceStorageKey 의 expected literal — domain/pdf-workspace.ts:228 와
// 일치 contract. 직접 runtime import 시 node:test --experimental-strip-types
// 가 lecture-note sub-path 를 해결 못 함 (extension-less import). characterization
// spec 은 contract 자체를 명시.
const EXPECTED_STORAGE_KEY_PREFIX = "study-note.pdf-workspaces.v1";
import {
  buildPdfWorkspaceKey,
  getPdfMaterialKey,
  getPdfWorkspaceMaterials,
  getSubjectPdfMaterials,
  loadPdfWorkspaceStore,
  parsePdfWorkspaceStorePayload,
  replacePdfWorkspaceMaterials,
  savePdfWorkspaceStore,
  selectPdfWorkspaceMaterial,
  clearWorkspaceAnnotations,
  sortPdfMaterialsNewestFirst,
  syncCurrentPdfMaterial,
  updatePdfWorkspace,
  upsertPdfWorkspaceMaterial,
  type WorkspaceDomainHelpers,
  type WorkspaceStoreCallbacks,
  type WorkspaceStoreContext
} from "../workspace-store.ts";

// ─── stub domain helpers (runtime import 차단 — spec 자체 stub) ────────────

const stubDomain: WorkspaceDomainHelpers = {
  storageKeyPrefix: EXPECTED_STORAGE_KEY_PREFIX,
  getSubjectWorkspace: (store, subjectId) => {
    const existing = store.workspaces[subjectId];
    if (existing) return existing;
    return makeWorkspace();
  },
  hydrateSubjectWorkspace: (entry) => entry as SubjectPdfWorkspace,
  createMaterialFromBackend: (record, previous) => ({
    ...(previous ?? {}),
    id: record.id,
    backendMaterialId: record.id,
    fileName: record.fileName,
    fileSize: record.fileSize,
    pageCount: record.pageCount,
    uploadedAt: record.uploadedAt,
    selectedPage: previous?.selectedPage ?? 1,
    selectedTool: previous?.selectedTool ?? "read"
  } as PdfMaterialDraft)
};

// ─── jsdom-free localStorage stub ────────────────────────────────────────

interface StorageImpl {
  store: Map<string, string>;
  throwOn?: { method: "getItem" | "setItem" | "removeItem"; key?: string };
}

function installFakeLocalStorage(): StorageImpl {
  const impl: StorageImpl = { store: new Map() };
  const storage = {
    getItem: (k: string) => {
      if (impl.throwOn?.method === "getItem" && (!impl.throwOn.key || impl.throwOn.key === k)) {
        throw new Error("getItem throw");
      }
      return impl.store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (impl.throwOn?.method === "setItem" && (!impl.throwOn.key || impl.throwOn.key === k)) {
        throw new Error("setItem throw");
      }
      impl.store.set(k, v);
    },
    removeItem: (k: string) => {
      if (impl.throwOn?.method === "removeItem" && (!impl.throwOn.key || impl.throwOn.key === k)) {
        throw new Error("removeItem throw");
      }
      impl.store.delete(k);
    }
  };
  (globalThis as { window?: { localStorage: typeof storage } }).window = { localStorage: storage };
  return impl;
}

function makeMaterial(
  id: string,
  overrides: Partial<PdfMaterialDraft> = {}
): PdfMaterialDraft {
  return {
    id,
    backendMaterialId: id,
    fileName: `${id}.pdf`,
    fileSize: 1024,
    pageCount: 1,
    uploadedAt: new Date(2026, 0, 1).toISOString(),
    selectedPage: 1,
    selectedTool: "read",
    ...overrides
  } as PdfMaterialDraft;
}

function makeWorkspace(
  overrides: Partial<SubjectPdfWorkspace> = {}
): SubjectPdfWorkspace {
  return {
    material: null,
    materials: [],
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: [],
    tables: [],
    charts: [],
    starMarks: [],
    pdfTool: "read",
    updatedAt: new Date(0).toISOString(),
    ...overrides
  } as unknown as SubjectPdfWorkspace;
}

interface Harness {
  storage: StorageImpl;
  store: PdfWorkspaceStore;
  ctx: WorkspaceStoreContext;
  cb: WorkspaceStoreCallbacks;
  putCalls: Array<{ materialId: string; payload: unknown }>;
  clearedSubjectIds: string[];
  setStoreCalls: PdfWorkspaceStore[];
}

function makeHarness(opts: {
  userId?: string;
  initialStore?: PdfWorkspaceStore;
} = {}): Harness {
  const storage = installFakeLocalStorage();
  let store: PdfWorkspaceStore = opts.initialStore ?? { workspaces: {} };
  const putCalls: Array<{ materialId: string; payload: unknown }> = [];
  const clearedSubjectIds: string[] = [];
  const setStoreCalls: PdfWorkspaceStore[] = [];

  const ctx: WorkspaceStoreContext = {
    getStore: () => store,
    getActiveUserId: () => opts.userId,
    domain: stubDomain
  };
  const cb: WorkspaceStoreCallbacks = {
    setStore: (next) => {
      store = next;
      setStoreCalls.push(next);
    },
    scheduleAnnotationPut: (materialId, payload) => {
      putCalls.push({ materialId, payload });
    },
    getAnnotationSyncContext: () => ({} as never),
    getAnnotationSyncCallbacks: () => ({} as never),
    clearActivePdfObjectUrl: (subjectId) => {
      clearedSubjectIds.push(subjectId);
    }
  };

  return {
    storage,
    get store() {
      return store;
    },
    ctx,
    cb,
    putCalls,
    clearedSubjectIds,
    setStoreCalls
  };
}

beforeEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

// ─── AC6 (1) — buildPdfWorkspaceKey (1 case) ─────────────────────────────

describe("AC6 (1) — buildPdfWorkspaceKey", () => {
  it("userId 가 prefix 에 namespacing — sprint-3/S2 invariant", () => {
    assert.equal(
      buildPdfWorkspaceKey("userA", EXPECTED_STORAGE_KEY_PREFIX),
      `${EXPECTED_STORAGE_KEY_PREFIX}:userA`
    );
    assert.equal(
      buildPdfWorkspaceKey("userB", EXPECTED_STORAGE_KEY_PREFIX),
      `${EXPECTED_STORAGE_KEY_PREFIX}:userB`
    );
    assert.notEqual(
      buildPdfWorkspaceKey("userA", EXPECTED_STORAGE_KEY_PREFIX),
      buildPdfWorkspaceKey("userB", EXPECTED_STORAGE_KEY_PREFIX)
    );
  });
});

// ─── AC6 (2) — parsePdfWorkspaceStorePayload (corrupt recovery — T4) ─────

describe("AC6 (2) — parsePdfWorkspaceStorePayload (corrupt recovery)", () => {
  it("valid JSON + workspaces object → hydrated PdfWorkspaceStore", () => {
    const raw = JSON.stringify({ workspaces: { s1: makeWorkspace() } });
    const parsed = parsePdfWorkspaceStorePayload(raw, stubDomain);
    assert.ok(parsed);
    assert.ok("s1" in parsed.workspaces);
  });

  it("invalid JSON → undefined (T4: corrupt storage recovery)", () => {
    assert.equal(parsePdfWorkspaceStorePayload("not json", stubDomain), undefined);
    assert.equal(parsePdfWorkspaceStorePayload("", stubDomain), undefined);
    assert.equal(parsePdfWorkspaceStorePayload("{", stubDomain), undefined);
  });
});

// ─── AC6 (3) — loadPdfWorkspaceStore (3 case) ────────────────────────────

describe("AC6 (3) — loadPdfWorkspaceStore", () => {
  it("scoped key 미존재 → empty store", () => {
    installFakeLocalStorage();
    const result = loadPdfWorkspaceStore("userA", stubDomain);
    assert.deepEqual(result, { workspaces: {} });
  });

  it("scoped key 존재 + valid payload → parsed store", () => {
    const impl = installFakeLocalStorage();
    impl.store.set(
      buildPdfWorkspaceKey("userA", EXPECTED_STORAGE_KEY_PREFIX),
      JSON.stringify({ workspaces: { s1: makeWorkspace() } })
    );
    const result = loadPdfWorkspaceStore("userA", stubDomain);
    assert.ok("s1" in result.workspaces);
  });

  it("scoped key 존재 + corrupt payload → removeItem + empty store (T4)", () => {
    const impl = installFakeLocalStorage();
    impl.store.set(buildPdfWorkspaceKey("userA", EXPECTED_STORAGE_KEY_PREFIX), "not json");
    const result = loadPdfWorkspaceStore("userA", stubDomain);
    assert.deepEqual(result, { workspaces: {} });
    // corrupt key removed
    assert.equal(impl.store.has(buildPdfWorkspaceKey("userA", EXPECTED_STORAGE_KEY_PREFIX)), false);
  });
});

// ─── AC6 (4) — savePdfWorkspaceStore (T3: unauthenticated write skip) ────

describe("AC6 (4) — savePdfWorkspaceStore", () => {
  it("active userId 존재 → setItem(scoped key, store JSON)", () => {
    const h = makeHarness({ userId: "userA", initialStore: { workspaces: { s1: makeWorkspace() } } });
    savePdfWorkspaceStore(h.ctx);
    const written = h.storage.store.get(buildPdfWorkspaceKey("userA", EXPECTED_STORAGE_KEY_PREFIX));
    assert.ok(written);
    const parsed = JSON.parse(written!) as PdfWorkspaceStore;
    assert.ok("s1" in parsed.workspaces);
  });

  it("T3: active userId 부재 (boot 단계) → setItem 호출 0 (unauthenticated write skip)", () => {
    const h = makeHarness({ userId: undefined });
    savePdfWorkspaceStore(h.ctx);
    assert.equal(h.storage.store.size, 0);
  });

  it("T2: userA 가 write 한 후 userB 가 load → cross-user 데이터 0건 (key 분리)", () => {
    // userA save
    const hA = makeHarness({ userId: "userA", initialStore: { workspaces: { s1: makeWorkspace() } } });
    savePdfWorkspaceStore(hA.ctx);
    // userB load (same storage instance reused)
    const result = loadPdfWorkspaceStore("userB", stubDomain);
    assert.deepEqual(result, { workspaces: {} });
  });

  it("explicit userId 인자 우선 적용 (default = ctx.getActiveUserId)", () => {
    const h = makeHarness({ userId: "userA", initialStore: { workspaces: { s1: makeWorkspace() } } });
    savePdfWorkspaceStore(h.ctx, "userExplicit");
    assert.ok(h.storage.store.has(buildPdfWorkspaceKey("userExplicit", EXPECTED_STORAGE_KEY_PREFIX)));
    assert.equal(h.storage.store.has(buildPdfWorkspaceKey("userA", EXPECTED_STORAGE_KEY_PREFIX)), false);
  });
});

// ─── AC6 (5) — updatePdfWorkspace + annotation PUT 분기 ───────────────────

describe("AC6 (5) — updatePdfWorkspace", () => {
  it("nextMaterial === previousMaterial + annotation payload 변경 → annotation PUT 호출", () => {
    const material = makeMaterial("m1");
    const h = makeHarness({
      userId: "userA",
      initialStore: { workspaces: { s1: makeWorkspace({ material }) } }
    });
    updatePdfWorkspace(
      "s1",
      (ws) => ({
        ...ws,
        stickyNotes: [{ id: "note-1", content: "memo" } as never]
      }),
      h.ctx,
      h.cb
    );
    assert.equal(h.putCalls.length, 1);
    assert.equal(h.putCalls[0]!.materialId, "m1");
  });

  it("material metadata only 변경 → annotation PUT 호출 0", () => {
    const material = makeMaterial("m1", { classDate: "2026-05-02" } as never);
    const h = makeHarness({
      userId: "userA",
      initialStore: { workspaces: { s1: makeWorkspace({ material }) } }
    });
    updatePdfWorkspace(
      "s1",
      (ws) => ({
        ...ws,
        material: { ...material, classDate: "2026-05-28" } as never
      }),
      h.ctx,
      h.cb
    );
    assert.equal(h.putCalls.length, 0);
  });

  it("nextMaterial 전환 (m1 → m2) → annotation PUT 호출 0 (PR #29 codex P1 fix)", () => {
    const m1 = makeMaterial("m1");
    const m2 = makeMaterial("m2");
    const h = makeHarness({
      userId: "userA",
      initialStore: { workspaces: { s1: makeWorkspace({ material: m1, materials: [m1, m2] }) } }
    });
    updatePdfWorkspace(
      "s1",
      (ws) => ({ ...ws, material: m2 }),
      h.ctx,
      h.cb
    );
    assert.equal(h.putCalls.length, 0);
  });

  it("T3: active userId 부재 → setStore 는 동작 (in-memory) + LS write 차단", () => {
    const material = makeMaterial("m1");
    const h = makeHarness({
      userId: undefined,
      initialStore: { workspaces: { s1: makeWorkspace({ material }) } }
    });
    updatePdfWorkspace(
      "s1",
      (ws) => ({
        ...ws,
        stickyNotes: [{ id: "note-1", content: "memo" } as never]
      }),
      h.ctx,
      h.cb
    );
    assert.equal(h.setStoreCalls.length, 1, "in-memory store 는 업데이트");
    assert.equal(h.storage.store.size, 0, "LS write 는 차단 (unauthenticated)");
    // annotation PUT 은 호출됨 (BE 가 cookie session 검증) — sprint-3/S2 정책.
    assert.equal(h.putCalls.length, 1);
  });
});

// ─── AC6 (6) — syncCurrentPdfMaterial (1 case) ───────────────────────────

describe("AC6 (6) — syncCurrentPdfMaterial", () => {
  it("dedup 후 newest-first 재정렬 (current material 보존)", () => {
    // sync 는 current material 을 list 에 포함시키되 sort 는 uploadedAt 기반.
    // current = m1 (older), m2 = newer → 정렬 후 [m2, m1].
    const m1 = makeMaterial("m1", { uploadedAt: new Date(2026, 0, 1).toISOString() });
    const m2 = makeMaterial("m2", { uploadedAt: new Date(2026, 1, 1).toISOString() });
    const ws = makeWorkspace({ material: m1, materials: [m2, m1] });
    const synced = syncCurrentPdfMaterial(ws);
    assert.equal(synced.materials!.length, 2, "dedup 후 2");
    assert.equal(
      getPdfMaterialKey(synced.materials![0]!),
      "m2",
      "newest first (m2 가 m1 보다 newer)"
    );
    // current material 자체는 유지.
    assert.equal(getPdfMaterialKey(synced.material!), "m1");
  });
});

// ─── AC6 (7) — upsertPdfWorkspaceMaterial (1 case) ────────────────────────

describe("AC6 (7) — upsertPdfWorkspaceMaterial", () => {
  it("기존 entry 가 있으면 교체 + material = inserted", () => {
    const m1Old = makeMaterial("m1", { selectedPage: 1 });
    const m1New = makeMaterial("m1", { selectedPage: 5 });
    const ws = makeWorkspace({ material: m1Old, materials: [m1Old] });
    const result = upsertPdfWorkspaceMaterial(ws, m1New);
    assert.equal(result.material?.selectedPage, 5);
    assert.equal(result.materials!.length, 1);
  });
});

// ─── AC6 (8) — replacePdfWorkspaceMaterials (1 case) ──────────────────────

describe("AC6 (8) — replacePdfWorkspaceMaterials", () => {
  it("backend records 가 drafts 로 변환 + selected 유지 (현 material 의 id 가 있으면)", () => {
    const m1 = makeMaterial("m1");
    const ws = makeWorkspace({ material: m1, materials: [m1] });
    const backendRecords = [
      { id: "m1", subjectId: "s1", fileName: "m1.pdf", fileSize: 2048, pageCount: 2, uploadedAt: new Date().toISOString() },
      { id: "m2", subjectId: "s1", fileName: "m2.pdf", fileSize: 2048, pageCount: 2, uploadedAt: new Date().toISOString() }
    ];
    const result = replacePdfWorkspaceMaterials(ws, backendRecords as never, stubDomain);
    assert.equal(result.materials!.length, 2);
    assert.equal(getPdfMaterialKey(result.material!), "m1");
  });
});

// ─── AC6 (9) — selectPdfWorkspaceMaterial + clearActivePdfObjectUrl side-effect ─

describe("AC6 (9) — selectPdfWorkspaceMaterial", () => {
  it("material 전환 (m1 → m2) → clearActivePdfObjectUrl(subjectId) 호출", () => {
    const m1 = makeMaterial("m1");
    const m2 = makeMaterial("m2");
    const h = makeHarness({
      userId: "userA",
      initialStore: { workspaces: { s1: makeWorkspace({ material: m1, materials: [m1, m2] }) } }
    });
    const ok = selectPdfWorkspaceMaterial("s1", "m2", h.ctx, h.cb);
    assert.equal(ok, true);
    assert.deepEqual(h.clearedSubjectIds, ["s1"]);
  });

  it("동일 materialId 재선택 → clearActivePdfObjectUrl 호출 0", () => {
    const m1 = makeMaterial("m1");
    const h = makeHarness({
      userId: "userA",
      initialStore: { workspaces: { s1: makeWorkspace({ material: m1, materials: [m1] }) } }
    });
    selectPdfWorkspaceMaterial("s1", "m1", h.ctx, h.cb);
    assert.deepEqual(h.clearedSubjectIds, []);
  });

  it("미존재 materialId → false 반환, side-effect 0", () => {
    const m1 = makeMaterial("m1");
    const h = makeHarness({
      userId: "userA",
      initialStore: { workspaces: { s1: makeWorkspace({ material: m1, materials: [m1] }) } }
    });
    const ok = selectPdfWorkspaceMaterial("s1", "m99", h.ctx, h.cb);
    assert.equal(ok, false);
    assert.deepEqual(h.clearedSubjectIds, []);
    assert.equal(h.setStoreCalls.length, 0);
  });

  it("material 전환 (m1→m2) → 직전 material 의 annotation 초기화 (display bleed 차단)", () => {
    const m1 = makeMaterial("m1");
    const m2 = makeMaterial("m2");
    const h = makeHarness({
      userId: "userA",
      initialStore: {
        workspaces: {
          s1: makeWorkspace({
            material: m1,
            materials: [m1, m2],
            stickyNotes: [{ id: "n1" } as never]
          })
        }
      }
    });
    selectPdfWorkspaceMaterial("s1", "m2", h.ctx, h.cb);
    const ws = h.store.workspaces.s1;
    assert.equal(ws.material?.id, "m2");
    assert.deepEqual(ws.stickyNotes, [], "전환 시 직전 material 의 stickyNotes 초기화");
  });

  it("clearWorkspaceAnnotations → 7종 annotation 배열 전부 비움 (비-annotation 설정 보존)", () => {
    const ws = makeWorkspace({
      stickyNotes: [{ id: "n1" } as never],
      inkStrokes: [{ id: "k1" } as never],
      textBoxes: [{ id: "t1" } as never],
      checklists: [{ id: "c1" } as never],
      tables: [{ id: "tb1" } as never],
      charts: [{ id: "ch1" } as never],
      starMarks: [{ id: "sm1" } as never],
      eraserShape: "circle" as never,
      eraserSize: 12 as never
    });
    const cleared = clearWorkspaceAnnotations(ws);
    assert.deepEqual(cleared.stickyNotes, []);
    assert.deepEqual(cleared.inkStrokes, []);
    assert.deepEqual(cleared.textBoxes, []);
    assert.deepEqual(cleared.checklists, []);
    assert.deepEqual(cleared.tables, []);
    assert.deepEqual(cleared.charts, []);
    assert.deepEqual(cleared.starMarks, []);
    // 비-annotation 설정은 보존
    assert.equal((cleared as never as { eraserShape: string }).eraserShape, "circle");
    assert.equal((cleared as never as { eraserSize: number }).eraserSize, 12);
  });

  it("material 전환 시 빈 annotation 이 BE 로 PUT 되지 않음 (material 변경 guard)", () => {
    const m1 = makeMaterial("m1");
    const m2 = makeMaterial("m2");
    const h = makeHarness({
      userId: "userA",
      initialStore: {
        workspaces: {
          s1: makeWorkspace({ material: m1, materials: [m1, m2], stickyNotes: [{ id: "n1" } as never] })
        }
      }
    });
    selectPdfWorkspaceMaterial("s1", "m2", h.ctx, h.cb);
    assert.equal(h.putCalls.length, 0, "material 변경 시 PUT skip → 빈 배열 BE 누출 0");
  });

  it("동일 materialId 재선택 → annotation 보존 (초기화 X)", () => {
    const m1 = makeMaterial("m1");
    const h = makeHarness({
      userId: "userA",
      initialStore: {
        workspaces: {
          s1: makeWorkspace({ material: m1, materials: [m1], stickyNotes: [{ id: "n1" } as never] })
        }
      }
    });
    selectPdfWorkspaceMaterial("s1", "m1", h.ctx, h.cb);
    assert.equal(h.store.workspaces.s1.stickyNotes.length, 1, "동일 material 재선택 시 annotation 보존");
  });
});

// ─── AC6 (10) — getSubjectPdfMaterials + sort + dedup ────────────────────

describe("AC6 (10) — getSubjectPdfMaterials + getPdfWorkspaceMaterials", () => {
  it("dedup by key + sortNewestFirst", () => {
    const m1 = makeMaterial("m1", { uploadedAt: new Date(2026, 0, 1).toISOString() });
    const m2 = makeMaterial("m2", { uploadedAt: new Date(2026, 1, 1).toISOString() });
    const ws = makeWorkspace({ material: m1, materials: [m1, m2, m1] }); // dup
    const result = getPdfWorkspaceMaterials(ws);
    assert.equal(result.length, 2);
    assert.equal(getPdfMaterialKey(result[0]!), "m2"); // newer first
  });

  it("getSubjectPdfMaterials 가 ctx.getStore() 로 read", () => {
    const m1 = makeMaterial("m1");
    const h = makeHarness({
      userId: "userA",
      initialStore: { workspaces: { s1: makeWorkspace({ material: m1, materials: [m1] }) } }
    });
    const result = getSubjectPdfMaterials("s1", h.ctx);
    assert.equal(result.length, 1);
    assert.equal(getPdfMaterialKey(result[0]!), "m1");
  });

  it("sortPdfMaterialsNewestFirst — uploadedAt 기반 정렬 안정", () => {
    const m1 = makeMaterial("m1", { uploadedAt: new Date(2026, 0, 1).toISOString() });
    const m2 = makeMaterial("m2", { uploadedAt: new Date(2026, 1, 1).toISOString() });
    const sorted = sortPdfMaterialsNewestFirst([m1, m2]);
    assert.equal(getPdfMaterialKey(sorted[0]!), "m2");
    assert.equal(getPdfMaterialKey(sorted[1]!), "m1");
  });
});
