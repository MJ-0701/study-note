-- sprint-W22-be-hotfix — Default Term backfill (idempotent).
--
-- 배경: be-v0.1.9 (2026-05-21) 이후 BE prod 배포가 122 commit behind. main 의
-- `20260524030000_subject_termid_notnull` 가 prod 의 기존 Subject row (default
-- seed 4개: digital-engineering / information-communication / c-language /
-- computer-introduction) 의 termId IS NULL 때문에 MySQL ER_INVALID_USE_OF_NULL
-- (errno 1138) 로 fail → entrypoint exit 1 → ACA replica restart loop.
--
-- 본 migration 은:
--   1. `default-term-backfill-001` id 의 default Term row 를 idempotent 생성.
--      createdById 는 첫 MASTER user 의 id (없으면 'system' literal — Term.createdById
--      는 schema 상 plain String, FK 없음).
--   2. termId IS NULL 인 Subject row 를 새 default Term 으로 backfill.
--
-- 실행 순서 (자동 — prisma migrate deploy timestamp order):
--   20260523150000_add_term_subject_term_fk        (Term 테이블 + Subject.termId nullable + FK)
--   20260524020000_pdf_material_classdate_date     (classDate String → Date)
--   20260524025000_backfill_default_term           (본 migration — 신규)
--   20260524030000_subject_termid_notnull          (Subject.termId NOT NULL tighten)
--
-- Re-entrancy: NOT EXISTS guard 로 Term row 중복 방지. WHERE termId IS NULL
-- 로 Subject 미 변경 row 만 update.
--
-- scripts/backfill-default-term.ts 의 manual 실행 대안. user terminal 에서
-- prod MySQL 직접 접근하지 않고도 자동 처리.

INSERT INTO `Term` (`id`, `grade`, `semester`, `title`, `createdById`, `createdAt`, `updatedAt`)
SELECT
  'default-term-backfill-001',
  1,
  1,
  '기본 학기',
  COALESCE(
    (SELECT `id` FROM `User` WHERE `role` = 'MASTER' ORDER BY `createdAt` ASC LIMIT 1),
    'system'
  ),
  NOW(3),
  NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Term` WHERE `id` = 'default-term-backfill-001');

UPDATE `Subject` SET `termId` = 'default-term-backfill-001' WHERE `termId` IS NULL;
