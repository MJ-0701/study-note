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
  // sanitizeWeekNoteImportPayload(cleanText) 가 id 앞뒤 공백을 trim 하므로, validate(=sanitize 이전)
  // 단계의 참조 비교도 trim 정규화해야 importer 가 정리할 수 있는 payload 를 오탐 reject 하지 않음
  // (Codex PR #114 P2). cleanText 의 HTML escape 는 양쪽 id 에 동일 적용돼 매칭에 영향 없어 trim 만으로 충분.
  const conceptIds = new Set(payload.concepts.map((concept) => concept.id.trim()));
  const keywordIds = new Set(payload.requiredKeywords.map((keyword) => keyword.id.trim()));

  for (const keyword of payload.requiredKeywords) {
    for (const conceptId of keyword.conceptIds) {
      if (!conceptIds.has(conceptId.trim())) {
        errors.push(
          `requiredKeywords["${keyword.id.trim()}"].conceptIds references unknown concept "${conceptId.trim()}".`
        );
      }
    }
  }

  for (const concept of payload.concepts) {
    for (const keywordId of concept.relatedKeywordIds) {
      if (!keywordIds.has(keywordId.trim())) {
        errors.push(
          `concepts["${concept.id.trim()}"].relatedKeywordIds references unknown keyword "${keywordId.trim()}".`
        );
      }
    }
  }

  return errors;
}
