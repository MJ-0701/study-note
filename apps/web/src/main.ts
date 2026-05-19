import morphdom from "morphdom";
import { sampleLectureNote } from "./data/sampleLectureNote";
import { localIntakeGuide } from "./data/intakeGuide";
import { classSchedule, scheduleRangeLabel } from "./data/classSchedule";
import {
  MaterialApiError,
  createMaterialUploadIntent,
  fetchPdfMaterialFile,
  listPdfMaterials,
  uploadMaterialFile,
  type MaterialUploadIntent,
  type PdfMaterialRecord
} from "./api/materials";
import {
  getConceptById,
  getIntegrityWarnings,
  getKeywordById,
  getNotebookCoverage,
  getQuestionById,
  getSourceById,
  getSubjectCoverage,
  type Concept,
  type ExampleQuestion,
  type RequiredKeyword,
  type SourceMaterial,
  type StudyNotebook,
  type SubjectNote,
  type WeekNote
} from "@study-note/domain";
import {
  applyWeekNoteImport,
  sanitizeWeekNoteImportPayload,
  validateWeekNoteImportPayload
} from "@study-note/domain";
import {
  addChecklistItem,
  createChecklist,
  createInkStroke,
  createPdfMaterialFromBackend,
  createStickyNote,
  createTextBox,
  deleteChecklist,
  deleteChecklistItem,
  deleteTextBox,
  estimatePdfPageCount,
  formatPdfFileSize,
  getSubjectPdfWorkspace,
  hydrateSubjectPdfWorkspace,
  moveChecklist,
  moveTextBox,
  normalizePdfPoint,
  pdfWorkspaceStorageKey,
  setEraserShape,
  setEraserSize,
  toggleChecklistCollapsed,
  toggleChecklistItem,
  updateChecklistItemLabel,
  updateTextBoxContent,
  type PdfChecklist,
  type PdfInkPoint,
  type PdfInkStroke,
  type PdfTextBox,
  type PdfWorkspaceStore,
  type PdfWorkspaceTool,
  type StickyNoteBlockKind,
  type SubjectPdfWorkspace
} from "@study-note/domain";
import "./styles.css";

type Route =
  | { name: "home" }
  | { name: "intake" }
  | { name: "pdf-workspaces" }
  | { name: "subject"; subjectId: string }
  | { name: "subject-intake"; subjectId: string }
  | { name: "pdf-workspace"; subjectId: string }
  | { name: "week"; subjectId: string; weekId: string };

type IntakeFeedback =
  | {
      kind: "success" | "error";
      title: string;
      detail: string;
      href?: string;
      retrySubjectId?: string;
    }
  | undefined;

interface QuickNoteSection {
  heading: string;
  body: string[];
}

interface QuickNote {
  origin: "subject" | "week" | "keyword";
  subjectId: string;
  title: string;
  subtitle: string;
  status: "ready" | "needs-fill";
  sections: QuickNoteSection[];
  primaryHref?: string;
  primaryLabel?: string;
}

// slice-2: AuthSession now mirrors the /v1/auth/me response shape.
// token is no longer stored in JS (F2 — httpOnly cookie only).
interface AuthSession {
  user: {
    id: string;
    displayName: string;
    studentNumber: string;
    role: string;
    email?: string;
  };
}

type AuthBootState = "checking" | "ready";

type AuthMode = "login" | "signup";

type LoginFeedback =
  | {
      kind: "error" | "success";
      title: string;
      detail: string;
    }
  | undefined;

const notebookStorageKey = "study-note.notebook.v2";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
let notebook = loadStoredNotebook();
let pdfWorkspaceStore = loadPdfWorkspaceStore();
// sprint-11/slice-1: inspector toggle state (localStorage persistence §9.4).
// Default = false (접힘). Restored from localStorage on page load.
let inspectorOpen = readInspectorOpen();
// slice-2: auth state is in-memory only (F2 — no localStorage for session).
// Rehydrated on app boot via GET /v1/auth/me with cookie.
let authSession: AuthSession | undefined;
let authBootState: AuthBootState = "checking";
// slice-3 (sign-up UX): current auth form tab ("login" | "signup").
let authMode: AuthMode = "login";
const activePdfObjectUrls = new Map<string, string>();
const activePdfObjectUrlMaterialIds = new Map<string, string>();
const activePdfPreviewLoads = new Set<string>();
const failedPdfPreviewLoadKeys = new Set<string>();
let activeInkStroke: ActiveInkStroke | undefined;
// sprint-11/slice-2-refine R10-c: tracks an in-progress eraser drag (pointerdown → pointerup).
// Analogous to activeInkStroke for pen mode. Cleared on pointerup / pointercancel.
let activeEraserDrag: {
  subjectId: string;
  pointerId: number;
  pageNumber: number;
  dragPath: EraserDragPoint[];
} | undefined;
// sprint-12/slice-4-refine: RAF throttle for eraser drag render.
// renderApp = full innerHTML replace → 매 pointermove 마다 호출 시 PDF stage 점멸.
// drag 중 = scheduleEraserRender() 로 60fps cap, pointerup = 즉시 renderApp.
let eraserRenderScheduled = false;
// sprint-12/slice-2: tracks an in-progress textbox drag (header pointerdown → pointerup).
let activeTextBoxDrag: {
  subjectId: string;
  textBoxId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startNormX: number;
  startNormY: number;
} | undefined;
// sprint-12/slice-3: tracks an in-progress checklist drag (header pointerdown → pointerup).
let activeChecklistDrag: {
  subjectId: string;
  checklistId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startNormX: number;
  startNormY: number;
} | undefined;
// sprint-12/slice-6: tracks an in-progress sticky note drag (header pointerdown → pointerup).
// Mirrors textbox/checklist drag — pointermove = DOM 직접 갱신, pointerup = store + renderApp.
let activeStickyDrag: {
  subjectId: string;
  noteId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startNormX: number;
  startNormY: number;
} | undefined;
let intakeFeedback: IntakeFeedback;
let loginFeedback: LoginFeedback;
// slice-2: stash last pending upload for retry CTA
let pendingPdfRetry: { file: File; subjectId: string; intent: MaterialUploadIntent } | undefined;
let quickNote: QuickNote | undefined;
const app = document.querySelector<HTMLDivElement>("#app");

interface ActiveInkStroke {
  subjectId: string;
  pointerId: number;
  pageNumber: number;
  points: PdfInkPoint[];
  livePolyline: SVGPolylineElement;
}

if (!app) {
  throw new Error("App mount target #app is missing");
}

const appRoot = app;

// sprint-12/slice-7: morphdom DOM diff 도입.
// 이전 = appRoot.innerHTML = html 매 호출 시 전체 DOM teardown + rebuild → PDF iframe
// 재생성 → blob URL 재로드 → 점멸. morphdom = element-level diff, iframe element 의
// src attribute 가 동일하면 setAttribute 호출 X → iframe reload 0 = 점멸 해결.
function renderInto(html: string): void {
  // morphdom 가 wrapper element 의 children 만 diff 적용.
  const wrapper = document.createElement("div");
  wrapper.id = appRoot.id;
  wrapper.innerHTML = html;
  morphdom(appRoot, wrapper, { childrenOnly: true });
}

document.addEventListener("change", handleDocumentChange);
document.addEventListener("click", handleDocumentClick);
document.addEventListener("input", handleDocumentInput);
document.addEventListener("submit", handleDocumentSubmit);
document.addEventListener("pointerdown", handleDocumentPointerDown);
document.addEventListener("pointermove", handleDocumentPointerMove);
document.addEventListener("pointerup", handleDocumentPointerUp);
document.addEventListener("pointercancel", handleDocumentPointerUp);
window.addEventListener("hashchange", renderApp);
renderApp();

// slice-2: always rehydrate from server — cookie carries the session token.
void revalidateStoredSession();

// sprint-11/slice-1 §9.4: localStorage helper — hard signature per plan.
// Only reads/writes key "studyNote.pdfWorkspace.inspectorOpen".
// Invalid / null / non-true JSON → false (fail-closed, AC9-b).
function readInspectorOpen(): boolean {
  try {
    const raw = localStorage.getItem("studyNote.pdfWorkspace.inspectorOpen");
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch { return false; }
}
function writeInspectorOpen(value: boolean): void {
  try {
    localStorage.setItem("studyNote.pdfWorkspace.inspectorOpen", JSON.stringify(value === true));
  } catch { /* QuotaExceededError 등 → UI 만 영향 */ }
}

function loadStoredNotebook(): StudyNotebook {
  const stored = window.localStorage.getItem(notebookStorageKey);

  if (!stored) {
    return sampleLectureNote;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StudyNotebook>;

    if (
      typeof parsed.id === "string" &&
      Array.isArray(parsed.subjects) &&
      hasCurrentSubjectSet(parsed)
    ) {
      return parsed as StudyNotebook;
    }

    window.localStorage.removeItem(notebookStorageKey);
  } catch {
    window.localStorage.removeItem(notebookStorageKey);
  }

  return sampleLectureNote;
}

function hasCurrentSubjectSet(candidate: Partial<StudyNotebook>): boolean {
  const expectedIds = sampleLectureNote.subjects.map((subject) => subject.id).sort();
  const candidateIds = candidate.subjects
    ?.map((subject) => subject.id)
    .filter((id): id is string => typeof id === "string")
    .sort();

  return (
    candidateIds?.length === expectedIds.length &&
    candidateIds.every((id, index) => id === expectedIds[index])
  );
}

function saveNotebook(nextNotebook: StudyNotebook): void {
  window.localStorage.setItem(notebookStorageKey, JSON.stringify(nextNotebook));
}

// slice-2: loadAuthSession / saveAuthSession removed (F2 — localStorage auth forbidden).
// Session is cookie-based; in-memory authSession is rehydrated via /v1/auth/me on boot.

function clearAuthSession(): void {
  authSession = undefined;
  revokeAllPdfObjectUrls();
}

function setActivePdfObjectUrl(
  subjectId: string,
  materialId: string,
  objectUrl: string
): void {
  clearActivePdfObjectUrl(subjectId);

  activePdfObjectUrls.set(subjectId, objectUrl);
  activePdfObjectUrlMaterialIds.set(subjectId, materialId);
  failedPdfPreviewLoadKeys.delete(`${subjectId}:${materialId}`);
}

function clearActivePdfObjectUrl(subjectId: string): void {
  const previousUrl = activePdfObjectUrls.get(subjectId);

  if (previousUrl) {
    URL.revokeObjectURL(previousUrl);
  }

  activePdfObjectUrls.delete(subjectId);
  activePdfObjectUrlMaterialIds.delete(subjectId);
}

function revokeAllPdfObjectUrls(): void {
  activePdfObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  activePdfObjectUrls.clear();
  activePdfObjectUrlMaterialIds.clear();
  activePdfPreviewLoads.clear();
  failedPdfPreviewLoadKeys.clear();
}

async function revalidateStoredSession(): Promise<void> {
  try {
    // slice-2: cookie-based session rehydration — credentials:include sends the
    // httpOnly study_note_session cookie. No localStorage fallback (F2).
    const response = await fetch(`${apiBaseUrl}/v1/auth/me`, {
      credentials: "include"
    });

    if (!response.ok) {
      // 401 = no valid cookie; 503 = auth disabled. Either way: not signed in.
      authBootState = "ready";
      renderApp();
      return;
    }

    const payload = (await response.json()) as unknown;

    if (!isAuthMeResponse(payload)) {
      authBootState = "ready";
      renderApp();
      return;
    }

    authSession = meResponseToSession(payload);
    await restoreUploadedPdfMaterialsForSession(authSession);
    loginFeedback = undefined;
  } catch {
    // Network error — treat as not signed in (don't show error on cold load)
    authSession = undefined;
  } finally {
    authBootState = "ready";
    renderApp();
  }
}

// slice-2: /v1/auth/me response shape — {userId, studentNumber, name, role}
interface AuthMeResponse {
  userId: string;
  studentNumber: string;
  name: string;
  role: string;
}

function isAuthMeResponse(value: unknown): value is AuthMeResponse {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<AuthMeResponse>;
  return (
    typeof c.userId === "string" &&
    typeof c.studentNumber === "string" &&
    typeof c.name === "string" &&
    typeof c.role === "string"
  );
}

function meResponseToSession(resp: AuthMeResponse): AuthSession {
  return {
    user: {
      id: resp.userId,
      displayName: resp.name,
      studentNumber: resp.studentNumber,
      role: resp.role
    }
  };
}

// sign-in response shape — same as /me but returned on POST sign-in
interface AuthSignInResponse {
  userId: string;
  studentNumber: string;
  name: string;
  role: string;
}

function isAuthSignInResponse(value: unknown): value is AuthSignInResponse {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<AuthSignInResponse>;
  return (
    typeof c.userId === "string" &&
    typeof c.studentNumber === "string" &&
    typeof c.name === "string" &&
    typeof c.role === "string"
  );
}

function loadPdfWorkspaceStore(): PdfWorkspaceStore {
  const stored = window.localStorage.getItem(pdfWorkspaceStorageKey);

  if (!stored) {
    return { workspaces: {} };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<PdfWorkspaceStore>;

    if (parsed.workspaces && typeof parsed.workspaces === "object") {
      // sprint-12/slice-2: hydrate each workspace through fail-closed helper.
      // corrupt entries (invalid textBoxes/checklists) are dropped per-item.
      // sticky/ink BC: pass-through (array保証のみ).
      const raw = parsed.workspaces as Record<string, unknown>;
      const workspaces: PdfWorkspaceStore["workspaces"] = {};

      for (const [id, entry] of Object.entries(raw)) {
        workspaces[id] = hydrateSubjectPdfWorkspace(entry);
      }

      return { workspaces };
    }
  } catch {
    window.localStorage.removeItem(pdfWorkspaceStorageKey);
  }

  return { workspaces: {} };
}

function savePdfWorkspaceStore(): void {
  window.localStorage.setItem(
    pdfWorkspaceStorageKey,
    JSON.stringify(pdfWorkspaceStore)
  );
}

function updatePdfWorkspace(
  subjectId: string,
  updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
): void {
  const current = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const updated = {
    ...updater(current),
    updatedAt: new Date().toISOString()
  };

  pdfWorkspaceStore = {
    workspaces: {
      ...pdfWorkspaceStore.workspaces,
      [subjectId]: updated
    }
  };
  savePdfWorkspaceStore();
}

function handleDocumentChange(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.action === "import-pdf-material") {
    const file = target.files?.[0];
    const subjectId = target.dataset.subjectId;

    if (file && subjectId) {
      void importPdfMaterialFile(file, subjectId);
    }

    target.value = "";
    return;
  }

  if (target.dataset.action === "select-pdf-page") {
    const subjectId = target.dataset.subjectId;
    const pageNumber = Number(target.value);

    if (subjectId && Number.isInteger(pageNumber)) {
      setPdfPage(subjectId, pageNumber);
      renderApp();
    }

    return;
  }

  if (target.dataset.action === "set-eraser-size") {
    const subjectId = target.dataset.subjectId;

    if (subjectId) {
      applySetEraserSize(subjectId, Number(target.value));
      renderApp();
    }

    return;
  }

  // sprint-12/slice-3: checklist item checkbox toggle
  if (target.dataset.action === "toggle-checklist-item") {
    const subjectId = target.dataset.subjectId;
    const checklistId = target.dataset.checklistId;
    const itemId = target.dataset.itemId;

    if (subjectId && checklistId && itemId) {
      applyToggleChecklistItem(subjectId, checklistId, itemId);
      // renderApp safe here: discrete toggle, no in-flight input focus to lose.
      renderApp();
    }

    return;
  }

  if (target.dataset.action !== "import-week-note") {
    return;
  }

  const file = target.files?.[0];
  const expectedSubjectId = target.dataset.subjectId;

  if (!file || !expectedSubjectId) {
    return;
  }

  void importWeekNoteFile(file, expectedSubjectId);
  target.value = "";
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const quickNoteButton = target.closest<HTMLButtonElement>("[data-action]");

  // slice-3: auth tab switch — clears fields (re-render rebuilds inputs) + feedback.
  if (quickNoteButton?.dataset.action === "auth-tab-login") {
    authMode = "login";
    loginFeedback = undefined;
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "auth-tab-signup") {
    authMode = "signup";
    loginFeedback = undefined;
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "logout") {
    // slice-2: call sign-out API to clear cookie; fire-and-forget (idempotent)
    void fetch(`${apiBaseUrl}/v1/auth/sign-out`, {
      method: "POST",
      credentials: "include"
    });
    clearAuthSession();
    authMode = "login";
    loginFeedback = {
      kind: "success",
      title: "로그아웃했습니다.",
      detail: "다시 학습공간에 들어가려면 로그인하세요."
    };
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "clear-quick-note") {
    quickNote = undefined;
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "generate-subject-note") {
    const subject = getSubjectFromDataset(quickNoteButton);

    if (subject) {
      quickNote = buildSubjectQuickNote(subject);
      renderApp();
      scrollToQuickNote();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "generate-keyword-note") {
    const subject = getSubjectFromDataset(quickNoteButton);
    const keyword = subject
      ? getKeywordById(subject, quickNoteButton.dataset.keywordId ?? "")
      : undefined;

    if (subject && keyword) {
      quickNote = buildKeywordQuickNote(subject, keyword);
      renderApp();
      scrollToQuickNote();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "generate-week-note") {
    const subject = getSubjectFromDataset(quickNoteButton);
    const week = subject
      ? subject.weekNotes.find((item) => item.id === quickNoteButton.dataset.weekId)
      : undefined;

    if (subject && week) {
      quickNote = buildWeekQuickNote(subject, week);
      renderApp();
      scrollToQuickNote();
    }

    return;
  }

  // sprint-11/slice-1 R1/R2: toggle inspector open/close + localStorage persistence.
  if (quickNoteButton?.dataset.action === "toggle-pdf-inspector") {
    inspectorOpen = !inspectorOpen;
    writeInspectorOpen(inspectorOpen);
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "set-pdf-tool") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tool = quickNoteButton.dataset.tool as LocalPdfTool | undefined;

    if (subjectId && isPdfWorkspaceTool(tool)) {
      setPdfTool(subjectId, tool);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "set-eraser-shape") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const shape = quickNoteButton.dataset.eraserShape as EraserShape | undefined;

    if (subjectId && isEraserShape(shape)) {
      applySetEraserShape(subjectId, shape);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "pdf-prev-page") {
    const subjectId = quickNoteButton.dataset.subjectId;

    if (subjectId) {
      movePdfPage(subjectId, -1);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "pdf-next-page") {
    const subjectId = quickNoteButton.dataset.subjectId;

    if (subjectId) {
      movePdfPage(subjectId, 1);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "add-sticky-note") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const kind = quickNoteButton.dataset.blockKind as StickyNoteBlockKind | undefined;

    if (subjectId && isStickyNoteBlockKind(kind)) {
      addStickyNote(subjectId, kind);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "delete-sticky-note") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const noteId = quickNoteButton.dataset.noteId;

    if (subjectId && noteId) {
      deleteStickyNote(subjectId, noteId);
      renderApp();
    }

    return;
  }

  // sprint-12/slice-2: textbox delete button
  if (quickNoteButton?.dataset.action === "delete-textbox") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const textBoxId = quickNoteButton.dataset.textboxId;

    if (subjectId && textBoxId) {
      removeTextBox(subjectId, textBoxId);
      renderApp();
    }

    return;
  }

  // sprint-12/slice-3: checklist delete (entire checklist)
  if (quickNoteButton?.dataset.action === "delete-checklist") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const checklistId = quickNoteButton.dataset.checklistId;

    if (subjectId && checklistId) {
      removeChecklist(subjectId, checklistId);
      renderApp();
    }

    return;
  }

  // sprint-12/slice-3-refine R11: toggle collapse/expand state (mode-agnostic)
  if (quickNoteButton?.dataset.action === "toggle-checklist-collapsed") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const checklistId = quickNoteButton.dataset.checklistId;

    if (subjectId && checklistId) {
      updatePdfWorkspace(subjectId, (workspace) => ({
        ...workspace,
        checklists: workspace.checklists.map((cl) =>
          cl.id === checklistId ? toggleChecklistCollapsed(cl) : cl
        )
      }));
      renderApp();
    }

    return;
  }

  // sprint-12/slice-3: add item to checklist
  if (quickNoteButton?.dataset.action === "add-checklist-item") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const checklistId = quickNoteButton.dataset.checklistId;

    if (subjectId && checklistId) {
      addItemToChecklist(subjectId, checklistId);
      renderApp();
    }

    return;
  }

  // sprint-12/slice-3: delete a single checklist item
  if (quickNoteButton?.dataset.action === "delete-checklist-item") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const checklistId = quickNoteButton.dataset.checklistId;
    const itemId = quickNoteButton.dataset.itemId;

    if (subjectId && checklistId && itemId) {
      removeChecklistItem(subjectId, checklistId, itemId);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "clear-pdf-annotations") {
    const subjectId = quickNoteButton.dataset.subjectId;

    if (subjectId) {
      clearPdfAnnotations(subjectId);
      renderApp();
    }

    return;
  }

  // slice-2: retry PDF upload after S3 PUT / completion failure
  if (quickNoteButton?.dataset.action === "retry-pdf-upload") {
    const subjectId = quickNoteButton.dataset.subjectId;

    if (!subjectId || !pendingPdfRetry || pendingPdfRetry.subjectId !== subjectId) {
      return;
    }

    const { file, intent } = pendingPdfRetry;
    const intentExpiry = new Date(intent.upload.expiresAt).getTime();
    const now = Date.now();

    if (now < intentExpiry) {
      // Intent still valid — retry from S3 PUT step (skip re-creating intent)
      intakeFeedback = {
        kind: "success",
        title: "업로드를 재시도합니다.",
        detail: "S3 PUT 단계부터 다시 시도합니다."
      };
      renderApp();

      void (async () => {
        try {
          const uploadedMaterial = await uploadMaterialFile(apiBaseUrl, intent, file);
          pendingPdfRetry = undefined;
          updatePdfWorkspace(subjectId, (workspace) => ({
            ...workspace,
            material: createPdfMaterialFromBackend(uploadedMaterial, workspace.material)
          }));
          await loadPdfPreviewFromBackend(subjectId, uploadedMaterial, { force: true, silent: true });
          intakeFeedback = {
            kind: "success",
            title: "PDF를 backend에 저장했습니다.",
            detail: `${uploadedMaterial.fileName} · ${formatPdfFileSize(uploadedMaterial.fileSize)} · 재시도 성공`
          };
        } catch (retryError) {
          intakeFeedback = {
            kind: "error",
            title: "재시도 중에도 업로드를 완료하지 못했습니다.",
            detail: formatMaterialError(retryError),
            retrySubjectId: subjectId
          };
        }
        renderApp();
      })();
    } else {
      // Intent expired — restart from full import flow
      void importPdfMaterialFile(file, subjectId);
    }

    return;
  }

  const resetButton = target.closest<HTMLButtonElement>("[data-action='reset-local-data']");

  if (!resetButton) {
    return;
  }

  window.localStorage.removeItem(notebookStorageKey);
  notebook = sampleLectureNote;
  intakeFeedback = {
    kind: "success",
    title: "로컬 import 데이터를 초기화했습니다.",
    detail: "샘플 fixture 기준으로 다시 렌더링합니다."
  };
  renderApp();
}

