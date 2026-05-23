// sprint-W21-sprint-1 / S1 / AC1 + AC1b + AC3 — Term DTO (Zod 4 strict)
//
// CLAUDE.md DTO: 1 file = 1 DTO 가족. Zod schema 가 .strict() (unknown reject)
// + control char/DEL reject + canonical date reparse + startDate<=endDate refine.

import { z } from "zod";

const CONTROL_CHAR_REGEX = /^[^\x00-\x1F\x7F]+$/u;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "title is required")
  .max(40, "title must be 40 chars or fewer")
  .regex(CONTROL_CHAR_REGEX, "title must not contain control characters or DEL");

export const dateSchema = z
  .string()
  .regex(ISO_DATE_REGEX, "date must be YYYY-MM-DD")
  .transform((value, ctx) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: "custom", message: "invalid date" });
      return z.NEVER;
    }
    const canonical = parsed.toISOString().slice(0, 10);
    if (canonical !== value) {
      ctx.addIssue({ code: "custom", message: "calendar overflow (non-canonical date)" });
      return z.NEVER;
    }
    return parsed;
  });

const startEndRefine = (data: { startDate?: Date | null; endDate?: Date | null }): boolean => {
  if (!data.startDate || !data.endDate) return true;
  return data.startDate.getTime() <= data.endDate.getTime();
};

export const termCreateSchema = z
  .object({
    grade: z.number().int().min(1).max(4),
    semester: z.number().int().min(1).max(2),
    title: titleSchema,
    startDate: dateSchema.nullish(),
    endDate: dateSchema.nullish()
  })
  .strict()
  .refine(startEndRefine, {
    message: "endDate must be on or after startDate",
    path: ["endDate"]
  });

// Update 는 schema-level refine 으로 startDate<=endDate 보장 불가능 — 부분 update
// 가 기존 DB row 와 결합되어야 invariant 검증 가능. service.update 가 merged
// (before + input) date pair 를 다시 검증한다. (Codex Round-2 P1 fix)
export const termUpdateSchema = z
  .object({
    grade: z.number().int().min(1).max(4).optional(),
    semester: z.number().int().min(1).max(2).optional(),
    title: titleSchema.optional(),
    startDate: dateSchema.nullish(),
    endDate: dateSchema.nullish()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field is required"
  });

export type TermCreateInput = z.infer<typeof termCreateSchema>;
export type TermUpdateInput = z.infer<typeof termUpdateSchema>;

export interface TermPublicResponse {
  id: string;
  grade: number;
  semester: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface TermAdminResponse extends TermPublicResponse {
  createdById: string;
  updatedAt: string;
}

interface TermRow {
  id: string;
  grade: number;
  semester: number;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

function dateToIsoDay(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function toTermPublic(row: TermRow): TermPublicResponse {
  return {
    id: row.id,
    grade: row.grade,
    semester: row.semester,
    title: row.title,
    startDate: dateToIsoDay(row.startDate),
    endDate: dateToIsoDay(row.endDate),
    createdAt: row.createdAt.toISOString()
  };
}

export function toTermAdmin(row: TermRow): TermAdminResponse {
  return {
    ...toTermPublic(row),
    createdById: row.createdById,
    updatedAt: row.updatedAt.toISOString()
  };
}
