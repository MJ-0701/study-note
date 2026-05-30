# S2(auth) implement 핸드오프 — WU1 완료, WU2 진입 대기

> sprint = 2026-W22-sprint-25 (active). Gate 3 PASS + user-approval captured.
> 이 문서 = 다음 fresh session 인계용. 작성 = 2026-05-30.
> SoT = `.sfs-local/sprints/2026-W22-sprint-25/plan.md` (AC1~AC7) +
> `brainstorm.md` (잠긴 4결정 D1~D4).

## 현재 상태

- **WU1 = 완료 (검증됨, 미커밋).** `apps/web/src/auth/AuthGate.tsx` (123L) +
  `apps/web/src/auth/__tests__/AuthGate.spec.ts`. 둘 다 디스크에 untracked 로 존재.
  - tsc `--noEmit` exit 0 (clean).
  - `node --experimental-strip-types --no-warnings --test apps/web/src/auth/__tests__/AuthGate.spec.ts`
    → 8/8 pass.
  - self-grep CLEAN (data-action/dangerouslySetInnerHTML/escapeHtml/useEffect/
    useState/useStore/useShallow/zustand/store/fetch/signIn/signUp 0).
  - markup = authViews.ts 1:1 확인 (login: auth-tabs/aria-selected/login-form/
    feedback block / sessionCheck: data-session-checking/세션 확인 중/retry gating).
