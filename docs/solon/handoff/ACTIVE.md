# 🎯 ACTIVE — S4a(subject views) + codex-fix prod 배포 완료 / 다음 = 남은 React 슬라이스(S4b·S1b·S1c·S5)

> SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.
> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.

## 상태 (2026-05-31)

- **S4a(subject views) = 완전 종료 + prod 배포.** Gate 6 PASS → PR [#135](https://github.com/MJ-0701/study-note/pull/135)
  squash 머지 → main = **`f3426d2`** → **fe-v0.1.79 prod live**(HTTP 200, 번들 `main-BAqxE33U.js`).
  4 views(summaries/summary-detail/mcp/memorize). subject-class+week 연기→S4b.
- **codex-fix(S1a~S3b polish) = prod 배포.** PR [#134](https://github.com/MJ-0701/study-note/pull/134)
  squash 머지 → **fe-v0.1.78**(번들 `main-zI7Sd5jF.js`). #1/#2 Required(home/intake loop-immunity
  guard) + #3 Important(PdfToolbar Enter→blur 단일 commit). **#4(FullscreenButton pure-props)= deferred**.
- 누적 prod 슬라이스: **S1a · S2 · S3 · S3b · codex-fix · S4a** 전부 live.
- 작업트리 = main `f3426d2`, worktree(agent-a11f2de82b2414abe) 제거 완료.
- S4a Gate 6 상세 = `docs/solon/web/react-migration/20260531/s4a-gate6-review-state.md`.

### S4a 배포 검증 (이번 세션, 2-phase release)
- Phase 1 codex-fix: push #134 → CI(Backend Contract Smoke pass) → squash → fe-v0.1.78 → FE Release exit0 → prod 200 `zI7Sd5jF`.
- Phase 2 S4a: rebase onto 0e704bf(**uiStore conflict 없음** — home/intake guard vs subject guard 비인접) →
  재검증(build exit0 + unit 74/0 + **loop-gate exit0**) → push #135 → CI pass → squash → fe-v0.1.79 → prod 200 `BAqxE33U`.

## 🚀 다음 GOAL = 남은 React 마이그레이션 슬라이스

잔여 = **S4b(subject-class + week)** · S1b(widget) · S1c(annotation sync) · S5(cleanup).

- **S4b** = subject-class + week. **scoping 완료(2026-05-31, read-only)** — S4a-style 기계적
  슬라이스 아님, 설계(brainstorm) 필요:
  - **subject-class**(subject-class.ts) = PDF material 관리 surface. ctx-injected
    `renderPdfMaterialCard`/`renderPdfLibraryUploadCard` + data-action `attach-pdf-to-week`/
    `open-pdf-material`/`add-class-date` + `renderPdfMaterialAssignmentSection`. **excluded
    PDF-workspace scope(pointer/upload/storage) 결합** → island 화 = PDF-workspace 마이그레이션
    (S1b 영역) 선행 또는 명시 boundary. **clean presentational 슬라이스 아님.**
  - **week**(week.ts:126 `renderWeekUserNotesSection`) = controlled `userNotes` textarea +
    `data-action="update-week-user-notes"` PUT sync + `renderWeekMappedPdfSection`(PDF 결합).
    = **controlled-input sync parity**, pure-props 아님. loop-gate 단독으로 sync round-trip
    검증 불가 → sync parity 검증 방법 설계 필요.
  - **다음 = fresh session brainstorm**: carveable presentational sub-slice(예: week static
    sections − userNotes/PDF) 가능 여부 결정 or 전체 coupled → S1b/PDF-workspace 선행.
- **S1b(widget)** — main.ts 공유 pointer dispatcher + pen-second-stroke 버그(REOPENED) 얽힘
  → 회귀 구분 불가. native-pointer + pen-fix 묶어 S1c 이후/S1d.
- **S1c(annotation sync, INV-4)** — acceptance = iPad↔PC 물리 cross-device sync. 자동화 불가, 사용자 기기 필요.
- **S5(cleanup)** — S1 전체 선행. 차단.
- **⚠️ 자율 도달 한계** = S4a 까지 완료. S4b 는 sync/PDF 경계 brainstorm 필요, S1b/S1c/S5 =
  사용자/물리기기/pen-fix 게이트. 조용히 reorder 금지.

## follow-up backlog
- **codex #4 (FullscreenButton pure-props)** — leaf-local useEffect+setState + fullscreenchange→renderApp.
  pre-existing prod impurity, Important. 별도 fix-forward.
- **s3/s3b loop-gate `/materials` mock envelope** — raw `[]` → `{materials:[]}`(s4a 와 동일 버그).
  spawn-task chip 발행됨. test-harness only.

## 🔑 교훈 (유지)

- **island acceptance = render-half(leaf/producer) + dispatch-half(seam) 둘 다 실독.** producer 완벽해도
  call site descriptor mismatch = parity break(spec 못잡음).
- **finding 기각 시 라인 실독 필수.** codex finding = premise(라인) 검증 후 escalate. (S4a: /materials
  mock finding = premise 정확 → fix.)
- **visible React slice = loop-gate(prod-build playwright) GREEN 후에만 deploy.** unit(jsdom)+정적 cross 는
  런타임 effect 루프 못잡음. neg-control A(mount #185)/B(click §5-C) 분리. **rebase 후 loop-gate 재실행 필수.**
- deploy 태그와 게이트 검증은 다른 batch.
- **2-phase release rebase**: 같은 file(uiStore) 다른 setter guard = 비인접 region → conflict 안 남.

## 자산 (보존, 재사용)

- React island 패턴 = createPortal → morphdom-preserved div-slot(`data-react-island`, display:contents)
  + uiStore signal + postMountEffect value-eq guard + pure-props leaf(hook 구독 0/effect-setState 0)
  + producer 전체 view-model JSON memoize(loop-immunity).
- loop-gate = neg-control A(mount #185) + B(click-armed §5-C) 분리 + GREEN×N island-scoped content 단언
  (vacuous 금지) + round-trip. 설계 = GREEN×뷰 + A×1 + B×1(A/B = detector validation view-agnostic).
- fixture = sampleLectureNote fallback(`loadStoredNotebook` 빈 키, notebook-storage.ts:45) → seed 불요.
- old renderer 보존 = parity oracle(제거 = 후속 정리).

## 정책 ambient (SFS 0.6.138, 자세히 CLAUDE.md)

- 구현 = Sonnet worker. main(Opus) = plan/아키텍처/review/INV 판단.
- commit = branch, push = 명시 승인. deploy = 명시 승인 시 release 쭉(push→PR→머지→tag→verify).
- cross = codex 복구 후 직접 호출/@codex, down 시 Gemini + waiver.
