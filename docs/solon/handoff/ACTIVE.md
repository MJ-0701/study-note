# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject.

## 진행 상황 (2026-05-26) — **Layer B closed. 9k+8k+7k+6.7k 달성**

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
| **B/slice-2f/iv-bis. renderPdfWorkspacePage** | 2026-W22-sprint-8 | ✅ implemented (Gate 6 in progress) — **Layer B closed, 6.7k 인접** |
| **C. subject views** | next sprint | ⏳ 다음 진입 |
| D. state/sync residual | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 |

main.ts: 11,049 → **6,689** (-4,360, **-39.46%**). **9k+8k+7k+6.7k 4 target
달성**. Layer B = 완료. 6k 호기심 잔여 -689 = Layer C 초기 정리 시 가능.

## 활성 작업 = layer C 진입 (subject views)

**전 sprint (slice-2f/iv-bis) implement** = `.sfs-local/sprints/2026-W22-sprint-8/`

### layer C 진입 후보 (다음 sprint brainstorm)

main.ts 6,689 line 의 잔존 = 비-PDF 영역. subject view (~1,200 line):
- `renderSubjectClassPage` (5,400~5,450)
- `renderSubjectSummariesPage` (~5,600)
- `renderSubjectMemorizePage` (~5,800)
- `renderSubjectMcpPage` (~5,870)
- `renderWeekPage` (~5,940)

brainstorm 단계에서 hierarchy + 우선순위 결정. layer B 패턴 (Context+Direct
imports) 재사용 가능 — risk 중-낮음.

### slice-2f/iv-bis 학습 (sprint-W22-sprint-8)

- **3-bucket dependency split** (advisor 가이드) — 1-bucket monolithic
  Context (25+ field) 거부, Direct imports (12) + Context (12 field) +
  Callbacks (없음).
- **AC9 5-layer closure** — slice-2f/iv 의 (a/b/c/d) + 본 sprint AC7 의 (e)
  (permission denylist). 6 user-content surface (S1~S6) + 1 helper trust
  boundary (TB1) + 1 negative UI assertion (PD1).
- **2 defensive escape 추가** — href escape (subjectClassPath 결과) + formatPdfTool
  output escape. 기존 코드의 latent XSS 경로 closure.
- **자동 routing**: Gate 6 cross 가 Context size cap (8~12) 보다 17 field 발견
  → autopilot patch (4 widget renderer + 2 helper → Direct imports) → 12 field
  → 재 review.

### slice-2f/iv-bis 결과

- main.ts -220 line (6,909 → 6,689). 누적 -4,360 / -39.46%.
- workspace-page.ts 300 line / 1 export + 1 type export + 1 private helper.
- WorkspacePageContext 12 field (8 lazy module-state + 1 sub-context + 3
  main.ts render hooks). Callbacks 없음 (pure render).
- workspace-page.spec.ts 19 case (a~l 군) PASS — branch combinatorics +
  AC9(e) security 1 통합 case (6 surface + TB1 + PD1) + characterization.
- Direct imports = 12 module (escapeHtml/subjectClassPath/5 page-render/
  formatSvgPoint/4 simple-widget/getSubjectPdfWorkspace/getPdfMaterialKey/
  renderInspectorStatRow/renderChartMount/renderTableMount/renderStarMark).
- Gate 3 = 4 round self / 3 round cross / 1 capture event. Gate 6 = 1+ round.

## SFS 0.6.121 정책 ambient

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Executable Action Ownership
- Review autopilot rework loop
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md`
