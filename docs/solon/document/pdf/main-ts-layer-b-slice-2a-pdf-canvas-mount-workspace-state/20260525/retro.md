---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-1"
workspace: "main-ts-layer-b-slice-2a-pdf-canvas-mount-workspace-state"
handoff_dir: "docs/solon/document/pdf/main-ts-layer-b-slice-2a-pdf-canvas-mount-workspace-state/20260525"
goal: "main.ts layer B/slice-2a — PDF canvas mount + workspace state 분리"
created_at: ""
last_touched_at: "2026-05-25T12:31:30+09:00"
closed_at: 2026-05-25T12:31:30+09:00
domain: "document"
subdomain: "pdf"
feature: "main-ts-layer-b-slice-2a-pdf-canvas-mount-workspace-state"
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **Context + Callbacks + module-private state + characterization spec** 4-layer 패턴 = 3개 sprint 연속 검증 (layer A AppShellContext/RenderSink, layer B/slice-1 annotation-sync, 본 slice-2a). 후속 slice-2b~2e 도 동일.
- **사전 source excerpt + waiver 사전 capture** = Gate 3 round 절감 (round 3 PASS). 본 sprint 의 plan §8.5 (T1~T5 threat assumption) + § Source excerpts 가 Gate 3 cross PASS 의 핵심.
- **이동 commit + spec commit 분리** (b966fc0 SFS upgrade / 9a8c16b product code / d14a10b spec + domain helper refactor) = diff 검토 + 회귀 격리 용이.
- **annotation-sync 패턴 일치 = domain helper ctx 주입** = `@study-note/domain` runtime import 차단 (node:test --experimental-strip-types `export * from "./lecture-note"` extension-less 한계 우회). 후속 slice-2c~e 의 ink stroke / drill / starMark 모듈도 동일 적용 필수.
- **Gate 6 review autopilot rework loop** = deterministic finding (T1 narrow + AC7 waiver + backlog 등록) user escalation 없이 patch + rerun.

## 2. 문제

- **plan AC3 line target 과 실측 괴리** (-533 → -299): `pdfWorkspaceStore` mutable state 를 main.ts 잔류 + ctx wrapper 50+ call 보존 정책 + domain helper injection 추가 = ~100 line wrapper overhead. 차후 sprint plan 의 line target = "wrapper 포함 conservative metric" 으로 기재.
- **`@study-note/domain` runtime import 한계 미리 인지 X** = workspace-store 첫 구현 후 spec 실행 시 ERR_MODULE_NOT_FOUND 발견 → domain helper ctx 주입으로 refactor 재실행. plan 작성 시 spec import 경로 검증 step 부재.
- **Gate 6 self-review round 1~2 = security lens auto-locked** 가 raw err 통과 (sprint-W21 의도) 를 매번 escalate. 해결 = plan T1 narrowed + backlog `bl-pdf-rum-error-scrubbing` + waiver capture. 후속 sprint = plan 단계에서 "raw err 통과 = sprint-W21 의도" 명시하면 round 1 부터 통과 가능.

## 3. 시도할 것

- **다음 sprint plan source excerpt 에 wrapper line overhead 포함 metric**: pure 분리 line vs wrapper 추가 line = before/after 명시.
- **spec import path 검증 step 추가**: implement.md §2 가드레일에 "신규 모듈의 runtime import = node:test --experimental-strip-types 호환성 사전 검증" 항목.
- **plan §8.5 threat T1 template 갱신** = "RUM context payload allowlist vs error 인자 raw 통과 (Datadog SDK default + sprint-W21 의도)" 사전 명시.
- **division ledger sub-agent council always-on (SFS 0.6.119)** = brainstorm/plan/implement/review 모두 6 row 채움. 본 sprint = 6 row 다 채움 + security 가 추가됨 (auto). 후속 sprint 도 동일.

## 4. 이어갈 것

- **다음 sprint = layer B/slice-2b** (classDate + touch/swipe + nav/fullscreen). 위험도 중-낮음 (event 패턴 단순, mobile QA 부담만). main.ts ~9,954 → 추정 ~9,500 (-450 line).
- **handoff doc** = `docs/solon/handoff/20260525-layer-b-slice-2b-handoff.md` 작성 (계속).
- **Residual hardening backlog 4건** (별 ops sprint 후보):
  - `bl-pdf-blob-url-scheme-allowlist` + `bl-csp-baseline` (root cause)
  - `bl-pdf-rum-error-scrubbing`
  - `bl-fe-spec-fix-pre-existing` (4 fail)
- **iPad QA + Datadog RUM 점검** = PR #59 prod 머지 후 manual.
- **React migration backlog** ([[project-react-migration-backlog]]) = layer C/D 까지 완료 후 재검토.

## 5. 종료 체크

- [x] report 가 최신이다 (`docs/solon/document/pdf/main-ts-layer-b-slice-2a-pdf-canvas-mount-workspace-state/20260525/report.md`)
- [x] review 조치가 완료 또는 이월됐다 (Gate 6 self+cross PASS, waiver 3건 capture, backlog 2건 신규, @codex review 트리거)
- [x] workbench 가 접혔다 (sfs retro 자동 sprint close)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (433 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-25T12:31:30+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
