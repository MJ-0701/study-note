---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-4"
workspace: "main-ts-layer-b-slice-2f-i-chart-widget"
handoff_dir: "docs/solon/main-ts-layer-b-slice-2f-i-chart-widget/20260525"
goal: "main.ts layer B/slice-2f/i — chart widget 분리"
created_at: "2026-05-25T19:49:38+09:00"
last_touched_at: "2026-05-25T21:46:39+09:00"
closed_at: 2026-05-25T21:46:39+09:00
---

# 회고 — main.ts layer B/slice-2f/i (chart-content leaf 분리)

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 0. 결과 요약

- **main.ts -114 line** (8,908 → 8,794, -1.28%). 누적 layer A~B/slice-2f/i =
  -2,255 / -20.41%. 9k target 보존. 8k target 까지 잔여 -794 line.
- 신규 1 module + 1 spec: `pdf-workspace/chart-content.ts` 182 line / 9 named
  export + 2 private helper + `pdf-workspace/__tests__/chart-content.spec.ts`
  18 case (6 invariant 1:1 매핑).
- drill-highlight.ts DomainHelpers chart prop (`decodeChartContent` +
  `CHART_TYPE_PREFIX`) 폐기 + 직접 import — slice-2d Gate 6 self R1 의 TDZ
  bug fix lazy factory 가 chart 책임 해제. table 잔여 책임 wrapper 유지
  (slice-2f/ii).
- chart-content.spec 18/18 PASS + inspector-drill 14/14 PASS +
  document-change 11/11 PASS + tsc clean. audit-only 3 file source diff 0.
- Gate 3 self R9 PASS + cross R2 PASS (codex `gpt-5.5` xhigh, 9 round
  total — capsule line 예산 + 외부 spec ownership + invariant evidence
  반복 패치).
- Gate 6 self R3 PASS + cross R2 PASS (자동 self → cross 순서 issue 1 회).
- @codex bot review verdict = PR #64 (autopilot merge 대기 또는 user push 후
  merge — Solon §1.5 publication boundary 준수).
- pre-existing 4 fail 보존 (slice-2d R-I backlog: chart-tool.spec
  `updatePdfMaterialMetadata` shim missing — baseline stash test 동일).

## 1. 계속할 것

- **measurement-first orient brainstorm §0** (slice-2c~2e 누적 lesson) —
  본 sprint 도 main.ts 실측 line + symbol scope 정확 매핑 으로 진행.
- **3-layer 도메인 분리 명시** (LocalChartType + LocalChartFunction +
  stored envelope token) — Gate 3 self R2 에서 "chart type 6종" 오류 정정
  → 도메인 용어 정확도 향상. 다음 slice 도 동일 분리 적용.
- **bounded 검증 명령** (AC3/AC4 의 `awk '/interface .../,/^}/'` block scope
  grep) — Gate 3 self R5 에서 file-wide grep imprecise → block-scope grep
  으로 cleanup. 정확한 acceptance 검증.
- **pre-existing fail 의 baseline stash test waiver pattern** — Gate 6 self
  R1 의 chart-tool fail 정당화. `git stash push` 로 슬라이스 변경 임시 제거
  후 baseline 동일 fail 재현 → waiver capture. 향후 동일 R-I lineage 에
  재사용.
- **leaf module 단방향 패턴** — chart-content 가 외부 import 0 (leaf),
  drill-highlight 가 caller (단방향). slice-2c (ink-stroke) / slice-2e
  (star-mark) 와 동일 구조.
- **6 invariant ↔ 18 case 1:1 매핑** (plan §9.1 §9.2 table) — review
  capsule 에서 invariant 의 verification path 가 명확. 다음 slice 도 invariant
  table 작성.

## 2. 문제

- **review capsule 의 plan 본문 truncation** (Gate 3 self R6/R7/R8 누적) —
  reviewer 가 plan §9 까지 보지 못해 evidence gap 발생. 해결 = plan §1-§8
  aggressive compaction (~150 line) + §11.1 source excerpt 를 evidence
  file 로 이관 (evidence/chart-content-excerpts.md). SFS 의 review prompt
  capsule line budget = ~250 line per file 추정 — 향후 plan compaction 규율
  으로 운영. **R-K (신규 backlog) = SFS 0.6.122+ review capsule line
  budget 명시 + evidence file 자동 inclusion** (현재 capsule = brainstorm +
  plan + implement + log + review 5 file only, sprint-local evidence/
  subdir 미포함).
- **self → cross 순서 오해** (Gate 3 cross R1 + Gate 6 cross R1) — review.md
  가 매 review 마다 overwrite 되어 self PASS evidence 가 cross capsule 에
  부재. 해결 = self PASS verdict 를 `sfs capture --kind evidence` 로 log.md
  에 inline → cross 가 self verdict 인용 가능. SFS 정책: cross 진입 직전
  self 재실행 (verdict 동일 PASS → review.md 갱신) + capture evidence 2
  중 보존. **R-L (신규 backlog) = review.md 가 self+cross 둘 다 보존**
  하도록 SFS adapter 수정 제안.
