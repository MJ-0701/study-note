# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject.

## 진행 상황 (2026-05-27) — **Layer D slice-2 merged. 4.79k (4,785 / -56.69%)**

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
| D/slice-3. sidebar cache + UI ephemeral | next sprint | ⏳ 다음 진입 (sidebarTermsCache + hotkeyHelpModalOpen + UI ephemeral) |
| D/slice-4. pdfWorkspaceStore 잔여 | TBD | ⏳ backlog (userNotesPutTimers + syncFailureTracker 등) |
| D/backlog. session_hint cookie (Codex P2 mitigation) | 2026-W22-sprint-20 | ✅ FE-only mitigation 포함 머지 (`study_note_session_hint` readable cookie) |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 |

main.ts: 11,049 → **4,785** (-6,264, **-56.69%**). Layer D 진행 중.
Layer D/slice-2 (auth boot) closed. 다음 = Layer D/slice-3 (sidebar cache + UI ephemeral).

## 활성 작업 = Layer D/slice-3 (sidebar cache + UI ephemeral)

## SFS 0.6.121 정책 ambient

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Executable Action Ownership
- Review autopilot rework loop
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md`
