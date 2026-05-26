---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-9"
workspace: "layer-c-entry-subject-view-hierarchy-decision-first-slice-scope"
handoff_dir: "docs/solon/layer-c-entry-subject-view-hierarchy-decision-first-slice-scope/20260526"
goal: "layer C entry — subject view hierarchy decision + first slice scope"
created_at: "2026-05-26T16:37:24+09:00"
last_touched_at: "2026-05-26T16:45:00+09:00"
closed_at: 2026-05-26T16:37:24+09:00
---

# 회고 — sprint-W22-sprint-9 (Layer C/slice-1 subject-cards leaves)

> **Layer C 진입 완료.** main.ts 6,689 → **6,523** (-166, **누적 -4,526 / -40.96%
> from 11,049**). **6.5k 달성**. 다음 sprint = C/slice-2 (sidebar).

## 1. 계속할 것

- **advisor pre-empt 4 가이드** — sprint-8 의 friction (numeric variance / Day 1
  source-excerpt 누락 / `--prompt-only` event 미기록 / main 직 push) 4가지 모두
  사전 차단. **첫 try Gate 3 self+cross PASS 달성** (sprint-8 = Gate 3 5+3 round).
- **bottom-up extraction with leaf 순수성 검증** — main.ts 의 8 leaf renderer +
  7 format helper 의 module state 접근 0 사전 검증 → Context overhead 0. Sprint
  8 의 17→12 rework 회피. 패턴 7회 검증 (chart-widget/table-widget/simple-widget/
  page-render/workspace-page + 본 sprint).
- **numeric AC ±20% estimate** — line/export count 추정 후 실측. 첫 try 에서
  target 범위 일치 (6,523 ∈ 6,490~6,530, 15 ∈ 13~17). Sprint 8 의 ledger
  normalization rework 회피.
- **Day 1 source-excerpt** — `source-excerpt-subject-cards.md` 10,991 byte 사전
  작성. Gate 3 cross R1 부터 evidence packaging 가용.
- **`--executor codex` R1 부터** — review_run event 자동 기록. self-CPO PASS 가
  cross 의 evidence bundle 에 즉시 visible.

## 2. 문제

- **Codex bundle scanner untracked file truncation** — 신규 module/spec 이
  git untracked 상태일 때 bundle 이 first ~80 line 만 embed. Gate 6 self R1+R2+R3
  partial (evidence packaging). workaround = git stage (R4) → 전체 diff 가시화.
- **SFS event 기반 자동 PASS detect — sprint-8 lineage 회귀**: Gate 6 self R1~R3
  의 partial 사유 = AC10 (PR + Codex bot) + AC11 (retro + ACTIVE) 가 "pending"
  으로 남음. self stage 에서 post-self 작업이 acceptance ledger 의 부분으로 누적.
  → AC10/AC11 를 self stage 의무에서 분리하거나 explicit "stage-deferred" 표시
  필요.
- **sprint-8 의 main 직 push lineage** — feature branch 복원 완료. PR 패턴
  복원 = AC10 의 의무로 (단, self/cross PASS 까지는 PR 미생성).
- **bundle scanner cap exception 미지원** — sprint workbench 의 source-excerpt-*.md
  + evidence-*.md 파일이 bundle scanner 의 file size cap 또는 first-N excerpt cap
  에 걸려 cross review 에서 "claimed but not embedded" 로 분류. R-Y backlog
  (sprint-8 retro 에서 발생) 그대로 미해결.

## 3. 시도할 것

- **R-AA 신규** (Gate 6 acceptance ledger 분리): AC10 (PR + bot) + AC11 (retro +
  ACTIVE) 를 self stage 의 implementation 의무에서 제외하고, sprint close path
  의 `sfs retro --close` 가 별도 acceptance 로 검증. self stage = implementation
  AC 만, cross stage = self + AC10/AC11 추적.
- **R-AB 신규** (untracked file diff visibility): SFS 의 `sfs review` capsule
  에 untracked source/spec file 도 git diff 처럼 first-class diff 로 embed.
  현재 workaround = git add 로 staged 상태 만들기. SFS upgrade 후보.
- **R-AC 신규** (acceptance ledger ledger language): plan §3 AC 의 numeric
  estimate = "13~17 (estimate, ±20% — 실측 후 plan revision)" 식의 명시 +
  Codex ledger 가 "implemented (within estimate range)" 로 normalize.
- **slice-2 = sidebar** 진입 — leaf 순수성 검증 (renderHomeSidebar/renderSubjectSidebar/
  renderSubjectNavItem/renderClassSchedule = ~113 line). subject-cards 패턴 직접 적용.

## 4. 이어갈 것

- **C/slice-2 sidebar** (다음 sprint) — leaf 순수성 검증 + extraction. 6k 진입
  (6,523 → ~6,410).
- **C/slice-3~10** backlog — home+intake / subject-class / summaries / memorize /
  mcp / week / pdf-library / quick-note. 5.5k = slice-2~6 (~656 line) 후 달성.
- **AC10 PR + Codex bot review** — feature branch `refactor/layer-c-brainstorm`
  push + PR open + Codex bot review trigger. Gate 6 cross PASS 직후 진행.
- **D layer state/sync residual** + **React migration** — A~D 완료 후 진입.
- **R-AA/R-AB/R-AC** upstream SFS feedback.

## 5. 종료 체크

- [x] report 가 최신이다 (report.md 별도 작성)
- [x] review 조치가 완료 또는 이월됐다 (Gate 3 self+cross PASS / Gate 6 self 4 round
      + 5번째 in progress + cross pending)
- [x] workbench 가 접혔다 (sfs retro --close 자동)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (486 tracked files), domains=0, last_review=partial, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-26T16:37:24+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->

## §7. 측정 (참고)

| 항목 | 값 |
|---|---|
| main.ts 변화 | 6,689 → **6,523** (-166 / -2.48% sprint / 누적 -40.96% 11k 대비) |
| 누적 Layer A+B+C 효과 | 11,049 → 6,523 (-4,526 / -40.96%) |
| subject-cards.ts 신규 | 225 line / 15 export (8 renderer + 7 format helper) |
| subject-cards.spec.ts 신규 | 310 line / 22 case PASS / 0 fail |
| Direct imports | 6 module (escapeHtml/subjectClassPath/subjectIntakePath/getSubjectCoverage/getConceptById/getQuestionById) |
| Context / Callbacks | **0** (pure leaves — bottom-up) |
| AC9 surface | 22 (16 text escape + 2 defensive href + 3 caller-trust boundary + 1 attribute) |
| Defensive escape 추가 | 2 (href = subjectClassPath/subjectIntakePath 결과 + value array per-item) |
| 전체 spec | 252 (pdf-workspace) + 38 (app) + 22 (subject-views) = **312 tests / 0 fail** |
| typecheck | EXIT=0 |
| Gate 3 round | self 2 (Codex executor R1+R2 = PASS) + cross 2 (R1=partial AC5 href patch, R2=PASS) |
| Gate 6 round | self 4 (R1+R2+R3=partial evidence packaging, R4=partial AC10/AC11 pending) + cross pending |
| advisor consult | 1 (bottom-up vs cluster 결정 + 4 pre-empt 가이드) |
| Codex bot 👍 | pending (PR open 후) |
| feature branch | `refactor/layer-c-brainstorm` (rename 후보 → `refactor/layer-c-slice-1-subject-cards`) |
