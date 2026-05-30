# S2 Auth — D2 위임 제거 목록 (후속 cleanup PR 입력)

AuthGate 가 React onClick/onSubmit 으로 직접 바인딩하므로 아래 data-action 위임
분기는 **inert** (AuthGate 가 해당 data-action 을 emit 하지 않음).
이번 슬라이스(WU2)에서는 삭제하지 않음 — 후속 cleanup PR 에서 제거.

## 삭제 대상 분기

| # | 파일 | 라인(WU2 기준 근사) | data-action | 상태 |
|---|------|---------------------|-------------|------|
| 1 | `apps/web/src/main.ts` | handleDocumentClick ~1316 | `auth-tab-login` | inert — AuthGate onTabLogin 이 대체 |
| 2 | `apps/web/src/main.ts` | handleDocumentClick ~1323 | `auth-tab-signup` | inert — AuthGate onTabSignup 이 대체 |
| 3 | `apps/web/src/main.ts` | handleDocumentClick ~1407 | `retry-session-check` | inert — AuthGate onRetrySession 이 대체 |
| 4 | `apps/web/src/main.ts` | handleDocumentSubmit auth 분기 | form action `login` | inert — AuthGate onSubmitAuth → submitAuth 경유, data-action 미emit |
| 5 | `apps/web/src/main.ts` | handleDocumentSubmit auth 분기 | form action `signup` | inert — AuthGate onSubmitAuth → submitAuth 경유, data-action 미emit |

## 후속 삭제 대상 (string-render 함수)

아래 두 함수는 WU2 에서 main.ts renderApp early-guard 가 renderAuthGate 로
교체되어 호출 지점이 0 이 됨. import 도 main.ts 에서 제거됨.
authViews.ts 파일 자체 및 import 는 후속 PR 에서 삭제.

- `apps/web/src/auth/authViews.ts` — `renderLoginPage` (export)
- `apps/web/src/auth/authViews.ts` — `renderSessionCheckPage` (export)

## 비고

- `authGateCallbacks.onTabLogin` / `onTabSignup` / `onRetrySession` 은
  기존 위임 분기 본체와 동일 로직을 직접 보유 (중복 허용, D2 정책).
- `submitAuth` 추출로 handleDocumentSubmit 의 legacy auth 분기도 동일 함수
  경유 → DRY 보장.
