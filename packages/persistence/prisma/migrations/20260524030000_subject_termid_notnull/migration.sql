-- sprint-W21-sprint-1 / S1 / AC7 step (3) — Subject.termId NOT NULL tighten.
--
-- 전제: scripts/backfill-default-term.ts --apply 가 prod 에서 실행 완료되어
--       모든 Subject.termId 가 NOT NULL 인 상태.
--
-- 사전 검증 (apply 전 권장):
--   SELECT COUNT(*) FROM Subject WHERE termId IS NULL;
-- 결과 = 0 이어야 한다. 아니면 backfill --apply 먼저 실행.
--
-- Codex PR #55 P1 hardening: ALTER 가 NULL row 만나면 MySQL ER_INVALID_USE_OF_NULL
-- (1138) 로 mid-deploy halt. 안전하긴 하지만 ops 가 cryptic 오류 봄. 본 step
-- 1 가 명시적 precondition assert — NULL row 있으면 "non-existent table" 참조
-- 로 fail-loud + 메시지에 backfill 안내 포함.
--
-- 영향: Subject FK 가 nullable → required 로. 새 Subject create 시 termId 누락
-- 불가 (BE service.create 가 이미 termId 강제, regression 없음).

-- Step 1: precondition guard. NULL rows 가 있으면 ELSE 분기로 들어가 존재하지
-- 않는 테이블 참조 → MySQL 1146 (Table doesn't exist) 로 deploy abort. 에러
-- 메시지에 테이블 이름이 포함되어 ops 가 backfill 필요성 즉시 인지.
SELECT CASE
  WHEN (SELECT COUNT(*) FROM `Subject` WHERE `termId` IS NULL) = 0 THEN 1
  ELSE (SELECT 1 FROM `__ABORT_run_scripts_backfill_default_term_ts_apply_first_then_retry`)
END AS precondition_check;

-- Step 2: NOT NULL tighten.
ALTER TABLE `Subject`
  MODIFY COLUMN `termId` VARCHAR(191) NOT NULL;
