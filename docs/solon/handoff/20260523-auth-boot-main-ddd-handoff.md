---
handoff_type: "claude-continuation"
created_at: "2026-05-23T22:45:00+09:00"
source_session: "Codex"
target_session: "Claude"
topic: "auth boot UX fix + main.ts DDD decomposition continuation"
status: "auth boundary refactor done; broader main.ts decomposition pending"
---

# Auth Boot + `main.ts` DDD Handoff

## 1. 사용자 의도

카카오톡 인앱 브라우저 등 **완전 첫 방문 / 무세션 핸드폰**에서 링크를 열자마자
`세션 확인 중` 화면이 먼저 보이는 것은 UX 설계 미스다.

정상 기대:

- 첫 방문자는 최소한 **로그인 / 회원가입** 화면을 즉시 봐야 한다.
- `세션 확인 중`은 기존 로그인 이력이 있어 세션 복구 가능성이 있는 브라우저에서만 허용한다.
- FE라도 DDD / boundary 설계는 필요하다. `main.ts`에 인증, PDF, 렌더링, 세션 전환이 뒤섞이면 Claude/Codex 병렬 작업 충돌이 커진다.

## 2. 이번 Codex 작업 완료 범위

### UX fix

- 첫 방문자는 `authBootState="ready"`로 시작해서 로그인/회원가입 UI가 즉시 렌더된다.
- 기존 로그인 성공 이력이 있는 브라우저만 non-secret localStorage hint를 보고 blocking session check로 시작한다.
- 실제 인증 SoT는 그대로 HttpOnly cookie + `/v1/auth/me`다.
- localStorage에는 세션 토큰/사용자 정보가 아니라 `study-note.auth-session-hint.v1 = "1"`만 저장한다.
- `/v1/auth/me`가 401/403이거나 응답 shape가 이상하면 stale hint를 제거한다.
- 로그인/회원가입 submit 전에 background `/me` request를 request id로 무효화해서 늦게 도착한 `/me`가 새 로그인 세션을 덮지 않게 했다.

### Auth boundary 분리

`apps/web/src/main.ts`에서 auth boot 관련 책임을 별도 모듈로 분리했다.

- `apps/web/src/auth/sessionBoot.ts`
  - auth boot state/notice type
  - first-time vs returning visitor boot policy
  - non-secret auth session hint read/write/clear
- `apps/web/src/auth/authApi.ts`
  - `/v1/auth/me`, sign-in, sign-up, sign-out API wrapper
  - timeout fetch는 이 모듈 내부로 이동
- `apps/web/src/auth/authSession.ts`
  - auth response DTO guard
  - `AuthSession` model
  - DTO -> session mapper
- `apps/web/src/auth/authViews.ts`
  - login/signup page renderer
  - session-check page renderer

`main.ts`는 아직 크지만, 최소한 auth model/API/policy/view는 빠졌다.

## 3. 추가된 검증

### Static/unit regression

파일:

- `apps/web/src/__tests__/auth-boot.spec.ts`

검증 내용:

- auth boot policy가 `auth/sessionBoot.ts`에 존재한다.
- 첫 방문자는 blocking session-check가 아니라 login-ready state다.
- returning visitor만 blocking session-check를 탄다.
- `main.ts`가 auth API/session/view 책임을 auth modules에 위임한다.
- 401/403/invalid auth는 non-secret hint를 clear한다.
- login/signup 전에 background `/me` request를 cancel한다.

실행:

```bash
node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/auth-boot.spec.ts
```

결과: PASS, 7 tests.

### Playwright smoke

파일:

- `scripts/playwright-auth-boot.mjs`

package:

- `@playwright/test` devDependency 추가
- `package.json` script 추가: `smoke:auth-boot-playwright`

검증 내용:

- Vite dev server를 임의 포트로 실행.
- Chromium에서 모바일 폭 viewport로 `/subjects/digital-engineering/pdf-workspace` 진입.
- `**/api/v1/auth/me`를 Playwright route로 intercept.
- first-time visitor:
  - `/me`가 2.5초 지연되어도 login/signup이 즉시 visible
  - `[data-session-checking]`가 나타나지 않음
  - background `/me`는 실제 호출됨
- returning visitor:
  - localStorage hint를 미리 심음
  - session-check가 visible
  - `/me` 401 후 login으로 fallback
  - stale hint가 localStorage에서 제거됨

