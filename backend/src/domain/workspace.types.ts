export interface UserProfile {
  id: string;
  displayName: string;
  studentNumber: string;
  email?: string;
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

export interface PdfStickyNoteBlock {
  id: string;
  kind: "text" | "checklist" | "table" | "chart-note";
  content: string;
}

export interface PdfStickyNote {
  id: string;
  pageNumber: number;
  anchor: {
    x: number;
    y: number;
  };
  blocks: PdfStickyNoteBlock[];
  updatedAt: string;
}

export interface PdfInkPoint {
  x: number;
  y: number;
  pressure?: number;
  t: number;
}

export interface PdfInkStroke {
  id: string;
  pageNumber: number;
  color: string;
  width: number;
  points: PdfInkPoint[];
  createdAt: string;
}

export interface AnnotationSnapshotRecord {
  materialId: string;
  ownerId: string;
  schemaVersion: 1;
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
  savedAt: string;
}
