// WeekNote import payload 내부 참조 일관성 invariant (DDD F-12).
// 무런타임-의존 self-contained 모듈 — WeekNoteImportPayload 는 type-only import (런타임 로드 없음).
import type { WeekNoteImportPayload } from "./lecture-note-import";

/**
 * import payload 내부 Concept ↔ Keyword 참조 일관성 검증.
 * 자기완결 v1 번들이므로 keyword.conceptIds / concept.relatedKeywordIds 는 같은 payload 안의
 * concept/keyword id 를 가리켜야 한다. 병합 notebook 의 tolerant 경고(getIntegrityWarnings)와 달리,
 * import 단계의 dangling ref = malformed payload 로 보고 reject 한다.
 * 입력은 shape 검증을 통과한 payload 라고 가정 (validateWeekNoteImportPayload 내부 호출).
 */
export function validateWeekNoteImportReferences(
  payload: WeekNoteImportPayload
): string[] {
  const errors: string[] = [];
  const conceptIds = new Set(payload.concepts.map((concept) => concept.id));
  const keywordIds = new Set(payload.requiredKeywords.map((keyword) => keyword.id));

  for (const keyword of payload.requiredKeywords) {
    for (const conceptId of keyword.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        errors.push(
          `requiredKeywords["${keyword.id}"].conceptIds references unknown concept "${conceptId}".`
        );
      }
    }
  }

  for (const concept of payload.concepts) {
    for (const keywordId of concept.relatedKeywordIds) {
      if (!keywordIds.has(keywordId)) {
        errors.push(
          `concepts["${concept.id}"].relatedKeywordIds references unknown keyword "${keywordId}".`
        );
      }
    }
  }

  return errors;
}