async function handleDocumentSubmit(event: SubmitEvent): Promise<void> {
  const target = event.target;

  if (!(target instanceof HTMLFormElement)) {
    return;
  }

  const action = target.dataset.action;

  if (action !== "login" && action !== "signup") {
    return;
  }

  event.preventDefault();

  const formData = new FormData(target);
  const name = String(formData.get("name") ?? "").trim();
  const studentNumber = String(formData.get("studentNumber") ?? "").trim();

  if (!name || !studentNumber) {
    loginFeedback = {
      kind: "error",
      title: "이름과 학번을 입력하세요.",
      detail: action === "login"
        ? "시험 대비 자료는 로그인 후 볼 수 있습니다."
        : "이름과 학번을 모두 입력해야 가입할 수 있습니다."
    };
    renderApp();
    return;
  }

  if (action === "login") {
    try {
      // slice-2: migrated to /v1/auth/sign-in; credentials:include for cookie receipt.
      const response = await fetch(`${apiBaseUrl}/v1/auth/sign-in`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ name, studentNumber })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { errorCode?: string; errorMessage?: string };
        throw new Error(body.errorMessage ?? "이름 또는 학번이 올바르지 않습니다.");
      }

      const payload = (await response.json()) as unknown;

      if (!isAuthSignInResponse(payload)) {
        throw new Error("로그인 응답 형식이 올바르지 않습니다.");
      }

      const session = meResponseToSession(payload as AuthMeResponse);
      authSession = session;
      authBootState = "ready";
      // F2: no localStorage — session lives in httpOnly cookie + in-memory only
      await restoreUploadedPdfMaterialsForSession(session);
      loginFeedback = undefined;
      renderApp();
    } catch (error) {
      loginFeedback = {
        kind: "error",
        title: "로그인하지 못했습니다.",
        detail:
          error instanceof Error
            ? error.message
            : "백엔드 서버 상태와 계정을 확인하세요."
      };
      renderApp();
    }
    return;
  }

  // action === "signup"
  // slice-3: sign-up from lecture-reader home. On success, re-call /me to populate
  // full session (including PDF restore) via revalidateStoredSession().
  try {
    const response = await fetch(`${apiBaseUrl}/v1/auth/sign-up`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ name, studentNumber })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { errorCode?: string; errorMessage?: string };
      throw new Error(body.errorMessage ?? `가입에 실패했습니다. (${String(response.status)})`);
    }

    // Server sets cookie on 200. Re-validate via /me to populate session + PDF restore.
    loginFeedback = undefined;
    authMode = "login";
    await revalidateStoredSession();
  } catch (error) {
    loginFeedback = {
      kind: "error",
      title: "회원가입에 실패했습니다.",
      detail:
        error instanceof Error
          ? error.message
          : "백엔드 서버 상태를 확인하세요."
    };
    renderApp();
  }
}

function handleDocumentInput(event: Event): void {
  const target = event.target;

  // sprint-12/slice-3: broaden guard to accept HTMLInputElement as well
  // (checklist item label = <input type="text">; textBox/sticky = <textarea>).
  if (!(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.action === "set-eraser-size") {
    const subjectId = target.dataset.subjectId;

    if (subjectId) {
      applySetEraserSize(subjectId, Number(target.value));
      renderApp();
    }

    return;
  }

  if (target.dataset.action === "update-sticky-note") {
    const subjectId = target.dataset.subjectId;
    const noteId = target.dataset.noteId;

    if (!subjectId || !noteId) {
      return;
    }

    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      stickyNotes: workspace.stickyNotes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              blocks: note.blocks.map((block, index) =>
                index === 0 ? { ...block, content: target.value } : block
              ),
              updatedAt: new Date().toISOString()
            }
          : note
      )
    }));

    return;
  }

  // sprint-12/slice-2: textbox content update (debounced 300ms)
  if (target.dataset.action === "update-textbox-content") {
    const subjectId = target.dataset.subjectId;
    const textBoxId = target.dataset.textboxId;

    if (subjectId && textBoxId) {
      // AC9-d: log action name + id only, no content
      scheduleTextBoxContentUpdate(subjectId, textBoxId, target.value);
    }

    return;
  }

  // sprint-12/slice-3: checklist item label update (debounced 300ms)
  // AC9-e: value set via DOM property, not innerHTML. No renderApp in debounced callback.
  // AC9-g: label not logged, not in data-*, not in title/aria-label.
  if (target.dataset.action === "update-checklist-item-label") {
    const subjectId = target.dataset.subjectId;
    const checklistId = target.dataset.checklistId;
    const itemId = target.dataset.itemId;

    if (subjectId && checklistId && itemId) {
      scheduleChecklistItemLabelUpdate(subjectId, checklistId, itemId, target.value);
    }
  }
}

function handleDocumentPointerDown(event: PointerEvent): void {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const surface = target.closest<HTMLElement>("[data-pdf-annotation-surface]");

  if (!surface) {
    return;
  }

  // sprint-12/slice-2: textbox drag — start drag state before other early-returns.
  // R10-refine: button 클릭 (delete) 은 drag 로 처리하지 않고 click handler 에 위임.
  // slice-7 redesign: textbox 가 article 자체 = drag handle. textarea/input click = focus
  // (edit) 이라 drag skip. button click 도 skip.
  const dragHandle = target.closest<HTMLElement>("[data-action='drag-textbox-handle']");

  if (dragHandle && !target.closest("button") && !target.closest("textarea") && !target.closest("input")) {
    const subjectIdForDrag = surface.dataset.subjectId;
    const textBoxIdForDrag = dragHandle.dataset.textboxId;

    if (subjectIdForDrag && textBoxIdForDrag) {
      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectIdForDrag);
      const tb = workspace.textBoxes.find((t) => t.id === textBoxIdForDrag);

      if (tb) {
        event.preventDefault();
        try {
          dragHandle.setPointerCapture(event.pointerId);
        } catch {
          // synthetic events may not support setPointerCapture
        }
        activeTextBoxDrag = {
          subjectId: subjectIdForDrag,
          textBoxId: textBoxIdForDrag,
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startNormX: tb.position.x,
          startNormY: tb.position.y
        };
      }
    }

    return;
  }

  // sprint-12/slice-6: sticky note header drag — same pattern as textbox drag.
  // button 클릭 (delete) 은 drag 로 처리하지 않고 click handler 에 위임.
  const stickyDragHandle = target.closest<HTMLElement>("[data-action='sticky-drag-handle']");

  if (stickyDragHandle && !target.closest("button")) {
    const subjectIdForDrag = surface.dataset.subjectId;
    const noteIdForDrag = stickyDragHandle.dataset.noteId;

    if (subjectIdForDrag && noteIdForDrag) {
      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectIdForDrag);
      const note = workspace.stickyNotes.find((n) => n.id === noteIdForDrag);

      if (note) {
        event.preventDefault();
        try {
          stickyDragHandle.setPointerCapture(event.pointerId);
        } catch {
          // synthetic events may not support setPointerCapture
        }
        activeStickyDrag = {
          subjectId: subjectIdForDrag,
          noteId: noteIdForDrag,
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startNormX: note.anchor.x,
          startNormY: note.anchor.y
        };
      }
    }

    return;
  }

  // sprint-12/slice-3: checklist header drag — same pattern as textbox drag.
  // R10-refine: button 클릭 (delete / toggle) 은 drag 로 처리하지 않고 click handler 에 위임.
  const checklistDragHandle = target.closest<HTMLElement>("[data-action='checklist-drag-handle']");

  if (checklistDragHandle && !target.closest("button")) {
    const subjectIdForDrag = surface.dataset.subjectId;
    const checklistIdForDrag = checklistDragHandle.dataset.checklistId;

    if (subjectIdForDrag && checklistIdForDrag) {
      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectIdForDrag);
      const cl = workspace.checklists.find((c) => c.id === checklistIdForDrag);

      if (cl) {
        event.preventDefault();
        try {
          checklistDragHandle.setPointerCapture(event.pointerId);
        } catch {
          // synthetic events may not support setPointerCapture
        }
        activeChecklistDrag = {
          subjectId: subjectIdForDrag,
          checklistId: checklistIdForDrag,
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startNormX: cl.position.x,
          startNormY: cl.position.y
        };
      }
    }

    return;
  }

  if (target.closest("a, button, input, label, textarea, .sticky-note, .pdf-textbox, .pdf-checklist")) {
    return;
  }

  const subjectId = surface.dataset.subjectId;

  if (!subjectId) {
    return;
  }

  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const material = workspace.material;

  if (!material) {
    return;
  }

  const point = getSurfacePoint(event, surface);

  if (material.selectedTool === "sticky") {
    addStickyNote(subjectId, "text", point);
    // sprint-12/slice-6: 1 click = 1 추가 후 tool mode = read 자동 복귀.
    // 의도 외 중복 추가 방지. 재추가 시 도구 재선택 필요.
    setPdfTool(subjectId, "read");
    renderApp();
    event.preventDefault();
    return;
  }

  // sprint-12/slice-2 R3: text tool — click-to-place a new textbox at the surface point.
  if (material.selectedTool === "text") {
    addTextBox(subjectId, point);
    setPdfTool(subjectId, "read");
    renderApp();
    event.preventDefault();
    return;
  }

  // sprint-12/slice-3: checklist tool — click-to-place a new checklist at the surface point.
  if ((material.selectedTool as LocalPdfTool) === "checklist") {
    addChecklistWidget(subjectId, point);
    setPdfTool(subjectId, "read");
    renderApp();
    event.preventDefault();
    return;
  }

  // sprint-11/slice-2-refine R10-b/c: eraser drag — px-accurate point erasure.
  // sprint-12/slice-4: shape/size-driven hit-test in pixel space.
  if ((material.selectedTool as LocalPdfTool) === "eraser") {
    const pageNumber = material.selectedPage;
    const eraserShape = workspace.eraserShape;
    const eraserSize = workspace.eraserSize;

    event.preventDefault();
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic smoke events do not always register as active browser pointers.
    }

    // R10-c: register eraser drag state before applying first erase.
    activeEraserDrag = {
      subjectId,
      pointerId: event.pointerId,
      pageNumber,
      dragPath: [point]
    };

    const rect = surface.getBoundingClientRect();
    applyEraserAtPoint(
      subjectId,
      pageNumber,
      eraserShape,
      point.x,
      point.y,
      eraserSize,
      rect.width,
      rect.height,
      activeEraserDrag.dragPath
    );
    // sprint-12/slice-4-refine: pointerdown = 즉시 1회 render (시각 피드백 시작 시점).
    renderApp();
    return;
  }

  if (material.selectedTool !== "pen") {
    return;
  }

  const liveLayer = surface.querySelector<SVGSVGElement>("[data-live-ink-layer]");

  if (!liveLayer) {
    return;
  }

  event.preventDefault();
  try {
    surface.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic smoke events do not always register as active browser pointers.
  }

  const livePolyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  livePolyline.setAttribute("class", "ink-stroke is-live");
  liveLayer.append(livePolyline);

  activeInkStroke = {
    subjectId,
    pointerId: event.pointerId,
    pageNumber: material.selectedPage,
    points: [toInkPoint(point, event)],
    livePolyline
  };
  updateLiveStroke();
}

