-- reviewer role 추가 (포트폴리오 검토용 제한 권한: 운영지표만 접근).
-- Role enum 에 REVIEWER 값 추가. 비파괴(기존 값/행 영향 없음). DEFAULT 유지.
ALTER TABLE `User` MODIFY `role` ENUM('MASTER', 'ADMIN', 'REVIEWER', 'NORMAL') NOT NULL DEFAULT 'NORMAL';
