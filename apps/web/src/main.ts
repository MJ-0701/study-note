import morphdom from "morphdom";
import { sampleLectureNote } from "./data/sampleLectureNote";
import { localIntakeGuide } from "./data/intakeGuide";
import { classSchedule, scheduleRangeLabel } from "./data/classSchedule";
import {
  MaterialApiError,
  createMaterialUploadIntent,
  fetchPdfMaterialFile,
  listPdfMaterials,
  updatePdfMaterialMetadata,
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
  createChart,
  createInkStroke,
  createPdfMaterialFromBackend,
  createStickyNote,
  createTable,
  createTextBox,
  deleteChecklist,
  deleteChecklistItem,
  deleteChart,
  deleteTable,
  deleteTextBox,
  estimatePdfPageCount,
  formatPdfFileSize,
  getSubjectPdfWorkspace,
  hydrateSubjectPdfWorkspace,
  moveChart,
  moveChecklist,
  moveTable,
  moveTextBox,
  normalizePdfPoint,
  pdfWorkspaceStorageKey,
  setEraserShape,
  setEraserSize,
  toggleChecklistCollapsed,
  toggleChecklistItem,
  toggleChartCollapsed,
  toggleTableCollapsed,
  updateChartContent,
  updateChecklistItemLabel,
  updateTableContent,
  updateTextBoxContent,
  type PdfChecklist,
  type PdfChart,
  type PdfInkPoint,
  type PdfInkStroke,
  type PdfMaterialDraft,
  type PdfTable,
  type PdfTextBox,
  type PdfWorkspaceStore,
  type PdfWorkspaceTool,
  type StickyNoteBlockKind,
  type SubjectPdfWorkspace
} from "@study-note/domain";
import "./styles.css";

const isNodeRuntime =
  typeof (globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node === "string";
const isBrowserRuntime = typeof window !== "undefined" && typeof document !== "undefined" && !isNodeRuntime;
const PDF_MATERIAL_UNASSIGNED_CLASS_DATE = "metadata-pending";

type Route =
  | { name: "home" }
  | { name: "intake" }
  | { name: "pdf-workspaces" }
  | { name: "subject"; subjectId: string }
  | { name: "subject-class"; subjectId: string }
  | { name: "subject-summaries"; subjectId: string }
  | { name: "subject-summary-detail"; subjectId: string; weekId: string }
  | { name: "subject-mcp"; subjectId: string }
  | { name: "subject-memorize"; subjectId: string }
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

type AuthBootNotice = "checking" | "waking" | "retryable";

type AuthMode = "login" | "signup";

export type InspectorDrillType = "sticky" | "ink" | "textbox" | "checklist" | "table" | "chart";

export type InspectorDrillState = Record<InspectorDrillType, boolean>;

interface PendingDrillHighlight {
  subjectId: string;
  drillType: InspectorDrillType;
  annotationId: string;
  remainingAttempts: number;
  expiresAt: number;
}

interface ActiveDrillHighlight {
  subjectId: string;
  drillType: InspectorDrillType;
  annotationId: string;
  expiresAt: number;
}

type LoginFeedback =
  | {
      kind: "error" | "success";
      title: string;
      detail: string;
    }
  | undefined;

const notebookStorageKey = "study-note.notebook.v2";
const inspectorDrillStorageKey = "studyNote.pdfWorkspace.inspectorDrill";
// sprint-2/S3 fix (codex P1): persisted marker for the last successfully
// attached session's userId. Used to detect A→B account switches on the same
// browser so we can wipe local notebook + pdfWorkspaceStore before autosave
// PUTs leak user A's content into user B's server record. Stored in
// localStorage so the marker survives page reloads (otherwise B opening a
// fresh tab over A's stored notebook would not be detected as a switch).
const lastSessionUserStorageKey = "study-note.session.lastUserId";
const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? "/api";
const PDF_FRAME_READY_DELAY_MS = 180;
const DRILL_HIGHLIGHT_DURATION_MS = 1500;
const DRILL_HIGHLIGHT_RETRY_DELAY_MS = 50;
const DRILL_HIGHLIGHT_MAX_ATTEMPTS = 3;
const DRILL_HIGHLIGHT_EXPIRES_MS = 4000;
const AUTH_SESSION_WAKE_NOTICE_DELAY_MS = 2500;
// ACA scale-to-zero cold start can take ~30s on first hit. Keep the per-request
// timeout above that so /v1/auth/me does not abort prematurely; the "waking"
// banner already shows after AUTH_SESSION_WAKE_NOTICE_DELAY_MS so the user sees
// progress while we wait.
const AUTH_SESSION_REQUEST_TIMEOUT_MS = 45000;
const AUTH_SESSION_RETRY_DELAY_MS = 3000;
const AUTH_SESSION_MAX_AUTO_RETRIES = 3;
let notebook: StudyNotebook = isBrowserRuntime ? loadStoredNotebook() : sampleLectureNote;
let pdfWorkspaceStore: PdfWorkspaceStore = isBrowserRuntime ? loadPdfWorkspaceStore() : { workspaces: {} };
// sprint-2/S3 fix (codex P1): see lastSessionUserStorageKey comment for the
// invariant this enforces. Initialized from localStorage so a page reload
// after user A's session retains A's identity until the next sign-in/auth-me
// success either confirms A (no wipe) or detects B (wipe).
let lastSessionUserId: string | undefined = isBrowserRuntime
  ? window.localStorage.getItem(lastSessionUserStorageKey) ?? undefined
  : undefined;
// sprint-11/slice-1: inspector toggle state (localStorage persistence §9.4).
// Default = false (접힘). Restored from localStorage on page load.
let inspectorOpen = isBrowserRuntime ? readInspectorOpen() : false;
let inspectorDrill: InspectorDrillState = readInspectorDrill();
let pendingDrillHighlight: PendingDrillHighlight | null = null;
const activeDrillHighlights = new Map<string, ActiveDrillHighlight>();
const activeDrillHighlightTimers = new Map<string, ReturnType<typeof setTimeout>>();
// slice-2: auth state is in-memory only (F2 — no localStorage for session).
// Rehydrated on app boot via GET /v1/auth/me with cookie.
let authSession: AuthSession | undefined;
let authBootState: AuthBootState = "checking";
let authBootNotice: AuthBootNotice = "checking";
let authBootRequestId = 0;
let authBootNoticeTimer: ReturnType<typeof setTimeout> | undefined;
let authBootRetryTimer: ReturnType<typeof setTimeout> | undefined;
// slice-3 (sign-up UX): current auth form tab ("login" | "signup").
let authMode: AuthMode = "login";
const activePdfObjectUrls = new Map<string, string>();
const activePdfObjectUrlMaterialIds = new Map<string, string>();
const activePdfPreviewLoads = new Set<string>();
const failedPdfPreviewLoadKeys = new Set<string>();
const loadedPdfFrameKeys = new Set<string>();
const pdfFrameReadyTimers = new Map<string, ReturnType<typeof setTimeout>>();
let pendingPdfPageTransition:
  | { subjectId: string; materialId: string; fromPage: number; toPage: number }
  | undefined;
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
// sprint-13/slice-2: tracks an in-progress table drag (header pointerdown -> pointerup).
let activeTableDrag: {
  subjectId: string;
  tableId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startNormX: number;
  startNormY: number;
} | undefined;
// sprint-13/slice-3: tracks an in-progress chart drag (header pointerdown -> pointerup).
let activeChartDrag: {
  subjectId: string;
  chartId: string;
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
const app = isBrowserRuntime ? document.querySelector<HTMLDivElement>("#app") : null;

interface ActiveInkStroke {
  subjectId: string;
  pointerId: number;
  pageNumber: number;
  points: PdfInkPoint[];
  livePolyline: SVGPolylineElement;
}

if (isBrowserRuntime && !app) {
  throw new Error("App mount target #app is missing");
}

const appRoot = app;

// sprint-12/slice-7: morphdom DOM diff 도입.
// 이전 = appRoot.innerHTML = html 매 호출 시 전체 DOM teardown + rebuild → PDF iframe
// 재생성 → blob URL 재로드 → 점멸. morphdom = element-level diff, iframe element 의
// src attribute 가 동일하면 setAttribute 호출 X → iframe reload 0 = 점멸 해결.
function renderInto(html: string): void {
  if (!appRoot) {
    return;
  }

  // morphdom 가 wrapper element 의 children 만 diff 적용.
  const wrapper = document.createElement("div");
  wrapper.id = appRoot.id;
  wrapper.innerHTML = html;
  morphdom(appRoot, wrapper, {
    childrenOnly: true,
    getNodeKey(node) {
      if (node instanceof HTMLElement && node.dataset.pdfFrameKey) {
        return node.dataset.pdfFrameKey;
      }

      return node instanceof Element ? node.id : undefined;
    },
    onBeforeElUpdated(fromEl, toEl) {
      if (shouldReplacePdfFrame(fromEl, toEl)) {
        fromEl.replaceWith(toEl.cloneNode(true));
        return false;
      }

      return true;
    }
  });
  refreshTableWidgets();
  refreshChartWidgets();
  applyQueuedDrillHighlight();
  refreshActiveDrillHighlights();
}

function shouldReplacePdfFrame(fromEl: Element, toEl: Element): boolean {
  if (fromEl.tagName !== "IFRAME" || toEl.tagName !== "IFRAME") {
    return false;
  }

  const fromFrame = fromEl as HTMLElement;
  const toFrame = toEl as HTMLElement;

  if (fromFrame.dataset.pdfFrame !== "true" || toFrame.dataset.pdfFrame !== "true") {
    return false;
  }

  return (
    fromFrame.dataset.materialId !== toFrame.dataset.materialId ||
    fromEl.getAttribute("src") !== toEl.getAttribute("src")
  );
}

function getDrillHighlightSelector(type: InspectorDrillType): string {
  if (type === "sticky") return "[data-note-id]";
  if (type === "ink") return "[data-stroke-id]";
  if (type === "textbox") return "[data-textbox-id]";
  if (type === "checklist") return "[data-checklist-id]";
  if (type === "table") return "[data-table-id]";
  return "[data-chart-id]";
}

function getDrillHighlightDatasetKey(type: InspectorDrillType): string {
  if (type === "sticky") return "noteId";
  if (type === "ink") return "strokeId";
  if (type === "textbox") return "textboxId";
  if (type === "checklist") return "checklistId";
  if (type === "table") return "tableId";
  return "chartId";
}

function getElementDataset(element: Element): Record<string, string | undefined> {
  return (element as HTMLElement | SVGElement).dataset as Record<string, string | undefined>;
}

function findDrillHighlightElement(
  container: ParentNode,
  drillType: InspectorDrillType,
  annotationId: string
): Element | null {
  const selector = getDrillHighlightSelector(drillType);
  const datasetKey = getDrillHighlightDatasetKey(drillType);
  return Array.from(container.querySelectorAll(selector))
    .find((element) => getElementDataset(element)[datasetKey] === annotationId) ?? null;
}

export function applyPendingDrillHighlight(
  container: ParentNode,
  drillType: InspectorDrillType,
  annotationId: string
): boolean {
  const element = findDrillHighlightElement(container, drillType, annotationId);

  if (!element) {
    return false;
  }

  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  element.classList.add("is-highlight-pulse");
  setTimeout(() => {
    element.classList.remove("is-highlight-pulse");
  }, DRILL_HIGHLIGHT_DURATION_MS);
  return true;
}

function findPdfAnnotationSurface(container: ParentNode, subjectId: string): ParentNode | null {
  return Array.from(container.querySelectorAll("[data-pdf-annotation-surface]"))
    .find((element) => getElementDataset(element).subjectId === subjectId) ?? null;
}

function getDrillHighlightKey(target: Pick<ActiveDrillHighlight, "subjectId" | "drillType" | "annotationId">): string {
  return `${target.subjectId}:${target.drillType}:${target.annotationId}`;
}

function applyTrackedDrillHighlight(target: ActiveDrillHighlight, shouldScroll: boolean): boolean {
  if (!appRoot) {
    return false;
  }

  const remainingMs = target.expiresAt - Date.now();
  const key = getDrillHighlightKey(target);

  if (remainingMs <= 0) {
    activeDrillHighlights.delete(key);
    activeDrillHighlightTimers.delete(key);
    return false;
  }

  const surface = findPdfAnnotationSurface(appRoot, target.subjectId);
  const element = surface
    ? findDrillHighlightElement(surface, target.drillType, target.annotationId)
    : null;

  if (!element) {
    return false;
  }

  if (shouldScroll && typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  element.classList.add("is-highlight-pulse");
  activeDrillHighlights.set(key, target);

  const previousTimer = activeDrillHighlightTimers.get(key);
  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  const timer = setTimeout(() => {
    const currentSurface = appRoot ? findPdfAnnotationSurface(appRoot, target.subjectId) : null;
    const currentElement = currentSurface
      ? findDrillHighlightElement(currentSurface, target.drillType, target.annotationId)
      : null;
    currentElement?.classList.remove("is-highlight-pulse");
    activeDrillHighlights.delete(key);
    activeDrillHighlightTimers.delete(key);
  }, Math.max(0, remainingMs));

  activeDrillHighlightTimers.set(key, timer);
  return true;
}

function refreshActiveDrillHighlights(): void {
  for (const target of activeDrillHighlights.values()) {
    applyTrackedDrillHighlight(target, false);
  }
}

function scheduleDrillHighlightRetry(target: PendingDrillHighlight): void {
  queueMicrotask(() => {
    setTimeout(() => {
      if (pendingDrillHighlight === target) {
        applyQueuedDrillHighlight();
      }
    }, DRILL_HIGHLIGHT_RETRY_DELAY_MS);
  });
}

function applyQueuedDrillHighlight(): void {
  if (!pendingDrillHighlight || !appRoot) {
    return;
  }

  const target = pendingDrillHighlight;

  if (Date.now() > target.expiresAt) {
    pendingDrillHighlight = null;
    return;
  }

  const surface = findPdfAnnotationSurface(appRoot, target.subjectId);
  const applied = surface
    ? applyTrackedDrillHighlight({
        subjectId: target.subjectId,
        drillType: target.drillType,
        annotationId: target.annotationId,
        expiresAt: Date.now() + DRILL_HIGHLIGHT_DURATION_MS
      }, true)
    : false;

  if (applied) {
    pendingDrillHighlight = null;
    return;
  }

  target.remainingAttempts -= 1;
  if (target.remainingAttempts <= 0) {
    pendingDrillHighlight = null;
    return;
  }

  scheduleDrillHighlightRetry(target);
}

if (isBrowserRuntime) {
  document.addEventListener("change", handleDocumentChange);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("load", handleDocumentLoad, true);
  document.addEventListener("submit", handleDocumentSubmit);
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("pointermove", handleDocumentPointerMove);
  document.addEventListener("pointerup", handleDocumentPointerUp);
  document.addEventListener("pointercancel", handleDocumentPointerUp);
  document.addEventListener("keydown", handleDocumentKeyDown);
  document.addEventListener("fullscreenchange", () => {
    // sprint-1/S3: re-render so the toolbar button label reflects current
    // fullscreen state ("전체화면" → "전체화면 종료").
    renderApp();

    // hotfix: when exiting fullscreen, scroll back to the PDF workspace section
    // so the viewport lands where the user entered fullscreen from instead of
    // jumping to the top of the page.
    if (!document.fullscreenElement) {
      queueMicrotask(() => {
        const target = document.getElementById(PDF_WORKSPACE_ROOT_ID);
        if (target) {
          target.scrollIntoView({ block: "start", behavior: "auto" });
        }
      });
    }
  });
  window.addEventListener("hashchange", () => {
    // sprint-1/S2: close transient overlays on route change so they do not
    // bleed across pages (the hotkey help modal is only meaningful on the PDF
    // workspace).
    hotkeyHelpModalOpen = false;
    renderApp();
  });
  renderApp();

  // slice-2: always rehydrate from server — cookie carries the session token.
  void revalidateStoredSession();
}

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

function getDefaultInspectorDrill(): InspectorDrillState {
  return {
    sticky: false,
    ink: false,
    textbox: false,
    checklist: false,
    table: false,
    chart: false
  };
}

function normalizeInspectorDrillType(value: string | undefined): InspectorDrillType | null {
  return value === "sticky" ||
    value === "ink" ||
    value === "textbox" ||
    value === "checklist" ||
    value === "table" ||
    value === "chart"
    ? value
    : null;
}

export function readInspectorDrill(): InspectorDrillState {
  const base = getDefaultInspectorDrill();

  try {
    const raw = localStorage.getItem(inspectorDrillStorageKey);
    if (raw === null) return base;
    const parsed = JSON.parse(raw) as Partial<Record<InspectorDrillType, unknown>>;

    return {
      sticky: parsed.sticky === true,
      ink: parsed.ink === true,
      textbox: parsed.textbox === true,
      checklist: parsed.checklist === true,
      table: parsed.table === true,
      chart: parsed.chart === true
    };
  } catch {
    return base;
  }
}

export function writeInspectorDrill(value: InspectorDrillState): void {
  try {
    localStorage.setItem(inspectorDrillStorageKey, JSON.stringify(value));
  } catch { /* QuotaExceededError 등 → UI 만 영향 */ }
}

export function toggleInspectorDrillState(
  value: InspectorDrillState,
  type: InspectorDrillType
): InspectorDrillState {
  return {
    ...value,
    [type]: !value[type]
  };
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

let notebookStorageErrorReported = false;
let notebookStorageError: string | undefined;

// sprint-2/S2: BE sync layer state — debounce timers + in-flight tracking for
// userNotes / pdf-annotations. Plan §8b: per-resource hot path GET on view,
// debounced PUT (userNotes 500ms, annotations 750ms), max in-flight 3,
// backoff on consecutive 5xx (3회 / 5분 → autosave pause + banner).
const USER_NOTES_PUT_DEBOUNCE_MS = 500;
const ANNOTATION_PUT_DEBOUNCE_MS = 750;
const SYNC_FAILURE_PAUSE_THRESHOLD = 3;
const SYNC_FAILURE_PAUSE_WINDOW_MS = 5 * 60 * 1000;

interface SyncFailureTracker {
  recentFailures: number[];
  paused: boolean;
}

const userNotesPutTimers = new Map<string, ReturnType<typeof setTimeout>>();
const annotationPutTimers = new Map<string, ReturnType<typeof setTimeout>>();
const userNotesFetchedKeys = new Set<string>();
const annotationFetchedKeys = new Set<string>();
// sprint-2/S3 fix (codex P2): track which materialId currently occupies the
// in-memory bundle for `${userId}:${subjectId}`. The previous fix released
// the cache key after every successful GET so material A→B→A revisit would
// re-fetch, but renderApp() re-invokes fetchAnnotationIfMissing on every
// render and the released cache made that a per-render network storm.
// Keep the cache marker set after success and instead force a refetch only
// when the active material differs from the last hydrated material for the
// same subject (the real revisit signal).
const lastHydratedAnnotationByMaterial = new Map<string, string>();
const syncFailureTracker: SyncFailureTracker = {
  recentFailures: [],
  paused: false
};

// sprint-2/S2 fix (codex P1): BE sync 실패 banner 를 localStorage save 실패
// banner 와 분리. saveNotebook 성공 path 가 notebookStorageError 만 clear 하므로,
// BE sync 실패 메시지가 같은 변수에 들어 있으면 사용자가 typing 시 banner 가
// 사라지면서 paused flag 만 남아 silent disabled 상태가 된다. 별도 변수로 분리.
let syncBackendError: string | undefined;
let syncBackendErrorReported = false;

// sprint-2/S3 fix (codex P2): handle 401/403 during background sync. PUT/GET
// for user-notes/annotations silently failed when the session cookie expired;
// the UI kept accepting edits while writes were dropped and the user had no
// signal. Treat 401/403 from those endpoints as "session expired" — clear the
// in-memory session + transient timers via clearAuthSession() and redirect
// to login with a feedback banner. Guarded by a one-shot flag so concurrent
// in-flight requests do not stack multiple banners; the flag resets when a
// new session is attached (revalidate / sign-in).
let authExpiryHandled = false;
function handleAuthExpiredFromSync(): void {
  if (authExpiryHandled) {
    return;
  }
  authExpiryHandled = true;
  clearAuthSession();
  authMode = "login";
  loginFeedback = {
    kind: "error",
    title: "세션이 만료되었습니다.",
    detail: "자동 저장이 중단되어 다시 로그인이 필요합니다."
  };
  try { renderApp(); } catch { /* ignore */ }
}

function recordSyncFailure(): void {
  const now = Date.now();
  syncFailureTracker.recentFailures.push(now);
  syncFailureTracker.recentFailures = syncFailureTracker.recentFailures.filter(
    (ts) => now - ts < SYNC_FAILURE_PAUSE_WINDOW_MS
  );
  if (syncFailureTracker.recentFailures.length >= SYNC_FAILURE_PAUSE_THRESHOLD && !syncFailureTracker.paused) {
    syncFailureTracker.paused = true;
    syncBackendError =
      "메모/필기 BE 저장에 연속 실패했습니다. 자동 동기화를 잠시 멈춥니다. 네트워크/세션 상태를 확인한 뒤 닫기를 눌러 재시작하세요.";
    if (!syncBackendErrorReported) {
      syncBackendErrorReported = true;
      try { renderApp(); } catch { /* ignore */ }
    }
  }
}

// sprint-2/S2 fix (codex P1): PUT success only — unpause autosave (PUT 신호).
// GET success 는 read-only 라 PUT 의 paused 상태를 풀면 안 됨 (사용자가 typing
// 중인데 PUT 은 여전히 500 일 수 있음).
function recordSyncSuccess(): void {
  syncFailureTracker.recentFailures = [];
  if (syncFailureTracker.paused) {
    syncFailureTracker.paused = false;
    syncBackendError = undefined;
    syncBackendErrorReported = false;
    try { renderApp(); } catch { /* ignore */ }
  }
}

// sprint-2/S2 fix (codex P1): GET success — silent. 별도 함수로 분리해 unpause
// 신호 X. 5xx 누적 카운트도 그대로 (PUT 만 카운트).
function recordFetchSuccess(): void {
  /* no-op intentionally — GET 성공이 PUT paused 상태 변경에 영향 없음. */
}

// sprint-2/S2 fix (codex P2): GET failure — silent. PUT paused 카운트에 영향 X.
// read-side 실패가 write-side 차단을 유발하면 안 됨.
function recordFetchFailure(): void {
  /* no-op intentionally — GET 실패가 PUT paused 카운트를 키우지 않는다. */
}

async function putUserNoteToBE(
  subjectId: string,
  weekId: string,
  body: string
): Promise<void> {
  if (syncFailureTracker.paused) {
    return;
  }
  try {
    const response = await fetch(
      `${apiBaseUrl}/v1/notes/subject/${encodeURIComponent(subjectId)}/week/${encodeURIComponent(weekId)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body })
      }
    );
    if (response.status === 413) {
      console.warn("[study-note] userNotes PUT 413 PAYLOAD_TOO_LARGE", weekId);
      return;
    }
    if (response.status === 401 || response.status === 403) {
      console.warn("[study-note] userNotes PUT auth expired", response.status, weekId);
      handleAuthExpiredFromSync();
      return;
    }
    if (!response.ok) {
      console.warn("[study-note] userNotes PUT failed", response.status, weekId);
      if (response.status >= 500) {
        recordSyncFailure();
      }
      return;
    }
    recordSyncSuccess();
  } catch (error) {
    console.warn("[study-note] userNotes PUT network error", error);
    recordSyncFailure();
  }
}

function scheduleUserNotePut(subjectId: string, weekId: string, body: string): void {
  const timerKey = `${subjectId}:${weekId}`;
  const existing = userNotesPutTimers.get(timerKey);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    userNotesPutTimers.delete(timerKey);
    void putUserNoteToBE(subjectId, weekId, body);
  }, USER_NOTES_PUT_DEBOUNCE_MS);
  userNotesPutTimers.set(timerKey, timer);
}

async function fetchUserNoteIfMissing(subjectId: string, weekId: string): Promise<void> {
  // sprint-2/S2 fix (codex P1): scope cache key to authenticated user so
  // logout/login on a shared SPA runtime does not skip GET for the new user.
  const sessionUserId = authSession?.user.id;
  if (!sessionUserId) {
    return;
  }
  const cacheKey = `${sessionUserId}:${subjectId}:${weekId}`;
  if (userNotesFetchedKeys.has(cacheKey)) {
    return;
  }
  userNotesFetchedKeys.add(cacheKey);
  const releaseNoteCache = () => userNotesFetchedKeys.delete(cacheKey);
  try {
    const response = await fetch(
      `${apiBaseUrl}/v1/notes/subject/${encodeURIComponent(subjectId)}/week/${encodeURIComponent(weekId)}`,
      { credentials: "include" }
    );
    if (response.status === 404) {
      // sprint-2/S2 fix (codex P2): release cache so a note created later from
      // another device can be re-fetched in the same session.
      releaseNoteCache();
      return;
    }
    if (response.status === 401 || response.status === 403) {
      // sprint-2/S3 fix (codex P2): GET auth expiry also surfaces re-login.
      releaseNoteCache();
      handleAuthExpiredFromSync();
      return;
    }
    if (!response.ok) {
      // Allow retry on later view by clearing cache marker.
      userNotesFetchedKeys.delete(cacheKey);
      if (response.status >= 500) {
        recordFetchFailure();
      }
      return;
    }
    const payload = (await response.json()) as { body?: unknown; updatedAt?: unknown };
    if (typeof payload.body !== "string") {
      return;
    }
    // sprint-2/S2 fix (codex P1): session re-validate after async resolves —
    // a logout/login between fetch start and resolve must NOT apply user A's
    // server data into user B's notebook.
    if (authSession?.user.id !== sessionUserId) {
      return;
    }
    const incoming = payload.body;
    // sprint-2/S2 fix (codex P1): protect against stale GET overwriting fresh
    // local edits. Skip hydrate when:
    //   (a) the user has a pending debounced PUT for this weekId (still typing),
    //   (b) the active week has a non-empty local userNotes that differs from
    //       the server payload — treat that as a local edit not yet flushed
    //       and let the next PUT carry the local value to the server.
    // Cross-device restore still works on first visit (local empty → hydrate).
    if (userNotesPutTimers.has(`${subjectId}:${weekId}`)) {
      recordFetchSuccess();
      return;
    }
    const localSubject = notebook.subjects.find((subject) => subject.id === subjectId);
    const localWeek = localSubject?.weekNotes.find((week) => week.id === weekId);
    const localValue = typeof localWeek?.userNotes === "string" ? localWeek.userNotes : "";
    if (localValue.length > 0 && localValue !== incoming) {
      recordFetchSuccess();
      return;
    }
    let applied = false;
    notebook = {
      ...notebook,
      subjects: notebook.subjects.map((subject) =>
        subject.id !== subjectId
          ? subject
          : {
              ...subject,
              weekNotes: subject.weekNotes.map((week) => {
                if (week.id !== weekId) {
                  return week;
                }
                if ((week.userNotes ?? "") === incoming) {
                  return week;
                }
                applied = true;
                return { ...week, userNotes: incoming };
              })
            }
      )
    };
    if (applied) {
      saveNotebook(notebook);
      try { renderApp(); } catch { /* ignore */ }
    }
    recordFetchSuccess();
  } catch (error) {
    userNotesFetchedKeys.delete(cacheKey);
    console.warn("[study-note] userNotes GET network error", error);
    recordFetchFailure();
  }
}

async function putAnnotationToBE(materialId: string, payload: unknown): Promise<void> {
  if (syncFailureTracker.paused) {
    return;
  }
  try {
    const response = await fetch(`${apiBaseUrl}/v1/pdf-annotations/${encodeURIComponent(materialId)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload })
    });
    if (response.status === 413) {
      console.warn("[study-note] annotation PUT 413 PAYLOAD_TOO_LARGE", materialId);
      return;
    }
    if (response.status === 401 || response.status === 403) {
      console.warn("[study-note] annotation PUT auth expired", response.status, materialId);
      handleAuthExpiredFromSync();
      return;
    }
    if (!response.ok) {
      console.warn("[study-note] annotation PUT failed", response.status, materialId);
      if (response.status >= 500) {
        recordSyncFailure();
      }
      return;
    }
    recordSyncSuccess();
  } catch (error) {
    console.warn("[study-note] annotation PUT network error", error);
    recordSyncFailure();
  }
}

function scheduleAnnotationPut(materialId: string, payload: unknown): void {
  const existing = annotationPutTimers.get(materialId);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    annotationPutTimers.delete(materialId);
    void putAnnotationToBE(materialId, payload);
  }, ANNOTATION_PUT_DEBOUNCE_MS);
  annotationPutTimers.set(materialId, timer);
}