function handleDocumentPointerMove(event: PointerEvent): void {
  // sprint-12/slice-2: textbox drag — move widget by normalized delta.
  if (activeTextBoxDrag && activeTextBoxDrag.pointerId === event.pointerId) {
    const { subjectId, textBoxId, startClientX, startClientY, startNormX, startNormY } = activeTextBoxDrag;
    const surface = document.querySelector<HTMLElement>(
      `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
    );

    if (surface) {
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      const dx = (event.clientX - startClientX) / rect.width;
      const dy = (event.clientY - startClientY) / rect.height;
      applyTextBoxMove(subjectId, textBoxId, { x: startNormX + dx, y: startNormY + dy });
      // re-render cheaply: update DOM position directly to avoid full renderApp on every move.
      const el = document.querySelector<HTMLElement>(`[data-textbox-id="${textBoxId}"]`);

      if (el) {
        const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
        const tb = workspace.textBoxes.find((t) => t.id === textBoxId);

        if (tb) {
          el.style.left = `${tb.position.x * 100}%`;
          el.style.top = `${tb.position.y * 100}%`;
        }
      }
    }

    return;
  }

  // sprint-12/slice-6: sticky note drag — same pattern as textbox drag.
  if (activeStickyDrag && activeStickyDrag.pointerId === event.pointerId) {
    const { subjectId, noteId, startClientX, startClientY, startNormX, startNormY } = activeStickyDrag;
    const surface = document.querySelector<HTMLElement>(
      `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
    );

    if (surface) {
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      const dx = (event.clientX - startClientX) / rect.width;
      const dy = (event.clientY - startClientY) / rect.height;
      applyStickyMove(subjectId, noteId, { x: startNormX + dx, y: startNormY + dy });
      // update DOM position directly to avoid full renderApp jank on every move.
      const el = document.querySelector<HTMLElement>(`[data-note-id="${noteId}"]`);

      if (el) {
        const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
        const note = workspace.stickyNotes.find((n) => n.id === noteId);

        if (note) {
          el.style.left = `${note.anchor.x * 100}%`;
          el.style.top = `${note.anchor.y * 100}%`;
        }
      }
    }

    return;
  }

  // sprint-12/slice-3: checklist drag — same pattern as textbox drag.
  if (activeChecklistDrag && activeChecklistDrag.pointerId === event.pointerId) {
    const { subjectId, checklistId, startClientX, startClientY, startNormX, startNormY } = activeChecklistDrag;
    const surface = document.querySelector<HTMLElement>(
      `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
    );

    if (surface) {
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      const dx = (event.clientX - startClientX) / rect.width;
      const dy = (event.clientY - startClientY) / rect.height;
      applyChecklistMove(subjectId, checklistId, { x: startNormX + dx, y: startNormY + dy });
      // update DOM position directly to avoid full renderApp jank on every move.
      const el = document.querySelector<HTMLElement>(`[data-checklist-id="${checklistId}"]`);

      if (el) {
        const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
        const cl = workspace.checklists.find((c) => c.id === checklistId);

        if (cl) {
          el.style.left = `${cl.position.x * 100}%`;
          el.style.top = `${cl.position.y * 100}%`;
        }
      }
    }

    return;
  }

  // R10-c: eraser drag — apply erase at each move position.
  if (activeEraserDrag && activeEraserDrag.pointerId === event.pointerId) {
    const { subjectId, pageNumber } = activeEraserDrag;

    const surface = document.querySelector<HTMLElement>(
      `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
    );

    if (surface) {
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      const point = getSurfacePoint(event, surface);
      activeEraserDrag.dragPath.push(point);

      if (activeEraserDrag.dragPath.length > ERASER_LINE_SEGMENT_CAP + 1) {
        activeEraserDrag.dragPath = activeEraserDrag.dragPath.slice(
          -(ERASER_LINE_SEGMENT_CAP + 1)
        );
      }

      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
      applyEraserAtPoint(
        subjectId,
        pageNumber,
        workspace.eraserShape,
        point.x,
        point.y,
        workspace.eraserSize,
        rect.width,
        rect.height,
        activeEraserDrag.dragPath
      );
      // sprint-12/slice-4-refine: drag 중 = RAF throttle. 매 pointermove 마다 renderApp 호출 X.
      scheduleEraserRender();
    }

    return;
  }

  if (!activeInkStroke || activeInkStroke.pointerId !== event.pointerId) {
    return;
  }

  const surface = document.querySelector<HTMLElement>(
    `[data-pdf-annotation-surface][data-subject-id="${activeInkStroke.subjectId}"]`
  );

  if (!surface) {
    return;
  }

  event.preventDefault();
  activeInkStroke.points.push(toInkPoint(getSurfacePoint(event, surface), event));
  updateLiveStroke();
}

function handleDocumentPointerUp(event: PointerEvent): void {
  // sprint-12/slice-2: clear textbox drag state on pointer release.
  if (activeTextBoxDrag && activeTextBoxDrag.pointerId === event.pointerId) {
    activeTextBoxDrag = undefined;
    renderApp(); // final re-render to settle position
    return;
  }

  // sprint-12/slice-3: clear checklist drag state on pointer release.
  if (activeChecklistDrag && activeChecklistDrag.pointerId === event.pointerId) {
    activeChecklistDrag = undefined;
    renderApp(); // final re-render to settle position
    return;
  }

  // sprint-12/slice-6: clear sticky note drag state on pointer release.
  if (activeStickyDrag && activeStickyDrag.pointerId === event.pointerId) {
    activeStickyDrag = undefined;
    renderApp(); // final re-render to settle position
    return;
  }

  // R10-c: clear eraser drag state on pointer release.
  if (activeEraserDrag && activeEraserDrag.pointerId === event.pointerId) {
    activeEraserDrag = undefined;
    // sprint-12/slice-4-refine: drag 종료 시 final renderApp 1회 = RAF 미완료분 sync.
    renderApp();
    return;
  }

  if (!activeInkStroke || activeInkStroke.pointerId !== event.pointerId) {
    return;
  }

  const { subjectId, pageNumber, points } = activeInkStroke;

  if (points.length > 1) {
    const stroke = createInkStroke(pageNumber, points);

    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      inkStrokes: [...workspace.inkStrokes, stroke]
    }));
  }

  activeInkStroke.livePolyline.remove();
  activeInkStroke = undefined;
  renderApp();
}

async function importPdfMaterialFile(file: File, subjectId: string): Promise<void> {
  const session = authSession;

  if (!session) {
    loginFeedback = {
      kind: "error",
      title: "로그인이 필요합니다.",
      detail: "PDF 업로드와 다운로드는 사용자 세션 확인 후 진행합니다."
    };
    renderApp();
    return;
  }

  if (file.type && file.type !== "application/pdf") {
    intakeFeedback = {
      kind: "error",
      title: "PDF 파일만 선택할 수 있습니다.",
      detail: `${file.name}의 파일 형식을 확인하세요.`
    };
    renderApp();
    return;
  }

  intakeFeedback = {
    kind: "success",
    title: "PDF 업로드를 시작했습니다.",
    detail: `${file.name}을 backend material storage로 보내는 중입니다.`
  };
  renderApp();

  try {
    const pageCount = estimatePdfPageCount(await file.arrayBuffer());
    const intent = await createMaterialUploadIntent(apiBaseUrl, {
      subjectId,
      classDate: getPdfMaterialClassDate(subjectId),
      fileName: file.name,
      fileSize: file.size,
      pageCount,
      contentType: "application/pdf"
    });

    // Stash intent for retry CTA (resume at S3 PUT step if intent still valid)
    pendingPdfRetry = { file, subjectId, intent };

    clearActivePdfObjectUrl(subjectId);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      material: createPdfMaterialFromBackend(intent.material, workspace.material)
    }));
    renderApp();

    // slice-2: new S3 direct PUT flow — intent → S3 PUT (with retry) → completion
    const uploadedMaterial = await uploadMaterialFile(apiBaseUrl, intent, file);

    // Upload success — clear retry state
    pendingPdfRetry = undefined;

    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      material: createPdfMaterialFromBackend(uploadedMaterial, workspace.material)
    }));

    await loadPdfPreviewFromBackend(subjectId, uploadedMaterial, {
      force: true,
      silent: true
    });

    intakeFeedback = {
      kind: "success",
      title: "PDF를 backend에 저장했습니다.",
      detail: `${uploadedMaterial.fileName} · ${formatPdfFileSize(uploadedMaterial.fileSize)} · ${uploadedMaterial.pageCount}페이지 추정 · 새로고침 후에도 복원됩니다.`
    };
  } catch (error) {
    if (handleMaterialAuthError(error)) {
      return;
    }

    intakeFeedback = {
      kind: "error",
      title: "PDF 업로드를 완료하지 못했습니다.",
      detail: formatMaterialError(error),
      retrySubjectId: subjectId
    };
  }

  renderApp();
}

async function restoreUploadedPdfMaterialsForSession(
  _session: AuthSession
): Promise<void> {
  try {
    const materials = await listPdfMaterials(apiBaseUrl);
    const latestBySubject = new Map<string, PdfMaterialRecord>();

    materials
      .filter((material) => material.uploadStatus === "uploaded")
      .forEach((material) => {
        if (!latestBySubject.has(material.subjectId)) {
          latestBySubject.set(material.subjectId, material);
        }
      });

    latestBySubject.forEach((material, subjectId) => {
      updatePdfWorkspace(subjectId, (workspace) => ({
        ...workspace,
        material: createPdfMaterialFromBackend(material, workspace.material)
      }));
    });
  } catch (error) {
    if (handleMaterialAuthError(error)) {
      return;
    }

    intakeFeedback = {
      kind: "error",
      title: "저장된 PDF 목록을 불러오지 못했습니다.",
      detail: formatMaterialError(error)
    };
  }
}

function ensurePdfPreviewForWorkspace(subjectId: string): void {
  const session = authSession;
  const material = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId).material;

  if (!session || material?.uploadStatus !== "uploaded" || !material.backendMaterialId) {
    return;
  }

  void loadPdfPreviewFromBackend(subjectId, material, {
    force: false,
    silent: false
  });
}

async function loadPdfPreviewFromBackend(
  subjectId: string,
  material: { backendMaterialId?: string; fileName: string },
  options: { force: boolean; silent: boolean }
): Promise<void> {
  const materialId = material.backendMaterialId;

  if (!materialId) {
    return;
  }

  const loadKey = `${subjectId}:${materialId}`;

  if (options.force) {
    failedPdfPreviewLoadKeys.delete(loadKey);
  }

  if (
    !options.force &&
    activePdfObjectUrlMaterialIds.get(subjectId) === materialId &&
    activePdfObjectUrls.has(subjectId)
  ) {
    return;
  }

  if (!options.force && failedPdfPreviewLoadKeys.has(loadKey)) {
    return;
  }

  if (activePdfPreviewLoads.has(loadKey)) {
    return;
  }

  activePdfPreviewLoads.add(loadKey);

  try {
    const blob = await fetchPdfMaterialFile(apiBaseUrl, materialId);
    setActivePdfObjectUrl(subjectId, materialId, URL.createObjectURL(blob));
  } catch (error) {
    if (handleMaterialAuthError(error)) {
      return;
    }

    failedPdfPreviewLoadKeys.add(loadKey);

    if (!options.silent) {
      intakeFeedback = {
        kind: "error",
        title: "저장된 PDF 미리보기를 불러오지 못했습니다.",
        detail: `${material.fileName}: ${formatMaterialError(error)}`
      };
    }
  } finally {
    activePdfPreviewLoads.delete(loadKey);
    renderApp();
  }
}

function getPdfMaterialClassDate(subjectId: string): string {
  const subject = notebook.subjects.find((item) => item.id === subjectId);

  return subject?.weekNotes[0]?.label ?? "subject-workspace";
}

function handleMaterialAuthError(error: unknown): boolean {
  if (!(error instanceof MaterialApiError) || error.status !== 401) {
    return false;
  }

  clearAuthSession();
  loginFeedback = {
    kind: "error",
    title: "세션이 만료되었습니다.",
    detail: "PDF 저장소 요청이 거부되었습니다. 이름과 학번으로 다시 로그인하세요."
  };
  renderApp();
  return true;
}

function formatMaterialError(error: unknown): string {
  if (error instanceof MaterialApiError) {
    return `${error.status} ${error.message}`;
  }

  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

function getSurfacePoint(event: PointerEvent, surface: HTMLElement): PdfInkPoint {
  const rect = surface.getBoundingClientRect();
  const point = normalizePdfPoint(
    (event.clientX - rect.left) / rect.width,
    (event.clientY - rect.top) / rect.height
  );

  return toInkPoint(point, event);
}

function toInkPoint(point: { x: number; y: number }, event: PointerEvent): PdfInkPoint {
  return {
    x: point.x,
    y: point.y,
    pressure: event.pressure > 0 ? Number(event.pressure.toFixed(3)) : undefined,
    t: Date.now()
  };
}

function updateLiveStroke(): void {
  if (!activeInkStroke) {
    return;
  }

  activeInkStroke.livePolyline.setAttribute(
    "points",
    activeInkStroke.points.map(formatSvgPoint).join(" ")
  );
}

// sprint-12/slice-2: domain PdfWorkspaceTool union now includes "eraser" | "text" | "checklist".
// LocalPdfTool is now an alias for the domain union (redundant "| eraser" dropped).
// sprint-13 reserved tools: "table" | "chart" (실 기능 분리 예정).
type LocalPdfTool = PdfWorkspaceTool;
type EraserShape = "circle" | "square" | "triangle" | "line";
type EraserDragPoint = { x: number; y: number };

const ERASER_LINE_SEGMENT_CAP = 50;

function isPdfWorkspaceTool(tool: string | undefined): tool is LocalPdfTool {
  return (
    tool === "read" ||
    tool === "sticky" ||
    tool === "pen" ||
    tool === "eraser" ||
    tool === "text" ||
    tool === "checklist"
  );
}

function isEraserShape(shape: string | undefined): shape is EraserShape {
  return (
    shape === "circle" ||
    shape === "square" ||
    shape === "triangle" ||
    shape === "line"
  );
}

interface PixelPoint {
  x: number;
  y: number;
}

interface PixelSegment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

interface PixelBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function eraseStrokePointsByShape(
  strokes: PdfInkStroke[],
  shape: EraserShape,
  cx: number,
  cy: number,
  size: number,
  surfaceWidth: number,
  surfaceHeight: number,
  dragPath?: readonly EraserDragPoint[]
): PdfInkStroke[] {
  const result: PdfInkStroke[] = [];
  const safeSize = Number.isFinite(size) ? Math.min(64, Math.max(16, size)) : 16;
  const halfSize = safeSize / 2;
  const cxPx = cx * surfaceWidth;
  const cyPx = cy * surfaceHeight;
  const circleR2 = halfSize * halfSize;
  const lineHit =
    shape === "line"
      ? buildLineHitState(dragPath, surfaceWidth, surfaceHeight, halfSize)
      : undefined;

  for (const stroke of strokes) {
    if (shape === "line") {
      if (!lineHit) {
        result.push(stroke);
        continue;
      }

      const strokeBbox = getStrokePixelBBox(stroke, surfaceWidth, surfaceHeight);

      if (!strokeBbox || !bboxIntersects(strokeBbox, lineHit.bbox)) {
        result.push(stroke);
        continue;
      }
    }

    // Fast path: check if ANY point is within radiusPx before splitting.
    let hasHit = false;

    for (const pt of stroke.points) {
      if (isPointHitByEraserShape(
        pt,
        shape,
        cxPx,
        cyPx,
        halfSize,
        circleR2,
        safeSize,
        surfaceWidth,
        surfaceHeight,
        lineHit?.segments
      )) {
        hasHit = true;
        break;
      }
    }

    if (!hasHit) {
      // No points in radius — return same reference (no mutation).
      result.push(stroke);
      continue;
    }

    // Split: collect surviving-point segments. Each gap (erased point) ends
    // the current segment and starts a new one.
    const segments: PdfInkPoint[][] = [];
    let current: PdfInkPoint[] = [];

    for (const pt of stroke.points) {
      const inShape = isPointHitByEraserShape(
        pt,
        shape,
        cxPx,
        cyPx,
        halfSize,
        circleR2,
        safeSize,
        surfaceWidth,
        surfaceHeight,
        lineHit?.segments
      );

      if (inShape) {
        // Erased point — flush current segment.
        if (current.length > 0) {
          segments.push(current);
          current = [];
        }
      } else {
        current.push(pt);
      }
    }

    if (current.length > 0) {
      segments.push(current);
    }

    segments.forEach((pts, i) => {
      // Drop segments with fewer than 2 points (no visible line can be drawn).
      if (pts.length < 2) {
        return;
      }

      result.push({
        ...stroke,
        id: `${stroke.id}-s${i}`,
        points: pts
      });
    });
  }

  return result;
}

function eraseStrokePointsInRadius(
  strokes: PdfInkStroke[],
  cx: number,
  cy: number,
  radiusPx: number,
  surfaceWidth: number,
  surfaceHeight: number
): PdfInkStroke[] {
  return eraseStrokePointsByShape(
    strokes,
    "circle",
    cx,
    cy,
    radiusPx * 2,
    surfaceWidth,
    surfaceHeight
  );
}

function isPointHitByEraserShape(
  pt: PdfInkPoint,
  shape: EraserShape,
  cxPx: number,
  cyPx: number,
  halfSize: number,
  circleR2: number,
  size: number,
  surfaceWidth: number,
  surfaceHeight: number,
  lineSegments?: readonly PixelSegment[]
): boolean {
  const px = pt.x * surfaceWidth;
  const py = pt.y * surfaceHeight;
  const dxPx = px - cxPx;
  const dyPx = py - cyPx;

  if (shape === "circle") {
    return dxPx * dxPx + dyPx * dyPx <= circleR2;
  }

  if (shape === "square") {
    return Math.abs(dxPx) <= halfSize && Math.abs(dyPx) <= halfSize;
  }

  if (shape === "triangle") {
    return isPointInEraserTriangle({ x: px, y: py }, cxPx, cyPx, size);
  }

  if (!lineSegments || lineSegments.length === 0) {
    return false;
  }

  for (const segment of lineSegments) {
    if (distancePointToSegmentSq(px, py, segment) <= circleR2) {
      return true;
    }
  }

  return false;
}

function isPointInEraserTriangle(
  point: PixelPoint,
  cxPx: number,
  cyPx: number,
  size: number
): boolean {
  const height = size * Math.sqrt(3) / 2;
  const a = { x: cxPx, y: cyPx - height * 2 / 3 };
  const b = { x: cxPx - size / 2, y: cyPx + height / 3 };
  const c = { x: cxPx + size / 2, y: cyPx + height / 3 };
  const denominator =
    (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);

  if (denominator === 0) {
    return false;
  }

  const alpha =
    ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) /
    denominator;
  const beta =
    ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) /
    denominator;
  const gamma = 1 - alpha - beta;
  const epsilon = -1e-9;

  return alpha >= epsilon && beta >= epsilon && gamma >= epsilon;
}

