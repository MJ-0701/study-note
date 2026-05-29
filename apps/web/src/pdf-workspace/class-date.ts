// sprint-2026-W22-sprint-2 / layer B/slice-2b — PDF material classDate 도메인 helper.
// main.ts 의 createClassDateWeekId + normalizePdfMaterialClassDateValue +
// patchPdfWorkspaceMaterial + replacePdfWorkspaceMaterial +
// assignPdfMaterialClassDate (5 함수) 격리. slice-2a workspace-store
// 패턴 (named export + Context + Callbacks + DomainHelpers 주입) 일치.
//
// invariant:
//   - PDF_MATERIAL_UNASSIGNED_CLASS_DATE = FE-local sentinel, UI "수업일
//     미지정" 옵션 보존.
//   - BE wire 는 strict ISO date. UI sentinel + legacy non-ISO label →
//     PDF_MATERIAL_UNASSIGNED_WIRE_DATE ('1970-01-01') 로 변환. FE-local 은
//     sentinel 유지 (PR #51 codex R3/R5 P2).
//   - 없는 수업일 (subject.weekNotes 에 label 없음) 거부.
//   - BE sync 실패 시 previousClassDate 로 rollback + error feedback.
//   - backendMaterialId 없는 local-only material 은 BE sync 건너뛰고
//     local 변경만 알린다.

import type {
  BackendPdfMaterialInput,
  PdfMaterialDraft,
  SubjectNote,
  SubjectPdfWorkspace
} from "@study-note/domain";
import {
  PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
  PDF_MATERIAL_UNASSIGNED_WIRE_DATE
} from "./constants.ts";

// ─── Public types ────────────────────────────────────────────────────────

/**
 * class-date stateful 함수가 read-only 로 받는 main.ts state. broad
 * `notebook` / `apiBaseUrl` 변수 노출 X — getter 만.
 */
export interface ClassDateContext {
  apiBaseUrl: string;
  getSubject: (subjectId: string) => SubjectNote | undefined;
  getSubjectMaterials: (subjectId: string) => PdfMaterialDraft[];
}

/**
 * class-date stateful 함수의 부수효과 + BE I/O callback. broad mutator
 * 노출 X — 필요한 narrow side-effect 만.
 *
 * - setFeedback: main.ts 의 `intakeFeedback` 교체 (UI banner).
 * - renderApp: top-level render trigger.
 * - updatePdfWorkspace: workspace-store updater (subject 단위).
 * - updatePdfMaterialMetadata: BE material metadata PATCH.
 */
export interface ClassDateCallbacks {
  setFeedback: (feedback: ClassDateFeedback) => void;
  renderApp: () => void;
  updatePdfWorkspace: (
    subjectId: string,
    updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
  ) => void;
  updatePdfMaterialMetadata: (
    apiBaseUrl: string,
    backendMaterialId: string,
    payload: { classDate: string }
  ) => Promise<BackendPdfMaterialInput>;
}

/**
 * domain runtime helper 를 main.ts 가 주입. workspace-store 와 동일 패턴 —
 * `@study-note/domain` 을 runtime import 하면 node:test
 * --experimental-strip-types 가 `export * from "./lecture-note"`
 * extension-less import 를 해결 못 함.
 */
export interface ClassDateDomainHelpers {
  getPdfMaterialKey: (material: PdfMaterialDraft) => string;
  getPdfWorkspaceMaterials: (
    workspace: SubjectPdfWorkspace
  ) => PdfMaterialDraft[];
  createPdfMaterialFromBackend: (
    record: BackendPdfMaterialInput,
    previous?: Pick<PdfMaterialDraft, "selectedPage" | "selectedTool">
  ) => PdfMaterialDraft;
  formatMaterialError: (error: unknown) => string;
}

/**
 * intakeFeedback subset — assignPdfMaterialClassDate 가 쓰는 narrow shape.
 * main.ts 의 IntakeFeedback 와 구조 호환 (href / retrySubjectId 없음).
 */
