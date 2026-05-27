// hotfix(pdf-canvas): polyfills 가 가장 먼저 평가돼야 한다 — pdfjs-dist 가
// 호출하는 `Map.prototype.getOrInsertComputed` (TC39 upsert proposal) 가 iPad
// Safari 18.5 에서 누락된 사례 회복. dynamic import 가 아니라 top-level import
// 라야 다른 모든 모듈 평가 전에 prototype 이 패치된다.
import "./polyfills";
import {
  clearDatadogRumUser,
  initializeDatadogRum,
  setDatadogRumUser,
  trackRumAction,
  trackRumError
} from "./observability/datadogRum";
import { sampleLectureNote } from "./data/sampleLectureNote";
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
import { parseAuthMePayload, requestAuthMe, signIn, signOut, signUp } from "./auth/authApi";
import { resolveEscapeAction } from "./pdf-workspace/esc-action";
import {
  getDefaultOpenTermIds,
  groupSubjectsByTerm,
  parseStoredOpenState,
  resolveOpenTermIds,
  sidebarTermOpenStorageKey,
  type SidebarSubject,
  type SidebarTerm
} from "./sidebar/term-grouping";
import {
  meResponseToSession,
  type AuthMode,
  type AuthSession,
  type LoginFeedback
} from "./auth/authSession";
import {
  clearAuthSessionHint,
  getAuthBootRetryNotice,
  getAuthBootStateForMode,
  getInitialAuthBootState,
  readAuthSessionHint,
  writeAuthSessionHint,
  type AuthBootNotice,
  type AuthBootState
} from "./auth/sessionBoot";
import {
  renderLoginPage as renderAuthLoginPage,
  renderSessionCheckPage as renderAuthSessionCheckPage
} from "./auth/authViews";
import {
  getKeywordById,
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
  updateChartContent,
  updateChecklistItemLabel,
  updateTextBoxContent,
  type PdfInkPoint,
  type PdfInkStroke,
  type PdfMaterialDraft,
  type PdfWorkspaceStore,
  type PdfWorkspaceTool,
  type StickyNoteBlockKind,
  type SubjectPdfWorkspace
} from "@study-note/domain";
import "./styles.css";
import {
  parseRoute,
  subjectPdfWorkspacePath,
  weekPath
} from "./app/routes";
import { escapeHtml } from "./app/escape-html";
import {
  renderInto as renderIntoSink,
  renderShell as renderAppShell,
  renderNotFound,
  type AppShellContext,
  type RenderSink
} from "./app/appShell";
import {
  clearAnnotationSyncCaches,
  fetchAnnotationIfMissing as fetchAnnotationIfMissingSync,
  fetchAnnotationsForSubject as fetchAnnotationsForSubjectSync,
  scheduleAnnotationPut as scheduleAnnotationPutSync,
  type AnnotationHydrationEntry,
  type AnnotationSyncCallbacks,
  type AnnotationSyncContext
} from "./pdf-workspace/annotation-sync";
import {
  applyPdfCanvasMounts as applyPdfCanvasMountsModule,
  clearActivePdfObjectUrl as clearActivePdfObjectUrlModule,
  clearFailedPdfPreviewLoad,
  finishPdfPreviewLoad,
  getActivePdfObjectUrl,
  getActivePdfObjectUrlMaterialId,
  hasActivePdfObjectUrl,
  hasActivePdfPreviewLoad,
  hasFailedPdfPreviewLoad,
  markFailedPdfPreviewLoad,
  markPdfPreviewLoadStarted,
  revokeAllPdfObjectUrls as revokeAllPdfObjectUrlsModule,
  setActivePdfObjectUrl as setActivePdfObjectUrlModule,
  type CanvasMountCallbacks
} from "./pdf-workspace/canvas-mount";
import {
  buildPdfWorkspaceKey as buildPdfWorkspaceKeyModule,
  getPdfMaterialKey,
  getPdfWorkspaceMaterials,
  getSubjectPdfMaterials as getSubjectPdfMaterialsModule,
  loadPdfWorkspaceStore as loadPdfWorkspaceStoreModule,
  replacePdfWorkspaceMaterials as replacePdfWorkspaceMaterialsModule,
  savePdfWorkspaceStore as savePdfWorkspaceStoreModule,
  selectPdfWorkspaceMaterial as selectPdfWorkspaceMaterialModule,
  updatePdfWorkspace as updatePdfWorkspaceModule,
  upsertPdfWorkspaceMaterial,
  type WorkspaceDomainHelpers,
  type WorkspaceStoreCallbacks,
  type WorkspaceStoreContext
} from "./pdf-workspace/workspace-store";
import {
  PDF_MATERIAL_UNASSIGNED_CLASS_DATE,
  PDF_MATERIAL_UNASSIGNED_WIRE_DATE,
  PDF_WORKSPACE_ROOT_ID
} from "./pdf-workspace/constants";
import {
  assignPdfMaterialClassDate as assignPdfMaterialClassDateModule,
  createClassDateWeekId as createClassDateWeekIdModule,
  type ClassDateCallbacks,
  type ClassDateContext,
  type ClassDateDomainHelpers
} from "./pdf-workspace/class-date";
import {
  getActivePdfWorkspaceSubjectId as getActivePdfWorkspaceSubjectIdModule,
  movePdfPage as movePdfPageModule,
  requestPdfPage as requestPdfPageModule,
  setPdfPage as setPdfPageModule,
  setPdfTool as setPdfToolModule,
  togglePdfFullscreen as togglePdfFullscreenModule,
  type FullscreenPort,
  type ViewStateCallbacks,
  type ViewStateContext
} from "./pdf-workspace/view-state";
import {
  createTouchSwipe,
  TOUCH_SWIPE_LISTENER_OPTIONS,
  type TouchSwipeCallbacks,
  type TouchSwipeContext,
  type TouchSwipeInstance
} from "./pdf-workspace/touch-swipe";
import {
  handleDocumentChange as handleDocumentChangeModule,
  type DocumentChangeCallbacks,
  type DocumentChangeContext
} from "./pdf-workspace/document-change";
import {
  beginInkStroke,
  commitActiveInkStrokeOnEsc as commitActiveInkStrokeOnEscModule,
  commitInkStroke,
  extendInkStroke,
  getSurfacePoint as getSurfacePointModule,
  type InkStrokeCallbacks,
  type InkStrokeContext,
  type InkStrokeDomainHelpers
} from "./pdf-workspace/ink-stroke";
import {
  applyQueuedDrillHighlight as applyQueuedDrillHighlightModule,
  getInspectorDrill,
  handleDrillItemClick as handleDrillItemClickModule,
  normalizeInspectorDrillType,
  readInspectorDrill,
  refreshActiveDrillHighlights as refreshActiveDrillHighlightsModule,
  setInspectorDrill,
  toggleInspectorDrillState,
  writeInspectorDrill,
  type DrillHighlightContext,
  type DrillItemClickResult
} from "./pdf-workspace/drill-highlight";
import {
  addStarMark as addStarMarkModule,
  cycleStarMarkSize,
  removeStarMark as removeStarMarkModule,
  resizeStarMark as resizeStarMarkModule,
  type StarMarkCallbacks,
  type StarMarkContext
} from "./pdf-workspace/star-mark";
import {
  type CsvSeriesPoint,
  type LocalChartType,
  decodeChartContent,
  encodeChartContent,
  normalizeChartInputValue
} from "./pdf-workspace/chart-content";
import { serializeMarkdownTable } from "./pdf-workspace/markdown-table";
import {
  type TableWidgetCallbacks,
  type TableWidgetContext,
  addTable as addTableModule,
  applyAddTableColumn as applyAddTableColumnModule,
  applyAddTableRow as applyAddTableRowModule,
  applyDeleteTableColumn as applyDeleteTableColumnModule,
  applyDeleteTableRow as applyDeleteTableRowModule,
  applyTableCollapseToggle as applyTableCollapseToggleModule,
  applyTableMove as applyTableMoveModule,
  readTableDataFromDom,
  refreshTableWidgets as refreshTableWidgetsModule,
  removeTable as removeTableModule,
  scheduleTableCellUpdate as scheduleTableCellUpdateModule
} from "./pdf-workspace/table-widget";
import {
  type ChartWidgetCallbacks,
  type ChartWidgetContext,
  addChart as addChartModule,
  applyAddChartPoint as applyAddChartPointModule,
  applyChartCollapseToggle as applyChartCollapseToggleModule,
  applyChartMove as applyChartMoveModule,
  applyClearChartPoints as applyClearChartPointsModule,
  applyDeleteChartPoint as applyDeleteChartPointModule,
  applyFillChartFunction as applyFillChartFunctionModule,
  clearChartPointDebounce,
  readChartDataFromDom,
  refreshChartPreview,
  refreshChartWidgets as refreshChartWidgetsModule,
  removeChart as removeChartModule,
  scheduleChartPointUpdate as scheduleChartPointUpdateModule
} from "./pdf-workspace/chart-widget";
import {
  renderEraserSubToolbar
} from "./pdf-workspace/simple-widget";
import {
  type PdfToolbarContext
} from "./pdf-workspace/page-render";
import {
  renderPdfWorkspacePage,
  type WorkspacePageContext
} from "./pdf-workspace/workspace-page";
import {
  renderHomeSidebar,
  renderSubjectSidebar,
  type SidebarContext
} from "./subject-views/sidebar";
import {
  renderHome,
  renderIntakeGuide,
  renderSubjectIntakeGuide
} from "./subject-views/home-intake";
import {
  renderSubjectClassPage,
  type SubjectClassContext
} from "./subject-views/subject-class";
import {
  renderSubjectSummariesPage,
  renderWeekSummaryPage,
  type SummariesContext
} from "./subject-views/summaries";
import { renderSubjectMemorizePage } from "./subject-views/memorize";
import { renderSubjectMcpPage } from "./subject-views/mcp";
import {
  renderWeekPage,
  type WeekPageContext
} from "./subject-views/week";
import {
  canManagePdfMaterials,
  getPdfMaterialsForWeek,
  isUnconfirmedPdfClassDate,
  renderPdfLibraryUploadCard,
  renderPdfMaterialCard,
  renderPdfWorkspaceIndex,
  renderSubjectPdfMaterialBrowser,
  type PdfLibraryContext
} from "./subject-views/pdf-library";
import {
  buildKeywordQuickNote,
  buildSubjectQuickNote,
  buildWeekQuickNote,
  renderQuickNotePanel,
  type QuickNote,
  type QuickNoteContext
} from "./subject-views/quick-note";
import {
  buildNotebookKey,
  clearNotebookStorageError,
  getNotebookStorageError,
  loadStoredNotebook,
  notebookStorageKey,
  saveNotebook
} from "./app/notebook-storage";
import { createInkStroke as createInkStrokeDomain } from "@study-note/domain";

