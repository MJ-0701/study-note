---
phase: handoff
sprint_id: "2026-W20-sprint-7"
goal: "MCP onboarding handoff α — install/auth/smoke 연결"
branch: "feature/sprint-7-mcp-onboarding-handoff"
created_at: "2026-05-14T20:50:00+09:00"
purpose: "cross-PC 재개용 git-tracked handoff. `.sfs-local/` gitignored 대응."
---

# sprint-7 handoff — cross-PC 재개 가이드

`.sfs-local/sprints/2026-W20-sprint-7/{brainstorm,plan,review}.md` 는 gitignored 라
다른 PC 에서 직접 접근 불가. 본 문서가 핵심 lock + 다음 작업 entry point.

## 1. 진행 상태 (2026-05-14 기준)

| slice | scope | status | commit |
|:--|:--|:--|:--|
| slice-1 | gate UX 3버튼 + dismiss state machine + MCPDisconnectedCard | ✓ done | `0b7c41a` |
| slice-2 | onboarding secret-handling 카피 (S1/S2/S3) + `#trouble` anchor | ✓ done | `bd028f3` |
| slice-3 | `smoke-mcp-onboarding` 신규 (AC3) | ▢ next-up | — |
| slice-4 | cookie-jar 헬퍼 + `smoke-backend-contract` / `smoke-pdf-workspace` rewrite (AC4/AC5) | ▢ 대기 | — |

branch: `feature/sprint-7-mcp-onboarding-handoff`. main 기준 ahead 2 (slice-1 + slice-2).
push 완료, origin tracking 설정 끝.

## 2. 다른 PC 재개 절차

```sh
git fetch origin
git switch feature/sprint-7-mcp-onboarding-handoff
pnpm install
# Claude Code 에 "sprint-7 slice-3 진행" 입력
```

## 3. brainstorm §9 lock (변경 금지)

| 결정 | 값 |
|:--|:--|
| sprint-7 scope size | **B** — full handoff α (leg 1+2+3) + smoke sub-slice (2 carryover rewrite) |
| first-time gate dismiss 정책 | **사용자 명시 3버튼** — 영구 (completed) / 영구 (guide 는 storage 미변경) / 임시 (deferred) |
| leg 2 (MCP 미연결 감지) | **user-driven 3버튼 gate** (backend signal 없음; heartbeat 은 sprint-8+ extension) |
| docker-compose name chore | **별도 chore** (본 sprint 미포함) |

## 4. slice-1 / slice-2 micro 결정 (이미 적용, 참고)

- localStorage key = `study-note.mcp.onboarding-completed.v1`
- sessionStorage key = `study-note.mcp.onboarding-deferred.v1`
- spec runner = `node --experimental-strip-types --no-warnings --test` (vitest 부재 대응)
- deep-link target = `<section id="trouble">` (h2 의 `section-trouble` id 유지)
- secret-handling 카피 = aside data-secret-handling-id="S1|S2|S3"
- 검증 스크립트 = `pnpm test:web-gate` (12 case) + `pnpm test:web-onboarding-copy` (6 case)

## 5. slice-3 spec — smoke-mcp-onboarding 신규

**파일**:
- `scripts/smoke-mcp-onboarding.mjs` (신규)
- `package.json` (script lane 추가)

**AC3 시나리오** (모두 1개 스크립트 안에서 순차 실행):

| ID | 시나리오 | 환경 | 기대 |
|:--|:--|:--|:--|
| a0 | DB-readiness precondition | `prepareSmokeDatabase("mcp-onboarding")` + seed master user (학번 `20260001`) | DB up + SELECT 로 seeded row 확인 |
| a | happy path (handshake) | env = seeded 학번 | `apps/mcp/dist/index.js` spawn 성공 + stdio JSON-RPC handshake |
| b | tools/list | a 의 동일 spawn | 응답에 `get_persona_prompt`, `get_chunks` 포함 |
| c | env missing | `STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER` 미설정 | exit 1 + stderr `missing` 매칭 |
| d | env format invalid | env = `abc12345` | exit 1 + stderr `format invalid` 매칭 |
| e | DB 미존재 학번 | env = `99999999` (a0 의 seed 외) | exit 1 + stderr generic `owner not authorized` (raw 학번 echo 없음) |
| f | AUTH_DEV_DISABLED | env = seeded 학번 + `STUDY_NOTE_AUTH_DEV_ENABLED=false` | exit 1 + stderr disabled 메시지 |

**security 추가 assertion**: 각 negative 시나리오의 stderr 가 raw 학번 string (`99999999`,
`abc12345` 등) 을 echo 하지 않음 (`assert(!stderr.includes(rawStudentNumber))`).

**package.json**:
```json
"smoke:mcp-onboarding": "pnpm --filter @study-note/corpus build && pnpm --filter @study-note/mcp build && node scripts/smoke-mcp-onboarding.mjs"
```

**검증 통과 기준**: 스크립트 exit 0 + console 마지막 줄 `MCP onboarding smoke passed`.

**참고 파일**:
- `apps/mcp/src/owner.env.ts` — 5 reject path (missing/format/devUserFlag false/missing
  user/DB error) 의 stderr 메시지 정의. smoke 가 그대로 검증.
