---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-11"
workspace: "layer-c-slice-3-home-intake"
handoff_dir: "docs/solon/layer-c-slice-3-home-intake-.../20260526"
goal: "layer C/slice-3 — home + intake"
created_at: "2026-05-26T22:30:00+09:00"
last_touched_at: "2026-05-26T22:30:00+09:00"
closed_at: "2026-05-26T22:30:00+09:00"
---

# 회고 — sprint-W22-sprint-11 (Layer C/slice-3 home + intake — **6k 달성**)

> **Layer C/slice-3 closed.** main.ts 6,332 → **6,023** (-309 / 누적 **-5,026 /
> -45.49%** from 11,049). **6k 달성** (target 5,500 = slice-4~6 후 도달).

## 1. 계속할 것

- **bottom-up + 0 Context** 패턴 — 4 fn 모두 pure leaf. callback DI 1 (renderIntakeFeedback).
- **sprint-9/10 lesson 사전 차단**: numeric AC ±20% + source-excerpt Day 1 +
  `--executor codex` R1 + feature branch + PR + AC11/12 stage-deferred 명시.
- **real XSS discovery during refactor**: inputId attribute breakout XSS (sprint-11
  R2 finding). spec hostile fixture 가 발견 → fix → AC9 evidence 강화.
- **protocol allowlist 신규 helper** (`sanitizeExternalUrl`): javascript:/data:/
  mailto:/file:/protocol-relative `//` 차단. sprint-11 Gate 6 R1 후 `//` bypass
  추가 close.

## 2. 문제

- **Gate 3 self 5 round + cross 1 round** — sprint-9 (self 2 + cross 1) 보다 많음.
  사유 = sourceWorkspaceUrl 의 protocol allowlist 도입 결정 + Codex hostile spec
  요구 (mailto exclusion + javascript/data 차단 + protocol-relative bypass).
- **Gate 6 self R1** = real XSS finding (inputId raw subject.id) + protocol-relative
  bypass. sprint-9/10 보다 깊은 security audit. **하지만 진짜 보안 결함을 찾은 round**
  이므로 cost-effective.
- **routes.ts 의 weekPath 이동** — slice-3 scope 외 path helper module 변경 발생.
  Gate 6 cross R1 가 spec 요구 → spec patch (`routes.spec.ts` case (l) 추가).

## 3. 시도할 것

- **R-AG 신규** (cross-module move scope marker): plan §4 의 "안 할 것" 에 path
  helper 추가 시 cross-module move 가 의무인 경우 명시 (예: weekPath 가 home-intake.ts
  에 import 되려면 routes.ts 에 export 필요). plan revision 으로 명시.
- 보안 관점: home-intake.ts 의 `sanitizeExternalUrl` 을 별도 `app/safe-url.ts` 로
  승격 후보 (재사용 가능성 — sidebar.ts / workspace-page.ts 의 미래 caller-trust
  boundary).

## 4. 이어갈 것

- **C/slice-4 = subject-class** (다음 sprint). renderSubjectClassPage(51) +
  renderClassDateAddSection(26) + renderClassDayCard(28) + renderClassDayPdfAttachControl(44) +
  renderClassDayPdfLinks(27) + renderPdfMaterialAssignmentSection(26) = ~202 line.
  중-규모. Context 가능 (notebook + intakeFeedback) — 검증 필요.
- **C/slice-5~10** backlog (summaries / memorize / mcp / week / pdf-library /
  quick-note).
- **5.5k target** = slice-4~5 (~340 line) 후 달성.

## 5. 종료 체크

- [x] report 최신.
- [x] Gate 3 self R5 + cross R1 PASS / Gate 6 self R2 + cross R1 PASS.
- [x] workbench 접힘.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- recommend: qa activate (light)
- consider: infra activate (light)
<!-- solon:division-recommendations:end -->

## §7. 측정

| 항목 | 값 |
|---|---|
| main.ts 변화 | 6,332 → **6,023** (-309 / -4.88% sprint / 누적 -45.49%) |
| 누적 Layer A+B+C 효과 | 11,049 → 6,023 (-5,026 / -45.49%) |
| home-intake.ts 신규 | 368 line / 4 export + 1 private (sanitizeExternalUrl) |
| home-intake.spec.ts 신규 | 288 line / 22 case PASS |
| routes.ts | weekPath export 추가 (main.ts 의 local fn 이동) |
| Context / Callbacks | **0 / 1 callback** (renderIntakeFeedback DI) |
| Direct imports | 7 module |
| AC9 surface | 18 (16 escape + 1 protocol allowlist + 1 callback TB + PII/log boundary) |
| Defensive escape 추가 | 8+ (subject.title/href 등 sprint-8/9/10 lineage) |
| **Real XSS fix** | 1 (inputId attribute breakout via raw subject.id) |
| **Protocol allowlist 신규** | 1 (sanitizeExternalUrl — javascript:/data:/mailto:/file:/`//` 차단) |
| 전체 spec | 252 + 38 + 22 + 23 + 22 = **357 tests / 0 fail** |
| typecheck | EXIT=0 |
| Gate 3 round | self 5 + cross 1 (PASS) |
| Gate 6 round | self 2 + cross 1 (PASS) — sprint-10 의 6 round 보다 빠름 |
| advisor consult | 0 (sprint-9 가이드 재적용) |
| Codex bot 👍 | pending |
| feature branch | refactor/layer-c-slice-3-home-intake |
