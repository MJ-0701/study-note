# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. layer 진행
> 시 매 sprint close 후 다음 sprint handoff 로 갱신.

## 진행 상황 (2026-05-25)

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57, main=25f3cb9) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 (prev) | ✅ merged (PR #58, main=2fd4a0d) |
| **B/slice-2a. canvas mount + workspace state** | 2026-W22-sprint-1 (this) | ✅ merged (PR #59, main=c84439e) |
| **B/slice-2b. classDate + touch/swipe + nav** | 2026-W22-sprint-2 | ✅ merged (PR #60, main=e8c1f87) |
| **B/slice-2c. ink stroke + pen RAF batch** | 2026-W22-sprint-3 | ✅ merged (PR #61, main=f24a20b) |
| **B/slice-2d. drill highlight** | 2026-W22-sprint-2 | ✅ merged (PR #62, main=d1bba31) |
| **B/slice-2e. star mark** | 2026-W22-sprint-3 | ✅ merged (PR #63, main=c23dd6c) |
| **B/slice-2f/i. chart-content leaf** | 2026-W22-sprint-4 | ✅ merged (PR #64, main=45080e8) |
| **B/slice-2f/ii. table widget** | TBD | ⏳ 다음 sprint 후보 (위험도 중, ~400 line) |
| **B/slice-2g. chart render widget** | TBD | ⏳ 후보 (위험도 중, renderChart 274 + debounce + morphdom) |
| **B/slice-2f/iii. simple widget** | TBD | ⏳ backlog (sticky/textbox/checklist/eraser ~220 line) |
| **B/slice-2f/iv. container/page** | TBD | ⏳ backlog (renderPdfWorkspacePage ~410 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **8,791** (-2,258, -20.44%). 9k target 보존.
다음 호기심 target = 8k (잔여 -791 line, slice-2f/ii + slice-2g 분리 시 가능).

## 활성 작업 = layer B/slice-2f/ii sprint (table widget) **또는** slice-2g (chart render)

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2f-i-chart-widget/20260525/retro.md`

### 후보 1: slice-2f/ii — table widget (권장)

**slice-2f/ii 측정치 (handoff slice-2e + slice-2f/i 누적 lineage)**:
- main.ts table 관련 scope = `renderTable` (358) + `renderTableMount` (8) +
  `parseMarkdownTable` + `serializeMarkdownTable` + `splitMarkdownTableRow` +
  `tableContentDebounceMap` + table constant ≈ **400 line scope** 추정.
- chart-content 패턴 대칭 — 본 분리는 markdown-table content parser leaf
  분리. drill-highlight 의 잔여 `parseMarkdownTable` DomainHelpers prop
  동시 폐기 (chart-content 와 동일 패턴) → wrapper 자체 폐기 가능.
- main.ts -300~-400 line estimate (range ±50% = -200~-600).
- 위험도 = 중 (chart-content 와 비교 시 더 큰 scope, render/state/morphdom
  은 slice-2g 로 미루기).
- spec 회귀 risk = pdf-material-library.spec / table-tool.spec / inspector-drill.spec
  의 table-related mock 정리.

### 후보 2: slice-2g — chart render widget

- renderChart (274) + renderChartMount (13) + chartContentDebounceMap +
  chartPointDebounceMap + post-mount lifecycle + morphdom + SVG svg
  ≈ **290~330 line scope**.
- 위험도 = 중 (state mutate + morphdom + debounce + lifecycle 동시 — slice-2b
  의 touch-swipe 수준).
- main.ts -200~-300 line estimate.

### slice-2f/i 학습 (다음 sprint 우선 적용)

- **R-K backlog 우선**: brainstorm/plan 작성 시 review capsule line budget
  (~250 line per file) 인지. plan §1-§8 합계 ~150 line 목표.
- **R-M backlog**: brainstorm `## 3. 용어` 항목 옆에 source 인용 (file:line)
  의무화. slice-2f/i 의 `CsvSeriesPoint` 오기 (`{x,y,label?}` 초안 vs 실측
  `{label,value}`) 재발 방지.
- **R-N backlog**: plan template compaction default — §3 AC = table 형식,
  §11.1 source excerpt = evidence/ subdir 으로 자동 이관.
- **R-L backlog**: `sfs review --gate <id> --stage cross` 가 self verdict
  부재 시 self 자동 재실행 → cross. slice-2f/i 에서 Gate 3 cross R1 +
  Gate 6 cross R1 동일 procedural fail 재발.
- **pre-existing fail baseline stash test waiver pattern** — Gate 6 self
  R1 의 chart-tool fail 정당화 (`git stash push` 으로 슬라이스 임시 제거 +
  baseline 동일 fail 재현 → waiver capture). 향후 R-I lineage 재사용.

### slice-2f/i 결과 (참고)

- main.ts -117 line (8,908 → 8,791). 누적 layer A~B/slice-2f/i = -2,258
  / -20.44%. 9k target 보존. 8k target 까지 -791 line.
- 신규 1 module + 1 spec: `pdf-workspace/chart-content.ts` 182 line / 9
  named export + 2 private helper (splitCsvSeriesLine + serializeCsv NOT
  exported) + `pdf-workspace/__tests__/chart-content.spec.ts` 18 case
  (6 invariant 1:1 매핑).
- 18 case = (a) round-trip non-xy 5 + (a') xy envelope omit 2 + (b)
  envelope token bounded 2 + (c) LocalChartType/Function bounded 2 + (d)
  finite guard OWASP A03+A04 4 + (e) escape+injection block 2 + (f) leaf
  무측효과 1.
- drill-highlight.ts DomainHelpers chart prop (`decodeChartContent` +
  `CHART_TYPE_PREFIX`) 폐기 + 직접 import. table 잔여 책임 wrapper 유지
  (slice-2f/ii).
- main.ts `getDrillHighlightHelpers()` lazy factory chart prop 주입 제거.
- inspector-drill.spec mock cleanup (14/14 PASS 회귀 없음).
- audit-only 3 file (chart-tool.spec / document-change.spec /
  document-change.ts) source diff 0.
- Gate 3 self R9 PASS + cross R2 PASS (9 round — capsule line budget +
  외부 spec ownership + 3-layer taxonomy + source excerpt 반복 patch).
- Gate 6 self R3 PASS + cross R2 PASS.
- @codex bot = "Didn't find any major issues" (👍 verdict, autopilot merge).
- 신규 backlog R-K (capsule budget) / R-L (self+cross 보존) / R-M
  (brainstorm source 인용) / R-N (plan compaction default).
- 패턴 = layer A/B-slice-1/2a/2b/2c/2d/2e/2f-i Context + Callbacks +
  named export + characterization spec + leaf 단방향 import 일관.

## Layer B/slice-2e 결과 (참고)

- main.ts -92 line (9,000 → 8,908). 누적 -2,141 / -19.37%. 9k target 보존.
- 신규 1 module + 1 spec: `pdf-workspace/star-mark.ts` 209 line / 14 export
  + `pdf-workspace/__tests__/star-mark.spec.ts` 250 line / 18 case.
- Gate 3 self R2 + cross R1 PASS. Gate 6 self R2 + cross R1 PASS.
- @codex bot = "Didn't find any major issues." :rocket: (autopilot merge).
- 신규 invariant **(h) render-time numeric finite/clamp guard** (OWASP
  A03+A04 defense in depth) — `clampStyleRatio(value, min, max, fallback)`.

## Layer B/slice-2d 결과 (참고)

- main.ts -417 line (9,417 → 9,000). 누적 layer A~B/slice-2d = -2,049 /
  -18.55%. 9k target 달성.
- 신규 1 module + spec 이관: `pdf-workspace/drill-highlight.ts` 669 line /
  36 export. spec = `apps/web/src/__tests__/inspector-drill.spec.ts` 795
  line / 14 case.
- Gate 3 self+cross PASS (round 3 each). Gate 6 self R3 + cross R1 PASS —
  self R1 partial = TDZ bug → lazy factory fix.
- 신규 backlog: R-D2 (events.jsonl compaction key 에 review_stage 추가),
  R-H (module init order self-check), R-I (pre-existing 4 fail = chart-tool
  + pdf-material-library `updatePdfMaterialMetadata` shim missing — 별도
  sprint).

## SFS 0.6.121 정책 ambient (CLAUDE.md 참조)

- Division sub-agent council (strategy-pm/dev/QA/design/infra/taxonomy) always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh from probe banner)
- Handoff-only stop contract (interrupt active loops)
- Executable Action Ownership (auth+runtime+approval 있으면 직접 실행)
- Monitor checkpoint classification (long-running watch 의무)
- Review autopilot rework loop (deterministic finding 직접 patch + rerun)
- Findings label = Critical/Required/Important/Optional/FYI
- Session Continuation Guard ambient (autopilot fresh-session transfer)
- 자세히 = `CLAUDE.md` 의 "SFS 0.6.114 → 0.6.117 추가 정책" 섹션 + CHANGELOG 0.6.118~0.6.121
