---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W20-sprint-7"
workspace: "mcp-onboarding-handoff-install-auth-smoke"
handoff_dir: "docs/solon/mcp-onboarding-handoff-install-auth-smoke/20260515"
goal: "MCP onboarding handoff α — install/auth/smoke 연결"
created_at: ""
last_touched_at: "2026-05-15T00:08:26+09:00"
closed_at: ""
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **slice 당 1 commit + git-tracked handoff.md 로 cross-PC 인계**. slice-1/2 가 Mac
  에서, slice-3/4 가 Windows 에서 진행됐는데 `b347fba` 의 handoff.md (`docs/solon/
  mcp-onboarding-handoff-install-auth-smoke/20260514/handoff.md`) 한 파일이 PC 전환
  뒤 충분한 entry point 였다. `.sfs-local/` workbench 가 gitignored 라 brainstorm/plan
  은 안 따라왔지만, lock 결정 4가지 + slice-3/4 spec 이 git 으로 따라온 덕에 rewriter
  가 추가 컨텍스트 없이도 진행할 수 있었다.
- **AC-driven smoke 설계 + spec 의 단일 시나리오 묶음**. slice-3 의 7 케이스 (a0/a/b/c/d/e/f)
  를 한 스크립트 안에서 순차 실행하니 DB seed → spawn → handshake → negative case 일관성이
  보장됐다. slice-4 의 AC4-amend/AC5-amend 도 spec 그대로 통과.
- **PII guard double-check 패턴**. negative case 마다 `stderr.includes(rawValue)`
  미echo 검증을 매번 명시 — slice-3 의 d/e, slice-4 의 backend log scan 둘 다 동일.
  이 패턴 덕에 OWNER_UNRESOLVED / AUTH_DENIED 같은 다른 path 도 안전하게 generic
  메시지로 통일됨을 보장.
- **skip guard ALLOW_STALE override 컨벤션**. rewrite 중에는 legacy 와 비교 가능하게
  남기고, 최종 commit 시 guard 자체 제거. 이번 slice-4 처럼 응답 shape drift 가 누적된
  경우에도 안전망 역할.

## 2. 문제

- **skip guard 가 latent bug 를 sprint-6 까지 가렸다**. smoke-backend-contract 가
  cookie-auth migration 만이 아니라 ① NORMAL user upsert 의 `devUserFlag` 누락
  (schema default=false 라 AuthService 가 사후 403), ② `/v1/admin/users` 가 wrapper
  없는 array 직접 리턴이라는 contract drift 까지 누적해서 가지고 있었다. cookie scope
  외 항목을 따로 다루지 않으면 한 slice 안에 잡일이 같이 들어온다.
- **Node 18+ Windows EINVAL — cross-PC handoff 의 첫 obstacle**. `scripts/smoke-db.mjs`
  의 `run()` 이 `npmCommand()` 가 win32 에서 리턴하는 `npm.cmd` 를 `shell: true` 없이
  spawn → `EINVAL`. Mac 에서는 `npm` (확장자 없음) 이라 안 보였던 platform-only bug 가
  cross-PC 의 첫 cycle 에서 모든 smoke 를 막아세웠다 (`1ddc6c6` 별 commit).
- **vite random port 와 backend default CORS allowlist mismatch**. smoke-pdf-workspace
  가 `5173 + Math.random()*1000` 로 vite 를 띄우는데 backend default 는 5173 만 허용.
  random port 가 정확히 5173 일 때만 통과 → 실질 항상 실패였을 가능성. `CORS_ALLOWED_ORIGINS`
  명시 주입으로 우회.
- **Chrome path hardcoded Mac**. `/Applications/Google Chrome.app/...` 가 win32 에서
  의미 없음. cross-PC sprint 인데 platform check 가 없었던 게 sprint-2 ~ sprint-6 동안
  notice 안 됨. 이번에 `process.platform` 분기 + `CHROME_PATH` env override 로 패치.
- **PowerShell `2>&1` + `Select-String` buffering**. smoke 가 끝까지 출력 안 보여서
  hang 으로 오인. CLAUDE.md PowerShell 노트에 "Avoid 2>&1 on native executables" 가
  명시돼 있는데도 reflex 적으로 사용했고, `Select-String` 까지 더해지면서 전체 파이프가
  task 종료까지 flush 안 됐다.

## 3. 시도할 것

- **scripts/smoke-spawn.mjs 단일 helper 로 spawn 표준화**. `shell: process.platform === "win32"`
  분기가 smoke-db.mjs / smoke-pdf-workspace.mjs 두 곳에 중복. helper 1 곳에서 결정하고
  DEP0190 escape 패턴 마이그레이션도 같이 흡수.
- **skip-guard 해제 cycle 의 contract sanity audit**. smoke 가 skip 풀리는 시점에 (a)
  응답 shape, (b) DB schema 의 default 값 변화, (c) cookie/Auth 외 carry-over drift 까지
  체크리스트 한 줄로 명시. sprint-7 의 NORMAL user devUserFlag 같은 ambush 회피.
- **random-port smoke 의 CORS_ALLOWED_ORIGINS 기본 주입**. vite + backend orchestration
  helper 에 자동 inject. 새 smoke 추가 시 잊지 않게.
- **PowerShell smoke 실행 컨벤션 정리**. CLAUDE.md PowerShell 노트의 "no 2>&1 on native"
  + "Out-File + run_in_background" 사용을 sprint kit 에 명시. session memory 에도 1회 commit.

## 4. 이어갈 것

- **CDP design smoke (handoff §7)** — slice-1 의 gate UX 3 버튼 + slice-2 의
  secret-handling-notice 의 시각 evidence 회수. 현재 implement.md §3.3 / §9 에
  "manual UAT 이월" 로 기록. 다음 sprint 의 별 chore.
- **apps/web 에 vitest + jsdom + react-testing-library 도입 검토** — 현재
  `node --experimental-strip-types --no-warnings --test` 로 spec 을 돌리는데 jsdom
  부재로 component 시나리오 일부가 manual 화. 별 chore.
- **Windows process tree kill** — smoke-pdf-workspace cleanup 에서 vite 의 child tree
  (npm.cmd → pnpm.cmd → node) 가 SIGTERM 만으로 완전 정리 안 됨. `taskkill /F /T /PID`
  패턴 도입 검토.
- **DEP0190 deprecation (`shell: true` + args)** — 향후 Node 에서 args escape 요구.
  smoke-spawn.mjs 표준화와 묶어서 단계적 마이그레이션.
- **prisma 6 → 7 major upgrade** — smoke 출력에 "Update available 6.19.3 -> 7.8.0"
  경고. 별 chore.

## 5. 종료 체크

- [ ] report 가 최신이다 — sprint-7 report 는 Mac 의 .sfs-local 에 있고 Windows 로 안
  넘어옴. 다음 sprint 의 retro close 적용 또는 별 promotion 필요.
- [ ] review 조치가 완료 또는 이월됐다 — review.md 도 동일하게 Mac workbench-only.
  본 retro 의 §4 (이어갈 것) 가 carryover 표면.
- [ ] workbench 가 접혔다 — `sfs retro` close adapter 가 review.md 부재로 exit 8.
  본 retro 는 `--draft` 산출물이며, close 는 Mac 측 다음 세션에서 수행 후보.