function buildLineHitState(
  dragPath: readonly EraserDragPoint[] | undefined,
  surfaceWidth: number,
  surfaceHeight: number,
  radiusPx: number
): { segments: PixelSegment[]; bbox: PixelBBox } | undefined {
  if (!dragPath || dragPath.length < 1) {
    return undefined;
  }

  const cappedPath = dragPath.slice(-(ERASER_LINE_SEGMENT_CAP + 1));
  const segments: PixelSegment[] = [];
  let bbox: PixelBBox | undefined;

  if (cappedPath.length === 1) {
    const point = cappedPath[0];
    if (!point) {
      return undefined;
    }

    const px = point.x * surfaceWidth;
    const py = point.y * surfaceHeight;

    segments.push({ ax: px, ay: py, bx: px, by: py });
    bbox = includePointInBBox(bbox, px, py);

    return { segments, bbox: expandBBox(bbox, radiusPx) };
  }

  for (let i = 1; i < cappedPath.length; i++) {
    const prev = cappedPath[i - 1];
    const next = cappedPath[i];

    if (!prev || !next) {
      continue;
    }

    const segment: PixelSegment = {
      ax: prev.x * surfaceWidth,
      ay: prev.y * surfaceHeight,
      bx: next.x * surfaceWidth,
      by: next.y * surfaceHeight
    };

    segments.push(segment);
    bbox = includePointInBBox(bbox, segment.ax, segment.ay);
    bbox = includePointInBBox(bbox, segment.bx, segment.by);
  }

  if (!bbox || segments.length === 0) {
    return undefined;
  }

  return { segments, bbox: expandBBox(bbox, radiusPx) };
}

function getStrokePixelBBox(
  stroke: PdfInkStroke,
  surfaceWidth: number,
  surfaceHeight: number
): PixelBBox | undefined {
  let bbox: PixelBBox | undefined;

  for (const point of stroke.points) {
    bbox = includePointInBBox(bbox, point.x * surfaceWidth, point.y * surfaceHeight);
  }

  return bbox;
}

function includePointInBBox(
  bbox: PixelBBox | undefined,
  x: number,
  y: number
): PixelBBox {
  if (!bbox) {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }

  return {
    minX: Math.min(bbox.minX, x),
    minY: Math.min(bbox.minY, y),
    maxX: Math.max(bbox.maxX, x),
    maxY: Math.max(bbox.maxY, y)
  };
}

function expandBBox(bbox: PixelBBox, amount: number): PixelBBox {
  return {
    minX: bbox.minX - amount,
    minY: bbox.minY - amount,
    maxX: bbox.maxX + amount,
    maxY: bbox.maxY + amount
  };
}

function bboxIntersects(a: PixelBBox, b: PixelBBox): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

function distancePointToSegmentSq(
  px: number,
  py: number,
  segment: PixelSegment
): number {
  const vx = segment.bx - segment.ax;
  const vy = segment.by - segment.ay;
  const wx = px - segment.ax;
  const wy = py - segment.ay;
  const lengthSq = vx * vx + vy * vy;

  if (lengthSq === 0) {
    const dx = px - segment.ax;
    const dy = py - segment.ay;
    return dx * dx + dy * dy;
  }

  const t = Math.min(1, Math.max(0, (wx * vx + wy * vy) / lengthSq));
  const closestX = segment.ax + t * vx;
  const closestY = segment.ay + t * vy;
  const dx = px - closestX;
  const dy = py - closestY;

  return dx * dx + dy * dy;
}

/**
 * R10-c helper: apply eraseStrokePointsInRadius to the workspace store and re-render.
 * Called from both pointerdown (first click) and pointermove (drag continuations).
 * Cost: one full store update + renderApp() per call. Acceptable for initial impl;
 * throttle/RAF can be added later if dogfood shows jank.
 */
function applyEraserAtPoint(
  subjectId: string,
  pageNumber: number,
  shape: EraserShape,
  cx: number,
  cy: number,
  size: number,
  surfaceWidth: number,
  surfaceHeight: number,
  dragPath?: readonly EraserDragPoint[]
): void {
  // sprint-12/slice-4-refine: state mutation 만. render = caller (pointerdown/move/up) 결정.
  // Finding 2 정돈: shape="circle" → eraseStrokePointsInRadius / else → eraseStrokePointsByShape.
  // 이전 코드 = 둘 다 호출 후 한 쪽 결과만 사용 → 비-circle shape 일 때 dead 계산 낭비.
  updatePdfWorkspace(subjectId, (workspace) => {
    const pageStrokes = workspace.inkStrokes.filter(
      (s) => s.pageNumber === pageNumber
    );
    const otherStrokes = workspace.inkStrokes.filter(
      (s) => s.pageNumber !== pageNumber
    );
    const shapeAwarePageStrokes =
      shape === "circle"
        ? eraseStrokePointsInRadius(
            pageStrokes,
            cx,
            cy,
            size / 2,
            surfaceWidth,
            surfaceHeight
          )
        : eraseStrokePointsByShape(
            pageStrokes,
            shape,
            cx,
            cy,
            size,
            surfaceWidth,
            surfaceHeight,
            dragPath
          );

    return {
      ...workspace,
      inkStrokes: [...otherStrokes, ...shapeAwarePageStrokes]
    };
  });
}

// sprint-12/slice-4-refine: RAF throttle 으로 drag 중 renderApp 빈도 제한.
// pointermove 가 동일 frame 안 N회 호출되도 다음 RAF tick 에 단 1회만 render.
function scheduleEraserRender(): void {
  if (eraserRenderScheduled) return;
  eraserRenderScheduled = true;
  requestAnimationFrame(() => {
    eraserRenderScheduled = false;
    renderApp();
  });
}

function isStickyNoteBlockKind(
  kind: string | undefined
): kind is StickyNoteBlockKind {
  return (
    kind === "text" ||
    kind === "checklist" ||
    kind === "table" ||
    kind === "chart-note"
  );
}

function movePdfPage(subjectId: string, delta: number): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const material = workspace.material;

  if (!material) {
    return;
  }

  setPdfPage(subjectId, material.selectedPage + delta);
}

function setPdfPage(subjectId: string, pageNumber: number): void {
  updatePdfWorkspace(subjectId, (workspace) => {
    const material = workspace.material;

    if (!material) {
      return workspace;
    }

    return {
      ...workspace,
      material: {
        ...material,
        selectedPage: Math.min(material.pageCount, Math.max(1, pageNumber))
      }
    };
  });
}

function setPdfTool(subjectId: string, tool: LocalPdfTool): void {
  updatePdfWorkspace(subjectId, (workspace) => {
    const material = workspace.material;

    if (!material) {
      return workspace;
    }

    return {
      ...workspace,
      material: {
        ...material,
        // Cast: "eraser" is a local extension; the domain store accepts PdfWorkspaceTool.
        // The store treats unknown tool values as opaque strings at runtime (JSON.stringify).
        selectedTool: tool as PdfWorkspaceTool
      }
    };
  });
}

function applySetEraserShape(subjectId: string, shape: EraserShape): void {
  updatePdfWorkspace(subjectId, (workspace) => setEraserShape(workspace, shape));
}

function applySetEraserSize(subjectId: string, size: number): void {
  updatePdfWorkspace(subjectId, (workspace) => setEraserSize(workspace, size));
}

// ---------------------------------------------------------------------------
// sprint-12/slice-2 — PdfTextBox store operations
// Pattern mirrors addStickyNote / deleteStickyNote above.
// ---------------------------------------------------------------------------

function addTextBox(
  subjectId: string,
  position: { x: number; y: number }
): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const page = workspace.material?.selectedPage ?? 1;
  const textBox = createTextBox({ subjectId, page, position });

  updatePdfWorkspace(subjectId, (current) => ({
    ...current,
    textBoxes: [...current.textBoxes, textBox]
  }));
}

function removeTextBox(subjectId: string, textBoxId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    textBoxes: deleteTextBox(workspace.textBoxes, textBoxId)
  }));
}

// debounce handles per textbox — codex P1 fix: 1개 module-level timer 공유 시 textbox A→B
// 빠른 타이핑 = A 의 pending save cancel → A content 손실. per-id Map 으로 격리.
const textBoxContentDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleTextBoxContentUpdate(
  subjectId: string,
  textBoxId: string,
  content: string
): void {
  const prev = textBoxContentDebounceMap.get(textBoxId);
  if (prev) clearTimeout(prev);
  const handle = setTimeout(() => {
    textBoxContentDebounceMap.delete(textBoxId);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      textBoxes: workspace.textBoxes.map((tb) =>
        tb.id === textBoxId ? updateTextBoxContent(tb, content) : tb
      )
    }));
  }, 300);
  textBoxContentDebounceMap.set(textBoxId, handle);
}

function applyTextBoxMove(
  subjectId: string,
  textBoxId: string,
  position: { x: number; y: number }
): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    textBoxes: workspace.textBoxes.map((tb) =>
      tb.id === textBoxId ? moveTextBox(tb, position) : tb
    )
  }));
}

// ---------------------------------------------------------------------------
// sprint-12/slice-3 — PdfChecklist store operations
// Pattern mirrors addTextBox / removeTextBox / applyTextBoxMove above.
// ---------------------------------------------------------------------------

function addChecklistWidget(
  subjectId: string,
  position: { x: number; y: number }
): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const page = workspace.material?.selectedPage ?? 1;
  const checklist = createChecklist({ subjectId, page, position });

  updatePdfWorkspace(subjectId, (current) => ({
    ...current,
    checklists: [...current.checklists, checklist]
  }));
}

function removeChecklist(subjectId: string, checklistId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    checklists: deleteChecklist(workspace.checklists, checklistId)
  }));
}

function addItemToChecklist(subjectId: string, checklistId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    checklists: workspace.checklists.map((cl) =>
      cl.id === checklistId ? addChecklistItem(cl) : cl
    )
  }));
}

function removeChecklistItem(subjectId: string, checklistId: string, itemId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    checklists: workspace.checklists.map((cl) =>
      cl.id === checklistId ? deleteChecklistItem(cl, itemId) : cl
    )
  }));
}

function applyToggleChecklistItem(subjectId: string, checklistId: string, itemId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    checklists: workspace.checklists.map((cl) =>
      cl.id === checklistId ? toggleChecklistItem(cl, itemId) : cl
    )
  }));
}

function applyChecklistMove(
  subjectId: string,
  checklistId: string,
  position: { x: number; y: number }
): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    checklists: workspace.checklists.map((cl) =>
      cl.id === checklistId ? moveChecklist(cl, position) : cl
    )
  }));
}

// sprint-12/slice-6: sticky note move (inline reducer — no domain moveStickyNote yet).
// anchor field (not position) is the sticky note's normalized coordinate.
function applyStickyMove(
  subjectId: string,
  noteId: string,
  anchor: { x: number; y: number }
): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    stickyNotes: workspace.stickyNotes.map((note) =>
      note.id === noteId
        ? { ...note, anchor: normalizePdfPoint(anchor.x, anchor.y), updatedAt: new Date().toISOString() }
        : note
    )
  }));
}

// debounce handles per checklist item — codex P1 fix: 1개 shared timer = item A→B 빠른
// 편집 시 A label drop. per-item Map (key = checklistId:itemId) 으로 격리.
const checklistLabelDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleChecklistItemLabelUpdate(
  subjectId: string,
  checklistId: string,
  itemId: string,
  label: string
): void {
  const key = `${checklistId}:${itemId}`;
  const prev = checklistLabelDebounceMap.get(key);
  if (prev) clearTimeout(prev);
  // AC9-e: no renderApp in debounced callback — avoids DOM rebuild mid-keystroke (focus loss).
  const handle = setTimeout(() => {
    checklistLabelDebounceMap.delete(key);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      checklists: workspace.checklists.map((cl) =>
        cl.id === checklistId ? updateChecklistItemLabel(cl, itemId, label) : cl
      )
    }));
  }, 300);
  checklistLabelDebounceMap.set(key, handle);
}

function addStickyNote(
  subjectId: string,
  kind: StickyNoteBlockKind,
  anchor = getNextStickyAnchor(subjectId)
): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const pageNumber = workspace.material?.selectedPage ?? 1;
  const note = createStickyNote(pageNumber, kind, normalizePdfPoint(anchor.x, anchor.y));

  updatePdfWorkspace(subjectId, (current) => ({
    ...current,
    stickyNotes: [...current.stickyNotes, note]
  }));
}

function deleteStickyNote(subjectId: string, noteId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    stickyNotes: workspace.stickyNotes.filter((note) => note.id !== noteId)
  }));
}

function clearPdfAnnotations(subjectId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: []
  }));
}

function getNextStickyAnchor(subjectId: string): { x: number; y: number } {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const pageNumber = workspace.material?.selectedPage ?? 1;
  const noteCount = workspace.stickyNotes.filter(
    (note) => note.pageNumber === pageNumber
  ).length;

  return {
    x: 0.12 + (noteCount % 3) * 0.22,
    y: 0.14 + (Math.floor(noteCount / 3) % 3) * 0.2
  };
}

function getSubjectFromDataset(button: HTMLButtonElement): SubjectNote | undefined {
  const subjectId = button.dataset.subjectId;

  if (!subjectId) {
    return undefined;
  }

  return notebook.subjects.find((subject) => subject.id === subjectId);
}

function scrollToQuickNote(): void {
  window.requestAnimationFrame(() => {
    document.querySelector("#quick-note")?.scrollIntoView({
      block: "start",
      behavior: "smooth"
    });
  });
}

