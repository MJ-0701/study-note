export type PdfWorkspaceTool = "read" | "sticky" | "pen";
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

export interface SubjectPdfWorkspace {
  subjectId: string;
  material?: PdfMaterialDraft;
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
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