const isNodeRuntime =
  typeof (globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node === "string";
const isBrowserRuntime = typeof window !== "undefined" && typeof document !== "undefined" && !isNodeRuntime;
initializeDatadogRum();

type IntakeFeedback =
  | {
      kind: "success" | "error";
      title: string;
      detail: string;
      href?: string;
      retrySubjectId?: string;
    }
  | undefined;

const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL ?? "/api";
const AUTH_SESSION_WAKE_NOTICE_DELAY_MS = 2500;
// ACA scale-to-zero cold start can take ~30s on first hit. Keep the per-request
// timeout above that so /v1/auth/me does not abort prematurely; the "waking"
// banner already shows after AUTH_SESSION_WAKE_NOTICE_DELAY_MS so the user sees
// progress while we wait.
const AUTH_SESSION_REQUEST_TIMEOUT_MS = 45000;
const AUTH_SESSION_RETRY_DELAY_MS = 3000;
const AUTH_SESSION_MAX_AUTO_RETRIES = 3;
// sprint-3/S1 (codex P1 backlog): notebook is no longer loaded at module init —
// without an authenticated userId we cannot pick the correct namespaced key.
// Boot starts with the fixture default; revalidate / sign-in success paths
// call `loadStoredNotebook(session.user.id)` and render the user's data once
// the session attaches. See applySessionTransitionForUser refactor for the
// load wiring.
let notebook: StudyNotebook = sampleLectureNote;
// sprint-3/S2: pdfWorkspaceStore — userId-namespaced lazy load (sprint-3/S1 패턴).
let pdfWorkspaceStore: PdfWorkspaceStore = { workspaces: {} };
// sprint-4/S1: in-memory tracker for the last session userId attached during
// this page lifetime. Used by applySessionTransitionForUser to distinguish
// "first attach" (no sync state to reset) from "different user transition"
// (reset in-flight PUT + sync caches). Page reload starts undefined: pending
// PUT from a previous tab is gone with the closed page.
let lastSessionUserId: string | undefined;
// sprint-11/slice-1: inspector toggle state (localStorage persistence §9.4).
// Default = false (접힘). Restored from localStorage on page load.
let inspectorOpen = isBrowserRuntime ? readInspectorOpen() : false;
if (isBrowserRuntime) {
  setInspectorDrill(readInspectorDrill());
}
// slice-2: auth state is in-memory only (F2 — no localStorage for session).
// Rehydrated on app boot via GET /v1/auth/me with cookie.
let authSession: AuthSession | undefined;

// sprint-W21-sprint-1/S2 (AC8-AC10) — sidebar term grouping cache. Fetched once
// per auth-ready transition via loadSidebarTermsCache(). null = not loaded yet
// (renderSidebarSubjectGroups falls back to flat notebook list).
let sidebarTermsCache: SidebarTerm[] | null = null;
let sidebarSubjectsCache: SidebarSubject[] | null = null;
let sidebarOpenTermIds: Set<string> = new Set();
let authBootState: AuthBootState = getInitialAuthBootState(readAuthSessionHint());
let authBootNotice: AuthBootNotice = "checking";
let authBootRequestId = 0;
let authBootNoticeTimer: ReturnType<typeof setTimeout> | undefined;
let authBootRetryTimer: ReturnType<typeof setTimeout> | undefined;
// slice-3 (sign-up UX): current auth form tab ("login" | "signup").
let authMode: AuthMode = "login";
// sprint-W22-sprint-1 layer B/slice-2a: 4 module-state Map/Set
// (activePdfObjectUrls, activePdfObjectUrlMaterialIds, activePdfPreviewLoads,
// failedPdfPreviewLoadKeys) → `./pdf-workspace/canvas-mount.ts` 로 이관.
// 외부 read = getActivePdfObjectUrl* / hasActivePdfPreviewLoad* getter API,
// mutate = setActivePdfObjectUrl / clearActivePdfObjectUrl /
// revokeAllPdfObjectUrls / mark*/finish*/clear* helper.
// sprint-11/slice-2-refine R10-c: tracks an in-progress eraser drag (pointerdown → pointerup).
// Analogous to activeInkStroke (pdf-workspace/ink-stroke.ts) for pen mode.
// Cleared on pointerup / pointercancel.
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

if (isBrowserRuntime && !app) {
  throw new Error("App mount target #app is missing");
}

const appRoot = app;

// sprint-12/slice-7: morphdom DOM diff 도입. renderInto = app/appShell.ts.
// sprint-2026-W21-sprint-2 / layer A: module state 의존 (appRoot + widget
// post-mount effect 5종) 은 main.ts 가 1회 구성한 RenderSink 로 주입.
// renderInto sink helper = main.ts 가 호출하는 thin wrapper.
const drillHighlightContext: DrillHighlightContext = {
  getAppRoot: () => appRoot
};
// slice-2f/i (chart-content) + slice-2f/ii (markdown-table) 분리 완료 후
// DrillHighlightDomainHelpers wrapper interface + lazy factory 폐기.
// drill-highlight 가 chart-content / markdown-table 를 직접 import 한다.
const mainRenderSink: RenderSink | null = appRoot
  ? {
      appRoot,
      postMountEffects: [
        () => refreshTableWidgets(),
        () => refreshChartWidgets(),
        () => applyQueuedDrillHighlightModule(drillHighlightContext),
        () => refreshActiveDrillHighlightsModule(drillHighlightContext),
        (root) => applyPdfCanvasMounts(root)
      ]
    }
  : null;

function mountRender(html: string): void {
  if (!mainRenderSink) {
    return;
  }
  renderIntoSink(html, mainRenderSink);
}

// sprint-W22-sprint-1 layer B/slice-2a: applyPdfCanvasMounts 본체 →
// `./pdf-workspace/canvas-mount.ts`. main.ts 잔여 = telemetry callback 묶음.
const canvasMountCallbacks: CanvasMountCallbacks = {
  trackRumAction,
  trackRumError
};
async function applyPdfCanvasMounts(root: HTMLElement): Promise<void> {
  await applyPdfCanvasMountsModule(root, canvasMountCallbacks);
}


if (isBrowserRuntime) {
  document.addEventListener("change", handleDocumentChange);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("submit", handleDocumentSubmit);
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("pointermove", handleDocumentPointerMove);
  document.addEventListener("pointerup", handleDocumentPointerUp);
  document.addEventListener("pointercancel", handleDocumentPointerUp);
  document.addEventListener("keydown", handleDocumentKeyDown);
  // sprint-W21-sprint-4/S1: iOS Safari fast-tap dual handler — page nav
  // button 의 click 이 일부 mobile context 에서 누락되거나 지연될 때 touchend
  // 가 즉시 trigger. preventDefault 로 click 중복 발사 차단 (desktop 은
  // touchend 미발사 → click handler 가 정상 처리).
  // sprint-W21-sprint-4/S4: PDF 영역 horizontal swipe gesture — read tool
  // 인 빈 영역 single-touch 만 candidate. touchstart/move/end/cancel 사이클.
  // listener option metadata = TOUCH_SWIPE_LISTENER_OPTIONS SSoT (sprint-W22-sprint-2/S3).
  document.addEventListener("touchstart", handleDocumentTouchStart, TOUCH_SWIPE_LISTENER_OPTIONS.touchstart);
  document.addEventListener("touchmove", handleDocumentTouchMove, TOUCH_SWIPE_LISTENER_OPTIONS.touchmove);
  document.addEventListener("touchend", handleDocumentTouchEnd, TOUCH_SWIPE_LISTENER_OPTIONS.touchend);
  document.addEventListener("touchcancel", handleDocumentTouchCancel, TOUCH_SWIPE_LISTENER_OPTIONS.touchcancel);
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
  // First-time visitors should see login/signup immediately; only browsers
  // with a prior sign-in hint get the blocking cold-start session check.
  void revalidateStoredSession({ blocking: readAuthSessionHint() });
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


// sprint-3/S1 (codex P1 backlog): userId-scoped notebook storage key. The
// previous global key allowed cross-user data leak vectors on shared browsers;
// each user now writes to `{base}:{userId}` so A→B account transitions cannot
// see each other's notebook through localStorage. See plan G1 (2026-W21
// userId-namespacing sprint) for the leak class this closes.
// sprint-2/S2: BE sync layer state — user-notes 측 잔류 (annotation 측은
// apps/web/src/pdf-workspace/annotation-sync.ts 가 module-private 보유,
// sprint-2026-W22-sprint-1 / layer B/slice-1). main.ts 는
// AnnotationSyncContext + AnnotationSyncCallbacks 만 구성하여 호출.
// syncFailureTracker / syncBackendError 는 user-notes 측 share — annotation
// 측 callback (setSyncBackendError) 도 같은 banner 변수 갱신하여 단일 UX.
const USER_NOTES_PUT_DEBOUNCE_MS = 500;
const SYNC_FAILURE_PAUSE_THRESHOLD = 3;
const SYNC_FAILURE_PAUSE_WINDOW_MS = 5 * 60 * 1000;

interface SyncFailureTracker {
  recentFailures: number[];
  paused: boolean;
}

const userNotesPutTimers = new Map<string, ReturnType<typeof setTimeout>>();
const userNotesPutAborts = new Map<string, AbortController>();
const userNotesPutChains = new Map<string, Promise<void>>();
const userNotesFetchedKeys = new Set<string>();
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
  clearAuthSessionHint();
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

// ─── sprint-2026-W22-sprint-1 / layer B/slice-1 — annotation sync wiring ──
// annotation-sync 모듈의 Context (least-privilege read) + Callbacks (least-
// privilege write) 를 매 호출 시 구성한다. broad PdfWorkspaceStore /
// authSession 객체 노출 X.
function getAnnotationSyncContext(): AnnotationSyncContext {
  return {
    apiBaseUrl,
    getSessionUserId: () => authSession?.user.id,
    getSyncBackendPaused: () => syncFailureTracker.paused,
    readSubjectWorkspace: (subjectId) =>
      pdfWorkspaceStore.workspaces[subjectId]
  };
}

function getAnnotationSyncCallbacks(): AnnotationSyncCallbacks {
  return {
    setSyncBackendError: (message) => {
      syncBackendError = message;
    },
    setSyncBackendErrorReported: (reported) => {
      syncBackendErrorReported = reported;
    },
    triggerRenderApp: () => {
      try {
        renderApp();
      } catch {
        /* ignore */
      }
    },
    applyAnnotationHydration: (subjectId, hydration) => {
      // subjectId === "" = handleAnnotationStaleResponse 의 fallback path
      // (canonical entry 안에 subject 알 수 없음) — store walk 로 active
      // material 찾기.
      if (subjectId === "") {
        for (const entry of hydration) {
          for (const [sid, ws] of Object.entries(pdfWorkspaceStore.workspaces)) {
            const active = ws.material?.backendMaterialId ?? ws.material?.id;
            if (active === entry.materialId) {
              applyAnnotationHydrationToStore(sid, entry);
              break;
            }
          }
        }
        return;
      }
      for (const entry of hydration) {
        applyAnnotationHydrationToStore(subjectId, entry);
      }
    },
    handleAuthExpired: () => handleAuthExpiredFromSync(),
    onSyncMetricEvent: () => {
      // sprint-2026-W22-sprint-1 backlog: Datadog RUM emit 자리. 본 sprint
      // 는 callback hook 만 노출 (no-op). 후속 sprint 의 ops monitoring
      // sprint 에서 trackRumAction 결선.
    }
  };
}

function applyAnnotationHydrationToStore(
  subjectId: string,
  entry: AnnotationHydrationEntry
): void {
  const current = pdfWorkspaceStore.workspaces[subjectId];
  if (!current) {
    return;
  }
  const material = current.material;
  if (!material) {
    return;
  }
  const currentMaterialId = material.backendMaterialId ?? material.id;
  if (currentMaterialId !== entry.materialId) {
    return;
  }
  const incoming = entry.payload;
  const merged: SubjectPdfWorkspace = {
    ...current,
    stickyNotes: Array.isArray(incoming.stickyNotes)
      ? incoming.stickyNotes
      : current.stickyNotes,
    inkStrokes: Array.isArray(incoming.inkStrokes)
      ? incoming.inkStrokes
      : current.inkStrokes,
    textBoxes: Array.isArray(incoming.textBoxes)
      ? incoming.textBoxes
      : current.textBoxes,
    checklists: Array.isArray(incoming.checklists)
      ? incoming.checklists
      : current.checklists,
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
}

async function putUserNoteToBE(
  subjectId: string,
  weekId: string,
  body: string
): Promise<void> {
  if (syncFailureTracker.paused) {
    return;
  }
  // sprint-2/S3 fix (codex P1 #NEW-22): chain this PUT after any prior PUT
  // for the same (subject, week) so server arrival order matches client-issue
  // order on this device. AbortController inside is for hard termination
  // from logout / user transition — within the chain there is never more
  // than one in-flight at a time, so the abort path only fires on session
  // changes, not on supersession.
  const key = `${subjectId}:${weekId}`;
  const sessionUserIdAtSchedule = authSession?.user.id;
  if (!sessionUserIdAtSchedule) {
    return;
  }
  const previous = userNotesPutChains.get(key) ?? Promise.resolve();
  const work = previous
    .catch(() => {})
    .then(async () => {
      // sprint-2/S3 fix (advisor): chain may have awaited seconds while the
      // user logged out and back in. Re-validate session before issuing the
      // PUT so user A's debounced edit cannot land with user B's cookie.
      if (authSession?.user.id !== sessionUserIdAtSchedule) {
        return;
      }
      if (syncFailureTracker.paused) {
        return;
      }
      const abortController = new AbortController();
      userNotesPutAborts.set(key, abortController);
      try {
        const response = await fetch(
          `${apiBaseUrl}/v1/notes/subject/${encodeURIComponent(subjectId)}/week/${encodeURIComponent(weekId)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body }),
            signal: abortController.signal
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
          if (response.status >= 500 || response.status === 429) {
            recordSyncFailure();
          }
          return;
        }
        recordSyncSuccess();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.warn("[study-note] userNotes PUT network error", error);
        recordSyncFailure();
      } finally {
        if (userNotesPutAborts.get(key) === abortController) {
          userNotesPutAborts.delete(key);
        }
      }
    });
  userNotesPutChains.set(key, work);
  try {
    await work;
  } finally {
    if (userNotesPutChains.get(key) === work) {
      userNotesPutChains.delete(key);
    }
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
      // sprint-2/S3 fix (codex P2): keep the cache marker on 404. The previous
      // fix released it so cross-device note creation could appear without
      // reload, but `renderApp()` re-invokes fetchUserNoteIfMissing on every
      // week-page render → released cache → re-fetch → 404 → release =
      // per-render request storm for any week without a server note. Trade
      // accepted: cross-device new notes appear after the next page reload
      // instead of mid-session (server data wins on reload).
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
      persistNotebook();
      try { renderApp(); } catch { /* ignore */ }
    }
    recordFetchSuccess();
  } catch (error) {
    userNotesFetchedKeys.delete(cacheKey);
    console.warn("[study-note] userNotes GET network error", error);
    recordFetchFailure();
  }
}


// sprint-2/S3 fix (codex P1) → sprint-3/S2+S3: on session attach (revalidate /
// sign-in), load each user's localStorage data from their userId-namespaced
// key. The destructive wipe-on-transition path is gone — the namespace itself
// keeps user A and user B's data isolated, and re-attaching as the same user
// picks up their data without touching anyone else's namespace.
//
// Sync caches + in-flight PUT aborts are still cleared on a *different*-user
// transition so user A's pending autosave traffic cannot land under user B's
// cookie (cross-namespace authorship leak is structurally impossible, but a
// PUT already on the wire carries the previous body and must be aborted).
//
// First-load semantics: lastSessionUserId starts undefined on every page
// load (in-memory only). First session attach = "first attach" — no sync
// caches exist yet to reset. Subsequent A→B attaches trigger the reset below.
//
// Called from the two session-attach success paths (revalidate, sign-in)
// only — never from clearAuthSession, because that fires on transient
// /v1/auth/me failures and must not run a transition under flaky network.
function applySessionTransitionForUser(newUserId: string): void {
  // sprint-3/S1 + S2: load notebook and pdfWorkspaceStore from each user's
  // namespaced localStorage key. Runs on every session attach so the same
  // user re-attaching after page reload picks up their own data, and a
  // different user attaching gets their own — neither sees the other's
  // notebook or workspace. Module init left both as their empty defaults;
  // this is the first read.
  notebook = loadStoredNotebook(newUserId);
  pdfWorkspaceStore = loadPdfWorkspaceStore(newUserId);

  if (lastSessionUserId === newUserId) {
    // Same user as last attach within this page lifetime — namespaced loads
    // above already restored data. No further transition work needed.
    return;
  }
  // sprint-4/S1: first attach in this page lifetime (lastSessionUserId still
  // undefined). No sync caches exist yet — nothing to abort, nothing to
  // clear. Just record the new userId in memory and return.
  if (lastSessionUserId === undefined) {
    lastSessionUserId = newUserId;
    return;
  }
  // sprint-3/S2+S3 + sprint-4/S1: actual A→B transition within the same page
  // lifetime. `pdfWorkspaceStore` and `notebook` are already loaded from the
  // new user's namespace above; only the sync caches and in-flight PUTs need
  // to be reset so user A's pending traffic does not land under user B's
  // cookie.
  for (const timer of userNotesPutTimers.values()) {
    clearTimeout(timer);
  }
  userNotesPutTimers.clear();
  for (const ac of userNotesPutAborts.values()) {
    ac.abort();
  }
  userNotesPutAborts.clear();
  userNotesPutChains.clear();
  userNotesFetchedKeys.clear();
  // sprint-2026-W22-sprint-1 / layer B/slice-1: annotation sync caches
  // (timers/aborts/chains/fetched/by-material/revision/batch/inflight/tracker)
  // 는 annotation-sync 모듈이 module-private 으로 보유. 한 줄 API 로 reset.
  clearAnnotationSyncCaches();
  // sprint-2/S3 fix (self-review): user-notes 측 sync-failure tracker +
  // banner state 도 함께 reset. annotation 측 tracker 는 위
  // clearAnnotationSyncCaches() 가 처리.
  syncFailureTracker.paused = false;
  // PR #49 codex R5 P1 — A→B revalidate transition 시 sidebar term cache 도
  // 무효화. 이전 user A 의 term/subject metadata 가 B session UI 에 leak 차단.
  sidebarTermsCache = null;
  sidebarSubjectsCache = null;
  sidebarOpenTermIds = new Set();
  syncFailureTracker.recentFailures = [];
  syncBackendError = undefined;
  syncBackendErrorReported = false;
  lastSessionUserId = newUserId;
}

function clearAuthSession(): void {
  authBootRequestId += 1;
  authSession = undefined;
  clearDatadogRumUser();
  clearAuthBootTimers();
  revokeAllPdfObjectUrls();
  // sprint-W21-sprint-1/S2 — clear sidebar term cache on session reset so the
  // next user's terms/subjects don't leak from prior session.
  sidebarTermsCache = null;
  sidebarSubjectsCache = null;
  sidebarOpenTermIds = new Set();
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
  for (const ac of userNotesPutAborts.values()) {
    ac.abort();
  }
  userNotesPutAborts.clear();
  userNotesPutChains.clear();
  userNotesFetchedKeys.clear();
  // sprint-2026-W22-sprint-1 / layer B/slice-1: annotation sync caches
  // 는 annotation-sync 모듈이 module-private 으로 보유. 한 줄 reset.
  clearAnnotationSyncCaches();
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

function cancelAuthBootRequest(): void {
  authBootRequestId += 1;
  clearAuthBootTimers();
  authBootState = "ready";
  authBootNotice = "checking";
}

// sprint-W22-sprint-1 layer B/slice-2a: 4 object-URL lifecycle 함수 본체 →
// `./pdf-workspace/canvas-mount.ts`. main.ts 잔여 = re-export 만.
// disposePdfDocumentCache 는 module 내부에서만 호출됨 (revoke* 내부) — main.ts
// 직접 호출 site 없음.
const setActivePdfObjectUrl = setActivePdfObjectUrlModule;
const clearActivePdfObjectUrl = clearActivePdfObjectUrlModule;
const revokeAllPdfObjectUrls = revokeAllPdfObjectUrlsModule;

async function revalidateStoredSession(
  options: { attempt?: number; blocking?: boolean } = {}
): Promise<void> {
  const attempt = options.attempt ?? 0;
  const blocking = options.blocking ?? readAuthSessionHint();
  const requestId = beginAuthBootRequest({ blocking });

  try {
    // slice-2: cookie-based session rehydration — credentials:include sends the
    // httpOnly study_note_session cookie. No localStorage fallback (F2).
    const response = await requestAuthMe(apiBaseUrl, AUTH_SESSION_REQUEST_TIMEOUT_MS);

    if (requestId !== authBootRequestId) {
      return;
    }

    clearAuthBootTimers();

    if (!response.ok) {
      if (response.status >= 500) {
        scheduleAuthBootRetry(attempt, { blocking });
        return;
      }

      // 401/403 = no valid cookie or insufficient auth for /me. Either way:
      // leave the cold-start lane and show the login page quickly.
      authSession = undefined;
      clearAuthSessionHint();
      authBootState = "ready";
      authBootNotice = "checking";
      renderApp();
      return;
    }

    const payload = parseAuthMePayload(await response.json());

    if (!payload) {
      authSession = undefined;
      clearAuthSessionHint();
      authBootState = "ready";
      authBootNotice = "checking";
      renderApp();
      return;
    }

    authSession = meResponseToSession(payload);
    writeAuthSessionHint();
    setDatadogRumUser({
      id: authSession.user.id,
      role: authSession.user.role
    });
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
    // sprint-W21-sprint-1/S2 (AC8-AC10) — fetch terms/subjects for sidebar grouping
    // (fire-and-forget; sidebar renders flat fallback until cache lands).
    void loadSidebarTermsCache().then(() => renderApp());
    renderApp();
  } catch {
    if (requestId !== authBootRequestId) {
      return;
    }

    clearAuthBootTimers();
    scheduleAuthBootRetry(attempt, { blocking });
  }
}

function beginAuthBootRequest(options: { blocking: boolean }): number {
  const requestId = authBootRequestId + 1;
  authBootRequestId = requestId;
  clearAuthBootTimers();
  authBootState = getAuthBootStateForMode(options.blocking);
  authBootNotice = "checking";
  renderApp();

  if (!options.blocking) {
    return requestId;
  }

  authBootNoticeTimer = setTimeout(() => {
    if (authBootState !== "checking" || requestId !== authBootRequestId) {
      return;
    }

    authBootNotice = "waking";
    renderApp();
  }, AUTH_SESSION_WAKE_NOTICE_DELAY_MS);

  return requestId;
}

function scheduleAuthBootRetry(attempt: number, options: { blocking: boolean }): void {
  authSession = undefined;
  authBootState = getAuthBootStateForMode(options.blocking);

  if (attempt >= AUTH_SESSION_MAX_AUTO_RETRIES) {
    authBootNotice = getAuthBootRetryNotice(options.blocking, true);
    renderApp();
    return;
  }

  authBootNotice = getAuthBootRetryNotice(options.blocking, false);
  renderApp();
  authBootRetryTimer = setTimeout(() => {
    void revalidateStoredSession({ attempt: attempt + 1, blocking: options.blocking });
  }, AUTH_SESSION_RETRY_DELAY_MS);
}

// sprint-W22-sprint-1 layer B/slice-2a: 13 workspace-store 함수 본체 →
// `./pdf-workspace/workspace-store.ts`. pure 6 = direct import (sortNewestFirst
// / syncCurrentPdfMaterial / getPdfMaterialKey / getPdfWorkspaceMaterials /
// upsertPdfWorkspaceMaterial / parsePdfWorkspaceStorePayload). stateful 5 +
// helper-needing 2 (buildPdfWorkspaceKey + replacePdfWorkspaceMaterials) =
// ctx + callbacks + domain helper 주입 wrapper. main.ts 50+ 직접 read 사이트
// 보존. domain helper 는 runtime import 차단 (annotation-sync 패턴 일치).
const workspaceDomainHelpers: WorkspaceDomainHelpers = {
  storageKeyPrefix: pdfWorkspaceStorageKey,
  getSubjectWorkspace: getSubjectPdfWorkspace,
  hydrateSubjectWorkspace: hydrateSubjectPdfWorkspace,
  createMaterialFromBackend: createPdfMaterialFromBackend
};
function getWorkspaceStoreContext(): WorkspaceStoreContext {
  return {
    getStore: () => pdfWorkspaceStore,
    getActiveUserId: () => authSession?.user.id,
    domain: workspaceDomainHelpers
  };
}
function getWorkspaceStoreCallbacks(): WorkspaceStoreCallbacks {
  return {
    setStore: (next) => {
      pdfWorkspaceStore = next;
    },
    scheduleAnnotationPut: scheduleAnnotationPutSync,
    getAnnotationSyncContext,
    getAnnotationSyncCallbacks,
    clearActivePdfObjectUrl
  };
}
function buildPdfWorkspaceKey(userId: string): string {
  return buildPdfWorkspaceKeyModule(userId, pdfWorkspaceStorageKey);
}
function loadPdfWorkspaceStore(userId: string): PdfWorkspaceStore {
  return loadPdfWorkspaceStoreModule(userId, workspaceDomainHelpers);
}
function savePdfWorkspaceStore(userId: string | undefined = authSession?.user.id): void {
  savePdfWorkspaceStoreModule(getWorkspaceStoreContext(), userId);
}
function updatePdfWorkspace(
  subjectId: string,
  updater: (workspace: SubjectPdfWorkspace) => SubjectPdfWorkspace
): void {
  updatePdfWorkspaceModule(
    subjectId,
    updater,
    getWorkspaceStoreContext(),
    getWorkspaceStoreCallbacks()
  );
}
function replacePdfWorkspaceMaterials(
  workspace: SubjectPdfWorkspace,
  backendMaterials: PdfMaterialRecord[]
): SubjectPdfWorkspace {
  return replacePdfWorkspaceMaterialsModule(
    workspace,
    backendMaterials,
    workspaceDomainHelpers
  );
}
function selectPdfWorkspaceMaterial(subjectId: string, materialId: string): boolean {
  return selectPdfWorkspaceMaterialModule(
    subjectId,
    materialId,
    getWorkspaceStoreContext(),
    getWorkspaceStoreCallbacks()
  );
}
function getSubjectPdfMaterials(subjectId: string): PdfMaterialDraft[] {
  return getSubjectPdfMaterialsModule(subjectId, getWorkspaceStoreContext());
}

// S3 AC11/AC12 — canonical YYYY-MM-DD validator (calendar overflow 차단).
function isCanonicalIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

// S3 AC13 — WeekNote.label fallback: ISO date 형식이면 한국식 ("M월 D일") 변환,
// 아니면 원래 label, 그도 없으면 "(날짜 미지정)".
function formatWeekLabel(label: string | undefined | null, classDate?: string | null): string {
  const candidate = (classDate && classDate.length > 0 ? classDate : label) ?? "";
  if (!candidate) return "(날짜 미지정)";
  if (isCanonicalIsoDate(candidate)) {
    const [, month, day] = candidate.split("-");
    return `${Number(month)}월 ${Number(day)}일`;
  }
  return candidate;
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

  // S3 AC11/AC15: ISO YYYY-MM-DD 만 허용 (date input native). 비ISO/calendar
  // overflow reject.
  if (!isCanonicalIsoDate(classDate)) {
    intakeFeedback = {
      kind: "error",
      title: "수업일 형식이 잘못되었습니다.",
      detail: "YYYY-MM-DD (예: 2026-05-14) 형식만 사용할 수 있습니다."
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
  const saved = persistNotebook();
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

// sprint-2026-W22-sprint-2/S1: classDate group 은 pdf-workspace/class-date.ts
// 로 분리. main.ts 는 ctx + callbacks + helpers 주입 wrapper 만 유지.
const classDateDomainHelpers: ClassDateDomainHelpers = {
  getPdfMaterialKey,
  getPdfWorkspaceMaterials,
  createPdfMaterialFromBackend,
  formatMaterialError
};
function getClassDateContext(): ClassDateContext {
  return {
    apiBaseUrl,
    getSubject: (subjectId) => notebook.subjects.find((item) => item.id === subjectId),
    getSubjectMaterials: getSubjectPdfMaterials
  };
}
function getClassDateCallbacks(): ClassDateCallbacks {
  return {
    setFeedback: (feedback) => {
      intakeFeedback = feedback;
    },
    renderApp,
    updatePdfWorkspace,
    updatePdfMaterialMetadata
  };
}
const createClassDateWeekId = createClassDateWeekIdModule;
const assignPdfMaterialClassDate = (subjectId: string, materialId: string, classDate: string) =>
  assignPdfMaterialClassDateModule(subjectId, materialId, classDate, getClassDateContext(), getClassDateCallbacks(), classDateDomainHelpers);

// sprint-2026-W22-sprint-2/S4: handleDocumentChange 7 분기 dispatcher 는
// pdf-workspace/document-change.ts 로 분리. main.ts 는 ctx + callbacks +
// chart helper bundle wrapper 만 유지.
function getDocumentChangeContext(): DocumentChangeContext {
  return {
    getSubjectWorkspace: (subjectId) =>
      getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId)
  };
}
function getDocumentChangeCallbacks(): DocumentChangeCallbacks {
  return {
    chart: {
      readChartDataFromDom: (chartId) => {
        const data = readChartDataFromDom(chartId);
        return data ? { points: data.points } : undefined;
      },
      decodeChartContent: (content) => ({
        points: decodeChartContent(content).points
      }),
      encodeChartContent: (type, points) =>
        encodeChartContent(type as LocalChartType, points as CsvSeriesPoint[]),
      updateChartContent: (chart, content) => updateChartContent(chart, content),
      clearChartPointDebounce: (chartId) => clearChartPointDebounce(chartId)
    },
    updatePdfWorkspace,
    renderApp,
    assignPdfMaterialClassDate,
    importPdfMaterialFile,
    requestPdfPage,
    applySetEraserSize,
    applyToggleChecklistItem,
    importWeekNoteFile
  };
}
function handleDocumentChange(event: Event) {
  handleDocumentChangeModule(event, getDocumentChangeContext(), getDocumentChangeCallbacks());
}

function handleDrillItemClick(target: Element): DrillItemClickResult {
  return handleDrillItemClickModule(target, {
    requestPage: requestPdfPage,
    commitPage: setPdfPage,
    render: renderApp
  });
}

// sprint-W21-sprint-4/S4: PDF 영역 horizontal swipe gesture.
// 본체는 pdf-workspace/touch-swipe.ts (sprint-W22-sprint-2/S3) 로 이전.
// main.ts 는 factory + listener registration wrapper 만 유지.
const touchSwipeInstance: TouchSwipeInstance = createTouchSwipe(
  {
    querySurface: (subjectId) =>
      document.querySelector<HTMLElement>(
        `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
      ),
    getSurfaceWidth: (surface) => surface.getBoundingClientRect().width
  } as TouchSwipeContext,
  {
    movePdfPage,
    renderApp
  } as TouchSwipeCallbacks
);
function handleDocumentTouchStart(event: TouchEvent) { touchSwipeInstance.handleTouchStart(event); }
function handleDocumentTouchMove(event: TouchEvent) { touchSwipeInstance.handleTouchMove(event); }
function handleDocumentTouchEnd(event: TouchEvent) { touchSwipeInstance.handleTouchEnd(event); }
function handleDocumentTouchCancel(event: TouchEvent) { touchSwipeInstance.handleTouchCancel(event); }

// sprint-W22-sprint-3 / layer B/slice-2c: ink stroke wiring.
// 본체는 pdf-workspace/ink-stroke.ts. main.ts 는 ctx/callbacks/helpers 를
// module-scope singleton 으로 묶고 pointer handler wrapper 에서 호출.
const inkStrokeCtx: InkStrokeContext = {
  querySurface: (subjectId) =>
    document.querySelector<HTMLElement>(
      `[data-pdf-annotation-surface][data-subject-id="${subjectId}"]`
    )
};
const inkStrokeCallbacks: InkStrokeCallbacks = {
  updatePdfWorkspace,
  renderApp,
  trackRumAction
};
const inkStrokeDomainHelpers: InkStrokeDomainHelpers = {
  createInkStroke: createInkStrokeDomain,
  normalizePdfPoint
};
function getSurfacePoint(event: PointerEvent, surface: HTMLElement): PdfInkPoint {
  return getSurfacePointModule(event, surface, inkStrokeDomainHelpers);
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
    trackRumAction("sign_up_started");
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

  // sprint-W21-sprint-1/S2/AC9 — sidebar term group <details><summary> toggle.
  // 기본 <details> 동작은 native (브라우저가 open attr toggle) — 우리는 click
  // 시점에 localStorage 에 next state 를 기록만 한다. preventDefault X.
  // PR #49 codex Round-1 P1 fix: `quickNoteButton` 은 closest("[data-action]")
  // 을 HTMLButtonElement 로 typing 해서 <summary> click 을 못 잡음. summary
  // 는 별도 closest 검색.
  if (target instanceof Element) {
    const sidebarTermSummary = target.closest<HTMLElement>("[data-action='sidebar-term-toggle']");
    if (sidebarTermSummary) {
      const termId = sidebarTermSummary.dataset.termId;
      if (termId && termId !== "__orphan__") {
        toggleSidebarTermOpen(termId);
      }
      return;
    }
  }

  // sprint-W21-sprint-1 / S6 / AC30 — 별표 삭제 (hover delete button).
  if (quickNoteButton?.dataset.action === "remove-star-mark") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const markId = quickNoteButton.dataset.starMarkId;
    if (subjectId && markId) {
      removeStarMark(subjectId, markId);
      renderApp();
    }
    return;
  }

  // sprint-W21-sprint-1 / S6 / AC29 — 별표 크기 cycle.
  // cycle logic = pdf-workspace/star-mark.ts 의 cycleStarMarkSize (slice-2e).
  if (quickNoteButton?.dataset.action === "resize-star-mark") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const markId = quickNoteButton.dataset.starMarkId;
    if (subjectId && markId) {
      const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
      const mark = (workspace.starMarks ?? []).find((m) => m.id === markId);
      if (mark) {
        resizeStarMark(subjectId, markId, cycleStarMarkSize(mark.sizeRatio));
        renderApp();
      }
    }
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
    clearNotebookStorageError(() => { try { renderApp(); } catch { /* ignore */ } });
    syncBackendError = undefined;
    syncBackendErrorReported = false;
    syncFailureTracker.paused = false;
    syncFailureTracker.recentFailures = [];
    renderApp();
    return;
  }

  if (quickNoteButton?.dataset.action === "logout") {
    // slice-2: call sign-out API to clear cookie; fire-and-forget (idempotent)
    void signOut(apiBaseUrl);
    clearAuthSessionHint();
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
    void revalidateStoredSession({ blocking: true });
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
      const next = toggleInspectorDrillState(getInspectorDrill(), type);
      setInspectorDrill(next);
      writeInspectorDrill(next);
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

  // sprint-3/S1 + S2 (codex P1 backlog): remove the per-user scoped keys in
  // addition to the legacy unscoped keys so the reset action does what it
  // advertises for userId-namespaced storage. Falls through cleanly when no
  // session is active.
  const resetUserId = authSession?.user.id;
  if (resetUserId) {
    try {
      window.localStorage.removeItem(buildNotebookKey(resetUserId));
    } catch {
      /* ignore */
    }
    try {
      window.localStorage.removeItem(buildPdfWorkspaceKey(resetUserId));
    } catch {
      /* ignore */
    }
  }
  try {
    window.localStorage.removeItem(notebookStorageKey);
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(pdfWorkspaceStorageKey);
  } catch {
    /* ignore */
  }
  notebook = sampleLectureNote;
  pdfWorkspaceStore = { workspaces: {} };
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
    cancelAuthBootRequest();
    try {
      const payload = await signIn(apiBaseUrl, { name, studentNumber });
      const session = meResponseToSession(payload);
      authSession = session;
      writeAuthSessionHint();
      setDatadogRumUser({
        id: session.user.id,
        role: session.user.role
      });
      trackRumAction("login_completed", {
        role: session.user.role
      });
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
      // sprint-W21-sprint-1/S2 — sidebar term cache after login.
      void loadSidebarTermsCache().then(() => renderApp());
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
  cancelAuthBootRequest();
  try {
    await signUp(apiBaseUrl, { name, studentNumber });

    // Server sets cookie on 200. Re-validate via /me to populate session + PDF restore.
    loginFeedback = undefined;
    authMode = "login";
    trackRumAction("sign_up_completed");
    await revalidateStoredSession({ blocking: true });
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
    persistNotebook();
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
  KeyG: "chart",
  // sprint-W21-sprint-1 / S6 / AC27 — 별표 (star) widget.
  KeyY: "star"
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
  chart: "G",
  star: "Y"
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
  g: "chart",
  y: "star"
};

let hotkeyHelpModalOpen = false;

// sprint-1/S3: Browser Fullscreen API wrapper for the PDF workspace container.
// `PDF_WORKSPACE_ROOT_ID` 는 pdf-workspace/constants.ts 로 이전 (sprint-W22-sprint-2/S0).
// togglePdfFullscreen / isPdfWorkspaceFullscreen 본체는 pdf-workspace/view-state.ts
// 로 이전 (sprint-W22-sprint-2/S2). main.ts 는 FullscreenPort adapter wrapper.

function isPdfWorkspaceFullscreen(): boolean {
  const el = document.fullscreenElement;
  return !!el && el.id === PDF_WORKSPACE_ROOT_ID;
}

function getFullscreenPort(): FullscreenPort {
  return {
    isWorkspaceFullscreen: isPdfWorkspaceFullscreen,
    getWorkspaceTarget: () => document.getElementById(PDF_WORKSPACE_ROOT_ID),
    exitFullscreen: () =>
      typeof document.exitFullscreen === "function" ? document.exitFullscreen() : null,
    requestFullscreen: (target) =>
      typeof target.requestFullscreen === "function" ? target.requestFullscreen() : null,
    warn: (message, payload) => {
      if (payload === undefined) {
        console.warn(message);
      } else {
        console.warn(message, payload);
      }
    }
  };
}

const togglePdfFullscreen = () => togglePdfFullscreenModule(getFullscreenPort());

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

function getViewStateContext(): ViewStateContext {
  return {
    getStore: () => pdfWorkspaceStore,
    getRoute: () => parseRoute(window.location.hash),
    domain: { getSubjectWorkspace: getSubjectPdfWorkspace }
  };
}
function getViewStateCallbacks(): ViewStateCallbacks {
  return { updatePdfWorkspace };
}
const getActivePdfWorkspaceSubjectId = () => getActivePdfWorkspaceSubjectIdModule(getViewStateContext());

function handleDocumentKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing) {
    return;
  }

  const subjectId = getActivePdfWorkspaceSubjectId();
  if (!subjectId) {
    return;
  }

  const hasMetaOrCtrl = event.metaKey || event.ctrlKey;

  // === sprint-W21-sprint-1/S5 (AC21-AC22, ADR-8) — ESC priority ===
  //   1. hotkey help modal 닫기 (existing behavior)
  //   2. selectedTool !== "read" → tool reset (in-progress stroke commit + drag cancel)
  //   3. passthrough → browser default (전체화면 종료 등)
  // 도구 선택 상태에서 ESC 가 곧장 fullscreen 을 끄는 회기 방지 + 2-step UX.
  if (event.code === "Escape") {
    const workspaceForEsc = getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId);
    const escAction = resolveEscapeAction({
      modalOpen: hotkeyHelpModalOpen,
      selectedTool: (workspaceForEsc.material?.selectedTool ?? "read") as string
    });

    if (escAction === "close-modal") {
      event.preventDefault();
      hotkeyHelpModalOpen = false;
      renderApp();
      return;
    }

    if (escAction === "reset-tool") {
      // AC22: 부작용 0. in-progress stroke commit + active drag cancel.
      event.preventDefault();
      event.stopPropagation();
      commitActiveInkStrokeOnEsc();
      cancelActiveDragsOnEsc();
      setPdfTool(subjectId, "read");
      renderApp();
      return;
    }
    // passthrough — fullscreen exit 등 browser default 유지.
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

// sprint-W21-sprint-1/S5/AC22 — ESC reset 시 in-progress stroke commit.
// 본체는 pdf-workspace/ink-stroke.ts (sprint-W22-sprint-3/slice-2c) 로 이전.
// main.ts 는 ctx + callbacks + helpers 를 wire 해서 호출.
function commitActiveInkStrokeOnEsc(): void {
  commitActiveInkStrokeOnEscModule(inkStrokeCallbacks, inkStrokeDomainHelpers);
}

// sprint-W21-sprint-1/S5/AC22 — ESC reset 시 in-progress drag 진짜 cancel.
// pointermove 가 매 frame applyXxxMove 로 store 에 좌표를 commit 했으므로
// active drag pointer 만 nulling 하면 widget 이 drag 마지막 위치에 멈춤 (= 의도치
// 않은 placement commit). 진짜 cancel = drag start 시점 좌표 (startNormX/Y) 로
// apply*Move 한 번 더 호출해서 원위치 revert.
// PR #48 codex R1 P1 (drag scope) + R2 P1 (real revert) 누적 fix.
function cancelActiveDragsOnEsc(): void {
  if (activeTextBoxDrag) {
    const { subjectId, textBoxId, startNormX, startNormY } = activeTextBoxDrag;
    applyTextBoxMove(subjectId, textBoxId, { x: startNormX, y: startNormY });
    activeTextBoxDrag = undefined;
  }
  if (activeStickyDrag) {
    const { subjectId, noteId, startNormX, startNormY } = activeStickyDrag;
    applyStickyMove(subjectId, noteId, { x: startNormX, y: startNormY });
    activeStickyDrag = undefined;
  }
  if (activeChecklistDrag) {
    const { subjectId, checklistId, startNormX, startNormY } = activeChecklistDrag;
    applyChecklistMove(subjectId, checklistId, { x: startNormX, y: startNormY });
    activeChecklistDrag = undefined;
  }
  if (activeTableDrag) {
    const { subjectId, tableId, startNormX, startNormY } = activeTableDrag;
    applyTableMove(subjectId, tableId, { x: startNormX, y: startNormY });
    activeTableDrag = undefined;
  }
  if (activeChartDrag) {
    const { subjectId, chartId, startNormX, startNormY } = activeChartDrag;
    applyChartMove(subjectId, chartId, { x: startNormX, y: startNormY });
    activeChartDrag = undefined;
  }
  // Eraser drag = continuous erase action (no per-widget revert); ESC simply
  // stops further erase. Already-erased ink/sticky stays deleted (consistent
  // with pointerup commit semantics — eraser drag is not "drag-to-move").
  activeEraserDrag = undefined;
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

  // sprint-W21-sprint-1 / S6 / AC27 — 별표 click-to-add at point.
  if ((material.selectedTool as LocalPdfTool) === "star") {
    addStarMark(subjectId, point);
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

  // sprint-W22-sprint-3 / slice-2c — ink stroke begin (pdf-workspace/ink-stroke.ts).
  beginInkStroke(event, surface, subjectId, material, point);
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

  // sprint-W22-sprint-3 / slice-2c — ink stroke extend (pdf-workspace/ink-stroke.ts).
  // RAF batch + getCoalescedEvents 내부 처리.
  extendInkStroke(event, inkStrokeCtx, inkStrokeDomainHelpers);
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

  // sprint-W22-sprint-3 / slice-2c — ink stroke commit (pdf-workspace/ink-stroke.ts).
  // points>1 → workspace push + RAF (renderApp + reattach + measure RUM emit).
  // points<=1 → skip metric + state reset.
  commitInkStroke(event, inkStrokeCtx, inkStrokeCallbacks, inkStrokeDomainHelpers);
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
  trackRumAction("pdf_upload_started", {
    file_size_bucket: bucketFileSize(file.size)
  });
  renderApp();

  try {
    const pageCount = estimatePdfPageCount(await file.arrayBuffer());
    // S3 AC12 (codex PR #51 P0 fix): BE 가 classDate ISO 강제 → 업로드 시점에
    // 오늘 날짜를 placeholder 로 전송. 사용자는 이후 updateMaterialMetadata
    // 로 실제 수업일 갱신.
    // PR #51 R5+ P1: today ISO 가 silent mislabel — epoch sentinel '1970-01-01'
    // (PDF_MATERIAL_UNASSIGNED_WIRE_DATE) 로 통일. valid ISO 라 BE Zod 통과 +
    // FE 의 isUnconfirmedPdfClassDate 가 인식 → 자동 confirmed 회피.
    const intent = await createMaterialUploadIntent(apiBaseUrl, {
      subjectId,
      classDate: PDF_MATERIAL_UNASSIGNED_WIRE_DATE,
      fileName: file.name,
      fileSize: file.size,
      pageCount,
      contentType: "application/pdf"
    });

    // Stash intent for retry CTA (resume at S3 PUT step if intent still valid)
    pendingPdfRetry = { file, subjectId, intent };

    clearActivePdfObjectUrl(subjectId);
    const pendingMaterial = createPdfMaterialFromBackend(intent.material, undefined);
    // PR #51 R2 P1: classDate 가 today 라 weekNote.label 매칭 시 자동 confirmed
    // 됨. FE-local 에선 sentinel 로 유지해서 isUnconfirmedPdfClassDate true
    // 보장. 사용자가 명시 update 시점에 실제 ISO 로 전환.
    pendingMaterial.classDate = PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
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
    // PR #51 R2 P1: 동일 sentinel 유지 — uploadMaterialFile 후 BE 가 다시
    // ISO classDate 반환하므로 FE 표시는 sentinel 로 유지해서 사용자 미확정 신호.
    completedMaterial.classDate = PDF_MATERIAL_UNASSIGNED_CLASS_DATE;
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
    trackRumAction("pdf_upload_completed", {
      file_size_bucket: bucketFileSize(uploadedMaterial.fileSize),
      page_count_bucket: bucketPageCount(uploadedMaterial.pageCount)
    });
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
    trackRumAction("pdf_upload_failed", {
      reason: error instanceof MaterialApiError ? `http_${error.status}` : "unknown"
    });
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
    clearFailedPdfPreviewLoad(loadKey);
  }

  if (
    !options.force &&
    getActivePdfObjectUrlMaterialId(subjectId) === materialId &&
    hasActivePdfObjectUrl(subjectId)
  ) {
    return;
  }

  if (!options.force && hasFailedPdfPreviewLoad(loadKey)) {
    return;
  }

  if (hasActivePdfPreviewLoad(loadKey)) {
    return;
  }

  markPdfPreviewLoadStarted(loadKey);

  try {
    const blob = await fetchPdfMaterialFile(apiBaseUrl, materialId);
    setActivePdfObjectUrl(subjectId, materialId, URL.createObjectURL(blob));
  } catch (error) {
    if (handleMaterialAuthError(error)) {
      return;
    }

    markFailedPdfPreviewLoad(loadKey);

    if (!options.silent) {
      intakeFeedback = {
        kind: "error",
        title: "저장된 PDF 미리보기를 불러오지 못했습니다.",
        detail: `${material.fileName}: ${formatMaterialError(error)}`
      };
    }
  } finally {
    finishPdfPreviewLoad(loadKey);
    renderApp();
  }
}

function handleMaterialAuthError(error: unknown): boolean {
  if (!(error instanceof MaterialApiError) || error.status !== 401) {
    return false;
  }

  clearAuthSessionHint();
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

function bucketFileSize(size: number): string {
  if (size < 1_000_000) return "lt_1mb";
  if (size < 5_000_000) return "1_5mb";
  if (size < 20_000_000) return "5_20mb";
  return "gte_20mb";
}

function bucketPageCount(pageCount: number): string {
  if (pageCount <= 10) return "1_10";
  if (pageCount <= 30) return "11_30";
  if (pageCount <= 100) return "31_100";
  return "gt_100";
}

// 본체 (getSurfacePoint / toInkPoint / updateLiveStroke / liveStrokeRafId +
// scheduleLiveStrokeRender / measurePenStrokeNextPaintFromMark) 는
// pdf-workspace/ink-stroke.ts (sprint-W22-sprint-3/slice-2c) 로 이전.

// sprint-12/slice-2: domain PdfWorkspaceTool union now includes "eraser" | "text" | "checklist".
// LocalPdfTool is now an alias for the domain union (redundant "| eraser" dropped).
// sprint-13: "table" | "chart" added in domain; slice-2 activates table UI.
type LocalPdfTool = PdfWorkspaceTool;

// sprint-13/slice-5+: LocalChartType widens domain PdfChartType (legacy one-type chart) to include
// xy/bar/trig variants. Domain normalizeChartType keeps persisted enum compatibility on hydration,
// so chart type is persisted as a type: prefix line in chart.content (free-string field).
// Pattern mirrors LocalPdfTool widening for eraser.
// CHART_PLOT_* + CHART_PLANE_COLOR + SVG_NS = chart-widget.ts (slice-2g).

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
    tool === "chart" ||
    // PR #52 codex Round-1 P1: toolbar 클릭이 set-pdf-tool 분기로 가는데 이
    // 가드가 "star" 를 reject 해서 touch 사용자가 별표 도구 활성화 불가.
    tool === "star"
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

function movePdfPage(subjectId: string, delta: number) {
  movePdfPageModule(subjectId, delta, getViewStateContext(), getViewStateCallbacks());
}
function requestPdfPage(subjectId: string, pageNumber: number) {
  requestPdfPageModule(subjectId, pageNumber, getViewStateContext(), getViewStateCallbacks());
}
function setPdfPage(subjectId: string, pageNumber: number) {
  setPdfPageModule(subjectId, pageNumber, getViewStateCallbacks());
}
function setPdfTool(subjectId: string, tool: LocalPdfTool) {
  setPdfToolModule(subjectId, tool, getViewStateCallbacks());
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

// table-widget context/callbacks (slice-2g-table — table-widget.ts).
const tableWidgetContext: TableWidgetContext = {
  getWorkspace: (subjectId) => getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId)
};
const tableWidgetCallbacks: TableWidgetCallbacks = {
  updateWorkspace: (subjectId, updater) => updatePdfWorkspace(subjectId, updater)
};
function addTable(subjectId: string, position: { x: number; y: number }): void {
  addTableModule(tableWidgetContext, tableWidgetCallbacks, subjectId, position);
}
function removeTable(subjectId: string, tableId: string): void {
  removeTableModule(tableWidgetCallbacks, subjectId, tableId);
}
function applyTableMove(subjectId: string, tableId: string, position: { x: number; y: number }): void {
  applyTableMoveModule(tableWidgetCallbacks, subjectId, tableId, position);
}
function applyTableCollapseToggle(subjectId: string, tableId: string): void {
  applyTableCollapseToggleModule(tableWidgetCallbacks, subjectId, tableId);
}
function scheduleTableCellUpdate(subjectId: string, tableId: string, content: string): void {
  scheduleTableCellUpdateModule(tableWidgetCallbacks, subjectId, tableId, content);
}
function applyAddTableRow(subjectId: string, tableId: string): void {
  applyAddTableRowModule(tableWidgetCallbacks, subjectId, tableId);
}
function applyAddTableColumn(subjectId: string, tableId: string): void {
  applyAddTableColumnModule(tableWidgetCallbacks, subjectId, tableId);
}
function applyDeleteTableRow(subjectId: string, tableId: string, rowIndex: number): void {
  applyDeleteTableRowModule(tableWidgetCallbacks, subjectId, tableId, rowIndex);
}
function applyDeleteTableColumn(subjectId: string, tableId: string, colIndex: number): void {
  applyDeleteTableColumnModule(tableWidgetCallbacks, subjectId, tableId, colIndex);
}

// ---------------------------------------------------------------------------
// sprint-13/slice-3 — PdfChart store operations
// Pattern mirrors PdfTable store operations.
// ---------------------------------------------------------------------------

// chart-widget context/callbacks (slice-2g — chart-widget.ts).
const chartWidgetContext: ChartWidgetContext = {
  getWorkspace: (subjectId) => getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId)
};
const chartWidgetCallbacks: ChartWidgetCallbacks = {
  updateWorkspace: (subjectId, updater) => updatePdfWorkspace(subjectId, updater)
};
function addChart(subjectId: string, position: { x: number; y: number }): void {
  addChartModule(chartWidgetContext, chartWidgetCallbacks, subjectId, position);
}
function refreshChartWidgets(): void {
  refreshChartWidgetsModule(chartWidgetContext);
}
// sprint-W21-sprint-1 / S6 / AC27+AC29+AC30 — 별표 add / delete.
// Default size 0.06 (page width 의 6%). cuid-ish id (browser crypto.randomUUID
const starMarkContext: StarMarkContext = {
  getWorkspace: (subjectId) => getSubjectPdfWorkspace(pdfWorkspaceStore, subjectId)
};
const starMarkCallbacks: StarMarkCallbacks = {
  updateWorkspace: (subjectId, updater) => updatePdfWorkspace(subjectId, updater)
};
function addStarMark(subjectId: string, position: { x: number; y: number }): void {
  addStarMarkModule(starMarkContext, starMarkCallbacks, subjectId, position);
}
function removeStarMark(subjectId: string, markId: string): void {
  removeStarMarkModule(starMarkCallbacks, subjectId, markId);
}
function resizeStarMark(subjectId: string, markId: string, sizeRatio: number): void {
  resizeStarMarkModule(starMarkCallbacks, subjectId, markId, sizeRatio);
}
function refreshTableWidgets(): void {
  refreshTableWidgetsModule(tableWidgetContext);
}

// chart handlers (slice-2g — chart-widget.ts) thin wrappers.
function removeChart(subjectId: string, chartId: string): void {
  removeChartModule(chartWidgetCallbacks, subjectId, chartId);
}
function applyChartMove(
  subjectId: string,
  chartId: string,
  position: { x: number; y: number }
): void {
  applyChartMoveModule(chartWidgetCallbacks, subjectId, chartId, position);
}
function applyChartCollapseToggle(subjectId: string, chartId: string): void {
  applyChartCollapseToggleModule(chartWidgetCallbacks, subjectId, chartId);
}
function scheduleChartPointUpdate(subjectId: string, chartId: string, content: string): void {
  scheduleChartPointUpdateModule(chartWidgetCallbacks, subjectId, chartId, content);
}
function applyAddChartPoint(subjectId: string, chartId: string): void {
  applyAddChartPointModule(chartWidgetCallbacks, subjectId, chartId);
}
function applyDeleteChartPoint(subjectId: string, chartId: string, pointIndex: number): void {
  applyDeleteChartPointModule(chartWidgetCallbacks, subjectId, chartId, pointIndex);
}
function applyClearChartPoints(subjectId: string, chartId: string): void {
  applyClearChartPointsModule(chartWidgetCallbacks, subjectId, chartId);
}
function applyFillChartFunction(subjectId: string, chartId: string): void {
  applyFillChartFunctionModule(chartWidgetCallbacks, subjectId, chartId);
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
    const saved = persistNotebook();
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
    mountRender(renderAuthSessionCheckPage(authBootNotice));
    return;
  }

  if (!authSession) {
    document.body.removeAttribute("data-route");
    mountRender(renderAuthLoginPage(authMode, loginFeedback));
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
    mountRender(composeShell(
      renderHomeSidebar(sidebarContext, notebook, { name: "home" }),
      renderNotFound(),
      "study-note / 찾을 수 없음"
    ));
    return;
  }

  if ((route.name === "week" || route.name === "subject-summary-detail") && subject && !week) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderNotFound(),
      `${subject.title} / 찾을 수 없음`
    ));
    return;
  }

  if (route.name === "home") {
    mountRender(composeShell(
      renderHomeSidebar(sidebarContext, notebook, route),
      renderHome(notebook),
      `${notebook.title} / 홈`
    ));
    return;
  }

  if (route.name === "intake") {
    mountRender(composeShell(
      renderHomeSidebar(sidebarContext, notebook, route),
      renderIntakeGuide(notebook),
      `${notebook.title} / 자료 투입`
    ));
    return;
  }

  if (route.name === "pdf-workspaces") {
    mountRender(composeShell(
      renderHomeSidebar(sidebarContext, notebook, route),
      renderPdfWorkspaceIndex(pdfLibraryContext, notebook, getSubjectPdfMaterials),
      `${notebook.title} / PDF 작업공간`
    ));
    return;
  }

  if (route.name === "subject-intake" && subject) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderSubjectIntakeGuide(subject, renderIntakeFeedback),
      `${subject.title} / 자료 투입`
    ));
    return;
  }

  if (route.name === "pdf-workspace" && subject) {
    ensurePdfPreviewForWorkspace(subject.id);
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderPdfWorkspacePage(workspacePageContext, subject),
      `${subject.title} / PDF 작업공간`
    ));
    // sprint-W21-sprint-2/S2 (plan §R3): subject 진입 시 batch hydrate.
    // sprint-2026-W22-sprint-1 / layer B/slice-1: annotation-sync 가 자체
    // inflight/fetched dedup. main.ts 는 batch + single-GET 둘 다 항상 호출
    // (annotation-sync 가 중복 fetch 차단). batch 가 truncated/실패 시 자체
    // fallback 으로 active material single-GET 발사. material 전환 시 single
    // 직접 호출도 안전 (dedup).
    const workspace = getSubjectPdfWorkspace(pdfWorkspaceStore, subject.id);
    const material = workspace.material;
    void fetchAnnotationsForSubjectSync(
      subject.id,
      getAnnotationSyncContext(),
      getAnnotationSyncCallbacks()
    );
    if (material) {
      const materialId = material.backendMaterialId ?? material.id;
      void fetchAnnotationIfMissingSync(
        subject.id,
        materialId,
        getAnnotationSyncContext(),
        getAnnotationSyncCallbacks()
      );
    }
    return;
  }

  if ((route.name === "subject" || route.name === "subject-class") && subject) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderSubjectClassPage(subjectClassContext, subject),
      `${subject.title} / 수업`
    ));
    return;
  }

  if (route.name === "subject-summaries" && subject) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderSubjectSummariesPage(summariesContext, subject),
      `${subject.title} / 요약본`
    ));
    return;
  }

  if (route.name === "subject-summary-detail" && subject && week) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderWeekSummaryPage(summariesContext, subject, week),
      `${subject.title} / ${week.label} 요약본`
    ));
    return;
  }

  if (route.name === "subject-mcp" && subject) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderSubjectMcpPage(subject),
      `${subject.title} / MCP 호출`
    ));
    return;
  }

  if (route.name === "subject-memorize" && subject) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderSubjectMemorizePage(subject),
      `${subject.title} / 필수 암기노트`
    ));
    return;
  }

  if (route.name === "week" && subject && week) {
    mountRender(composeShell(
      renderSubjectSidebar(sidebarContext, subject, route),
      renderWeekPage(weekPageContext, subject, week),
      `${subject.title} / ${week.label}`
    ));
    // sprint-2/S2: lazy fetch userNotes from BE on first week view (per-session cache).
    void fetchUserNoteIfMissing(subject.id, week.id);
  }

}



