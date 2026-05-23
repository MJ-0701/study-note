// sprint-W21-sprint-1 / S6 / AC25 + AC31 + ADR-12 — PdfStarMark payload
// validation (whole-reject).
//
// payload 안 starMarks 배열에 하나라도 invalid 가 있으면 전체 annotation save
// 를 400 reject (개별 drop 폐기 — audit 투명성). errorCode = INVALID_ANNOTATION_PAYLOAD.

import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const CUID = /^[a-z0-9]{1,128}$/;

export const starMarkSchema = z
  .object({
    id: z.string().regex(CUID, "id must be cuid-like"),
    pageNumber: z.number().int().min(1),
    xRatio: z.number().min(0).max(1),
    yRatio: z.number().min(0).max(1),
    sizeRatio: z.number().min(0.02).max(0.3),
    color: z.string().regex(HEX_COLOR, "color must be 6-digit hex (#rrggbb)"),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
  .strict();

export const starMarkArraySchema = z.array(starMarkSchema);

export function validateStarMarksInPayload(payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const starMarks = (payload as { starMarks?: unknown }).starMarks;
  if (starMarks === undefined || starMarks === null) return;
  if (!Array.isArray(starMarks)) {
    throw new Error("starMarks must be an array");
  }
  const result = starMarkArraySchema.safeParse(starMarks);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") || "starMarks";
    throw new Error(`starMark validation failed: ${path}: ${first?.message ?? "invalid"}`);
  }
}