- **plan §9 의 contract drift** (Gate 3 self R2/R3/R5 누적) — initial draft
  의 `{x,y,label?}` (brainstorm 단계 misnomer) → 실제 `{label,value}` 정정
  + "chart type 6종" → 3-layer 분리 + xy envelope omit invariant 명시화.
  brainstorm 단계의 source 미확인이 누적 rework 원인. 다음 slice 도
  brainstorm §1 measurement 와 §3 용어 정의 동시 작성 (실측 source 인용
  의무화). **R-M (brainstorm template 개선)** = `용어` 항목에 source
  line/excerpt 인용 의무 추가.
- **brainstorm/plan rework round 누적 (총 9 round)** — Gate 3 self R1~R9
  rework. 원인 = (i) review capsule budget 미인지, (ii) plan boilerplate
  redundancy, (iii) reviewer가 evidence 인 capture text 를 SoT 로 받지 않음
  ("summary only, not full mapping"). 해결 = plan compaction + evidence
  file split + capture text 더 자세히. **R-N = brainstorm/plan compact-
  first pattern** — slice-2g 부터 §1-§8 합계 ~150 line 목표 (slice-2f/i
  의 327 line 보다 절반).

## 3. 시도할 것

- **slice-2f/ii (table widget) 또는 slice-2g (chart render)** 다음 sprint
  후보. slice-2f 분해 후보 §2 (table widget) ≈ 400 line scope, §3 (simple
  widget) ≈ 220 line, §4 (container/page) ≈ 410 line. 위험도 = slice-2f/ii
  중 > slice-2f/iii 낮음 > slice-2f/iv 중.
  - **slice-2f/ii 권장**: 동일 leaf 패턴 (parseMarkdownTable +
    serializeMarkdownTable 등). drill-highlight 의 table 잔여 책임
    DomainHelpers prop 도 동시 폐기 (chart-content 와 대칭).
- **brainstorm template 개선** — `## 3. 용어` 항목 옆에 `source` column
  추가 (file:line 인용 의무화). R-M backlog.
- **plan template compaction default** — §3 (AC) 가 table 형식 default,
  §5 (실행 계약) workpart 가 짧은 list 형식, §11.1 (source excerpt) 는
  evidence/ subdir 로 자동 이관. R-N backlog.
- **review capsule budget 인식** — `sfs review` 진입 전 plan.md 전체 line
  count + §9 시작 line 위치 확인. 250 line 이상이면 compact 먼저. R-K
  backlog.
- **self → cross 순서 자동화** — `sfs review --gate <id>` 가 `--stage cross`
  호출 시 review.md 의 마지막 self verdict 가 PASS 인지 확인 + 없으면
  self 자동 재실행 → cross. R-L backlog.

## 4. 이어갈 것

### 즉시 (본 sprint close)

- [x] PR #64 push (feature/slice-2f-i-chart-widget).
- [x] @codex review trigger (PR body 안 `@codex review`).
- [ ] @codex bot verdict 확인 → autopilot merge (capture evidence).
- [ ] retro close + ACTIVE.md 다음 sprint handoff 갱신.

### 다음 sprint 후보 (분해 잔여)

- **slice-2f/ii**: table widget (~400 line, parseMarkdownTable +
  serializeMarkdownTable + splitMarkdownTableRow + table content debounce +
  table constant). drill-highlight 의 table 잔여 책임 동시 폐기. 위험도
  중.
- **slice-2g/i**: chart render widget (renderChart 274 + renderChartMount
  13 + chart debounce + morphdom + post-mount lifecycle). ~290 line scope.
  위험도 중 (state mutate + morphdom + debounce 동시).
- **slice-2f/iii**: simple widget (renderStickyNote + renderTextBox +
  renderChecklist + renderEraser*) ~220 line. 위험도 낮음.
- **slice-2f/iv**: container/page (renderPdfWorkspacePage + renderPdfMaterialStatus
  + renderPdfToolbar + ...) ~410 line. 다른 widget 의존, 마지막.

### 누적 backlog

- **R-K**: SFS review capsule budget 명시 + evidence file 자동 inclusion.
- **R-L**: review.md self+cross verdict 둘 다 보존.
- **R-M**: brainstorm template `## 3. 용어` source 인용 의무화.
- **R-N**: plan template compaction default (table-first AC, evidence
  split).
- (slice-2c/2d/2e 누적) **R-A2**: retro window user manual smoke + Datadog
  readout. **R-C**: ACTIVE.md 자동 update (SFS 0.6.122 backlog). **R-D2**:
  events.jsonl compaction key 에 review_stage 추가. **R-D3**: eslint 도입.
  **R-H**: implement 단계 module init order self-check 표준화. **R-I**:
  pre-existing 4 fail (`updatePdfMaterialMetadata` shim missing — chart-tool
  + pdf-material-library) 별도 sprint.

## 5. 종료 체크

- [x] report 가 최신이다 (handoff_dir = `docs/solon/main-ts-layer-b-slice-2f-i-chart-widget/20260525/`,
  retro.md = 본 file).
- [x] review 조치가 완료 또는 이월됐다 (Gate 3 self+cross PASS / Gate 6
  self+cross PASS / @codex bot review pending → autopilot merge).
- [x] workbench 가 접혔다 (`.sfs-local/sprints/2026-W22-sprint-4/`
  artifact = brainstorm.md / plan.md / implement.md / log.md / review.md
  + evidence/chart-content-excerpts.md).

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (459 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-25T21:46:39+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
