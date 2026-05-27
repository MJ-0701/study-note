# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject.

## 진행 상황 (2026-05-27) — **🎯 Layer D 분해 완료. 4.45k (4,448 / -59.74%)** + sprint-22 prod deploy (fe-v0.1.25) + **운영지표 dashboard PR #84 open (코드리뷰 대기)**

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 | ✅ merged (PR #58) |
| **B/slice-2a. canvas mount** | 2026-W22-sprint-1 | ✅ merged (PR #59) |
| **B/slice-2b. classDate** | 2026-W22-sprint-2 | ✅ merged (PR #60) |
| **B/slice-2c. ink stroke** | 2026-W22-sprint-3 | ✅ merged (PR #61) |
| **B/slice-2d. drill highlight** | 2026-W22-sprint-2 | ✅ merged (PR #62) |
| **B/slice-2e. star mark** | 2026-W22-sprint-3 | ✅ merged (PR #63) |
| **B/slice-2f/i. chart-content** | 2026-W22-sprint-4 | ✅ merged (PR #64) |
| **B/slice-2f/ii. markdown-table** | 2026-W22-sprint-2 | ✅ merged (PR #65) |
| **B/slice-2g. chart-widget** | 2026-W22-sprint-3 | ✅ merged (PR #66) — **8k 달성** |
| **B/slice-2g-table. table-widget** | 2026-W22-sprint-5 | ✅ merged (PR #67) |
| **B/slice-2f/iii. simple-widget** | 2026-W22-sprint-6 | ✅ merged (PR #68) |
| **B/slice-2f/iv. page-render helper** | 2026-W22-sprint-7 | ✅ merged (PR #69, main=942d81a) — **7k 달성** |
| **B/slice-2f/iv-bis. renderPdfWorkspacePage** | 2026-W22-sprint-8 | ✅ main 직 push (main=7b5f3cb) — Layer B closed, 6.7k 달성 |
| **C/slice-1. subject-cards leaves** | 2026-W22-sprint-9 | ✅ merged (PR #70, main=d634ac8) — **6.5k 달성** |
| **C/slice-2. sidebar** | 2026-W22-sprint-10 | ✅ merged (PR #71, main=2c6ca94) — **6.3k 달성** |
| **C/slice-3. home + intake** | 2026-W22-sprint-11 | ✅ merged (PR #72, main=ee6f492) — **6k 달성** |
| **C/slice-4. subject-class** | 2026-W22-sprint-12 | ✅ merged (PR #73, main=9e51fe5) — **5.8k 달성** |
| **C/slice-5. subject-summaries** | 2026-W22-sprint-13 | ✅ merged (PR #74, main=a034a00) — **5.7k 달성** + safe-url 신규 |
| **C/slice-6. subject-memorize** | 2026-W22-sprint-14 | ✅ merged (PR #75, main=e7e894c) — **5.6k 달성** |
| **C/slice-7. subject-mcp** | 2026-W22-sprint-15 | ✅ merged (PR #76, main=930eba4) — **50% 감축 돌파 (5,506)** + Object.freeze + 3-layer href defense |
| **C/slice-8. subject-week** | 2026-W22-sprint-16 | ✅ merged (PR #77, main=15e70bf) — **5.5k 충분 달성 (5,403)** |
| **C/slice-9. pdf-library** | 2026-W22-sprint-17 | ✅ merged (PR #78, main=6aff0f5) — **5.1k 인접 (5,161)** |
| **C/slice-10. quick-note** | 2026-W22-sprint-18 | ✅ merged (PR #79, main=a12d62e) — **🎯 5k 달성 (4,959)** + Layer C closed |
| **D/slice-1. notebook storage** | 2026-W22-sprint-19 | ✅ merged (PR #80, main=52cb472) — **4.88k (4,877)** + Layer D 진입 |
| **D/slice-2. auth boot module** | 2026-W22-sprint-20 | ✅ merged (PR #81, main=a5e834a) — **4.79k (4,785)** + cold-start fix |
| **D/slice-3. sidebar cache + UI ephemeral** | 2026-W22-sprint-21 | ✅ merged (PR #82, main=3b25db4) — **4.71k (4,710)** + Codex bot 👍 PASS |
| **D/slice-4. user-notes sync caches** | 2026-W22-sprint-22 | ✅ merged (PR #83, main=f62cf3e) — **🎯 4.45k (4,448)** + Codex P2 fix + bot 👍 PASS |
| D/backlog. session_hint cookie (Codex P2 mitigation) | 2026-W22-sprint-20 | ✅ FE-only mitigation 머지 (`study_note_session_hint` readable cookie) |
| D/optional. drag states 6 (slice-5 잠재) | TBD | ⏸ ROI 낮음 — React migration 진입 후 결정 |
| **React migration** | next phase | ⏳ Layer D 분해 완료 → cost 재평가 진입 |

main.ts: 11,049 → **4,448** (-6,601, **-59.74%**). 🎯 **Layer D 분해 완료 (4 slice)**.

## Prod deploy 상태

- `fe-v0.1.24` (2026-05-27) — sprint-20 cold-start fix + session_hint cookie live (`main-Cwsm8q7t.js`).
- `fe-v0.1.25` (2026-05-27) — sprint-21 (sidebar cache + UI ephemeral) + sprint-22 (user-notes-sync + P2 fix) prod deploy.

## PR open — 내일 코드리뷰 대상

- **PR #84** — 관리자 운영 지표 대시보드 + Datadog server-side 조회. branch = `codex/readme-datadog-ops`.
  - `apps/api/src/admin/ops-dashboard.service.ts` 신규 (515 line + spec 165 line).
  - `GET /v1/admin/ops-dashboard` (master/admin guard). DD key 서버 only.
  - 9 card (APM × 3 + log-derived × 3 + RUM × 3). `not_configured` graceful fallback.
  - check: BE build PASS / spec 142 PASS (4 신규) / web build PASS.
  - 배포 시 user 작업 = ACA secret `dd-app-key` 추가 + env `DD_APP_KEY=secretref:dd-app-key`.
  - Codex worktree 의 README.md 한→영 rewrite (288→205 line) revert 완료 (KO-first 정책 보존).

## 활성 작업 = ① PR #84 코드리뷰 (내일) + ② React migration cost 재평가

분해 phase 결산:
- Layer A (routing/shell) — 1 slice
- Layer B (PDF workspace) — 14 slice (sprint-1~8)
- Layer C (subject views) — 10 slice (sprint-9~18, 🎯 5k 달성 at slice-10)
- Layer D (storage + identity + sync) — 4 slice (sprint-19~22, 🎯 분해 phase 완료)
- 누적 -6,601 line / -59.74%

다음 결정 candidate:
1. React migration 진입 (cost 재평가 + provider/component 설계). audit = `.sfs-local/sprints/react-migration-audit.md` (53 data-action site / 13 listener / 9 ambient let / route × action 분포). 권장 = **Option B + 첫 route `subject-mcp`**.
2. 잠재 slice-5 (drag states 6) — 60 line 추가, ROI 낮음.
3. ambient identity (authSession/authMode/loginFeedback/notebook/pdfWorkspaceStore) module 화 — React migration 비용 분담.

## SFS 0.6.121 정책 ambient

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Executable Action Ownership
- Review autopilot rework loop
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md`
