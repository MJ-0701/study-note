// sprint-2026-W22-sprint-1 / layer B/slice-2a — PdfWorkspaceStore CRUD 모듈.
// main.ts 의 buildPdfWorkspaceKey + parsePdfWorkspaceStorePayload +
// loadPdfWorkspaceStore + savePdfWorkspaceStore + updatePdfWorkspace +
// syncCurrentPdfMaterial + getPdfMaterialKey + getPdfWorkspaceMaterials +
// sortPdfMaterialsNewestFirst + upsertPdfWorkspaceMaterial +
// replacePdfWorkspaceMaterials + selectPdfWorkspaceMaterial +
// getSubjectPdfMaterials (13 함수) 를 격리. `let pdfWorkspaceStore` mutable
// 은 main.ts 에 잔류 (50+ 직접 read 사이트 보존 위함). 모듈 진입은 Context
// (least-privilege read) + Callbacks (least-privilege write) 만.
//
// invariant:
//   - localStorage key = `{pdfWorkspaceStorageKey}:{userId}` (sprint-3/S2
//     namespacing). userId 없으면 save 차단 (T3: unauthenticated write).
//   - corrupt payload = remove + empty store (T4: localStorage 손상 복원).
//   - updatePdfWorkspace 의 nextMaterial === previousMaterial 조건일 때만
//     annotation PUT (PR #29 codex P1 fix — 잘못된 material 매핑 방지).
//   - selectPdfWorkspaceMaterial 가 material 전환 시 clearActivePdfObjectUrl
//     호출 (object URL lifecycle 일관성).

import {
  createPdfMaterialFromBackend,
  getSubjectPdfWorkspace,
  hydrateSubjectPdfWorkspace,
  pdfWorkspaceStorageKey,
  type PdfMaterialDraft,
  type PdfMaterialRecord,
  type PdfWorkspaceStore,
  type SubjectPdfWorkspace
} from "@study-note/domain";
import type {
  AnnotationSyncCallbacks,
  AnnotationSyncContext
} from "./annotation-sync";

// ─── Public types ────────────────────────────────────────────────────────

/**
 * workspace-store stateful 함수가 read-only 로 받는 main.ts state. broad
 * `pdfWorkspaceStore` 변수 노출 X — getter 만.
 */
export interface WorkspaceStoreContext {
  getStore: () => PdfWorkspaceStore;
  getActiveUserId: () => string | undefined;
}

/**
 * workspace-store stateful 함수의 부수효과 callback. broad setter 노출 X —
 * 필요한 narrow side-effect 만.
 *
 * - setStore: main.ts 의 `let pdfWorkspaceStore` 교체.
 * - scheduleAnnotationPut: updatePdfWorkspace 의 material PUT 트리거.
 *   annotation-sync 모듈로 위임.
 * - clearActivePdfObjectUrl: selectPdfWorkspaceMaterial 의 material 전환 시
 *   이전 blob URL 해제. canvas-mount 모듈로 위임.
 */
export interface WorkspaceStoreCallbacks {
  setStore: (next: PdfWorkspaceStore) => void;
  scheduleAnnotationPut: (
    materialId: string,
    payload: {
      stickyNotes: SubjectPdfWorkspace["stickyNotes"];
      inkStrokes: SubjectPdfWorkspace["inkStrokes"];
      textBoxes: SubjectPdfWorkspace["textBoxes"];
      checklists: SubjectPdfWorkspace["checklists"];
      tables: SubjectPdfWorkspace["tables"];
      charts: SubjectPdfWorkspace["charts"];
      starMarks: SubjectPdfWorkspace["starMarks"];
    },
    annotationSyncContext: AnnotationSyncContext,
    annotationSyncCallbacks: AnnotationSyncCallbacks
  ) => void;
  getAnnotationSyncContext: () => AnnotationSyncContext;
  getAnnotationSyncCallbacks: () => AnnotationSyncCallbacks;
  clearActivePdfObjectUrl: (subjectId: string) => void;
}

// ─── 1) Pure helpers (state-free) ────────────────────────────────────────

// sprint-3/S2: userId-scoped pdfWorkspaceStore localStorage key. Mirrors the
// S1 notebook namespacing pattern (`{base}:{userId}`) so A→B account
// transitions cannot see each other's PDF workspace through localStorage.
export function buildPdfWorkspaceKey(userId: string): string {
  return `${pdfWorkspaceStorageKey}:${userId}`;
}

