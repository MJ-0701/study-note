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
| **B/slice-2f. renderer big** | TBD | ⏳ 다음 sprint 후보 (위험도 중-높음, ~1,369 line, 분해 권장) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **8,908** (-2,141, -19.37%). 9k target 달성 보존.
다음 호기심 target = 8k (slice-2f renderer big 분리 시 가능, -908 line 필요).

## 활성 작업 = layer B/slice-2f sprint (renderer big — **분해 권장, 위험도 중-높음**)

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2e-star-mark/20260525/retro.md`

**slice-2f 측정치 (실측, 2026-05-25 slice-2e brainstorm 단계)**:
- main.ts L6503-7872 renderer block = **1,369 line scope**.
- 17 render function:
  - renderPdfFrameStack 31 + renderPdfWorkspacePage 205 + renderPdfMaterialStatus 48
  - renderPdfToolbar 77 + renderFullscreenToggleButton 17
  - renderEraserSubToolbar 30 + renderEraserShapeButton 24 + renderEraserCursorStyle 10 + renderEraserCursorSvg 30
  - renderToolButton 28 + renderStickyNote 48 + renderTextBox 48 + renderChecklist 89
  - renderChartMount 13 + renderChart 274 + renderTableMount 8 + renderTable 358
- 위험도 중-높음 = renderChart (274) + renderTable (358) 가 큰 단위 + 다수 의존 (decodeChartContent / parseMarkdownTable / serializeMarkdownTable / chart-content debounce / table content debounce / morphdom).

**slice-2f 분해 후보** (retro §3 권장):
1. **slice-2f/i**: chart widget (renderChart + renderChartMount + chartContentDebounceMap + chartPointDebounceMap + chart helpers + decodeChartContent + parseCsvSeries + encodeChartContent + chart constant) ≈ 350 line. 위험도 중. **단독 sprint 우선**.
2. **slice-2f/ii**: table widget (renderTable + renderTableMount + parseMarkdownTable + serializeMarkdownTable + table content debounce + splitMarkdownTableRow + table constant) ≈ 400 line. 위험도 중. 단독 sprint.
3. **slice-2f/iii**: simple widget (renderStickyNote + renderTextBox + renderChecklist + renderEraser*) ≈ 220 line. 위험도 낮음.
4. **slice-2f/iv**: container/page (renderPdfWorkspacePage + renderPdfMaterialStatus + renderPdfToolbar + renderPdfFrameStack + renderToolButton + renderFullscreenToggleButton) ≈ 410 line. 위험도 중 (다른 widget 의존).

**slice-2f 후보 invariant** (chart sprint 진입 시 brainstorm 정밀화):
1. decodeChartContent format = "type:<chartType>\n<csv>" (sprint-13 lineage).
2. chart type 6 known = sin/cos/tan/bar/xy/trig (drill-highlight CHART_TYPE_PREFIX 일관).
3. morphdom DOM diff 유지 (renderApp 호출 후 chart widget refresh + post-mount).
4. debounce map (chartContentDebounceMap + chartPointDebounceMap) state mutate.
5. HTML escape — 모든 user content (chart.content / table.content / cell 본문).

**slice-2c~2e 학습 우선 적용**:
- **measurement-first orient brainstorm §1 의무**.
- **scope boundary 결정 brainstorm 단계** = 분해 vs 단일 결정 = Q1.
- **Plan §9 security model + invariant brainstorm 단계 작성** (R-J 신규 backlog, slice-2e Gate 3 R1 partial lesson).
- **comment placeholder 작성 즉시 trim** (slice-2e Gate 6 R1 lesson — breadcrumb 누적 vs AC2 미달).
- **AC drift waiver pattern**: Gate 6 self R1 partial 시 plan 미반영 정상 inflation/under-shoot 은 waiver row 로 ledger.
- **events.jsonl compaction workaround**: capture `--kind evidence` 자동 적용 (Gate 3 cross 진입 직전).
- **module init order self-check** (R-H backlog): implement 단계 자체 grep audit — export const 가 main.ts 후방 const/let 참조 X 확인.
- **AC range estimate**: line/case 추정 폭 ±50%/±100% (slice-2c/2d/2e 누적 lesson).

**mobile QA / Datadog readout**: slice-2c/2d/2e 동일 — DDD refactor (행위 등가).
slice-2c capture 가 evidence. user 의무 X. 회기 시 hotfix.

**Sprint 2026-W22-sprint-4 = `slice-2f/i` (chart widget) 이미 start 됨** (2026-05-25 session end). brainstorm 부터 재개.

**slice-2f/i 측정치 (실측, 2026-05-25 slice-2e session 말미)**:
- chart content encoder/decoder scope = 3 const + 2 type + 1 interface + 5 function:
  - L3601 LocalChartType type / L3602 LocalChartFunction type / L3604 CHART_TYPE_PREFIX.
  - L3618-3631 encodeChartContent (14 line).
  - L3632-3635 inferChartFunctionType (4 line).
  - L3636-3660 decodeChartContent (25 line).
  - L5008-5014 CsvSeriesPoint interface (7 line).
  - L5015-5072 parseCsvSeries (58 line).
  - L5073-5077 normalizeChartInputValue (5 line).
- 잔류 합계 ≈ 150 line scope. main.ts -100~-150 estimated.
- 41 grep hit (chart-content symbol usage). caller = chart widget (renderChart/state/SVG), drill-highlight.ts (DomainHelpers), 외부 spec.

**slice-2f/i 의 보너스**: drill-highlight.ts 의 `getDrillHighlightHelpers()` lazy factory 폐기 가능 — chart-content.ts module → drill-highlight 가 직접 import (circular dep 없음, chart-content 가 단방향 leaf). 결과 = main.ts 의 helpers wrapper line 추가 절감.

**다음 명령**:
```bash
sfs status                              # sprint-4 confirm
sfs brainstorm "..."                    # orient = §1 measurement + §9 security model 동시
sfs plan → review --gate 3 self → cross → implement → Gate 6 self → cross → PR → @codex → merge → retro
```

## Layer B/slice-2e 결과 (참고)

- main.ts -92 line (9,000 → 8,908). 누적 layer A~B/slice-2e = -2,141 / -19.37%.
  9k target 보존. 8k target 까지 -908 line (slice-2f 책임).
- 신규 1 module + 1 spec: `pdf-workspace/star-mark.ts` 209 line / 14 export (6
  function + 6 const + 2 type) + `pdf-workspace/__tests__/star-mark.spec.ts`
  250 line / 18 case.
- web 전체 spec 회귀 = 0 (pre 418 pass / 4 fail → post 440 / 4, +22 pass +22
  test). tsc --noEmit clean.
- Gate 3 self R2 + cross R1 PASS — R1 partial = Plan §9 security model 비어있음
  + AC4(h) numeric finite/clamp guard 누락 → §9 채움 + AC4(h) clampStyleRatio
  추가 + bounded source excerpt. R2 PASS.
- Gate 6 self R2 + cross R1 PASS — R1 partial = AC1/AC3 drift (Gate 3 §9 추가
  로 인한 정상 inflation) + AC2 미달 (comment placeholder 30+ line 잔존)
  + AC5 +18 vs +22 arithmetic + AC7 .gitignore 미명세 → comment trim (line
  -55→-92) + AC drift waiver + arithmetic 정정 + .gitignore waiver. R2 PASS.
- @codex bot = "Didn't find any major issues. :rocket:" (autopilot merge).
- 신규 invariant **(h) render-time numeric finite/clamp guard** (OWASP A03+A04
  defense in depth). hydration 우회 / persistence 손상 시 style context 깨짐
  방지. `clampStyleRatio(value, min, max, fallback)`.
- Backlog 신규:
  - R-J Plan §9 brainstorm 단계 작성 (security model + invariant 동시).
  - R-H module init order self-check 표준화 (slice-2d lesson 본 sprint 안전 확인).
- 패턴 = layer A/B-slice-1/2a/2b/2c/2d/2e Context + Callbacks + named export +
  characterization spec 일관 (drill-highlight slice-2d 와 가장 유사 구조).

## Layer B/slice-2d 결과 (참고)

- main.ts -417 line (9,417 → 9,000). 누적 layer A~B/slice-2d = -2,049 / -18.55%.
  9k target 달성.
- 신규 1 module + spec 이관: `pdf-workspace/drill-highlight.ts` 669 line / 36
  export (types 7 + const 7 + interface 4 + function 16 + test helper 2).
- spec = `apps/web/src/__tests__/inspector-drill.spec.ts` 795 line / 14 case
  (handoff 추정 8→10 vs 실측 13 + 1 dynamic security loop = 14). SRC = drill-highlight.ts.
- web 전체 spec 회귀 = 0 (오히려 -1 fail 개선 — inspector-drill 이 main.ts shim
  mismatch 우회로 PASS 전환). pre 408/5 → post 422/4.
- Gate 3 self+cross PASS (각각 round 3 — events.jsonl compaction workaround
  capture + waiver 2건).
- Gate 6 self R3 + cross R1 PASS — self R1 partial = TDZ bug (drillHighlightHelpers
  eager const 가 후방 CHART_TYPE_PREFIX 참조 ReferenceError) → lazy factory
  `getDrillHighlightHelpers()` fix. self R2 partial = untracked file + .gitignore
  미설명 + 4 fail 명세 누락 → git add staged + diff 명시 + 4 fail 명세.
- @codex bot = "Didn't find any major issues. :+1:" (autopilot merge).
- Waiver 2건 + Evidence 1건 (capture):
  - Gate 3 evidence (capture 20260525T084637Z-47536) = self R3 PASS 보존.
  - Gate 3 waiver (capture 20260525T084646Z-47665) = SFS 0.6.121/0.6.122
    events.jsonl compaction key 미포함 known bug.
  - Gate 6 evidence (capture 20260525T091344Z-1532) = self R3 PASS 보존.
- Backlog (slice-2c retro 의 R-A2/R-C/R-D2/R-D3 외 신규):
  - R-D2 escalate: SFS 0.6.122 events.jsonl compaction key 에 review_stage 추가
    issue/PR 제안 (slice-2c+2d 연속 재발).
  - R-H: implement 단계 module init order self-check 추가 (Gate 6 가 발견한
    TDZ lesson — eager const 가 후방 const 참조 시 lazy factory).
  - R-I: pre-existing 4 fail (`updatePdfMaterialMetadata` shim missing,
    chart-tool + pdf-material-library) — 별도 sprint backlog.
- 패턴 = layer A/B-slice-1/2a/2b/2c/2d Context + Callbacks + DomainHelpers
  + named export + module-private state + characterization spec 일관.

## Layer B/slice-2c 결과 (참고)

- main.ts -164 line (9,581 → 9,417). 누적 layer A~B/slice-2c = -1,632 / -14.77%.
- 신규 1 module + 1 spec: `pdf-workspace/ink-stroke.ts` 402 line (9 function +
  1 ActiveInkStroke interface + 3 helper interface + 3 test helper = 16
  symbol) + `pdf-workspace/__tests__/ink-stroke.spec.ts` 616 line (12 case).
- 신규 spec 12 case (ink-stroke) + 기존 회귀 0 (pdf-workspace 8 spec 128 case
  + pen-stroke-latency 9 case + 전 web spec 407/412 pre/post 동일).
- 수정: `pen-stroke-latency.spec.ts` SRC = ink-stroke.ts + 6 regex signature
  적응 (AC16-AC20 source-text characterization 유지).
- Gate 3 self+cross PASS (round 2+1 — codex cross PASS round 1).
- Gate 6 self+cross PASS (round 3 cross — codex round 1 partial + round 2
  partial → P1 waiver via capture 20260525T074710Z-21895 → round 3 PASS).
- @codex bot = "No major issues" (autopilot merge 사후 검증).
- Waiver 2건:
  - AC7 retro-defer (mobile pen smoke 6 시나리오) — capture 20260525T070319Z-91020.
  - Performance evidence (Datadog RUM p50/p95 numeric baseline) — capture
    20260525T074710Z-21895.
- Backlog 4건:
  - R-A2: retro window user manual smoke + Datadog readout (capture 양쪽 evidence).
  - R-C: ACTIVE.md 자동 update (SFS 0.6.122 backlog 제안).
  - R-D2: events.jsonl compaction key 에 review_stage 추가 (SFS 0.6.122 backlog 제안).
  - R-D3: eslint 도입 (별도 sprint, layer C 진입 전).
- 패턴 = layer A/B-slice-1/2a/2b 의 Context + Callbacks + DomainHelpers +
  named export + module-private state + characterization spec 일관.

## Layer B/slice-2b 결과 (참고, 이전 sprint)

- main.ts -373 line (9,954 → 9,581).
- 신규 5 module: constants 29 + class-date 307 + view-state 226 + touch-swipe
  245 + document-change 234 = 1,041 line.
- 신규 spec 61 case + 기존 회귀 0. Gate 3 self+cross PASS (round 3+2).
  Gate 6 self+cross PASS (round 5+2). @codex bot = "No major issues".
- Waiver 1건 (AC7 retro-defer). Backlog 2건 (R-F document-change.ts /
  R-G chartPointDebounceMap).

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