async function fetchAnnotationIfMissing(subjectId: string, materialId: string): Promise<void> {
  // sprint-2/S2 fix (codex P1): scope cache key to authenticated user.
  const sessionUserId = authSession?.user.id;
  if (!sessionUserId) {
    return;
  }
  const cacheKey = `${sessionUserId}:${subjectId}:${materialId}`;
  const subjectKey = `${sessionUserId}:${subjectId}`;
  // sprint-2/S3 fix (codex P2): force a refetch when the active material
  // differs from the last hydrated material for this subject (real A→B→A
  // revisit signal). For same-material re-renders the cache short-circuit
  // still applies, preventing the per-render network storm caused by the
  // previous "release on success" approach.
  if (
    annotationFetchedKeys.has(cacheKey)
    && lastHydratedAnnotationByMaterial.get(subjectKey) === materialId
  ) {
    return;
  }
  if (lastHydratedAnnotationByMaterial.get(subjectKey) !== materialId) {
    annotationFetchedKeys.delete(cacheKey);
  }
  if (annotationFetchedKeys.has(cacheKey)) {
    return;
  }
  annotationFetchedKeys.add(cacheKey);
  const releaseCache = () => annotationFetchedKeys.delete(cacheKey);
  try {
    const response = await fetch(`${apiBaseUrl}/v1/pdf-annotations/${encodeURIComponent(materialId)}`, {
      credentials: "include"
    });
    if (response.status === 404) {
      // sprint-2/S3 fix (codex P2): 404 = server has no annotation for this
      // material. Keep the cache marker AND record lastHydrated so subsequent
      // re-renders of the same material short-circuit (no storm). Cross-device
      // creation that lands later is rehydrated on material switch revisit.
      lastHydratedAnnotationByMaterial.set(subjectKey, materialId);
      return;
    }
    if (response.status === 401 || response.status === 403) {
      // sprint-2/S3 fix (codex P2): GET auth expiry also surfaces re-login.
      releaseCache();
      handleAuthExpiredFromSync();
      return;
    }
    if (!response.ok) {
      annotationFetchedKeys.delete(cacheKey);
      if (response.status >= 500) {
        recordFetchFailure();
      }
      return;
    }
    const json = (await response.json()) as {
      materialId?: unknown;
      payload?: unknown;
      updatedAt?: unknown;
    };
    // sprint-2/S2 fix (codex P1): session re-validate after async resolves —
    // logout/login between fetch start and resolve must NOT apply user A's
    // server data into user B's workspace.
    if (authSession?.user.id !== sessionUserId) {
      return;
    }
    // sprint-2/S2 fix (codex P1): skip hydrate when a local PUT is still
    // pending for this material — annotation writes are debounced (750ms),
    // so a stale GET could overwrite fresh local edits before the user's
    // changes are flushed to the server.
    if (annotationPutTimers.has(materialId)) {
      releaseCache();
      return;
    }
    recordFetchSuccess();

    // sprint-2/S2 fix (codex P1): hydrate the workspace store with the server
    // payload. The server-side snapshot is the per-material annotation bundle
    // (stickyNotes / inkStrokes / textBoxes / checklists / tables / charts);
    // missing keys keep their current value to avoid wiping unsaved local edits.
    // last-write-wins per plan §5.2 (server preferred), so equal/empty server
    // arrays still overwrite local stale ones for cross-device parity.
    if (json.payload && typeof json.payload === "object") {
      const incoming = json.payload as Partial<SubjectPdfWorkspace>;
      updatePdfWorkspaceStoreFromServer(subjectId, materialId, incoming);
    }
    // sprint-2/S3 fix (codex P2): keep the cache marker AND record which
    // material currently occupies the subject's in-memory bundle. The
    // material-switch guard at the top of this function clears the cache key
    // when the active material differs, so revisits still re-fetch.
    lastHydratedAnnotationByMaterial.set(subjectKey, materialId);
  } catch (error) {
    releaseCache();
    console.warn("[study-note] annotation GET network error", error);
    recordFetchFailure();
  }
}

// sprint-2/S2 fix (codex P1): apply server snapshot to local workspace store.
// We bypass `updatePdfWorkspace` here so the hydrate write does not trigger
// another PUT (it would loop). `savePdfWorkspaceStore` persists to
// localStorage and `renderApp` reflects in the UI.
function updatePdfWorkspaceStoreFromServer(
  subjectId: string,
  materialId: string,
  incoming: Partial<SubjectPdfWorkspace>
): void {
  const current = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const material = current.material;
  // Only hydrate when the active material matches; otherwise defer until the
  // user selects that material (lazy default — plan §8b.3).
  // sprint-2/S2 fix (codex P1): when active material mismatches (user switched
  // between GET start and resolve), clear the cache key for the *fetched*
  // material so re-entry retries instead of permanently believing it was
  // already hydrated.
  // cache key is `${userId}:${subjectId}:${materialId}` (sprint-2/S2 fix).
  // Re-derive from current authSession so the delete on early return matches
  // the key added in fetchAnnotationIfMissing.
  const cacheUserId = authSession?.user.id;
  const cacheKey = cacheUserId ? `${cacheUserId}:${subjectId}:${materialId}` : null;
  if (!material) {
    if (cacheKey) {
      annotationFetchedKeys.delete(cacheKey);
    }
    return;
  }
  const currentMaterialId = material.backendMaterialId ?? material.id;
  if (currentMaterialId !== materialId) {
    if (cacheKey) {
      annotationFetchedKeys.delete(cacheKey);
    }
    return;
  }
  const merged: SubjectPdfWorkspace = {
    ...current,
    stickyNotes: Array.isArray(incoming.stickyNotes) ? incoming.stickyNotes : current.stickyNotes,
    inkStrokes: Array.isArray(incoming.inkStrokes) ? incoming.inkStrokes : current.inkStrokes,
    textBoxes: Array.isArray(incoming.textBoxes) ? incoming.textBoxes : current.textBoxes,
    checklists: Array.isArray(incoming.checklists) ? incoming.checklists : current.checklists,
    tables: Array.isArray(incoming.tables) ? incoming.tables : current.tables,
    charts: Array.isArray(incoming.charts) ? incoming.charts : current.charts,
    updatedAt: new Date().toISOString()
  };
  pdfWorkspaceStore = {
    workspaces: {
      ...pdfWorkspaceStore.workspaces,
      [subjectId]: merged
    }
  };
  savePdfWorkspaceStore();
  try { renderApp(); } catch { /* ignore */ }
}

function saveNotebook(nextNotebook: StudyNotebook): boolean {
  try {
    window.localStorage.setItem(notebookStorageKey, JSON.stringify(nextNotebook));
    // Recovery: surface banner removal if we had been failing.
    if (notebookStorageError !== undefined) {
      notebookStorageError = undefined;
      notebookStorageErrorReported = false;
      try { renderApp(); } catch { /* ignore */ }
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[study-note] notebook localStorage save failed:", error);
    notebookStorageError = `메모/노트가 브라우저 저장공간에 기록되지 않았습니다 (예: 시크릿 모드, 용량 부족). 새로고침 시 변경 내용이 사라질 수 있으므로 저장 가능한 환경으로 옮기거나 새 탭에서 다시 시도하세요. (${message})`;
    if (!notebookStorageErrorReported) {
      // First failure — render once to show banner. Subsequent failures within
      // the same outage do not re-render (avoids focus loss during typing).
      notebookStorageErrorReported = true;
      try { renderApp(); } catch { /* ignore */ }
    }
    return false;
  }
}

// slice-2: loadAuthSession / saveAuthSession removed (F2 — localStorage auth forbidden).
// Session is cookie-based; in-memory authSession is rehydrated via /v1/auth/me on boot.

// sprint-2/S3 fix (codex P1): when a session attach succeeds for a different
// user than the previously-seen one on this browser, wipe the local notebook
// + pdfWorkspaceStore + sync caches BEFORE autosave PUT can leak the previous
// user's content into the new user's server record. Called from the two
// session-attach success paths (revalidate, sign-in) only — never from
// clearAuthSession, because that fires on transient /v1/auth/me failures and
// must not destroy data on a network blip.
//
// First-load semantics: lastSessionUserId is initialized from localStorage,
// so a page reload by the same user matches the marker and skips the wipe.
// Only a genuinely different userId triggers the destructive reset.
function applySessionTransitionForUser(newUserId: string): void {
  if (lastSessionUserId === newUserId) {
    return;
  }
  // sprint-2/S3 fix-2 (codex P1): on first rollout (or fresh browser) the
  // marker is absent. Do NOT wipe in that case — record the marker so a
  // subsequent sign-in by a *different* user triggers the wipe. Wiping on
  // first revalidate would destroy every existing user's local notebook on
  // the day this fix deploys, which is worse than the residual one-time
  // pre-marker leak risk it tries to close.
  if (lastSessionUserId === undefined) {
    lastSessionUserId = newUserId;
    try {
      window.localStorage.setItem(lastSessionUserStorageKey, newUserId);
    } catch {
      /* ignore */
    }
    return;
  }
  notebook = structuredClone(sampleLectureNote);
  try {
    window.localStorage.removeItem(notebookStorageKey);
  } catch {
    /* localStorage unavailable — in-memory reset still applies */
  }
  pdfWorkspaceStore = { workspaces: {} };
  try {
    savePdfWorkspaceStore();
  } catch {
    /* ignore */
  }
  for (const timer of userNotesPutTimers.values()) {
    clearTimeout(timer);
  }
  userNotesPutTimers.clear();
  for (const timer of annotationPutTimers.values()) {
    clearTimeout(timer);
  }
  annotationPutTimers.clear();
  userNotesFetchedKeys.clear();
  annotationFetchedKeys.clear();
  lastHydratedAnnotationByMaterial.clear();
  lastSessionUserId = newUserId;
  try {
    window.localStorage.setItem(lastSessionUserStorageKey, newUserId);
  } catch {
    /* ignore */
  }
}

function clearAuthSession(): void {
  authBootRequestId += 1;
  authSession = undefined;
  clearAuthBootTimers();
  revokeAllPdfObjectUrls();
  // sprint-1/S2 fix (codex P2): drop transient overlays that should not survive
  // a session reset. Without this the hotkey help modal could persist into the
  // post-login render and lock the shell in `inert`.
  hotkeyHelpModalOpen = false;
  // sprint-2/S2 fix (codex P1): cancel all pending debounced sync timers so a
  // delayed PUT from user A cannot be sent with user B's cookie after a
  // logout/login. Also reset the fetch caches (they are user-scoped, but old
  // entries are stale once the session is gone) and the failure tracker.
  for (const timer of userNotesPutTimers.values()) {
    clearTimeout(timer);
  }
  userNotesPutTimers.clear();
  for (const timer of annotationPutTimers.values()) {
    clearTimeout(timer);
  }
  annotationPutTimers.clear();
  userNotesFetchedKeys.clear();
  annotationFetchedKeys.clear();
  lastHydratedAnnotationByMaterial.clear();
  syncFailureTracker.paused = false;
  syncFailureTracker.recentFailures = [];
  syncBackendError = undefined;
  syncBackendErrorReported = false;
}

function clearAuthBootTimers(): void {
  if (authBootNoticeTimer) {
    clearTimeout(authBootNoticeTimer);
    authBootNoticeTimer = undefined;
  }

  if (authBootRetryTimer) {
    clearTimeout(authBootRetryTimer);
    authBootRetryTimer = undefined;
  }
}

function setActivePdfObjectUrl(
  subjectId: string,
  materialId: string,
  objectUrl: string
): void {
  clearActivePdfObjectUrl(subjectId);
  clearPdfFrameReadiness();

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
  clearPdfFrameReadiness();
}

function clearPdfFrameReadiness(): void {
  pdfFrameReadyTimers.forEach((timer) => clearTimeout(timer));
  pdfFrameReadyTimers.clear();
  loadedPdfFrameKeys.clear();
  pendingPdfPageTransition = undefined;
}

async function revalidateStoredSession(options: { attempt?: number } = {}): Promise<void> {
  const attempt = options.attempt ?? 0;
  const requestId = beginAuthBootRequest();

  try {
    // slice-2: cookie-based session rehydration — credentials:include sends the
    // httpOnly study_note_session cookie. No localStorage fallback (F2).
    const response = await fetchWithTimeout(`${apiBaseUrl}/v1/auth/me`, {
      credentials: "include"
    }, AUTH_SESSION_REQUEST_TIMEOUT_MS);

    if (requestId !== authBootRequestId) {
      return;
    }

    clearAuthBootTimers();

    if (!response.ok) {
      if (response.status >= 500) {
        scheduleAuthBootRetry(attempt);
        return;
      }

      // 401/403 = no valid cookie or insufficient auth for /me. Either way:
      // leave the cold-start lane and show the login page quickly.
      authSession = undefined;
      authBootState = "ready";
      authBootNotice = "checking";
      renderApp();
      return;
    }

    const payload = (await response.json()) as unknown;

    if (!isAuthMeResponse(payload)) {
      authSession = undefined;
      authBootState = "ready";
      authBootNotice = "checking";
      renderApp();
      return;
    }

    authSession = meResponseToSession(payload);
    // sprint-2/S3 fix (codex P2): clear auth-expiry one-shot so a future
    // session loss can re-surface the banner.
    authExpiryHandled = false;
    // sprint-2/S3 fix (codex P1): wipe local data if this revalidate landed
    // on a different user than the previous session on this browser. Must run
    // before restoreUploadedPdfMaterialsForSession so the workspace rebuild
    // starts from an empty pdfWorkspaceStore.
    applySessionTransitionForUser(authSession.user.id);
    await restoreUploadedPdfMaterialsForSession(authSession);
    if (requestId !== authBootRequestId) {
      return;
    }
    loginFeedback = undefined;
    authBootState = "ready";
    authBootNotice = "checking";
    renderApp();
  } catch {
    if (requestId !== authBootRequestId) {
      return;
    }

    clearAuthBootTimers();
    scheduleAuthBootRetry(attempt);
  }
}

function beginAuthBootRequest(): number {
  const requestId = authBootRequestId + 1;
  authBootRequestId = requestId;
  clearAuthBootTimers();
  authBootState = "checking";
  authBootNotice = "checking";
  renderApp();

  authBootNoticeTimer = setTimeout(() => {
    if (authBootState !== "checking" || requestId !== authBootRequestId) {
      return;
    }

    authBootNotice = "waking";
    renderApp();
  }, AUTH_SESSION_WAKE_NOTICE_DELAY_MS);

  return requestId;
}

function scheduleAuthBootRetry(attempt: number): void {
  authSession = undefined;
  authBootState = "checking";

  if (attempt >= AUTH_SESSION_MAX_AUTO_RETRIES) {
    authBootNotice = "retryable";
    renderApp();
    return;
  }

  authBootNotice = "waking";
  renderApp();
  authBootRetryTimer = setTimeout(() => {
    void revalidateStoredSession({ attempt: attempt + 1 });
  }, AUTH_SESSION_RETRY_DELAY_MS);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
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
  const updated = syncCurrentPdfMaterial({
    ...updater(current),
    updatedAt: new Date().toISOString()
  });

  pdfWorkspaceStore = {
    workspaces: {
      ...pdfWorkspaceStore.workspaces,
      [subjectId]: updated
    }
  };
  savePdfWorkspaceStore();
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
      charts: updated.charts
    };
    scheduleAnnotationPut(nextId!, payload);
  }
}

function syncCurrentPdfMaterial(workspace: SubjectPdfWorkspace): SubjectPdfWorkspace {
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

function getPdfMaterialKey(material: PdfMaterialDraft): string {
  return material.backendMaterialId ?? material.id;
}

function getPdfWorkspaceMaterials(workspace: SubjectPdfWorkspace): PdfMaterialDraft[] {
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

function sortPdfMaterialsNewestFirst(materials: PdfMaterialDraft[]): PdfMaterialDraft[] {
  return [...materials].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? a.uploadedAt);
    const bTime = Date.parse(b.updatedAt ?? b.uploadedAt);
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

function upsertPdfWorkspaceMaterial(
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

function replacePdfWorkspaceMaterials(
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

function selectPdfWorkspaceMaterial(subjectId: string, materialId: string): boolean {
  const current = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const target = getPdfWorkspaceMaterials(current).find(
    (material) => getPdfMaterialKey(material) === materialId
  );

  if (!target) {
    return false;
  }

  if (current.material && getPdfMaterialKey(current.material) !== materialId) {
    clearActivePdfObjectUrl(subjectId);
  }

  updatePdfWorkspace(subjectId, (workspace) => upsertPdfWorkspaceMaterial(workspace, target));
  return true;
}

function getSubjectPdfMaterials(subjectId: string): PdfMaterialDraft[] {
  return getPdfWorkspaceMaterials(getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId));
}

function addSubjectClassDate(formData: FormData): void {
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const classDate = String(formData.get("classDate") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const subject = notebook.subjects.find((item) => item.id === subjectId);

  if (!subject) {
    intakeFeedback = {
      kind: "error",
      title: "과목을 찾을 수 없습니다.",
      detail: "수업일을 추가할 과목을 다시 선택하세요."
    };
    renderApp();
    return;
  }

  if (!classDate) {
    intakeFeedback = {
      kind: "error",
      title: "수업일을 입력하세요.",
      detail: "예: 5월 14일(목)처럼 sidebar와 카드에 표시할 날짜를 적어 주세요."
    };
    renderApp();
    return;
  }

  if (subject.weekNotes.some((week) => week.label === classDate)) {
    intakeFeedback = {
      kind: "error",
      title: "이미 있는 수업일입니다.",
      detail: `${classDate} 수업일 카드가 이미 있습니다. 기존 카드를 열어 PDF를 연결하세요.`
    };
    renderApp();
    return;
  }

  const newWeek: WeekNote = {
    id: createClassDateWeekId(subject.id, classDate),
    label: classDate,
    title: title || `${classDate} 수업`,
    focus: "PDF 자료를 연결하고 수업 요약을 채워야 합니다.",
    sourceMaterialIds: [],
    requiredKeywordIds: [],
    conceptIds: [],
    exampleQuestionIds: [],
    reviewStatus: "needs-fill"
  };

  notebook = {
    ...notebook,
    updatedAt: new Date().toISOString().slice(0, 10),
    subjects: notebook.subjects.map((item) =>
      item.id === subject.id
        ? { ...item, weekNotes: [...item.weekNotes, newWeek] }
        : item
    )
  };
  const saved = saveNotebook(notebook);
  intakeFeedback = saved
    ? {
        kind: "success",
        title: "수업일을 추가했습니다.",
        detail: `${classDate} 카드에서 PDF를 연결하고 요약본을 채울 수 있습니다.`
      }
    : {
        kind: "error",
        title: "수업일을 추가했지만 저장에 실패했습니다.",
        detail: "브라우저 저장공간 문제로 변경 내용이 새로고침 시 사라질 수 있습니다. 상단 알림을 확인하세요."
      };
  renderApp();
}

function createClassDateWeekId(subjectId: string, classDate: string): string {
  const slug = classDate
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `week-${subjectId}-${slug || Date.now().toString(36)}-${Date.now().toString(36)}`;
}

async function assignPdfMaterialClassDate(
  subjectId: string,
  materialId: string,
  classDate: string
): Promise<void> {
  const subject = notebook.subjects.find((item) => item.id === subjectId);
  const material = getSubjectPdfMaterials(subjectId).find(
    (item) => getPdfMaterialKey(item) === materialId
  );
  const nextClassDate = normalizePdfMaterialClassDateValue(classDate);

  if (!subject || !material) {
    intakeFeedback = {
      kind: "error",
      title: "PDF 자료를 찾을 수 없습니다.",
      detail: "자료 목록을 새로고침한 뒤 다시 시도하세요."
    };
    renderApp();
    return;
  }

  if (
    nextClassDate !== PDF_MATERIAL_UNASSIGNED_CLASS_DATE &&
    !subject.weekNotes.some((week) => week.label === nextClassDate)
  ) {
    intakeFeedback = {
      kind: "error",
      title: "없는 수업일입니다.",
      detail: "먼저 수업일을 추가한 뒤 PDF를 연결하세요."
    };
    renderApp();
    return;
  }

  const previousClassDate = material.classDate;
  patchPdfWorkspaceMaterial(subjectId, materialId, {
    classDate: nextClassDate,
    updatedAt: new Date().toISOString()
  });
  intakeFeedback = {
    kind: "success",
    title: "PDF 수업일을 저장하는 중입니다.",
    detail: nextClassDate === PDF_MATERIAL_UNASSIGNED_CLASS_DATE
      ? `${material.fileName}의 수업일을 미지정으로 바꿉니다.`
      : `${material.fileName}을 ${nextClassDate} 수업에 연결합니다.`
  };
  renderApp();

  if (!material.backendMaterialId) {
    intakeFeedback = {
      kind: "success",
      title: "로컬 PDF 수업일을 변경했습니다.",
      detail: "backend에 저장되지 않은 로컬 자료라 현재 브라우저에만 반영됩니다."
    };
    renderApp();
    return;
  }

  try {
    const updated = await updatePdfMaterialMetadata(apiBaseUrl, material.backendMaterialId, {
      classDate: nextClassDate
    });
    const updatedDraft = createPdfMaterialFromBackend(updated, {
      selectedPage: material.selectedPage,
      selectedTool: material.selectedTool
    });
    replacePdfWorkspaceMaterial(subjectId, materialId, updatedDraft);
    intakeFeedback = {
      kind: "success",
      title: "PDF 수업일을 저장했습니다.",
      detail: nextClassDate === PDF_MATERIAL_UNASSIGNED_CLASS_DATE
        ? `${updated.fileName}은 아직 수업일 미지정 상태입니다.`
        : `${updated.fileName} → ${nextClassDate} 수업으로 연결했습니다.`
    };
  } catch (error) {
    patchPdfWorkspaceMaterial(subjectId, materialId, {
      classDate: previousClassDate,
      updatedAt: material.updatedAt
    });
    intakeFeedback = {
      kind: "error",
      title: "PDF 수업일을 저장하지 못했습니다.",
      detail: formatMaterialError(error)
    };
  }

  renderApp();
}

function normalizePdfMaterialClassDateValue(value: string): string {
  const trimmed = value.trim();

  return trimmed || PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
}

function patchPdfWorkspaceMaterial(
  subjectId: string,
  materialId: string,
  patch: Partial<PdfMaterialDraft>
): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    material: workspace.material && getPdfMaterialKey(workspace.material) === materialId
      ? { ...workspace.material, ...patch }
      : workspace.material,
    materials: getPdfWorkspaceMaterials(workspace).map((item) =>
      getPdfMaterialKey(item) === materialId ? { ...item, ...patch } : item
    )
  }));
}

