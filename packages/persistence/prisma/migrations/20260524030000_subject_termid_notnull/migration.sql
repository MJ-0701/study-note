-- sprint-W21-sprint-1 / S1 / AC7 step (3) — Subject.termId NOT NULL tighten.
--
-- 전제: scripts/backfill-default-term.ts --apply 가 prod 에서 실행 완료되어
--       모든 Subject.termId 가 NOT NULL 인 상태.
--
-- 사전 검증 (apply 전 필수):
--   SELECT COUNT(*) FROM Subject WHERE termId IS NULL;
-- 결과 = 0 이어야 한다. 아니면 backfill --apply 먼저 실행.
--
-- 영향: Subject FK 가 nullable → required 로. 새 Subject create 시 termId 누락
-- 불가 (BE service.create 가 이미 termId 강제, regression 없음).

ALTER TABLE `Subject`
  MODIFY COLUMN `termId` VARCHAR(191) NOT NULL;
