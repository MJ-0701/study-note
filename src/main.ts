import { sampleLectureNote } from "./data/sampleLectureNote";
import { localIntakeGuide } from "./data/intakeGuide";
import { classSchedule, scheduleRangeLabel } from "./data/classSchedule";
import {
  MaterialApiError,
  createMaterialUploadIntent,
  fetchPdfMaterialFile,
  listPdfMaterials,
  uploadMaterialFile,
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
} from "./domain/lectureNote";
import {
  applyWeekNoteImport,
  sanitizeWeekNoteImportPayload,
  validateWeekNoteImportPayload
} from "./domain/lectureNoteImport";
import {
  createInkStroke,
  createPdfMaterialFromBackend,
  createStickyNote,
  estimatePdfPageCount,
  formatPdfFileSize,
  getSubjectPdfWorkspace,
  normalizePdfPoint,
  pdfWorkspaceStorageKey,
  type PdfInkPoint,
  type PdfInkStroke,
  type PdfWorkspaceStore,
  type PdfWorkspaceTool,
  type StickyNoteBlockKind,
  type SubjectPdfWorkspace
} from "./domain/pdfWorkspace";
import "./styles.css";

type Route =
  | { name: "home" }
  | { name: "intake" }
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

interface AuthSession {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    displayName: string;
    studentNumber: string;
    email?: string;
  };
}

type AuthBootState = "checking" | "ready";

type LoginFeedback =
  | {
      kind: "error" | "success";
      title: string;
      detail: string;
    }
  | undefined;

const notebookStorageKey = "study-note.notebook.v2";
const authSessionStorageKey = "study-note.auth-session.v1";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001/api";
let notebook = loadStoredNotebook();
let pdfWorkspaceStore = loadPdfWorkspaceStore();
let authSession = loadAuthSession();
let authBootState: AuthBootState = authSession ? "checking" : "ready";
const activePdfObjectUrls = new Map<string, string>();
const activePdfObjectUrlMaterialIds = new Map<string, string>();
const activePdfPreviewLoads = new Set<string>();
const failedPdfPreviewLoadKeys = new Set<string>();
let activeInkStroke: ActiveInkStroke | undefined;
let intakeFeedback: IntakeFeedback;
let loginFeedback: LoginFeedback;
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

