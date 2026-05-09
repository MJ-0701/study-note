import type {
  AnnotationSnapshot,
  PdfMaterial,
  Prisma,
  User
} from "@prisma/client";
import type {
  AnnotationSnapshotRecord,
  PdfInkStroke,
  PdfMaterialRecord,
  PdfStickyNote,
  UserProfile
} from "@study-note/domain";

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    studentNumber: user.studentNumber,
    ...(user.email ? { email: user.email } : {})
  };
}

export function toPdfMaterialRecord(material: PdfMaterial): PdfMaterialRecord {
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
  snapshot: AnnotationSnapshot
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
}): Prisma.InputJsonObject {
  return {
    stickyNotes: input.stickyNotes as unknown as Prisma.InputJsonArray,
    inkStrokes: input.inkStrokes as unknown as Prisma.InputJsonArray
  };
}

function readAnnotationPayload(value: Prisma.JsonValue): {
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