// sprint-3/S2: parse + hydrate a raw localStorage payload into a
// PdfWorkspaceStore. Shared by the scoped-key load path and the legacy
// migration path; returns undefined when the payload is missing or
// structurally invalid so callers can fall back to an empty store.
export function parsePdfWorkspaceStorePayload(raw: string): PdfWorkspaceStore | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<PdfWorkspaceStore>;

    if (parsed.workspaces && typeof parsed.workspaces === "object") {
      // sprint-12/slice-2: hydrate each workspace through fail-closed helper.
      // corrupt entries (invalid textBoxes/checklists) are dropped per-item.
      // sticky/ink BC: pass-through (array保証のみ).
      const rawEntries = parsed.workspaces as Record<string, unknown>;
      const workspaces: PdfWorkspaceStore["workspaces"] = {};

      for (const [id, entry] of Object.entries(rawEntries)) {
        workspaces[id] = hydrateSubjectPdfWorkspace(entry);
      }

      return { workspaces };
    }
  } catch {
    /* fall through to undefined */
  }
  return undefined;
}

export function getPdfMaterialKey(material: PdfMaterialDraft): string {
  return material.backendMaterialId ?? material.id;
}

export function sortPdfMaterialsNewestFirst(
  materials: PdfMaterialDraft[]
): PdfMaterialDraft[] {
  return [...materials].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? a.uploadedAt);
    const bTime = Date.parse(b.updatedAt ?? b.uploadedAt);
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

export function getPdfWorkspaceMaterials(
  workspace: SubjectPdfWorkspace
): PdfMaterialDraft[] {
  const seen = new Set<string>();
  const materials: PdfMaterialDraft[] = [];
  const candidates = [
    ...(workspace.material ? [workspace.material] : []),
    ...((workspace.materials ?? []) as PdfMaterialDraft[])
  ];

  for (const material of candidates) {
    const key = getPdfMaterialKey(material);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    materials.push(material);
  }

  return sortPdfMaterialsNewestFirst(materials);
}

export function syncCurrentPdfMaterial(
  workspace: SubjectPdfWorkspace
): SubjectPdfWorkspace {
  if (!workspace.material) {
    return {
      ...workspace,
      materials: getPdfWorkspaceMaterials(workspace)
    };
  }

  const materialKey = getPdfMaterialKey(workspace.material);
  const materials = [
    workspace.material,
    ...getPdfWorkspaceMaterials(workspace).filter(
      (item) => getPdfMaterialKey(item) !== materialKey
    )
  ];

  return {
    ...workspace,
    materials: sortPdfMaterialsNewestFirst(materials)
  };
}

export function upsertPdfWorkspaceMaterial(
  workspace: SubjectPdfWorkspace,
  material: PdfMaterialDraft
): SubjectPdfWorkspace {
  const key = getPdfMaterialKey(material);
  const materials = [
    material,
    ...getPdfWorkspaceMaterials(workspace).filter(
      (item) => getPdfMaterialKey(item) !== key
    )
  ];

  return {
    ...workspace,
    material,
    materials: sortPdfMaterialsNewestFirst(materials)
  };
}

export function replacePdfWorkspaceMaterials(
  workspace: SubjectPdfWorkspace,
  backendMaterials: PdfMaterialRecord[]
): SubjectPdfWorkspace {
  const existingMaterials = getPdfWorkspaceMaterials(workspace);
  const existingByKey = new Map(
    existingMaterials.map((material) => [getPdfMaterialKey(material), material])
  );
  const drafts = backendMaterials.map((material) => {
    const key = material.id;
    const previous =
      existingByKey.get(key) ??
      (workspace.material && getPdfMaterialKey(workspace.material) === key
        ? workspace.material
        : undefined);

    return createPdfMaterialFromBackend(material, previous);
  });
  const currentKey = workspace.material ? getPdfMaterialKey(workspace.material) : undefined;
  const selected = currentKey
    ? drafts.find((material) => getPdfMaterialKey(material) === currentKey)
    : undefined;

  return {
    ...workspace,
    material: selected ?? drafts[0] ?? workspace.material,
    materials: sortPdfMaterialsNewestFirst(drafts)
  };
}

// ─── 2) Stateful (ctx + callbacks 받음) ───────────────────────────────────

