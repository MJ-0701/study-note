---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-10"
workspace: "layer-c-slice-2-sidebar"
handoff_dir: "docs/solon/identity/auth/permissions/20260526"
goal: "layer C/slice-2 — sidebar (renderHomeSidebar/renderSubjectSidebar) + Context (notebook + authSession.role + sidebarTermsCache)"
created_at: "2026-05-26T17:20:00+09:00"
last_touched_at: "2026-05-26T17:25:00+09:00"
closed_at: "2026-05-26T17:20:00+09:00"
---

# 회고 — sprint-W22-sprint-10 (Layer C/slice-2 sidebar)

> **Layer C/slice-2 closed.** main.ts 6,523 → **6,332** (-191 / 누적 **-4,717 /
> -42.69%** from 11,049). **6.3k 달성**.

## 1. 계속할 것

- **bottom-up extraction**: 본 slice 의 sidebar = NOT pure leaf 이므로 Context
  5 field 적용. sprint-9 의 subject-cards (pure leaf, Context 0) 와 자연스러운
  대비. 두 패턴 (pure leaf bottom-up + Context bottom-up) 모두 검증.
- **advisor pre-empt 4 가이드** 반복 효과: numeric AC ±20% + Day 1 source-excerpt
  + `--executor codex` R1 + feature branch + PR.
- **Gate 3 PASS first-try**: self R2 + cross R1 PASS (sprint-9 동일 패턴).
- **Codex bot post-merge review trigger** with `@codex review` comment.

## 2. 문제

- **Gate 6 self 6 round** — sprint-9 보다 길어짐 (sprint-9 self 4). 사유:
  - Round 1~2: evidence file bundle scanner cap.
  - Round 3: case 3 weak assertion finding + line count drift.
  - Round 4: AC ledger 숫자 drift (22 → 23, 334 → 335).
  - Round 5: AC12/AC13 plan stage-deferral 명시 누락.
  - Round 6: PASS.
- **plan AC numeric drift**: R3 case split 후 spec line + test count 변경.
  ledger normalization 후 PASS.
- **Codex bundle scanner cap**: source-excerpt-sidebar.md + evidence-gate6.md
  embed 안 됨. workaround = evidence-gate6.md 의 main.ts excerpt inline.

## 3. 시도할 것

- **R-AD 신규** (numeric AC auto-revision): plan AC 의 numeric estimate 가 sprint
  진행 중 실측 후 자동 갱신.
- **R-AE 신규** (Gate 6 stage-deferred AC marker): plan AC 에 `(stage-deferred)`
  마커 명시. self stage review 가 stage-deferred AC 를 acceptance ledger 에서 제외.
- **R-AF 신규** (bundle scanner sprint workbench inclusion): SFS upgrade 후보 —
  `.sfs-local/sprints/<id>/source-excerpt-*.md` + `evidence-*.md` cap-exempt embed.

## 4. 이어갈 것

- **C/slice-3 = home + intake** 다음 sprint. ~267 line. Context 필요.
- **C/slice-4 = subject-class**, **C/slice-5~10** backlog.
- **3 sidebar state action** 별도 slice 후보.
- **R-AD/R-AE/R-AF** upstream SFS feedback.
- **AC12 PR + Codex bot** = retro 후 PR open + bot review trigger.

## 5. 종료 체크

- [x] report 최신.
- [x] review 조치 완료 (Gate 3 self R2 + cross R1 PASS / Gate 6 self R6 + cross R1 PASS).
- [x] workbench 접힘.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- recommend: qa activate (light)
- consider: infra activate (light)
<!-- solon:division-recommendations:end -->

## §7. 측정

| 항목 | 값 |
|---|---|
| main.ts 변화 | 6,523 → **6,332** (-191 / -2.93% sprint / 누적 -42.69%) |
| 누적 Layer A+B+C 효과 | 11,049 → 6,332 (-4,717 / -42.69%) |
| sidebar.ts 신규 | 281 line / 12 value export + 1 type export |
| sidebar.spec.ts 신규 | 315 line / 23 case PASS / 0 fail |
| SidebarContext field | 5 lazy getter |
| AC9 surface | 16 (13 escape + 1 denylist UI + 2 PII/logging boundary) |
| Direct imports | 12 module |
| Context / Callbacks | 5 / **0** |
| Defensive escape 추가 | 8+ (subject.title / aria-label / href 다수) |
| 전체 spec | 252 + 38 + 22 + 23 = **335 tests / 0 fail** |
| typecheck | EXIT=0 |
| Gate 3 round | self 2 + cross 1 (PASS) |
| Gate 6 round | self 6 + cross 1 (PASS) |
| advisor consult | 0 (sprint-9 가이드 재적용) |
| Codex bot 👍 | pending (PR open 후) |
| feature branch | refactor/layer-c-slice-2-sidebar |
