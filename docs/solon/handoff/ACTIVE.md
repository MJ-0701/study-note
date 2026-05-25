# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. layer 진행
> 시 매 sprint close 후 다음 sprint handoff 로 갱신.

## 진행 상황 (2026-05-25) — **8k 달성 + 7k 인접**

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57, main=25f3cb9) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 | ✅ merged (PR #58, main=2fd4a0d) |
| **B/slice-2a. canvas mount + workspace state** | 2026-W22-sprint-1 | ✅ merged (PR #59, main=c84439e) |
| **B/slice-2b. classDate + touch/swipe + nav** | 2026-W22-sprint-2 | ✅ merged (PR #60, main=e8c1f87) |
| **B/slice-2c. ink stroke + pen RAF batch** | 2026-W22-sprint-3 | ✅ merged (PR #61, main=f24a20b) |
| **B/slice-2d. drill highlight** | 2026-W22-sprint-2 | ✅ merged (PR #62, main=d1bba31) |
| **B/slice-2e. star mark** | 2026-W22-sprint-3 | ✅ merged (PR #63, main=c23dd6c) |
| **B/slice-2f/i. chart-content leaf** | 2026-W22-sprint-4 | ✅ merged (PR #64, main=45080e8) |
| **B/slice-2f/ii. markdown-table leaf + wrapper 폐기** | 2026-W22-sprint-2 | ✅ merged (PR #65, main=e1aded1) |
| **B/slice-2g. chart-widget** | 2026-W22-sprint-3 | ✅ merged (PR #66, main=d56e330) — **8k 달성** |
| **B/slice-2g-table. table-widget** | 2026-W22-sprint-5 | ✅ merged (PR #67, main=effad39) — **7k 인접** |
| **B/slice-2f/iii. simple widget** | TBD | ⏳ 다음 sprint 후보 (위험도 낮음, ~220 line) |
| **B/slice-2f/iv. container/page** | TBD | ⏳ 마지막 큰 segment (~410 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **7,377** (-3,672, **-33.23%**). 9k + 8k 모두 달성.
7k 인접 (잔여 -377). slice-2f/iii (~220) 또는 slice-2f/iv (~410) 으로
7k 달성 가능.

## 활성 작업 = layer B/slice-2f/iii sprint (simple widget cleanup) **권장**

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2g-table-table-render-widget/20260525/retro.md`

### 후보 1: slice-2f/iii — simple widget cleanup (권장)

- scope = renderStickyNote + renderTextBox + renderChecklist + renderEraser*
  (eraser cursor / sub-toolbar / shape button) ~220 line scope.
- 위험도 = 낮음 (단순 render 함수, state mutate 적음).
- 7k target 달성 가능.

### 후보 2: slice-2f/iv — container/page

- scope = renderPdfWorkspacePage + renderPdfMaterialStatus + renderPdfToolbar
  + renderPdfFrameStack + renderToolButton + renderFullscreenToggleButton.
  ~410 line. 다른 widget 의존 — 마지막 분리.

### slice-2g-table 학습

- chart-widget 패턴 직접 적용 성공 (Context+Callbacks + 단방향 leaf).
- AC9 4-layer security (chart-widget 의 3-layer + PII no-logging).
- raw command output capture (G6 evidence packaging 표준).
- comment-excluded grep evidence pattern.
- R-R 신규 (Gate 6 evidence packaging 표준화 backlog).

### slice-2g-table 결과 (참고)

- main.ts -334 line (7,711 → 7,377). table-widget.ts 494 line / 16 export +
  2 private + spec 14 case (7 invariant 1:1). Gate 3 self R3 + cross R2,
  Gate 6 self R2 + cross R1 PASS. @codex 👍.

### slice-2g 결과 (참고)

- main.ts -975 line. chart-widget.ts 1,181 line / 29 export. **8k 달성**.

## SFS 0.6.121 정책 ambient

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Executable Action Ownership
- Review autopilot rework loop
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md`
