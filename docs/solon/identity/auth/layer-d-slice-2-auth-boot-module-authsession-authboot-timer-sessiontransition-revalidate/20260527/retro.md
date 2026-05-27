---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-20"
workspace: "layer-d-slice-2-auth-boot-module-authsession-authboot-timer-sessiontransition-revalidate"
handoff_dir: "docs/solon/identity/auth/layer-d-slice-2-auth-boot-module-authsession-authboot-timer-sessiontransition-revalidate/20260527"
goal: "layer D/slice-2 — auth boot module (authSession + authBoot* timer + sessionTransition + revalidate)"
created_at: ""
last_touched_at: "2026-05-27T20:22:28+09:00"
closed_at: 2026-05-27T20:22:28+09:00
domain: "identity"
subdomain: "auth"
feature: "layer-d-slice-2-auth-boot-module-authsession-authboot-timer-sessiontransition-revalidate"
---

# 회고

## 1. 계속할 것

- **사전 partition advisor**: 본 sprint 진입 직전 advisor() 호출이 정확한 분할 (authSession/authMode = ambient 잔류, 6 mutable + 8 fn module 이관) 결정. Gate 3 R1 partial 후에도 architecture 재설계 불필요.
- **plan.md 안에 source body inline embed**: Gate 6 cross R3 까지 reviewer 가 "source body 부족" 외 substantive finding 0. R4 에서 plan.md §4.2 inline embed 추가하니 self R6 + cross R4 즉시 PASS.
- **state transition contract 표 사전 정의**: T1~T14 + T11 a/b 분리 + T7-stale-retry/T10-attached/T13-attached defense in depth case 를 source-excerpt + plan §4.1.3 사전 정의. spec 1:1 매핑이 review 빠르게 PASS.
- **Context+Callbacks 패턴 유지**: sprint-19 의 notebook-storage.ts lineage. main.ts ambient state 노출 없이 ctx getter / callback 만 통신. boundary 명확.
- **test seam (setTimeoutFn/clearTimeoutFn ctx 주입)**: spec FakeTimer 가 timer race 케이스 (T3/T4/T7-stale-retry) deterministic 검증.

## 2. 문제

- **Gate 3 self R1~R3 partial 3 round**: P1 (markSignInSuccess 미정의) → P1 (clearCrossDomainSession naming) → P1 (401/403 attached-session defense in depth) → P1 (timeout/network transition) → P1 (defense in depth 강도). export 14 → 15 → 14 → 16 변동. 초기 plan 단계에서 advisor() 호출했음에도 reviewer 가 새 finding 추가.
- **Gate 6 self R2 P1**: original main.ts 의 `authSession = undefined` in `scheduleAuthBootRetry` 가 vestigial. production 에서 항상 authSession=undefined 시점 호출이라 effective no-op. defense in depth 가 attached-session flow 를 정식 path 로 인정한 직후, transient retry 가 identity clear 하는 모순. fix = remove + T7-stale-retry 보호.
- **Gate 6 cross R1 F1**: retryTimer fire callback 의 requestId guard 부재. cancelAuthBootRequest 가 timer clear 지만 defense in depth 로 scheduledRequestId !== authBootRequestId 비교 추가.
- **AC3 count mismatch**: 23 → 25 → 26 변동을 implement.md / log.md narrative 가 따라가지 못함. plan AC3 cap 도 24 → 28 갱신.

## 3. 시도할 것

- **plan AC 의 export count / spec count 는 cap 으로**: sprint-20 의 export count 변동 (14 → 16) + spec count 변동 (16~22 → 18~28) 은 review feedback 흡수 정상 흐름. 정확 숫자 아니라 cap 으로 두면 자체 patch 만으로 round 단축. 다음 sprint 부터: `export ≤ N + 4 test-only` / `spec ≥ M + ≤ M+10` 패턴.
- **review feedback inline embed**: plan.md §4.x 에 source body 처음부터 embed. reviewer 가 "bundle gap" finding 추가 round 절약.
- **defense in depth 사전 명시**: attached-session 401/403 + retry identity preservation + retryTimer scheduled-vs-current guard 3 layer 를 plan 초기 transition contract 에 사전 정의. brainstorm 단계에서 "API runtime export 인 한 caller discipline 만으로 invariant 강제 불가" 인식 필요.
- **vestigial code 회수 명시**: `authSession = undefined` in `scheduleAuthBootRetry` 같은 production effective no-op 는 refactor 시 사전 detect. defense in depth 적용 시 vestigial path 가 정식 path 로 인정되어 모순 가능.

## 4. 이어갈 것

- **slice-3 (sidebar terms cache + UI ephemeral)**: `sidebarTermsCache` / `sidebarSubjectsCache` / `sidebarOpenTermIds` + `hotkeyHelpModalOpen` + 기타 UI ephemeral. main.ts ~4,785 → ~4,650 (-130 예상).
- **slice-4 (pdfWorkspaceStore 잔여)**: `userNotesPutTimers` / `userNotesPutAborts` / `userNotesPutChains` / `userNotesFetchedKeys` / `syncFailureTracker` / `syncBackendError` 등 sync caching. main.ts ~4,650 → ~4,400 (-250 예상).
- **Layer D close 후 React migration 재검토**: 분해 완료 시점 user 와 cost 재평가 (project_react_migration_backlog 메모리 참조).
- **vestigial code audit backlog**: sprint-20 fix 처럼 production effective no-op 인 code path 가 다른 lifecycle 에 잠재할 가능성. main.ts 잔여 4,785 line vestigial assignment audit 필요.

## 5. 종료 체크

- [x] report 가 최신이다 (sfs retro 자동 생성)
- [x] review 조치 완료 (Gate 3 self R4 + cross PASS, Gate 6 self R6 + cross R4 PASS)
- [x] workbench 접힘 (sprint closed)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (529 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-27T20:22:28+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
