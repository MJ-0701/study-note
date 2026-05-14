// sprint-7 slice-1 — MCP 미연결 안내 카드.
//
// plan §3 AC2-amend lock:
//   persona-turn API (`POST /api/v1/persona-turns` 또는
//   `/api/v1/conversations/:id/turns`) 가 {503, errorCode=AUTH_DEV_DISABLED} 를 반환한
//   경우에만 본 카드를 노출한다.
//
// 401 SESSION_REQUIRED 는 별개 경로 (sign-in/세션 만료) — 본 카드 미사용.
// 향후 MCP-specific errorCode (`MCP_OWNER_MISMATCH` 등) 신설 시 본 카드 mapping 에 추가
// (sprint-7 scope 아님).
//
// 카드 본문 invariant: 학번 8자리 / 토큰 hex 같은 sensitive 값은 절대 포함하지 않는다.
import type { ReactNode } from "react";

export interface MCPDisconnectedCardProps {
  /** 추가 안내 (선택) — caller 가 필요 시 children 으로 주입. sensitive 값 노출 금지. */
  children?: ReactNode;
}

export function MCPDisconnectedCard({ children }: MCPDisconnectedCardProps) {
  return (
    <section
      role="alert"
      aria-labelledby="mcp-disconnected-title"
      data-mcp-disconnected-card="true"
      style={{
        marginTop: 24,
        padding: 16,
        border: "1px solid #fed7aa",
        borderRadius: 8,
        background: "#fff7ed",
        color: "#9a3412",
        fontSize: 14,
        lineHeight: 1.65
      }}
    >
      <strong id="mcp-disconnected-title" style={{ fontSize: 15 }}>
        MCP 연결이 비활성화돼 있어요
      </strong>
      <p style={{ margin: "6px 0 0" }}>
        study-note 서버의 MCP 인증 경로가 비활성화돼 페르소나 응답을 만들 수 없습니다.
        본인 환경 변수 / 서버 설정을 확인한 뒤 다시 시도하세요.
      </p>
      <p style={{ margin: "8px 0 0" }}>
        <a
          href="/onboarding-mcp.html#trouble"
          aria-label="MCP 연동 트러블슈팅 보기"
          style={{ color: "#9a3412", textDecoration: "underline", fontWeight: 600 }}
        >
          트러블슈팅 가이드 보기 →
        </a>
      </p>
      {children}
    </section>
  );
}

/**
 * persona-turn API 에러를 "MCP 미연결" 로 매핑할지 판정.
 *
 * 매핑 조건 = (status === 503) AND (errorCode === "AUTH_DEV_DISABLED").
 * 그 외 모든 4xx/5xx 는 기존 일반 오류 카드 유지 (auth boundary 분리 — plan §3 AC2-amend).
 */
export function isMcpDisconnectedError(input: {
  status: number;
  errorCode: string;
}): boolean {
  return input.status === 503 && input.errorCode === "AUTH_DEV_DISABLED";
}