if (authSession) {
  void revalidateStoredSession();
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

function loadAuthSession(): AuthSession | undefined {
  const stored = window.localStorage.getItem(authSessionStorageKey);

  if (!stored) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;

    if (isAuthSession(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid session payloads are cleared below.
  }

  window.localStorage.removeItem(authSessionStorageKey);
  return undefined;
}

function saveAuthSession(nextSession: AuthSession): void {
  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(nextSession));
}

function clearAuthSession(): void {
  authSession = undefined;
  window.localStorage.removeItem(authSessionStorageKey);
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
  const session = authSession;

  if (!session) {
    authBootState = "ready";
    renderApp();
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/me`, {
      headers: {
        authorization: `Bearer ${session.token}`
      }
    });

    if (!response.ok) {
      throw new Error("stored session rejected");
    }

    const payload = (await response.json()) as { user?: unknown };

    if (!isAuthUser(payload.user)) {
      throw new Error("stored session returned an invalid user profile");
    }

    authSession = {
      ...session,
      user: payload.user
    };
    saveAuthSession(authSession);
    await restoreUploadedPdfMaterialsForSession(authSession);
    loginFeedback = undefined;
  } catch {
    clearAuthSession();
    loginFeedback = {
      kind: "error",
      title: "세션을 다시 확인하지 못했습니다.",
      detail: "저장된 로그인 정보가 만료되었습니다. 이름과 학번으로 다시 로그인하세요."
    };
  } finally {
    authBootState = "ready";
    renderApp();
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthSession>;

  return (
    typeof candidate.token === "string" &&
    typeof candidate.expiresAt === "string" &&
    new Date(candidate.expiresAt).getTime() > Date.now() &&
    isAuthUser(candidate.user)
  );
}

function isAuthUser(value: unknown): value is AuthSession["user"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthSession["user"]>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.displayName === "string" &&
    typeof candidate.studentNumber === "string" &&
    (candidate.email === undefined || typeof candidate.email === "string")
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
      return { workspaces: parsed.workspaces as PdfWorkspaceStore["workspaces"] };
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

  if (quickNoteButton?.dataset.action === "logout") {
    clearAuthSession();
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

  if (quickNoteButton?.dataset.action === "set-pdf-tool") {
    const subjectId = quickNoteButton.dataset.subjectId;
    const tool = quickNoteButton.dataset.tool as PdfWorkspaceTool | undefined;

    if (subjectId && isPdfWorkspaceTool(tool)) {
      setPdfTool(subjectId, tool);
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

  if (quickNoteButton?.dataset.action === "clear-pdf-annotations") {
    const subjectId = quickNoteButton.dataset.subjectId;

    if (subjectId) {
      clearPdfAnnotations(subjectId);
      renderApp();
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

  if (!(target instanceof HTMLFormElement) || target.dataset.action !== "login") {
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
      detail: "시험 대비 자료는 로그인 후 볼 수 있습니다."
    };
    renderApp();
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ name, studentNumber })
    });

    if (!response.ok) {
      throw new Error("이름 또는 학번이 올바르지 않습니다.");
    }

    const session = (await response.json()) as unknown;

    if (!isAuthSession(session)) {
      throw new Error("로그인 응답 형식이 올바르지 않습니다.");
    }

    authSession = session;
    authBootState = "ready";
    saveAuthSession(session);
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
}

function handleDocumentInput(event: Event): void {
  const target = event.target;

  if (
    !(target instanceof HTMLTextAreaElement) ||
    target.dataset.action !== "update-sticky-note"
  ) {
    return;
  }

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

  if (target.closest("a, button, input, label, textarea, .sticky-note")) {
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
    renderApp();
    event.preventDefault();
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
    const intent = await createMaterialUploadIntent(apiBaseUrl, session.token, {
      subjectId,
      classDate: getPdfMaterialClassDate(subjectId),
      fileName: file.name,
      fileSize: file.size,
      pageCount,
      contentType: "application/pdf"
    });

    clearActivePdfObjectUrl(subjectId);
    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      material: createPdfMaterialFromBackend(intent.material, workspace.material)
    }));
    renderApp();

    const uploadedMaterial = await uploadMaterialFile(
      apiBaseUrl,
      session.token,
      intent.upload.uploadUrl,
      file
    );

    updatePdfWorkspace(subjectId, (workspace) => ({
      ...workspace,
      material: createPdfMaterialFromBackend(uploadedMaterial, workspace.material)
    }));

    await loadPdfPreviewFromBackend(subjectId, uploadedMaterial, session, {
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
      detail: formatMaterialError(error)
    };
  }

  renderApp();
}

async function restoreUploadedPdfMaterialsForSession(
  session: AuthSession
): Promise<void> {
  try {
    const materials = await listPdfMaterials(apiBaseUrl, session.token);
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

  void loadPdfPreviewFromBackend(subjectId, material, session, {
    force: false,
    silent: false
  });
}

async function loadPdfPreviewFromBackend(
  subjectId: string,
  material: { backendMaterialId?: string; fileName: string },
  session: AuthSession,
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
    const blob = await fetchPdfMaterialFile(apiBaseUrl, session.token, materialId);
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

function isPdfWorkspaceTool(tool: string | undefined): tool is PdfWorkspaceTool {
  return tool === "read" || tool === "sticky" || tool === "pen";
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

function setPdfTool(subjectId: string, tool: PdfWorkspaceTool): void {
  updatePdfWorkspace(subjectId, (workspace) => {
    const material = workspace.material;

    if (!material) {
      return workspace;
    }

    return {
      ...workspace,
      material: {
        ...material,
        selectedTool: tool
      }
    };
  });
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
    inkStrokes: []
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
    appRoot.innerHTML = renderSessionCheckPage();
    return;
  }

  if (!authSession) {
    appRoot.innerHTML = renderLoginPage();
    return;
  }

  const route = parseRoute(window.location.hash);
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

  if (route.name !== "home" && route.name !== "intake" && !subject) {
    appRoot.innerHTML = renderShell(
      renderHomeSidebar(notebook, { name: "home" }),
      renderNotFound(),
      "study-note / 찾을 수 없음"
    );
    return;
  }

  if (route.name === "week" && subject && !week) {
    appRoot.innerHTML = renderShell(
      renderSubjectSidebar(subject, route),
      renderNotFound(),
      `${subject.title} / 찾을 수 없음`
    );
    return;
  }

  if (route.name === "home") {
    appRoot.innerHTML = renderShell(
      renderHomeSidebar(notebook, route),
      renderHome(notebook),
      `${notebook.title} / 홈`
    );
    return;
  }

  if (route.name === "intake") {
    appRoot.innerHTML = renderShell(
      renderHomeSidebar(notebook, route),
      renderIntakeGuide(notebook),
      `${notebook.title} / 자료 투입`
    );
    return;
  }

  if (route.name === "subject-intake" && subject) {
    appRoot.innerHTML = renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectIntakeGuide(subject),
      `${subject.title} / 자료 투입`
    );
    return;
  }

  if (route.name === "pdf-workspace" && subject) {
    ensurePdfPreviewForWorkspace(subject.id);
    appRoot.innerHTML = renderShell(
      renderSubjectSidebar(subject, route),
      renderPdfWorkspacePage(subject),
      `${subject.title} / PDF 작업공간`
    );
    return;
  }

  if (route.name === "subject" && subject) {
    appRoot.innerHTML = renderShell(
      renderSubjectSidebar(subject, route),
      renderSubjectPage(subject),
      `${subject.title} / 총정리`
    );
    return;
  }

  if (route.name === "week" && subject && week) {
    appRoot.innerHTML = renderShell(
      renderSubjectSidebar(subject, route),
      renderWeekPage(subject, week),
      `${subject.title} / ${week.label}`
    );
  }
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
  return `
    <main class="login-screen" data-login-screen="true">
      <section class="login-panel" aria-labelledby="login-title">
        <p class="meta">PRIVATE STUDY WORKSPACE</p>
        <h1 id="login-title">study-note 로그인</h1>
        <p class="lede">강의 PDF와 필기 데이터는 사용자별 작업공간에서 관리됩니다.</p>
        <form class="login-form" data-action="login">
          <label>
            <span>이름</span>
            <input name="name" autocomplete="name" required />
          </label>
          <label>
            <span>학번</span>
            <input name="studentNumber" inputmode="numeric" autocomplete="off" required />
          </label>
          <button class="primary-action" type="submit">로그인</button>
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
          ${studyNotebook.subjects.map((subject) => `<a href="${subjectPath(subject)}">${subject.title}</a>`).join("")}
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
    </aside>
  `;
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
          ${subject.weekNotes.map((week) => `
            <a class="${route.name === "week" && route.weekId === week.id ? "active" : ""}" href="${weekPath(subject, week)}">${week.label}</a>
          `).join("")}
        </nav>
      </div>
      ${renderClassSchedule(currentSession?.label)}
      <div class="sidebar-group is-secondary">
        <p class="group-label">다른 과목</p>
        <nav>
          <a href="#/">전체 현황</a>
          ${notebook.subjects.map((item) => `<a class="${item.id === subject.id && route.name === "subject" ? "active" : ""}" href="${subjectPath(item)}">${item.title}</a>`).join("")}
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

  return `
    <div class="import-feedback is-${intakeFeedback.kind}">
      <strong>${intakeFeedback.title}</strong>
      <p>${intakeFeedback.detail}</p>
      ${intakeFeedback.href ? `<a href="${intakeFeedback.href}">반영된 수업일 노트 보기</a>` : ""}
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
  const selectedTool = material?.selectedTool ?? "read";
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
        ${renderPdfToolbar(subject.id, selectedTool, material?.pageCount ?? 1, selectedPage, Boolean(material))}
      </div>

      <div class="pdf-workspace-layout">
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
            data-pdf-annotation-surface="true"
            data-subject-id="${subject.id}"
            data-page-number="${selectedPage}"
          >
            <svg class="ink-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true">
              ${pageStrokes.map(renderInkStroke).join("")}
            </svg>
            <svg class="ink-layer is-live-layer" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true" data-live-ink-layer="true"></svg>
            ${pageNotes.map((note) => renderStickyNote(subject.id, note)).join("")}
          </div>
        </div>

        <aside class="pdf-inspector" aria-label="PDF annotation state">
          <p class="meta">§3 — 저장 상태</p>
          <h3>로컬 annotation</h3>
          <dl>
            <div><dt>포스트잇</dt><dd>${workspace.stickyNotes.length}개</dd></div>
            <div><dt>펜 stroke</dt><dd>${workspace.inkStrokes.length}개</dd></div>
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
  selectedTool: PdfWorkspaceTool,
  pageCount: number,
  selectedPage: number,
  hasMaterial: boolean
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
      </div>
      <div class="pdf-tool-group" role="group" aria-label="포스트잇 추가">
        ${renderStickyAddButton(subjectId, "text", "텍스트")}
        ${renderStickyAddButton(subjectId, "checklist", "체크")}
        ${renderStickyAddButton(subjectId, "table", "표")}
        ${renderStickyAddButton(subjectId, "chart-note", "그래프")}
      </div>
    </div>
  `;
}

function renderToolButton(
  subjectId: string,
  tool: PdfWorkspaceTool,
  selectedTool: PdfWorkspaceTool,
  label: string
): string {
  return `
    <button
      class="tool-button ${selectedTool === tool ? "active" : ""}"
      type="button"
      data-action="set-pdf-tool"
      data-subject-id="${subjectId}"
      data-tool="${tool}"
    >
      ${label}
    </button>
  `;
}

function renderStickyAddButton(
  subjectId: string,
  kind: StickyNoteBlockKind,
  label: string
): string {
  return `
    <button
      class="tool-button"
      type="button"
      data-action="add-sticky-note"
      data-subject-id="${subjectId}"
      data-block-kind="${kind}"
    >
      ${label}
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
      <div class="sticky-note-header">
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
        <a class="action-link" href="${subjectPdfWorkspacePath(subject)}">PDF에 필기하기</a>
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

function formatPdfTool(tool: PdfWorkspaceTool): string {
  const labels: Record<PdfWorkspaceTool, string> = {
    read: "읽기",
    sticky: "포스트잇",
    pen: "펜"
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
