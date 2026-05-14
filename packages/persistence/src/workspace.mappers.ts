import { Prisma } from "@prisma/client";
import type {
  AnnotationSnapshotRecord,
  PdfInkStroke,
  PdfMaterialRecord,
  PdfStickyNote,
  UserProfile
} from "@study-note/domain";

type UserRow = {
  id: string;
  displayName: string;
  studentNumber: string;
  email: string | null;
  role: "NORMAL" | "ADMIN" | "MASTER";
};

type PdfMaterialRow = {
  id: string;
  ownerId: string;
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: string;
  storageKey: string;
  uploadStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

type AnnotationSnapshotRow = {
  materialId: string;
  ownerId: string;
  payload: unknown;
  savedAt: Date;
};

export function toUserProfile(user: UserRow): UserProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    studentNumber: user.studentNumber,
    ...(user.email ? { email: user.email } : {}),
    role: normalizeUserRole(user.role)
  };
}

function normalizeUserRole(role: UserRow["role"]): UserProfile["role"] {
  return role.toLowerCase() as UserProfile["role"];
}

export function toPdfMaterialRecord(material: PdfMaterialRow): PdfMaterialRecord {
  return {
    id: material.id,
    ownerId: material.ownerId,
    subjectId: material.subjectId,
    classDate: material.classDate,
    fileName: material.fileName,
    fileSize: material.fileSize,
    pageCount: material.pageCount,
    contentType: material.contentType,
    storageKey: material.storageKey,
    uploadStatus: readUploadStatus(material.uploadStatus),
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString()
  };
}

export function toAnnotationSnapshotRecord(
  snapshot: AnnotationSnapshotRow
): AnnotationSnapshotRecord {
  const payload = readAnnotationPayload(snapshot.payload);

  return {
    materialId: snapshot.materialId,
    ownerId: snapshot.ownerId,
    schemaVersion: 1,
    stickyNotes: payload.stickyNotes,
    inkStrokes: payload.inkStrokes,
    savedAt: snapshot.savedAt.toISOString()
  };
}

export function toAnnotationPayload(input: {
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
}): Prisma.InputJsonValue {
  return {
    stickyNotes: input.stickyNotes as unknown as Prisma.InputJsonArray,
    inkStrokes: input.inkStrokes as unknown as Prisma.InputJsonArray
  };
}

function readAnnotationPayload(value: unknown): {
  stickyNotes: PdfStickyNote[];
  inkStrokes: PdfInkStroke[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { stickyNotes: [], inkStrokes: [] };
  }

  const record = value as Record<string, unknown>;

  return {
    stickyNotes: Array.isArray(record.stickyNotes)
      ? (record.stickyNotes as PdfStickyNote[])
      : [],
    inkStrokes: Array.isArray(record.inkStrokes)
      ? (record.inkStrokes as PdfInkStroke[])
      : []
  };
}

function readUploadStatus(value: string): "pending" | "uploaded" {
  return value === "uploaded" ? "uploaded" : "pending";
}
