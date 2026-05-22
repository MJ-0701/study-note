---
id: study-note-agg-auth-session
title: AuthSession Aggregate
language: ko
load_when:
  - AuthSession
  - 로그인
  - logout
  - /v1/auth/me
  - cookie session
  - applySessionTransitionForUser
  - lastSessionUserId
summary: FE in-memory AuthSession + BE cookie session 의 라이프사이클, A→B 전환 detection, marker semantics.
---

# AuthSession Aggregate

## Root

- FE in-memory: `authSession: AuthSession | undefined` (`apps/web/src/main.ts`)
- BE: cookie-based session, `/v1/auth/me` endpoint 가 attach 검증
- BE module: `apps/api/src/auth/`

## 필드 / 형식

- `authSession.user.id` — userId (MySQL BIGINT → string).
  모든 user-scoped storage key 의 namespace.
- `authSession.user.studentNumber`, `name`, `role` 등.

## 관련 module-level state

| Variable | 정의 | 의미 |
|---|---|---|
| `authSession` | `main.ts` 변수 | FE 현재 session (cookie 기반, in-memory) |
| `lastSessionUserId` | `main.ts:211` | 직전 attach 된 userId (in-memory only, sprint-4/S1 이후). 같은 page lifetime 안의 A→B 전환 detection 용도. |
| ~~`lastSessionUserStorageKey`~~ | **DEPRECATED** (sprint-4/S1 제거) | 이전엔 marker 가 cross-reload 보존 + legacy migration owner gate 두 용도. 두 기능 모두 폐기 → marker write/read 제거. |
| `authBootRequestId` | retry / abort 무력화용 token | 새 boot cycle 시 증가, 이전 cycle 의 timer 무력화 |

## Invariants

### A1. authSession.user.id = userId 의 live SoT
- `lastSessionUserId` (in-memory) 는 **A→B 전환 detection** 용도. cookie session
  검증 결과를 보조적으로 재확인하는 게 아니라, 단순히 "직전 attach 된 userId
  가 누구였는지" 를 기록한다. 인증 정체성은 항상 `authSession.user.id` /
  cookie 가 SoT.
- 위반 = `lastSessionUserId` 를 인증 정체성으로 신뢰 → 우회 risk.

### A2. clearAuthSession 은 transient /v1/auth/me 실패에도 호출됨
- network blip / cold start 로 `/v1/auth/me` 가 잠시 fail → `clearAuthSession`
  호출. **데이터를 파괴하면 안 된다.**
- `clearAuthSession` 는 in-flight PUT abort + sync cache reset 까지만.
  notebook / pdfWorkspaceStore wipe X.
- 위반 사례: clearAuthSession 안에서 destructive reset → blip 으로 데이터 손실.

### A3. applySessionTransitionForUser 는 **success path** 만
- revalidate 성공 + sign-in 성공 두 path 에서만 호출.
- 같은 user 재attach 시 namespaced load 만 실행, lastSessionUserId 일치 시 더 안 함.
- 다른 user 일 때만 sync cache reset (notebook/pdfWorkspace wipe 는 sprint-3/S3
  이후 제거 — namespacing 이 격리).

### A4. ACA cold start 보호
- `AUTH_SESSION_REQUEST_TIMEOUT_MS = 45000` (45s).
- `AUTH_SESSION_MAX_AUTO_RETRIES = 3`.
- `AUTH_SESSION_WAKE_NOTICE_DELAY_MS = 2500` — 사용자에게 "깨우는 중" banner.
- 위반 = cold start 도중 false negative (clearAuthSession 발화).

### A5. userId-aware load/save (type-required load, runtime-guarded save)
- `loadStoredNotebook(userId)` / `loadPdfWorkspaceStore(userId)` 는 userId 가
  **required parameter** 라 컴파일 단계에서 enforced — 호출 site 가 userId 를
  반드시 넣어야 한다.
- `saveNotebook(notebook, userId = authSession?.user.id)` / `savePdfWorkspaceStore(userId = authSession?.user.id)`
  는 optional default + **runtime noop**: userId 가 undefined 면 그대로 return.
  즉 TS 가 모든 save 호출자에게 userId 를 강제하지는 않고, 런타임에서 session
  부재일 때 silent skip 한다.
- 위반 사례: save 시점에 session 이 없는 줄 모르고 호출 → 데이터가 어디에도
  저장되지 않은 채 흘러감 (silent). 호출자는 session attach 이후에만 의미 있는
  save 가 일어난다는 점을 기대해야 한다.

## 라이프사이클

```
boot
  authSession := undefined
  lastSessionUserId := undefined        (sprint-4/S1: marker 제거, in-memory only)

  attemptSessionRevalidation()
    → GET /api/v1/auth/me with 45s timeout
    → success: authSession = response
                applySessionTransitionForUser(userId)
    → 4xx unauthorized: authSession 그대로 undefined
    → 5xx / timeout: retry up to 3, then clearAuthSession (data 보존)

sign-in
  POST /api/v1/auth/sign-in
    → success: authSession = response
                applySessionTransitionForUser(userId)
    → fail: 에러 banner

logout
  POST /api/v1/auth/sign-out
  clearAuthSession()
    - authBootRequestId++
    - in-flight PUT abort
    - sync caches clear
    - sync failure tracker reset
    - 하지만 notebook / pdfWorkspaceStore 의 메모리 state 는 reset 안 함
      (다음 sign-in 의 applySessionTransition 에서 namespaced load 가 결정)

session attach (transition)
  applySessionTransitionForUser(newUserId)
    1. notebook := loadStoredNotebook(newUserId)
    2. pdfWorkspaceStore := loadPdfWorkspaceStore(newUserId)   (sprint-3/S2)
    3. if lastSessionUserId === newUserId → return  (같은 user 재attach)
    4. if lastSessionUserId === undefined → in-memory marker 만 기록, return
       (page lifetime 의 first attach — sync cache 가 empty 라 reset 불필요)
    5. (다른 user — page lifetime 안의 A→B 전환) sync caches clear + in-flight
       abort + failure tracker reset (sprint-3/S3 이후 pdfWorkspace wipe 제거)
    6. lastSessionUserId := newUserId (in-memory only)
```

## 외부 의존

- **Notebook / PdfWorkspace**: load/save 시 userId 필요.
- **Sync**: A→B 전환 시 abort + chain clear.
- **BE `/v1/auth/me`, `/v1/auth/sign-in`, `/v1/auth/sign-out`** in `apps/api/src/auth/`.
- **MySQL user 테이블**: session ↔ user binding 의 BE SoT.

## 변경 이력

- sprint-2/S3 — `lastSessionUserStorageKey` marker 도입, wipe-on-transition 1차 완화
- sprint-3/S1 — notebook namespacing, wipe 제거
- sprint-3/S2 — pdfWorkspace namespacing, sprint-2 wipe 의 마지막 가지 제거
- sprint-3/S3 — `applySessionTransitionForUser` 의 pdfWorkspace wipe 제거. marker 는 migration owner gate 이유로 유지, deprecation 의도 주석.
- sprint-4/S1 — `lastSessionUserStorageKey` marker write/read + `migrateLegacy*ForUser` helper 2개 완전 제거. `lastSessionUserId` 는 in-memory only.

## Open questions / TODO

- account merge / id rotation 정책 미정 — 별도 sprint.
- session timeout 정책 (BE cookie expiry vs FE re-attach) 명시 필요.
