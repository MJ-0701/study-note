// PdfWorkspaceTool union.
// sprint-11 이전: "read" | "sticky" | "pen"
// sprint-12 확장: "eraser" | "text" | "checklist"
// sprint-13 reserved (실 기능 분리 예정): "table" | "chart"
//
// NOTE: main.ts 의 LocalPdfTool / isPdfWorkspaceTool 는 slice-2 에서 이 union 과 동기화.
export type PdfWorkspaceTool =
  | "read"
  | "sticky"
  | "pen"
  | "eraser"
  | "text"
  | "checklist";

export type StickyNoteBlockKind = "text" | "checklist" | "table" | "chart-note";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface PdfInkPoint extends NormalizedPoint {
  pressure?: number;
  t: number;
}

export interface PdfStickyNoteBlock {
  id: string;
  kind: StickyNoteBlockKind;
  content: string;
}

// NOTE: 기존 PdfStickyNote 는 pageNumber + anchor 를 사용.
// 신규 PdfTextBox / PdfChecklist 는 page + position 을 사용.
// 이 명명 불일치는 spec 설계 의도이며 slice-2 surface-layer 에서 reconcile.
export interface PdfStickyNote {
  id: string;
  pageNumber: number;
  anchor: NormalizedPoint;
  blocks: PdfStickyNoteBlock[];
  updatedAt: string;
  materialId?: string;
  ownerUserId?: string;
  page?: number;
  createdAt?: string;
}

export interface PdfInkStroke {
  id: string;
  pageNumber: number;
  color: string;
  width: number;
  points: PdfInkPoint[];
  createdAt: string;
  strokeId?: string;
}

// ---------------------------------------------------------------------------
// sprint-12 신규 annotation types
// ---------------------------------------------------------------------------

export interface PdfTextBox {
  id: string;
  subjectId: string;
  page: number;                             // 1-based PDF page
  position: { x: number; y: number };       // normalized 0..1
  size: { width: number; height: number };  // normalized 0..1
  content: string;                          // plain text (no HTML)
  createdAt: string;                        // ISO string
  updatedAt: string;
}

export interface PdfChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface PdfChecklist {
  id: string;
  subjectId: string;
  page: number;                          // 1-based PDF page
  position: { x: number; y: number };    // normalized 0..1
  // checklist size = content 기반 자동; fixed size 필드 없음
  items: PdfChecklistItem[];
  createdAt: string;                     // ISO string
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Existing types (unchanged)
// ---------------------------------------------------------------------------

export interface PdfMaterialRecord {
  id: string;
  ownerId: string;
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: string;
  storageKey: string;
  uploadStatus: "pending" | "uploaded";
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationSnapshotRecord {
  materialId: string;
  ownerId: string;
  schemaVersion: 1;
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
  savedAt: string;
}

export interface PdfMaterialDraft {
  id: string;
  backendMaterialId?: string;
  subjectId: string;
  classDate?: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType?: string;
  uploadStatus?: "local" | "pending" | "uploaded";
  selectedPage: number;
  selectedTool: PdfWorkspaceTool;
  uploadedAt: string;
  updatedAt?: string;
}

// SubjectPdfWorkspace: sprint-12 확장 — textBoxes + checklists 추가 (기존 sticky/ink BC).
export interface SubjectPdfWorkspace {
  subjectId: string;
  material?: PdfMaterialDraft;
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
  // sprint-12 신규 슬라이스
  textBoxes: PdfTextBox[];
  checklists: PdfChecklist[];
  updatedAt: string;
}

export interface PdfWorkspaceStore {
  workspaces: Record<string, SubjectPdfWorkspace>;
}

export const pdfWorkspaceStorageKey = "study-note.pdf-workspaces.v1";

export function createEmptyPdfWorkspace(subjectId: string): SubjectPdfWorkspace {
  return {
    subjectId,
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: [],
    updatedAt: new Date().toISOString()
  };
}

export function getSubjectPdfWorkspace(
  store: PdfWorkspaceStore,
  subjectId: string
): SubjectPdfWorkspace {
  return store.workspaces[subjectId] ?? createEmptyPdfWorkspace(subjectId);
}

export function normalizePdfPoint(x: number, y: number): NormalizedPoint {
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y))
  };
}

