-- sprint-W21-sprint-1 / S3 / AC12 — PdfMaterial.classDate VARCHAR → DATE.
--
-- 전제: 모든 기존 row 의 classDate 가 'YYYY-MM-DD' parseable + 유효한 calendar date.
-- prod 적용 전 검증 쿼리 (Codex PR #51 P1 hardening):
--   -- (1) shape check
--   SELECT id, classDate FROM PdfMaterial
--   WHERE classDate NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
--   -- (2) calendar overflow check (e.g., '2026-02-30')
--   SELECT id, classDate FROM PdfMaterial
--   WHERE classDate REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
--     AND STR_TO_DATE(classDate, '%Y-%m-%d') IS NULL;
-- 두 결과 모두 비어있어야 한다.
--
-- Codex PR #51 P0 fix: prior pending-upload sentinel ("metadata-pending") row
-- 가 prod 에 남아있을 수 있음. 본 migration step 1 에서 today 로 normalize.
-- FE 는 이미 ISO 날짜만 보냄 (PR #51 P0 fix 후).

-- Step 1: legacy sentinel + non-ISO 형식을 today 로 정규화. 사용자는 이후
-- updateMaterialMetadata 로 실제 수업일 갱신.
UPDATE `PdfMaterial`
SET `classDate` = DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d')
WHERE `classDate` NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   OR `classDate` = 'metadata-pending'
   OR STR_TO_DATE(`classDate`, '%Y-%m-%d') IS NULL;

-- Step 2: VARCHAR → DATE. MySQL 자동 STR_TO_DATE (strict 'YYYY-MM-DD').
-- index `@@index([ownerId, subjectId, classDate])` 는 MODIFY 후 유지됨.
ALTER TABLE `PdfMaterial`
  MODIFY COLUMN `classDate` DATE NOT NULL;
