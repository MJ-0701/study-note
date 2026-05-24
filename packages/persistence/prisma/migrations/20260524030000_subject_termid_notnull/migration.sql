-- sprint-W21-sprint-1 / S1 / AC7 step (3) — Subject.termId NOT NULL tighten.
--
-- 전제: scripts/backfill-default-term.ts --apply 가 prod 에서 실행 완료되어
--       모든 Subject.termId 가 NOT NULL 인 상태.
--
-- 사전 검증 (apply 전 필수):
--   SELECT COUNT(*) FROM Subject WHERE termId IS NULL;
-- 결과 = 0 이어야 한다. 아니면 backfill --apply 먼저 실행:
--   MASTER_USER_ID=<id> node --experimental-strip-types --no-warnings \
--     scripts/backfill-default-term.ts --apply
--
-- precondition 안전망: NULL row 가 남아 있으면 다음 ALTER 가 MySQL
-- ER_INVALID_USE_OF_NULL (errno 1138) 로 abort. 이 오류가 backfill 미실행
-- 신호. 헤더 docs 가 다음 단계 안내.
--
-- (Codex PR #55 R1 P1 → R2 P1: 이전 commit 에서 SELECT CASE + 존재하지 않는
-- 테이블 참조로 abort 유도 시도했으나 MySQL 이 prepare 단계에서 table 검증
-- → NULL row 0 이어도 항상 ERROR 1146 → migration 무조건 실패. 가드가 정작
-- deploy 를 차단함. revert to 단순 ALTER + 자연 1138 fallback + docs 강화.)
--
-- 영향: Subject FK 가 nullable → required 로. 새 Subject create 시 termId 누락
-- 불가 (BE service.create 가 이미 termId 강제, regression 없음).

ALTER TABLE `Subject`
  MODIFY COLUMN `termId` VARCHAR(191) NOT NULL;
