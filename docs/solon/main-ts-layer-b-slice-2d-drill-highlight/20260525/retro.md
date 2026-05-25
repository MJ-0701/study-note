---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-2"
workspace: "main-ts-layer-b-slice-2d-drill-highlight"
handoff_dir: "docs/solon/main-ts-layer-b-slice-2d-drill-highlight/20260525"
goal: "main.ts layer B/slice-2d — drill highlight 분리"
created_at: ""
last_touched_at: "2026-05-25T18:31:09+09:00"
closed_at: 2026-05-25T18:31:09+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **measurement-first orient**: brainstorm §1 에 main.ts line/grep/caller graph/spec case 실측치 명시. handoff "8→10 case" 추정 vs 실측 13+1 dynamic security loop = 14 mismatch 미리 차단. slice-2c retro lesson 직접 적용으로 silent narrow 회피.
- **scope boundary 결정 brainstorm 단계**: option A/B 명시 + default 추천 + Q1 user 답변 받고 plan 진입. plan 단계로 미루지 않음.
- **Context+Callbacks+DomainHelpers 패턴**: ink-stroke/annotation-sync 와 동일. spec 이 helpers fixture 만 mock 하면 됨. 14 case 모두 PASS 까지 단발 코딩.
- **lazy factory 로 TDZ 회피**: `getDrillHighlightHelpers()` 함수 declaration (hoist) 안에서 const lookup. Gate 6 self-review 가 발견. eager const = ReferenceError 잠재.
- **events.jsonl compaction workaround**: capture `--kind evidence` + capture `--kind waiver` 로 self PASS 보존. Gate 3 cross 2회 partial 후 round 3 PASS.
- **autopilot rework loop**: Gate 6 self R1 partial (TDZ + ledger blank), R2 partial (untracked file + .gitignore 미설명 + 4 fail 명세 누락), R3 PASS — deterministic patch + 같은 gate review 재실행 (user 호출 X).
- **AC2/AC3 ±50%/±100% wording**: 실측이 추정 범위 ±100 line 약간 over (-417 vs -300±100) → ledger 에 "slight overshoot (under-promise/over-deliver)" 로 기록. Plan W5 의 의도와 정합.

## 2. 문제

- **events.jsonl compaction key 한계 재발** (SFS 0.6.121/0.6.122). slice-2c retro R-D2 backlog 의 정정 미적용. self R3 + cross R3 PASS 까지 4 round + capture+waiver 2개 필요. SFS upgrade 시 compaction key 에 review_stage 추가 제안 (R-D2 escalate).
- **Gate 6 self R1 의 TDZ bug**: 본 sprint 의 implement 단계가 자체 발견 못 함. eager const 가 module-load time 에 후방 const (CHART_TYPE_PREFIX) 를 lookup 시 ReferenceError. spec 은 drill-highlight.ts 직접 import 라 main.ts boot path 안 탐. Gate 6 review 가 발견. lesson: module init order 검토를 implement 의 self-check 로 명시 포함.
- **handoff 추정 mismatch**: handoff 의 "8→10 case" + "~?00 line" 추정 vs 실측 13+1=14 case + 507 line 잔존. slice-2c retro 의 동일 lesson 재발. → 본 retro 에서 다음 handoff 작성 시 case/line/symbol 실측치 명시 의무화 backlog.
- **pre-existing 4 fail 잔존** (drill 무관): chart-tool + pdf-material-library 의 `updatePdfMaterialMetadata` export 누락. 본 sprint 외 backlog 로 분리. drill spec 1 fail 은 본 sprint 가 우회로 PASS 전환 (-1 fail 개선).
- **AC2 -417 vs estimate ±100 over by 17 line**: under-promise/over-deliver 로 ledger 기록. 다음 sprint 의 line estimate range 는 ±50% 까지 (slice-2c lesson) 또는 ±100 명시.

## 3. 시도할 것

- **slice-2e (star mark only)** 단독 sprint: renderStarMark + add/remove/resizeStarMark + Y key bind + dispatch = ~150 line. main.ts -100±50. 위험도 낮음. 빠른 close.
- **slice-2f (renderer big)** 별도 sprint: 6503-7872 = 1,369 line. renderPdfWorkspacePage(205) + renderChart(274) + renderTable(358) + 14 widget helper 분리. main.ts -1,000+ 가능. 위험도 중-높음 (handoff 와 동일). 분해 = `pdf-workspace/widgets/` subdirectory + chart/table separate file 후보.
- **module init order self-check**: implement 단계 checklist 추가 — module-init time eager const 가 후방 const/let 을 참조하는가? 발견 시 lazy factory / function declaration.
- **R-D2 SFS upgrade escalation**: slice-2c 의 R-D2 backlog 본 sprint 에서도 재발. SFS upgrade PR 또는 issue 제안. compaction key 에 review_stage 추가.

## 4. 이어갈 것

- **slice-2e (star mark only)** = 다음 sprint 후보. ~150 line scope, 위험도 낮음.
- **slice-2f (renderer big)** = slice-2e 후 분해 또는 별도 sprint. ~1,369 line scope, 위험도 중-높음.
- **layer C (subject views)** = backlog. 누적 -2,049 / 18.55% 진행 (9k target 달성, 8k 가 다음 호기심 target).
- **layer D (state/sync residual)** = backlog.
- **React migration** = 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]).
- **R-A2 mobile pen smoke + Datadog readout**: slice-2c retro 의 capture (20260525T070319Z-91020 + 20260525T074710Z-21895) 본 sprint 도 적용 — user 의무 아님. 일상 사용 회기 시 hotfix.
- **R-D2 events.jsonl compaction**: SFS 0.6.122 issue/PR 제안.
- **pre-existing 4 fail**: `updatePdfMaterialMetadata` shim missing — chart-tool/pdf-material-library spec import block. 별도 sprint.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (Gate 3/6 self+cross PASS + Codex bot PASS + waiver/evidence capture)
- [x] workbench 가 접혔다 (sprint closed by `sfs retro`)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (450 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-25T18:31:09+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
