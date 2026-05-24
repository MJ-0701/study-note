// sprint-W21-sprint-1 / S1 / AC2 + AC4 — Subject DTO.

import { z } from "zod";
import { titleSchema } from "../terms/terms.dto";

export const subjectCreateSchema = z
  .object({
    title: titleSchema
  })
  .strict();

// AC4 PUT = rename only (title). Subject move 는 S7 의 PUT /v1/subjects/:id/move 별도 endpoint.
export const subjectUpdateSchema = z
  .object({
    title: titleSchema
  })
  .strict();

// S7 AC32 — Subject move. .strict() 로 unknown field reject.
export const subjectMoveSchema = z
  .object({
    targetTermId: z.string().min(1).max(191)
  })
  .strict();

export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
export type SubjectMoveInput = z.infer<typeof subjectMoveSchema>;

export interface SubjectPublicResponse {
  id: string;
  title: string;
  termId: string | null;
  createdAt: string;
}

interface SubjectRow {
  id: string;
  title: string;
  termId: string | null;
  createdAt: Date;
}

export function toSubjectPublic(row: SubjectRow): SubjectPublicResponse {
  return {
    id: row.id,
    title: row.title,
    termId: row.termId,
    createdAt: row.createdAt.toISOString()
  };
}
