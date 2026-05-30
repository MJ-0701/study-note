// S3 (경량 CQRS): PdfAnnotation Command/Query service 가 공유하는 순수 헬퍼·상수·타입.
// CAS 의사결정/보상 로직은 Command service 에 유지하고, 여기에는 부작용 없는 공유물만 둔다.

import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PdfMaterialRepository } from "../materials/pdf-material.repository";

// payload size hard cap. 2026-05-28: 256KB → 4MB. annotation snapshot 은 material 의
// 전체 ink stroke 를 매 저장마다 PUT 하는 모델이라 필기가 쌓이면 256KB(=약 50획)를 쉽게
// 넘겨 413 으로 저장 실패 → 필기 소실. 페이로드는 R2 object storage 에 저장되므로 size 여유.
// (장기 fix = snapshot 대신 delta/압축 — bl-annotation-payload-growth backlog.)
export const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;
// sprint-W21-sprint-2/S2 (R7): batch response cap. 단일 cap 상향에 맞춰 batch 도 비례 상향.
export const BATCH_MAX_MATERIALS = 50;
export const BATCH_MAX_BYTES = 8 * 1024 * 1024;

/** canonical wire entry — plan §R2. */
export interface AnnotationEntry {
  payload: unknown;
  updatedAt: string;
}

/** canonical wire response (single / batch / 409 모두 같은 schema) — plan §R2. */
export interface AnnotationBatchResponse {
  annotations: Record<string, AnnotationEntry>;
  truncated: boolean;
  total: number;
  returned: number;
}

/** R2 key — `annotations/{userId}/material-{materialId}.json`. */
export function annotationKey(userId: string, materialId: string): string {
  return `annotations/${encodeURIComponent(userId)}/material-${encodeURIComponent(materialId)}.json`;
}

/** canonical schema 의 단일 entry 응답. */
export function singleEntryResponse(
  materialId: string,
  payload: unknown,
  savedAt: Date
): AnnotationBatchResponse {
  return {
    annotations: {
      [materialId]: { payload, updatedAt: savedAt.toISOString() }
    },
    truncated: false,
    total: 1,
    returned: 1
  };
}

/** canonical empty response — plan §R2 fail-closed. */
export function emptyResponse(): AnnotationBatchResponse {
  return { annotations: {}, truncated: false, total: 0, returned: 0 };
}

/** plan §R6: foreign / nonexistent material 모두 동일 404. */
export function throwMaterialNotFound(): never {
  throw new NotFoundException({
    errorCode: "MATERIAL_NOT_FOUND",
    errorMessage: "annotation target not accessible"
  });
}

/** plan §R4: clientRevision 형식 검증 + ISO 8601 Date 로 파싱. */
export function parseClientRevision(raw: string): Date {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({
      errorCode: "INVALID_REVISION",
      errorMessage: "clientRevision must be a valid ISO 8601 timestamp"
    });
  }
  return date;
}

/**
 * R6 material accessibility pre-check.
 * 본인 material 또는 master/admin uploader 의 shared material 이면 true.
 * = listMaterials 의 share 정책과 동일 (`OR: [{ownerId}, {uploaded master/admin}]`).
 * AnnotationSnapshot row 자체는 (currentUserId, materialId) composite 라 다른 user
 * annotation 노출 위험 X — 본 check 는 material accessibility 만 책임.
 */
export async function isMaterialAccessible(
  materialRepo: PdfMaterialRepository,
  ownerId: string,
  materialId: string
): Promise<boolean> {
  const row = await materialRepo.findAccessibleForUser(ownerId, materialId);
  return row !== null;
}
