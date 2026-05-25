---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-3"
workspace: "main-ts-layer-b-slice-2g-chart-render-widget"
handoff_dir: "docs/solon/main-ts-layer-b-slice-2g-chart-render-widget/20260525"
goal: "main.ts layer B/slice-2g — chart render widget 분리"
created_at: "2026-05-25T22:45:00+09:00"
last_touched_at: "2026-05-25T23:10:00+09:00"
closed_at: 2026-05-25T23:09:00+09:00
---

# 회고 — slice-2g (chart render widget)

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 0. 결과 요약

- **main.ts -975 line** (8,686 → 7,711, -11.22%). 누적 layer A~B/slice-2g =
  **-3,338 / -30.21%**. **8k target 큰 폭 달성**.
- 신규 `pdf-workspace/chart-widget.ts` 1,181 line / 29 named export +
  spec 16 case (7 invariant 1:1).
- main.ts thin wrapper 11 + Context+Callbacks (slice-2c~2f 패턴 일관).
- 영향권 spec 72 case PASS (chart-widget 16 + inspector-drill 15 +
  document-change 11 + chart-content 18 + markdown-table 12).
- Gate 3 self R5 + cross R1 PASS (security lens, 6 round). Gate 6 self R1
  + cross R1 PASS (2 round).
- @codex bot = "Didn't find any major issues. Hooray!" 👍. PR #66 main=d56e330.

### AC9 Security Defense in Depth (slice-2g 강조)

| layer | evidence |
|---|---|
| (a) XSS render | chart-widget.ts code 안 innerHTML = 0. DOM API only. |
| (b) renderChartMount escape | escapeHtml(chart.id) + escapeHtml(subjectId). |
| (c) chartId selector injection | dataset.chartId === chartId 비교 default (4 site). |

## 1. 계속할 것

- **drill-highlight 패턴 (Context+Callbacks 단일 module, 단방향 leaf)** —
  1,181 line / 29 export 성공.
- **R-K/R-M/R-N** 효과 일관. plan 327 line + brainstorm 220 line + §9 source
  excerpt inline.
- **chartId selector injection 방어** = dataset 비교 default 패턴 — 향후
  table render slice 도 동일 적용.
- **bounded source excerpt inline plan §9** — 큰 module security evidence
  보존.

## 2. 문제

- 첫 spec 시도 시 `@study-note/domain` resolution 실패 → inspector-drill
  패턴 (register hook + short-circuit) 재사용.
- sed 일괄 삭제 시 인접 `refreshTableWidgets` + `const renderStarMark = ...`
  까지 삭제 → tsc 가 즉시 잡아내 restore. Edit tool 우선 권장.
- Gate 3 security lens 6 round = chartId selector injection → threat
  ledger → renderChartMount escape → SVG XSS 검증까지 incremental 진화.
- chartId selector pattern multi-site = 4+ site. helper function
  (findChartArticle, findInputByAction, findChartFunctionInput) 추출로
  중복 제거.

## 3. 시도할 것

- **다음 sprint 후보**:
  - **slice-2g-table** (table render, ~500 line, 권장).
  - **slice-2f/iii** (simple widget, ~220 line).
  - **slice-2f/iv** (container/page, ~410 line).
- **R-P 신규** — chart-widget 의 export (buildFunctionChartPoints /
  buildPolylineChartSvg / buildTrigChartSvg / splitCoordsByJump /
  appendChartCoordinatePlane) private 화 검토.
- **R-Q 신규** — spec template 표준화 (@study-note/domain mock + linkedom
  boilerplate 공통 helper).

## 4. 이어갈 것

### 즉시 close

- [x] PR #66 merge (squash, main=d56e330).
- [x] @codex bot 👍.
- [x] sfs retro --close (main=41b4438).
- [x] ACTIVE.md 갱신 (main=a33d105).

### 누적 backlog

- R-K/R-L/R-M/R-N/R-O — 누적 적용.
- R-P 신규 (chart-widget private 화).
- R-Q 신규 (spec template 표준화).
- R-A2/R-C/R-D2/R-D3/R-H/R-I — 별도 sprint backlog.

## 5. 종료 체크

- [x] report 최신.
- [x] review 조치 완료.
- [x] workbench 접힘.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium, last_review=pass.
- recommend: `qa` activate (light).
- consider: `infra` activate (light).
- generated_at: 2026-05-25T23:09:00+09:00 (auto)
<!-- solon:division-recommendations:end -->