async function importWeekNoteFile(
  file: File,
  expectedSubjectId: string
): Promise<void> {
  try {
    const raw = JSON.parse(await file.text()) as unknown;
    const validation = validateWeekNoteImportPayload(raw);

    if (!validation.ok || !validation.payload) {
      intakeFeedback = {
        kind: "error",
        title: "JSON 구조가 맞지 않습니다.",
        detail: validation.errors.slice(0, 6).join(" / ")
      };
      renderApp();
      return;
    }

    if (validation.payload.subjectId.trim() !== expectedSubjectId) {
      const expectedSubject = notebook.subjects.find(
        (subject) => subject.id === expectedSubjectId
      );

      intakeFeedback = {
        kind: "error",
        title: "선택한 과목과 JSON 과목이 다릅니다.",
        detail: `현재 화면은 ${expectedSubject?.title ?? expectedSubjectId} 전용입니다. JSON subjectId는 ${validation.payload.subjectId}입니다.`
      };
      renderApp();
      return;
    }

    const payload = sanitizeWeekNoteImportPayload(validation.payload);
    const result = applyWeekNoteImport(notebook, payload);

    if (result.warnings.length > 0) {
      intakeFeedback = {
        kind: "error",
        title: "연결되지 않은 id가 있습니다.",
        detail: result.warnings.slice(0, 6).join(" / ")
      };
      renderApp();
      return;
    }

    notebook = result.notebook;
    saveNotebook(notebook);
    intakeFeedback = {
      kind: "success",
      title: `${result.subject.title} ${result.weekNote.label} 노트를 반영했습니다.`,
      detail: "브라우저 localStorage에 저장되어 새로고침 후에도 유지됩니다.",
      href: weekPath(result.subject, result.weekNote)
    };
    renderApp();
  } catch (error) {
    intakeFeedback = {
      kind: "error",
      title: "JSON 파일을 읽지 못했습니다.",
      detail: error instanceof Error ? error.message : "파일 내용을 확인하세요."
    };
    renderApp();
  }
}

function renderApp(): void {
  if (authBootState === "checking") {
    document.body.removeAttribute("data-route");
    renderInto(renderSessionCheckPage());
    return;
  }

  if (!authSession) {
    document.body.removeAttribute("data-route");
    renderInto(renderLoginPage());
    return;
  }

  const route = parseRoute(window.location.hash);
  // sprint-11/slice-1 R3-b: body data-route for CSS scope (.content max-width).
  document.body.dataset.route = route.name;
  const subject =
    route.name === "subject" ||
    route.name === "subject-intake" ||
    route.name === "pdf-workspace" ||
    route.name === "week"
      ? notebook.subjects.find((item) => item.id === route.subjectId)
      : undefined;
  const week =
    route.name === "week" && subject
      ? subject.weekNotes.find((item) => item.id === route.weekId)
      : undefined;

  if (
    route.name !== "home" &&
    route.name !== "intake" &&
    route.name !== "pdf-workspaces" &&
    !subject
  ) {
    renderInto(renderShell(
      renderHomeSidebar(notebook, { name: "home" }),
      renderNotFound(),
      "study-note / 찾을 수 없음"
    ));
    return;
  }

  if (route.name === "week" && subject && !week) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderNotFound(),
      `${subject.title} / 찾을 수 없음`
    ));
    return;
  }

  if (route.name === "home") {
    renderInto(renderShell(
      renderHomeSidebar(notebook, route),
      renderHome(notebook),
      `${notebook.title} / 홈`
    ));
    return;
  }

  if (route.name === "intake") {
    renderInto(renderShell(
      renderHomeSidebar(notebook, route),
      renderIntakeGuide(notebook),
      `${notebook.title} / 자료 투입`
    ));
    return;
  }

  if (route.name === "pdf-workspaces") {
    renderInto(renderShell(
      renderHomeSidebar(notebook, route),
      renderPdfWorkspaceIndex(notebook),
      `${notebook.title} / PDF 작업공간`
    ));
    return;
  }

  if (route.name === "subject-intake" && subject) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectIntakeGuide(subject),
      `${subject.title} / 자료 투입`
    ));
    return;
  }

  if (route.name === "pdf-workspace" && subject) {
    ensurePdfPreviewForWorkspace(subject.id);
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderPdfWorkspacePage(subject),
      `${subject.title} / PDF 작업공간`
    ));
    return;
  }

  if (route.name === "subject" && subject) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectPage(subject),
      `${subject.title} / 총정리`
    ));
    return;
  }

  if (route.name === "week" && subject && week) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderWeekPage(subject, week),
      `${subject.title} / ${week.label}`
    ));
  }

  // sprint-12/slice-6 revert: iframe detach/re-attach 패턴 = Chromium HTML spec 으로
  // iframe reload trigger → PDF 미표시. mountPdfFrame 폐기. 점멸 fix 후속 별 sprint
  // (selective re-render 또는 PDF stage 외부 mount 큰 변경 필요).
}

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "subjects" && parts[1] && parts[2] === "weeks" && parts[3]) {
    return { name: "week", subjectId: parts[1], weekId: parts[3] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "intake") {
    return { name: "subject-intake", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "pdf-workspace") {
    return { name: "pdf-workspace", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1]) {
    return { name: "subject", subjectId: parts[1] };
  }

  if (parts[0] === "pdf-workspaces") {
    return { name: "pdf-workspaces" };
  }

  if (parts[0] === "intake") {
    return { name: "intake" };
  }

  return { name: "home" };
}

function intakePath(): string {
  return "#/intake";
}

function subjectPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}`;
}

function subjectIntakePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/intake`;
}

function subjectPdfWorkspacePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/pdf-workspace`;
}

function weekPath(subject: SubjectNote, week: WeekNote): string {
  return `#/subjects/${subject.id}/weeks/${week.id}`;
}

function renderShell(sidebar: string, mainContent: string, crumb: string): string {
  return `
    <div class="app-shell">
      ${sidebar}
      <div class="main-area">
        <header class="topbar">
          <span class="crumb">${crumb}</span>
          <div class="topbar-session">
            <span class="topbar-meta">${authSession ? `${authSession.user.displayName} · ` : ""}${notebook.updatedAt} 업데이트</span>
            <button class="text-button" type="button" data-action="logout">로그아웃</button>
          </div>
        </header>
        <main class="content">${mainContent}</main>
        <footer class="site-footer">
          study-note · 과목 총정리, 날짜별 노트, 로컬 자료 투입 · 원문 PDF 공개 공유 없음
        </footer>
      </div>
    </div>
  `;
}

function renderLoginPage(): string {
  const isLogin = authMode === "login";
  return `
    <main class="login-screen" data-login-screen="true">
      <section class="login-panel" aria-labelledby="login-title">
        <p class="meta">PRIVATE STUDY WORKSPACE</p>
        <h1 id="login-title">study-note</h1>
        <p class="lede">강의 PDF와 필기 데이터는 사용자별 작업공간에서 관리됩니다.</p>

        <div class="auth-tabs" role="tablist" aria-label="인증 방식 선택">
          <button
            class="auth-tab${isLogin ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${isLogin ? "true" : "false"}"
            data-action="auth-tab-login"
          >로그인</button>
          <button
            class="auth-tab${!isLogin ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${!isLogin ? "true" : "false"}"
            data-action="auth-tab-signup"
          >회원가입</button>
        </div>

        <form class="login-form" data-action="${isLogin ? "login" : "signup"}">
          <label>
            <span>이름</span>
            <input name="name" autocomplete="name" required />
          </label>
          <label>
            <span>학번</span>
            <input name="studentNumber" inputmode="numeric" autocomplete="off" required />
          </label>
          <button class="primary-action" type="submit">
            ${isLogin ? "로그인" : "회원가입"}
          </button>
        </form>
        ${
          loginFeedback
            ? `<div class="login-feedback is-${loginFeedback.kind}">
                <strong>${loginFeedback.title}</strong>
                <p>${loginFeedback.detail}</p>
              </div>`
            : ""
        }
      </section>
    </main>
  `;
}

function renderSessionCheckPage(): string {
  return `
    <main class="login-screen" data-session-checking="true">
      <section class="login-panel" aria-live="polite" aria-busy="true">
        <p class="meta">SESSION CHECK</p>
        <h1>세션 확인 중</h1>
        <p class="lede">저장된 로그인 정보를 서버와 확인하고 있습니다.</p>
      </section>
    </main>
  `;
}

function renderHomeSidebar(studyNotebook: StudyNotebook, route: Route): string {
  return `
    <aside class="sidebar" aria-label="학습 내비게이션">
      <a class="wordmark" href="#/">study-note</a>
      <div class="sidebar-group">
        <p class="group-label">홈</p>
        <nav>
          <a class="${route.name === "home" ? "active" : ""}" href="#/">전체 현황</a>
        </nav>
      </div>
      <div class="sidebar-group">
        <p class="group-label">과목 공부</p>
        <nav>
          ${studyNotebook.subjects.map((subject) => `
            <a href="${subjectPath(subject)}">${subject.title}</a>
            ${renderPersonaSubLink(subject.id)}
          `).join("")}
        </nav>
      </div>
      <div class="sidebar-group">
        <p class="group-label">PDF 작업공간</p>
        <nav>
          <a class="${route.name === "pdf-workspaces" || route.name === "pdf-workspace" ? "active" : ""}" href="#/pdf-workspaces">작업공간 목록</a>
        </nav>
      </div>
      ${renderClassSchedule()}
      <details class="sidebar-details" ${route.name === "intake" ? "open" : ""}>
        <summary>자료 관리</summary>
        <nav>
          <a class="${route.name === "intake" ? "active" : ""}" href="${intakePath()}">자료 투입 가이드</a>
          ${studyNotebook.subjects.map((subject) => `<a href="${subjectIntakePath(subject)}">${subject.title} 자료 넣기</a>`).join("")}
        </nav>
      </details>
      ${renderAdminLink()}
    </aside>
  `;
}

function renderAdminLink(): string {
  const role = authSession?.user.role;
  if (role !== "master" && role !== "admin") return "";
  return `
    <div class="sidebar-group">
      <p class="group-label">🛡️ 관리자</p>
      <nav>
        <a href="/admin.html" aria-label="관리자 대시보드">사용자 관리</a>
      </nav>
    </div>
  `;
}

const PERSONA_BY_SUBJECT: Record<string, { nick: string; active: boolean }> = {
  "digital-engineering": { nick: "디공이", active: true },
  "information-communication": { nick: "정통이", active: false },
  "c-language": { nick: "씨랭이", active: false },
  "computer-introduction": { nick: "컴론이", active: false }
};

const PERSONA_SUB_BASE = "padding-left:24px;font-size:13px";
const PERSONA_SUB_DISABLED = `${PERSONA_SUB_BASE};opacity:0.45;cursor:not-allowed;pointer-events:none`;
const PERSONA_SUB_ACTIVE = `${PERSONA_SUB_BASE};color:#3b6ef5`;

function renderPersonaSubLink(subjectId: string): string {
  const p = PERSONA_BY_SUBJECT[subjectId];
  if (!p) return "";
  if (p.active) {
    return `<a style="${PERSONA_SUB_ACTIVE}" href="/persona-turn.html?subject=${subjectId}">↳ ${p.nick} 호출</a>`;
  }
  return `<a style="${PERSONA_SUB_DISABLED}" aria-disabled="true" tabindex="-1">↳ ${p.nick} 호출 (준비 중)</a>`;
}

function renderSubjectSidebar(subject: SubjectNote, route: Route): string {
  const currentSession =
    route.name === "week"
      ? subject.weekNotes.find((week) => week.id === route.weekId)
      : undefined;

  return `
    <aside class="sidebar" aria-label="${subject.title} 학습 내비게이션">
      <a class="wordmark" href="#/">study-note</a>
      <div class="sidebar-group">
        <p class="group-label">${subject.title}</p>
        <nav>
          <a class="${route.name === "subject" ? "active" : ""}" href="${subjectPath(subject)}">과목 총정리</a>
          <a class="${route.name === "pdf-workspace" ? "active" : ""}" href="${subjectPdfWorkspacePath(subject)}">PDF 작업공간</a>
          ${renderPersonaSubLink(subject.id)}
          ${subject.weekNotes.map((week) => `
            <a class="${route.name === "week" && route.weekId === week.id ? "active" : ""}" href="${weekPath(subject, week)}">${week.label}</a>
          `).join("")}
        </nav>
      </div>
      <div class="sidebar-group">
        <p class="group-label">PDF 작업공간</p>
        <nav>
          <a class="${route.name === "pdf-workspaces" || route.name === "pdf-workspace" ? "active" : ""}" href="#/pdf-workspaces">작업공간 목록</a>
        </nav>
      </div>
      ${renderClassSchedule(currentSession?.label)}
      <div class="sidebar-group is-secondary">
        <p class="group-label">다른 과목</p>
        <nav>
          <a href="#/">전체 현황</a>
          ${notebook.subjects.map((item) => `
            <a class="${item.id === subject.id && route.name === "subject" ? "active" : ""}" href="${subjectPath(item)}">${item.title}</a>
            ${renderPersonaSubLink(item.id)}
          `).join("")}
        </nav>
      </div>
      <details class="sidebar-details" ${route.name === "subject-intake" ? "open" : ""}>
        <summary>자료 관리</summary>
        <nav>
          <a href="${intakePath()}">자료 투입 가이드</a>
          <a class="${route.name === "subject-intake" ? "active" : ""}" href="${subjectIntakePath(subject)}">${subject.title} 자료 넣기</a>
          <a class="${route.name === "pdf-workspace" ? "active" : ""}" href="${subjectPdfWorkspacePath(subject)}">${subject.title} PDF 작업공간</a>
          ${notebook.subjects
            .filter((item) => item.id !== subject.id)
            .map((item) => `<a href="${subjectIntakePath(item)}">${item.title} 자료 넣기</a>`)
            .join("")}
        </nav>
      </details>
      ${renderAdminLink()}
    </aside>
  `;
}

function renderClassSchedule(activeLabel?: string): string {
  return `
    <details class="sidebar-details schedule-details">
      <summary>수업 일정</summary>
      <div class="schedule-list" aria-label="중간 이후 수업 일정">
        ${classSchedule.map((entry) => `
          <span class="schedule-pill ${entry.kind === "final" ? "is-final" : ""} ${activeLabel === entry.label ? "active" : ""}">
            <strong>${entry.label}</strong>
            <span>${entry.note}</span>
          </span>
        `).join("")}
      </div>
    </details>
  `;
}

function renderHome(studyNotebook: StudyNotebook): string {
  const coverage = getNotebookCoverage(studyNotebook);
  const warnings = getIntegrityWarnings(studyNotebook);
  const firstSubject = studyNotebook.subjects[0];
  const totalSessions = studyNotebook.subjects.reduce(
    (sum, subject) => sum + subject.weekNotes.length,
    0
  );
  const needsFillSessions = studyNotebook.subjects.flatMap((subject) =>
    subject.weekNotes
      .filter((week) => week.reviewStatus === "needs-fill")
      .map((week) => ({ subject, week }))
  );

  return `
    <section class="home-hero">
      <div>
        <p class="meta">${studyNotebook.term} · 기말고사 홈</p>
        <h1>${studyNotebook.title}</h1>
        <p class="lede">
          홈은 전체 현황을 보고 과목으로 들어가는 시작 화면입니다.
          과목별 총정리와 날짜별 노트는 각 과목 페이지 안에서 따로 봅니다.
        </p>
        <div class="hero-actions">
          ${
            firstSubject
              ? `<a class="action-link" href="${subjectPath(firstSubject)}">첫 과목 공부하기</a>`
              : ""
          }
          <a class="secondary-link" href="${intakePath()}">자료 투입 가이드</a>
        </div>
      </div>
      <img src="/coverage-map.svg" alt="비공개 PDF, 필수 키워드, 핵심 개념, 예제문제 흐름" />
    </section>

    <section class="metric-grid" aria-label="학습 노트 현황">
      ${renderMetric("과목", `${studyNotebook.subjects.length}과목`, "과목별 독립 페이지")}
      ${renderMetric("수업일", `${totalSessions}개 노트`, "날짜별 노트")}
      ${renderMetric("키워드 반영률", `${coverage.coverageRate}%`, `${coverage.covered}/${coverage.total} 필수 키워드 반영`)}
      ${renderMetric("일정", scheduleRangeLabel, "목요일/토요일 수업")}
    </section>

    <section aria-labelledby="home-subjects-title">
      <p class="meta">§1 — 과목 선택</p>
      <h2 id="home-subjects-title">과목을 선택하세요.</h2>
      <div class="subject-grid">
        ${studyNotebook.subjects.map(renderSubjectCard).join("")}
      </div>
    </section>

    <section class="home-split" aria-labelledby="home-review-title">
      <div>
        <p class="meta">§2 — 보강 필요</p>
        <h2 id="home-review-title">보강이 필요한 수업일</h2>
        ${
          needsFillSessions.length === 0
            ? '<p class="status-good">현재 보강 표시된 수업일이 없습니다.</p>'
            : `<div class="compact-list">
                ${needsFillSessions.map(({ subject, week }) => `
                  <a href="${weekPath(subject, week)}">
                    <span>${subject.title}</span>
                    <strong>${week.label} · ${week.title}</strong>
                  </a>
                `).join("")}
              </div>`
        }
      </div>
      <div>
        <p class="meta">§3 — 공유 원칙</p>
        <h2>공유 원칙</h2>
        <div class="policy-block is-standalone">
          <strong>원문 PDF는 홈이나 과목 페이지에서 공개하지 않습니다.</strong>
          <p>${studyNotebook.sharePolicy.rawSourceRule}</p>
          <p>${studyNotebook.sharePolicy.noteRule}</p>
          <p>${studyNotebook.sharePolicy.disclaimer}</p>
          ${
            studyNotebook.sourceWorkspaceUrl
              ? `<p><a href="${studyNotebook.sourceWorkspaceUrl}" target="_blank" rel="noreferrer">기존 Notion 원본 보기</a></p>`
              : ""
          }
        </div>
      </div>
    </section>

    <section class="integrity-section" aria-labelledby="integrity-title">
      <p class="meta">§4 — 데이터 연결 확인</p>
      <h2 id="integrity-title">샘플 데이터 연결 상태</h2>
      ${
        warnings.length === 0
          ? '<p class="status-good">샘플 과목, 수업일, 키워드, 개념, 문제, 자료가 모두 연결되어 있습니다.</p>'
          : `<ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>`
      }
    </section>
  `;
}