export type ClassDateFeedback = {
  kind: "success" | "error";
  title: string;
  detail: string;
};

// ─── 1) Pure helpers (state-free) ────────────────────────────────────────

/**
 * subject + classDate slug 기반 weekId factory. slug 가 비면 timestamp.
 */
export function createClassDateWeekId(subjectId: string, classDate: string): string {
  const slug = classDate
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `week-${subjectId}-${slug || Date.now().toString(36)}-${Date.now().toString(36)}`;
}

/**
 * UI 입력 trim. 빈 문자열 → PDF_MATERIAL_UNASSIGNED_CLASS_DATE sentinel.
 */
export function normalizePdfMaterialClassDateValue(value: string): string {
  const trimmed = value.trim();

  return trimmed || PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
}

// ─── 2) Workspace material partial mutators ─────────────────────────────

/**
 * subject workspace 안에서 materialId 일치하는 material 의 partial patch.
 * material (active) + materials[] 두 곳 모두 갱신.
 */
export function patchPdfWorkspaceMaterial(
  subjectId: string,
  materialId: string,
  patch: Partial<PdfMaterialDraft>,
  callbacks: Pick<ClassDateCallbacks, "updatePdfWorkspace">,
  helpers: Pick<ClassDateDomainHelpers, "getPdfMaterialKey" | "getPdfWorkspaceMaterials">
): void {
  callbacks.updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    material:
      workspace.material && helpers.getPdfMaterialKey(workspace.material) === materialId
        ? { ...workspace.material, ...patch }
        : workspace.material,
    materials: helpers.getPdfWorkspaceMaterials(workspace).map((item) =>
      helpers.getPdfMaterialKey(item) === materialId ? { ...item, ...patch } : item
    )
  }));
}

/**
 * patchPdfWorkspaceMaterial 의 full-replace 형. nextMaterial 전체를 덮어쓴다.
 */
export function replacePdfWorkspaceMaterial(
  subjectId: string,
  materialId: string,
  nextMaterial: PdfMaterialDraft,
  callbacks: Pick<ClassDateCallbacks, "updatePdfWorkspace">,
  helpers: Pick<ClassDateDomainHelpers, "getPdfMaterialKey" | "getPdfWorkspaceMaterials">
): void {
  callbacks.updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    material:
      workspace.material && helpers.getPdfMaterialKey(workspace.material) === materialId
        ? { ...workspace.material, ...nextMaterial }
        : workspace.material,
    materials: helpers.getPdfWorkspaceMaterials(workspace).map((item) =>
      helpers.getPdfMaterialKey(item) === materialId ? { ...item, ...nextMaterial } : item
    )
  }));
}

// ─── 3) classDate 전체 assign saga (BE sync + rollback) ─────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * material 의 classDate 변경 saga. 5 step:
 *   1. normalize sentinel + subject/material 존재 + weekNotes label 검증.
 *   2. optimistic UI patch (FE-local).
 *   3. backendMaterialId 없으면 local-only feedback 후 종료.
 *   4. BE PATCH (sentinel/non-ISO → wire sentinel 변환).
 *   5. on success — replace with BE result (FE-local sentinel 보존).
 *      on error — rollback + error feedback.
 */
