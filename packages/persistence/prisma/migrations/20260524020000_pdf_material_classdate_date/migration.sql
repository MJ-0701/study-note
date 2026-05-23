-- sprint-W21-sprint-1 / S3 / AC12 — PdfMaterial.classDate VARCHAR → DATE.
--
-- 전제: 모든 기존 row 의 classDate 가 'YYYY-MM-DD' parseable.
-- prod 적용 전 검증 쿼리:
--   SELECT id, classDate FROM PdfMaterial
--   WHERE classDate NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
-- 결과 비어있어야 한다. 비어있지 않으면 row 수정 후 migration 적용.
--
-- MySQL MODIFY COLUMN VARCHAR → DATE 는 자동 STR_TO_DATE.
-- 'YYYY-MM-DD' format 은 정확히 DATE 로 변환됨 (strict mode).
-- index `@@index([ownerId, subjectId, classDate])` 는 MODIFY 후 유지됨.

ALTER TABLE `PdfMaterial`
  MODIFY COLUMN `classDate` DATE NOT NULL;