function replacePdfWorkspaceMaterial(
  subjectId: string,
  materialId: string,
  nextMaterial: PdfMaterialDraft
): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    material: workspace.material && getPdfMaterialKey(workspace.material) === materialId
      ? { ...workspace.material, ...nextMaterial }
      : workspace.material,
    materials: getPdfWorkspaceMaterials(workspace).map((item) =>
      getPdfMaterialKey(item) === materialId ? { ...item, ...nextMaterial } : item
    )
  }));
}

function handleDocumentChange(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
    return;
  }

  // sprint-13/slice-5/6: chart input mode select — re-encode content with new type + current points.
  if (target instanceof HTMLSelectElement && target.dataset.action === "update-chart-type") {
    const subjectId = target.dataset.subjectId;
    const chartId = target.dataset.chartId;

    if (subjectId && chartId) {
      const rawType = target.value;
      const chartType: LocalChartType = rawType === "bar" || rawType === "trig" ? rawType : "xy";
      const article = target.closest<HTMLElement>("[data-chart-id]");
      const hasPointEditor = Boolean(article?.querySelector("[data-chart-point-count]"));
      const current = readChartDataFromDom(chartId);
      const storedChart = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId).charts.find(
        (chart) => chart.id === chartId
      );
      const storedPoints = storedChart ? decodeChartContent(storedChart.content).points : [];
      const points = hasPointEditor ? (current?.points ?? storedPoints) : storedPoints;
      const content = encodeChartContent(chartType, points);
      const prev = chartPointDebounceMap.get(chartId);
      if (prev) clearTimeout(prev);
      chartPointDebounceMap.delete(chartId);
      updatePdfWorkspace(subjectId, (workspace) => ({
        ...workspace,
        charts: workspace.charts.map((chart) =>
          chart.id === chartId ? updateChartContent(chart, content) : chart
        )
      }));
      renderApp();
    }

    return;
  }

  if (target instanceof HTMLSelectElement && target.dataset.action === "assign-pdf-class-date") {
    const subjectId = target.dataset.subjectId;
    const materialId = target.dataset.materialId;

    if (subjectId && materialId) {
      void assignPdfMaterialClassDate(subjectId, materialId, target.value);
    }

    return;
  }

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
      requestPdfPage(subjectId, pageNumber);
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

export type DrillItemClickResult =
  | {
      ok: true;
      subjectId: string;
      annotationId: string;
      drillType: InspectorDrillType;
      pageNumber: number;
      queued: true;
    }
  | { ok: false; reason: "missing-button" | "missing-dataset" | "invalid-type" | "invalid-page" };

export function handleDrillItemClick(
  target: Element,
  options: {
    now?: () => number;
    requestPage?: (subjectId: string, pageNumber: number) => void;
    commitPage?: (subjectId: string, pageNumber: number) => void;
    render?: () => void;
  } = {}
): DrillItemClickResult {
  const closest = (target as { closest?: (selector: string) => Element | null }).closest;
  const button = typeof closest === "function"
    ? closest.call(target, '[data-action="select-drill-item"]')
    : target;

  if (!button || getElementDataset(button).action !== "select-drill-item") {
    return { ok: false, reason: "missing-button" };
  }

  const dataset = getElementDataset(button);
  const subjectId = dataset.subjectId;
  const annotationId = dataset.annotationId;
  const drillType = normalizeInspectorDrillType(dataset.drillType);
  const rawPageNumber = Number(dataset.pageNumber);

  if (!subjectId || !annotationId) {
    return { ok: false, reason: "missing-dataset" };
  }

  if (!drillType) {
    return { ok: false, reason: "invalid-type" };
  }

  if (!Number.isFinite(rawPageNumber) || rawPageNumber <= 0) {
    return { ok: false, reason: "invalid-page" };
  }

  const pageNumber = Math.floor(rawPageNumber);
  pendingDrillHighlight = {
    subjectId,
    drillType,
    annotationId,
    remainingAttempts: DRILL_HIGHLIGHT_MAX_ATTEMPTS,
    expiresAt: (options.now ?? Date.now)() + DRILL_HIGHLIGHT_EXPIRES_MS
  };

  (options.requestPage ?? requestPdfPage)(subjectId, pageNumber);
  // Drill navigation must change selectedPage immediately; requestPdfPage may wait
  // for native PDF iframe readiness before committing normal toolbar transitions.
  (options.commitPage ?? setPdfPage)(subjectId, pageNumber);
  (options.render ?? renderApp)();

  return { ok: true, subjectId, annotationId, drillType, pageNumber, queued: true };
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

  if (quickNoteButton?.dataset.action === "toggle-pdf-fullscreen") {
    togglePdfFullscreen();
    return;
  }

  if (quickNoteButton?.dataset.action === "close-hotkey-help") {
    hotkeyHelpModalOpen = false;
    renderApp();
    return;
  }

  if (target instanceof HTMLElement && target.dataset.action === "close-hotkey-help-backdrop") {
    // Click on the backdrop element itself (not bubbled from the inner panel).
    hotkeyHelpModalOpen = false;
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "dismiss-notebook-storage-error") {
    // sprint-2/S2 fix (codex P1): clear BOTH banner sources + reset sync pause.
    // - notebookStorageError: localStorage save failure path.
    // - syncBackendError: BE sync paused after 3×5xx.
    // - syncFailureTracker.paused: unpause so autosave resumes.
    notebookStorageError = undefined;
    notebookStorageErrorReported = false;
    syncBackendError = undefined;
    syncBackendErrorReported = false;
    syncFailureTracker.paused = false;
    syncFailureTracker.recentFailures = [];
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

  if (quickNoteButton?.dataset.action === "retry-session-check") {
    void revalidateStoredSession();
    return;
  }

  if (quickNoteButton?.dataset.action === "open-pdf-material") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const materialId = quickNoteButton.dataset.materialId;
    const subject = subjectId
      ? notebook.subjects.find((item) => item.id === subjectId)
      : undefined;

    if (subject && materialId && selectPdfWorkspaceMaterial(subject.id, materialId)) {
      event.preventDefault();
      const targetHash = subjectPdfWorkspacePath(subject);
      if (window.location.hash === targetHash) {
        renderApp();
      } else {
        window.location.hash = targetHash;
      }
    }

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
  if (quickNoteButton?.dataset.action === "toggle-inspector-drill") {
    const type = normalizeInspectorDrillType(quickNoteButton.dataset.drillType);

    if (type) {
      inspectorDrill = toggleInspectorDrillState(inspectorDrill, type);
      writeInspectorDrill(inspectorDrill);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "toggle-pdf-inspector") {
    inspectorOpen = !inspectorOpen;
    writeInspectorOpen(inspectorOpen);
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "select-drill-item") {
    handleDrillItemClick(quickNoteButton);
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

  // sprint-13/slice-2: table delete (entire table)
  if (quickNoteButton?.dataset.action === "delete-table") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tableId = quickNoteButton.dataset.tableId;

    if (subjectId && tableId) {
      removeTable(subjectId, tableId);
      renderApp();
    }

    return;
  }

  // sprint-13/slice-3: chart delete (entire chart)
  if (quickNoteButton?.dataset.action === "delete-chart") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const chartId = quickNoteButton.dataset.chartId;

    if (subjectId && chartId) {
      removeChart(subjectId, chartId);
      renderApp();
    }

    return;
  }

  // sprint-13/slice-5: table row/col structural add/delete
  if (quickNoteButton?.dataset.action === "add-table-row") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tableId = quickNoteButton.dataset.tableId;

    if (subjectId && tableId) {
      applyAddTableRow(subjectId, tableId);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "add-table-column") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tableId = quickNoteButton.dataset.tableId;

    if (subjectId && tableId) {
      applyAddTableColumn(subjectId, tableId);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "delete-table-row") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tableId = quickNoteButton.dataset.tableId;
    const rowIndex = Number(quickNoteButton.dataset.row ?? "-1");

    if (subjectId && tableId && rowIndex >= 0) {
      applyDeleteTableRow(subjectId, tableId, rowIndex);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "delete-table-column") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tableId = quickNoteButton.dataset.tableId;
    const colIndex = Number(quickNoteButton.dataset.col ?? "-1");

    if (subjectId && tableId && colIndex >= 0) {
      applyDeleteTableColumn(subjectId, tableId, colIndex);
      renderApp();
    }

    return;
  }

  // sprint-13/slice-5: chart point add/delete
  if (quickNoteButton?.dataset.action === "add-chart-point") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const chartId = quickNoteButton.dataset.chartId;

    if (subjectId && chartId) {
      applyAddChartPoint(subjectId, chartId);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "delete-chart-point") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const chartId = quickNoteButton.dataset.chartId;
    const pointIndex = Number(quickNoteButton.dataset.pointIdx ?? "-1");

    if (subjectId && chartId && pointIndex >= 0) {
      applyDeleteChartPoint(subjectId, chartId, pointIndex);
      renderApp();
    }

    return;
  }

  if (quickNoteButton?.dataset.action === "clear-chart-points") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const chartId = quickNoteButton.dataset.chartId;

    if (subjectId && chartId) {
      applyClearChartPoints(subjectId, chartId);
      renderApp();
    }

    return;
  }

  // sprint-13/slice-6: generate coordinate points from a small trig function.
  if (quickNoteButton?.dataset.action === "fill-chart-function") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const chartId = quickNoteButton.dataset.chartId;

    if (subjectId && chartId) {
      applyFillChartFunction(subjectId, chartId);
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

  // sprint-13/slice-2: table collapse/expand state (mode-agnostic)
  if (quickNoteButton?.dataset.action === "toggle-table-collapsed") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tableId = quickNoteButton.dataset.tableId;

    if (subjectId && tableId) {
      applyTableCollapseToggle(subjectId, tableId);
      renderApp();
    }

    return;
  }

  // sprint-13/slice-3: chart collapse/expand state (mode-agnostic)
  if (quickNoteButton?.dataset.action === "toggle-chart-collapsed") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const chartId = quickNoteButton.dataset.chartId;

    if (subjectId && chartId) {
      applyChartCollapseToggle(subjectId, chartId);
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

  if (action === "add-class-date") {
    event.preventDefault();
    addSubjectClassDate(new FormData(target));
    return;
  }

  if (action === "attach-pdf-to-week") {
    event.preventDefault();
    const formData = new FormData(target);
    const subjectId = target.dataset.subjectId ?? "";
    const weekLabel = target.dataset.weekLabel ?? "";
    const materialId = String(formData.get("materialId") ?? "").trim();
    if (subjectId && weekLabel && materialId) {
      void assignPdfMaterialClassDate(subjectId, materialId, weekLabel);
    }
    return;
  }

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
      // sprint-2/S3 fix (codex P2): clear auth-expiry one-shot on fresh sign-in.
      authExpiryHandled = false;
      authBootState = "ready";
      authBootNotice = "checking";
      clearAuthBootTimers();
      // sprint-2/S3 fix (codex P1): wipe local notebook + pdfWorkspaceStore if
      // sign-in landed on a different user than the previous session, before
      // any autosave PUT can leak the prior user's content.
      applySessionTransitionForUser(session.user.id);
      // F2: no localStorage — session lives in httpOnly cookie + in-memory only
      await restoreUploadedPdfMaterialsForSession(session);
      if (authSession !== session) {
        return;
      }
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

  if (target.dataset.action === "update-week-user-notes") {
    const subjectId = target.dataset.subjectId;
    const weekId = target.dataset.weekId;

    if (!subjectId || !weekId) {
      return;
    }

    const value = (target as HTMLTextAreaElement).value;
    notebook = {
      ...notebook,
      subjects: notebook.subjects.map((subject) =>
        subject.id !== subjectId
          ? subject
          : {
              ...subject,
              weekNotes: subject.weekNotes.map((week) =>
                week.id !== weekId ? week : { ...week, userNotes: value }
              )
            }
      )
    };
    saveNotebook(notebook);
    // sprint-2/S2: BE sync (debounced PUT). localStorage 가 primary, BE 가 cross-device 백업.
    scheduleUserNotePut(subjectId, weekId, value);
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

  // sprint-13/slice-5: table cell input (header or data) — debounced store write.
  // No renderApp in callback to preserve focus (sprint-12 R1 pattern).
  if (target.dataset.action === "update-table-cell") {
    const subjectId = target.dataset.subjectId;
    const tableId = target.dataset.tableId;

    if (subjectId && tableId) {
      // Collect all current cell values from DOM, serialize, then debounce store write.
      const current = readTableDataFromDom(tableId);
      if (current) {
        // Override the changed cell with current input value (DOM already reflects it)
        const kind = target.dataset.cellKind;
        const colIdx = Number(target.dataset.cellCol);
        const rowIdx = Number(target.dataset.cellRow ?? "-1");

        if (kind === "header" && colIdx >= 0 && colIdx < current.headers.length) {
          current.headers[colIdx] = target.value;
        } else if (kind === "row" && rowIdx >= 0 && rowIdx < current.rows.length && colIdx >= 0) {
          const row = current.rows[rowIdx];
          if (row && colIdx < row.length) {
            row[colIdx] = target.value;
          }
        }

        scheduleTableCellUpdate(subjectId, tableId, serializeMarkdownTable(current));
      }
    }

    return;
  }

  // sprint-13/slice-5/6: chart point x/y input — debounced store write.
  if (
    target.dataset.action === "update-chart-point-x" ||
    target.dataset.action === "update-chart-point-label" ||
    target.dataset.action === "update-chart-point-value"
  ) {
    const subjectId = target.dataset.subjectId;
    const chartId = target.dataset.chartId;

    if (subjectId && chartId) {
      const current = readChartDataFromDom(chartId);
      if (current) {
        const idx = Number(target.dataset.pointIdx ?? "-1");
        if (idx >= 0 && idx < current.points.length) {
          const point = current.points[idx];
          if (point) {
            if (
              target.dataset.action === "update-chart-point-x" ||
              target.dataset.action === "update-chart-point-label"
            ) {
              point.label = target.value;
            } else {
              point.value = normalizeChartInputValue(target.value);
            }
          }
        }

        const content = encodeChartContent(current.chartType, current.points);
        refreshChartPreview(chartId, current.chartType, current.points);
        scheduleChartPointUpdate(subjectId, chartId, content);
      }
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

// sprint-1/S1: keyboard hotkey dispatch for PDF workspace.
// Single-letter keys (no modifier) switch tools; Cmd/Ctrl + [ / ] flip pages.
// Mapping uses event.code so Korean IME state does not affect dispatch.

const PDF_TOOL_HOTKEYS: Record<string, LocalPdfTool> = {
  KeyR: "read",
  KeyS: "sticky",
  KeyP: "pen",
  KeyE: "eraser",
  KeyT: "text",
  KeyC: "checklist",
  KeyB: "table",
  KeyG: "chart"
};

// sprint-1/S2: visible badge labels for each tool. Lookup by tool id.
const PDF_TOOL_HOTKEY_LABELS: Partial<Record<LocalPdfTool, string>> = {
  read: "R",
  sticky: "S",
  pen: "P",
  eraser: "E",
  text: "T",
  checklist: "C",
  table: "B",
  chart: "G"
};

// sprint-1/S2 fix (codex P2): map by the produced character so layouts where
// the physical "KeyR" code does not produce "R" (Dvorak / AZERTY) still match
// what the badge advertises. Lookup uses lowercased event.key.
const PDF_TOOL_KEY_LABEL_LOOKUP: Record<string, LocalPdfTool> = {
  r: "read",
  s: "sticky",
  p: "pen",
  e: "eraser",
  t: "text",
  c: "checklist",
  b: "table",
  g: "chart"
};

let hotkeyHelpModalOpen = false;

// sprint-1/S3: Browser Fullscreen API wrapper for the PDF workspace container.
const PDF_WORKSPACE_ROOT_ID = "pdf-workspace-root";

function isPdfWorkspaceFullscreen(): boolean {
  const el = document.fullscreenElement;
  return !!el && el.id === PDF_WORKSPACE_ROOT_ID;
}

function togglePdfFullscreen(): void {
  const target = document.getElementById(PDF_WORKSPACE_ROOT_ID);
  if (!target) {
    return;
  }

  // sprint-1/S3 fix (codex P2): the unprefixed Fullscreen API is not universal
  // (notably iOS Safari and older WebKit). Probe the methods before invoking
  // them so a missing API does not throw synchronously from the click/keydown
  // handler.
  if (isPdfWorkspaceFullscreen()) {
    if (typeof document.exitFullscreen !== "function") {
      console.warn("[study-note] document.exitFullscreen unavailable");
      return;
    }
    try {
      void document.exitFullscreen().catch((error) => {
        console.warn("[study-note] exitFullscreen failed:", error);
      });
    } catch (error) {
      console.warn("[study-note] exitFullscreen threw:", error);
    }
    return;
  }

  if (typeof target.requestFullscreen !== "function") {
    console.warn("[study-note] Element.requestFullscreen unavailable");
    return;
  }
  try {
    void target.requestFullscreen().catch((error) => {
      console.warn("[study-note] requestFullscreen failed:", error);
    });
  } catch (error) {
    console.warn("[study-note] requestFullscreen threw:", error);
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  return target.isContentEditable;
}

function getActivePdfWorkspaceSubjectId(): string | undefined {
  const route = parseRoute(window.location.hash);
  return route.name === "pdf-workspace" ? route.subjectId : undefined;
}

function handleDocumentKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing) {
    return;
  }

  const subjectId = getActivePdfWorkspaceSubjectId();
  if (!subjectId) {
    return;
  }

  const hasMetaOrCtrl = event.metaKey || event.ctrlKey;

  // === sprint-1/S2 modal close keys — always processed regardless of state ===

  // Esc closes the hotkey help modal first, regardless of focus.
  if (event.code === "Escape" && hotkeyHelpModalOpen) {
    event.preventDefault();
    hotkeyHelpModalOpen = false;
    renderApp();
    return;
  }

  // "?" toggles the help modal. Match by event.key === "?" first so any layout
  // that actually produced the "?" character — including ones where AltGr is
  // required (Windows/Linux reports AltGr as Ctrl+Alt) — opens the modal as
  // advertised. Fall back to the US-layout Shift+Slash code combo when the
  // produced key is not "?" (codex P2 fix-2).
  if (
    !isEditableTarget(event.target) &&
    (
      event.key === "?" ||
      (!hasMetaOrCtrl && !event.altKey && event.shiftKey && event.code === "Slash")
    )
  ) {
    event.preventDefault();
    hotkeyHelpModalOpen = !hotkeyHelpModalOpen;
    renderApp();
    return;
  }

  // sprint-1/S2 fix (codex P2): when the help modal is open, all other hotkeys
  // are suppressed. Otherwise workspace state could change behind the dialog
  // (page flip, tool switch) while the user is reading shortcut help.
  if (hotkeyHelpModalOpen) {
    return;
  }

  // sprint-1/S1 fix (codex P2): match by event.key as well as event.code so the
  // shortcut works on non-US layouts where "[" / "]" are produced via AltGr or
  // mapped to non-bracket physical keys. Do not gate on altKey because AltGr
  // raises altKey=true on those layouts.
  //
  // sprint-1/S1 fix-2 (codex P2): also skip bracket dispatch when typing in an
  // editable element. On AltGr layouts Chrome/Edge can report ctrlKey=true and
  // altKey=true while the user enters "[" or "]" into a textbox; without this
  // guard the page would flip instead of accepting the typed character.
  if (hasMetaOrCtrl && !event.shiftKey && !isEditableTarget(event.target)) {
    const isBracketLeft = event.code === "BracketLeft" || event.key === "[";
    const isBracketRight = event.code === "BracketRight" || event.key === "]";

    if (isBracketLeft) {
      event.preventDefault();
      movePdfPage(subjectId, -1);
      renderApp();
      return;
    }

    if (isBracketRight) {
      event.preventDefault();
      movePdfPage(subjectId, 1);
      renderApp();
      return;
    }
  }

  // sprint-1/S3: "F" toggles browser Fullscreen on the PDF workspace container.
  // sprint-1/S3 fix (codex P2): drop auto-repeat to avoid enter/exit oscillation
  // when the user holds the key past the OS key-repeat delay.
  // sprint-1/S3 fix-2 (codex P2): match event.key first so non-QWERTY layouts
  // (Dvorak/AZERTY) where the labelled "F" key reports a different event.code
  // still trigger fullscreen as advertised. event.code is the fallback for
  // Korean IME on QWERTY (consistent with the tool dispatch path).
  const isFullscreenKey =
    (typeof event.key === "string" && event.key.toLowerCase() === "f") ||
    event.code === "KeyF";
  if (
    !hasMetaOrCtrl &&
    !event.altKey &&
    !event.shiftKey &&
    isFullscreenKey &&
    !event.repeat &&
    !isEditableTarget(event.target)
  ) {
    event.preventDefault();
    togglePdfFullscreen();
    return;
  }

  if (hasMetaOrCtrl || event.altKey || event.shiftKey) {
    return;
  }

  if (isEditableTarget(event.target)) {
    return;
  }

  // sprint-1/S2 fix-2 (codex P1): try event.key (the produced character) FIRST
  // so the visible R/S/P... badge matches actual behavior on non-QWERTY layouts
  // (e.g., Dvorak: physical "KeyR" position produces another letter — code
  // lookup would pick the wrong tool first). event.code is the fallback for
  // Korean IME on QWERTY where event.key may carry the composed value.
  // event.key is lowercased so CapsLock/Shift do not break the lookup.
  const tool =
    PDF_TOOL_KEY_LABEL_LOOKUP[event.key.toLowerCase()] ??
    PDF_TOOL_HOTKEYS[event.code];
  if (!tool) {
    return;
  }

  event.preventDefault();
  setPdfTool(subjectId, tool);
  renderApp();
}

function handleDocumentLoad(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLIFrameElement) || target.dataset.pdfFrame !== "true") {
    return;
  }

  const frameKey = target.dataset.pdfFrameKey;

  if (!frameKey) {
    return;
  }

  const previousTimer = pdfFrameReadyTimers.get(frameKey);

  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  const timer = setTimeout(() => {
    pdfFrameReadyTimers.delete(frameKey);
    loadedPdfFrameKeys.add(frameKey);
    completePendingPdfPageTransition(frameKey);
  }, PDF_FRAME_READY_DELAY_MS);

  pdfFrameReadyTimers.set(frameKey, timer);
}

function completePendingPdfPageTransition(frameKey: string): void {
  if (!pendingPdfPageTransition) {
    return;
  }

  const pending = pendingPdfPageTransition;
  const pendingKey = getPdfFrameKey(pending.materialId, pending.toPage);

  if (frameKey !== pendingKey) {
    return;
  }

  pendingPdfPageTransition = undefined;
  setPdfPage(pending.subjectId, pending.toPage);
  renderApp();
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

  // sprint-13/slice-2: table header drag — same pattern as checklist drag.
  // Button clicks (toggle/delete) and textarea edits stay in click/input handlers.
  const tableDragHandle = target.closest<HTMLElement>("[data-action='table-drag-handle']");

  if (tableDragHandle && !target.closest("button") && !target.closest("textarea") && !target.closest("input")) {
    const subjectIdForDrag = surface.dataset.subjectId;
    const tableIdForDrag = tableDragHandle.dataset.tableId;

    if (subjectIdForDrag && tableIdForDrag) {
      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectIdForDrag);
      const table = workspace.tables.find((item) => item.id === tableIdForDrag);

      if (table) {
        event.preventDefault();
        try {
          tableDragHandle.setPointerCapture(event.pointerId);
        } catch {
          // synthetic events may not support setPointerCapture
        }
        activeTableDrag = {
          subjectId: subjectIdForDrag,
          tableId: tableIdForDrag,
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startNormX: table.position.x,
          startNormY: table.position.y
        };
      }
    }

    return;
  }

  // sprint-13/slice-3: chart header drag — same pattern as table drag.
  const chartDragHandle = target.closest<HTMLElement>("[data-action='chart-drag-handle']");

  if (chartDragHandle && !target.closest("button") && !target.closest("textarea") && !target.closest("input")) {
    const subjectIdForDrag = surface.dataset.subjectId;
    const chartIdForDrag = chartDragHandle.dataset.chartId;

    if (subjectIdForDrag && chartIdForDrag) {
      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectIdForDrag);
      const chart = workspace.charts.find((item) => item.id === chartIdForDrag);

      if (chart) {
        event.preventDefault();
        try {
          chartDragHandle.setPointerCapture(event.pointerId);
        } catch {
          // synthetic events may not support setPointerCapture
        }
        activeChartDrag = {
          subjectId: subjectIdForDrag,
          chartId: chartIdForDrag,
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startNormX: chart.position.x,
          startNormY: chart.position.y
        };
      }
    }

    return;
  }

  if (target.closest("a, button, input, label, textarea, .sticky-note, .pdf-textbox, .pdf-checklist, .pdf-table, .pdf-chart")) {
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

  // sprint-13/slice-2: table tool — click-to-place a new table at the surface point.
  if ((material.selectedTool as LocalPdfTool) === "table") {
    addTable(subjectId, point);
    setPdfTool(subjectId, "read");
    renderApp();
    event.preventDefault();
    return;
  }

  // sprint-13/slice-3: chart tool — click-to-place a new chart at the surface point.
  if ((material.selectedTool as LocalPdfTool) === "chart") {
    addChart(subjectId, point);
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

  // sprint-13/slice-2: table drag — same pattern as checklist drag.
  if (activeTableDrag && activeTableDrag.pointerId === event.pointerId) {
    const { subjectId, tableId, startClientX, startClientY, startNormX, startNormY } = activeTableDrag;
    const surface = document.querySelector<HTMLElement>(
      `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
    );

    if (surface) {
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      const dx = (event.clientX - startClientX) / rect.width;
      const dy = (event.clientY - startClientY) / rect.height;
      applyTableMove(subjectId, tableId, { x: startNormX + dx, y: startNormY + dy });
      const el = document.querySelector<HTMLElement>(`[data-table-id="${tableId}"]`);

      if (el) {
        const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
        const table = workspace.tables.find((item) => item.id === tableId);

        if (table) {
          el.style.left = `${table.position.x * 100}%`;
          el.style.top = `${table.position.y * 100}%`;
        }
      }
    }

    return;
  }

  // sprint-13/slice-3: chart drag — same pattern as table drag.
  if (activeChartDrag && activeChartDrag.pointerId === event.pointerId) {
    const { subjectId, chartId, startClientX, startClientY, startNormX, startNormY } = activeChartDrag;
    const surface = document.querySelector<HTMLElement>(
      `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
    );

    if (surface) {
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      const dx = (event.clientX - startClientX) / rect.width;
      const dy = (event.clientY - startClientY) / rect.height;
      applyChartMove(subjectId, chartId, { x: startNormX + dx, y: startNormY + dy });
      const el = document.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`);

      if (el) {
        const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
        const chart = workspace.charts.find((item) => item.id === chartId);

        if (chart) {
          el.style.left = `${chart.position.x * 100}%`;
          el.style.top = `${chart.position.y * 100}%`;
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

  // sprint-13/slice-2: clear table drag state on pointer release.
  if (activeTableDrag && activeTableDrag.pointerId === event.pointerId) {
    activeTableDrag = undefined;
    renderApp(); // final re-render to settle position
    return;
  }

  // sprint-13/slice-3: clear chart drag state on pointer release.
  if (activeChartDrag && activeChartDrag.pointerId === event.pointerId) {
    activeChartDrag = undefined;
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
      classDate: PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
      fileName: file.name,
      fileSize: file.size,
      pageCount,
      contentType: "application/pdf"
    });

    // Stash intent for retry CTA (resume at S3 PUT step if intent still valid)
    pendingPdfRetry = { file, subjectId, intent };

    clearActivePdfObjectUrl(subjectId);
    const pendingMaterial = createPdfMaterialFromBackend(intent.material, undefined);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...upsertPdfWorkspaceMaterial(workspace, {
        ...pendingMaterial,
        selectedPage: workspace.material?.selectedPage ?? pendingMaterial.selectedPage,
        selectedTool: workspace.material?.selectedTool ?? pendingMaterial.selectedTool
      })
    }));
    renderApp();

    // slice-2: new S3 direct PUT flow — intent → S3 PUT (with retry) → completion
    const uploadedMaterial = await uploadMaterialFile(apiBaseUrl, intent, file);

    // Upload success — clear retry state
    pendingPdfRetry = undefined;

    const completedMaterial = createPdfMaterialFromBackend(uploadedMaterial, undefined);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...upsertPdfWorkspaceMaterial(workspace, {
        ...completedMaterial,
        selectedPage: workspace.material?.selectedPage ?? completedMaterial.selectedPage,
        selectedTool: workspace.material?.selectedTool ?? completedMaterial.selectedTool
      })
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
    const materialsBySubject = new Map<string, PdfMaterialRecord[]>();

    materials
      .filter((material) => material.uploadStatus === "uploaded")
      .forEach((material) => {
        const existing = materialsBySubject.get(material.subjectId) ?? [];
        materialsBySubject.set(material.subjectId, [...existing, material]);
      });

    materialsBySubject.forEach((subjectMaterials, subjectId) => {
      updatePdfWorkspace(subjectId, (workspace) => ({
        ...replacePdfWorkspaceMaterials(workspace, subjectMaterials)
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
// sprint-13: "table" | "chart" added in domain; slice-2 activates table UI.
type LocalPdfTool = PdfWorkspaceTool;

// sprint-13/slice-5+: LocalChartType widens domain PdfChartType (legacy one-type chart) to include
// xy/bar/trig variants. Domain normalizeChartType keeps persisted enum compatibility on hydration,
// so chart type is persisted as a type: prefix line in chart.content (free-string field).
// Pattern mirrors LocalPdfTool widening for eraser.
type LocalChartType = "xy" | "bar" | "trig";
type LocalChartFunction = "sin" | "cos" | "tan";

const CHART_TYPE_PREFIX = "type:";
const CHART_PLOT_LEFT = 6;
const CHART_PLOT_RIGHT = 94;
const CHART_PLOT_TOP = 4;
const CHART_PLOT_BOTTOM = 22;
const CHART_PLOT_WIDTH = CHART_PLOT_RIGHT - CHART_PLOT_LEFT;
const CHART_PLOT_HEIGHT = CHART_PLOT_BOTTOM - CHART_PLOT_TOP;
const CHART_PLANE_COLOR = "#111111";

/**
 * Encodes LocalChartType + CsvSeriesPoint[] into a single content string.
 * Format: "type:<chartType>\n<x>,<y>\n..."
 * When chartType is "xy", prefix is omitted for backward compat with existing content.
 */
function encodeChartContent(chartType: LocalChartType | LocalChartFunction, points: CsvSeriesPoint[]): string {
  const csv = serializeCsv(points);
  if (chartType === "xy") {
    return csv;
  }

  return CHART_TYPE_PREFIX + chartType + "\n" + csv;
}

/**
 * Decodes a content string into LocalChartType + CsvSeriesPoint[].
 * First line of "type:<chartType>" is consumed as metadata; rest is CSV.
 * Legacy "line"/"sparkline" content is normalized to the user-facing xy chart.
 */
function inferChartFunctionType(points: CsvSeriesPoint[]): LocalChartFunction {
  return points.some((point) => Math.abs(point.value) > 1) ? "tan" : "sin";
}

function decodeChartContent(content: string): { chartType: LocalChartType; points: CsvSeriesPoint[]; functionType?: LocalChartFunction } {
  const trimmed = content.trimStart();

  if (trimmed.startsWith(CHART_TYPE_PREFIX)) {
    const newline = trimmed.indexOf("\n");
    const typeStr = newline < 0
      ? trimmed.slice(CHART_TYPE_PREFIX.length)
      : trimmed.slice(CHART_TYPE_PREFIX.length, newline);
    const csv = newline < 0 ? "" : trimmed.slice(newline + 1);
    const points = parseCsvSeries(csv);

    if (typeStr === "sin" || typeStr === "cos" || typeStr === "tan") {
      return { chartType: "trig", points, functionType: typeStr };
    }

    const chartType: LocalChartType = typeStr === "bar" || typeStr === "trig" ? typeStr : "xy";
    return {
      chartType,
      points,
      functionType: chartType === "trig" ? inferChartFunctionType(points) : undefined
    };
  }

  return { chartType: "xy", points: parseCsvSeries(content) };
}

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
    tool === "checklist" ||
    tool === "table" ||
    tool === "chart"
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

function movePdfPage(subjectId: string, delta: number): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const material = workspace.material;

  if (!material) {
    return;
  }

  requestPdfPage(subjectId, material.selectedPage + delta);
}

function requestPdfPage(subjectId: string, pageNumber: number): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const material = workspace.material;

  if (!material) {
    return;
  }

  const nextPage = Math.min(material.pageCount, Math.max(1, pageNumber));

  if (nextPage === material.selectedPage) {
    pendingPdfPageTransition = undefined;
    setPdfPage(subjectId, nextPage);
    return;
  }

  const materialId = material.backendMaterialId ?? "";
  const frameKey = getPdfFrameKey(materialId, nextPage);

  if (!materialId || loadedPdfFrameKeys.has(frameKey)) {
    pendingPdfPageTransition = undefined;
    setPdfPage(subjectId, nextPage);
    return;
  }

  pendingPdfPageTransition = {
    subjectId,
    materialId,
    fromPage: material.selectedPage,
    toPage: nextPage
  };
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

// ---------------------------------------------------------------------------
// sprint-13/slice-2 — PdfTable store operations
// Pattern mirrors addChecklistWidget / removeChecklist / applyChecklistMove.
// ---------------------------------------------------------------------------

function addTable(
  subjectId: string,
  position: { x: number; y: number }
): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const page = workspace.material?.selectedPage ?? 1;
  const table = createTable({ subjectId, page, position });

  updatePdfWorkspace(subjectId, (current) => ({
    ...current,
    tables: [...current.tables, table]
  }));
}

function removeTable(subjectId: string, tableId: string): void {
  const prev = tableContentDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  tableContentDebounceMap.delete(tableId);
  // sprint-13/slice-5: also cancel any pending cell debounce
  const prev2 = tableCellDebounceMap.get(tableId);
  if (prev2) clearTimeout(prev2);
  tableCellDebounceMap.delete(tableId);

  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: deleteTable(workspace.tables, tableId)
  }));
}

function applyTableMove(
  subjectId: string,
  tableId: string,
  position: { x: number; y: number }
): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? moveTable(table, position) : table
    )
  }));
}

// tableContentDebounceMap was used by the now-removed scheduleTableContentUpdate (slice-2).
// slice-5 uses tableCellDebounceMap instead. Kept here as named const for removeTable's
// clearTimeout call (legacy slice-2 timers may still be in flight during a hot reload).
const tableContentDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function applyTableCollapseToggle(subjectId: string, tableId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? toggleTableCollapsed(table) : table
    )
  }));
}

// sprint-13/slice-5: per-table debounce for cell-level editing.
// Key = tableId. No renderApp in callback to avoid focus loss (sprint-12 R1 pattern).
const tableCellDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleTableCellUpdate(subjectId: string, tableId: string, content: string): void {
  const prev = tableCellDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  const handle = setTimeout(() => {
    tableCellDebounceMap.delete(tableId);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      tables: workspace.tables.map((table) =>
        table.id === tableId ? updateTableContent(table, content) : table
      )
    }));
  }, 300);
  tableCellDebounceMap.set(tableId, handle);
}

/**
 * Reads current in-memory table data from the DOM inputs and returns the edited ParsedMarkdownTable.
 * Used by add/delete row/col reducers which must collect all current cell values before mutating.
 */
function readTableDataFromDom(tableId: string): ParsedMarkdownTable | null {
  const article = document.querySelector<HTMLElement>(`[data-table-id="${tableId}"]`);
  if (!article) return null;

  const headerInputs = Array.from(
    article.querySelectorAll<HTMLInputElement>(`input[data-action="update-table-cell"][data-cell-kind="header"]`)
  ).sort((a, b) => Number(a.dataset.cellCol) - Number(b.dataset.cellCol));

  const headers = headerInputs.map((inp) => inp.value);
  if (headers.length === 0) return null;

  const rowCount = Number(
    article.querySelector<HTMLElement>("[data-table-row-count]")?.dataset.tableRowCount ?? "0"
  );

  const rows: string[][] = Array.from({ length: rowCount }, (_, rowIdx) =>
    Array.from({ length: headers.length }, (__, colIdx) => {
      const inp = article.querySelector<HTMLInputElement>(
        `input[data-action="update-table-cell"][data-cell-kind="row"][data-cell-row="${rowIdx}"][data-cell-col="${colIdx}"]`
      );
      return inp ? inp.value : "";
    })
  );

  return { headers, rows };
}

function applyAddTableRow(subjectId: string, tableId: string): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  const updated: ParsedMarkdownTable = {
    ...current,
    rows: [...current.rows, Array(current.headers.length).fill("")]
  };
  const content = serializeMarkdownTable(updated);
  const prev = tableCellDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  tableCellDebounceMap.delete(tableId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

function applyAddTableColumn(subjectId: string, tableId: string): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  const updated: ParsedMarkdownTable = {
    headers: [...current.headers, ""],
    rows: current.rows.map((row) => [...row, ""])
  };
  const content = serializeMarkdownTable(updated);
  const prev = tableCellDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  tableCellDebounceMap.delete(tableId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

function applyDeleteTableRow(subjectId: string, tableId: string, rowIndex: number): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  // minimum 0 data rows (cannot delete below 0)
  if (current.rows.length === 0) return;
  const updated: ParsedMarkdownTable = {
    ...current,
    rows: current.rows.filter((_, i) => i !== rowIndex)
  };
  const content = serializeMarkdownTable(updated);
  const prev = tableCellDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  tableCellDebounceMap.delete(tableId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

function applyDeleteTableColumn(subjectId: string, tableId: string, colIndex: number): void {
  const current = readTableDataFromDom(tableId);
  if (!current) return;
  // minimum 1 column
  if (current.headers.length <= 1) return;
  const updated: ParsedMarkdownTable = {
    headers: current.headers.filter((_, i) => i !== colIndex),
    rows: current.rows.map((row) => row.filter((_, i) => i !== colIndex))
  };
  const content = serializeMarkdownTable(updated);
  const prev = tableCellDebounceMap.get(tableId);
  if (prev) clearTimeout(prev);
  tableCellDebounceMap.delete(tableId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    tables: workspace.tables.map((table) =>
      table.id === tableId ? updateTableContent(table, content) : table
    )
  }));
}

// ---------------------------------------------------------------------------
// sprint-13/slice-3 — PdfChart store operations
// Pattern mirrors PdfTable store operations.
// ---------------------------------------------------------------------------

function addChart(
  subjectId: string,
  position: { x: number; y: number }
): void {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
  const page = workspace.material?.selectedPage ?? 1;
  const chart = createChart({ subjectId, page, position });

  updatePdfWorkspace(subjectId, (current) => ({
    ...current,
    charts: [...current.charts, chart]
  }));
}

function removeChart(subjectId: string, chartId: string): void {
  const prev = chartContentDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartContentDebounceMap.delete(chartId);
  // sprint-13/slice-5: also cancel any pending point debounce
  const prev2 = chartPointDebounceMap.get(chartId);
  if (prev2) clearTimeout(prev2);
  chartPointDebounceMap.delete(chartId);

  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: deleteChart(workspace.charts, chartId)
  }));
}

function applyChartMove(
  subjectId: string,
  chartId: string,
  position: { x: number; y: number }
): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? moveChart(chart, position) : chart
    )
  }));
}

// chartContentDebounceMap was used by removed scheduleChartContentUpdate (slice-3).
// slice-5 uses chartPointDebounceMap instead. Kept here for removeChart's clearTimeout.
const chartContentDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function applyChartCollapseToggle(subjectId: string, chartId: string): void {
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? toggleChartCollapsed(chart) : chart
    )
  }));
}

// sprint-13/slice-5: per-chart debounce for data-point editing.
// Key = chartId. No renderApp in callback to avoid focus loss.
const chartPointDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleChartPointUpdate(subjectId: string, chartId: string, content: string): void {
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  const handle = setTimeout(() => {
    chartPointDebounceMap.delete(chartId);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      charts: workspace.charts.map((chart) =>
        chart.id === chartId ? updateChartContent(chart, content) : chart
      )
    }));
  }, 300);
  chartPointDebounceMap.set(chartId, handle);
}

/**
 * Reads current chart data (chartType + points) from the DOM inputs.
 * Used by structural operations (add/delete point) that must collect all values before mutating.
 */
function readChartDataFromDom(chartId: string): { chartType: LocalChartType; points: CsvSeriesPoint[] } | null {
  const article = document.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`);
  if (!article) return null;

  const typeSelect = article.querySelector<HTMLSelectElement>(
    `select[data-action="update-chart-type"][data-chart-id="${chartId}"]`
  );
  const rawType = typeSelect?.value ?? "xy";
  const chartType: LocalChartType = rawType === "bar" || rawType === "trig" ? rawType : "xy";

  const pointCount = Number(
    article.querySelector<HTMLElement>("[data-chart-point-count]")?.dataset.chartPointCount ?? "0"
  );
  const points: CsvSeriesPoint[] = Array.from({ length: pointCount }, (_, idx) => {
    const labelInp = article.querySelector<HTMLInputElement>(
      `input[data-action="update-chart-point-x"][data-point-idx="${idx}"]`
    ) ?? article.querySelector<HTMLInputElement>(
      `input[data-action="update-chart-point-label"][data-point-idx="${idx}"]`
    );
    const valueInp = article.querySelector<HTMLInputElement>(
      `input[data-action="update-chart-point-value"][data-point-idx="${idx}"]`
    );
    return {
      label: labelInp ? labelInp.value : "",
      value: valueInp ? normalizeChartInputValue(valueInp.value) : 0
    };
  });

  return { chartType, points };
}

function applyAddChartPoint(subjectId: string, chartId: string): void {
  const current = readChartDataFromDom(chartId);
  if (!current) return;
  const nextX = getNextChartXValue(current.points);
  const newPoints = [...current.points, { label: formatChartNumber(nextX), value: 0 }];
  const content = encodeChartContent(current.chartType, newPoints);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
    )
  }));
}

