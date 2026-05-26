---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-12"
workspace: "layer-c-slice-4-subject-class"
handoff_dir: "docs/solon/layer-c-slice-4-.../20260526"
goal: "layer C/slice-4 — subject-class"
created_at: "2026-05-26T23:00:00+09:00"
last_touched_at: "2026-05-26T23:00:00+09:00"
closed_at: "2026-05-26T23:00:00+09:00"
---

# 회고 — sprint-W22-sprint-12 (Layer C/slice-4 subject-class)

> **Layer C/slice-4 closed.** main.ts 6,023 → **5,838** (-185 / 누적 **-5,211 /
> -47.16%** from 11,049). **5.8k 달성**. 5.5k = slice-5 후.

## 1. 계속할 것

- **Context 패턴 6번째 검증** (sidebar / workspace-page / subject-class).
- **첫 try Gate 6 PASS** (sprint-11 R2 evidence iteration, sprint-12 single-shot).
  evidence-gate6.md inline pattern 완전 정착.
- **denylist negative UI clarification** — auth boundary 가 아니라 client-side
  UX guardrail 임을 plan AC + JSDoc + spec hostile case 로 명시. sprint-10
  의 admin-link denylist 패턴 정밀화.

## 2. 문제

- **Gate 3 self R1 finding**: `disabled form` 단독으로는 not auth boundary —
  authoritative permission = backend + main.ts onsubmit. plan §3 AC6(d) 명시.
- Gate 3 self R2 = PASS. cross R1 = PASS.

## 3. 시도할 것

- slice-5 (summaries) 진입 — renderSubjectSummariesPage + renderSummaryDayCard +
  renderWeekSummaryPage = ~141 line. coverage 가산 → 5.5k 달성 후보.

## 4. 이어갈 것

- **C/slice-5 = summaries** 다음 sprint.
- C/slice-6~10 backlog.
- **5.5k target** = slice-5 (-141 estimate) 후 5,697 도달.

## 5. 종료 체크

- [x] report 최신 / review PASS / workbench 접힘.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- recommend: qa activate (light)
- consider: infra activate (light)
<!-- solon:division-recommendations:end -->

## §7. 측정

| 항목 | 값 |
|---|---|
| main.ts | 6,023 → **5,838** (-185 / -3.07% sprint / 누적 -47.16%) |
| 누적 효과 | 11,049 → 5,838 (-5,211 / -47.16%) |
| subject-class.ts | 260 line / 6 export + 1 type export |
| subject-class.spec.ts | ~330 line / 21 case PASS |
| SubjectClassContext | 8 field (2 lazy + 3 fn ref + 3 callback) |
| AC9 surface | 22 (16 text + href + attr + 1 denylist UI + 3 callback TB + PII/log boundary) |
| Direct imports | 7 module |
| Defensive escape 추가 | 12+ (subject.title / week.title / week.focus / aria-label / 6 href) |
| 전체 spec | 252 + 38 + 22 + 23 + 22 + 21 + 1 (routes new case) = **380 tests / 0 fail** |
| typecheck | EXIT=0 |
| Gate 3 round | self 2 + cross 1 (PASS) |
| Gate 6 round | self 1 + cross 1 (PASS first try) |
| advisor consult | 0 (sprint-9 가이드 재적용) |
| Codex bot 👍 | pending |
| feature branch | refactor/layer-c-slice-4-subject-class |