// sprint-2026-W21-sprint-2 / layer A: renderShell / banner / modal =
// app/appShell.ts. AppShellContext = least-privilege narrow (broad
// authSession / notebook 객체 노출 X). 매 renderApp 호출 시 module
// state 에서 narrow.
// sprint-19: notebook-storage slice. saveNotebook 호출은 userId + onErrorChanged
// 를 직접 전달해야 하므로 main.ts 안 helper 로 묶음. caller 4 site 가 동일 패턴.
function persistNotebook(): boolean {
  return saveNotebook(notebook, authSession?.user.id, () => {
    try { renderApp(); } catch { /* ignore */ }
  });
}

function getAppShellContext(): AppShellContext {
  return {
    displayName: authSession?.user.displayName ?? null,
    notebookUpdatedAt: notebook.updatedAt,
    notebookStorageError: getNotebookStorageError() ?? null,
    syncBackendError: syncBackendError ?? null,
    hotkeyHelpModalOpen,
    activePdfWorkspaceSubjectId: getActivePdfWorkspaceSubjectId() ?? null
  };
}

// Pdf-library context (slice-9 — pdf-library.ts). 1 field (auth lazy).
const pdfLibraryContext: PdfLibraryContext = {
  getAuthSession: () => authSession
};

// Quick-note context (slice-10 — quick-note.ts). 1 field (lazy getQuickNote).
const quickNoteContext: QuickNoteContext = {
  getQuickNote: () => quickNote
};