실행:

```bash
pnpm smoke:auth-boot-playwright
```

결과: PASS.

### Build

```bash
pnpm --filter @study-note/web build
```

결과: PASS.

## 4. 현재 작업 트리 주의

현재 `git status --short` 기준:

```text
 M .gitignore
 M SFS.md
 M apps/web/src/main.ts
 M package.json
 M pnpm-lock.yaml
?? apps/web/src/__tests__/auth-boot.spec.ts
?? apps/web/src/auth/
?? docs/solon/admin/
?? scripts/playwright-auth-boot.mjs
```

주의:

- `.gitignore`, `SFS.md`, `docs/solon/admin/`는 Codex auth 작업 이전부터 있던 변경으로 보인다. 인계받는 Claude는 되돌리지 말 것.
- 이번 Codex 작업은 `apps/web/src/main.ts`, `apps/web/src/auth/`, `apps/web/src/__tests__/auth-boot.spec.ts`, `scripts/playwright-auth-boot.mjs`, `package.json`, `pnpm-lock.yaml`에 해당한다.
- `pnpm add -Dw @playwright/test`로 lockfile이 갱신되었다.
- 검증용 Vite server는 종료 확인했다.

## 5. 남은 본 작업: `main.ts` DDD 분해

이번 작업은 auth boundary만 제대로 끊었다. 전체 `main.ts` DDD 분해는 아직 남아 있다.

권장 순서:

1. **Auth boundary 안정화 확인**
   - 이미 분리된 `apps/web/src/auth/*`는 유지.
   - auth 관련 추가 변경은 이 폴더 안에서 처리.
   - `main.ts`에서 auth 로직을 다시 키우지 말 것.

2. **Routing / Shell 분리**
   - 후보:
     - `apps/web/src/app/routes.ts`
     - `apps/web/src/app/renderApp.ts` 또는 `appShell.ts`
   - `Route`, `parseRoute`, route title/body dispatch를 분리.
   - PDF/subject route가 많으므로 먼저 pure route parsing부터 떼는 것이 안전하다.

3. **PDF workspace feature 분리**
   - 후보:
     - `apps/web/src/pdf-workspace/`
     - `apps/web/src/pdf-materials/`
   - 현재 `main.ts`에서 가장 큰 충돌 표면.
   - Claude가 진행 중인 학기/과목/admin 작업과 충돌 가능성이 높으므로 diff를 먼저 확인할 것.

4. **Study notebook / subject views 분리**
   - subject sidebar, class page, summaries, memorize, MCP panel 등을 feature module로 이동.
   - domain package의 `SubjectNote`, `WeekNote`와 가까운 pure helpers부터 먼저 추출.

5. **State transition / sync 분리**
   - `applySessionTransitionForUser`, `clearAuthSession`, user notes sync, annotation sync는 auth와 persistence 사이의 application service 성격.
   - 다만 blast radius가 크다. routing/PDF render 분리 후 진행 권장.

## 6. 리팩토링 원칙

- 한번에 `main.ts`를 다 찢지 말고 feature boundary 단위로 옮긴다.
- 이동만 하는 commit과 behavior 변경 commit을 분리한다.
- 새 모듈은 가능하면 DOM 없는 pure function / state transition 먼저 만들고, DOM renderer는 나중에 옮긴다.
- 기존 smoke를 깨지 말 것:
  - `pnpm --filter @study-note/web build`
  - `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/auth-boot.spec.ts`
  - `pnpm smoke:auth-boot-playwright`
- auth boot UX는 public contract로 취급:
  - first-time visitor = login/signup immediately
  - returning visitor = session-check allowed
  - stale session = login fallback + hint clear

## 7. Claude 시작 프롬프트

```text
docs/solon/handoff/20260523-auth-boot-main-ddd-handoff.md 읽고 이어서 작업해.
Codex가 auth boot UX fix와 auth boundary 분리는 끝냈고 검증도 PASS.
다음은 main.ts DDD 분해를 진행하되, 기존 uncommitted .gitignore/SFS.md/docs/solon/admin 변경은 보존해.
먼저 git diff로 Claude 기존 작업과 충돌 표면 확인 후 Routing/Shell 분리부터 시작해.
```

