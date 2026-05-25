---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-5"
workspace: "main-ts-layer-b-slice-2g-table-table-render-widget"
handoff_dir: "docs/solon/main-ts-layer-b-slice-2g-table-table-render-widget/20260525"
goal: "main.ts layer B/slice-2g-table — table render widget 분리"
created_at: "2026-05-25T23:25:00+09:00"
last_touched_at: "2026-05-25T23:50:00+09:00"
closed_at: 2026-05-25T23:47:00+09:00
---

# 회고 — slice-2g-table (table render widget)

## 0. 결과 요약

- **main.ts -334 line** (7,711 → 7,377, -4.33%). 누적 layer A~B/slice-2g-table =
  **-3,672 / -33.23%**. **7k target 인접** (잔여 -377).
- 신규 `pdf-workspace/table-widget.ts` 494 line / 16 named export + 2 private +
  spec 14 case (7 invariant 1:1).
- chart-widget (slice-2g) 패턴 직접 적용. 6 round 9→3+2 → slice-2g-table = 3+2
  + 2+1 = **8 round 총** (G3+G6 합). chart-widget 의 8 round 와 동일 패턴.
- 86 case PASS (table-widget 14 + chart-widget 16 + markdown-table 12 +
  inspector-drill 15 + document-change 11 + chart-content 18).
- @codex 👍 "Didn't find any major issues. Already looking forward to the
  next diff." PR #67 main=effad39.

### AC9 4-layer Security Defense

| layer | evidence |
|---|---|
| (a) XSS render | code 안 innerHTML 0 (comment only) |
| (b) renderTableMount escape | escapeHtml(table.id) + escapeHtml(subjectId) |
| (c) tableId selector injection | dataset.tableId === tableId 비교 default + 5 hostile payload parametrized test |
| (d) PII no-logging | observability/RUM import 0, table.content console / thrown Error X — 3 grep 분리 |

## 1. 계속할 것

- **chart-widget 패턴 직접 적용 성공** — table-widget 494 line / 16 export.
  chart-widget 1,181 line 보다 작아서 round 수도 작음.
- **R-K/R-M/R-N/R-O 누적 적용** = brainstorm 220 line + plan 318 line.
- **AC9 4-layer security defense** (slice-2g 의 3-layer 보다 1 layer 더) —
  PII no-logging guard 신규 추가. Gate 3 cross R1 finding 적용. 향후 widget
  refactor 도 동일 4-layer.
- **raw command output capture** = G6 self R1 partial → raw stdout 캡쳐 후
  R2 PASS. evidence packaging 패턴.
- **comment-excluded grep evidence** (`grep -v "^//" | grep ...`) — comment-
  only match 가 false positive 안 됨. AC9 grep 정확도 향상.

## 2. 문제

- **첫 spec case 3 fail** — `outerHTML.includes("<script>")` 가 linkedom
  serialization 으로 `<script>` literal 노출. 해결 = `querySelectorAll("script")`
  + `input.value` 비교 (실제 sink 비교).
- **Gate 6 self R1 partial** — raw command output capture 부재. R2 PASS 후
  same-gate cross R1 PASS. SFS lesson: evidence packaging 시 summary 만
  insufficient.

## 3. 시도할 것

- **다음 sprint 후보**:
  - **slice-2f/iii (simple widget)** ~220 line — 권장 (낮은 위험, 7k target 달성).
  - **slice-2f/iv (container/page)** ~410 line — 마지막 큰 segment.
- **R-R 신규 backlog** — Gate 6 evidence packaging 표준화. raw stdout
  capture + comment-excluded grep 패턴 implement.md 템플릿화.

## 4. 이어갈 것

### 즉시 close

- [x] PR #67 merge (squash, main=effad39).
- [x] @codex 👍.
- [x] sfs retro --close (main=87d5478).
- [ ] ACTIVE.md 갱신.

### 누적 backlog

- R-K/R-L/R-M/R-N/R-O/R-P/R-Q — 누적.
- **R-R 신규** — Gate 6 evidence packaging 표준화.

## 5. 종료 체크

- [x] report 최신.
- [x] review 조치 완료.
- [x] workbench 접힘.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium, last_review=pass.
- recommend: `qa` activate (light).
- consider: `infra` activate (light).
- generated_at: 2026-05-25T23:47:00+09:00 (auto)
<!-- solon:division-recommendations:end -->
