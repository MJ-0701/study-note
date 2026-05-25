# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. layer 진행
> 시 매 sprint close 후 다음 sprint handoff 로 갱신.

## 진행 상황 (2026-05-25) — **8k target 달성**

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
| **B/slice-2g. chart-widget (render + handler + SVG)** | 2026-W22-sprint-3 | ✅ merged (PR #66, main=d56e330) — **8k 달성** |
| **B/slice-2g-table. table render widget** | TBD | ⏳ 다음 sprint 후보 (위험도 중-높음, ~500 line) |
| **B/slice-2f/iii. simple widget** | TBD | ⏳ backlog (sticky/textbox/checklist/eraser ~220 line) |
| **B/slice-2f/iv. container/page** | TBD | ⏳ backlog (renderPdfWorkspacePage ~410 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **7,711** (-3,338, **-30.21%**). 9k target + **8k
target 모두 달성**. 다음 호기심 target = 7k (잔여 -711, slice-2g-table /
slice-2f/iii / slice-2f/iv 중 1 sprint 로 달성 가능).

## 활성 작업 = layer B/slice-2g-table sprint (table render widget) **권장**

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2g-chart-render-widget/20260525/retro.md`

### 후보 1: slice-2g-table — table render widget (권장)

- scope = renderTable (170+) + renderTableMount + refreshTableWidgets +
  readTableDataFromDom + tableContentDebounceMap + table event handler
  (addTable/removeTable/applyTableMove/applyTableCollapseToggle/
  scheduleTableContentUpdate/applyAdd/DeleteTableRow/Column 등). ~500 line.
- markdown-table leaf (slice-2f/ii) 이미 분리. chart-widget 패턴 직접 적용.
- 위험도 = 중-높음 (input cell DOM 조작 + debounce + add/delete row/col).
- main.ts -400~-500 estimate → 7,711 → ~7,200. **7k target 가능**.

### 후보 2: slice-2f/iii — simple widget cleanup

- scope = renderStickyNote + renderTextBox + renderChecklist + renderEraser*.
  ~220 line. 위험도 낮음.

### 후보 3: slice-2f/iv — container/page

- scope = renderPdfWorkspacePage + renderPdfMaterialStatus + renderPdfToolbar
  + renderPdfFrameStack + renderToolButton + renderFullscreenToggleButton.
  ~410 line. 위험도 중 (다른 widget 의존, 마지막).

### slice-2g 학습 (다음 sprint 적용)

- **R-K (capsule budget) + R-M (source 인용) + R-N (plan compaction) 효과**
  — 적용 일관, Gate 3 = 6 round (security lens 4-layer defense 의 진화 round
  포함). slice-2g-table 도 동일 적용.
- **chartId selector injection 방어 pattern** — dataset 비교 default + CSS.escape
  fallback. table render slice 도 tableId 동일 점검.
- **bounded source excerpt inline plan §9** — 큰 module 의 security evidence
  내포. table render slice 도 적용.
- **R-P 신규 backlog** — chart-widget 의 export private 화 검토 (외부 caller
  grep 후).
- **R-Q 신규 backlog** — spec template 표준화 (@study-note/domain mock +
  linkedom boilerplate 공통화). slice-2c~2g 매 반복 — 공통 helper 추출.
- **sed 일괄 삭제 위험** — chart 함수 사이의 인접 함수 (`refreshTableWidgets`
  / `renderStarMark`) 까지 잘못 삭제. Edit tool 우선, sed 는 명시 range
  확인 후만 사용.

### slice-2g 결과 (참고)

- main.ts -975 line (8,686 → 7,711). 누적 -3,338 / -30.21%.
- 신규 1 module + 1 spec: `pdf-workspace/chart-widget.ts` 1,181 line / 29
  named export — renderChart + renderChartMount + refreshChartWidgets +
  refreshChartPreview + state handler (removeChart + applyChartMove + ...
  10 함수) + SVG builder (appendChartCoordinatePlane + buildPolylineChartSvg
  + buildTrigChartSvg + buildFunctionChartPoints + splitCoordsByJump) +
  CHART_PLOT_* (6) + Context/Callbacks types. private helper + 2 debounce Map.
- spec 16 case (7 invariant 1:1) — (a) render DOM tree XSS safe / (b)
  debounce map module-private / (c) refreshChartWidgets idempotent / (d)
  handler workspace store mutate only / (e) LocalChartType/Function bounded /
  (f) leaf 무측효과 / (g) chartId selector injection 방어.
- AC9 Security defense in depth: innerHTML 0 (전체 module) + renderChartMount
  escapeHtml + chartId selector dataset 비교 default (CSS.escape fallback).
- Gate 3 self R5 + cross R1 PASS (security lens, 6 round). Gate 6 self R1 +
  cross R1 PASS (2 round).
- @codex bot = "Didn't find any major issues. Hooray!" 👍.
- 패턴 = layer A/B-slice-1/2a/2b/2c/2d/2e/2f-i/2f-ii/2g Context+Callbacks +
  named export + characterization spec + leaf 단방향 import 일관.

## Layer B/slice-2f/ii 결과 (참고)

- main.ts -105 line (8,791 → 8,686). markdown-table.ts 138 line / 4 export
  + 2 private. DrillHighlightDomainHelpers wrapper 완전 폐기.

## Layer B/slice-2f/i 결과 (참고)

- main.ts -117 line (8,908 → 8,791). chart-content.ts 182 line / 9 export
  + 2 private + spec 18 case.

## SFS 0.6.121 정책 ambient (CLAUDE.md 참조)

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Handoff-only stop contract
- Executable Action Ownership
- Monitor checkpoint classification
- Review autopilot rework loop
- Findings label = Critical/Required/Important/Optional/FYI
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md` + CHANGELOG 0.6.118~0.6.121