function renderIntakeGuide(studyNotebook: StudyNotebook): string {
  return `
    <section class="subject-page-hero">
      <p class="meta">로컬 자료 흐름 · 서버 업로드 없음</p>
      <h1>${localIntakeGuide.title}</h1>
      <p class="lede">${localIntakeGuide.summary}</p>
    </section>

    <section aria-labelledby="subject-import-title">
      <p class="meta">§1 — 과목 선택</p>
      <h2 id="subject-import-title">어느 과목 자료인지 먼저 선택하세요.</h2>
      <p class="lede">
        실제 JSON 파일은 과목별 자료 투입 화면에서만 받습니다.
        선택한 과목과 JSON의 subjectId가 다르면 반영하지 않습니다.
      </p>
      <div class="subject-grid">
        ${studyNotebook.subjects.map((subject) => renderSubjectImportCard(subject)).join("")}
      </div>
    </section>

    <section aria-labelledby="intake-roles-title">
      <p class="meta">§2 — 파일 역할</p>
      <h2 id="intake-roles-title">파일별 보관 위치</h2>
      <div class="file-role-grid">
        ${localIntakeGuide.roles.map((role) => `
          <article class="file-role-card">
            <p class="meta">${role.label}</p>
            <h3><code>${role.location}</code></h3>
            <p>${role.rule}</p>
          </article>
        `).join("")}
      </div>
    </section>

    <section aria-labelledby="intake-flow-title">
      <p class="meta">§3 — 운영 순서</p>
      <h2 id="intake-flow-title">PDF를 앱 데이터로 넣는 순서</h2>
      <div class="intake-flow">
        ${localIntakeGuide.steps.map((step) => `
          <article class="intake-step">
            <h3>${step.title}</h3>
            <p>${step.description}</p>
            <span>${step.detail}</span>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="intake-split" aria-labelledby="intake-checklist-title">
      <div>
        <p class="meta">§4 — 로컬 폴더</p>
        <h2>권장 로컬 폴더</h2>
        <pre class="code-block"><code>${escapeHtml(localIntakeGuide.folderTree.join("\n"))}</code></pre>
      </div>
      <div>
        <p class="meta">§5 — Claude 요청 체크리스트</p>
        <h2 id="intake-checklist-title">요청에 반드시 넣을 것</h2>
        <ul class="check-list">
          ${localIntakeGuide.promptChecklist.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </section>

    <section aria-labelledby="intake-contract-title">
      <p class="meta">§6 — 앱 반영 규칙</p>
      <h2 id="intake-contract-title">앱에 넣기 전 확인</h2>
      <div class="contract-list">
        ${localIntakeGuide.insertionContract.map((item) => `<p>${item}</p>`).join("")}
      </div>
      <div class="policy-block is-standalone">
        <strong>현재 prototype의 import는 브라우저 로컬 전용입니다.</strong>
        <p>원문 PDF는 로컬에만 두고, 검수한 강의노트 JSON만 reader에 반영합니다.</p>
      </div>
    </section>

    <section aria-labelledby="json-schema-title">
      <p class="meta">§7 — JSON 구조</p>
      <h2 id="json-schema-title">Claude에 요구할 JSON 예시</h2>
      <pre class="code-block code-block-large"><code>${escapeHtml(JSON.stringify(localIntakeGuide.samplePayload, null, 2))}</code></pre>
    </section>
  `;
}

function renderSubjectIntakeGuide(subject: SubjectNote): string {
  const inputId = `note-json-file-${subject.id}`;

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.title} · 브라우저 로컬 import</p>
      <h1>${subject.title} 자료 투입</h1>
      <p class="lede">
        이 화면은 ${subject.title} 전용입니다.
        JSON의 <code>subjectId</code>가 <code>${subject.id}</code>일 때만 반영합니다.
      </p>
      <p><a href="${subjectPath(subject)}">← ${subject.title} 총정리로 돌아가기</a></p>
    </section>

    <section class="upload-section" aria-labelledby="json-upload-title">
      <div>
        <p class="meta">§1 — 브라우저 import</p>
        <h2 id="json-upload-title">Claude JSON 파일 넣기</h2>
        <p class="lede">
          선택한 파일은 서버로 전송하지 않고 현재 브라우저에서만 읽습니다.
          통과한 노트는 localStorage에 저장되어 이 과목의 수업일별 노트로 바로 반영됩니다.
        </p>
      </div>
      <div class="upload-panel">
        <input
          id="${inputId}"
          class="file-input"
          type="file"
          accept="application/json,.json"
          data-action="import-week-note"
          data-subject-id="${subject.id}"
        />
        <label class="file-drop" for="${inputId}">
          <strong>${subject.title} JSON 선택</strong>
          <span>schemaVersion이 study-note.week-note.v1인 파일만 반영합니다.</span>
        </label>
        <p class="example-file">예제 파일: <code>${localIntakeGuide.exampleFile}</code> 구조 샘플</p>
        ${renderIntakeFeedback()}
        <button class="secondary-action" type="button" data-action="reset-local-data">
          로컬 import 초기화
        </button>
      </div>
    </section>

    <section aria-labelledby="subject-json-contract-title">
      <p class="meta">§2 — 과목 규칙</p>
      <h2 id="subject-json-contract-title">이 과목 JSON에서 확인할 값</h2>
      <div class="contract-list">
        <p><code>subjectId</code>는 <code>${subject.id}</code>여야 합니다.</p>
        <p><code>weekNote.id</code>는 ${subject.title} 안에서 유일해야 합니다.</p>
        <p>같은 id의 keyword, concept, question, 수업일 노트는 새 파일 내용으로 교체됩니다.</p>
      </div>
    </section>

    <section aria-labelledby="json-schema-title">
      <p class="meta">§3 — JSON 구조</p>
      <h2 id="json-schema-title">Claude에 요구할 JSON 예시</h2>
      <pre class="code-block code-block-large"><code>${escapeHtml(JSON.stringify(getSubjectSamplePayload(subject), null, 2))}</code></pre>
    </section>
  `;
}

function getSubjectSamplePayload(subject: SubjectNote): unknown {
  const safeSubjectId = subject.id;
  const sourceId = `${safeSubjectId}-pdf-session`;
  const keywordId = `${safeSubjectId}-kw-required`;
  const conceptId = `${safeSubjectId}-concept-core`;
  const questionId = `${safeSubjectId}-q-core`;

  return {
    schemaVersion: "study-note.week-note.v1",
    subjectId: safeSubjectId,
    sourceMaterials: [
      {
        id: sourceId,
        title: `${subject.title} 수업일 교수님 PDF`,
        kind: "professor-pdf",
        visibility: "private-source",
        pages: "p.1-p.30",
        note: "원문은 local-materials에만 보관하고 reader에는 메타데이터만 둔다."
      }
    ],
    requiredKeywords: [
      {
        id: keywordId,
        label: "교수님 강조 키워드",
        status: "covered",
        professorSignal: "수업 중 시험 가능성 언급",
        conceptIds: [conceptId]
      }
    ],
    concepts: [
      {
        id: conceptId,
        title: "핵심 개념명",
        priority: "must-know",
        summary: "시험에 필요한 핵심 정의를 한 문장으로 정리한다.",
        easyExplanation: "처음 보는 사람도 이해할 수 있게 쉬운 말로 다시 설명한다.",
        sourceHints: ["교수님 PDF p.10-p.15"],
        relatedKeywordIds: [keywordId],
        exampleQuestionIds: [questionId]
      }
    ],
    exampleQuestions: [
      {
        id: questionId,
        conceptId,
        difficulty: "basic",
        prompt: "핵심 개념을 설명하라.",
        answer: "정답 요지를 적는다.",
        explanation: "왜 이 답이 되는지 시험 답안 기준으로 설명한다."
      }
    ],
    weekNote: {
      id: `${safeSubjectId}-session-20260509`,
      label: "5월 9일(토)",
      title: "수업일 제목",
      focus: "이 수업일에서 반드시 이해할 내용을 적는다.",
      sourceMaterialIds: [sourceId],
      requiredKeywordIds: [keywordId],
      conceptIds: [conceptId],
      exampleQuestionIds: [questionId],
      reviewStatus: "ready"
    }
  };
}

function renderIntakeFeedback(
  emptyText = "아직 반영한 JSON 파일이 없습니다."
): string {
  if (!intakeFeedback) {
    return `<div class="import-feedback">${emptyText}</div>`;
  }

  const retryButton =
    intakeFeedback.kind === "error" && intakeFeedback.retrySubjectId && pendingPdfRetry
      ? `<button class="secondary-action" type="button" data-action="retry-pdf-upload" data-subject-id="${escapeHtml(intakeFeedback.retrySubjectId)}">재시도</button>`
      : "";

  return `
    <div class="import-feedback is-${intakeFeedback.kind}">
      <strong>${intakeFeedback.title}</strong>
      <p>${intakeFeedback.detail}</p>
      ${intakeFeedback.href ? `<a href="${intakeFeedback.href}">반영된 수업일 노트 보기</a>` : ""}
      ${retryButton}
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPdfWorkspacePage(subject: SubjectNote): string {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subject.id);
  const material = workspace.material;
  const selectedPage = material?.selectedPage ?? 1;
  // Cast: "eraser" is stored via LocalPdfTool cast in setPdfTool; recover the wider type here.
  const selectedTool = (material?.selectedTool ?? "read") as LocalPdfTool;
  const objectUrl =
    material?.backendMaterialId &&
    activePdfObjectUrlMaterialIds.get(subject.id) === material.backendMaterialId
      ? activePdfObjectUrls.get(subject.id)
      : undefined;
  const previewLoadKey = material?.backendMaterialId
    ? `${subject.id}:${material.backendMaterialId}`
    : undefined;
  const isPreviewLoading = previewLoadKey
    ? activePdfPreviewLoads.has(previewLoadKey)
    : false;
  const pageNotes = workspace.stickyNotes.filter(
    (note) => note.pageNumber === selectedPage
  );
  const pageStrokes = workspace.inkStrokes.filter(
    (stroke) => stroke.pageNumber === selectedPage
  );
  // sprint-12/slice-2: filter textboxes for current page
  const pageTextBoxes = workspace.textBoxes.filter(
    (tb) => tb.page === selectedPage
  );
  // sprint-12/slice-3: filter checklists for current page
  const pageChecklists = workspace.checklists.filter(
    (cl) => cl.page === selectedPage
  );
  const inputId = `pdf-file-${subject.id}`;

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.title} · backend PDF 작업공간</p>
      <h1>${subject.title} PDF 필기</h1>
      <p class="lede">
        PDF 파일은 로그인된 사용자 backend storage에 저장하고, 미리보기는 인증된 다운로드를 Blob URL로 열어 표시합니다.
        포스트잇과 펜 stroke는 이번 sprint에서 기존 localStorage 흐름을 유지합니다.
      </p>
      <p><a href="${subjectPath(subject)}">← ${subject.title} 총정리로 돌아가기</a></p>
    </section>

    <section class="upload-section pdf-upload-section" aria-labelledby="pdf-upload-title">
      <div>
        <p class="meta">§1 — PDF 선택</p>
        <h2 id="pdf-upload-title">강의 PDF 업로드</h2>
        <p class="lede">
          선택한 PDF는 backend proxy를 통해 저장됩니다.
          새로고침 후에도 세션이 유효하면 이 과목의 최신 업로드 PDF를 다시 불러옵니다.
        </p>
      </div>
      <div class="upload-panel">
        <input
          id="${inputId}"
          class="file-input"
          type="file"
          accept="application/pdf,.pdf"
          data-action="import-pdf-material"
          data-subject-id="${subject.id}"
        />
        <label class="file-drop" for="${inputId}">
          <strong>${subject.title} PDF 선택 및 업로드</strong>
          <span>원문은 backend storage에 저장되고, 화면에는 인증 fetch로 받은 Blob 미리보기를 엽니다.</span>
        </label>
        ${material ? renderPdfMaterialStatus(material, Boolean(objectUrl), isPreviewLoading) : ""}
        ${renderIntakeFeedback("아직 업로드한 PDF 파일이 없습니다.")}
      </div>
    </section>

    <section class="pdf-workspace" aria-labelledby="pdf-workspace-title">
      <div class="pdf-workspace-header">
        <div>
          <p class="meta">§2 — PDF viewer + annotation layer</p>
          <h2 id="pdf-workspace-title">페이지 ${selectedPage}${material ? ` / ${material.pageCount}` : ""}</h2>
        </div>
        <div class="pdf-toolbar-row">
          ${renderPdfToolbar(
            subject.id,
            selectedTool,
            material?.pageCount ?? 1,
            selectedPage,
            Boolean(material),
            workspace.eraserShape,
            workspace.eraserSize
          )}
          <button
            class="pdf-inspector-toggle secondary-action"
            type="button"
            data-action="toggle-pdf-inspector"
            aria-expanded="${inspectorOpen ? "true" : "false"}"
            aria-controls="pdf-inspector-aside"
          >${inspectorOpen ? "검사기 닫기" : "검사기 열기"}</button>
        </div>
      </div>

      <div class="pdf-workspace-layout${inspectorOpen ? " is-inspector-open" : ""}">
        <div class="pdf-stage" aria-label="${subject.title} PDF page annotation surface">
          ${
            objectUrl
              ? `<iframe
                  class="pdf-frame"
                  title="${subject.title} PDF preview"
                  src="${escapeHtml(`${objectUrl}#page=${selectedPage}&toolbar=0&navpanes=0&view=FitH`)}"
                ></iframe>`
              : `<div class="pdf-placeholder">
                  <strong>${getPdfPreviewPlaceholderTitle(Boolean(material), isPreviewLoading)}</strong>
                  <span>${getPdfPreviewPlaceholderDetail(Boolean(material), selectedPage)}</span>
                </div>`
          }
          <div
            class="pdf-annotation-surface is-${selectedTool}-mode"
            ${selectedTool === "eraser" ? `style="${renderEraserCursorStyle(workspace.eraserShape, workspace.eraserSize)}"` : ""}
            data-pdf-annotation-surface="true"
            data-subject-id="${subject.id}"
            data-page-number="${selectedPage}"
          >
            <svg class="ink-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true">
              ${pageStrokes.map(renderInkStroke).join("")}
            </svg>
            <svg class="ink-layer is-live-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true" data-live-ink-layer="true"></svg>
            ${pageNotes.map((note) => renderStickyNote(subject.id, note)).join("")}
            ${pageTextBoxes.map((tb) => renderTextBox(subject.id, tb)).join("")}
            ${pageChecklists.map((cl) => renderChecklist(subject.id, cl)).join("")}
          </div>
        </div>

        <aside
          class="pdf-inspector${inspectorOpen ? "" : " pdf-inspector--collapsed"}"
          id="pdf-inspector-aside"
          aria-label="PDF annotation state"
          aria-hidden="${inspectorOpen ? "false" : "true"}"
        >
          <p class="meta">§3 — 저장 상태</p>
          <h3>로컬 annotation</h3>
          <dl>
            <div><dt>포스트잇</dt><dd>${workspace.stickyNotes.length}개</dd></div>
            <div><dt>펜 stroke</dt><dd>${workspace.inkStrokes.length}개</dd></div>
            <div><dt>텍스트 박스</dt><dd>${workspace.textBoxes.length}개</dd></div>
            <div><dt>체크리스트</dt><dd>${workspace.checklists.length}개</dd></div>
            <div><dt>현재 도구</dt><dd>${formatPdfTool(selectedTool)}</dd></div>
          </dl>
          <div class="policy-block is-standalone">
            <strong>PDF 원문은 backend material storage가 기준입니다.</strong>
            <p>이 화면은 직접 S3에 올리지 않고 backend proxy API로 업로드/다운로드합니다. 필기 데이터의 backend 동기화는 다음 sprint 후보입니다.</p>
          </div>
          <button class="secondary-action" type="button" data-action="clear-pdf-annotations" data-subject-id="${subject.id}">
            메모/필기 전체 지우기
          </button>
        </aside>
      </div>
    </section>
  `;
}

function renderPdfMaterialStatus(
  material: NonNullable<SubjectPdfWorkspace["material"]>,
  hasPreview: boolean,
  isPreviewLoading: boolean
): string {
  const uploadStatus = material.uploadStatus ?? "local";
  const statusLabel =
    uploadStatus === "uploaded"
      ? hasPreview
        ? "backend 저장 완료 · 미리보기 연결됨"
        : isPreviewLoading
          ? "backend 저장 완료 · 미리보기 불러오는 중"
          : "backend 저장 완료 · 미리보기 대기"
      : uploadStatus === "pending"
        ? "backend 업로드 대기/진행 중"
        : "이전 로컬 material";

  return `
    <div class="import-feedback ${uploadStatus === "pending" ? "" : "is-success"}">
      <strong>${escapeHtml(material.fileName)}</strong>
      <p>${formatPdfFileSize(material.fileSize)} · ${material.pageCount}페이지 추정 · ${statusLabel}</p>
      ${material.backendMaterialId ? `<p>material id: <code>${material.backendMaterialId}</code></p>` : ""}
    </div>
  `;
}

function getPdfPreviewPlaceholderTitle(
  hasMaterial: boolean,
  isPreviewLoading: boolean
): string {
  if (isPreviewLoading) {
    return "저장된 PDF 미리보기를 불러오는 중입니다.";
  }

  return hasMaterial
    ? "backend에서 PDF 미리보기를 아직 받지 못했습니다."
    : "PDF를 업로드하면 여기에 미리보기가 열립니다.";
}

function getPdfPreviewPlaceholderDetail(
  hasMaterial: boolean,
  selectedPage: number
): string {
  return hasMaterial
    ? `포스트잇과 펜 stroke는 페이지 ${selectedPage} 기준으로 계속 편집할 수 있습니다.`
    : "업로드 후 backend에서 다시 내려받은 Blob preview를 사용합니다.";
}

function renderPdfToolbar(
  subjectId: string,
  selectedTool: LocalPdfTool,
  pageCount: number,
  selectedPage: number,
  hasMaterial: boolean,
  eraserShape: EraserShape,
  eraserSize: number
): string {
  const disabled = hasMaterial ? "" : "disabled";

  return `
    <div class="pdf-toolbar" aria-label="PDF 작업 도구">
      <div class="pdf-page-controls">
        <button class="secondary-action" type="button" data-action="pdf-prev-page" data-subject-id="${subjectId}" ${disabled}>이전</button>
        <label>
          <span>페이지</span>
          <input
            type="number"
            min="1"
            max="${pageCount}"
            value="${selectedPage}"
            data-action="select-pdf-page"
            data-subject-id="${subjectId}"
            ${disabled}
          />
        </label>
        <button class="secondary-action" type="button" data-action="pdf-next-page" data-subject-id="${subjectId}" ${disabled}>다음</button>
      </div>
      <div class="pdf-tool-group" role="group" aria-label="입력 도구">
        ${renderToolButton(subjectId, "read", selectedTool, "읽기")}
        ${renderToolButton(subjectId, "sticky", selectedTool, "포스트잇")}
        ${renderToolButton(subjectId, "pen", selectedTool, "펜")}
        ${renderToolButton(subjectId, "eraser", selectedTool, "지우개")}
      </div>
      <div class="pdf-tool-group" role="group" aria-label="annotation 도구">
        ${renderToolButton(subjectId, "text", selectedTool, "텍스트 박스")}
        ${renderToolButton(subjectId, "checklist", selectedTool, "체크리스트")}
        ${renderDisabledToolButton("표", "표 도구 — sprint-13 예정")}
        ${renderDisabledToolButton("그래프", "그래프 도구 — sprint-13 예정")}
      </div>
      ${selectedTool === "eraser" ? renderEraserSubToolbar(subjectId, eraserShape, eraserSize, disabled) : ""}
    </div>
  `;
}

function renderEraserSubToolbar(
  subjectId: string,
  eraserShape: EraserShape,
  eraserSize: number,
  disabled: string
): string {
  return `
    <div class="pdf-eraser-subtoolbar" aria-label="지우개 설정">
      <div class="pdf-eraser-shape-picker" role="group" aria-label="지우개 모양">
        ${renderEraserShapeButton(subjectId, "circle", eraserShape, "원", "원형 지우개", disabled)}
        ${renderEraserShapeButton(subjectId, "square", eraserShape, "네모", "네모 지우개", disabled)}
        ${renderEraserShapeButton(subjectId, "triangle", eraserShape, "세모", "세모 지우개", disabled)}
        ${renderEraserShapeButton(subjectId, "line", eraserShape, "선", "선 지우개", disabled)}
      </div>
      <label class="pdf-eraser-size-control">
        <span>지우개 크기: ${Math.round(eraserSize)}px</span>
        <input
          type="range"
          min="16"
          max="64"
          value="${Math.round(eraserSize)}"
          data-action="set-eraser-size"
          data-subject-id="${subjectId}"
          ${disabled}
        />
      </label>
    </div>
  `;
}

function renderEraserShapeButton(
  subjectId: string,
  shape: EraserShape,
  selectedShape: EraserShape,
  label: string,
  ariaLabel: string,
  disabled: string
): string {
  return `
    <button
      class="eraser-shape-button ${selectedShape === shape ? "active" : ""}"
      type="button"
      data-action="set-eraser-shape"
      data-subject-id="${subjectId}"
      data-eraser-shape="${shape}"
      aria-label="${ariaLabel}"
      aria-pressed="${selectedShape === shape ? "true" : "false"}"
      ${disabled}
    >
      ${label}
    </button>
  `;
}

function renderEraserCursorStyle(shape: EraserShape, size: number): string {
  const safeSize = Number.isFinite(size) ? Math.min(64, Math.max(16, size)) : 16;
  const viewBoxSize = safeSize + 2;
  const center = viewBoxSize / 2;
  const svg = renderEraserCursorSvg(shape, safeSize, viewBoxSize, center);
  const dataUrl = encodeURIComponent(svg);

  return `cursor: url('data:image/svg+xml,${dataUrl}') ${center} ${center}, crosshair;`;
}

function renderEraserCursorSvg(
  shape: EraserShape,
  size: number,
  viewBoxSize: number,
  center: number
): string {
  const half = size / 2;
  const stroke = 1.5;
  const common = `fill="none" stroke="black" stroke-width="${stroke}"`;

  if (shape === "circle") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"><circle cx="${center}" cy="${center}" r="${half}" ${common}/></svg>`;
  }

  if (shape === "square") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"><rect x="${center - half}" y="${center - half}" width="${size}" height="${size}" ${common}/></svg>`;
  }

  if (shape === "triangle") {
    const height = size * Math.sqrt(3) / 2;
    const p1 = `${center},${center - height * 2 / 3}`;
    const p2 = `${center - half},${center + height / 3}`;
    const p3 = `${center + half},${center + height / 3}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" overflow="visible"><polygon points="${p1} ${p2} ${p3}" ${common}/></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"><line x1="${center - half}" y1="${center + half}" x2="${center + half}" y2="${center - half}" ${common} stroke-linecap="round"/><circle cx="${center}" cy="${center}" r="2" fill="black"/></svg>`;
}

