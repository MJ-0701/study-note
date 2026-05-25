---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-2"
workspace: "main-ts-layer-b-slice-2b-classdate-touch-swipe-nav-fullscreen"
handoff_dir: "docs/solon/main-ts-layer-b-slice-2b-classdate-touch-swipe-nav-fullscreen/20260525"
goal: "main.ts layer B/slice-2b — classDate + touch/swipe + nav/fullscreen 분리"
created_at: ""
last_touched_at: "2026-05-25T15:50:55+09:00"
closed_at: 2026-05-25T15:50:55+09:00
---

# 회고

> sprint-W22-sprint-2 (layer B/slice-2b) — merged PR #60 (squash `e8c1f87`).

## 1. 계속할 것

- **slice-2a 패턴 (named export + ctx 주입)** 일관 적용: class-date /
  view-state / document-change = stateless 함수 + ctx 마지막 인자. touch-swipe
  만 factory (module-private `activeSwipeGesture` state). 4 module 분리에
  무리 없이 적용.
- **공유 상수 SSoT (`pdf-workspace/constants.ts`)**: 5 상수 (`PDF_MATERIAL_UNASSIGNED_{CLASS,WIRE}_DATE`,
  `SWIPE_THRESHOLD_{RATIO,MIN_PX}`, `PDF_WORKSPACE_ROOT_ID`) 추출 + main.ts
  re-import. listener option 도 `TOUCH_SWIPE_LISTENER_OPTIONS` const 로
  SSoT 화하여 main.ts addEventListener 가 직접 참조 (advisor #1 finding 회복).
- **characterization spec 우선 + Node `--experimental-strip-types`
  runtime**: 신규 4 spec / 61 case + 기존 spec 회귀 0. `import "./mod.ts"`
  (.ts extension) 만 사용. `import type` 는 extension-less OK.
- **advisor() call 의 cost-benefit**: Gate 6 self round 1 직전 advisor 가
  3 blind spot 잡음 (listener dead code + annotation-sync 715 mismatch
  의심 + AC7 vague). 그 중 listener dead code 는 실제 production decoupling
  bug 였음. 향후 sprint 의 Gate 6 진입 전 advisor 1회는 표준 step.

## 2. 문제

- **Gate 3 cross + Gate 6 cross 가 self PASS verdict 를 못 봄** (2회 발생).
  SFS adapter 가 review.md 의 §2 (판정) 와 §4 (Implementation Acceptance
  Ledger) 를 SFS 가 auto-fill 하지 않아 self PASS verdict 가 cross prompt
  에 안 보임. 매번 수동 patch + rerun 으로 우회.
  - **slice-2a 와 동일 패턴 → 다음 sprint 부터 self PASS 결정되는 즉시
    review.md §2 수동 update 를 routine 화**.
- **Codex bot review timing**: `@codex review` 트리거 후 30~60s 내 결과
  도착. 본 sprint 는 1회 통과 (No major issues). round 의 polling 은
  background bash + monitor 가 적합.
- **AC7 (authenticated PDF + mobile smoke)** — codex round 4까지 retro-defer
  거부 후 `sfs capture user-approval` 로 명시 waiver 기록 후 PASS. plan
  §3 AC7 wording ("수동 smoke (재현 순서 retro 에 기록)") 가 codex 에는
  "Gate 6 의 차단 사유" 로 해석됨. 향후 sprint plan 작성 시 retro-defer
  명시는 plan §3 + plan §9 (waiver 사전 표명) 두 곳 모두에 적어야 1회
  pass 가능.
- **document-change.ts category 부분 mismatch** (4/7 PDF, 3/7 notebook
  feature): pdf-workspace/ 안에 두는 게 slice-2a 일관성 우선 했지만, 향후
  slice-2d/2e 또는 layer C 진입 시 `workspace-handlers/` 또는 `notebook-handlers/`
  로 재배치 검토. waiver = R-F.
- **wrapper overhead**: 4 module 추출 → 호출 site 22 곳을 wrapper 또는
  직접 호출로 옮기는데 wrapper 가 ~80 line 차지. plan 의 conservative
  -340~-400 estimate 가 정확 (실측 -373).

## 3. 시도할 것

- **review.md §2 manual update routine**: Gate 3 / Gate 6 self PASS 직후
  바로 review.md §2 + §4 + §7 manual fill → cross 진입. cross 호출 → SFS
  template reset 직후에도 §2-§7 본문 sticky preserve. 본 sprint 에서
  확인된 SFS 0.6.120 의 동작.
- **plan §9 (위험) waiver 사전 표명**: AC 가 retro-defer 또는 cross-sprint
  계약일 때 plan §3 acceptance criteria 의 wording 만으로는 codex 가 알아
  보지 못함. plan §9 위험 섹션에 "R-X = AC<N> 의 X 부분은 retro window 에
  manual smoke. user 사전 합의 (capture <id>)" 형태로 명시.
- **handoff doc 자동 update**: `docs/solon/handoff/ACTIVE.md` 또는 그
  대응되는 sprint state file 의 `## 진행 상황` 표를 sprint close adapter
  가 자동 갱신할 수 있는지 SFS 0.6.121 backlog 로 제안.
- **AC1 보수 line target metric**: `target ≤ N` 만이 아니라 `target ≤ N
  (wrapper overhead 추정 +80 ~ +120, 보수 baseline)` 로 plan §3 에 명시.
  본 sprint 는 round 2 자체 finding 으로 9,633 → 9,581 trim 했지만 plan
  단계에서 expected wrapper overhead 가 명시되었다면 round 1 fix 한
  번에 closed 가능.

## 4. 이어갈 것

- **slice-2c (ink + RAF batch)** — 단독 sprint, 위험도 매우 높음. 5
  fragile invariant (좌표 0~1 ratio + RAF batch + getCoalescedEvents +
  morphdom canvas preservation + pdfjs polyfill saga). plan 단계에서
  invariant 별 source excerpt + characterization spec 우선 도입.
- **slice-2d (drill highlight)** — 위험도 중. drill renderer 와 highlight
  state 의 boundary 검토 필요. slice-2c 이후.
- **slice-2e (star mark + renderer ~1200 line)** — 위험도 중-높음. renderer
  대형 모듈 추출은 layer C 와 함께 결합 검토.
- **mobile QA backlog** (AC7 retro-defer): user 가 retro window 에서 iPad
  + MacBook Safari 로 인증 후 PDF mount + page nav + tool palette +
  fullscreen + ESC + classDate select + iPad swipe + iOS preventDefault
  timing 실측. 회귀 시 [[project-react-migration-backlog]] 와 별도로
  hotfix sprint.
- **document-change.ts 재배치 검토** (slice-2d/2e 진입 시): chart /
  checklist / weekNote branch 가 notebook feature 라 `workspace-handlers/`
  또는 별도 location 으로 재분류 가능. 본 sprint 에서는 slice-2a 일관성
  우선.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (AC7 waiver capture
  20260525T050330Z-17077, mobile QA = retro window)
- [x] workbench 가 접혔다 (`sfs retro` close adapter 1회)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (443 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-25T15:50:55+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->

## §7. 결과 요약

- main.ts: 9,954 → **9,581** (-373, -3.74%). 누적 layer A~B/slice-2b =
  11,049 → 9,581 (-1,468 / -13.29%). 9k target 까지 -581 line 더 필요.
- 신규 5 module (constants 29 + class-date 307 + view-state 226 + touch-swipe
  245 + document-change 234 = 1,041 line) + 4 spec (61 case 누적).
- 기존 pdf-workspace 회귀 0 (annotation-sync 20 + canvas-mount + workspace-store
  35 = 55 case). 전체 116/116 PASS.
- vite build green (✓ built in 1.24s). `tsc --noEmit` clean.
- Gate 3 self+cross PASS (round 3+2). Gate 6 self+cross PASS (round 5+2).
- PR #60 squash merged → main=`e8c1f87`. @codex bot = "No major issues".
- Waiver 1건: AC7 retro-defer (capture 20260525T050330Z-17077, user 답변 A).
- Backlog 2건: R-F (document-change.ts 재배치 검토 slice-2d/2e), R-G
  (chartPointDebounceMap main.ts 잔류 + ctx 주입 — 현 합리).