// Sidebar context (slice-2 — sidebar.ts). lazy getter only.
const sidebarContext: SidebarContext = {
  getNotebook: () => notebook,
  getAdminRole: () => authSession?.user.role,
  getSidebarTermsCache: () => sidebarTermsCache,
  getSidebarSubjectsCache: () => sidebarSubjectsCache,
  getSidebarOpenTermIds: () => sidebarOpenTermIds
};

// Summaries context (slice-5 — summaries.ts). 2 field (fn ref + callback).
const summariesContext: SummariesContext = {
  formatWeekLabel,
  renderQuickNotePanel: (subject, origins) =>
    renderQuickNotePanel(quickNoteContext, subject, origins)
};

// Subject-class context (slice-4 — subject-class.ts). 2 lazy + 3 fn ref + 3 callback.
const subjectClassContext: SubjectClassContext = {
  getSubjectPdfMaterials,
  canManagePdfMaterials: () => canManagePdfMaterials(pdfLibraryContext),
  isUnconfirmedPdfClassDate,
  formatWeekLabel,
  getPdfMaterialsForWeek,
  renderIntakeFeedback,
  renderPdfLibraryUploadCard: (subject, materialCount) =>
    renderPdfLibraryUploadCard(pdfLibraryContext, subject, materialCount),
  renderPdfMaterialCard: (subject, material, opts) =>
    renderPdfMaterialCard(pdfLibraryContext, subject, material, opts)
};