function applyDeleteChartPoint(subjectId: string, chartId: string, pointIndex: number): void {
  const current = readChartDataFromDom(chartId);
  if (!current) return;
  const newPoints = current.points.filter((_, i) => i !== pointIndex);
  const content = encodeChartContent(current.chartType, newPoints);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
    )
  }));
}

function applyClearChartPoints(subjectId: string, chartId: string): void {
  const current = readChartDataFromDom(chartId);
  const chartType = current?.chartType ?? "xy";
  const content = encodeChartContent(chartType, []);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
    )
  }));
}

function applyFillChartFunction(subjectId: string, chartId: string): void {
  const config = readChartFunctionConfigFromDom(chartId);
  if (!config) return;
  const points = buildFunctionChartPoints(config.functionType, config.xMin, config.xMax, config.samples);
  const content = encodeChartContent(config.functionType, points);
  const prev = chartPointDebounceMap.get(chartId);
  if (prev) clearTimeout(prev);
  chartPointDebounceMap.delete(chartId);
  updatePdfWorkspace(subjectId, (workspace) => ({
    ...workspace,
    charts: workspace.charts.map((chart) =>
      chart.id === chartId ? updateChartContent(chart, content) : chart
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
    checklists: [],
    tables: [],
    charts: []
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
    const saved = saveNotebook(notebook);
    intakeFeedback = saved
      ? {
          kind: "success",
          title: `${result.subject.title} ${result.weekNote.label} 노트를 반영했습니다.`,
          detail: "브라우저 localStorage에 저장되어 새로고침 후에도 유지됩니다.",
          href: weekPath(result.subject, result.weekNote)
        }
      : {
          kind: "error",
          title: `${result.subject.title} ${result.weekNote.label} 노트가 저장에 실패했습니다.`,
          detail: "브라우저 저장공간 문제로 변경 내용이 새로고침 시 사라질 수 있습니다. 상단 알림을 확인하세요."
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
    route.name === "subject-class" ||
    route.name === "subject-summaries" ||
    route.name === "subject-summary-detail" ||
    route.name === "subject-mcp" ||
    route.name === "subject-memorize" ||
    route.name === "subject-intake" ||
    route.name === "pdf-workspace" ||
    route.name === "week"
      ? notebook.subjects.find((item) => item.id === route.subjectId)
      : undefined;
  const week =
    (route.name === "week" || route.name === "subject-summary-detail") && subject
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

  if ((route.name === "week" || route.name === "subject-summary-detail") && subject && !week) {
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
    // sprint-2/S2: lazy fetch annotation snapshot for active material on first view.
    const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subject.id);
    const material = workspace.material;
    if (material) {
      const materialId = material.backendMaterialId ?? material.id;
      void fetchAnnotationIfMissing(subject.id, materialId);
    }
    return;
  }

  if ((route.name === "subject" || route.name === "subject-class") && subject) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectClassPage(subject),
      `${subject.title} / 수업`
    ));
    return;
  }

  if (route.name === "subject-summaries" && subject) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectSummariesPage(subject),
      `${subject.title} / 요약본`
    ));
    return;
  }

  if (route.name === "subject-summary-detail" && subject && week) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderWeekSummaryPage(subject, week),
      `${subject.title} / ${week.label} 요약본`
    ));
    return;
  }

  if (route.name === "subject-mcp" && subject) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectMcpPage(subject),
      `${subject.title} / MCP 호출`
    ));
    return;
  }

  if (route.name === "subject-memorize" && subject) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectMemorizePage(subject),
      `${subject.title} / 필수 암기노트`
    ));
    return;
  }

  if (route.name === "week" && subject && week) {
    renderInto(renderShell(
      renderSubjectSidebar(subject, route),
      renderWeekPage(subject, week),
      `${subject.title} / ${week.label}`
    ));
    // sprint-2/S2: lazy fetch userNotes from BE on first week view (per-session cache).
    void fetchUserNoteIfMissing(subject.id, week.id);
  }

  // sprint-12/slice-6 revert: iframe detach/re-attach 패턴 = Chromium HTML spec 으로
  // iframe reload trigger → PDF 미표시. mountPdfFrame 폐기. 점멸 fix 후속 별 sprint
  // (selective re-render 또는 PDF stage 외부 mount 큰 변경 필요).
}

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const rawParts = path.split("/").filter(Boolean);
  const parts = rawParts.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });

  if (parts[0] === "subjects" && parts[1] && parts[2] === "weeks" && parts[3]) {
    return { name: "week", subjectId: parts[1], weekId: parts[3] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "intake") {
    return { name: "subject-intake", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "pdf-workspace") {
    return { name: "pdf-workspace", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "class") {
    return { name: "subject-class", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "summaries" && parts[3]) {
    return { name: "subject-summary-detail", subjectId: parts[1], weekId: parts[3] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "summaries") {
    return { name: "subject-summaries", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "summary") {
    return { name: "subject-summaries", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "mcp") {
    return { name: "subject-mcp", subjectId: parts[1] };
  }

  if (parts[0] === "subjects" && parts[1] && parts[2] === "memorize") {
    return { name: "subject-memorize", subjectId: parts[1] };
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

function subjectClassPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/class`;
}

function subjectSummaryPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/summaries`;
}

function weekSummaryPath(subject: SubjectNote, week: WeekNote): string {
  return `#/subjects/${subject.id}/summaries/${week.id}`;
}

function subjectMcpPath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/mcp`;
}

function subjectMemorizePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/memorize`;
}

function subjectIntakePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/intake`;
}

function subjectPdfWorkspacePath(subject: SubjectNote): string {
  return `#/subjects/${subject.id}/pdf-workspace`;
}

interface CsvSeriesPoint {
  label: string;
  value: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function parseCsvSeries(source: string): CsvSeriesPoint[] {
  if (source.trim().length === 0) {
    return [];
  }

  return source.split(/\r?\n/).reduce<CsvSeriesPoint[]>((points, line) => {
    const parsedLine = splitCsvSeriesLine(line);

    if (!parsedLine) {
      return points;
    }

    const [label, rawValue] = parsedLine;
    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return points;
    }

    points.push({ label, value });
    return points;
  }, []);
}

function splitCsvSeriesLine(line: string): [label: string, rawValue: string] | null {
  let label = "";

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\\" && (next === "," || next === "\\")) {
      label += next;
      index += 1;
      continue;
    }

    if (char === ",") {
      return [label.trim(), line.slice(index + 1).trim()];
    }

    label += char;
  }

  return null;
}

/**
 * Serializes CsvSeriesPoint[] to CSV string.
 * Each point becomes "label,value" line. Commas and backslashes in labels are escaped.
 * O(n) where n = number of points.
 */
function serializeCsv(points: CsvSeriesPoint[]): string {
  return points
    .map((point) => point.label.replace(/\\/g, "\\\\").replace(/,/g, "\\,") + "," + String(point.value))
    .join("\n");
}

function normalizeChartInputValue(rawValue: string): number {
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
}

interface CoordinateChartPoint {
  point: CsvSeriesPoint;
  xValue: number;
  yValue: number;
}

function parseChartXValue(point: CsvSeriesPoint, fallbackIndex: number): number {
  const x = Number(point.label.trim());
  return Number.isFinite(x) ? x : fallbackIndex;
}

function getCoordinateChartPoints(points: CsvSeriesPoint[]): CoordinateChartPoint[] {
  const safePoints = points.filter((point) => Number.isFinite(point.value));
  const coordinates = safePoints.map((point, index) => ({
    point,
    xValue: parseChartXValue(point, index),
    yValue: point.value
  }));

  return coordinates.sort((a, b) => a.xValue - b.xValue);
}

function getNextChartXValue(points: CsvSeriesPoint[]): number {
  const xValues = points
    .map((point, index) => parseChartXValue(point, index))
    .filter((value) => Number.isFinite(value));
  if (xValues.length === 0) return 0;
  return Math.max(...xValues) + 1;
}

function formatChartNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number(value.toFixed(4)).toString();
}

function shouldRenderChartLabel(index: number, total: number): boolean {
  if (total <= 6) return true;
  return index === 0 || index === Math.floor((total - 1) / 2) || index === total - 1;
}

function formatChartPointLabel(point: CsvSeriesPoint): string {
  const xLabel = point.label.trim().length > 0 ? point.label.trim() : "0";
  return "(" + xLabel + ", " + formatChartNumber(point.value) + ")";
}

function mapChartXValue(value: number, xMin: number, xMax: number): number {
  const xRange = xMax - xMin;
  return xRange === 0 ? 50 : CHART_PLOT_LEFT + ((value - xMin) / xRange) * CHART_PLOT_WIDTH;
}

function mapChartYValue(value: number, yMin: number, yMax: number): number {
  const yRange = yMax - yMin;
  return yRange === 0 ? 15 : CHART_PLOT_BOTTOM - ((value - yMin) / yRange) * CHART_PLOT_HEIGHT;
}

function appendChartLabel(
  parent: SVGElement,
  point: CsvSeriesPoint,
  x: number,
  total: number
): void {
  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("x", x.toFixed(2));
  label.setAttribute("y", "29");
  label.setAttribute("font-size", "4");
  label.setAttribute("data-chart-point-label", "true");
  const textAnchor = total === 1
    ? "middle"
    : x <= CHART_PLOT_LEFT
      ? "start"
      : x >= CHART_PLOT_RIGHT
        ? "end"
        : "middle";
  label.setAttribute("text-anchor", textAnchor);
  label.textContent = formatChartPointLabel(point);
  parent.append(label);
}

function appendChartLine(
  parent: SVGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: { opacity: string; strokeWidth: string; dataName?: string; dataValue?: string }
): SVGLineElement {
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", x1.toFixed(2));
  line.setAttribute("x2", x2.toFixed(2));
  line.setAttribute("y1", y1.toFixed(2));
  line.setAttribute("y2", y2.toFixed(2));
  line.setAttribute("stroke", CHART_PLANE_COLOR);
  line.setAttribute("stroke-width", options.strokeWidth);
  line.setAttribute("opacity", options.opacity);
  if (options.dataName && options.dataValue) {
    line.setAttribute(options.dataName, options.dataValue);
  }
  parent.append(line);
  return line;
}

export function appendChartCoordinatePlane(
  parent: SVGElement,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const frame = document.createElementNS(SVG_NS, "rect");
  frame.setAttribute("x", String(CHART_PLOT_LEFT));
  frame.setAttribute("y", String(CHART_PLOT_TOP));
  frame.setAttribute("width", String(CHART_PLOT_WIDTH));
  frame.setAttribute("height", String(CHART_PLOT_HEIGHT));
  frame.setAttribute("fill", "none");
  frame.setAttribute("stroke", CHART_PLANE_COLOR);
  frame.setAttribute("stroke-width", "0.35");
  frame.setAttribute("opacity", "0.22");
  frame.setAttribute("data-chart-plane", "frame");
  parent.append(frame);

  [0.25, 0.5, 0.75].forEach((ratio) => {
    const x = CHART_PLOT_LEFT + CHART_PLOT_WIDTH * ratio;
    const y = CHART_PLOT_TOP + CHART_PLOT_HEIGHT * ratio;
    appendChartLine(parent, x, CHART_PLOT_TOP, x, CHART_PLOT_BOTTOM, {
      opacity: "0.12",
      strokeWidth: "0.25",
      dataName: "data-chart-plane",
      dataValue: "grid"
    });
    appendChartLine(parent, CHART_PLOT_LEFT, y, CHART_PLOT_RIGHT, y, {
      opacity: "0.12",
      strokeWidth: "0.25",
      dataName: "data-chart-plane",
      dataValue: "grid"
    });
  });

  const xAxisY = yRange === 0
    ? 15
    : yMin <= 0 && yMax >= 0
      ? mapChartYValue(0, yMin, yMax)
      : yMin > 0
        ? CHART_PLOT_BOTTOM
        : CHART_PLOT_TOP;
  const yAxisX = xRange === 0
    ? 50
    : xMin <= 0 && xMax >= 0
      ? mapChartXValue(0, xMin, xMax)
      : xMin > 0
        ? CHART_PLOT_LEFT
        : CHART_PLOT_RIGHT;

  appendChartLine(parent, CHART_PLOT_LEFT, xAxisY, CHART_PLOT_RIGHT, xAxisY, {
    opacity: "0.7",
    strokeWidth: "0.75",
    dataName: "data-chart-axis",
    dataValue: "x"
  });
  appendChartLine(parent, yAxisX, CHART_PLOT_TOP, yAxisX, CHART_PLOT_BOTTOM, {
    opacity: "0.7",
    strokeWidth: "0.75",
    dataName: "data-chart-axis",
    dataValue: "y"
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const cx = CHART_PLOT_LEFT + CHART_PLOT_WIDTH * ratio;
    const xValue = xMin + xRange * ratio;
    const tick = document.createElementNS(SVG_NS, "text");
    tick.setAttribute("x", cx.toFixed(2));
    tick.setAttribute("y", String(xAxisY >= CHART_PLOT_BOTTOM - 1 ? xAxisY - 1 : xAxisY + 2.6));
    tick.setAttribute("font-size", "2.8");
    tick.setAttribute("fill", CHART_PLANE_COLOR);
    tick.setAttribute("opacity", "0.75");
    tick.setAttribute("text-anchor", ratio === 0 ? "start" : ratio === 1 ? "end" : "middle");
    tick.setAttribute("data-chart-axis-tick", "x");
    tick.textContent = formatChartNumber(xValue);
    parent.append(tick);
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const cy = CHART_PLOT_TOP + CHART_PLOT_HEIGHT * ratio;
    const yValue = yMax - yRange * ratio;
    const isLeftEdgeAxis = yAxisX <= CHART_PLOT_LEFT + 1;
    const tick = document.createElementNS(SVG_NS, "text");
    tick.setAttribute("x", String(isLeftEdgeAxis ? yAxisX + 1.2 : yAxisX - 1.2));
    tick.setAttribute("y", String(cy + 0.9));
    tick.setAttribute("font-size", "2.8");
    tick.setAttribute("fill", CHART_PLANE_COLOR);
    tick.setAttribute("opacity", "0.75");
    tick.setAttribute("text-anchor", isLeftEdgeAxis ? "start" : "end");
    tick.setAttribute("data-chart-axis-tick", "y");
    tick.textContent = formatChartNumber(yValue);
    parent.append(tick);
  });

  const xLabel = document.createElementNS(SVG_NS, "text");
  xLabel.setAttribute("x", "96");
  xLabel.setAttribute("y", String(xAxisY >= CHART_PLOT_BOTTOM - 1 ? CHART_PLOT_BOTTOM - 1.2 : xAxisY + 3.8));
  xLabel.setAttribute("font-size", "3.8");
  xLabel.setAttribute("fill", CHART_PLANE_COLOR);
  xLabel.setAttribute("text-anchor", "start");
  xLabel.setAttribute("data-chart-axis-label", "x");
  xLabel.textContent = "X";
  parent.append(xLabel);

  const yLabel = document.createElementNS(SVG_NS, "text");
  yLabel.setAttribute("x", String(Math.min(CHART_PLOT_RIGHT - 1.5, Math.max(CHART_PLOT_LEFT + 1.5, yAxisX + 2))));
  yLabel.setAttribute("y", "3.2");
  yLabel.setAttribute("font-size", "3.8");
  yLabel.setAttribute("fill", CHART_PLANE_COLOR);
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("data-chart-axis-label", "y");
  yLabel.textContent = "Y";
  parent.append(yLabel);
}

function mapCoordinateChartPoints(
  points: CoordinateChartPoint[],
  yBounds?: { min: number; max: number }
): Array<{
  point: CsvSeriesPoint;
  x: number;
  y: number;
}> {
  const xValues = points.map((point) => point.xValue);
  const yValues = points.map((point) => point.yValue);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = yBounds ? yBounds.min : Math.min(...yValues);
  const yMax = yBounds ? yBounds.max : Math.max(...yValues);
  return points.map((point) => ({
    point: point.point,
    x: mapChartXValue(point.xValue, xMin, xMax),
    y: mapChartYValue(point.yValue, yMin, yMax)
  }));
}

export function splitCoordsByJump(
  coords: Array<{ x: number; y: number; point: CsvSeriesPoint }>,
  pixelJumpThreshold: number = 15
): Array<Array<{ x: number; y: number; point: CsvSeriesPoint }>> {
  const segments: Array<Array<{ x: number; y: number; point: CsvSeriesPoint }>> = [];
  let current: Array<{ x: number; y: number; point: CsvSeriesPoint }> = [];
  for (let i = 0; i < coords.length; i++) {
    const cur = coords[i];
    if (!cur) continue;
    if (current.length === 0) {
      current.push(cur);
      continue;
    }
    const prev = current[current.length - 1];
    if (prev && Math.abs(cur.y - prev.y) > pixelJumpThreshold) {
      segments.push(current);
      current = [cur];
    } else {
      current.push(cur);
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }
  return segments;
}

export function buildPolylineChartSvg(
  parent: SVGElement,
  points: CsvSeriesPoint[],
  options: { markers: boolean; labels?: boolean; discontinuous?: boolean; yBounds?: { min: number; max: number } }
): void {
  parent.replaceChildren();
  parent.setAttribute("viewBox", "0 0 100 30");

  const coordinates = getCoordinateChartPoints(points);

  if (coordinates.length === 0) {
    appendChartCoordinatePlane(
      parent,
      -1,
      1,
      options.yBounds ? options.yBounds.min : -1,
      options.yBounds ? options.yBounds.max : 1
    );
    return;
  }

  const xValues = coordinates.map((point) => point.xValue);
  const yValues = coordinates.map((point) => point.yValue);
  appendChartCoordinatePlane(
    parent,
    Math.min(...xValues),
    Math.max(...xValues),
    options.yBounds ? options.yBounds.min : Math.min(...yValues),
    options.yBounds ? options.yBounds.max : Math.max(...yValues)
  );

  const coords = mapCoordinateChartPoints(coordinates, options.yBounds);

  if (coords.length === 1) {
    const coord = coords[0];
    if (!coord) return;

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", coord.x.toFixed(2));
    circle.setAttribute("cy", coord.y.toFixed(2));
    circle.setAttribute("r", "2");
    circle.setAttribute("fill", "currentColor");
    parent.append(circle);
    if (options.labels !== false) {
      appendChartLabel(parent, coord.point, coord.x, coords.length);
    }
    return;
  }

  const renderPolyline = (segment: Array<{ x: number; y: number; point: CsvSeriesPoint }>) => {
    const polyline = document.createElementNS(SVG_NS, "polyline");
    polyline.setAttribute(
      "points",
      segment.map((coord) => coord.x.toFixed(2) + "," + coord.y.toFixed(2)).join(" ")
    );
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "currentColor");
    polyline.setAttribute("stroke-width", "1.6");
    polyline.setAttribute("stroke-linecap", "round");
    polyline.setAttribute("stroke-linejoin", "round");
    parent.append(polyline);
  };

  if (options.discontinuous === true) {
    splitCoordsByJump(coords).forEach(renderPolyline);
  } else {
    renderPolyline(coords);
  }

  coords.forEach((coord, index) => {
    if (options.markers) {
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", coord.x.toFixed(2));
      circle.setAttribute("cy", coord.y.toFixed(2));
      circle.setAttribute("r", "1.35");
      circle.setAttribute("fill", "currentColor");
      parent.append(circle);
    }

    if (options.labels !== false && shouldRenderChartLabel(index, coords.length)) {
      appendChartLabel(parent, coord.point, coord.x, coords.length);
    }
  });
}

function normalizeChartFunction(rawFunction: string | undefined): LocalChartFunction {
  if (rawFunction === "cos" || rawFunction === "tan") {
    return rawFunction;
  }

  return "sin";
}

export function buildFunctionChartPoints(
  functionType: LocalChartFunction,
  xMin: number,
  xMax: number,
  samples: number
): CsvSeriesPoint[] {
  const safeMin = Number.isFinite(xMin) ? xMin : -Math.PI;
  const safeMax = Number.isFinite(xMax) && xMax > safeMin ? xMax : Math.PI;
  const safeSamples = Math.min(121, Math.max(2, Math.round(samples)));
  const evaluate = (x: number): number => {
    if (functionType === "cos") return Math.cos(x);
    if (functionType === "tan") return Math.tan(x);
    return Math.sin(x);
  };
  const yMin = functionType === "tan" ? -10 : -1;
  const yMax = functionType === "tan" ? 10 : 1;

  return Array.from({ length: safeSamples }, (_, index) => {
    const x = safeMin + ((safeMax - safeMin) * index) / (safeSamples - 1);
    const y = evaluate(x);
    return { label: formatChartNumber(x), value: Number.isFinite(y) ? Number(y.toFixed(4)) : 0 };
  }).filter((point) => Number.isFinite(point.value) && point.value >= yMin && point.value <= yMax);
}

function readChartFunctionConfigFromDom(chartId: string): {
  functionType: LocalChartFunction;
  xMin: number;
  xMax: number;
  samples: number;
} | null {
  const article = document.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`);
  if (!article) return null;

  const fn = article.querySelector<HTMLSelectElement>(
    `select[data-action="select-chart-function"][data-chart-id="${chartId}"]`
  );
  const xMin = article.querySelector<HTMLInputElement>(
    `input[data-action="set-chart-function-x-min"][data-chart-id="${chartId}"]`
  );
  const xMax = article.querySelector<HTMLInputElement>(
    `input[data-action="set-chart-function-x-max"][data-chart-id="${chartId}"]`
  );
  const samples = article.querySelector<HTMLInputElement>(
    `input[data-action="set-chart-function-samples"][data-chart-id="${chartId}"]`
  );

  return {
    functionType: normalizeChartFunction(fn?.value),
    xMin: xMin ? normalizeChartInputValue(xMin.value) : -Math.PI,
    xMax: xMax ? normalizeChartInputValue(xMax.value) : Math.PI,
    samples: samples ? normalizeChartInputValue(samples.value) : 49
  };
}

function buildCoordinateLineChartSvg(parent: SVGElement, points: CsvSeriesPoint[]): void {
  buildPolylineChartSvg(parent, points, { markers: true });
}

export function buildTrigChartSvg(
  parent: SVGElement,
  points: CsvSeriesPoint[],
  functionType: LocalChartFunction
): void {
  const isTan = functionType === "tan";
  buildPolylineChartSvg(parent, points, {
    markers: false,
    labels: false,
    discontinuous: isTan,
    yBounds: isTan ? { min: -10, max: 10 } : { min: -1, max: 1 }
  });
}

/**
 * Renders bar chart SVG into parent. Each point = one <rect> bar, height normalized to viewBox.
 * viewBox = "0 0 100 30". O(n) where n = number of safe points.
 */
function buildBarChartSvg(parent: SVGElement, points: CsvSeriesPoint[]): void {
  parent.replaceChildren();
  parent.setAttribute("viewBox", "0 0 100 30");

  const safePoints = points.filter((point) => Number.isFinite(point.value));

  if (safePoints.length === 0) {
    return;
  }

  const values = safePoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const toBarHeight = (value: number): number => {
    if (range === 0) {
      return 12;
    }

    const ratio = Math.min(1, Math.max(0, (value - min) / range));
    return ratio * 18 + 2;
  };

  const barWidth = safePoints.length === 1 ? 14 : Math.max(2, 90 / safePoints.length - 1);
  const gap = safePoints.length === 1 ? 0 : (90 - barWidth * safePoints.length) / (safePoints.length - 1);
  const startX = 5;

  safePoints.forEach((point, index) => {
    const barH = toBarHeight(point.value);
    const x = startX + index * (barWidth + (safePoints.length === 1 ? 0 : gap));
    const y = 22 - barH;

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x.toFixed(2));
    rect.setAttribute("y", y.toFixed(2));
    rect.setAttribute("width", barWidth.toFixed(2));
    rect.setAttribute("height", barH.toFixed(2));
    rect.setAttribute("fill", "currentColor");
    parent.append(rect);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", (x + barWidth / 2).toFixed(2));
    label.setAttribute("y", "29");
    label.setAttribute("font-size", "4");
    const textAnchor = safePoints.length === 1
      ? "middle"
      : index === 0
        ? "start"
        : index === safePoints.length - 1
          ? "end"
          : "middle";
    label.setAttribute("text-anchor", textAnchor);
    label.textContent = formatChartPointLabel(point);
    parent.append(label);
  });
}

/**
 * Dispatches to the right SVG builder based on LocalChartType.
 */
function buildChartSvg(
  parent: SVGElement,
  chartType: LocalChartType,
  points: CsvSeriesPoint[],
  functionType: LocalChartFunction = "sin"
): void {
  if (chartType === "bar") {
    buildBarChartSvg(parent, points);
  } else if (chartType === "trig") {
    buildTrigChartSvg(parent, points, functionType);
  } else {
    buildCoordinateLineChartSvg(parent, points);
  }
}

interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
}

function splitMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim();
  const cells: string[] = [];
  let current = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const next = trimmed[i + 1];

    if (char === "\\" && next === "|") {
      current += "|";
      i += 1;
      continue;
    }

    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  if (trimmed.startsWith("|")) {
    cells.shift();
  }

  if (trimmed.endsWith("|")) {
    cells.pop();
  }

  return cells;
}

function isMarkdownSeparatorCell(cell: string): boolean {
  return /^:?-{3,}:?$/.test(cell.replace(/\s+/g, ""));
}

function normalizeMarkdownTableRow(cells: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => cells[index] ?? "");
}

function parseMarkdownTable(source: string): ParsedMarkdownTable | null {
  if (source.trim().length === 0) {
    return null;
  }

  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return null;
  }

  const headerLine = lines[0];
  const separatorLine = lines[1];
  if (headerLine === undefined || separatorLine === undefined) {
    return null;
  }
  const headers = splitMarkdownTableRow(headerLine);
  const separator = splitMarkdownTableRow(separatorLine);

  if (
    headers.length === 0 ||
    headers.every((cell) => cell.length === 0) ||
    separator.length !== headers.length ||
    !separator.every(isMarkdownSeparatorCell)
  ) {
    return null;
  }

  return {
    headers,
    rows: lines.slice(2).map((line) =>
      normalizeMarkdownTableRow(splitMarkdownTableRow(line), headers.length)
    )
  };
}

/**
 * Serializes ParsedMarkdownTable back to markdown string.
 * Pipe chars in cell content are escaped as \|.
 * Output: "| h1 | h2 |\n|---|---|\n| v1 | v2 |"
 * O(rows * cols) pure function.
 */
function serializeMarkdownTable(parsed: ParsedMarkdownTable): string {
  const escapeCell = (cell: string): string => cell.replace(/\|/g, "\\|");
  const headerRow = "| " + parsed.headers.map(escapeCell).join(" | ") + " |";
  const separator = "|" + parsed.headers.map(() => "---|").join("");
  const dataRows = parsed.rows.map((row) => "| " + row.map(escapeCell).join(" | ") + " |");
  return [headerRow, separator, ...dataRows].join("\n");
}

// sprint-13/slice-5: refreshTableWidgets replaces data-table-mount-id placeholders
// with full DOM table widgets (mirrors refreshChartWidgets pattern).
function refreshTableWidgets(): void {
  document
    .querySelectorAll<HTMLElement>("[data-table-mount-id]")
    .forEach((mount) => {
      const subjectId = mount.dataset.subjectId;
      const tableId = mount.dataset.tableMountId;

      if (!subjectId || !tableId) {
        return;
      }

      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
      const table = workspace.tables.find((item) => item.id === tableId);

      if (!table) {
        mount.remove();
        return;
      }

      mount.replaceWith(renderTable(subjectId, table));
    });
}

// sprint-13/slice-5: refreshChartPreview updates SVG preview in-place after point input.
// Called in debounce-free path (input event immediate feedback).
function refreshChartPreview(
  chartId: string,
  chartType: LocalChartType,
  points: CsvSeriesPoint[],
  functionType?: LocalChartFunction
): void {
  const preview = document.querySelector<SVGElement>(
    `[data-chart-preview-id="${chartId}"]`
  );

  if (!preview) {
    return;
  }

  buildChartSvg(preview, chartType, points, functionType);
}

function refreshChartWidgets(): void {
  document
    .querySelectorAll<HTMLElement>("[data-chart-mount-id]")
    .forEach((mount) => {
      const subjectId = mount.dataset.subjectId;
      const chartId = mount.dataset.chartMountId;

      if (!subjectId || !chartId) {
        return;
      }

      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
      const chart = workspace.charts.find((item) => item.id === chartId);

      if (!chart) {
        mount.remove();
        return;
      }

      mount.replaceWith(renderChart(subjectId, chart));
    });
}

function weekPath(subject: SubjectNote, week: WeekNote): string {
  return `#/subjects/${subject.id}/weeks/${week.id}`;
}

function renderShell(sidebar: string, mainContent: string, crumb: string): string {
  // sprint-1/S2 fix (codex P2): only apply `inert` when the help modal will
  // actually render. The modal is gated by both `hotkeyHelpModalOpen` and the
  // current route being the PDF workspace; if either is false the inert flag
  // would lock the shell without a visible dialog to close it.
  const modalWillRender = hotkeyHelpModalOpen && !!getActivePdfWorkspaceSubjectId();
  const shellInertAttr = modalWillRender ? " inert" : "";
  return `
    <div class="app-shell"${shellInertAttr}>
      ${sidebar}
      <div class="main-area">
        <header class="topbar">
          <span class="crumb">${crumb}</span>
          <div class="topbar-session">
            <span class="topbar-meta">${authSession ? `${authSession.user.displayName} · ` : ""}${notebook.updatedAt} 업데이트</span>
            <button class="text-button" type="button" data-action="logout">로그아웃</button>
          </div>
        </header>
        ${renderNotebookStorageBanner()}
        <main class="content">${mainContent}</main>
        <footer class="site-footer">
          study-note · 과목 총정리, 날짜별 노트, 로컬 자료 투입 · 원문 PDF 공개 공유 없음
        </footer>
      </div>
    </div>
    ${renderHotkeyHelpModal()}
  `;
}

function renderNotebookStorageBanner(): string {
  // sprint-2/S2 fix (codex P1): show either banner (localStorage save fail OR
  // BE sync pause). Two independent sources; dismiss button clears both for UX
  // simplicity. localStorage 우선 (더 치명적).
  const message = notebookStorageError ?? syncBackendError;
  if (!message) {
    return "";
  }
  return `
    <div class="storage-error-banner" role="alert">
      <p>${escapeHtml(message)}</p>
      <button class="text-button" type="button" data-action="dismiss-notebook-storage-error">닫기</button>
    </div>
  `;
}

// sprint-1/S2: hotkey help modal — listed shortcuts so users do not have to memorise.
function renderHotkeyHelpModal(): string {
  if (!hotkeyHelpModalOpen) {
    return "";
  }

  // sprint-1/S2 fix (codex P2): only render the modal on the PDF workspace
  // route. Outside it the keyboard handler returns early and the user would be
  // unable to close the modal, while the shell `inert` attribute would lock
  // navigation. Defensive — hashchange already clears the flag, but a stale
  // flag from a non-shell path (auth reset, direct deep-link) is possible.
  if (!getActivePdfWorkspaceSubjectId()) {
    return "";
  }

  const rows: Array<[string, string]> = [
    ["R", "읽기"],
    ["S", "포스트잇"],
    ["P", "펜"],
    ["E", "지우개"],
    ["T", "텍스트 박스"],
    ["C", "체크리스트"],
    ["B", "표"],
    ["G", "그래프"],
    ["Cmd/Ctrl + [", "이전 페이지"],
    ["Cmd/Ctrl + ]", "다음 페이지"],
    ["F", "전체화면 토글"],
    ["?", "이 도움말 열기 / 닫기"],
    ["Esc", "도움말 닫기 / 전체화면 종료"]
  ];

  const body = rows
    .map(
      ([key, action]) => `
        <li>
          <kbd class="tool-button__key">${escapeHtml(key)}</kbd>
          <span>${escapeHtml(action)}</span>
        </li>
      `
    )
    .join("");

  return `
    <div class="hotkey-help-modal" role="dialog" aria-modal="true" aria-labelledby="hotkey-help-title" data-action="close-hotkey-help-backdrop">
      <div class="hotkey-help-modal__panel" role="document">
        <header class="hotkey-help-modal__header">
          <h2 id="hotkey-help-title">단축키 도움말</h2>
          <button class="text-button" type="button" data-action="close-hotkey-help" autofocus>닫기</button>
        </header>
        <ul class="hotkey-help-modal__list">${body}</ul>
        <p class="hotkey-help-modal__hint">PDF 작업공간에서 동작합니다. 입력 중에는 단일 키 단축키가 일시 비활성화됩니다.</p>
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
  // hotfix(session): "세션 확인 중" / "서버를 깨우는 중" 두 화면이 깜빡이며
  // 교차하던 UX 를 단일 타이틀로 통합. 자동 retry 가 진행되는 동안은 동일한
  // 안내문을 유지하고, 자동 retry 가 모두 소진된 retryable 상태에서만 안내문이
  // "수동 재시도 필요" 로 바뀌며 "다시 확인" 버튼이 노출된다 (codex P2 fix —
  // retryable 에서는 자동 retry 가 멈췄으므로 "자동 확인" 문구는 거짓).
  const isRetryable = authBootNotice === "retryable";
  const detail = isRetryable
    ? "자동 확인이 끝났습니다. 아래 버튼을 눌러 다시 시도해 주세요."
    : "서버와 로그인 정보를 확인하고 있습니다. 첫 요청은 백엔드가 깨어나는 데 시간이 걸릴 수 있으며 자동으로 다시 확인합니다.";

  return `
    <main class="login-screen" data-session-checking="true">
      <section class="login-panel" aria-live="polite" aria-busy="${isRetryable ? "false" : "true"}">
        <p class="meta">SESSION CHECK</p>
        <h1>세션 확인 중</h1>
        <p class="lede">${detail}</p>
        ${
          isRetryable
            ? `<div class="session-check-actions">
                <button class="secondary-action" type="button" data-action="retry-session-check">
                  다시 확인
                </button>
              </div>`
            : ""
        }
      </section>
    </main>
  `;
}

function renderHomeSidebar(studyNotebook: StudyNotebook, route: Route): string {
  return `
    <aside class="sidebar" aria-label="학습 내비게이션">
      <a class="wordmark" href="#/">study-note</a>
      <div class="sidebar-group sidebar-group--home">
        <p class="group-label">홈</p>
        <nav>
          <a class="${route.name === "home" ? "active" : ""}" href="#/">전체 현황</a>
        </nav>
      </div>
      <div class="sidebar-group sidebar-group--subjects">
        <p class="group-label">과목 공부</p>
        <nav>
          ${studyNotebook.subjects.map((subject) => `
            <a href="${subjectClassPath(subject)}">${subject.title}</a>
          `).join("")}
        </nav>
      </div>
      <div class="sidebar-group sidebar-group--workspaces">
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
    <div class="sidebar-group sidebar-group--admin">
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

function renderSubjectSidebar(subject: SubjectNote, route: Route): string {
  const currentSession =
    route.name === "week"
      ? subject.weekNotes.find((week) => week.id === route.weekId)
      : undefined;

  return `
    <aside class="sidebar" aria-label="${subject.title} 학습 내비게이션">
      <a class="wordmark" href="#/">study-note</a>
      <div class="sidebar-group sidebar-group--subjects">
        <p class="group-label">과목 공부</p>
        <nav aria-label="과목별 학습 화면">
          ${notebook.subjects.map((item) => renderSubjectNavItem(item, subject, route)).join("")}
        </nav>
      </div>
      <div class="sidebar-group sidebar-group--workspaces">
        <p class="group-label">PDF 작업공간</p>
        <nav>
          <a class="${route.name === "pdf-workspace" ? "active" : ""}" href="${subjectPdfWorkspacePath(subject)}">${subject.title} 작업공간</a>
          <a class="${route.name === "pdf-workspaces" ? "active" : ""}" href="#/pdf-workspaces">전체 작업공간</a>
        </nav>
      </div>
      ${renderClassSchedule(currentSession?.label)}
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

function renderSubjectNavItem(
  item: SubjectNote,
  currentSubject: SubjectNote,
  route: Route
): string {
  const isCurrent = item.id === currentSubject.id;

  return `
    <div class="subject-sidebar-item ${isCurrent ? "is-current" : ""}">
      <a class="subject-sidebar-parent ${isCurrent ? "is-current" : ""}" href="${subjectClassPath(item)}">${item.title}</a>
      ${isCurrent ? renderCurrentSubjectDepthNav(item, route) : ""}
    </div>
  `;
}

function renderCurrentSubjectDepthNav(subject: SubjectNote, route: Route): string {
  return `
    <div class="subject-sidebar-depth" aria-label="${subject.title} 하위 화면">
      <a class="subject-sidebar-depth__link ${isSubjectClassRoute(subject, route) ? "active" : ""}" href="${subjectClassPath(subject)}">수업</a>
      <a class="subject-sidebar-depth__link ${isSubjectSummaryRoute(subject, route) ? "active" : ""}" href="${subjectSummaryPath(subject)}">요약본</a>
      <a class="subject-sidebar-depth__link ${isSubjectMcpRoute(subject, route) ? "active" : ""}" href="${subjectMcpPath(subject)}">MCP 호출</a>
      <a class="subject-sidebar-depth__link ${isSubjectMemorizeRoute(subject, route) ? "active" : ""}" href="${subjectMemorizePath(subject)}">필수 암기노트</a>
    </div>
  `;
}

function isSubjectClassRoute(subject: SubjectNote, route: Route): boolean {
  return (
    (route.name === "subject" ||
      route.name === "subject-class" ||
      route.name === "week") &&
    route.subjectId === subject.id
  );
}

function isSubjectSummaryRoute(subject: SubjectNote, route: Route): boolean {
  return (
    (route.name === "subject-summaries" || route.name === "subject-summary-detail") &&
    route.subjectId === subject.id
  );
}

function isSubjectMcpRoute(subject: SubjectNote, route: Route): boolean {
  return route.name === "subject-mcp" && route.subjectId === subject.id;
}

function isSubjectMemorizeRoute(subject: SubjectNote, route: Route): boolean {
  return route.name === "subject-memorize" && route.subjectId === subject.id;
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
              ? `<a class="action-link" href="${subjectClassPath(firstSubject)}">첫 과목 공부하기</a>`
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
      <p><a href="${subjectClassPath(subject)}">← ${subject.title} 수업으로 돌아가기</a></p>
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

const DRILL_LABEL_LIMIT = 30;
const DRILL_LIST_LIMIT = 50;

function formatDrillSnippet(value: string | undefined, emptyLabel: string): string {
  const trimmed = (value ?? "").trim();
  const text = trimmed.length > 0 ? trimmed.slice(0, DRILL_LABEL_LIMIT) : emptyLabel;
  return escapeHtml(text);
}

function getDrillPageNumber(type: InspectorDrillType, item: unknown): number {
  const candidate = item as { page?: unknown; pageNumber?: unknown };
  const rawPage = type === "sticky" || type === "ink" ? candidate.pageNumber : candidate.page;
  const page = Number(rawPage);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function getStickyDrillText(note: SubjectPdfWorkspace["stickyNotes"][number]): string {
  const blocks = Array.isArray(note.blocks) ? note.blocks : [];
  return blocks.find((block) => block.content.trim().length > 0)?.content ?? blocks[0]?.content ?? "";
}

function getChecklistDrillText(checklist: PdfChecklist): string {
  const items = Array.isArray(checklist.items) ? checklist.items : [];
  return items.find((item) => item.label.trim().length > 0)?.label ?? items[0]?.label ?? "";
}

function getTableDrillText(table: PdfTable): string {
  const parsed = parseMarkdownTable(table.content);
  const cells = parsed ? [...parsed.headers, ...parsed.rows.flat()] : [];
  return cells.find((cell) => cell.trim().length > 0) ?? "";
}

function getChartDrillTypeLabel(content: string): string {
  const trimmed = content.trimStart();
  if (trimmed.startsWith(CHART_TYPE_PREFIX)) {
    const newline = trimmed.indexOf("\n");
    const rawType = (newline < 0 ? trimmed.slice(CHART_TYPE_PREFIX.length) : trimmed.slice(CHART_TYPE_PREFIX.length, newline)).trim();
    if (rawType === "sin" || rawType === "cos" || rawType === "tan" || rawType === "bar" || rawType === "xy" || rawType === "trig") {
      return rawType;
    }
  }

  return decodeChartContent(content).chartType;
}

export function formatDrillLabel(type: InspectorDrillType, item: unknown, index: number = 0): string {
  const pageNumber = getDrillPageNumber(type, item);

  if (type === "sticky") {
    return `페이지 ${pageNumber} · ${formatDrillSnippet(getStickyDrillText(item as SubjectPdfWorkspace["stickyNotes"][number]), "(빈 메모)")}`;
  }

  if (type === "textbox") {
    const textBox = item as Partial<PdfTextBox>;
    return `페이지 ${pageNumber} · ${formatDrillSnippet(typeof textBox.content === "string" ? textBox.content : "", "(빈 텍스트)")}`;
  }

  if (type === "checklist") {
    return `페이지 ${pageNumber} · ${formatDrillSnippet(getChecklistDrillText(item as PdfChecklist), "(빈 체크리스트)")}`;
  }

  if (type === "table") {
    return `페이지 ${pageNumber} · ${formatDrillSnippet(getTableDrillText(item as PdfTable), "(빈 표)")}`;
  }

  if (type === "chart") {
    const chart = item as Partial<PdfChart>;
    const content = typeof chart.content === "string" ? chart.content : "";
    const typeLabel = getChartDrillTypeLabel(content);
    const pointCount = decodeChartContent(content).points.length;
    return `페이지 ${pageNumber} · ${escapeHtml(typeLabel)} (${pointCount} points)`;
  }

  const stroke = item as Partial<PdfInkStroke>;
  const pointCount = Array.isArray(stroke.points) ? stroke.points.length : 0;
  return `페이지 ${pageNumber} · stroke #${index + 1} (점 ${pointCount}개)`;
}

interface InspectorDrillEntry {
  id: string;
  index: number;
  item: unknown;
  pageNumber: number;
}

function getDrillItemId(type: InspectorDrillType, item: unknown, index: number): string {
  const candidate = item as { id?: unknown; strokeId?: unknown };
  const id = typeof candidate.id === "string"
    ? candidate.id
    : typeof candidate.strokeId === "string"
      ? candidate.strokeId
      : "";
  return id.length > 0 ? id : `${type}-${index}`;
}

function getInspectorDrillEntries(type: InspectorDrillType, workspace: SubjectPdfWorkspace): InspectorDrillEntry[] {
  const items: unknown[] =
    type === "sticky" ? workspace.stickyNotes :
    type === "ink" ? workspace.inkStrokes :
    type === "textbox" ? workspace.textBoxes :
    type === "checklist" ? workspace.checklists :
    type === "table" ? workspace.tables :
    workspace.charts;

  return items
    .map((item, index) => ({
      id: getDrillItemId(type, item, index),
      index,
      item,
      pageNumber: getDrillPageNumber(type, item)
    }))
    .sort((a, b) => a.pageNumber - b.pageNumber || a.index - b.index);
}

export function renderDrillList(
  type: InspectorDrillType,
  workspace: SubjectPdfWorkspace,
  subjectId: string
): string {
  const entries = getInspectorDrillEntries(type, workspace);
  const visible = entries.slice(0, DRILL_LIST_LIMIT);
  const hiddenCount = entries.length - visible.length;
  const itemsHtml = visible.length > 0
    ? visible.map((entry) => `
        <li>
          <button
            type="button"
            class="pdf-inspector-drill-item"
            data-action="select-drill-item"
            data-drill-type="${escapeHtml(type)}"
            data-subject-id="${escapeHtml(subjectId)}"
            data-annotation-id="${escapeHtml(entry.id)}"
            data-page-number="${escapeHtml(String(entry.pageNumber))}"
          >${formatDrillLabel(type, entry.item, entry.index)}</button>
        </li>
      `).join("")
    : `<li class="pdf-inspector-drill-empty">없음</li>`;
  const moreHtml = hiddenCount > 0
    ? `<li class="pdf-inspector-drill-more">+ ${hiddenCount}개 더 있음</li>`
    : "";

  return `
    <ul class="pdf-inspector-drill-list" data-drill-type="${escapeHtml(type)}">
      ${itemsHtml}
      ${moreHtml}
    </ul>
  `;
}

function renderInspectorStatRow(
  type: InspectorDrillType,
  label: string,
  count: number,
  workspace: SubjectPdfWorkspace,
  subjectId: string
): string {
  const isExpanded = inspectorDrill[type] === true;

  return `
    <div class="pdf-inspector-stat-row">
      <button
        type="button"
        class="pdf-inspector-drill-toggle"
        data-action="toggle-inspector-drill"
        data-drill-type="${escapeHtml(type)}"
        aria-expanded="${isExpanded ? "true" : "false"}"
      >
        <span class="pdf-inspector-stat-label">${escapeHtml(label)}</span>
        <span class="pdf-inspector-stat-count">${count}개</span>
        <span class="pdf-inspector-drill-caret" aria-hidden="true">▾</span>
      </button>
      ${isExpanded ? renderDrillList(type, workspace, subjectId) : ""}
    </div>
  `;
}

function getPdfFrameKey(materialId: string, pageNumber: number): string {
  return `pdf-frame:${materialId}:${pageNumber}`;
}

function getPdfFramePages(
  selectedPage: number,
  pageCount: number,
  pending?: { fromPage: number; toPage: number }
): number[] {
  const pages = [selectedPage];

  if (selectedPage > 1) {
    pages.push(selectedPage - 1);
  }

  if (selectedPage < pageCount) {
    pages.push(selectedPage + 1);
  }

  if (pending) {
    pages.push(pending.fromPage, pending.toPage);
  }

  return [...new Set(pages)].filter((page) => page >= 1 && page <= pageCount);
}

function renderPdfFrameStack(
  subject: SubjectNote,
  material: NonNullable<SubjectPdfWorkspace["material"]>,
  objectUrl: string,
  selectedPage: number
): string {
  const materialId = material.backendMaterialId ?? "";
  const pending =
    pendingPdfPageTransition?.subjectId === subject.id &&
    pendingPdfPageTransition.materialId === materialId
      ? pendingPdfPageTransition
      : undefined;

  return getPdfFramePages(selectedPage, material.pageCount, pending).map((pageNumber) => {
    const isActive = pageNumber === selectedPage;
    const frameKey = getPdfFrameKey(materialId, pageNumber);
    const frameSrc = `${objectUrl}#page=${pageNumber}&toolbar=0&navpanes=0&view=Fit`;
    const preloadAttrs = isActive ? "" : ' aria-hidden="true" tabindex="-1"';

    return `<iframe
      class="pdf-frame ${isActive ? "is-active" : "is-preload"}"
      data-pdf-frame="true"
      data-pdf-frame-key="${escapeHtml(frameKey)}"
      data-material-id="${escapeHtml(materialId)}"
      data-page-number="${pageNumber}"
      title="${escapeHtml(subject.title)} PDF preview"
      src="${escapeHtml(frameSrc)}"
      loading="eager"${preloadAttrs}
    ></iframe>`;
  }).join("");
}

function renderPdfWorkspacePage(subject: SubjectNote): string {
  const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subject.id);
  const material = workspace.material;
  const subjectMaterials = getSubjectPdfMaterials(subject.id);
  const materialCount = subjectMaterials.length;
  const currentMaterialKey = material ? getPdfMaterialKey(material) : undefined;
  const canManageMaterials = canManagePdfMaterials();
  const uploadTitle = canManageMaterials
    ? materialCount > 0
      ? "강의 PDF 추가 업로드"
      : "강의 PDF 업로드"
    : "공유 자료";
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
  // sprint-13/slice-2: filter tables for current page
  const pageTables = workspace.tables.filter(
    (table) => table.page === selectedPage
  );
  // sprint-13/slice-3: filter charts for current page
  const pageCharts = workspace.charts.filter(
    (chart) => chart.page === selectedPage
  );
  const inputId = `pdf-file-${subject.id}`;
  const selectedPageLabel = escapeHtml(String(selectedPage));

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.title} · backend PDF 작업공간</p>
      <h1>${subject.title} PDF 필기</h1>
      <p class="lede">
        관리자가 올린 공유 PDF를 열고, 내 필기와 메모는 사용자별 작업공간에 따로 저장합니다.
      </p>
      <p><a href="${subjectClassPath(subject)}">← ${subject.title} 수업으로 돌아가기</a></p>
    </section>

    <section class="upload-section pdf-upload-section" aria-labelledby="pdf-upload-title">
      <div>
        <p class="meta">§1 — 자료 관리</p>
        <h2 id="pdf-upload-title">${uploadTitle}</h2>
        <p class="lede">
          ${canManageMaterials
            ? "이미 등록된 자료가 있어도 PDF를 계속 추가할 수 있습니다. 수업일은 자동 배정하지 않고 업로드 후 수정 단계에서 지정합니다."
            : "PDF 업로드는 관리자에게 맡기고, 학생은 등록된 자료를 열어 개인 필기만 저장합니다."}
        </p>
      </div>
      <div class="upload-panel">
        ${canManageMaterials
          ? `<input
              id="${inputId}"
              class="file-input"
              type="file"
              accept="application/pdf,.pdf"
              data-action="import-pdf-material"
              data-subject-id="${subject.id}"
            />
            <label class="file-drop" for="${inputId}">
              <strong>${subject.title} PDF ${materialCount > 0 ? "추가 업로드" : "선택 및 업로드"}</strong>
              <span>날짜와 수업일은 자동으로 정하지 않습니다. 먼저 올리고 나중에 자료 정보에서 수정하세요.</span>
            </label>`
          : `<div class="policy-block is-standalone">
              <strong>업로드는 관리자만 가능합니다.</strong>
              <p>필요한 수업자료가 없으면 관리자에게 업로드를 요청하세요. 등록된 자료는 아래 목록에서 바로 열 수 있습니다.</p>
            </div>`}
        ${canManageMaterials
          ? `<div class="pdf-upload-hint">${materialCount > 0
              ? `현재 ${materialCount}개 자료가 등록되어 있습니다. 새 파일을 선택하면 같은 과목 자료에 추가됩니다.`
              : "첫 PDF를 올린 뒤에도 이 영역에서 계속 추가 업로드할 수 있습니다."}</div>`
          : ""}
        ${material ? renderPdfMaterialStatus(material, Boolean(objectUrl), isPreviewLoading) : ""}
        ${intakeFeedback
          ? renderIntakeFeedback("PDF 업로드 상태가 여기에 표시됩니다.")
          : `<div class="import-feedback">${materialCount > 0 ? "새 PDF를 선택하면 이 과목 자료 목록에 추가됩니다." : "아직 업로드한 PDF 파일이 없습니다."}</div>`}
      </div>
    </section>

    ${renderSubjectPdfMaterialBrowser(subject, subjectMaterials, currentMaterialKey)}

    <section class="pdf-workspace" id="pdf-workspace-root" aria-labelledby="pdf-workspace-title">
      ${objectUrl ? `
        <div class="pdf-page-binding-notice" role="note" aria-live="polite">
          <strong class="pdf-page-binding-notice__title">현재 페이지 ${selectedPageLabel}</strong>
          <span class="pdf-page-binding-notice__body">보이는 화면에 다른 페이지가 함께 나와도 메모/필기는 현재 페이지에만 저장됩니다. 다른 페이지에 메모하려면 페이지를 먼저 이동하세요.</span>
        </div>
      ` : ""}
      <div class="pdf-workspace-header">
        <div>
          <p class="meta">§3 — PDF viewer + annotation layer</p>
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
            objectUrl && material
              ? renderPdfFrameStack(subject, material, objectUrl, selectedPage)
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
            ${objectUrl ? `
              <div class="pdf-surface-page-badge" aria-hidden="true" data-current-page-badge="true">페이지 ${selectedPageLabel}</div>
              <div class="pdf-surface-page-end" aria-hidden="true">
                <span class="pdf-surface-page-end__label">↑ 페이지 ${selectedPageLabel} 영역 끝 — 그 아래는 다음 페이지 미리보기</span>
              </div>
            ` : ""}
            <svg class="ink-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true">
              ${pageStrokes.map(renderInkStroke).join("")}
            </svg>
            <svg class="ink-layer is-live-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true" data-live-ink-layer="true"></svg>
            ${pageNotes.map((note) => renderStickyNote(subject.id, note)).join("")}
            ${pageTextBoxes.map((tb) => renderTextBox(subject.id, tb)).join("")}
            ${pageChecklists.map((cl) => renderChecklist(subject.id, cl)).join("")}
            ${pageTables.map((table) => renderTableMount(subject.id, table)).join("")}
            ${pageCharts.map((chart) => renderChartMount(subject.id, chart)).join("")}
          </div>
        </div>

        <aside
          class="pdf-inspector${inspectorOpen ? "" : " pdf-inspector--collapsed"}"
          id="pdf-inspector-aside"
          aria-label="PDF annotation state"
          aria-hidden="${inspectorOpen ? "false" : "true"}"
        >
          <p class="meta">§4 — 저장 상태</p>
          <h3>로컬 annotation</h3>
          <dl class="pdf-inspector-stats">
            ${renderInspectorStatRow("sticky", "포스트잇", workspace.stickyNotes.length, workspace, subject.id)}
            ${renderInspectorStatRow("ink", "펜 stroke", workspace.inkStrokes.length, workspace, subject.id)}
            ${renderInspectorStatRow("textbox", "텍스트 박스", workspace.textBoxes.length, workspace, subject.id)}
            ${renderInspectorStatRow("checklist", "체크리스트", workspace.checklists.length, workspace, subject.id)}
            ${renderInspectorStatRow("table", "표", workspace.tables.length, workspace, subject.id)}
            ${renderInspectorStatRow("chart", "그래프", workspace.charts.length, workspace, subject.id)}
            <div class="pdf-inspector-stat-row pdf-inspector-stat-row--plain"><dt>현재 도구</dt><dd>${formatPdfTool(selectedTool)}</dd></div>
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

  // sprint-1/S4: surface page-nav hotkeys on the buttons themselves so users do
  // not have to consult the help modal. Cmd/Ctrl + [ / ] mirrors the dispatcher.
  const isMacLike =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
  const modifierLabel = isMacLike ? "⌘" : "Ctrl";

  return `
    <div class="pdf-toolbar" aria-label="PDF 작업 도구">
      <div class="pdf-page-controls">
        <button
          class="secondary-action"
          type="button"
          data-action="pdf-prev-page"
          data-subject-id="${subjectId}"
          aria-keyshortcuts="${isMacLike ? "Meta" : "Control"}+["
          ${disabled}
        >
          <span class="tool-button__label">이전</span>
          <kbd class="tool-button__key" aria-hidden="true">${modifierLabel}+[</kbd>
        </button>
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
        <button
          class="secondary-action"
          type="button"
          data-action="pdf-next-page"
          data-subject-id="${subjectId}"
          aria-keyshortcuts="${isMacLike ? "Meta" : "Control"}+]"
          ${disabled}
        >
          <span class="tool-button__label">다음</span>
          <kbd class="tool-button__key" aria-hidden="true">${modifierLabel}+]</kbd>
        </button>
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
        ${renderToolButton(subjectId, "table", selectedTool, "표")}
        ${renderToolButton(subjectId, "chart", selectedTool, "그래프")}
      </div>
      <div class="pdf-tool-group" role="group" aria-label="화면 전환">
        ${renderFullscreenToggleButton()}
      </div>
      ${selectedTool === "eraser" ? renderEraserSubToolbar(subjectId, eraserShape, eraserSize, disabled) : ""}
    </div>
  `;
}

function renderFullscreenToggleButton(): string {
  const active = isPdfWorkspaceFullscreen();
  const label = active ? "전체화면 종료" : "전체화면";
  return `
    <button
      class="tool-button"
      type="button"
      data-action="toggle-pdf-fullscreen"
      aria-pressed="${active ? "true" : "false"}"
      aria-keyshortcuts="F"
    >
      <span class="tool-button__label">${label}</span>
      <kbd class="tool-button__key" aria-hidden="true">F</kbd>
    </button>
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
  // sprint-1/S2: append <kbd> badge if the tool has a single-key hotkey.
  // Visible label and aria-keyshortcuts both expose the hotkey to users and AT.
  const hotkey = PDF_TOOL_HOTKEY_LABELS[tool];
  const badgeHtml = hotkey
    ? ` <kbd class="tool-button__key" aria-hidden="true">${hotkey}</kbd>`
    : "";
  const ariaShortcut = hotkey ? ` aria-keyshortcuts="${hotkey}"` : "";

  return `
    <button
      class="tool-button ${selectedTool === tool ? "active" : ""}"
      type="button"
      data-action="set-pdf-tool"
      data-subject-id="${subjectId}"
      data-tool="${tool}"
      aria-pressed="${selectedTool === tool ? "true" : "false"}"${ariaShortcut}
    >
      <span class="tool-button__label">${label}</span>${badgeHtml}
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

function renderChartMount(subjectId: string, chart: PdfChart): string {
  return `
    <div
      data-chart-mount-id="${escapeHtml(chart.id)}"
      data-subject-id="${escapeHtml(subjectId)}"
    ></div>
  `;
}

// sprint-13/slice-5+: renderChart rewritten — CSV textarea폐기, x/y coordinate UI + trig mode.
// Content encoding: "type:<chartType>\n<csv>" — persisted in free-string chart.content field.
// Domain PdfChartType has a legacy single chart enum; LocalChartType widens to xy|bar|trig.
function renderChart(subjectId: string, chart: PdfChart): HTMLElement {
  const isCollapsed = chart.collapsed !== false;
  const bodyId = "pdf-chart-body-" + chart.id;
  const { chartType, points, functionType } = decodeChartContent(chart.content);

  const article = document.createElement("article");
  article.className = "pdf-chart" + (isCollapsed ? " is-collapsed" : "");
  article.dataset.chartId = chart.id;
  article.style.left = String(chart.position.x * 100) + "%";
  article.style.top = String(chart.position.y * 100) + "%";

  // --- header ---
  const header = document.createElement("div");
  header.className = "pdf-chart-header";
  header.dataset.action = "chart-drag-handle";
  header.dataset.chartId = chart.id;
  header.setAttribute("aria-label", "그래프 이동");
  header.setAttribute("role", "button");
  header.tabIndex = 0;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "pdf-chart-toggle";
  toggle.dataset.action = "toggle-chart-collapsed";
  toggle.dataset.subjectId = subjectId;
  toggle.dataset.chartId = chart.id;
  toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  toggle.setAttribute("aria-controls", bodyId);
  toggle.setAttribute("aria-label", isCollapsed ? "그래프 펼치기" : "그래프 접기");
  toggle.textContent = isCollapsed ? "▶" : "▼";

  const titleSpan = document.createElement("span");
  titleSpan.className = "pdf-chart-title";
  titleSpan.textContent = "그래프";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "pdf-chart-delete";
  remove.dataset.action = "delete-chart";
  remove.dataset.subjectId = subjectId;
  remove.dataset.chartId = chart.id;
  remove.setAttribute("aria-label", "그래프 삭제");
  remove.textContent = "✕";

  header.append(toggle, titleSpan, remove);

  // --- body ---
  const body = document.createElement("div");
  body.className = "pdf-chart-body";
  body.id = bodyId;
  body.dataset.hiddenWhenCollapsed = "";

  // chart type select
  const typeSelect = document.createElement("select");
  typeSelect.className = "pdf-chart-type-select";
  typeSelect.dataset.action = "update-chart-type";
  typeSelect.dataset.subjectId = subjectId;
  typeSelect.dataset.chartId = chart.id;
  typeSelect.setAttribute("aria-label", "차트 종류");

  const typeOptions: Array<{ value: LocalChartType; label: string }> = [
    { value: "xy", label: "좌표 직접 입력 (x,y)" },
    { value: "trig", label: "삼각함수" },
    { value: "bar", label: "막대" }
  ];
  typeOptions.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === chartType) {
      opt.selected = true;
    }
    typeSelect.append(opt);
  });

  const inputGuide = document.createElement("div");
  inputGuide.className = "pdf-chart-input-guide";
  inputGuide.textContent = chartType === "trig"
    ? "sin/cos/tan 선택 후 x 범위를 정하면 y=f(x)로 계산합니다. tan 은 ±π/2 근방에서 path 가 끊어집니다."
    : chartType === "bar"
      ? "각 항목의 x 라벨과 y 값을 직접 입력합니다."
      : "각 행의 x 좌표와 y 좌표를 직접 입력합니다. 예: (-1, 1), (0, 0), (1, 1).";

  // SVG preview stays above the generated coordinate rows so function fill does not push it away.
  const preview = document.createElementNS(SVG_NS, "svg");
  preview.setAttribute("class", "pdf-chart-preview");
  preview.setAttribute("data-chart-preview-id", chart.id);
  preview.setAttribute("xmlns", SVG_NS);
  buildChartSvg(preview, chartType, points, functionType);

  // data point list container
  const dataContainer = document.createElement("div");
  dataContainer.className = "pdf-chart-data";
  // data-chart-point-count is read by readChartDataFromDom to know how many rows to scan
  dataContainer.dataset.chartPointCount = String(points.length);

  points.forEach((point, idx) => {
    dataContainer.append(buildChartPointRow(subjectId, chart.id, idx, point));
  });

  const addPointBtn = document.createElement("button");
  addPointBtn.type = "button";
  addPointBtn.className = "pdf-chart-add-point";
  addPointBtn.dataset.action = "add-chart-point";
  addPointBtn.dataset.subjectId = subjectId;
  addPointBtn.dataset.chartId = chart.id;
  addPointBtn.textContent = "+ 좌표";

  const clearPointsBtn = document.createElement("button");
  clearPointsBtn.type = "button";
  clearPointsBtn.className = "pdf-chart-clear-points";
  clearPointsBtn.dataset.action = "clear-chart-points";
  clearPointsBtn.dataset.subjectId = subjectId;
  clearPointsBtn.dataset.chartId = chart.id;
  clearPointsBtn.textContent = "좌표 전체 지우기";

  const pointActions = document.createElement("div");
  pointActions.className = "pdf-chart-point-actions";
  pointActions.append(addPointBtn, clearPointsBtn);

  body.append(typeSelect, inputGuide);
  if (chartType === "trig") {
    body.append(buildChartFunctionControls(subjectId, chart.id, functionType ?? "sin"), preview);
  } else {
    body.append(preview, dataContainer, pointActions);
  }
  article.append(header, body);
  return article;
}

