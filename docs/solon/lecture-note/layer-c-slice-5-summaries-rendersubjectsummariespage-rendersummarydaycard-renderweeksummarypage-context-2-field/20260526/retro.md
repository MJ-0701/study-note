---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-13"
workspace: "layer-c-slice-5-summaries"
goal: "layer C/slice-5 — summaries"
created_at: "2026-05-26T23:30:00+09:00"
last_touched_at: "2026-05-26T23:30:00+09:00"
closed_at: "2026-05-26T23:30:00+09:00"
---

# 회고 — sprint-W22-sprint-13 (Layer C/slice-5 summaries — **5.7k 달성**)

> **Layer C/slice-5 closed.** main.ts 5,838 → **5,712** (-126 / 누적 **-5,337 /
> -48.30%** from 11,049). **5.7k 달성**. 5.5k = slice-6 후.

## 1. 계속할 것

- **shared module 승격 패턴**: home-intake.ts 의 private `sanitizeExternalUrl` →
  `app/safe-url.ts` 로 shared. main.ts 의 quickNote primaryHref 도 즉시 활용.
- **부수 fix 인플레이스**: Gate 3 R3+R4 finding 으로 발견된 renderQuickNotePanel
  의 XSS gap (5 escape + 1 protocol allowlist) 을 본 sprint 안에 즉시 fix.
  slice-10 (quick-note builders) 까지 미루지 않음.
- **callback trust boundary explicit contract**: spec case 14 가 hostile callback
  output passthrough 를 명시 검증 (caller responsibility 분류).

## 2. 문제

- **Gate 3 self 5 round** (sprint-11 의 5 round 와 동일) — sourceWorkspaceUrl /
  primaryHref / callback TB 보안 detail 정밀화 비용.
- **Gate 6 self 5 round / cross 3 round** — bundle scanner 의 `.sfs-local` evidence
  cap 으로 self-PASS 재기록 필요.

## 3. 시도할 것

- slice-6 (subject-memorize, ~110 line) — 5.5k 달성 후보.
- slice-7~10 backlog.

## 4. 이어갈 것

- **C/slice-6 = subject-memorize** 다음 sprint.

## 5. 종료 체크

- [x] report 최신 / review PASS / workbench 접힘.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- recommend: qa activate (light)
<!-- solon:division-recommendations:end -->

## §7. 측정

| 항목 | 값 |
|---|---|
| main.ts | 5,838 → **5,712** (-126 / 누적 -48.30%) |
| 누적 효과 | 11,049 → 5,712 (-5,337 / -48.30%) |
| summaries.ts | 211 line / 3 export + 1 type |
| summaries.spec.ts | ~280 line / 18 PASS |
| app/safe-url.ts | 22 line / 1 export (shared) |
| SummariesContext | 2 field |
| AC9 surface | 16 (12 text + 4 href + 2 attr + callback TB + PII/log) |
| 부수 fix | 3 (renderQuickNotePanel 5 escape + primaryHref sanitizeExternalUrl + safe-url shared module) |
| 전체 spec | 380 + 18 = **398 tests / 0 fail** |
| typecheck | EXIT=0 |
| Gate 3 round | self 5 + cross 1 (PASS) |
| Gate 6 round | self 5 + cross 3 (PASS) |
| feature branch | refactor/layer-c-slice-5-summaries |