// Week page context (slice-8 — week.ts). 1 lazy + 1 fn ref + 2 callback.
const weekPageContext: WeekPageContext = {
  getSubjectPdfMaterials,
  getPdfMaterialsForWeek,
  renderQuickNotePanel: (subject, origins) =>
    renderQuickNotePanel(quickNoteContext, subject, origins),
  renderPdfMaterialCard: (subject, material, opts) =>
    renderPdfMaterialCard(pdfLibraryContext, subject, material, opts)
};

function composeShell(sidebar: string, mainContent: string, crumb: string): string {
  return renderAppShell(sidebar, mainContent, crumb, getAppShellContext());
}


// sprint-W21-sprint-1/S2/AC8-AC10 — sidebar term cache loader + render.
// PR #49 codex Round-1 P1 fix: user A 의 fetch 가 resolve 되는 사이 user B 로
// 로그인 전환되면 stale response 가 cache 를 오염시킴. capture user 후 await,
// resolve 시점에 authSession.user.id 가 여전히 동일한지 확인 후에만 write.
async function loadSidebarTermsCache(): Promise<void> {
  const userIdAtStart = authSession?.user.id;
  if (!userIdAtStart) return;
  try {
    const [termsRes, subjectsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/v1/terms`, { credentials: "include" }),
      fetch(`${apiBaseUrl}/v1/subjects`, { credentials: "include" })
    ]);
    // session race guard — A의 응답이 B 세션에 쓰이지 않게.
    if (authSession?.user.id !== userIdAtStart) return;
    // PR #49 codex R2 P2 — fetch fail 시 cache 를 빈 array 로 "loaded" 표시
    // 하면 sidebar 가 grouped (orphan 한 그룹) 로 영구 전환됨. flat fallback
    // 유지 위해 null 그대로 두고 다음 trigger 에서 retry.
    if (!termsRes.ok || !subjectsRes.ok) {
      return;
    }
    const termsJson = (await termsRes.json()) as Array<{
      id: string;
      grade: number;
      semester: number;
      title: string;
      startDate: string | null;
      endDate: string | null;
    }>;
    const subjectsJson = (await subjectsRes.json()) as Array<{
      id: string;
      title: string;
      termId: string | null;
    }>;
    // race guard 재확인 (await json 사이 race 가능).
    if (authSession?.user.id !== userIdAtStart) return;
    sidebarTermsCache = termsJson.map((t) => ({
      id: t.id,
      grade: t.grade,
      semester: t.semester,
      title: t.title,
      startDate: t.startDate ?? null,
      endDate: t.endDate ?? null
    }));
    sidebarSubjectsCache = subjectsJson.map((s) => ({
      id: s.id,
      title: s.title,
      termId: s.termId ?? null
    }));
    refreshSidebarOpenTermIds();
  } catch {
    if (authSession?.user.id !== userIdAtStart) return;
    // PR #49 codex R2 P2 — 네트워크 error 도 cache 를 빈 array 로 채우지 않음
    // (flat fallback 유지). 다음 trigger 에서 retry.
  }
}

function refreshSidebarOpenTermIds(): void {
  const userId = authSession?.user.id;
  if (!userId || !sidebarTermsCache || !sidebarSubjectsCache) return;
  const groups = groupSubjectsByTerm(sidebarSubjectsCache, sidebarTermsCache);
  const defaults = getDefaultOpenTermIds(groups, new Date().toISOString());
  // PR #49 codex R5 P2 — localStorage getItem 도 SecurityError 던질 수 있음
  // (private window, ITP). try/catch + fallback {} 으로 보호.
  let stored: Record<string, boolean> = {};
  if (isBrowserRuntime) {
    try {
      stored = parseStoredOpenState(window.localStorage.getItem(sidebarTermOpenStorageKey(userId)));
    } catch {
      stored = {};
    }
  }
  sidebarOpenTermIds = resolveOpenTermIds(groups, defaults, stored);
}

function toggleSidebarTermOpen(termId: string): void {
  const userId = authSession?.user.id;
  if (!userId || !isBrowserRuntime) return;
  const next = !sidebarOpenTermIds.has(termId);
  if (next) sidebarOpenTermIds.add(termId);
  else sidebarOpenTermIds.delete(termId);
  // PR #49 codex R3 P2 — localStorage quota / private window / safari ITP 등에서
  // getItem/setItem 이 throw 가능. in-memory state 는 갱신되었으므로 persist
  // 실패해도 UI 동작은 유지 (다음 trigger 가 재시도).
  try {
    const key = sidebarTermOpenStorageKey(userId);
    const stored = parseStoredOpenState(window.localStorage.getItem(key));
    stored[termId] = next;
    window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // localStorage unavailable / quota — silent skip (in-memory state survives 세션).
  }
  renderApp();
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




// pdf-toolbar context (slice-2f/iv — page-render.ts).
const pdfToolbarContext: PdfToolbarContext = {
  isPdfWorkspaceFullscreen,
  pdfToolHotkeyLabels: PDF_TOOL_HOTKEY_LABELS as Record<string, string>,
  renderEraserSubToolbar
};

// workspace-page context (slice-2f/iv-bis — workspace-page.ts).
// 12 field = 8 lazy module-state getter + 1 sub-context + 3 main.ts render hooks.
// 추가 surface (getSubjectPdfWorkspace / getPdfMaterialKey / renderChartMount /
// renderTableMount / renderStarMark / renderInspectorStatRow) 는 workspace-page.ts
// 가 자체 module 에서 직접 import (bucket-1 Direct imports).
const workspacePageContext: WorkspacePageContext = {
  getWorkspaceStore: () => pdfWorkspaceStore,
  getInspectorOpen: () => inspectorOpen,
  hasIntakeFeedback: () => Boolean(intakeFeedback),
  getActivePdfObjectUrl,
  getActivePdfObjectUrlMaterialId,
  hasActivePdfPreviewLoad,
  getSubjectPdfMaterials,
  canManagePdfMaterials: () => canManagePdfMaterials(pdfLibraryContext),
  pdfToolbarContext,
  renderIntakeFeedback,
  renderSubjectPdfMaterialBrowser: (subject, materials, currentKey) =>
    renderSubjectPdfMaterialBrowser(pdfLibraryContext, subject, materials, currentKey),
  formatPdfTool
};



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


// sprint-13/slice-5: table widget mount placeholder (mirrors renderChartMount).
// Table DOM element is built by renderTable() and injected by refreshTableWidgets().




// sprint-2/S3: render an exam-phase group on the memorize page.




function formatPdfTool(tool: LocalPdfTool): string {
  const labels: Record<LocalPdfTool, string> = {
    read: "읽기",
    sticky: "포스트잇",
    pen: "펜",
    eraser: "지우개",
    text: "텍스트 박스",
    checklist: "체크리스트",
    table: "표",
    chart: "그래프",
    star: "별표"
  };

  return labels[tool];
}


