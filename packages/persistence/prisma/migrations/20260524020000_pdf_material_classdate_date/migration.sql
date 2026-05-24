-- sprint-W21-sprint-1 / S3 / AC12 — PdfMaterial.classDate VARCHAR → DATE.
--
-- 전제: 모든 기존 row 의 classDate 가 'YYYY-MM-DD' parseable + 유효한 calendar date.
-- prod 적용 전 검증 쿼리 (Codex PR #51 P1+R3+R4 hardening):
--   -- (1) shape check
--   SELECT id, classDate FROM PdfMaterial
--   WHERE classDate NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
--   -- (2) calendar overflow roundtrip check (e.g., '2026-02-30' parses to
--   --     '2026-03-02' in non-strict mode; STR_TO_DATE IS NULL only in strict).
--   --     DATE_FORMAT(STR_TO_DATE(...)) <> classDate 이 두 mode 모두 catch.
--   SELECT id, classDate FROM PdfMaterial
--   WHERE classDate REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
--     AND (STR_TO_DATE(classDate, '%Y-%m-%d') IS NULL
--      OR DATE_FORMAT(STR_TO_DATE(classDate, '%Y-%m-%d'), '%Y-%m-%d') <> classDate);
-- 두 결과 모두 비어있어야 한다.
--
-- Codex PR #51 P0 fix: prior pending-upload sentinel ("metadata-pending") row
-- 가 prod 에 남아있을 수 있음. 본 migration step 1 에서 epoch sentinel 로 normalize.
-- FE 는 이미 ISO 날짜만 보냄 (PR #51 P0 fix 후).
-- Codex PR #51 R3 P1 fix: STR_TO_DATE IS NULL 만으로는 non-strict mode 에서
-- overflow (2026-02-30 → 2026-03-02) catch 못함. DATE_FORMAT roundtrip 추가.
-- Codex PR #51 R4 P1 fix: CURRENT_DATE 로 normalize 는 silent data loss —
-- migration-day 의 임의 ISO 라 "오늘 수업" 으로 잘못 매핑될 수 있음. epoch
-- sentinel '1970-01-01' 사용 — FE 의 isUnconfirmedPdfClassDate 가 인식해서
-- "수업일 미지정" 상태로 표시 + admin 이 명시 update 시점에 실제 ISO 로 전환.

-- Step 1: legacy sentinel + non-ISO + calendar overflow 를 epoch sentinel 로
-- 정규화. 사용자가 명시 update 전까지 unconfirmed 상태 유지 (silent mislabel
-- 회피).
UPDATE `PdfMaterial`
SET `classDate` = '1970-01-01'
WHERE `classDate` NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   OR `classDate` = 'metadata-pending'
   OR STR_TO_DATE(`classDate`, '%Y-%m-%d') IS NULL
   OR DATE_FORMAT(STR_TO_DATE(`classDate`, '%Y-%m-%d'), '%Y-%m-%d') <> `classDate`;

-- Step 2: VARCHAR → DATE. MySQL 자동 STR_TO_DATE (strict 'YYYY-MM-DD').
-- index `@@index([ownerId, subjectId, classDate])` 는 MODIFY 후 유지됨.
ALTER TABLE `PdfMaterial`
  MODIFY COLUMN `classDate` DATE NOT NULL;