- `scripts/smoke-db.mjs` — `prepareSmokeDatabase` 헬퍼.
- `scripts/smoke-mcp-tool-list.mjs` / `smoke-mcp-fail-closed.mjs` / `smoke-mcp-env-validate.mjs` —
  유사 패턴 reference (이미 존재).

**예상 LOC**: ~220.

## 6. slice-4 spec — cookie-jar + smoke 2건 rewrite

**파일**:
- `scripts/smoke-cookie-jar.mjs` (신규 — Set-Cookie 파싱 + Cookie 헤더 자동 첨부)
- `scripts/smoke-backend-contract.mjs` (skip guard 제거 + cookie-auth rewrite)
- `scripts/smoke-pdf-workspace.mjs` (skip guard 제거 + cookie-auth rewrite)

**AC4** (`smoke:backend`):
- 경로 갱신: `/auth/login` → `/v1/auth/sign-in`, `/auth/logout` → `/v1/auth/sign-out`,
  `/me` → `/v1/auth/me`.
- 응답 shape: `login.user.displayName` → `login.name`, `login.user.id` → `login.userId`,
  `login.user.studentNumber` → `login.studentNumber`. body 에 `token` 없음.
- 인증: Bearer 헤더 제거 → `Cookie:` 헤더로 전환 (cookie-jar 헬퍼 사용).
- token 추출: sign-in 응답의 `Set-Cookie` 헤더에서 `study_note_session=...` 파싱.

**AC4-amend (security assertion)**:
- sign-in 응답 body 에 token-shaped 값 없음.
- `Set-Cookie` 가 `HttpOnly` + `SameSite=Lax` (또는 env lock 값) + production-like 모드
  (`NODE_ENV=production`) 에서 `Secure` 포함.
- Bearer 헤더 단독 요청 → 401 (cookie-only enforcement regression guard).
- backend stdout/stderr 가 raw cookie 토큰 hex 미포함.

**AC5** (`smoke:pdf-workspace`):
- 로그인 텍스트 assertion: 현행 `<h1>study-note</h1>` (구 `'study-note 로그인'` 폐기).
- `authStorageKey` (`study-note.auth-session.v1`) 검증 블록 전체 폐기 → CDP
  `Network.setCookie` / `Network.clearBrowserCookies` 기반 cookie 시나리오로 재작성.
- `requestBackendJson` 의 Bearer 제거 + cookie 사용.

**AC5-amend (frontend session security)**:
- `localStorage` 에 `study-note.auth-session.v1` 키가 sign-in 후에도 없음.
- `document.cookie` 에서 `study_note_session` 키 미접근 (HttpOnly 검증).
- Chrome CDP `Network.getCookies` → cookie row 의 `httpOnly===true` &
  `sameSite!=='None'` confirmation.

**Landmines** (sprint-6 carryover memo 의 sprint7-smoke-rewrite 참조):
- Node `fetch` 는 cookie jar 없음 → `Set-Cookie` 헤더 수동 파싱 + 후속 request 에
  `Cookie:` 헤더 명시 첨부.
- `assertRawTokenIsNotPersisted` 는 그대로 유효 — token 만 `Set-Cookie` 에서 추출.
- backend process restart 테스트 (smoke-backend-contract 326+): cookie 가 client-side
  persist 되므로 같은 cookie 재전송 시 통과해야 함.
- `submitLogin(SEED_USER_NAME, "00000000")` 8자리 학번은 controller shield
  (`/^\d{8}$/`) 통과 → AuthService 의 401/403 기대, controller 의 400 아님.
- skip guard `STUDY_NOTE_SMOKE_ALLOW_STALE=1` override 는 작업 중 legacy 동작 비교용으로
  유지하되, 최종 commit 시 skip guard 자체를 제거.

**예상 LOC**: ~290.

## 7. retro 직전 회수 항목

- design smoke (CDP) 로 slice-1 의 gate UX 3 버튼 + slice-2 의 secret-handling-notice
  의 시각 evidence 회수. 현재 `implement.md` §3.3 / §9 에 "manual UAT 이월" 로 기록된
  부분.
- 또는 apps/web 에 vitest + jsdom + react-testing-library 도입 검토 (별도 chore — 본
  sprint 미포함).

## 8. commit cadence + push

- slice 당 1 commit (slice-1/2 패턴 그대로).
- branch `feature/sprint-7-mcp-onboarding-handoff` 유지.
- retro 시점 또는 사용자 명시 시점에 PR open
  (https://github.com/MJ-0701/study-note/pull/new/feature/sprint-7-mcp-onboarding-handoff).

## 9. 관련 메모 (host-local — 다른 PC 에서는 본 handoff 만 의존)

- `~/.claude/projects/-Users-mj-IdeaProjects-study-note/memory/project_sprint7_handoff.md`
  — host-local 진행 상태 (본 문서와 redundancy 의도, host-local 은 다음 turn 자동 inject).
- `~/.claude/projects/-Users-mj-IdeaProjects-study-note/memory/project_sprint7_smoke_rewrite.md`
  — slice-4 의 landmines 카탈로그 (sprint-6 carryover).
