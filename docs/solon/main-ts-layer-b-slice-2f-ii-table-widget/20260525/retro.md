---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-2"
workspace: "main-ts-layer-b-slice-2f-ii-table-widget"
handoff_dir: "docs/solon/main-ts-layer-b-slice-2f-ii-table-widget/20260525"
goal: "main.ts layer B/slice-2f/ii — table widget (markdown-table leaf) 분리"
created_at: "2026-05-25T22:08:00+09:00"
last_touched_at: "2026-05-25T22:25:00+09:00"
closed_at: 2026-05-25T22:21:41+09:00
---

# 회고 — slice-2f/ii (markdown-table leaf)

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 0. 결과 요약

- **main.ts -105 line** (8,791 → 8,686, -1.19%). 누적 layer A~B/slice-2f/ii =
  -2,363 / -21.39%. 9k target 보존. 8k target 잔여 -686.
- 신규 1 module + 1 spec: `pdf-workspace/markdown-table.ts` 138 line / 4
  named export + 2 private + spec 12 case (5 invariant 1:1).
- drill-highlight.ts `DrillHighlightDomainHelpers` interface **완전 폐기** +
  `parseMarkdownTable` 직접 import. main.ts `getDrillHighlightHelpers()`
  factory **완전 폐기** — slice-2d Gate 6 self R1 TDZ workaround lazy
  factory **완전 해소**.
- 4 함수 signature 단순화 (helpers 인자 제거): formatDrillLabel +
  getTableDrillText + renderDrillList + renderInspectorStatRow.
- markdown-table.spec 12/12 + inspector-drill.spec 15/15 (포함 AC11(b) 신규
  markdown table XSS payload case) + document-change.spec 11/11 PASS. tsc clean.
  audit-only 3 file diff 0.
- **Gate 3 self R4 + cross R1 PASS** (총 4 round — slice-2f/i 9 round 대비
  큰 개선, R-K + R-M + R-N learning 효과). security lens 자동 선택.
- **Gate 6 self R1 + cross R1 PASS** (총 2 round vs slice-2f/i 5 round).
- @codex bot = "Didn't find any major issues. Keep them coming!" 👍 (autopilot
  squash merge). PR #65 main=e1aded1.
- pre-existing 4 fail 보존 (slice-2d R-I + slice-2f/i waiver lineage).

## 1. 계속할 것

- **slice-2f/i 4 신규 backlog (R-K + R-M + R-N) 적용 효과 검증**:
  - R-K (capsule budget 인지) — plan §1-§8 합계 ~150 line target 적용.
    실측 plan = 327 line, brainstorm = 191. 전 reviewer 가 모든 §9 + §11.1
    excerpts 한 capsule 안에 봄. **결과 = Gate 3 round 4 → 1 (9 → 4 total)**.
  - R-M (brainstorm `## 용어` source 인용 의무) — `ParsedMarkdownTable` 부터
    `splitMarkdownTableRow` 까지 모두 `main.ts L<line>` 표기. CsvSeriesPoint
    오기 같은 contract drift 0 round.
  - R-N (plan compaction default) — §3 AC table-first (Markdown table),
    §11.1 source excerpts evidence file 분리 (실제는 §9.4 inline). 효과
    확실.
  - R-L (self/cross review.md 보존) 은 SFS adapter 변경 필요 — 본 sprint
    에서도 self+cross 사이 capture pattern 으로 우회. **Gate 3+6 모두 self
    재실행 0 round** (slice-2f/i Gate 3+6 각 1 회 재실행 vs 본 sprint 0 회).
- **bounded source excerpt 패턴** — `renderTable` body (~7305+) inline excerpt
  이 security lens reviewer 의 final blocker 해소. 향후 render path AC 마다
  bounded excerpt inline default.
- **leaf module 단방향 + wrapper 폐기 + factory 폐기 chain** — slice-2f/i 가
  chart prop 폐기 후 wrapper 의 1-prop 잔존 → slice-2f/ii 가 wrapper/factory
  완전 폐기. 이런 cascading cleanup 은 분해 sprint 의 자연스러운 결과 — 다음
  slice (chart render 또는 simple widget) 도 동일 cleanup 기회 점검.
