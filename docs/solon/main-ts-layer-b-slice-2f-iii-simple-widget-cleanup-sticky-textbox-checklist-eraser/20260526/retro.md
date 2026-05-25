---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-6"
workspace: "main-ts-layer-b-slice-2f-iii-simple-widget-cleanup-sticky-textbox-checklist-eraser"
handoff_dir: "docs/solon/main-ts-layer-b-slice-2f-iii-simple-widget-cleanup-sticky-textbox-checklist-eraser/20260526"
goal: "main.ts layer B/slice-2f/iii — simple widget render"
created_at: "2026-05-26T00:00:00+09:00"
last_touched_at: "2026-05-26T00:50:00+09:00"
closed_at: 2026-05-26T00:48:00+09:00
---

# 회고 — slice-2f/iii (simple widget render)

## 0. 결과 요약

- main.ts **-270 line** (7,377 → 7,107, -3.66%). 누적 **-3,942 / -35.68%**.
  7k 인접 (잔여 -107).
- 신규 `pdf-workspace/simple-widget.ts` ~330 line / 9 export (8 runtime + 1
  type) + spec 14 case (5 invariant 1:1).
- **AC9 4-layer Security closure**: user content escape + **id + subjectId
  attribute escape (in-sprint closure, defense in depth)** + EraserShape
  bounded + PII no-logging.
- Gate 3 self R8 + cross R1 PASS (security lens 9 round — id-escape scope
  change + 5 surface × 2 payload coverage iteration). Gate 6 self R2 +
  cross R1 PASS (3 round).
- @codex 👍 "Didn't find any major issues. More of your lovely PRs please."
- PR #68 main=cab1a4f.

## 1. 계속할 것

- **chart-widget / table-widget 패턴 일관** — 1 module 분리 + spec
  characterization + AC9 multi-layer security.
- **id + subjectId attribute escape closure** — slice-2f/iii 가 main.ts
  pre-existing unescape 패턴 폐기. 새 module = single source of truth.
- **DOM-parse parametrized negative test** = 5 surface × 2 payload class
  (double-quote breakout + event-attribute injection). raw escapeHtml
  count 보다 강력한 acceptance.
- **decision change capture pattern** — initial brainstorm 의 'preserve
  pre-existing' choice 를 Gate 3 cross R1 finding 으로 'in-sprint closure'
  로 supersede. capture 로 traceability 유지.

## 2. 문제

- Gate 3 9 round 누적 — id escape scope decision 변경 + 5 surface 확장 +
  double-quote payload + event-attr 평가 iteration. brainstorm 단계에서
  AC9 multi-layer 사전 정의 부족. **다음 sprint** brainstorm 에서 AC9
  defense in depth full table 사전 정의.
- **재트리거 codex 필요** PR #68 — 1st 시도 monitor timeout. 수동 `@codex
  review` comment 후 응답. bot 트리거 race condition 우려.

## 3. 시도할 것

- **다음 sprint = slice-2f/iv (container/page)** — 마지막 layer B big segment.
  ~410 line. renderPdfWorkspacePage + renderPdfMaterialStatus +
  renderPdfToolbar + renderPdfFrameStack + renderToolButton +
  renderFullscreenToggleButton. 7k target 달성.
- **R-T 신규 backlog** — brainstorm 단계 AC9 multi-layer defense table 사전
  정의 (id escape / event attr / quote breakout / PII no-log default).
  Gate 3 round 수 감소.

## 4. 이어갈 것

### 즉시

- [x] PR #68 merge (main=cab1a4f).
- [x] @codex 👍.
- [x] sfs retro --close (df5f5f0).
- [ ] ACTIVE.md 갱신 → slice-2f/iv.

### 누적 backlog

- R-K/L/M/N/O/P/Q/R 누적.
- **R-T 신규** — AC9 brainstorm 단계 defense table 사전 정의.

## 5. 종료 체크

- [x] report 최신.
- [x] review 조치 완료.
- [x] workbench 접힘.
