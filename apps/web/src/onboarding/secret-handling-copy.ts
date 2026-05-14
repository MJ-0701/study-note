// sprint-7 slice-2 — onboarding-mcp 의 secret-handling 카피 (plan §4.1 S1/S2/S3 lock).
//
// 본 모듈은 onboarding-mcp.tsx 의 JSON snippet 인접 영역에 렌더되는 안내 문구를
// const 로 추출한다. 추출 이유 = plan §3 AC2-amend2 의 measurable 검증 — node:test 가
// substring 존재만 확인하고 React 렌더 dependency 없이 자동 회귀 가드 가능.

/**
 * S1 — local-only scope.
 * onboarding 가이드가 사용자 로컬 머신 (Claude Desktop / Cursor 가 spawn 한 stdio
 * process) 전용임을 명시.
 */
export const S1_LOCAL_ONLY =
  "이 JSON 은 본인 로컬 머신의 Claude Desktop / Cursor 가 실행할 stdio 프로세스 설정입니다. 원격 호스팅 / 공유 환경에서는 사용하지 마세요.";

/**
 * S2 — do-not-commit.
 * DATABASE_URL 등 사용자 머신 dev DB 연결 문자열을 study-note 저장소 / 공유 채널에
 * commit / push / 공유 금지.
 */
export const S2_DO_NOT_COMMIT =
  "DATABASE_URL 은 본인 머신 dev DB 연결 문자열입니다. study-note 저장소나 다른 곳에 commit / push / 공유하지 마세요.";

/**
 * S3 — least-privilege DB credential.
 * 사용자 dev DB 권한 분리 — master/superuser 자격증명 사용 회피.
 */
export const S3_LEAST_PRIVILEGE =
  "DB 권한은 dev 전용 role (최소 권한) 을 사용하세요. master / superuser 자격증명은 피하세요.";

/** AC2-amend2 가 검증할 3 substring 의 묶음 — spec 가 그대로 import. */
export const SECRET_HANDLING_COPY = {
  S1: S1_LOCAL_ONLY,
  S2: S2_DO_NOT_COMMIT,
  S3: S3_LEAST_PRIVILEGE
} as const;
