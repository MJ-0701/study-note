---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-8"
workspace: "layer-b-slice-2f-iv-bis-renderpdfworkspacepage-extraction-heavy-context-design-ac9-e-permission-denylist-waiver-lineage-closure"
handoff_dir: "docs/solon/design/system/permissions/20260526"
goal: "layer B/slice-2f/iv-bis — renderPdfWorkspacePage extraction + heavy Context design + AC9(e) permission denylist waiver lineage closure"
created_at: "2026-05-26T12:53:04+09:00"
last_touched_at: "2026-05-26T12:55:00+09:00"
closed_at: 2026-05-26T12:53:04+09:00
domain: "design"
subdomain: "system"
feature: "permissions"
---

# 회고 — sprint-W22-sprint-8 (layer B/slice-2f/iv-bis renderPdfWorkspacePage)

> **Layer B = closed**. main.ts 6,909 → **6,689** (-220 / 누적 -4,360 / -39.46%).
> 9k+8k+7k+6.7k 4 target 달성. **다음 sprint = Layer C (subject views) 진입**.

## 1. 계속할 것

- **advisor 사전 consult** (advisor() before substantive write) — Gate 3 brainstorm
  단계에서 3-bucket dependency split / AC9(e) closure 의무 / 18~22 case / scope
  guard 5 가이드 받음. 후속 회고 → 6 sprint 연속 advisor pre-write pattern 검증.
- **autopilot rework loop** (CLAUDE.md SFS 0.6.117) — Gate 3 self R1 partial → P1+P2+P3
  patch → R2 PASS / Gate 6 self R1 partial → AC3 17→12 + evidence patch → R3 PASS.
  user 호출 0회 (scope/AC 의미 변경 없음).
- **Context+Direct imports 패턴 6회 반복 검증** — chart-widget/table-widget/
  simple-widget/page-render/page-render-helper/workspace-page. 한 sprint slice
  당 평균 -180 line + spec 18~20 case + Codex 👍.
- **defensive escape 추가**의 review-triggered 가시화 — href escape +
  formatPdfTool output escape = latent XSS path closure. spec case 15 가 적극적으로
  발견.
- **handoff 자동화** — ACTIVE.md SessionStart hook + ACTIVE.md 의 layer matrix
  체크리스트가 fresh session 의 진행 상황 즉시 가시화.

## 2. 문제

- **plan estimate 과/부족** (AC2/AC5/AC8) — Codex Gate 6 R1+R2 가 ledger normalization
  요구. plan §3 의 9~12 export / 20 direct imports / 6700~6720 line 이 실측 (2 / 17 /
  6689) 과 ±변동. brainstorm 단계에서 estimate 의 +/- 폭을 명시했어야 함.
- **SFS event 기반 자동 PASS detect** — Gate 3 의 `--prompt-only` 모드가 review_run
  event 미기록 → 다음 cross stage 에서 "no prior self-PASS" 로 partial. workaround =
  capture --kind evidence + Codex 를 self executor 로도 사용. SFS upgrade 요구
  사항 (R-W 신규).
- **AC10 lint script 미정의** — apps/web/package.json 의 `lint` 명령 부재. tsc strict
  가 functional substitute. `sfs capture --kind waiver` 로 명시 기록.
- **Generator executor metadata "unknown"** — SFS review capsule 의 generator_executor
  필드가 "unknown" — claude main 의 self-author 가 SFS event 에 자동 기록되지 않음.
  Codex 의 review independence risk warning trigger.
- **bundle scanner excerpt cap** — Codex review bundle 이 main.ts 의 first ~120 line
  만 embed → renderPdfWorkspacePage body 5377~5581 가 capsule 에서 보이지 않아 AC7
  independent verify 불가. workaround = sprint workbench 에 source-excerpt
  evidence file 추가.

## 3. 시도할 것

- **R-W 신규**: SFS 의 `sfs review --gate N --stage self --executor claude` 가 claude
  main bridge auth 미동작 시 fallback path (capture --kind self-cpo-pass + sprint
  state 의 verdict update). 현재 workaround = Codex executor 사용.