function buildChartFunctionControls(
  subjectId: string,
  chartId: string,
  selectedFunctionType: LocalChartFunction = "sin"
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "pdf-chart-function-controls";

  const title = document.createElement("div");
  title.className = "pdf-chart-function-title";
  title.textContent = "삼각함수 렌더링";

  const fnLabel = document.createElement("label");
  fnLabel.className = "pdf-chart-function-field";
  const fnText = document.createElement("span");
  fnText.textContent = "함수";
  const fnSelect = document.createElement("select");
  fnSelect.dataset.action = "select-chart-function";
  fnSelect.dataset.chartId = chartId;
  [
    { value: "sin", label: "sin(x)" },
    { value: "cos", label: "cos(x)" },
    { value: "tan", label: "tan(x)" }
  ].forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === selectedFunctionType) {
      opt.selected = true;
    }
    fnSelect.append(opt);
  });
  fnLabel.append(fnText, fnSelect);

  const xMin = buildChartFunctionInput(chartId, "set-chart-function-x-min", "x 최소", "-3.14");
  const xMax = buildChartFunctionInput(chartId, "set-chart-function-x-max", "x 최대", "3.14");
  const yRange = buildChartFunctionInput(chartId, "show-chart-function-y-range", "y축 범위", "자동 결정", true);
  const samples = buildChartFunctionInput(chartId, "set-chart-function-samples", "샘플 개수", "49");

  const fillBtn = document.createElement("button");
  fillBtn.type = "button";
  fillBtn.className = "pdf-chart-function-fill";
  fillBtn.dataset.action = "fill-chart-function";
  fillBtn.dataset.subjectId = subjectId;
  fillBtn.dataset.chartId = chartId;
  fillBtn.textContent = "그래프 그리기";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "pdf-chart-function-clear";
  clearBtn.dataset.action = "clear-chart-points";
  clearBtn.dataset.subjectId = subjectId;
  clearBtn.dataset.chartId = chartId;
  clearBtn.textContent = "지우기";

  wrap.append(title, fnLabel, xMin, xMax, yRange, samples, fillBtn, clearBtn);
  return wrap;
}