export function loadPdfWorkspaceStore(userId: string): PdfWorkspaceStore {
  const scopedKey = buildPdfWorkspaceKey(userId);
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(scopedKey);
  } catch {
    return { workspaces: {} };
  }

  if (!stored) {
    // sprint-4/S1: no scoped data yet — start from an empty store. Server
    // annotation GET hydrate (sprint-2) restores PDF workspace data.
    return { workspaces: {} };
  }

  const parsed = parsePdfWorkspaceStorePayload(stored);
  if (parsed) {
    return parsed;
  }
  try {
    window.localStorage.removeItem(scopedKey);
  } catch {
    /* ignore */
  }
  return { workspaces: {} };
}

// sprint-3/S2: require an authenticated userId to write. Saving without one
// would either land on the legacy unscoped key (leak vector) or an empty
// namespace (data loss). When there is no session yet (boot before
// /v1/auth/me resolves), drop the write — the next save after session attach
// will persist the same in-memory state.
export function savePdfWorkspaceStore(
  context: WorkspaceStoreContext,
  explicitUserId?: string
): void {
  const userId = explicitUserId ?? context.getActiveUserId();
  if (!userId) {
    return;
  }
  try {
    window.localStorage.setItem(
      buildPdfWorkspaceKey(userId),
      JSON.stringify(context.getStore())
    );
  } catch {
    /* localStorage exception (quota / private mode) — silent: server autosave
       is SoT for pdfWorkspaceStore, and the next mutation retries the write. */
  }
}

export function updatePdfWorkspace(
  subjectId: string,
  updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace,
  context: WorkspaceStoreContext,
  callbacks: WorkspaceStoreCallbacks
): void {
  const store = context.getStore();
  const current = getSubjectPdfWorkspace(store, subjectId);
  const updated = syncCurrentPdfMaterial({
    ...updater(current),
    updatedAt: new Date().toISOString()
  });

  const nextStore: PdfWorkspaceStore = {
    workspaces: {
      ...store.workspaces,
      [subjectId]: updated
    }
  };
  callbacks.setStore(nextStore);
  savePdfWorkspaceStore(context);
  // sprint-2/S2 fix (codex P1): only PUT annotations when the active material
  // did not change. If the mutator only switched material (current.material →
  // updated.material is a different id), the workspace's annotation arrays
  // belong to the *previous* material and a PUT would mis-attribute them to
  // the new material's BE record.
  const previousMaterial = current.material;
  const nextMaterial = updated.material;
  const previousId = previousMaterial?.backendMaterialId ?? previousMaterial?.id;
  const nextId = nextMaterial?.backendMaterialId ?? nextMaterial?.id;
  if (nextMaterial && previousId === nextId) {
    const payload = {
      stickyNotes: updated.stickyNotes,
      inkStrokes: updated.inkStrokes,
      textBoxes: updated.textBoxes,
      checklists: updated.checklists,
      tables: updated.tables,
      charts: updated.charts,
      // PR #52 codex Round-1 P1 — starMarks 가 annotation PUT 에 누락되어
      // reload 후 사라지던 문제. BE Zod whole-reject (starMark.dto.ts) 가
      // valid payload 만 통과시킴.
      starMarks: updated.starMarks ?? []
    };
    callbacks.scheduleAnnotationPut(
      nextId!,
      payload,
      callbacks.getAnnotationSyncContext(),
      callbacks.getAnnotationSyncCallbacks()
    );
  }
}

export function selectPdfWorkspaceMaterial(
  subjectId: string,
  materialId: string,
  context: WorkspaceStoreContext,
  callbacks: WorkspaceStoreCallbacks
): boolean {
  const current = getSubjectPdfWorkspace(context.getStore(), subjectId);
  const target = getPdfWorkspaceMaterials(current).find(
    (material) => getPdfMaterialKey(material) === materialId
  );

  if (!target) {
    return false;
  }

  if (current.material && getPdfMaterialKey(current.material) !== materialId) {
    callbacks.clearActivePdfObjectUrl(subjectId);
  }

  updatePdfWorkspace(
    subjectId,
    (workspace) => upsertPdfWorkspaceMaterial(workspace, target),
    context,
    callbacks
  );
  return true;
}

export function getSubjectPdfMaterials(
  subjectId: string,
  context: WorkspaceStoreContext
): PdfMaterialDraft[] {
  return getPdfWorkspaceMaterials(
    getSubjectPdfWorkspace(context.getStore(), subjectId)
  );
}