- **WU2 = 완료 (검증됨, 미커밋).** 신규 `apps/web/src/auth/authGateMount.tsx`(createRoot
  #auth-root once + `renderAuthGate(props|null)`) + `index.html` `#auth-root` div(#app 위) +
  `main.ts` 4곳: import 배선(renderAuthLoginPage/SessionCheckPage 제거 → AuthMode/
  AuthGateCallbacks/renderAuthGate 추가) / `authGateCallbacks` 모듈 const(L370, 안정 ref) /
  `submitAuth`(L1930, handleDocumentSubmit auth 본체 추출, action→mode, 로직 변경 0) +
  handleDocumentSubmit auth 분기 inert+DRY(L2044) / `setAuthScreenActive`+`renderApp`
  early-guard(L4415~4437, mountRender→renderAuthGate + #app hidden). D2 위임 제거목록 doc =
  `s2-delegation-removal-list.md` 작성.
  - 검증(main 독립 재실행): tsc exit 0 / AuthGate.spec 8/8 / `pnpm -r build` 전체 success /
    authGateMount grep CLEAN(구독·effect 0). renderApp 가 모든 전환 driver(timer 포함) 재확인.
- **WU3 = 미착수.** Gate 6 = 미착수.
- 작업트리: WU1+WU2 파일 + 기존 untracked docs(s1b-*) + ACTIVE.md(M). 커밋 0.

## ⚠️ plan vs repo 불일치 (교정 완료 — evidence divergence)

plan/brainstorm 이 "vitest jsdom" 을 반복하나 **repo 에 vitest/testing-library/jsdom
없음**. 실제 테스트 인프라 (실독 확인):
- 유닛 = node 내장 러너 `node --experimental-strip-types --no-warnings --test <spec.ts>`
  + `linkedom`. node 러너는 **JSX 변환 안 함**.
- 그래서: `.tsx` 가 `React.createElement`-only 면 spec 이 import-render 가능
  (예: `pdf-toolbar.spec.ts` → `PdfToolbar.tsx`). **AuthGate.tsx 는 일반 JSX** →
  node:test import 불가 → WU1 spec = **static-source assertion** (readFileSync +
  assert.match, `auth-boot.spec.ts` 패턴). 이 방식이 정답.
- AuthGate 의 실 렌더/루프 보증 = **WU3 prod-build playwright** 가 담당 (유닛 아님).
- playwright = root `@playwright/test` 존재. Chrome + ms-playwright chromium(1208)
  로컬 존재 확인. 패턴 = `scripts/playwright-auth-boot.mjs` (.mjs, vite spawn +
  chromium.launch). plan 의 `tests/e2e/*.spec.ts` 네이밍은 비관행 → `.mjs` 채택.

## WU1 동결 인터페이스 (AuthGate.tsx — 변경 금지)

```ts
export type AuthGateView = "login" | "sessionCheck";
export interface AuthGateCallbacks {
  onTabLogin(): void;
  onTabSignup(): void;
  onRetrySession(): void;
  onSubmitAuth(mode: AuthMode, name: string, studentNumber: string): void;
}
export interface AuthGateProps {
  view: AuthGateView;
  authMode: AuthMode;             // ./authSession
  loginFeedback: LoginFeedback;   // ./authSession (nullable)
  authBootNotice: AuthBootNotice; // ./sessionBoot
  callbacks: AuthGateCallbacks;
}
export function AuthGate(props: AuthGateProps): React.ReactElement
```
- onSubmitAuth = **raw 값 forward** (trim X, 빈검증 X, feedback X). 도메인은 main.ts.

## ⚠️ 전제 정정 (WU2 진입 시 코드 실독 — D1=A2 불변, 단 wording 부정확했음)

- handoff/brainstorm 의 "#app morphdom 소유" 는 **부정확**. 실제 (main.ts:367/506/627
  + react-shell/root.tsx + LegacyView.tsx 실독): **#app 은 S0 React shell 이
  `createRoot(#app)` 으로 소유** → `<ReactShellRouter>` → `<LegacyView>`
  (`display:contents` leaf `#legacy-app-root`, morphdom 이 소유) + `<PdfToolbarPortal>`.
  legacy `renderApp`→`mountRender`→`renderIntoSink` 의 morphdom 대상 = **`#legacy-app-root`**
  (#app 아님).
- D1=A2 결정은 **불변·정확**: 별도 `#auth-root` 2번째 React root + AuthGate. tie-breaker
  (advisor 확인) = in-shell 대안(ReactShellRouter 안에 `<AuthGate>`)은 shell 이 auth state
  를 알아야 → React tree 내 store 구독 = **S1a #185 loop class 정확 재현**. separate-root +
  imperative `renderApp→renderAuthGate→root.render` 만 구독 0 유지 → 루프 구조적 불가.
- **timer 전환 검증 완료** (sessionState.ts:176~180 실독): T3 `checking→waking` 가
  `cb.triggerRender()`(=renderApp, main.ts:752) 호출. 모든 boot-notice 전환 = renderApp
  경유 → AC5 "timer 도 root.render 경유" = **inherited-true** (WU3 가 아니라 construction
  으로 보증).

## WU2 = 다음 작업 (배선) — 확보된 코드 사실

목표: renderApp early-guard 2단을 A2 container(`#auth-root` 별도 React root)로 전환.
`#legacy-app-root` morphdom 소유 + `#app` React-shell 소유 **둘 다 불변**. auth path 는
이제 `#legacy-app-root` 에 **쓰지 않고** `#auth-root` 에만 렌더 + `#app` hide. AC5.

코드 사실 (실독):
- `apps/web/src/main.ts` = **`.ts` (JSX 불가)** → 신규 `.tsx` mount 모듈 필요.
  제안: `apps/web/src/auth/authGateMount.tsx` — `createRoot(#auth-root)` **once**
  부트스트랩 + `renderAuthGate(props: AuthGateProps | null)`. props→`root.render(<AuthGate .../>)`,
  null→`root.render(null)`. **전환마다 unmount 금지** (create-once, A1 기각).
- `index.html` (apps/web/index.html, 16L): `<body>` 에 `<div id="app"></div>` 하나뿐.
  `<div id="auth-root"></div>` 추가 (#app 위 or 아래, 둘 다 독립 root 라 무관).
- `main.ts:506` `const app = document.querySelector("#app")` (없으면 throw).
  `#auth-root` 도 동일 acquire. mount 모듈이 자체 acquire 해도 됨.
- `main.ts:4399 renderApp()` early-guard:
  - `4400`: `getAuthBootStateValue()==="checking"` → 현재 `mountRender(renderAuthSessionCheckPage(getAuthBootNoticeValue()))`.
  - `4406`: `!getAuthSession()` → 현재 `mountRender(renderAuthLoginPage(getAuthMode(), getLoginFeedback()))`.
  - **신 배선**: 두 분기 →
    `renderAuthGate({ view, authMode: getAuthMode(), loginFeedback: getLoginFeedback(),
     authBootNotice: getAuthBootNoticeValue(), callbacks: authGateCallbacks })`
    + `#app` hidden (예: `app.hidden = true` 또는 display none). `return`.
  - authed 경로 진입 시 (4412~): `renderAuthGate(null)` + `#app` show. (renderApp
    상단 한 곳에서 처리하거나 authed 분기 직전에.)
- **`.login-screen` (styles.css:93) = class-scoped full-screen** (min-height:100vh,
  grid). #app 앵커 아님 → A2 CSS-safe (검증됨). #auth-root 에 그대로 렌더 OK.
- **callbacks 배선** (기존 핸들러 직결, 도메인 재구현 X):
  - `onTabLogin` → main.ts:1316~1321 본체: `setAuthMode("login"); setLoginFeedback(undefined); renderApp();`
  - `onTabSignup` → main.ts:1323~1328: `setAuthMode("signup"); setLoginFeedback(undefined); trackRumAction("sign_up_started"); renderApp();`
  - `onRetrySession` → main.ts:1407~1409: `void revalidateStoredSession({ blocking: true });`
  - `onSubmitAuth(mode, name, studentNumber)` → **handleDocumentSubmit 의 auth 본체**
    (main.ts:1951~2036): preventDefault 는 AuthGate 가 이미 함. trim + 빈검증
    (1954~1967) + login(1969~2011: cancelAuthBootRequest/signIn/setAuthSession/
    writeAuthSessionHint/RUM/markSignInSuccess/applySessionTransitionForUser/
    restore/loadSidebarTermsCache/renderApp) + signup(2016~2035: signUp/setAuthMode/
    revalidate) 그대로. → 이 본체를 `submitAuth(mode, name, studentNumber)` 함수로
    추출해 onSubmitAuth + 기존 handleDocumentSubmit 양쪽이 호출 (D2: 위임 분기 inert
    유지, 삭제 X).
- **D2 제거목록 문서**: `docs/solon/web/react-migration/20260530/s2-delegation-removal-list.md`
  작성. authViews 5 data-action 의 main.ts 위임 분기 (후속 cleanup PR 대상):
  auth-tab-login(1316), auth-tab-signup(1323), retry-session-check(1407),
  form login/signup(handleDocumentSubmit action 분기 1947~2036). 이번 슬라이스
  **삭제 X** — React onClick/onSubmit 가 미emit data-action 이라 inert.

## WU2 루프 위험 (S1a 교훈 — pure-props 유지)

- AuthGate = 내부 구독 0 + useEffect-setState 0 (WU1 보장). re-render 유일 trigger =
  renderApp→renderAuthGate→root.render. callbacks 가 전부 renderApp 재호출하는
  구조라 transition→renderApp→renderAuthGate 일관 (PdfToolbar 값-동일성 guard 류
  불필요 — AuthGate 는 매번 새 props 받아도 내부 setState 0 이라 self-loop 불가).
- **timer 전환** (checking→waking, sessionState.ts) 도 renderApp 경유 확인 필요 →
  WU3 playwright 가 보증.
- callbacks 객체를 매 renderApp 마다 새로 만들어도 무방 (AuthGate 가 props 비교 후
  setState 하지 않음). 단 깔끔히 하려면 module-level const callbacks 1개 권장.

## WU3 (배선 후) — prod-build playwright loop-gate + negative control. AC6.

- 신규 `scripts/playwright-auth-loop-gate.mjs` (auth-boot.mjs 패턴 복제).
- **prod-build**: `pnpm --filter @study-note/web build` 후 `vite preview` (dev server
  아님 — S1a 교훈). 또는 build → preview spawn.
- GREEN: `/` 로드 → `[data-login-screen]` 렌더 assert → 회원가입 탭 클릭 →
  signup 모드 assert (active tab) → 빈 폼 제출 → validation feedback assert →
  **console-error 0** (React #185 / "Maximum update depth exceeded" 부재) +
  render-count bounded.
- **negative control (필수)**: pure-props 세계 유일 loop class = unstable prop ref /
  깨진 값-동일성. **동일 harness path + 동일 detector** 로 RED 재현 — 예: mount
  모듈에 env-gated 분기 심어 매 호출 새 callbacks ref + AuthGate 가 그걸 구독하는
  변종, 또는 renderAuthGate 를 setInterval 로 self-retrigger. console-error RED
  확인. (별 메커니즘 RED ≠ 증명.)
- 정적 grep AC2/AC3/AC4/AC7 (AuthGate.tsx 스캔 — WU1 spec 이 이미 커버, WU3 에서
  재확인).
- ⚠️ deploy tag(fe-v*) 와 게이트 검증 = **다른 batch** (S1a incident). prod-build
  GREEN evidence 확보 후 별도로 tag push (push = user 명시 승인).

## Gate 6 (구현 후)

- self → cross. **codex usage-limit (May 31 06:13 KST 복구) → 현재 down → Gemini 폴백**
  (`gemini-3-pro-auto` self+cross). acceptance ledger: AC1~AC7 implemented/missing/
  deferred/waived + file/evidence pointer.
- finding 기각 시 **라인 실독 필수** (S1a root cause).

## 정책 (ambient)

- 구현 = Sonnet worker. main(Opus) = plan/review/INV 판단. commit = branch,
  push = 명시 승인 (user 터미널). docs 트리 = `docs/solon/web/react-migration/<date>/`.
- ⚠️ 이번 세션 채널에 advisor 호출이 반복 실패 (tool 미발화). 다음 세션에서
  WU2 굳히기 전 advisor 재시도 권장.
- ⚠️ shell cwd = `apps/web` 로 시작할 수 있음. **절대경로 + 단일 compound 명령**
  사용 (parallel bash 에서 `cd` persist 안 됨 — 이번 세션 함정).