export function createPdfMaterialDraft(
  subjectId: string,
  fileName: string,
  fileSize: number,
  pageCount: number
): PdfMaterialDraft {
  return {
    id: `local-pdf-${subjectId}-${Date.now()}`,
    subjectId,
    fileName,
    fileSize,
    pageCount: Math.max(1, pageCount),
    contentType: "application/pdf",
    uploadStatus: "local",
    selectedPage: 1,
    selectedTool: "read",
    uploadedAt: new Date().toISOString()
  };
}

export interface BackendPdfMaterialInput {
  id: string;
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: string;
  uploadStatus: "pending" | "uploaded";
  createdAt: string;
  updatedAt: string;
}

export function createPdfMaterialFromBackend(
  material: BackendPdfMaterialInput,
  previous?: Pick<PdfMaterialDraft, "selectedPage" | "selectedTool">
): PdfMaterialDraft {
  return {
    id: material.id,
    backendMaterialId: material.id,
    subjectId: material.subjectId,
    classDate: material.classDate,
    fileName: material.fileName,
    fileSize: material.fileSize,
    pageCount: Math.max(1, material.pageCount),
    contentType: material.contentType,
    uploadStatus: material.uploadStatus,
    selectedPage: Math.min(
      Math.max(1, previous?.selectedPage ?? 1),
      Math.max(1, material.pageCount)
    ),
    selectedTool: previous?.selectedTool ?? "read",
    uploadedAt: material.createdAt,
    updatedAt: material.updatedAt
  };
}

export function createStickyNote(
  pageNumber: number,
  kind: StickyNoteBlockKind,
  anchor: NormalizedPoint
): PdfStickyNote {
  return {
    id: `note-${Date.now()}-${Math.round(anchor.x * 1000)}-${Math.round(anchor.y * 1000)}`,
    pageNumber,
    anchor,
    blocks: [
      {
        id: `block-${Date.now()}`,
        kind,
        content: getDefaultBlockContent(kind)
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

export function createInkStroke(
  pageNumber: number,
  points: PdfInkPoint[]
): PdfInkStroke {
  return {
    id: `stroke-${Date.now()}-${points.length}`,
    pageNumber,
    color: "#1a1a1a",
    width: 3,
    points,
    createdAt: new Date().toISOString()
  };
}

export function estimatePdfPageCount(buffer: ArrayBuffer): number {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const matches = text.match(/\/Type\s*\/Page\b/g);

  return Math.max(1, matches?.length ?? 1);
}

export function formatPdfFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function getDefaultBlockContent(kind: StickyNoteBlockKind): string {
  const defaults: Record<StickyNoteBlockKind, string> = {
    text: "핵심 메모를 적으세요.",
    checklist: "- 확인할 개념\n- 다시 풀 문제",
    table: "항목 | 내용\n정의 | \n예시 | ",
    "chart-note": "그래프/표 해석 포인트를 적으세요."
  };

  return defaults[kind];
}

// ---------------------------------------------------------------------------
// sprint-12 — PdfTextBox reducers (R3)
// Algorithm: O(1) immutable spread. content cap = 5000 chars (truncate).
// move: 범위 외 좌표 → normalizePdfPoint 로 clamp (0..1).
// ---------------------------------------------------------------------------

const TEXT_BOX_CONTENT_CAP = 5000;
const TEXT_BOX_DEFAULT_SIZE = { width: 0.2, height: 0.1 };

export function createTextBox(input: {
  subjectId: string;
  page: number;
  position: { x: number; y: number };
}): PdfTextBox {
  const now = new Date().toISOString();
  const rand = Math.floor(Math.random() * 10000);

  return {
    id: `textbox-${Date.now()}-${rand}`,
    subjectId: input.subjectId,
    page: input.page,
    position: normalizePdfPoint(input.position.x, input.position.y),
    size: { ...TEXT_BOX_DEFAULT_SIZE },
    content: "",
    createdAt: now,
    updatedAt: now
  };
}

export function updateTextBoxContent(
  textBox: PdfTextBox,
  content: string
): PdfTextBox {
  return {
    ...textBox,
    content: content.slice(0, TEXT_BOX_CONTENT_CAP),
    updatedAt: new Date().toISOString()
  };
}

export function moveTextBox(
  textBox: PdfTextBox,
  position: { x: number; y: number }
): PdfTextBox {
  return {
    ...textBox,
    position: normalizePdfPoint(position.x, position.y),
    updatedAt: new Date().toISOString()
  };
}

export function deleteTextBox(
  textBoxes: PdfTextBox[],
  id: string
): PdfTextBox[] {
  return textBoxes.filter((tb) => tb.id !== id);
}

// ---------------------------------------------------------------------------
// sprint-12 — PdfChecklist reducers (R4)
// Algorithm: O(N) immutable spread. label cap = 500 chars. items cap = 100.
// addChecklistItem: items 100 초과 시 no-op + console.warn (동작명 + count 만).
// moveChecklist: 범위 외 좌표 → normalizePdfPoint 로 clamp.
// ---------------------------------------------------------------------------

const CHECKLIST_ITEMS_CAP = 100;
const CHECKLIST_LABEL_CAP = 500;

export function createChecklist(input: {
  subjectId: string;
  page: number;
  position: { x: number; y: number };
}): PdfChecklist {
  const now = new Date().toISOString();
  const rand = Math.floor(Math.random() * 10000);
  const itemId = `clitem-${Date.now()}-0`;

  return {
    id: `checklist-${Date.now()}-${rand}`,
    subjectId: input.subjectId,
    page: input.page,
    position: normalizePdfPoint(input.position.x, input.position.y),
    items: [{ id: itemId, label: "", checked: false }],
    createdAt: now,
    updatedAt: now
  };
}

export function addChecklistItem(
  checklist: PdfChecklist,
  label?: string
): PdfChecklist {
  if (checklist.items.length >= CHECKLIST_ITEMS_CAP) {
    console.warn(
      "pdf-workspace: checklist items cap exceeded; ignoring add",
      { count: checklist.items.length, cap: CHECKLIST_ITEMS_CAP }
    );

    return checklist;
  }

  const itemId = `clitem-${Date.now()}-${checklist.items.length}`;
  const safeLabel = (label ?? "").slice(0, CHECKLIST_LABEL_CAP);

  return {
    ...checklist,
    items: [
      ...checklist.items,
      { id: itemId, label: safeLabel, checked: false }
    ],
    updatedAt: new Date().toISOString()
  };
}

export function toggleChecklistItem(
  checklist: PdfChecklist,
  itemId: string
): PdfChecklist {
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ),
    updatedAt: new Date().toISOString()
  };
}

export function updateChecklistItemLabel(
  checklist: PdfChecklist,
  itemId: string,
  label: string
): PdfChecklist {
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId
        ? { ...item, label: label.slice(0, CHECKLIST_LABEL_CAP) }
        : item
    ),
    updatedAt: new Date().toISOString()
  };
}