function buildChartFunctionInput(
  chartId: string,
  action: string,
  label: string,
  value: string,
  readOnly = false
): HTMLElement {
  const field = document.createElement("label");
  field.className = "pdf-chart-function-field";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = readOnly ? "text" : "number";
  if (!readOnly) {
    input.step = "any";
  }
  input.dataset.action = action;
  input.dataset.chartId = chartId;
  input.value = value;
  if (readOnly) {
    input.readOnly = true;
  }
  field.append(text, input);
  return field;
}

function buildChartPointRow(
  subjectId: string,
  chartId: string,
  idx: number,
  point: CsvSeriesPoint
): HTMLElement {
  const row = document.createElement("div");
  row.className = "pdf-chart-point";

  const xField = document.createElement("label");
  xField.className = "pdf-chart-point-field";
  const xText = document.createElement("span");
  xText.textContent = "x";
  const labelInp = document.createElement("input");
  labelInp.type = "text";
  labelInp.inputMode = "decimal";
  labelInp.className = "pdf-chart-point-x";
  labelInp.dataset.action = "update-chart-point-x";
  labelInp.dataset.subjectId = subjectId;
  labelInp.dataset.chartId = chartId;
  labelInp.dataset.pointIdx = String(idx);
  labelInp.setAttribute("aria-label", "x 좌표");
  labelInp.setAttribute("placeholder", "-3.14");
  labelInp.value = point.label;
  xField.append(xText, labelInp);

  const yField = document.createElement("label");
  yField.className = "pdf-chart-point-field";
  const yText = document.createElement("span");
  yText.textContent = "y";
  const valueInp = document.createElement("input");
  valueInp.type = "number";
  valueInp.step = "any";
  valueInp.className = "pdf-chart-point-value";
  valueInp.dataset.action = "update-chart-point-value";
  valueInp.dataset.subjectId = subjectId;
  valueInp.dataset.chartId = chartId;
  valueInp.dataset.pointIdx = String(idx);
  valueInp.setAttribute("aria-label", "y 좌표");
  valueInp.setAttribute("placeholder", "0");
  valueInp.value = String(point.value);
  yField.append(yText, valueInp);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "pdf-chart-point-delete";
  deleteBtn.dataset.action = "delete-chart-point";
  deleteBtn.dataset.subjectId = subjectId;
  deleteBtn.dataset.chartId = chartId;
  deleteBtn.dataset.pointIdx = String(idx);
  deleteBtn.setAttribute("aria-label", "좌표 삭제");
  deleteBtn.textContent = "✕";

  row.append(xField, yField, deleteBtn);
  return row;
}

