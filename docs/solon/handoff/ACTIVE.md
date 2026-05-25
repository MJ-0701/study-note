# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject.

## 진행 상황 (2026-05-26) — **8k 달성 + 7k 인접**

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
| **B/slice-2f/iii. simple-widget** | 2026-W22-sprint-6 | ✅ merged (PR #68, main=cab1a4f) — **7k 인접** |
| **B/slice-2f/iv. container/page** | TBD | ⏳ 다음 sprint (마지막 layer B big segment, ~410 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 |

main.ts: 11,049 → **7,107** (-3,942, **-35.68%**). 9k + 8k 달성, 7k 인접
(잔여 -107). slice-2f/iv 으로 7k 달성 + layer B 완료.

## 활성 작업 = layer B/slice-2f/iv (container/page) — 마지막 layer B segment

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2f-iii-simple-widget-cleanup-sticky-textbox-checklist-eraser/20260526/retro.md`

### slice-2f/iv scope

- renderPdfWorkspacePage (205 line) + renderPdfMaterialStatus (48) +
  renderPdfToolbar (77) + renderPdfFrameStack (31) + renderToolButton (28) +
  renderFullscreenToggleButton (17). ~406 line scope.
- 위험도 = 중 (다른 widget render call site multi-pattern).
- main.ts -300~-400 estimate → ~6,700~6,800. **7k 달성 + layer B 완료**.

### slice-2f/iii 학습 (다음 sprint 적용)

- **R-T 신규 backlog** — brainstorm 단계 AC9 multi-layer defense table 사전
  정의 (id escape + event attr + double-quote breakout + PII no-log default).
  slice-2f/iii Gate 3 9 round → 다음 sprint 감소 target.
- chart-widget + table-widget + simple-widget 모두 Context+Callbacks +
  단방향 leaf import 일관.
- DOM-parse parametrized negative test 패턴 5 surface × 2 payload class.

### slice-2f/iii 결과 (참고)

- main.ts -270 line (7,377 → 7,107). simple-widget.ts ~330 line / 9 export +
  spec 14 case (5 invariant 1:1).
- AC9 4-layer closure (user content + id/subjectId attribute + EraserShape
  bounded + PII no-log).
- Gate 3 = 9 round / Gate 6 = 3 round. @codex 👍.

## SFS 0.6.121 정책 ambient

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Executable Action Ownership
- Review autopilot rework loop
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md`