export function deleteChecklistItem(
  checklist: PdfChecklist,
  itemId: string
): PdfChecklist {
  return {
    ...checklist,
    items: checklist.items.filter((item) => item.id !== itemId),
    updatedAt: new Date().toISOString()
  };
}

export function moveChecklist(
  checklist: PdfChecklist,
  position: { x: number; y: number }
): PdfChecklist {
  return {
    ...checklist,
    position: normalizePdfPoint(position.x, position.y),
    updatedAt: new Date().toISOString()
  };
}

export function deleteChecklist(
  checklists: PdfChecklist[],
  id: string
): PdfChecklist[] {
  return checklists.filter((cl) => cl.id !== id);
}

// ---------------------------------------------------------------------------
// sprint-12 AC9-c — hydration fail-closed helper (R5)
//
// hydrateSubjectPdfWorkspace(raw): SubjectPdfWorkspace
//   - raw 가 object 아님 / null → createEmptyPdfWorkspace("<unknown>")
//   - 각 slice (stickyNotes, inkStrokes, textBoxes, checklists) 가 array 아님 → []
//   - 각 entry 검증:
//     textBox: position.x/y finite + 0..1, size.width/height finite + 0..1,
//              content string (cap 5000), id/subjectId/updatedAt/createdAt non-empty string,
//              page positive integer → 범위 외 entry skip.
//     checklist: position.x/y finite + 0..1, items array (cap 100 truncate),
//                items[].label string (cap 500), items[].checked boolean coercion.
//     stickyNotes / inkStrokes: array 이면 그대로 pass-through (기존 BC; corrupt 시 drop).
//   - 1개 항목 corrupt = 해당 entry skip, 나머지 보존 (전체 wipe X).
//
// slice-2 에서 main.ts 의 loadPdfWorkspaceStore 가 이 helper 를 호출하도록 통합.
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isFiniteNormalized(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

function isPositiveInteger(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

function validateTextBox(raw: unknown): PdfTextBox | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }

  const r = raw as Record<string, unknown>;

  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.subjectId) ||
    !isPositiveInteger(r.page) ||
    !isNonEmptyString(r.createdAt) ||
    !isNonEmptyString(r.updatedAt)
  ) {
    return null;
  }

  if (r.position === null || typeof r.position !== "object") {
    return null;
  }

  const pos = r.position as Record<string, unknown>;

  if (!isFiniteNormalized(pos.x) || !isFiniteNormalized(pos.y)) {
    return null;
  }

  if (r.size === null || typeof r.size !== "object") {
    return null;
  }

  const size = r.size as Record<string, unknown>;

  if (!isFiniteNormalized(size.width) || !isFiniteNormalized(size.height)) {
    return null;
  }

  const content = typeof r.content === "string"
    ? r.content.slice(0, TEXT_BOX_CONTENT_CAP)
    : "";

  return {
    id: r.id,
    subjectId: r.subjectId,
    page: r.page,
    position: { x: pos.x, y: pos.y },
    size: { width: size.width, height: size.height },
    content,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

function validateChecklistItem(raw: unknown): PdfChecklistItem | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }

  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) {
    return null;
  }

  const label = typeof r.label === "string"
    ? r.label.slice(0, CHECKLIST_LABEL_CAP)
    : "";

  // boolean coercion: === true のみ true, 이외 false
  const checked = r.checked === true;

  return { id: r.id, label, checked };
}

