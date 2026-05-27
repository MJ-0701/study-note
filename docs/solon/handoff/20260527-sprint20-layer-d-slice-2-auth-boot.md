# Handoff — Layer D/slice-2 (auth boot module) — sprint-W22-sprint-20

> 다음 fresh session 진입용 인계 문서. SessionStart hook 의 ACTIVE.md auto-inject 이후 본 문서를 읽고 첫 명령 실행.

## 0) 현재 상태 (HEAD = main / 2026-05-27 15:26 KST)

- main: `52cb472` (sprint-W22-sprint-19 PR #80 squash merged).
- main.ts: **4,877 line** / -55.85% (11,049 → 4,877, **누적 -6,172**).
- 전체 spec: **518 PASS / 0 fail**.
- typecheck: EXIT=0.
- branch: `main` (working tree clean).

## 1) 진행 결산

| Layer | Sprint | 상태 |
|---|---|---|
| A. routing/shell | 2026-W21-sprint-2 | ✅ merged (PR #57) |
| B (slice-1~iv-bis) | 2026-W22-sprint-1~8 | ✅ closed |
| C (slice-1~10) | 2026-W22-sprint-9~18 | ✅ closed — **🎯 5k 달성** at slice-10 |
| **D/slice-1. notebook storage** | **2026-W22-sprint-19** | **✅ merged (PR #80, main=52cb472) — 4.88k** |
| D/slice-2. auth boot module | next | ⏳ **진입 대상** |
| D/slice-3. sidebar cache + UI ephemeral | TBD | backlog |
| D/slice-4. pdfWorkspaceStore 잔여 | TBD | backlog |

## 2) 다음 sprint = sprint-W22-sprint-20 (Layer D/slice-2)

### 2.1 Scope = auth boot module

- 대상: main.ts L368~382 + L621 + L622~ + L1058~ + L1096~ + L1108~ + L1123~ + L1203~ + L1227~ → `apps/web/src/auth/sessionBoot.ts` (확장) 또는 신규 `apps/web/src/auth/sessionState.ts`.
- 글로벌 mutable state (8개):
  - `authSession: AuthSession | undefined` (L368)
  - `authBootState: AuthBootState` (L376)
  - `authBootNotice: AuthBootNotice = "checking"` (L377)
  - `authBootRequestId = 0` (L378)
  - `authBootNoticeTimer: ReturnType<typeof setTimeout> | undefined` (L379)
  - `authBootRetryTimer: ReturnType<typeof setTimeout> | undefined` (L380)
  - `authMode: AuthMode = "login"` (L382)
  - `authExpiryHandled = false` (L621)
- 관련 fn (8~9개):
  - `handleAuthExpiredFromSync` (L622)
  - `applySessionTransitionForUser` (L1002) — saveNotebook + loadStoredNotebook 호출 site (sprint-19 wiring 연계, 주의)
  - `clearAuthSession` (L1058)
  - `clearAuthBootTimers` (L1096)
  - `cancelAuthBootRequest` (L1108)
  - `revalidateStoredSession` (L1123) — async
  - `beginAuthBootRequest` (L1203)
  - `scheduleAuthBootRetry` (L1227)

### 2.2 기존 module (이미 분리됨, 확장 대상)

- `apps/web/src/auth/sessionBoot.ts` — pure helper (state machine label only): `AuthBootState` / `AuthBootNotice` / `readAuthSessionHint` / `writeAuthSessionHint` / `clearAuthSessionHint` / `getInitialAuthBootState` / `getAuthBootStateForMode` / `getAuthBootRetryNotice`.
- `apps/web/src/auth/authSession.ts` — type + DTO validator: `AuthSession` / `AuthMode` / `LoginFeedback` / `isAuthMeResponse` / `meResponseToSession`.
- `apps/web/src/auth/authApi.ts` — HTTP client.
- `apps/web/src/auth/authViews.ts` — render fn.

→ slice-2 는 main.ts 의 **mutable state + lifecycle fn** 을 위 module 에 통합. 신규 file 보다 sessionBoot.ts 확장 권장 (또는 auth/sessionState.ts 신설).

### 2.3 예상 numeric target

- main.ts 4,877 → **4,720~4,770** (-110~150).
- spec ~16~22 case (state transition + timer side-effect + retry).

### 2.4 위험

- **renderApp() callback 연쇄**: clearAuthSession / clearAuthBootTimers / revalidateStoredSession 모두 main.ts 의 renderApp() 직접 호출. sprint-19 의 onErrorChanged callback 패턴 적용 → ctx callback 으로 전환.
- **applySessionTransitionForUser**: saveNotebook / loadStoredNotebook 호출 site. sprint-19 의 persistNotebook helper 와 의존성. wiring 신중.
- **timer side-effect**: setTimeout 의 ReturnType + clearTimeout 호출 — module-private 으로 옮길 때 test seam (FakeTimer 또는 setTimeout 주입) 필요.
- **AbortController + request ID race**: beginAuthBootRequest / cancelAuthBootRequest / scheduleAuthBootRetry 의 concurrency — state transition contract 명시 필수 (sprint-19 R1 lesson).

### 2.5 정책 lesson (sprint-19 누적)

- **plan AC6 PII regex 정확히 `console\.` 로 작성** (`console.*` 느슨 → 주석도 hit).
- **export 정확 숫자 + test-only approved exception 명시** (`__resetXForTesting__` dunder + Testing suffix).
- **state transition contract = 표로 7+ 케이스** (sprint-19 R1 lesson — sprint-20 더 큼).
- **implement.md inline embed pattern** (raw output + source body + spec body) → Gate 6 self R1 1발 PASS.
- **brainstorm.md ready status + §1-§7 채움** — draft 상태면 Gate 3 R1 partial.

## 3) 첫 next command (다음 세션)

순서 그대로:

```bash
# 1. branch 시작
git checkout main
git pull origin main
git checkout -b refactor/layer-d-slice-2-auth-boot

# 2. SFS sprint start
sfs start "layer D/slice-2 — auth boot module (authSession + authBoot* timer + sessionTransition + revalidate)"
sfs brainstorm --simple "layer D/slice-2 — auth boot module"
# (brainstorm.md ready status 까지 채우기 — sprint-19 R1 lesson)

sfs plan
# (plan.md AC1~AC10 작성, AC6 = console\. 정확 regex, AC2 = export 정확 숫자 + test-only approved exception 명시)

# 3. source-excerpt 작성
# .sfs-local/sprints/<id>/source-excerpt-auth-boot.md — L368~382 + L621 + 8 fn 의 line anchor

# 4. Gate 3 self + cross
sfs review --gate 3 --stage self --executor codex
sfs review --gate 3 --stage cross --executor codex

# 5. 구현 → typecheck → spec → full regression → evidence-gate6.md → Gate 6
sfs review --gate 6 --stage self --executor codex
sfs review --gate 6 --stage cross --executor codex

# 6. retro → commit → push → PR → @codex review → merge
sfs retro
git add ... ; git commit -m "refactor(web): sprint-W22-sprint-20 — main.ts Layer D/slice-2 auth-boot 추출 (...)"
git push -u origin refactor/layer-d-slice-2-auth-boot
gh pr create --title "..." --body "..."
gh pr comment <num> --body "@codex review"
# bot PASS 후
gh pr merge <num> --squash --auto
```

## 4) 인계 외 작업 = 금지

본 handoff scope = artifact 작성 + state/blocker/first next command 기록 만. PR/merge/implement/deploy/monitor loop **시작 안 함**. fresh session 에서 user 의 `ㄱㄱ` 또는 동등 명령 후 진입.

## 5) 참고 file

- `docs/solon/handoff/ACTIVE.md` — SessionStart auto-inject (sprint progress table).
- `CLAUDE.md` — SFS adapter SSoT.
- `docs/solon/layer-d-slice-1-notebook-storage.../20260527/retro.md` — sprint-19 retro (R1/R2 lesson).
- `apps/web/src/app/notebook-storage.ts` — sprint-19 lineage 참고 (module-private state + 7+1 export + state transition contract).
- `apps/web/src/pdf-workspace/annotation-sync.ts` — original C-lineage (sprint-1 module-private state pattern).
- `.sfs-local/sprints/2026-W22-sprint-19/{plan,implement,evidence-gate6,source-excerpt-notebook-storage}.md` — sprint-19 artifact 전체.

---

**STOP**. 본 인계문서 작성으로 sprint-20 진입 준비 완료. 다음 세션 ㄱㄱ.
