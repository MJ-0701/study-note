# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject.

## 진행 상황 (2026-05-26) — **Layer C/slice-5 closed. 9k+8k+7k+6.7k+6.5k+6.3k+6k+5.8k+5.7k 달성**

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 | ✅ merged (PR #58) |
| **B/slice-2a. canvas mount** | 2026-W22-sprint-1 | ✅ merged (PR #59) |
| **B/slice-2b. classDate** | 2026-W22-sprint-2 | ✅ merged (PR #60) |
| **B/slice-2c. ink stroke** | 2026-W22-sprint-3 | ✅ merged (PR #61) |
| **B/slice-2d. drill highlight** | 2026-W22-sprint-2 | ✅ merged (PR #62) |
| **B/slice-2e. star mark** | 2026-W22-sprint-3 | ✅ merged (PR #63) |
| **B/slice-2f/i. chart-content** | 2026-W22-sprint-4 | ✅ merged (PR #64) |
| **B/slice-2f/ii. markdown-table** | 2026-W22-sprint-2 | ✅ merged (PR #65) |
| **B/slice-2g. chart-widget** | 2026-W22-sprint-3 | ✅ merged (PR #66) — **8k 달성** |
| **B/slice-2g-table. table-widget** | 2026-W22-sprint-5 | ✅ merged (PR #67) |
| **B/slice-2f/iii. simple-widget** | 2026-W22-sprint-6 | ✅ merged (PR #68) |
| **B/slice-2f/iv. page-render helper** | 2026-W22-sprint-7 | ✅ merged (PR #69, main=942d81a) — **7k 달성** |
| **B/slice-2f/iv-bis. renderPdfWorkspacePage** | 2026-W22-sprint-8 | ✅ main 직 push (main=7b5f3cb) — Layer B closed, 6.7k 달성 |
| **C/slice-1. subject-cards leaves** | 2026-W22-sprint-9 | ✅ merged (PR #70, main=d634ac8) — **6.5k 달성** |
| **C/slice-2. sidebar** | 2026-W22-sprint-10 | ✅ merged (PR #71, main=2c6ca94) — **6.3k 달성** |
| **C/slice-3. home + intake** | 2026-W22-sprint-11 | ✅ merged (PR #72, main=ee6f492) — **6k 달성** |
| **C/slice-4. subject-class** | 2026-W22-sprint-12 | ✅ merged (PR #73, main=9e51fe5) — **5.8k 달성** |
| **C/slice-5. subject-summaries** | 2026-W22-sprint-13 | ✅ implemented (Gate 6 PASS, PR pending) — **5.7k 달성** + safe-url 신규 |
| **C/slice-6. subject-memorize** | next sprint | ⏳ 다음 진입 (~110 line) |
| C/slice-6. subject-memorize | TBD | ⏳ backlog (~110 line) |
| C/slice-7. subject-mcp | TBD | ⏳ backlog (~65 line) |
| C/slice-8. subject-week | TBD | ⏳ backlog (~88 line) |
| C/slice-9. pdf-library-index | TBD | ⏳ backlog (~188 line) |
| C/slice-10. quick-note builders | TBD | ⏳ backlog (~150 line) |
| D. state/sync residual | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 |

main.ts: 11,049 → **5,712** (-5,337, **-48.30%**). **9k+8k+7k+6.7k+6.5k+6.3k+6k+
5.8k+5.7k 9 target 달성**. Layer C 진행 중. 5.5k = slice-6 (~110 line) 후 달성.

## 활성 작업 = Layer C/slice-6 (subject-memorize)

**전 sprint (C/slice-1) retro** = `docs/solon/layer-c-entry-subject-view-hierarchy-decision-first-slice-scope/20260526/retro.md`

### Layer C/slice-2 후보 = sidebar (다음 sprint)

- `renderHomeSidebar` (37 line)
- `renderSubjectSidebar` (45 line)
- `renderSubjectNavItem` (15 line)
- `renderClassSchedule` (16 line)

총 ~113 line. leaf 순수성 검증 필요 (sidebar 가 module state 접근 여부). subject-cards
패턴 직접 적용 가능 — risk 낮음.

### C/slice-1 학습 (sprint-W22-sprint-9)

- **advisor pre-empt 4 가이드 효과 확인**:
  - numeric AC ±20% — sprint-8 의 17→12 friction 회피. 실측 6,523 (target 6,490~
    6,530) + 15 export (target 13~17) 모두 첫 try 에서 일치.
  - source-excerpt Day 1 — Gate 3 cross PASS 부터 가용. sprint-8 의 R3 늦은
    추가 회피.
  - `--executor codex` R1 부터 — review_run event 자동 기록. self-CPO PASS
    bundle 가시성 보장.
  - feature branch + PR — sprint-8 의 main 직 push 회피 (Codex bot 패턴 복원).
- **bottom-up extraction 검증**: leaf 순수성 (module state 접근 0) 사전 검증 →
  Context 0, Direct imports 6. Sprint 8 의 17→12 rework 회피. 패턴 7회 검증.
- **defensive escape 2 추가** — href escape (subjectClassPath/subjectIntakePath
  결과) + value array per-item escape. sprint-8 의 href lineage 일관.

### C/slice-1 결과

- main.ts -166 line (6,689 → 6,523). 누적 -4,526 / -40.96%.
- subject-cards.ts 225 line / 15 export (8 renderer + 7 format helper).
- subject-cards.spec.ts 310 line / 22 case PASS (a~j 군).
- Direct imports = 6 (escapeHtml/subjectClassPath/subjectIntakePath/
  getSubjectCoverage/getConceptById/getQuestionById). Context = 0. Callbacks = 0.
- AC9 5-layer + 22 surface (16 text escape + 2 defensive href + 3 caller-trust +
  1 attribute escape). 통합 case 22 = characterization.
- Gate 3 self R1 PASS + cross R2 PASS by Codex gpt-5.5 xhigh.
- Gate 6 self 4 round + cross pending (evidence packaging 반복 — bundle scanner
  의 untracked file truncation 회피 = git stage 후 visible).

## SFS 0.6.121 정책 ambient

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Executable Action Ownership
- Review autopilot rework loop
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md`