- **R-I waiver lineage 보존** — chart-tool.spec baseline fail 은 git stash
  재현 검증 패턴 유지. slice-2d/2f/i/2f/ii 누적 capture pointer 보존.

## 2. 문제

- **inspector-drill XSS payload case 작성 시 첫 시도 fail** — `.pdf-inspector-
  drill-item` class selector 가 linkedom DOM 에서 0 match. 해결 = 기존
  존재하는 `[data-annotation-id]` selector 사용 + `textContent.includes(payload)`
  + `querySelectorAll("script").length === 0` 으로 evidence. 본 spec runner
  의 DOM matcher 한계. 다음 슬라이스 = test DOM matcher 차이 사전 인지.
- **`getTableDrillText` 가 markdown 안 raw payload 를 reflect 함** — 첫 cell
  값 그대로 반환. drill label 30 char slice → 일부 잘림. escape chain
  evidence 는 textContent / script tag count 로 검증. 적합한 spec 패턴 발견.
- **wrapper/factory 완전 폐기 시 4 함수 signature 변경** — implement 단계 의
  깨지지 쉬운 부분. grep audit + tsc + inspector-drill.spec individual run
  이 cover. **위험 1 (plan §11) 미리 인지 → 깨끗하게 진행**.
- **드릴 cross-cascading: chart-content + markdown-table 모두 leaf 후
  wrapper 폐기 가능** — 사전 plan 단계의 brainstorm scope 가 wrapper 폐기를
  명시적으로 옵션 Q2 로 포함. slice-2f/i 의 `Q2=A chart prop만 제거` 후 slice-2f/ii
  의 `Q2=A 전체 폐기` chain. 디자인 디시전 일관.

## 3. 시도할 것

- **다음 sprint = slice-2g (chart render widget)** 권장. ~290 line scope.
  renderChart + renderChartMount + chartContentDebounceMap +
  chartPointDebounceMap + post-mount lifecycle. 위험도 = 중 (state mutate +
  morphdom + debounce + lifecycle 동시 — slice-2b touch-swipe 수준).
  - chart-content leaf 가 이미 분리되어 있어 render 추출 더 안전.
  - 또는 **slice-2g-table** (renderTable 358 + readTableDataFromDom 39 +
    tableContentDebounceMap + refreshTableWidgets — ~500 line) 도 후보.
- **slice-2f/iii (simple widget — sticky/textbox/checklist + eraser cursor)**
  ~220 line, 위험도 낮음. 분해 sprint 마무리 후 layer C 진입 전 cleanup.
- **slice-2f/iv (container/page — renderPdfWorkspacePage + Toolbar + ...)**
  ~410 line. 마지막 슬라이스.

## 4. 이어갈 것

### 즉시 close

- [x] PR #65 push + merge (squash, main=e1aded1).
- [x] @codex bot review verdict 👍.
- [x] sfs retro --close (main=bd116f3).
- [ ] ACTIVE.md handoff 갱신.

### 누적 backlog (잔여)

- **R-K** (capsule budget): plan compaction default 효과 확인 — 본 sprint
  적용. 다음 sprint 도 적용.
- **R-L** (review.md self+cross 보존): SFS adapter 변경 필요. 본 sprint
  에서 capture pattern workaround 로 충분 (0 round 재실행). **SFS proposal
  issue 등록 검토** (별도 sprint).
- **R-M** (brainstorm 용어 source 인용): 본 sprint 적용. brainstorm template
  업데이트 backlog.
- **R-N** (plan compaction default): 본 sprint 효과 검증. plan template
  업데이트 backlog.
- (slice-2c~2f/i 누적) R-A2 / R-C / R-D2 / R-D3 / R-H / R-I (모두 별도
  sprint backlog).
- **R-O 신규** — test DOM matcher 호환성 (linkedom class selector 일부 매치
  X, `[data-*]` 와 element name selector 는 OK). spec 작성 시 selector
  선택 가이드 추가.

## 5. 종료 체크

- [x] report 가 최신이다.
- [x] review 조치가 완료 또는 이월됐다 (Gate 3 self+cross PASS / Gate 6
  self+cross PASS / @codex bot 👍 / autopilot merge).
- [x] workbench 가 접혔다 (`.sfs-local/sprints/2026-W22-sprint-2/`).

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (462 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-25T22:21:41+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
