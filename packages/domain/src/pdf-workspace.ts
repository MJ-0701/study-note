// PdfWorkspaceTool union.
// sprint-11 이전: "read" | "sticky" | "pen"
// sprint-12 확장: "eraser" | "text" | "checklist"
// sprint-13 확장: "table" | "chart"
//
// NOTE: main.ts 의 LocalPdfTool / isPdfWorkspaceTool 는 slice-2 에서 이 union 과 동기화.
export type PdfWorkspaceTool =
  | "read"
  | "sticky"
  | "pen"
  | "eraser"
  | "text"
  | "checklist"
  | "table"
  | "chart"
  // sprint-W21-sprint-1 / S6 — 별표 마스킹 widget.
  | "star";

export function isPdfWorkspaceTool(tool: unknown): tool is PdfWorkspaceTool {
  return (
    tool === "read" ||
    tool === "sticky" ||
    tool === "pen" ||
    tool === "eraser" ||
    tool === "text" ||
    tool === "checklist" ||
    tool === "table" ||
    tool === "chart" ||
    tool === "star"
  );
}

export type PdfEraserShape = "circle" | "square" | "triangle" | "line";

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

// sprint-W21-sprint-1 / S6 / AC25-AC31 — 별표 (★) masking widget.
// PDF annotation surface 의 임의 위치에 별표 stamp. drag-resize 로 크기 조절.
// per plan ADR-7 — persistence = AnnotationSnapshot.payload JSON collection
// (별도 table 없음). Round 5 P1-C: hex color strict. Round 6 P1 (ADR-12):
// payload 안 starMark 1개라도 invalid 면 전체 annotation save 400 whole-reject
// (개별 drop 폐기, audit 투명성).
export interface PdfStarMark {
  id: string;                               // cuid
  pageNumber: number;                       // 1-based PDF page
  xRatio: number;                           // 0..1 (page width)
  yRatio: number;                           // 0..1 (page height)
  sizeRatio: number;                        // 0.02..0.3 (page width 기준)
  color: string;                            // hex strict /^#[0-9a-fA-F]{6}$/
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
  collapsed: boolean;                    // R11: default true (접힘 = PDF 본문 가림 최소화)
  createdAt: string;                     // ISO string
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// sprint-13 신규 annotation types
// ---------------------------------------------------------------------------

export interface PdfTable {
  id: string;
  subjectId: string;
  page: number;                          // 1-based PDF page
  position: { x: number; y: number };    // normalized 0..1
  content: string;                       // markdown table source
  collapsed: boolean;                    // default true
  createdAt: string;                     // ISO string
  updatedAt: string;
}

export type PdfChartType = "sparkline";

export interface PdfChart {
  id: string;
  subjectId: string;
  page: number;                          // 1-based PDF page
  position: { x: number; y: number };    // normalized 0..1
  content: string;                       // CSV source
  chartType: PdfChartType;
  collapsed: boolean;                    // default true
  createdAt: string;                     // ISO string
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Existing types (unchanged)
// ---------------------------------------------------------------------------

export interface PdfMaterialRecord {
  id: string;
  /** @deprecated Use uploaderId. ownerId remains an uploader/audit alias. */
  ownerId: string;
  uploaderId: string;
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
  uploaderId?: string;
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

// SubjectPdfWorkspace: sprint-13 확장 — tables + charts 추가 (기존 sticky/ink/text/checklist BC).
export interface SubjectPdfWorkspace {
  subjectId: string;
  material?: PdfMaterialDraft;
  materials: PdfMaterialDraft[];
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
  eraserShape: PdfEraserShape;
  eraserSize: number;
  // sprint-12 신규 슬라이스
  textBoxes: PdfTextBox[];
  checklists: PdfChecklist[];
  // sprint-13 신규 슬라이스
  tables: PdfTable[];
  charts: PdfChart[];
  // sprint-W21-sprint-1 / S6 — 별표 masking widget.
  starMarks: PdfStarMark[];
  updatedAt: string;
}

export interface PdfWorkspaceStore {
  workspaces: Record<string, SubjectPdfWorkspace>;
}

export const pdfWorkspaceStorageKey = "study-note.pdf-workspaces.v1";
const DEFAULT_ERASER_SHAPE: PdfEraserShape = "circle";
const DEFAULT_ERASER_SIZE = 16;
const MIN_ERASER_SIZE = 16;
const MAX_ERASER_SIZE = 64;

export function createEmptyPdfWorkspace(subjectId: string): SubjectPdfWorkspace {
  return {
    subjectId,
    materials: [],
    stickyNotes: [],
    inkStrokes: [],
    eraserShape: DEFAULT_ERASER_SHAPE,
    eraserSize: DEFAULT_ERASER_SIZE,
    textBoxes: [],
    checklists: [],
    tables: [],
    charts: [],
    starMarks: [],
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
  uploaderId?: string;
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
    uploaderId: material.uploaderId,
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

// DDD audit F-5 partial mitigation: optional `at` 가 주입되면 Date.now() 우회 →
// reducer 가 deterministic 해진다 (테스트 / replay). 미주입 = 기존 동작 (backward
// compat). id 와 updatedAt 가 동일 ts 를 공유하도록 단일 capture.
export function createStickyNote(
  pageNumber: number,
  kind: StickyNoteBlockKind,
  anchor: NormalizedPoint,
  at?: number
): PdfStickyNote {
  const t = at ?? Date.now();
  return {
    id: `note-${t}-${Math.round(anchor.x * 1000)}-${Math.round(anchor.y * 1000)}`,
    pageNumber,
    anchor,
    blocks: [
      {
        id: `block-${t}`,
        kind,
        content: getDefaultBlockContent(kind)
      }
    ],
    updatedAt: new Date(t).toISOString()
  };
}

export function createInkStroke(
  pageNumber: number,
  points: PdfInkPoint[],
  at?: number
): PdfInkStroke {
  const t = at ?? Date.now();
  return {
    id: `stroke-${t}-${points.length}`,
    pageNumber,
    color: "#1a1a1a",
    width: 3,
    points,
    createdAt: new Date(t).toISOString()
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
  at?: number;
}): PdfTextBox {
  const t = input.at ?? Date.now();
  const iso = new Date(t).toISOString();
  const normalizedPosition = normalizePdfPoint(input.position.x, input.position.y);
  // Codex PR #87 P2 round-4: 0..1000 grid rounding 이 sub-grid distinct position
  // 충돌 (e.g. {0.1001, 0.2} vs {0.1002, 0.2} 같은 id). 6 decimal precision
  // (sub-micron) 으로 보존. at 미주입 시 random fallback (backward compat).
  const id =
    input.at !== undefined
      ? `textbox-${t}-${normalizedPosition.x.toFixed(6)}-${normalizedPosition.y.toFixed(6)}`
      : `textbox-${t}-${Math.floor(Math.random() * 10_000)}`;

  return {
    id,
    subjectId: input.subjectId,
    page: input.page,
    position: normalizedPosition,
    size: { ...TEXT_BOX_DEFAULT_SIZE },
    content: "",
    createdAt: iso,
    updatedAt: iso
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
// addChecklistItem: items 100 초과 시 no-op (Result-pure, side-effect 없음).
// 이전 console.warn 제거 (DDD audit F-13) — domain pure. 호출자가 cap 처리
// 필요하면 length 비교로 사전 판정.
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
    collapsed: true, // R11: 기본 접힘 (PDF 본문 가림 최소화)
    createdAt: now,
    updatedAt: now
  };
}

// ---------------------------------------------------------------------------
// R11 — toggleChecklistCollapsed reducer
// Algorithm: O(1) immutable spread. collapsed 반전.
// ---------------------------------------------------------------------------
export function toggleChecklistCollapsed(checklist: PdfChecklist): PdfChecklist {
  return {
    ...checklist,
    collapsed: !checklist.collapsed,
    updatedAt: new Date().toISOString()
  };
}

export function addChecklistItem(
  checklist: PdfChecklist,
  label?: string
): PdfChecklist {
  if (checklist.items.length >= CHECKLIST_ITEMS_CAP) {
    // DDD audit F-13: console.warn 제거 (domain pure). cap 초과 = silent no-op.
    // 호출자가 reporting 필요하면 length 비교로 사전 판정 + UI feedback.
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
// sprint-13 — PdfTable reducers (R2)
// Algorithm: O(1) immutable spread. content cap = 10000 chars (truncate).
// move: 범위 외 좌표 → normalizePdfPoint 로 clamp (0..1).
// ---------------------------------------------------------------------------

const TABLE_CONTENT_CAP = 10000;

function randomFourHex(): string {
  return Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, "0");
}

export function createTable(input: {
  subjectId: string;
  page: number;
  position: { x: number; y: number };
}): PdfTable {
  const now = new Date().toISOString();

  return {
    id: `table-${Date.now()}-${randomFourHex()}`,
    subjectId: input.subjectId,
    page: input.page,
    position: normalizePdfPoint(input.position.x, input.position.y),
    content: "",
    collapsed: true,
    createdAt: now,
    updatedAt: now
  };
}

export function updateTableContent(
  table: PdfTable,
  content: string
): PdfTable {
  return {
    ...table,
    content: content.slice(0, TABLE_CONTENT_CAP),
    updatedAt: new Date().toISOString()
  };
}

export function moveTable(
  table: PdfTable,
  position: { x: number; y: number }
): PdfTable {
  return {
    ...table,
    position: normalizePdfPoint(position.x, position.y),
    updatedAt: new Date().toISOString()
  };
}

export function deleteTable(
  tables: PdfTable[],
  id: string
): PdfTable[] {
  return tables.filter((table) => table.id !== id);
}

export function toggleTableCollapsed(table: PdfTable): PdfTable {
  return {
    ...table,
    collapsed: !table.collapsed,
    updatedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// sprint-13 — PdfChart reducers (R3)
// Algorithm: O(1) immutable spread. content cap = 5000 chars (truncate).
// move: 범위 외 좌표 → normalizePdfPoint 로 clamp (0..1).
// ---------------------------------------------------------------------------

const CHART_CONTENT_CAP = 5000;
const DEFAULT_CHART_TYPE: PdfChartType = "sparkline";

export function createChart(input: {
  subjectId: string;
  page: number;
  position: { x: number; y: number };
}): PdfChart {
  const now = new Date().toISOString();

  return {
    id: `chart-${Date.now()}-${randomFourHex()}`,
    subjectId: input.subjectId,
    page: input.page,
    position: normalizePdfPoint(input.position.x, input.position.y),
    content: "",
    chartType: DEFAULT_CHART_TYPE,
    collapsed: true,
    createdAt: now,
    updatedAt: now
  };
}

export function updateChartContent(
  chart: PdfChart,
  content: string
): PdfChart {
  return {
    ...chart,
    content: content.slice(0, CHART_CONTENT_CAP),
    updatedAt: new Date().toISOString()
  };
}

export function moveChart(
  chart: PdfChart,
  position: { x: number; y: number }
): PdfChart {
  return {
    ...chart,
    position: normalizePdfPoint(position.x, position.y),
    updatedAt: new Date().toISOString()
  };
}

export function deleteChart(
  charts: PdfChart[],
  id: string
): PdfChart[] {
  return charts.filter((chart) => chart.id !== id);
}

export function toggleChartCollapsed(chart: PdfChart): PdfChart {
  return {
    ...chart,
    collapsed: !chart.collapsed,
    updatedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// sprint-12/slice-4 — Eraser widget reducers
// ---------------------------------------------------------------------------

function normalizeEraserShape(shape: unknown): PdfEraserShape {
  return shape === "square" ||
    shape === "triangle" ||
    shape === "line" ||
    shape === "circle"
    ? shape
    : DEFAULT_ERASER_SHAPE;
}

function normalizeEraserSize(size: unknown): number {
  if (typeof size !== "number" || !Number.isFinite(size)) {
    return DEFAULT_ERASER_SIZE;
  }

  return Math.min(MAX_ERASER_SIZE, Math.max(MIN_ERASER_SIZE, size));
}

export function setEraserShape(
  workspace: SubjectPdfWorkspace,
  shape: PdfEraserShape
): SubjectPdfWorkspace {
  return {
    ...workspace,
    eraserShape: normalizeEraserShape(shape),
    updatedAt: new Date().toISOString()
  };
}

export function setEraserSize(
  workspace: SubjectPdfWorkspace,
  size: number
): SubjectPdfWorkspace {
  return {
    ...workspace,
    eraserSize: normalizeEraserSize(size),
    updatedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// sprint-12/13 AC9-c — hydration fail-closed helper (R5)
//
// hydrateSubjectPdfWorkspace(raw): SubjectPdfWorkspace
//   - raw 가 object 아님 / null → createEmptyPdfWorkspace("<unknown>")
//   - 각 slice (stickyNotes, inkStrokes, textBoxes, checklists, tables, charts) 가 array 아님 → []
//   - 각 entry 검증:
//     textBox: position.x/y finite + 0..1, size.width/height finite + 0..1,
//              content string (cap 5000), id/subjectId/updatedAt/createdAt non-empty string,
//              page positive integer → 범위 외 entry skip.
//     checklist: position.x/y finite + 0..1, items array (cap 100 truncate),
//                items[].label string (cap 500), items[].checked boolean coercion.
//     table/chart: position.x/y finite + 0..1, content string (cap 10000/5000),
//                  collapsed === false 만 false, chartType enum 외 sparkline default.
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

  // R11: collapsed hydration — boolean coercion (=== true 만 true). 누락 시 default true.
  const collapsed = r.collapsed === false ? false : true;

  return {
    id: r.id,
    subjectId: r.subjectId,
    page: r.page,
    position: { x: pos.x, y: pos.y },
    items,
    collapsed,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

function validateTable(raw: unknown): PdfTable | null {
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

  if (typeof r.content !== "string") {
    return null;
  }

  return {
    id: r.id,
    subjectId: r.subjectId,
    page: r.page,
    position: { x: pos.x, y: pos.y },
    content: r.content.slice(0, TABLE_CONTENT_CAP),
    collapsed: r.collapsed === false ? false : true,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

function normalizeChartType(chartType: unknown): PdfChartType {
  return chartType === "sparkline" ? chartType : DEFAULT_CHART_TYPE;
}

function validateChart(raw: unknown): PdfChart | null {
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

  if (typeof r.content !== "string") {
    return null;
  }

  return {
    id: r.id,
    subjectId: r.subjectId,
    page: r.page,
    position: { x: pos.x, y: pos.y },
    content: r.content.slice(0, CHART_CONTENT_CAP),
    chartType: normalizeChartType(r.chartType),
    collapsed: r.collapsed === false ? false : true,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

function validatePdfMaterialDraft(raw: unknown): PdfMaterialDraft | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }

  const r = raw as Record<string, unknown>;

  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.subjectId) ||
    !isNonEmptyString(r.fileName) ||
    typeof r.fileSize !== "number" ||
    !Number.isFinite(r.fileSize) ||
    typeof r.pageCount !== "number" ||
    !Number.isFinite(r.pageCount) ||
    !isNonEmptyString(r.uploadedAt)
  ) {
    return null;
  }

  return {
    id: r.id,
    backendMaterialId: typeof r.backendMaterialId === "string" ? r.backendMaterialId : undefined,
    uploaderId: typeof r.uploaderId === "string" ? r.uploaderId : undefined,
    subjectId: r.subjectId,
    classDate: typeof r.classDate === "string" ? r.classDate : undefined,
    fileName: r.fileName,
    fileSize: Math.max(0, Math.trunc(r.fileSize)),
    pageCount: Math.max(1, Math.trunc(r.pageCount)),
    contentType: typeof r.contentType === "string" ? r.contentType : undefined,
    uploadStatus:
      r.uploadStatus === "local" ||
      r.uploadStatus === "pending" ||
      r.uploadStatus === "uploaded"
        ? r.uploadStatus
        : undefined,
    selectedPage:
      typeof r.selectedPage === "number" && Number.isFinite(r.selectedPage)
        ? Math.max(1, Math.trunc(r.selectedPage))
        : 1,
    selectedTool: isPdfWorkspaceTool(r.selectedTool) ? r.selectedTool : "read",
    uploadedAt: r.uploadedAt,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined
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

  const tables: PdfTable[] = Array.isArray(r.tables)
    ? r.tables
        .map(validateTable)
        .filter((table): table is PdfTable => table !== null)
    : [];

  const charts: PdfChart[] = Array.isArray(r.charts)
    ? r.charts
        .map(validateChart)
        .filter((chart): chart is PdfChart => chart !== null)
    : [];

  // sprint-W21-sprint-1 / S6 — starMarks. validateStarMark 가 invalid 면 skip.
  // BC: 기존 serialized payload 에 starMarks 없으면 빈 배열.
  const starMarks: PdfStarMark[] = Array.isArray(r.starMarks)
    ? r.starMarks
        .map(validateStarMark)
        .filter((sm): sm is PdfStarMark => sm !== null)
    : [];

  const material = validatePdfMaterialDraft(r.material);
  const materials: PdfMaterialDraft[] = Array.isArray(r.materials)
    ? r.materials
        .map(validatePdfMaterialDraft)
        .filter((item): item is PdfMaterialDraft => item !== null)
    : material
      ? [material]
      : [];
  const updatedAt =
    typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString();

  return {
    subjectId,
    material: material ?? materials[0],
    materials,
    stickyNotes,
    inkStrokes,
    eraserShape: normalizeEraserShape(r.eraserShape),
    eraserSize: normalizeEraserSize(r.eraserSize),
    textBoxes,
    checklists,
    tables,
    charts,
    starMarks,
    updatedAt
  };
}

// sprint-W21-sprint-1 / S6 — defensive validator (hex color + ratio range).
// BE 가 whole-reject 하지만 client 에서도 individual drop fallback (corrupt persisted
// payload 안전성).
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
function validateStarMark(raw: unknown): PdfStarMark | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" || r.id.length === 0 ||
    typeof r.pageNumber !== "number" || !Number.isInteger(r.pageNumber) || r.pageNumber < 1 ||
    typeof r.xRatio !== "number" || r.xRatio < 0 || r.xRatio > 1 ||
    typeof r.yRatio !== "number" || r.yRatio < 0 || r.yRatio > 1 ||
    typeof r.sizeRatio !== "number" || r.sizeRatio < 0.02 || r.sizeRatio > 0.3 ||
    typeof r.color !== "string" || !HEX_COLOR_RE.test(r.color) ||
    typeof r.createdAt !== "string" || typeof r.updatedAt !== "string"
  ) {
    return null;
  }
  return {
    id: r.id,
    pageNumber: r.pageNumber,
    xRatio: r.xRatio,
    yRatio: r.yRatio,
    sizeRatio: r.sizeRatio,
    color: r.color,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}