export async function assignPdfMaterialClassDate(
  subjectId: string,
  materialId: string,
  classDate: string,
  context: ClassDateContext,
  callbacks: ClassDateCallbacks,
  helpers: ClassDateDomainHelpers
): Promise<void> {
  const subject = context.getSubject(subjectId);
  const material = context
    .getSubjectMaterials(subjectId)
    .find((item) => helpers.getPdfMaterialKey(item) === materialId);
  const nextClassDate = normalizePdfMaterialClassDateValue(classDate);

  if (!subject || !material) {
    callbacks.setFeedback({
      kind: "error",
      title: "PDF 자료를 찾을 수 없습니다.",
      detail: "자료 목록을 새로고침한 뒤 다시 시도하세요."
    });
    callbacks.renderApp();
    return;
  }

  if (
    nextClassDate !== PDF_MATERIAL_UNASSIGNED_CLASS_DATE &&
    !subject.weekNotes.some((week) => week.label === nextClassDate)
  ) {
    callbacks.setFeedback({
      kind: "error",
      title: "없는 수업일입니다.",
      detail: "먼저 수업일을 추가한 뒤 PDF를 연결하세요."
    });
    callbacks.renderApp();
    return;
  }

  const previousClassDate = material.classDate;
  patchPdfWorkspaceMaterial(
    subjectId,
    materialId,
    {
      classDate: nextClassDate,
      updatedAt: new Date().toISOString()
    },
    callbacks,
    helpers
  );
  callbacks.setFeedback({
    kind: "success",
    title: "PDF 수업일을 저장하는 중입니다.",
    detail:
      nextClassDate === PDF_MATERIAL_UNASSIGNED_CLASS_DATE
        ? `${material.fileName}의 수업일을 미지정으로 바꿉니다.`
        : `${material.fileName}을 ${nextClassDate} 수업에 연결합니다.`
  });
  callbacks.renderApp();

  if (!material.backendMaterialId) {
    callbacks.setFeedback({
      kind: "success",
      title: "로컬 PDF 수업일을 변경했습니다.",
      detail: "backend에 저장되지 않은 로컬 자료라 현재 브라우저에만 반영됩니다."
    });
    callbacks.renderApp();
    return;
  }

  // PR #51 codex R5+ P1×2 — BE 가 strict ISO 강제. UI 가 sentinel 또는
  // legacy week.label (예: "5월 14일(목)") 보낼 수 있음.
  // - sentinel "metadata-pending" → wire sentinel '1970-01-01' (FE-local 은
  //   sentinel 유지).
  // - 비-ISO legacy label → wire sentinel '1970-01-01' (BE strict reject 회피
  //   + FE 가 unconfirmed 로 표시).
  // - 정상 ISO → 그대로.
  const isSentinel = nextClassDate === PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
  const isWireSentinel = nextClassDate === PDF_MATERIAL_UNASSIGNED_WIRE_DATE;
  const isIso = ISO_DATE.test(nextClassDate);
  const wireClassDate =
    isSentinel || isWireSentinel || !isIso
      ? PDF_MATERIAL_UNASSIGNED_WIRE_DATE
      : nextClassDate;

  try {
    const updated = await callbacks.updatePdfMaterialMetadata(
      context.apiBaseUrl,
      material.backendMaterialId,
      { classDate: wireClassDate }
    );
    const updatedDraft = helpers.createPdfMaterialFromBackend(updated, {
      selectedPage: material.selectedPage,
      selectedTool: material.selectedTool
    });
    // PR #51 codex R3/R5 P2 — UI sentinel 선택 OR legacy non-ISO label 이면
    // BE 가 epoch sentinel 저장하더라도 FE-local 표시는 sentinel 유지.
    if (
      isSentinel ||
      isWireSentinel ||
      !isIso ||
      updated.classDate === PDF_MATERIAL_UNASSIGNED_WIRE_DATE
    ) {
      updatedDraft.classDate = PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
    }
    replacePdfWorkspaceMaterial(subjectId, materialId, updatedDraft, callbacks, helpers);
    callbacks.setFeedback({
      kind: "success",
      title: "PDF 수업일을 저장했습니다.",
      detail:
        nextClassDate === PDF_MATERIAL_UNASSIGNED_CLASS_DATE
          ? `${updated.fileName}은 아직 수업일 미지정 상태입니다.`
          : `${updated.fileName} → ${nextClassDate} 수업으로 연결했습니다.`
    });
  } catch (error) {
    patchPdfWorkspaceMaterial(
      subjectId,
      materialId,
      {
        classDate: previousClassDate,
        updatedAt: material.updatedAt
      },
      callbacks,
      helpers
    );
    callbacks.setFeedback({
      kind: "error",
      title: "PDF 수업일을 저장하지 못했습니다.",
      detail: helpers.formatMaterialError(error)
    });
  }

  callbacks.renderApp();
}