function renderToolButton(
  subjectId: string,
  tool: LocalPdfTool,
  selectedTool: LocalPdfTool,
  label: string
): string {
  return `
    <button
      class="tool-button ${selectedTool === tool ? "active" : ""}"
      type="button"
      data-action="set-pdf-tool"
      data-subject-id="${subjectId}"
      data-tool="${tool}"
      aria-pressed="${selectedTool === tool ? "true" : "false"}"
    >
      ${label}
    </button>
  `;
}

// sprint-12/slice-5: sprint-13 까지 미구현 도구 (표/그래프) 의 disabled placeholder.
// 클릭 무동작. tooltip / aria-label 으로 사용자에게 미래 도입 예정 표시.
function renderDisabledToolButton(label: string, ariaLabel: string): string {
  const escapedLabel = escapeHtml(label);
  const escapedAria = escapeHtml(ariaLabel);
  return `
    <button
      class="tool-button is-disabled-placeholder"
      type="button"
      disabled
      aria-label="${escapedAria}"
      title="${escapedAria}"
    >
      ${escapedLabel}
    </button>
  `;
}


function renderStickyNote(subjectId: string, note: SubjectPdfWorkspace["stickyNotes"][number]): string {
  const block = note.blocks[0];

  if (!block) {
    return "";
  }

  return `
    <article
      class="sticky-note"
      style="left: ${note.anchor.x * 100}%; top: ${note.anchor.y * 100}%;"
      data-note-id="${note.id}"
    >
      <div
        class="sticky-note-header"
        data-action="sticky-drag-handle"
        data-note-id="${note.id}"
        role="button"
        aria-label="포스트잇 이동"
      >
        <span>${formatStickyBlockKind(block.kind)}</span>
        <button
          type="button"
          aria-label="포스트잇 삭제"
          data-action="delete-sticky-note"
          data-subject-id="${subjectId}"
          data-note-id="${note.id}"
        >
          ×
        </button>
      </div>
      <textarea
        data-action="update-sticky-note"
        data-subject-id="${subjectId}"
        data-note-id="${note.id}"
      >${escapeHtml(block.content)}</textarea>
    </article>
  `;
}

// sprint-12/slice-2 R3: textbox widget renderer.
// AC9-e: content rendered via textarea.value (innerHTML 금지).
// AC9-g: data-textbox-id only; content not exposed in data-*, title, aria-label.
// Drag: header bar handles pointerdown for drag. Body = textarea for editing.
// sprint-12/slice-7: textbox redesign — macOS Preview 스타일 인라인 텍스트.
// 박스 frame 폐기. PDF 본문 위 작은 폰트로 직접 필기. drag = 전체 widget (textarea 외부),
// edit = textarea focus, delete = hover 시만 노출되는 ✕ 버튼. AC9-e: textarea value
// attribute escapeHtml, innerHTML 미사용.
function renderTextBox(subjectId: string, tb: PdfTextBox): string {
  return `
    <article
      class="pdf-textbox is-inline"
      style="left: ${tb.position.x * 100}%; top: ${tb.position.y * 100}%;"
      data-textbox-id="${tb.id}"
      role="group"
      aria-label="텍스트 박스"
    >
      <span
        class="pdf-textbox-grip"
        data-action="drag-textbox-handle"
        data-textbox-id="${tb.id}"
        aria-label="텍스트 박스 이동"
        role="button"
        tabindex="0"
      >⋮⋮</span>
      <textarea
        class="pdf-textbox-inline-input"
        data-action="update-textbox-content"
        data-subject-id="${subjectId}"
        data-textbox-id="${tb.id}"
        placeholder="텍스트"
        rows="1"
      >${escapeHtml(tb.content)}</textarea>
      <button
        type="button"
        class="pdf-textbox-delete"
        aria-label="텍스트 박스 삭제"
        data-action="delete-textbox"
        data-subject-id="${subjectId}"
        data-textbox-id="${tb.id}"
      >×</button>
    </article>
  `;
}

// sprint-12/slice-3: checklist widget renderer.
// AC9-e: label rendered via <input value="..."> DOM attribute (innerHTML 금지).
//   escapeHtml applied on value to prevent attribute injection.
// AC9-g: data-* attrs = id references only (data-checklist-id, data-item-id).
//   No data-label, no title="${label}", no aria-label="${label}".
//   Placeholder is a fixed string; label is NOT read back from DOM.
// Drag: header bar (data-action="checklist-drag-handle") handles pointerdown.
// Size: CSS content-based auto expand (no fixed width/height — R4 schema).
// R11: collapsed: boolean — 접힘 시 items + add-item 버튼 숨김 (is-collapsed CSS 클래스).
//   toggle button (▶/▼) = AC9-e: static text, aria-expanded 반전.
//   header 카운트 표시 (접힘 시): "(체크된 수/전체 수)".
function renderChecklist(subjectId: string, cl: PdfChecklist): string {
  const isCollapsed = cl.collapsed !== false; // default true — boolean coercion (누락 시 접힘)
  const checkedCount = cl.items.filter((item) => item.checked).length;
  const totalCount = cl.items.length;
  const countLabel = isCollapsed ? ` (${checkedCount}/${totalCount})` : "";
  const toggleArrow = isCollapsed ? "▶" : "▼";
  const itemsContainerId = `pdf-checklist-items-${cl.id}`;

  const itemsHtml = cl.items.map((item) => `
    <li class="pdf-checklist-item" data-item-id="${item.id}">
      <input
        type="checkbox"
        data-action="toggle-checklist-item"
        data-subject-id="${subjectId}"
        data-checklist-id="${cl.id}"
        data-item-id="${item.id}"
        ${item.checked ? "checked" : ""}
      />
      <input
        type="text"
        class="pdf-checklist-item-label"
        data-action="update-checklist-item-label"
        data-subject-id="${subjectId}"
        data-checklist-id="${cl.id}"
        data-item-id="${item.id}"
        value="${escapeHtml(item.label)}"
        placeholder="항목 이름"
        maxlength="500"
      />
      <button
        type="button"
        class="pdf-checklist-item-delete"
        data-action="delete-checklist-item"
        data-subject-id="${subjectId}"
        data-checklist-id="${cl.id}"
        data-item-id="${item.id}"
        aria-label="항목 삭제"
      >✕</button>
    </li>
  `).join("");

  return `
    <div
      class="pdf-checklist${isCollapsed ? " is-collapsed" : ""}"
      data-checklist-id="${cl.id}"
      style="left: ${cl.position.x * 100}%; top: ${cl.position.y * 100}%;"
    >
      <div
        class="pdf-checklist-header"
        data-action="checklist-drag-handle"
        data-checklist-id="${cl.id}"
        aria-label="체크리스트 이동"
        role="button"
        tabindex="0"
      >
        <button
          type="button"
          class="pdf-checklist-toggle"
          data-action="toggle-checklist-collapsed"
          data-subject-id="${subjectId}"
          data-checklist-id="${cl.id}"
          aria-expanded="${isCollapsed ? "false" : "true"}"
          aria-controls="${itemsContainerId}"
          aria-label="${isCollapsed ? "체크리스트 펼치기" : "체크리스트 접기"}"
        >${toggleArrow}</button>
        <span class="pdf-checklist-title">체크리스트${escapeHtml(countLabel)}</span>
        <button
          type="button"
          class="pdf-checklist-delete"
          data-action="delete-checklist"
          data-subject-id="${subjectId}"
          data-checklist-id="${cl.id}"
          aria-label="체크리스트 삭제"
        >✕</button>
      </div>
      <ul class="pdf-checklist-items" id="${itemsContainerId}">
        ${itemsHtml}
      </ul>
      <button
        type="button"
        class="pdf-checklist-add-item"
        data-action="add-checklist-item"
        data-subject-id="${subjectId}"
        data-checklist-id="${cl.id}"
      >+ 항목 추가</button>
    </div>
  `;
}

function renderInkStroke(stroke: PdfInkStroke): string {
  return `
    <polyline
      class="ink-stroke"
      points="${stroke.points.map(formatSvgPoint).join(" ")}"
      style="stroke: ${stroke.color}; stroke-width: ${stroke.width};"
    />
  `;
}

