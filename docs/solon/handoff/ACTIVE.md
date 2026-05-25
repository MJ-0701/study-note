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
| **B/slice-2f/ii. markdown-table leaf + wrapper 폐기** | 2026-W22-sprint-2 | ✅ merged (PR #65, main=e1aded1) |
| **B/slice-2g. chart render widget** | TBD | ⏳ 다음 sprint 후보 (위험도 중, ~290 line) |
| **B/slice-2g-table. table render widget** | TBD | ⏳ 후보 (위험도 중-높음, ~500 line) |
| **B/slice-2f/iii. simple widget** | TBD | ⏳ backlog (sticky/textbox/checklist/eraser ~220 line) |
| **B/slice-2f/iv. container/page** | TBD | ⏳ backlog (renderPdfWorkspacePage ~410 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **8,686** (-2,363, -21.39%). 9k target 보존.
다음 호기심 target = 8k (잔여 -686 line). slice-2g 또는 slice-2f/iii 으로
달성 가능.

## 활성 작업 = layer B/slice-2g sprint (chart render widget) **권장**

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2f-ii-table-widget/20260525/retro.md`

### 후보 1: slice-2g — chart render widget (권장)

- scope = renderChart (274) + renderChartMount (13) + chartContentDebounceMap
  + chartPointDebounceMap + readChartDataFromDom + post-mount lifecycle +
  morphdom + SVG svg. ~290~330 line.
- chart-content leaf (slice-2f/i) 가 이미 분리되어 render 추출 안전.
- 위험도 = 중 (state mutate + morphdom + debounce + lifecycle 동시 — slice-2b
  touch-swipe 수준).
- main.ts -200~-300 line estimate.

### 후보 2: slice-2g-table — table render widget

- scope = renderTable (358) + renderTableMount (8) + readTableDataFromDom (39+) +
  tableContentDebounceMap + refreshTableWidgets. ~500 line.
- markdown-table leaf (slice-2f/ii) 이미 분리.
- 위험도 = 중-높음 (input cell DOM 조작 + debounce + table column add/delete).

### 후보 3: slice-2f/iii — simple widget cleanup

- scope = renderStickyNote + renderTextBox + renderChecklist + renderEraser*.
  ~220 line. 위험도 낮음.

### slice-2f/ii 학습 (다음 sprint 적용)

- **R-K (capsule budget) 효과 검증** — plan 327 line + brainstorm 191 +
  source excerpts inline. Gate 3 = 4 round (slice-2f/i 9 round 대비 절반).
- **R-M (brainstorm source 인용)** — 모든 용어 main.ts L<line> 표기.
  contract drift 0 round.
- **R-N (plan compaction default)** — AC = table-first, source excerpt
  inline §9.4. **slice-2f/ii 가 R-N 의 최종 검증**.
- **R-L (review.md self+cross 보존)** — capture pattern workaround 으로
  충분. SFS adapter 변경 backlog 유지.
- **R-O 신규 (test DOM matcher 호환성)** — linkedom class selector 일부
  매치 X. `[data-*]` / element name selector / textContent / querySelectorAll
  element-name 권장.
- **bounded source excerpt pattern** — `renderTable` body inline excerpt 이
  security lens reviewer blocker 해소. render path AC 마다 bounded inline
  default.
- **wrapper/factory 완전 폐기 cascading cleanup** — chart-content + markdown
  -table 후 wrapper 의 0-prop 잔존 → 완전 폐기. 다음 slice 도 비슷한
  cascade 기회 점검.

### slice-2f/ii 결과 (참고)

- main.ts -105 line (8,791 → 8,686). 누적 -2,363 / -21.39%.
- 신규 1 module + 1 spec: `pdf-workspace/markdown-table.ts` 138 line /
  4 export (`parseMarkdownTable` + `serializeMarkdownTable` +
  `splitMarkdownTableRow` + `ParsedMarkdownTable`) + 2 private
  (`isMarkdownSeparatorCell` + `normalizeMarkdownTableRow`).
- spec 12 case (5 invariant 1:1) — (a) round-trip / (b) null fallback / (c)
  width normalize / (d) pipe escape / (e) XSS escape caller 책임 (OWASP
  A07 leaf passthrough) / (f) leaf 무측효과.
- drill-highlight `DrillHighlightDomainHelpers` interface 완전 폐기 +
  4 함수 signature 단순화 + markdown-table 직접 import.
- main.ts `getDrillHighlightHelpers()` factory 완전 폐기 (slice-2d TDZ
  workaround 해소).
- inspector-drill.spec mock helpers 폐기 + AC11(b) XSS payload case 신규
  (15/15 PASS).
- audit-only 3 file diff 0.
- Gate 3 self R4 + cross R1 PASS (총 4 round, slice-2f/i 9 대비). security
  lens 자동 선택 (OWASP 명시 trigger).
- Gate 6 self R1 + cross R1 PASS (총 2 round, slice-2f/i 5 대비).
- @codex bot = "Didn't find any major issues. Keep them coming!" 👍.
- 신규 backlog R-O (test DOM matcher 호환성).
- 패턴 = layer A/B-slice-1/2a/2b/2c/2d/2e/2f-i/2f-ii Context + Callbacks +
  named export + characterization spec + leaf 단방향 import + wrapper
  cascading cleanup 일관.

## Layer B/slice-2f/i 결과 (참고)

- main.ts -117 line (8,908 → 8,791). 누적 -2,258 / -20.44%.
- chart-content.ts 182 line / 9 export + 2 private + spec 18 case (6 invariant
  1:1 매핑). drill-highlight chart prop 폐기 + 직접 import. main.ts
  `getDrillHighlightHelpers()` 의 chart prop 주입 제거 (table 잔여).
- Gate 3 self R9 PASS + cross R2 PASS (9 round — capsule budget + ownership
  + 3-layer taxonomy + source excerpt 반복 patch).
- Gate 6 self R3 PASS + cross R2 PASS. @codex bot 👍.
- 신규 backlog R-K (capsule budget) / R-L (self+cross 보존) / R-M (brainstorm
  source 인용) / R-N (plan compaction default).

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