// sprint-13/slice-5: table widget mount placeholder (mirrors renderChartMount).
// Table DOM element is built by renderTable() and injected by refreshTableWidgets().
function renderTableMount(subjectId: string, table: PdfTable): string {
  return `<div data-table-mount-id="${escapeHtml(table.id)}" data-subject-id="${escapeHtml(subjectId)}"></div>`;
}

// sprint-13/slice-5: table widget renderer rewritten as DOM API.
// markdown textarea폐기 → <th><input> per header cell + <td><input> per data cell.
// Default content = 2x2 table when content is empty or parse fails.
// data-table-row-count attribute on tbody is read by readTableDataFromDom.
function renderTable(subjectId: string, table: PdfTable): HTMLElement {
  const isCollapsed = table.collapsed !== false;
  const bodyId = "pdf-table-body-" + table.id;

  // Parse stored content; fall back to default 2x2 on empty/parse-fail
  const DEFAULT_CONTENT = "| 제목 1 | 제목 2 |\n|---|---|\n| 값 1 | 값 2 |";
  const effectiveContent = table.content.trim().length > 0 ? table.content : DEFAULT_CONTENT;
  const parsed = parseMarkdownTable(effectiveContent) ?? parseMarkdownTable(DEFAULT_CONTENT) ?? {
    headers: ["제목 1", "제목 2"],
    rows: [["값 1", "값 2"]]
  };

  const article = document.createElement("article");
  article.className = "pdf-table" + (isCollapsed ? " is-collapsed" : "");
  article.dataset.tableId = table.id;
  article.style.left = String(table.position.x * 100) + "%";
  article.style.top = String(table.position.y * 100) + "%";

  // --- header ---
  const header = document.createElement("div");
  header.className = "pdf-table-header";
  header.dataset.action = "table-drag-handle";
  header.dataset.tableId = table.id;
  header.setAttribute("aria-label", "표 이동");
  header.setAttribute("role", "button");
  header.tabIndex = 0;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "pdf-table-toggle";
  toggle.dataset.action = "toggle-table-collapsed";
  toggle.dataset.subjectId = subjectId;
  toggle.dataset.tableId = table.id;
  toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  toggle.setAttribute("aria-controls", bodyId);
  toggle.setAttribute("aria-label", isCollapsed ? "표 펼치기" : "표 접기");
  toggle.textContent = isCollapsed ? "▶" : "▼";

  const titleSpan = document.createElement("span");
  titleSpan.className = "pdf-table-title";
  titleSpan.textContent = "표";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "pdf-table-delete";
  remove.dataset.action = "delete-table";
  remove.dataset.subjectId = subjectId;
  remove.dataset.tableId = table.id;
  remove.setAttribute("aria-label", "표 삭제");
  remove.textContent = "✕";

  header.append(toggle, titleSpan, remove);

  // --- body ---
  const body = document.createElement("div");
  body.className = "pdf-table-body";
  body.id = bodyId;
  body.dataset.hiddenWhenCollapsed = "";

  // editable <table>
  const gridTable = document.createElement("table");
  gridTable.className = "pdf-table-grid";

  // thead: header inputs + delete-column buttons
  const thead = document.createElement("thead");
  const headerTr = document.createElement("tr");

  parsed.headers.forEach((headerVal, colIdx) => {
    const th = document.createElement("th");
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "pdf-table-cell-input";
    inp.dataset.action = "update-table-cell";
    inp.dataset.subjectId = subjectId;
    inp.dataset.tableId = table.id;
    inp.dataset.cellKind = "header";
    inp.dataset.cellCol = String(colIdx);
    inp.value = headerVal;
    inp.setAttribute("aria-label", `헤더 ${colIdx + 1}`);
    th.append(inp);
    headerTr.append(th);
  });

  // delete-column buttons in header row (last cell = action column)
  const thColActions = document.createElement("th");
  thColActions.className = "pdf-table-col-actions";
  parsed.headers.forEach((_, colIdx) => {
    const delCol = document.createElement("button");
    delCol.type = "button";
    delCol.className = "pdf-table-delete-col";
    delCol.dataset.action = "delete-table-column";
    delCol.dataset.subjectId = subjectId;
    delCol.dataset.tableId = table.id;
    delCol.dataset.col = String(colIdx);
    delCol.setAttribute("aria-label", `${colIdx + 1}열 삭제`);
    delCol.textContent = "✕";
    thColActions.append(delCol);
  });
  headerTr.append(thColActions);
  thead.append(headerTr);
  gridTable.append(thead);

  // tbody: data rows + delete-row buttons
  const tbody = document.createElement("tbody");
  // data-table-row-count is read by readTableDataFromDom
  tbody.dataset.tableRowCount = String(parsed.rows.length);

  parsed.rows.forEach((row, rowIdx) => {
    const tr = document.createElement("tr");

    row.forEach((cellVal, colIdx) => {
      const td = document.createElement("td");
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "pdf-table-cell-input";
      inp.dataset.action = "update-table-cell";
      inp.dataset.subjectId = subjectId;
      inp.dataset.tableId = table.id;
      inp.dataset.cellKind = "row";
      inp.dataset.cellRow = String(rowIdx);
      inp.dataset.cellCol = String(colIdx);
      inp.value = cellVal;
      inp.setAttribute("aria-label", `행 ${rowIdx + 1} 열 ${colIdx + 1}`);
      td.append(inp);
      tr.append(td);
    });

    const tdRowAction = document.createElement("td");
    tdRowAction.className = "pdf-table-row-actions";
    const delRow = document.createElement("button");
    delRow.type = "button";
    delRow.className = "pdf-table-delete-row";
    delRow.dataset.action = "delete-table-row";
    delRow.dataset.subjectId = subjectId;
    delRow.dataset.tableId = table.id;
    delRow.dataset.row = String(rowIdx);
    delRow.setAttribute("aria-label", `${rowIdx + 1}행 삭제`);
    delRow.textContent = "✕";
    tdRowAction.append(delRow);
    tr.append(tdRowAction);
    tbody.append(tr);
  });

  gridTable.append(tbody);

  // add row/col buttons
  const tableActions = document.createElement("div");
  tableActions.className = "pdf-table-actions";

  const addRowBtn = document.createElement("button");
  addRowBtn.type = "button";
  addRowBtn.className = "pdf-table-add-row";
  addRowBtn.dataset.action = "add-table-row";
  addRowBtn.dataset.subjectId = subjectId;
  addRowBtn.dataset.tableId = table.id;
  addRowBtn.textContent = "+ 행";

  const addColBtn = document.createElement("button");
  addColBtn.type = "button";
  addColBtn.className = "pdf-table-add-col";
  addColBtn.dataset.action = "add-table-column";
  addColBtn.dataset.subjectId = subjectId;
  addColBtn.dataset.tableId = table.id;
  addColBtn.textContent = "+ 열";

  tableActions.append(addRowBtn, addColBtn);
  body.append(gridTable, tableActions);
  article.append(header, body);
  return article;
}

function renderInkStroke(stroke: PdfInkStroke): string {
  return `
    <polyline
      class="ink-stroke"
      data-stroke-id="${escapeHtml(stroke.id)}"
      points="${stroke.points.map(formatSvgPoint).join(" ")}"
      style="stroke: ${stroke.color}; stroke-width: ${stroke.width};"
    />
  `;
}

function renderSubjectClassPage(subject: SubjectNote): string {
  const subjectMaterials = getSubjectPdfMaterials(subject.id);

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
      <h1>${subject.title}</h1>
      <p class="lede">이 진입 화면에서 유닛 카드를 골라 상세로 진입합니다. 카드 click 또는 사이드바의 명시적 메뉴 click 만 상세 라우트를 엽니다.</p>
    </section>

    <!-- sprint-2/S4: 진입화면 우선 IA — 4 개 유닛 카드 (요약본 / 암기노트 / PDF 작업공간 / 자료 매핑) 가 디폴트 진입 패턴. -->
    <section class="subject-unit-grid" aria-label="${subject.title} 유닛">
      <a class="subject-unit-card" href="${subjectClassPath(subject)}">
        <span class="subject-unit-card__meta">수업</span>
        <strong>수업일 카드</strong>
        <span class="subject-unit-card__hint">날짜별 자료 + 메모. ${subject.weekNotes.length}회.</span>
      </a>
      <a class="subject-unit-card" href="${subjectSummaryPath(subject)}">
        <span class="subject-unit-card__meta">요약</span>
        <strong>요약본</strong>
        <span class="subject-unit-card__hint">수업일별 요약 + 키워드 정리.</span>
      </a>
      <a class="subject-unit-card" href="${subjectMemorizePath(subject)}">
        <span class="subject-unit-card__meta">암기</span>
        <strong>필수 암기노트</strong>
        <span class="subject-unit-card__hint">중간/기말 구간별 + 필수 개념.</span>
      </a>
      <a class="subject-unit-card" href="${subjectPdfWorkspacePath(subject)}">
        <span class="subject-unit-card__meta">PDF</span>
        <strong>PDF 작업공간</strong>
        <span class="subject-unit-card__hint">필기 + 단축키. ${subjectMaterials.length}개 자료.</span>
      </a>
    </section>

    ${renderClassDateAddSection(subject)}

    <section aria-labelledby="weekly-title">
      <p class="meta">수업일 overview</p>
      <h2 id="weekly-title">수업일별 자료</h2>
      <p class="lede">날짜별 카드에서 수업 상세, 요약 상세, 연결된 PDF 수를 확인합니다.</p>
      <div class="class-day-grid">
        ${subject.weekNotes.map((week) =>
          renderClassDayCard(subject, week, subjectMaterials)
        ).join("")}
      </div>
    </section>

    ${renderPdfMaterialAssignmentSection(subject, subjectMaterials)}
  `;
}

function renderClassDateAddSection(subject: SubjectNote): string {
  return `
    <section class="class-date-add-section" aria-labelledby="class-date-add-title">
      <div>
        <p class="meta">수업일 추가</p>
        <h2 id="class-date-add-title">새 수업일 만들기</h2>
        <p class="lede">선업로드한 PDF를 나중에 정확한 날짜와 연결할 수 있도록 수업일 카드를 먼저 추가합니다.</p>
      </div>
      <form class="class-date-form" data-action="add-class-date">
        <input type="hidden" name="subjectId" value="${escapeHtml(subject.id)}" />
        <label>
          <span>수업일</span>
          <input name="classDate" type="text" placeholder="예: 5월 14일(목)" autocomplete="off" />
        </label>
        <label>
          <span>수업 제목</span>
          <input name="title" type="text" placeholder="예: 메모리 구조" autocomplete="off" />
        </label>
        <button class="action-button" type="submit">수업일 추가</button>
      </form>
      ${renderIntakeFeedback("수업일 추가와 PDF 매핑 상태가 여기에 표시됩니다.")}
    </section>
  `;
}

function renderClassDayCard(
  subject: SubjectNote,
  week: WeekNote,
  materials: PdfMaterialDraft[]
): string {
  const linkedMaterials = getPdfMaterialsForWeek(subject, week, materials);

  return `
    <article class="class-day-card">
      <div>
        <p class="meta">${week.label} · ${formatReviewStatus(week.reviewStatus)}</p>
        <h3>${week.title}</h3>
        <p>${week.focus}</p>
      </div>
      <div class="class-day-card__stats">
        <span>${linkedMaterials.length}개 PDF</span>
        <span>${week.requiredKeywordIds.length}개 키워드</span>
      </div>
      ${renderClassDayPdfLinks(subject, linkedMaterials)}
      ${renderClassDayPdfAttachControl(subject, materials, week.label)}
      <div class="week-card-actions">
        <a class="action-button" href="${weekPath(subject, week)}">수업 상세</a>
        <a class="secondary-link" href="${weekSummaryPath(subject, week)}">요약 상세</a>
      </div>
    </article>
  `;
}

function renderClassDayPdfAttachControl(
  subject: SubjectNote,
  materials: PdfMaterialDraft[],
  weekLabel: string
): string {
  const unassigned = materials.filter((material) =>
    isUnconfirmedPdfClassDate(subject, material.classDate)
  );
  const options = unassigned.map((material) =>
    `<option value="${escapeHtml(getPdfMaterialKey(material))}">${escapeHtml(material.fileName)}</option>`
  ).join("");

  if (!canManagePdfMaterials()) {
    return `
      <form class="class-day-card__attach" data-action="attach-pdf-to-week" data-subject-id="${escapeHtml(subject.id)}" data-week-label="${escapeHtml(weekLabel)}">
        <label>
          <span>${escapeHtml("PDF 연결")}</span>
          <select name="materialId" disabled>
            ${options || `<option value="">${escapeHtml("연결 가능한 PDF 없음")}</option>`}
          </select>
        </label>
        <button class="secondary-action" type="submit" disabled>${escapeHtml("연결")}</button>
        <p class="class-day-card__empty">${escapeHtml("PDF 연결은 운영자 권한이 필요합니다.")}</p>
      </form>
    `;
  }

  if (unassigned.length === 0) {
    return `<p class="class-day-card__empty">${escapeHtml("연결 가능한 미지정 PDF가 없습니다. 먼저 PDF 작업공간에서 업로드하세요.")}</p>`;
  }

  return `
    <form class="class-day-card__attach" data-action="attach-pdf-to-week" data-subject-id="${escapeHtml(subject.id)}" data-week-label="${escapeHtml(weekLabel)}">
      <label>
        <span>${escapeHtml("PDF 연결")}</span>
        <select name="materialId">
          ${options}
        </select>
      </label>
      <button class="secondary-action" type="submit">${escapeHtml("연결")}</button>
    </form>
  `;
}

function renderClassDayPdfLinks(
  subject: SubjectNote,
  materials: PdfMaterialDraft[]
): string {
  if (materials.length === 0) {
    return '<p class="class-day-card__empty">아직 연결된 PDF가 없습니다.</p>';
  }

  return `
    <div class="class-day-card__pdfs" aria-label="연결된 PDF">
      <p class="meta">연결 PDF</p>
      ${materials.slice(0, 2).map((material) => `
        <button
          class="class-day-card__pdf"
          type="button"
          data-action="open-pdf-material"
          data-subject-id="${escapeHtml(subject.id)}"
          data-material-id="${escapeHtml(getPdfMaterialKey(material))}"
        >
          ${escapeHtml(material.fileName)}
        </button>
      `).join("")}
      ${materials.length > 2 ? `<span class="class-day-card__more">외 ${materials.length - 2}개</span>` : ""}
    </div>
  `;
}

function renderPdfMaterialAssignmentSection(
  subject: SubjectNote,
  materials: PdfMaterialDraft[]
): string {
  return `
    <section class="pdf-material-browser" aria-labelledby="pdf-assignment-title">
      <div class="pdf-material-browser__header">
        <div>
          <p class="meta">PDF 수업일 매핑</p>
          <h2 id="pdf-assignment-title">업로드한 PDF 연결</h2>
          <p class="lede">PDF는 먼저 올리고, 수업일이 확정되면 여기서 날짜를 지정합니다.</p>
        </div>
        <span class="pdf-count-pill">${materials.length}개 자료</span>
      </div>
      <div class="pdf-material-slider" aria-label="${subject.title} PDF 수업일 매핑">
        ${renderPdfLibraryUploadCard(subject, materials.length)}
        ${materials.map((material) => renderPdfMaterialCard(subject, material, {
          isCurrent: false,
          compact: false,
          showClassDateControl: true
        })).join("")}
      </div>
    </section>
  `;
}

function renderSubjectSummariesPage(subject: SubjectNote): string {
  const coverage = getSubjectCoverage(subject);

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
      <h1>${subject.title} 요약본</h1>
      <p class="lede">요약본은 수업일별로 들어가서 확인합니다. 시험 직전에는 필수 암기노트만 따로 봅니다.</p>
      <div class="hero-actions">
        <button class="action-button" type="button" data-action="generate-subject-note" data-subject-id="${subject.id}">
          전체 정리노트 만들기
        </button>
        <a class="secondary-link" href="${subjectClassPath(subject)}">수업 자료 보기</a>
        <a class="secondary-link" href="${subjectMemorizePath(subject)}">필수 암기노트</a>
      </div>
    </section>

    <section class="metric-grid" aria-label="${subject.title} 현황">
      ${renderMetric("키워드 반영률", `${coverage.coverageRate}%`, `${coverage.covered}/${coverage.total}개 반영`)}
      ${renderMetric("수업일", `${subject.weekNotes.length}개 노트`, "날짜별 노트")}
      ${renderMetric("시험 범위", subject.summary.weekRange, subject.examLabel)}
    </section>

    <section aria-labelledby="summary-list-title">
      <p class="meta">날짜별 요약</p>
      <h2 id="summary-list-title">수업일별 요약 목록</h2>
      <div class="class-day-grid">
        ${subject.weekNotes.map((week) => renderSummaryDayCard(subject, week)).join("")}
      </div>
    </section>

    <section aria-labelledby="summary-course-title">
      <p class="meta">과목 단위 메모</p>
      <h2 id="summary-course-title">전체 요약 방향</h2>
      <div class="summary-grid">
        ${renderSummaryBlock("시험 범위", subject.summary.examScope)}
        ${renderSummaryBlock("복습 전략", subject.summary.strategy)}
        ${renderSummaryBlock("취약 포인트", subject.summary.weakSpots.join(", "))}
      </div>
    </section>
  `;
}