function validateChecklist(raw: unknown): PdfChecklist | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }

  const r = raw as Record<string, unknown>;

  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.subjectId) ||
    !isPositiveInteger(r.page) ||
    !isNonEmptyString(r.createdAt) ||
    !isNonEmptyString(r.updatedAt)
  ) {
    return null;
  }

  if (r.position === null || typeof r.position !== "object") {
    return null;
  }

  const pos = r.position as Record<string, unknown>;

  if (!isFiniteNormalized(pos.x) || !isFiniteNormalized(pos.y)) {
    return null;
  }

  const rawItems = Array.isArray(r.items) ? r.items : [];
  // items 길이 cap 100 (초과분 truncate)
  const truncated = rawItems.slice(0, CHECKLIST_ITEMS_CAP);
  const items: PdfChecklistItem[] = truncated
    .map(validateChecklistItem)
    .filter((item): item is PdfChecklistItem => item !== null);

  return {
    id: r.id,
    subjectId: r.subjectId,
    page: r.page,
    position: { x: pos.x, y: pos.y },
    items,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

export function hydrateSubjectPdfWorkspace(raw: unknown): SubjectPdfWorkspace {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return createEmptyPdfWorkspace("<unknown>");
  }

  const r = raw as Record<string, unknown>;
  const subjectId =
    typeof r.subjectId === "string" ? r.subjectId : "<unknown>";

  // 기존 슬라이스 (stickyNotes / inkStrokes): array 이면 그대로 pass-through (BC).
  // corrupt entry 는 downstream 에서 처리; slice-1 은 array 보장만.
  const stickyNotes: PdfStickyNote[] = Array.isArray(r.stickyNotes)
    ? (r.stickyNotes as PdfStickyNote[])
    : [];

  const inkStrokes: PdfInkStroke[] = Array.isArray(r.inkStrokes)
    ? (r.inkStrokes as PdfInkStroke[])
    : [];

  // 신규 슬라이스: 각 entry 검증 + corrupt → skip
  const textBoxes: PdfTextBox[] = Array.isArray(r.textBoxes)
    ? r.textBoxes
        .map(validateTextBox)
        .filter((tb): tb is PdfTextBox => tb !== null)
    : [];

  const checklists: PdfChecklist[] = Array.isArray(r.checklists)
    ? r.checklists
        .map(validateChecklist)
        .filter((cl): cl is PdfChecklist => cl !== null)
    : [];

  const material = r.material as PdfMaterialDraft | undefined;
  const updatedAt =
    typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString();

  return {
    subjectId,
    material,
    stickyNotes,
    inkStrokes,
    textBoxes,
    checklists,
    updatedAt
  };
}
