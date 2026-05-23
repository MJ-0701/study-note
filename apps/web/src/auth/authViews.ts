import type { AuthBootNotice } from "./sessionBoot";
import type { AuthMode, LoginFeedback } from "./authSession";

export function renderLoginPage(authMode: AuthMode, loginFeedback: LoginFeedback): string {
  const isLogin = authMode === "login";
  return `
    <main class="login-screen" data-login-screen="true">
      <section class="login-panel" aria-labelledby="login-title">
        <p class="meta">PRIVATE STUDY WORKSPACE</p>
        <h1 id="login-title">study-note</h1>
        <p class="lede">강의 PDF와 필기 데이터는 사용자별 작업공간에서 관리됩니다.</p>

        <div class="auth-tabs" role="tablist" aria-label="인증 방식 선택">
          <button
            class="auth-tab${isLogin ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${isLogin ? "true" : "false"}"
            data-action="auth-tab-login"
          >로그인</button>
          <button
            class="auth-tab${!isLogin ? " is-active" : ""}"
            type="button"
            role="tab"
            aria-selected="${!isLogin ? "true" : "false"}"
            data-action="auth-tab-signup"
          >회원가입</button>
        </div>

        <form class="login-form" data-action="${isLogin ? "login" : "signup"}">
          <label>
            <span>이름</span>
            <input name="name" autocomplete="name" required />
          </label>
          <label>
            <span>학번</span>
            <input name="studentNumber" inputmode="numeric" autocomplete="off" required />
          </label>
          <button class="primary-action" type="submit">
            ${isLogin ? "로그인" : "회원가입"}
          </button>
        </form>
        ${
          loginFeedback
            ? `<div class="login-feedback is-${loginFeedback.kind}">
                <strong>${escapeHtml(loginFeedback.title)}</strong>
                <p>${escapeHtml(loginFeedback.detail)}</p>
              </div>`
            : ""
        }
      </section>
    </main>
  `;
}

export function renderSessionCheckPage(authBootNotice: AuthBootNotice): string {
  // "세션 확인 중" is now reserved for browsers that have actually signed in
  // before. First-time visitors render renderLoginPage immediately.
  const isRetryable = authBootNotice === "retryable";
  const detail = isRetryable
    ? "자동 확인이 끝났습니다. 아래 버튼을 눌러 다시 시도해 주세요."
    : "서버와 로그인 정보를 확인하고 있습니다. 첫 요청은 백엔드가 깨어나는 데 시간이 걸릴 수 있으며 자동으로 다시 확인합니다.";

  return `
    <main class="login-screen" data-session-checking="true">
      <section class="login-panel" aria-live="polite" aria-busy="${isRetryable ? "false" : "true"}">
        <p class="meta">SESSION CHECK</p>
        <h1>세션 확인 중</h1>
        <p class="lede">${detail}</p>
        ${
          isRetryable
            ? `<div class="session-check-actions">
                <button class="secondary-action" type="button" data-action="retry-session-check">
                  다시 확인
                </button>
              </div>`
            : ""
        }
      </section>
    </main>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