function renderSubjectPage(subject: SubjectNote): string {
  const coverage = getSubjectCoverage(subject);
  const mustKnowConcepts = subject.summary.mustKnowConceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
      <h1>${subject.title} 총정리</h1>
      <p class="lede">${subject.summary.goal}</p>
      <div class="hero-actions">
        <button class="action-button" type="button" data-action="generate-subject-note" data-subject-id="${subject.id}">
          10분 정리노트 만들기
        </button>
        <a class="action-button" href="${subjectPdfWorkspacePath(subject)}">PDF 작업공간 열기</a>
        <a class="action-link" href="${subjectIntakePath(subject)}">${subject.title} 자료 넣기</a>
      </div>
    </section>

    ${renderQuickNotePanel(subject, ["subject"])}

    <section class="metric-grid" aria-label="${subject.title} 현황">
      ${renderMetric("키워드 반영률", `${coverage.coverageRate}%`, `${coverage.covered}/${coverage.total}개 반영`)}
      ${renderMetric("수업일", `${subject.weekNotes.length}개 노트`, "날짜별 노트")}
      ${renderMetric("시험 범위", subject.summary.weekRange, subject.examLabel)}
    </section>

    <section aria-labelledby="summary-title">
      <p class="meta">§1 — 과목 요약</p>
      <h2 id="summary-title">시험 전 과목 총정리</h2>
      <div class="summary-grid">
        ${renderSummaryBlock("시험 범위", subject.summary.examScope)}
        ${renderSummaryBlock("복습 전략", subject.summary.strategy)}
        ${renderSummaryBlock("취약 포인트", subject.summary.weakSpots.join(", "))}
      </div>
    </section>

    <section aria-labelledby="weekly-title">
      <p class="meta">§2 — 날짜별 노트</p>
      <h2 id="weekly-title">수업일별 노트</h2>
      <div class="week-card-grid">
        ${subject.weekNotes.map((week) => renderWeekCard(subject, week)).join("")}
      </div>
    </section>

    ${renderQuickNotePanel(subject, ["week"])}

    <section aria-labelledby="keywords-title">
      <p class="meta">§3 — 필수 키워드</p>
      <h2 id="keywords-title">교수님 키워드 반영 상태</h2>
      <div class="keyword-grid">
        ${subject.requiredKeywords.map((keyword) => renderKeyword(keyword, subject)).join("")}
      </div>
    </section>

    ${renderQuickNotePanel(subject, ["keyword"])}

    <section aria-labelledby="concepts-title">
      <p class="meta">§4 — 핵심 개념</p>
      <h2 id="concepts-title">과목 핵심 개념</h2>
      <div class="concept-list">
        ${mustKnowConcepts.map((concept) => renderConcept(concept, subject)).join("")}
      </div>
    </section>

    <section aria-labelledby="sources-title">
      <p class="meta">§5 — 자료 범위</p>
      <h2 id="sources-title">자료와 공개 범위</h2>
      <div class="source-grid">
        ${subject.sources.map((source) => `
          <article class="source-row">
            <p class="meta">${formatSourceKind(source.kind)} · ${formatSourceVisibility(source.visibility)}</p>
            <h3>${source.title}</h3>
            <p>${source.note}</p>
            ${source.pages ? `<p class="source-pages">${source.pages}</p>` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderWeekPage(subject: SubjectNote, week: WeekNote): string {
  const keywords = week.requiredKeywordIds
    .map((keywordId) => getKeywordById(subject, keywordId))
    .filter((keyword): keyword is RequiredKeyword => Boolean(keyword));
  const concepts = week.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const questions = week.exampleQuestionIds
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));
  const sources = week.sourceMaterialIds
    .map((sourceId) => getSourceById(subject, sourceId))
    .filter((source): source is SourceMaterial => Boolean(source));

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.title} · ${week.label} · ${formatReviewStatus(week.reviewStatus)}</p>
      <h1>${week.title}</h1>
      <p class="lede">${week.focus}</p>
      <div class="hero-actions">
        <button class="action-button" type="button" data-action="generate-week-note" data-subject-id="${subject.id}" data-week-id="${week.id}">
          이 수업일 정리노트 만들기
        </button>
        <a class="action-link" href="${subjectPath(subject)}">과목 총정리로 돌아가기</a>
      </div>
    </section>

    ${renderQuickNotePanel(subject, ["week"])}

    <section aria-labelledby="week-overview-title">
      <p class="meta">§1 — 수업일 개요</p>
      <h2 id="week-overview-title">이 수업일에서 볼 것</h2>
      <div class="week-note-grid">
        ${renderWeekColumn("키워드", keywords.map((keyword) => keyword.label))}
        ${renderWeekColumn("개념", concepts.map((concept) => concept.title))}
        ${renderWeekColumn("자료", sources.map((source) => source.title))}
      </div>
    </section>

    <section aria-labelledby="week-concepts-title">
      <p class="meta">§2 — 개념</p>
      <h2 id="week-concepts-title">개념 설명</h2>
      <div class="concept-list">
        ${concepts.map((concept) => renderConcept(concept, subject)).join("") || '<p class="empty-note">아직 연결된 개념이 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-practice-title">
      <p class="meta">§3 — 문제 풀이</p>
      <h2 id="week-practice-title">예제문제</h2>
      <div class="question-list">
        ${questions.map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>
  `;
}

// slice-3: PDF 작업공간 index 페이지 — 4 과목 카드 그리드.
// 카드 클릭 → #/subjects/<id>/pdf-workspace (subjectPdfWorkspacePath 사용 — BC safe).
function renderPdfWorkspaceIndex(studyNotebook: StudyNotebook): string {
  const cards = studyNotebook.subjects
    .map(
      (subject) => `
    <article class="subject-card">
      <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
      <h3>${subject.title}</h3>
      <p>${subject.summary.goal}</p>
      <div class="subject-card-footer">
        <a class="action-button" href="${subjectPdfWorkspacePath(subject)}">열기</a>
      </div>
    </article>
  `
    )
    .join("");

  return `
    <section class="subject-page-hero">
      <p class="meta">PDF 작업공간</p>
      <h1>과목별 PDF 작업공간</h1>
      <p class="lede">과목을 선택해 PDF 열람 · 필기 작업공간으로 이동합니다.</p>
    </section>
    <section aria-labelledby="pdf-workspaces-title">
      <p class="meta">과목 선택</p>
      <h2 id="pdf-workspaces-title">작업공간 목록</h2>
      <div class="subject-grid">
        ${cards}
      </div>
    </section>
  `;
}

function renderNotFound(): string {
  return `
    <section class="subject-page-hero">
      <p class="meta">찾을 수 없음</p>
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p class="lede">홈에서 과목을 다시 선택하세요.</p>
      <p><a href="#/">홈으로 돌아가기</a></p>
    </section>
  `;
}

function renderMetric(label: string, value: string, description: string): string {
  return `
    <article class="metric-card">
      <p class="meta">${label}</p>
      <strong>${value}</strong>
      <span>${description}</span>
    </article>
  `;
}

function renderSubjectCard(subject: SubjectNote): string {
  const coverage = getSubjectCoverage(subject);

  return `
    <article class="subject-card">
      <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
      <h3>${subject.title}</h3>
      <p>${subject.summary.goal}</p>
      <div class="subject-card-footer">
        <span>${coverage.coverageRate}% 키워드 반영</span>
        <a href="${subjectPath(subject)}">과목 들어가기</a>
      </div>
    </article>
  `;
}

function renderSubjectImportCard(subject: SubjectNote): string {
  const coverage = getSubjectCoverage(subject);

  return `
    <article class="subject-card">
      <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
      <h3>${subject.title}</h3>
      <p>이 과목의 수업일별 Claude JSON만 가져옵니다.</p>
      <div class="subject-card-footer">
        <span>${coverage.coverageRate}% 키워드 반영</span>
        <a href="${subjectIntakePath(subject)}">자료 넣기</a>
      </div>
    </article>
  `;
}

function renderWeekCard(subject: SubjectNote, week: WeekNote): string {
  return `
    <article class="week-card">
      <p class="meta">${week.label} · ${formatReviewStatus(week.reviewStatus)}</p>
      <h3>${week.title}</h3>
      <p>${week.focus}</p>
      <div class="week-card-actions">
        <button class="inline-action" type="button" data-action="generate-week-note" data-subject-id="${subject.id}" data-week-id="${week.id}">
          정리노트 만들기
        </button>
        <a href="${weekPath(subject, week)}">전체 보기</a>
      </div>
    </article>
  `;
}

function renderSummaryBlock(label: string, value: string): string {
  return `
    <article class="summary-block">
      <p class="meta">${label}</p>
      <p>${value}</p>
    </article>
  `;
}

function renderKeyword(keyword: RequiredKeyword, subject: SubjectNote): string {
  const linkedConcepts = keyword.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const buttonLabel =
    keyword.status === "covered" ? "정리노트 만들기" : "보강 템플릿 만들기";

  return `
    <article class="keyword-card ${keyword.status === "covered" ? "is-covered" : "is-missing"}">
      <div class="keyword-card-header">
        <h3>${keyword.label}</h3>
        <span>${formatKeywordStatus(keyword.status)}</span>
      </div>
      <p>${keyword.professorSignal}</p>
      <div class="linked-concepts">
        ${
          linkedConcepts.length > 0
            ? linkedConcepts.map((concept) => `<span>${concept.title}</span>`).join("")
            : "<span>추가 개념 정리 필요</span>"
        }
      </div>
      <div class="keyword-actions">
        <button class="inline-action" type="button" data-action="generate-keyword-note" data-subject-id="${subject.id}" data-keyword-id="${keyword.id}">
          ${buttonLabel}
        </button>
      </div>
    </article>
  `;
}

function renderQuickNotePanel(
  subject: SubjectNote,
  origins: QuickNote["origin"][]
): string {
  if (!quickNote || quickNote.subjectId !== subject.id || !origins.includes(quickNote.origin)) {
    return "";
  }

  return `
    <section id="quick-note" class="quick-note-panel" aria-labelledby="quick-note-title">
      <div class="quick-note-header">
        <div>
          <p class="meta">정리노트 · ${formatQuickNoteStatus(quickNote.status)}</p>
          <h2 id="quick-note-title">${quickNote.title}</h2>
          <p>${quickNote.subtitle}</p>
        </div>
        <button class="secondary-action" type="button" data-action="clear-quick-note">
          닫기
        </button>
      </div>
      <div class="quick-note-body">
        ${quickNote.sections.map((section) => `
          <article class="quick-note-section">
            <h3>${section.heading}</h3>
            <ul>
              ${section.body.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </article>
        `).join("")}
      </div>
      ${
        quickNote.primaryHref && quickNote.primaryLabel
          ? `<a class="action-link" href="${quickNote.primaryHref}">${quickNote.primaryLabel}</a>`
          : ""
      }
    </section>
  `;
}

function buildSubjectQuickNote(subject: SubjectNote): QuickNote {
  const mustKnowConcepts = subject.summary.mustKnowConceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const missingKeywords = subject.requiredKeywords
    .filter((keyword) => keyword.status === "missing")
    .map((keyword) => keyword.label);

  return {
    origin: "subject",
    subjectId: subject.id,
    title: `${subject.title} 10분 정리노트`,
    subtitle: `${subject.examLabel} ${subject.summary.weekRange} 범위를 시험 직전 순서로 압축했습니다.`,
    status: missingKeywords.length > 0 ? "needs-fill" : "ready",
    sections: [
      {
        heading: "시험 범위",
        body: [subject.summary.examScope, subject.summary.strategy]
      },
      {
        heading: "반드시 볼 개념",
        body: mustKnowConcepts.map((concept) => `${concept.title}: ${concept.summary}`)
      },
      {
        heading: "마지막 보강",
        body:
          missingKeywords.length > 0
            ? missingKeywords.map((label) => `${label}: 강의자료 기반 보강 필요`)
            : ["현재 missing 키워드는 없습니다."]
      }
    ],
    primaryHref: subjectIntakePath(subject),
    primaryLabel: "자료 보강하기"
  };
}

function buildKeywordQuickNote(
  subject: SubjectNote,
  keyword: RequiredKeyword
): QuickNote {
  const concepts = keyword.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const questions = concepts.flatMap((concept) =>
    concept.exampleQuestionIds
      .map((questionId) => getQuestionById(subject, questionId))
      .filter((question): question is ExampleQuestion => Boolean(question))
  );

  if (keyword.status === "missing" || concepts.length === 0) {
    return {
      origin: "keyword",
      subjectId: subject.id,
      title: `${keyword.label} 보강 템플릿`,
      subtitle: "아직 연결된 핵심 개념이 부족합니다. Claude JSON을 만들 때 아래 항목을 채우면 됩니다.",
      status: "needs-fill",
      sections: [
        {
          heading: "교수님 신호",
          body: [keyword.professorSignal]
        },
        {
          heading: "채워야 할 내용",
          body: [
            "개념 정의 1문장",
            "쉬운 설명 1문장",
            "교수님 PDF 출처 페이지",
            "기본 문제 1개와 해설"
          ]
        }
      ],
      primaryHref: subjectIntakePath(subject),
      primaryLabel: `${subject.title} 자료 넣기`
    };
  }

  return {
    origin: "keyword",
    subjectId: subject.id,
    title: `${keyword.label} 미니 정리노트`,
    subtitle: keyword.professorSignal,
    status: "ready",
    sections: [
      {
        heading: "핵심 정의",
        body: concepts.map((concept) => `${concept.title}: ${concept.summary}`)
      },
      {
        heading: "쉽게 이해",
        body: concepts.map((concept) => concept.easyExplanation)
      },
      {
        heading: "출처 힌트",
        body: concepts.flatMap((concept) => concept.sourceHints)
      },
      {
        heading: "바로 풀 문제",
        body:
          questions.length > 0
            ? questions.slice(0, 2).map((question) => `${question.prompt} / 답: ${question.answer}`)
            : ["아직 연결된 예제문제가 없습니다."]
      }
    ]
  };
}

function buildWeekQuickNote(subject: SubjectNote, week: WeekNote): QuickNote {
  const keywords = week.requiredKeywordIds
    .map((keywordId) => getKeywordById(subject, keywordId))
    .filter((keyword): keyword is RequiredKeyword => Boolean(keyword));
  const concepts = week.conceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const questions = week.exampleQuestionIds
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));

  return {
    origin: "week",
    subjectId: subject.id,
    title: `${week.label} ${week.title} 정리노트`,
    subtitle: week.focus,
    status: week.reviewStatus === "ready" ? "ready" : "needs-fill",
    sections: [
      {
        heading: "키워드",
        body: keywords.map((keyword) => `${keyword.label}: ${keyword.professorSignal}`)
      },
      {
        heading: "개념 요약",
        body:
          concepts.length > 0
            ? concepts.map((concept) => `${concept.title}: ${concept.summary}`)
            : ["아직 연결된 개념이 없습니다."]
      },
      {
        heading: "확인 문제",
        body:
          questions.length > 0
            ? questions.map((question) => `${question.prompt} / 답: ${question.answer}`)
            : ["아직 연결된 예제문제가 없습니다."]
      }
    ],
    primaryHref: weekPath(subject, week),
    primaryLabel: "수업일 노트로 이동"
  };
}

function renderConcept(concept: Concept, subject: SubjectNote): string {
  const questions = concept.exampleQuestionIds
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));

  return `
    <article class="concept-row" id="${concept.id}">
      <div class="concept-main">
        <p class="meta">${formatConceptPriority(concept.priority)}</p>
        <h3>${concept.title}</h3>
        <p>${concept.summary}</p>
        <p class="plain-explanation">${concept.easyExplanation}</p>
      </div>
      <aside class="concept-side">
        <strong>출처 힌트</strong>
        <ul>
          ${concept.sourceHints.map((hint) => `<li>${hint}</li>`).join("")}
        </ul>
        <strong>연결 문제</strong>
        <p>${questions.length}개</p>
      </aside>
    </article>
  `;
}

function renderQuestion(question: ExampleQuestion): string {
  return `
    <details class="question-row">
      <summary>
        <span class="question-difficulty">${formatQuestionDifficulty(question.difficulty)}</span>
        <span>${question.prompt}</span>
      </summary>
      <div class="answer-panel">
        <strong>정답</strong>
        <p>${question.answer}</p>
        <strong>해설</strong>
        <p>${question.explanation}</p>
      </div>
    </details>
  `;
}

function formatQuickNoteStatus(status: QuickNote["status"]): string {
  return status === "ready" ? "바로 읽기" : "보강 필요";
}

function formatKeywordStatus(status: RequiredKeyword["status"]): string {
  return status === "covered" ? "반영됨" : "보강 필요";
}

function formatConceptPriority(priority: Concept["priority"]): string {
  const labels: Record<Concept["priority"], string> = {
    "must-know": "필수 개념",
    high: "중요 개념",
    review: "복습 개념"
  };

  return labels[priority];
}

function formatReviewStatus(status: WeekNote["reviewStatus"]): string {
  return status === "ready" ? "읽기 가능" : "보강 필요";
}

function formatQuestionDifficulty(difficulty: ExampleQuestion["difficulty"]): string {
  return difficulty === "basic" ? "기본" : "응용";
}

function formatSourceKind(kind: SourceMaterial["kind"]): string {
  const labels: Record<SourceMaterial["kind"], string> = {
    "professor-pdf": "교수님 PDF",
    "claude-summary": "Claude 요약",
    "manual-keyword": "수동 키워드"
  };

  return labels[kind];
}

function formatSourceVisibility(visibility: SourceMaterial["visibility"]): string {
  const labels: Record<SourceMaterial["visibility"], string> = {
    "private-source": "원문 비공개",
    "derived-note-only": "생성 노트만 공유"
  };

  return labels[visibility];
}

function formatPdfTool(tool: LocalPdfTool): string {
  const labels: Record<LocalPdfTool, string> = {
    read: "읽기",
    sticky: "포스트잇",
    pen: "펜",
    eraser: "지우개",
    text: "텍스트 박스",
    checklist: "체크리스트"
  };

  return labels[tool];
}

function formatStickyBlockKind(kind: StickyNoteBlockKind): string {
  const labels: Record<StickyNoteBlockKind, string> = {
    text: "텍스트",
    checklist: "체크",
    table: "표",
    "chart-note": "그래프"
  };

  return labels[kind];
}

function formatSvgPoint(point: { x: number; y: number }): string {
  return `${Math.round(point.x * 1000)},${Math.round(point.y * 1414)}`;
}

function renderWeekColumn(label: string, values: string[]): string {
  return `
    <div class="week-column">
      <p class="meta">${label}</p>
      ${
        values.length > 0
          ? `<ul>${values.map((value) => `<li>${value}</li>`).join("")}</ul>`
          : '<p class="empty-note">추가 정리 필요</p>'
      }
    </div>
  `;
}
