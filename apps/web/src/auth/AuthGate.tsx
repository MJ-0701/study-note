// AuthGate — React auth 화면 컴포넌트 (pure-props, 스토어 구독 없음).
import React from "react";
import type { AuthMode, LoginFeedback } from "./authSession";
import type { AuthBootNotice } from "./sessionBoot";

export type AuthGateView = "login" | "sessionCheck";

export interface AuthGateCallbacks {
  onTabLogin(): void;
  onTabSignup(): void;
  onRetrySession(): void;
  onSubmitAuth(mode: AuthMode, name: string, studentNumber: string): void;
}

export interface AuthGateProps {
  view: AuthGateView;
  authMode: AuthMode;
  loginFeedback: LoginFeedback;
  authBootNotice: AuthBootNotice;
  callbacks: AuthGateCallbacks;
}

export function AuthGate(props: AuthGateProps): React.ReactElement {
  const { view, authMode, loginFeedback, authBootNotice, callbacks } = props;

  if (view === "sessionCheck") {
    const isRetryable = authBootNotice === "retryable";
    const detail = isRetryable
      ? "자동 확인이 끝났습니다. 아래 버튼을 눌러 다시 시도해 주세요."
      : "서버와 로그인 정보를 확인하고 있습니다. 첫 요청은 백엔드가 깨어나는 데 시간이 걸릴 수 있으며 자동으로 다시 확인합니다.";

    return (
      <main className="login-screen" data-session-checking="true">
        <section
          className="login-panel"
          aria-live="polite"
          aria-busy={isRetryable ? "false" : "true"}
        >
          <p className="meta">SESSION CHECK</p>
          <h1>세션 확인 중</h1>
          <p className="lede">{detail}</p>
          {isRetryable && (
            <div className="session-check-actions">
              <button
                className="secondary-action"
                type="button"
                onClick={callbacks.onRetrySession}
              >
                다시 확인
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  // view === "login"
  const isLogin = authMode === "login";

  return (
    <main className="login-screen" data-login-screen="true">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="meta">PRIVATE STUDY WORKSPACE</p>
        <h1 id="login-title">study-note</h1>
        <p className="lede">강의 PDF와 필기 데이터는 사용자별 작업공간에서 관리됩니다.</p>

        <div className="auth-tabs" role="tablist" aria-label="인증 방식 선택">
          <button
            className={`auth-tab${isLogin ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={isLogin ? "true" : "false"}
            onClick={callbacks.onTabLogin}
          >
            로그인
          </button>
          <button
            className={`auth-tab${!isLogin ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={!isLogin ? "true" : "false"}
            onClick={callbacks.onTabSignup}
          >
            회원가입
          </button>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            callbacks.onSubmitAuth(
              authMode,
              String(fd.get("name") ?? ""),
              String(fd.get("studentNumber") ?? "")
            );
          }}
        >
          <label>
            <span>이름</span>
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            <span>학번</span>
            <input name="studentNumber" inputMode="numeric" autoComplete="off" required />
          </label>
          <button className="primary-action" type="submit">
            {isLogin ? "로그인" : "회원가입"}
          </button>
        </form>

        {loginFeedback && (
          <div className={`login-feedback is-${loginFeedback.kind}`}>
            <strong>{loginFeedback.title}</strong>
            <p>{loginFeedback.detail}</p>
          </div>
        )}
      </section>
    </main>
  );
}