- **R-X 신규**: SFS handoff_dir auto-detection 의 keyword 우선순위. "permission"
  단어가 domain=design/system/permissions 로 routing 됐지만 본 sprint 의 본질은
  pdf-workspace refactor. plan.md / brainstorm.md 에 explicit `handoff_domain`
  override 지원 (또는 sprint goal 의 primary noun 우선순위).
- **R-Y 신규**: Gate 6 review capsule 의 excerpt allowlist — sprint workbench 의
  `source-excerpt-*.md` 또는 `evidence-*.md` 파일은 cap-exempt 로 embed. 본 sprint
  의 source-excerpt-ac7.md 가 효과적이었으나 wave 2 만에 인지.
- **R-Z 신규** (plan estimate guard): brainstorm §7 의 "완료 기준 후보" 에 estimate
  ±N% 명시 또는 "확정 단계에서 측정 후 plan 갱신" 명시. AC2/AC5/AC8 같은 line
  count / export count / field count 는 estimate 단계 — 실측 후 plan 갱신 의무.

## 4. 이어갈 것

- **Layer C 진입** (다음 sprint) — subject view 5 page renderer (~1,200 line). main.ts
  6,689 → 약 5,500 (6k 호기심 달성). brainstorm Q1 = subject view hierarchy +
  우선순위 결정 (renderSubjectClassPage 가 최대 surface, renderWeekPage 도 큰
  surface).
- **Layer D backlog**: state/sync residual — handleDocumentClick/PointerDown/Move/Up
  big switch + Annotation hydration callback wiring. layer C 후 자연스러운 단계.
- **React migration backlog** — A~D 완료 후 dependency-graph bottom-up 재진입.
- **SFS R-U/R-V/R-W/R-X/R-Y/R-Z** — upstream feedback (SFS issue tracker 등록 가능).
- **Codex bot 👍 PR review** — implementation 후 push + PR open 후 trigger.

## 5. 종료 체크

- [x] report 가 최신이다 (report.md 별도 작성)
- [x] review 조치가 완료 또는 이월됐다 (Gate 3 self R4 + cross R5 PASS / Gate 6 self R3 + cross R1 PASS)
- [x] workbench 가 접혔다 (sfs retro --close 자동)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (480 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-26T12:53:04+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->

## §7. 측정 (참고)

| 항목 | 값 |
|---|---|
| main.ts line 변화 | 6,909 → **6,689** (-220 / -3.18% sprint / 누적 -39.46% 11k 대비) |
| 누적 Layer B 효과 | 11,049 → 6,689 (-4,360 / -39.46%) |
| workspace-page.ts 신규 | 300 line / 2 export (renderPdfWorkspacePage + WorkspacePageContext type) |
| workspace-page.spec.ts 신규 | ~395 line / 19 case PASS / 0 fail |
| WorkspacePageContext field | 12 (8 lazy module-state + 1 sub-context + 3 main.ts render hooks) |
| Direct imports | 17 module / 7 external module (escapeHtml/subjectClassPath/page-render×5/formatSvgPoint/simple-widget×4/getSubjectPdfWorkspace/getPdfMaterialKey/drill-highlight/chart-widget/table-widget/star-mark) |
| AC9 security closure | 5-layer (a/b/c/d/e) — e 신규 = 6 user-content surface (S1~S6) + 1 trust boundary (TB1) + 1 negative UI (PD1) |
| Defensive escape 추가 | 2 (href = subjectClassPath result + formatPdfTool output) |
| pdf-workspace regress | 15 spec / 252 tests / 0 fail |
| app regress | 2 spec / 38 tests / 0 fail |
| typecheck | EXIT=0 |
| Gate 3 round | self 4 (executor claude --prompt-only + Codex executor) + cross 3 (Codex) + 1 capture event |
| Gate 6 round | self 3 (Codex executor) + cross 1 (Codex) — 자동 PASS |
| advisor consult | 1 (Gate 2 brainstorm 전 + scope guard guidance) |
| Codex bot 👍 | pending (PR push 후) |
