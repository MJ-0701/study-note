---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-21"
workspace: "layer-d-slice-3-sidebar-cache-ui-ephemeral-sidebartermscache-sidebarsubjectscache-sidebaropentermids-hotkeyhelpmodalopen"
handoff_dir: "docs/solon/layer-d-slice-3-sidebar-cache-ui-ephemeral-sidebartermscache-sidebarsubjectscache-sidebaropentermids-hotkeyhelpmodalopen/20260527"
goal: "layer D/slice-3 — sidebar cache + UI ephemeral (sidebarTermsCache/sidebarSubjectsCache/sidebarOpenTermIds + hotkeyHelpModalOpen)"
created_at: "2026-05-27T20:58:32+09:00"
last_touched_at: "2026-05-27T21:15:00+09:00"
closed_at: 2026-05-27T20:58:32+09:00
---

# 회고

## 1. 계속할 것

- **sprint-19/20 lesson 누적 효과**: Gate 3 R1 PASS + Gate 6 self+cross R1 모두 PASS. 단일 round close.
  - AC count cap (≤ 16/8/28 등) 사전 정의 → review 단계 export/spec drift 흡수.
  - plan §4.1 inline source body embed → reviewer "bundle gap" finding 0.
  - state transition contract (T1~T7 + T1~T5) 사전 정의 + spec 1:1 매핑.
  - Context+Callbacks pattern + 자기 자신 const wiring (function factory 대신).
- **defensive race guard 보존**: load 함수의 userId 비교 3 hit → 5 hit (catch 절 보호 추가).
- **module 분리 partition**: sidebar (identity 종속) + ephemeral (identity 무관) 2 module 명확.

## 2. 문제

- (없음). Gate 3/6 모두 R1 PASS. 사용자 노출 동작 변경 0. 회귀 0.
- 미세 이슈: AC1 line target ≤ 4,720 처음 시도 4,730 (10 over). ctx/cb const refactor (function factory → module const) 로 -20 line 추가 회수 → 4,710.

## 3. 시도할 것

- **wiring 최적화 패턴 표준화**: ctx/cb 가 매 호출 마다 const factory 호출하지 않고 module-level const 로 고정. 다음 sprint 부터 default 적용.
- **inline lambda → direct fn ref**: `getX: () => moduleFn()` 보다 `getX: moduleFn` 짧음. SidebarContext 의 inline lambda 3 → direct ref 3 으로 3 line 감소.
- **brainstorm/plan inline embed 최소 §4.1.x 패턴 유지**: 본 sprint 처럼 source body + transition contract 표 + 호출 site 표.

## 4. 이어갈 것

- **slice-4 (pdfWorkspaceStore 잔여)**: userNotesPutTimers + userNotesPutAborts + userNotesPutChains + userNotesFetchedKeys + syncFailureTracker + syncBackendError + syncBackendErrorReported 등 ~7 mutable state + 관련 fn. main.ts ~4,710 → ~4,500 (-200 예상).
- **Codex Datadog ops dashboard**: 별도 worktree 머지 (`codex/readme-datadog-ops`).
- **Layer D close 후 React migration 재검토**: slice-4 완료 시점에서 분해 결산 + cost 재평가.

## 5. 종료 체크

- [x] report 가 최신이다 (sfs retro 자동 생성)
- [x] review 조치 완료 (Gate 3 self+cross R1 PASS, Gate 6 self+cross R1 PASS)
- [x] workbench 접힘 (sprint closed)