function renderSummaryDayCard(subject: SubjectNote, week: WeekNote): string {
  return `
    <article class="class-day-card">
      <div>
        <p class="meta">${week.label} · ${formatReviewStatus(week.reviewStatus)}</p>
        <h3>${week.title}</h3>
        <p>${week.focus}</p>
      </div>
      <div class="class-day-card__stats">
        <span>${week.conceptIds.length}개 개념</span>
        <span>${week.exampleQuestionIds.length}개 문제</span>
      </div>
      <div class="week-card-actions">
        <a class="action-button" href="${weekSummaryPath(subject, week)}">요약 상세 보기</a>
        <a class="secondary-link" href="${weekPath(subject, week)}">수업 상세</a>
      </div>
    </article>
  `;
}

function renderWeekSummaryPage(subject: SubjectNote, week: WeekNote): string {
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
      <p class="meta">${subject.title} · ${week.label} · 요약본</p>
      <h1>${week.title} 요약</h1>
      <p class="lede">${week.focus}</p>
      <div class="hero-actions">
        <button class="action-button" type="button" data-action="generate-week-note" data-subject-id="${subject.id}" data-week-id="${week.id}">
          이 날짜 요약 만들기
        </button>
        <a class="secondary-link" href="${weekPath(subject, week)}">수업 상세</a>
        <a class="secondary-link" href="${subjectSummaryPath(subject)}">요약 목록</a>
      </div>
    </section>

    <section class="summary-grid" aria-label="${week.label} 요약 상태">
      ${renderSummaryBlock("키워드", keywords.map((keyword) => keyword.label).join(", ") || "아직 연결된 키워드가 없습니다.")}
      ${renderSummaryBlock("개념", concepts.map((concept) => concept.title).join(", ") || "아직 연결된 개념이 없습니다.")}
      ${renderSummaryBlock("자료", sources.map((source) => source.title).join(", ") || "아직 연결된 자료가 없습니다.")}
    </section>

    ${renderQuickNotePanel(subject, ["week"])}

    <section aria-labelledby="week-summary-keywords-title">
      <p class="meta">교수님 키워드</p>
      <h2 id="week-summary-keywords-title">이 날짜에 반영할 키워드</h2>
      <div class="keyword-grid">
        ${keywords.map((keyword) => renderKeyword(keyword, subject)).join("") || '<p class="empty-note">아직 연결된 키워드가 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-summary-concepts-title">
      <p class="meta">요약 상세</p>
      <h2 id="week-summary-concepts-title">개념 설명</h2>
      <div class="concept-list">
        ${concepts.map((concept) => renderConcept(concept, subject)).join("") || '<p class="empty-note">아직 연결된 개념이 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-summary-practice-title">
      <p class="meta">문제화</p>
      <h2 id="week-summary-practice-title">시험 전에 바꿔볼 질문</h2>
      <div class="question-list">
        ${questions.map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="week-summary-sources-title">
      <p class="meta">근거 자료</p>
      <h2 id="week-summary-sources-title">요약 근거</h2>
      <div class="source-grid">
        ${sources.map((source) => `
          <article class="source-row">
            <p class="meta">${formatSourceKind(source.kind)} · ${formatSourceVisibility(source.visibility)}</p>
            <h3>${source.title}</h3>
            <p>${source.note}</p>
            ${source.pages ? `<p class="source-pages">${source.pages}</p>` : ""}
          </article>
        `).join("") || '<p class="empty-note">아직 연결된 자료가 없습니다.</p>'}
      </div>
    </section>
  `;
}

// sprint-2/S3: render an exam-phase group on the memorize page.
function renderMemorizeExamGroup(
  title: string,
  weeks: WeekNote[],
  subject: SubjectNote
): string {
  if (weeks.length === 0) {
    return `
      <div class="memorize-exam-group memorize-exam-group--empty">
        <h3>${escapeHtml(title)}</h3>
        <p class="empty-note">${escapeHtml(title)} 구간의 수업일이 없습니다.</p>
      </div>
    `;
  }
  return `
    <div class="memorize-exam-group">
      <h3>${escapeHtml(title)} <span class="memorize-exam-group__count">${weeks.length}회</span></h3>
      <ul class="memorize-exam-group__list">
        ${weeks
          .map(
            (week) => `
              <li>
                <a href="${weekPath(subject, week)}">
                  <span class="memorize-exam-group__label">${escapeHtml(week.label)}</span>
                  <span class="memorize-exam-group__title">${escapeHtml(week.title)}</span>
                </a>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

// sprint-2/S3: parse "5월 14일(목)" / "5월14일" / "5/14" → millisecond timestamp.
// Failed parses → +Infinity 로 정렬 끝으로 보냄 (stable order 유지).
// sprint-2/S3 fix (codex P3): JS Date 가 invalid combo (e.g., 2/31) 를 silently
// normalize (→ March 3). day-bound 검사를 month 별 max 로 정확화 + Date 재검증.
function parseClassDateLabel(label: string): number {
  const text = label.trim();
  const kr = /(\d{1,2})\s*월\s*(\d{1,2})/.exec(text);
  if (kr) {
    const ts = safeDateMs(Number(kr[1]), Number(kr[2]));
    if (ts !== null) return ts;
  }
  const slash = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})/.exec(text);
  if (slash) {
    const ts = safeDateMs(Number(slash[1]), Number(slash[2]));
    if (ts !== null) return ts;
  }
  return Number.POSITIVE_INFINITY;
}

function safeDateMs(month: number, day: number): number | null {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // sprint-2/S3 fix (codex P3): use a leap year (2024) so "2월 29일" stays
  // valid. 학기 비교 정렬 키 용도라 연도 자체는 임의 고정 가능.
  const d = new Date(2024, month - 1, day);
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.getTime();
}

function renderSubjectMemorizePage(subject: SubjectNote): string {
  const mustKnowConcepts = subject.summary.mustKnowConceptIds
    .map((conceptId) => getConceptById(subject, conceptId))
    .filter((concept): concept is Concept => Boolean(concept));
  const missingKeywords = subject.requiredKeywords.filter((keyword) => keyword.status !== "covered");
  const examQuestions = subject.weekNotes
    .flatMap((week) => week.exampleQuestionIds)
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));

  // sprint-2/S3: 시험 구간별 수업일 그룹 + 수업일자 ascending 정렬.
  // WeekNote.examPhase override > SubjectNote.examPhase > "final" default.
  const subjectPhase = subject.examPhase ?? "final";
  const sortedWeeks = [...subject.weekNotes].sort((a, b) =>
    parseClassDateLabel(a.label) - parseClassDateLabel(b.label)
  );
  const midtermWeeks = sortedWeeks.filter((week) => (week.examPhase ?? subjectPhase) === "midterm");
  const finalWeeks = sortedWeeks.filter((week) => (week.examPhase ?? subjectPhase) === "final");

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.examLabel} · 시험 직전</p>
      <h1>${subject.title} 필수 암기노트</h1>
      <p class="lede">날짜별 요약을 다 본 뒤 마지막으로 암기할 범위, 약한 포인트, 필수 개념만 압축해서 확인합니다.</p>
      <div class="hero-actions">
        <a class="action-button" href="${subjectSummaryPath(subject)}">날짜별 요약 보기</a>
        <a class="secondary-link" href="${subjectMcpPath(subject)}">MCP 호출 준비</a>
      </div>
    </section>

    <section class="summary-grid" aria-label="${subject.title} 암기 전략">
      ${renderSummaryBlock("시험 범위", subject.summary.examScope)}
      ${renderSummaryBlock("복습 전략", subject.summary.strategy)}
      ${renderSummaryBlock("취약 포인트", subject.summary.weakSpots.join(", "))}
    </section>

    <section aria-labelledby="memorize-by-exam-title">
      <p class="meta">시험 구간별 수업일</p>
      <h2 id="memorize-by-exam-title">중간고사 / 기말고사 묶음</h2>
      <p class="lede">현재 학기의 수업일을 시험 구간으로 나눕니다. 수업일자 오름차순.</p>
      ${renderMemorizeExamGroup("중간고사", midtermWeeks, subject)}
      ${renderMemorizeExamGroup("기말고사", finalWeeks, subject)}
    </section>

    <section aria-labelledby="memorize-concepts-title">
      <p class="meta">필수 개념</p>
      <h2 id="memorize-concepts-title">반드시 외울 개념</h2>
      <div class="concept-list">
        ${mustKnowConcepts.map((concept) => renderConcept(concept, subject)).join("") || '<p class="empty-note">아직 필수 개념이 없습니다.</p>'}
      </div>
    </section>

    <section aria-labelledby="memorize-keywords-title">
      <p class="meta">빈칸 점검</p>
      <h2 id="memorize-keywords-title">보강할 교수님 키워드</h2>
      <div class="keyword-grid">
        ${(missingKeywords.length > 0 ? missingKeywords : subject.requiredKeywords)
          .map((keyword) => renderKeyword(keyword, subject))
          .join("")}
      </div>
    </section>

    <section aria-labelledby="memorize-questions-title">
      <p class="meta">직전 점검</p>
      <h2 id="memorize-questions-title">말로 풀어볼 질문</h2>
      <div class="question-list">
        ${examQuestions.slice(0, 5).map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>
  `;
}

function renderSubjectMcpPage(subject: SubjectNote): string {
  const persona = PERSONA_BY_SUBJECT[subject.id];
  const questions = subject.weekNotes
    .flatMap((week) => week.exampleQuestionIds)
    .map((questionId) => getQuestionById(subject, questionId))
    .filter((question): question is ExampleQuestion => Boolean(question));

  return `
    <section class="subject-page-hero">
      <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
      <h1>${subject.title} MCP 호출</h1>
      <p class="lede">요약본을 만들다가 막히는 개념을 과목 교수님 페르소나에게 물어보기 전, 질문할 키워드와 예제 문제를 정리합니다.</p>
      <div class="hero-actions">
        ${persona?.active
          ? `<a class="action-button" href="/persona-turn.html?subject=${encodeURIComponent(subject.id)}">${persona.nick} 호출</a>`
          : `<button class="action-button is-disabled" type="button" aria-disabled="true">${persona?.nick ?? "교수님"} 준비 중</button>`}
        <a class="secondary-link" href="${subjectSummaryPath(subject)}">요약본으로 돌아가기</a>
      </div>
    </section>

    ${renderSubjectMcpPanel(subject)}

    <section aria-labelledby="mcp-question-title">
      <p class="meta">질문거리 점검</p>
      <h2 id="mcp-question-title">막히기 쉬운 포인트</h2>
      <div class="summary-grid">
        ${renderSummaryBlock("취약 포인트", subject.summary.weakSpots.join(", "))}
        ${renderSummaryBlock("교수님 키워드", subject.requiredKeywords.map((keyword) => keyword.label).join(", "))}
        ${renderSummaryBlock("질문 전 확인", "PDF 원문과 내 요약본을 먼저 열어 근거 페이지를 확인합니다.")}
      </div>
    </section>

    <section aria-labelledby="mcp-examples-title">
      <p class="meta">예제 문제</p>
      <h2 id="mcp-examples-title">질문으로 바꿔볼 문제</h2>
      <div class="question-list">
        ${questions.map(renderQuestion).join("") || '<p class="empty-note">아직 연결된 예제문제가 없습니다.</p>'}
      </div>
    </section>
  `;
}

function renderSubjectMcpPanel(subject: SubjectNote): string {
  const persona = PERSONA_BY_SUBJECT[subject.id];

  return `
    <section aria-labelledby="mcp-title" class="subject-mcp-panel">
      <p class="meta">교수님 페르소나</p>
      <h2 id="mcp-title">교수님 페르소나에게 질문하기</h2>
      <p class="lede">요약본을 만들다가 설명이 막히는 개념은 과목별 교수님 페르소나에게 이어서 질문합니다.</p>
      <div class="subject-mcp-callout">
        <div>
          <strong>${persona?.nick ?? subject.title} ${persona?.active ? "호출 가능" : "호출 준비 중"}</strong>
          <p>${persona?.active
            ? "현재 요약본과 키워드를 보면서 모르는 부분을 바로 질문할 수 있습니다."
            : "이 과목 페르소나는 아직 준비 중입니다. 먼저 요약본을 만들고 질문거리를 정리하세요."}</p>
        </div>
        ${persona?.active
          ? `<a class="action-button" href="/persona-turn.html?subject=${encodeURIComponent(subject.id)}">${persona.nick} 호출</a>`
          : `<button class="secondary-action" type="button" data-action="generate-subject-note" data-subject-id="${escapeHtml(subject.id)}">질문거리 정리</button>`}
      </div>
    </section>
  `;
}

function renderWeekPage(subject: SubjectNote, week: WeekNote): string {
  const materials = getPdfMaterialsForWeek(subject, week, getSubjectPdfMaterials(subject.id));
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
        <a class="action-link" href="${subjectClassPath(subject)}">수업으로 돌아가기</a>
      </div>
    </section>

    ${renderWeekMappedPdfSection(subject, week, materials)}

    ${renderWeekUserNotesSection(subject, week)}

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

function renderWeekUserNotesSection(subject: SubjectNote, week: WeekNote): string {
  const value = typeof week.userNotes === "string" ? week.userNotes : "";

  return `
    <section class="week-user-notes" aria-labelledby="week-user-notes-title">
      <p class="meta">내 필기</p>
      <h2 id="week-user-notes-title">자유 메모</h2>
      <p class="lede">이 수업일에 대한 자유 형식 메모입니다. 입력 즉시 브라우저에 저장됩니다.</p>
      <textarea
        class="week-user-notes__textarea"
        data-action="update-week-user-notes"
        data-subject-id="${escapeHtml(subject.id)}"
        data-week-id="${escapeHtml(week.id)}"
        aria-labelledby="week-user-notes-title"
        placeholder="강의 중 떠오른 키워드, 질문, 정리 메모를 자유롭게 적으세요."
        rows="8"
      >${escapeHtml(value)}</textarea>
    </section>
  `;
}

function renderWeekMappedPdfSection(
  subject: SubjectNote,
  week: WeekNote,
  materials: PdfMaterialDraft[]
): string {
  return `
    <section class="pdf-material-browser" aria-labelledby="week-pdf-title">
      <div class="pdf-material-browser__header">
        <div>
          <p class="meta">연결된 PDF</p>
          <h2 id="week-pdf-title">${week.label} 수업자료</h2>
        </div>
        <a class="secondary-link" href="${subjectClassPath(subject)}">PDF 수업일 매핑</a>
      </div>
      ${materials.length > 0
        ? `<div class="pdf-material-slider is-compact" aria-label="${week.label} 연결 PDF">
            ${materials.map((material) => renderPdfMaterialCard(subject, material, {
              isCurrent: false,
              compact: true
            })).join("")}
          </div>`
        : `<p class="empty-note">아직 이 수업일에 연결된 PDF가 없습니다. 수업 화면에서 PDF 수업일을 지정하세요.</p>`}
    </section>
  `;
}

function renderPdfWorkspaceIndex(studyNotebook: StudyNotebook): string {
  const subjectSummaries = studyNotebook.subjects.map((subject) => ({
    subject,
    materials: getSubjectPdfMaterials(subject.id)
  }));
  const totalMaterials = subjectSummaries.reduce(
    (total, item) => total + item.materials.length,
    0
  );
  const activeSubjects = subjectSummaries.filter((item) => item.materials.length > 0).length;

  return `
    <section class="subject-page-hero">
      <p class="meta">PDF 자료실</p>
      <h1>수업자료 찾기</h1>
      <p class="lede">관리자가 올린 PDF를 과목별로 골라 열고, 같은 원문 위에 내 필기만 따로 저장합니다.</p>
      <div class="pdf-library-summary" aria-label="PDF 자료 현황">
        ${renderMetric("등록 자료", `${totalMaterials}개`, "업로드된 PDF")}
        ${renderMetric("과목", `${activeSubjects}/${studyNotebook.subjects.length}`, "자료가 있는 과목")}
        ${renderMetric("필기", "개인별", "PDF 원문과 분리 저장")}
      </div>
    </section>
    <section aria-labelledby="pdf-workspaces-title">
      <p class="meta">자료 목록</p>
      <h2 id="pdf-workspaces-title">과목별 PDF</h2>
      <div class="pdf-library">
        ${subjectSummaries.map(({ subject, materials }) =>
          renderPdfSubjectLibrarySection(subject, materials)
        ).join("")}
      </div>
    </section>
  `;
}

function renderPdfSubjectLibrarySection(
  subject: SubjectNote,
  materials: PdfMaterialDraft[]
): string {
  return `
    <section class="pdf-subject-section" aria-labelledby="pdf-subject-${subject.id}">
      <div class="pdf-subject-section__header">
        <div>
          <p class="meta">${subject.examLabel} · ${subject.summary.weekRange}</p>
          <h3 id="pdf-subject-${subject.id}">${subject.title}</h3>
        </div>
        <span class="pdf-count-pill">${materials.length}개 자료</span>
      </div>
      <div class="pdf-material-slider" aria-label="${subject.title} PDF 자료 슬라이더">
        ${renderPdfLibraryUploadCard(subject, materials.length)}
        ${materials.map((material) => renderPdfMaterialCard(subject, material, {
          isCurrent: false,
          compact: false
        })).join("")}
      </div>
    </section>
  `;
}

function renderSubjectPdfMaterialBrowser(
  subject: SubjectNote,
  materials: PdfMaterialDraft[],
  currentMaterialKey: string | undefined
): string {
  if (materials.length === 0) {
    return "";
  }

  return `
    <section class="pdf-material-browser" aria-labelledby="subject-pdf-materials-title">
      <div class="pdf-material-browser__header">
        <div>
          <p class="meta">§2 — 자료 선택</p>
          <h2 id="subject-pdf-materials-title">이 과목의 PDF 자료</h2>
        </div>
        <a class="secondary-link" href="#/pdf-workspaces">전체 자료실</a>
      </div>
      <div class="pdf-material-slider is-compact" aria-label="${subject.title} PDF 자료 슬라이더">
        ${materials.map((material) => renderPdfMaterialCard(subject, material, {
          isCurrent: currentMaterialKey === getPdfMaterialKey(material),
          compact: true
        })).join("")}
      </div>
    </section>
  `;
}

function renderPdfLibraryUploadCard(subject: SubjectNote, materialCount: number): string {
  if (!canManagePdfMaterials()) {
    return `
      <article class="pdf-upload-card is-readonly">
        <p class="meta">${escapeHtml(subject.title)}</p>
        <h4>새 자료 요청</h4>
        <p>PDF 업로드는 관리자만 가능합니다. 필요한 강의자료가 없으면 관리자에게 요청하세요.</p>
        <a class="secondary-link" href="${subjectPdfWorkspacePath(subject)}">${materialCount > 0 ? "공유 자료 보기" : "작업공간 열기"}</a>
      </article>
    `;
  }

  const inputId = `pdf-library-upload-${subject.id}`;

  return `
    <article class="pdf-upload-card">
      <input
        id="${inputId}"
        class="file-input"
        type="file"
        accept="application/pdf,.pdf"
        data-action="import-pdf-material"
        data-subject-id="${escapeHtml(subject.id)}"
      />
      <label class="pdf-upload-card__label" for="${inputId}">
        <span>새 PDF 업로드</span>
        <strong>${escapeHtml(subject.title)} 수업 자료 추가</strong>
        <small>${materialCount > 0 ? `${materialCount}개 자료에 이어 추가합니다.` : "첫 강의 PDF를 바로 올립니다."}</small>
      </label>
    </article>
  `;
}

function renderPdfMaterialCard(
  subject: SubjectNote,
  material: PdfMaterialDraft,
  options: { isCurrent: boolean; compact: boolean; showClassDateControl?: boolean }
): string {
  const materialKey = getPdfMaterialKey(material);
  const ownerLabel = getPdfMaterialOwnerLabel(material);
  const statusLabel = getPdfMaterialStatusLabel(material);
  const classDateLabel = getPdfMaterialClassDateLabel(subject, material);
  const classDateIsUnconfirmed = isUnconfirmedPdfClassDate(subject, material.classDate);

  return `
    <article class="pdf-material-card${options.isCurrent ? " is-current" : ""}${options.compact ? " is-compact" : ""}">
      <div class="pdf-material-card__body">
        <p class="meta">${escapeHtml(subject.title)} · ${escapeHtml(classDateLabel)}</p>
        <h4>${escapeHtml(material.fileName)}</h4>
        <p>${formatPdfFileSize(material.fileSize)} · ${material.pageCount}페이지 · ${statusLabel}</p>
        <div class="pdf-material-card__badges">
          <span>${ownerLabel}</span>
          ${classDateIsUnconfirmed ? "<span>나중에 수정</span>" : ""}
          ${options.isCurrent ? "<span>현재 열림</span>" : ""}
        </div>
        ${options.showClassDateControl ? renderPdfMaterialClassDateControl(subject, material, materialKey) : ""}
      </div>
      <div class="pdf-material-card__actions">
        <button
          class="action-button"
          type="button"
          data-action="open-pdf-material"
          data-subject-id="${escapeHtml(subject.id)}"
          data-material-id="${escapeHtml(materialKey)}"
        >${options.isCurrent ? "다시 열기" : "열기"}</button>
      </div>
    </article>
  `;
}

function renderPdfMaterialClassDateControl(
  subject: SubjectNote,
  material: PdfMaterialDraft,
  materialKey: string
): string {
  const selectedValue = getPdfMaterialClassDateValue(material);

  return `
    <label class="pdf-material-card__field">
      <span>수업일</span>
      <select
        data-action="assign-pdf-class-date"
        data-subject-id="${escapeHtml(subject.id)}"
        data-material-id="${escapeHtml(materialKey)}"
        ${canManagePdfMaterials() ? "" : "disabled"}
      >
        <option value="${PDF_MATERIAL_UNASSIGNED_CLASS_DATE}" ${selectedValue === PDF_MATERIAL_UNASSIGNED_CLASS_DATE ? "selected" : ""}>수업일 미지정</option>
        ${subject.weekNotes.map((week) => `
          <option value="${escapeHtml(week.label)}" ${selectedValue === week.label ? "selected" : ""}>${escapeHtml(week.label)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function getPdfMaterialClassDateLabel(subject: SubjectNote, material: PdfMaterialDraft): string {
  return isUnconfirmedPdfClassDate(subject, material.classDate)
    ? "수업일 미지정"
    : material.classDate?.trim() ?? "수업일 미지정";
}

function getPdfMaterialClassDateValue(material: PdfMaterialDraft): string {
  const trimmed = material.classDate?.trim();

  return trimmed || PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
}

function isUnconfirmedPdfClassDate(subject: SubjectNote, classDate: string | undefined): boolean {
  const trimmed = classDate?.trim();

  if (!trimmed || trimmed === PDF_MATERIAL_UNASSIGNED_CLASS_DATE || trimmed === "수업일 미지정") {
    return true;
  }

  return !subject.weekNotes.some((week) => week.label === trimmed);
}

function getPdfMaterialsForWeek(
  subject: SubjectNote,
  week: WeekNote,
  materials: PdfMaterialDraft[]
): PdfMaterialDraft[] {
  return materials.filter((material) => {
    const trimmed = material.classDate?.trim();

    return Boolean(trimmed) &&
      trimmed === week.label &&
      !isUnconfirmedPdfClassDate(subject, trimmed);
  });
}

function getPdfMaterialStatusLabel(material: PdfMaterialDraft): string {
  if (material.uploadStatus === "pending") {
    return "업로드 중";
  }

  if (material.uploadStatus === "uploaded") {
    return "공유 가능";
  }

  return "로컬";
}

function getPdfMaterialOwnerLabel(material: PdfMaterialDraft): string {
  if (material.uploaderId && material.uploaderId === authSession?.user.id) {
    return "내가 올림";
  }

  if (material.uploaderId) {
    return "공유 자료";
  }

  return material.uploadStatus === "local" ? "로컬 자료" : "업로드 자료";
}

function canManagePdfMaterials(): boolean {
  const role = authSession?.user.role.toLowerCase();
  return role === "master" || role === "admin";
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
        <a href="${subjectClassPath(subject)}">과목 들어가기</a>
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
    checklist: "체크리스트",
    table: "표",
    chart: "그래프"
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
