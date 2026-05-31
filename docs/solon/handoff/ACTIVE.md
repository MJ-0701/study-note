# 🎯 ACTIVE — S4b-1(week view) Gate 6 PASS(self+cross) / 다음 = 배포 승인 대기(push→PR→@codex→fe-v tag)

> SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.
> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.

## 🔥 S4b-1 brainstorm 완료 (sprint-26, 2026-05-31)

- **sprint `2026-W22-sprint-26` = S4b-1 week view React island, Gate 2(brainstorm) 완료.**
  brainstorm.md = `.sfs-local/sprints/2026-W22-sprint-26/brainstorm.md`.
- 🔑 **handoff premise 정정**: "renderPdfMaterialCard/uploadCard 가 PDF-workspace pointer/
  sync scope wired → island 불가" = **코드상 거짓**. pdf-library.ts:279 body = escapeHtml +
  data-action + radio control 뿐(촉수 0). worker 가 dir-import 를 scope-coupling 오판. 실제
  제약 = string 재사용=dangerouslySetInnerHTML=INV-8뿐 → JSX 재구현(S4a 선례)으로 해소.
- **userNotes = blocker 아님**(handler main.ts:2203 renderApp 미호출 → `<textarea defaultValue>`
  pure-props, sync parity gate 불요). 4 injection pt 전부 presentational.
- **scope = 분할, week 먼저(S4b-1)**. subject-class(폼/assignment/class-date radio
  re-render 위험) = S4b-2 격리. 신규 leaf×3(WeekView/PdfMaterialCard compact/QuickNotePanel).
- **Gate 3 PASS(self+cross) + 구현 진입 승인 captured**(capture 20260531T095249Z-6517, 자율진행 모드).
- **구현 완료 + Gate 6 self review 진행**(branch `react-migration/s4b1-week-island`, commit `c75e028` worker
  + `75855b5` focus-fix). Sonnet worker 산출 → main/Opus 독립 검증.
  - 신규: WeekView.tsx + WeekIslandPortal.tsx + negativeControlWeek.tsx + playwright-s4b-week-loop.mjs
    + WeekView.spec + uiStore-s4b1 spec. 수정: uiStore/slots/router/vite/main.ts/sync.user-notes-sync.
  - **독립 검증**: build exit0 · 신규 spec 30/30 · loop-gate exit0(GREEN+FOCUS-PRES+DIST+RED-A+RED-B) ·
    6 suite fail = main baseline 동일(worktree) = pre-existing 회귀 0.
  - 🔑 **focus 회귀 1건 fix**: worker 의 `key={userNotesValue}` → 타이핑 중 PUT 5xx → triggerRender →
    remount → focus 손실(legacy "typing focus loss 방지" invariant 회귀). fix = token=`subjectId:weekId:
    hydrationVersion`, `markServerHydrated` 콜백 GET T1 hydrate 에만 bump(PUT 경로 token 불변). FOCUS-PRES
    loop-gate assertion 추가(teeth: node identity).
  - 전 AC1~6 implemented, product gap 0. **Gate 6 self(R2)+cross 둘 다 PASS**(docs lens, codex executor;
    capture 20260531T140709Z-76718). blocking finding 0. cross note = @codex GitHub PR review = push 후 final.
  - `llm-wiki/.obsidian/graph.json` = untracked Obsidian UI state, S4b-1 commit 비포함(무관).
- **다음 = 배포 승인 대기**. capture(Gate3) = "Gate6 후 배포 별도 승인" + ambient push=명시승인. 승인 시 release
  쭉: push branch → PR → CI → @codex external review → squash 머지 → fe-v0.1.NN tag → FE Release(Vercel) →
  prod 200 검증. branch=`react-migration/s4b1-week-island`(commit c75e028+75855b5+docs). 구현 자산=S4a 패턴.

---

## 상태 (S4a, 직전 — 2026-05-31)

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

잔여 = **S4b-1(week, 진행중)** · S4b-2(subject-class) · S1b(widget) · S1c(annotation sync) · S5(cleanup).

- **S4b-1(week) = 진행중**(sprint-26, Gate 3 plan). 상단 §"S4b-1 brainstorm 완료" 참조.
  week = presentational JSX 재구현 가능(clean island). userNotes = pure-props defaultValue.
- **S4b-2(subject-class)** = 후속. 공유 leaf(PdfMaterialCard/QuickNotePanel) 재사용 + 폼 3개
  (add-class-date/attach-pdf-to-week/import) + `renderPdfMaterialClassDateControl` radio/select
  (attach 재렌더 중 controlled-input-under-re-render) + intakeFeedback.href 미escape(기존). week
  와 동일하게 PDF 카드 = presentational JSX 재구현(PDF-workspace pointer 결합 아님 — 정정됨).
- **S1b(widget)** — main.ts 공유 pointer dispatcher + pen-second-stroke 버그(REOPENED) 얽힘
  → 회귀 구분 불가. native-pointer + pen-fix 묶어 S1c 이후/S1d.
- **S1c(annotation sync, INV-4)** — acceptance = iPad↔PC 물리 cross-device sync. 자동화 불가, 사용자 기기 필요.
- **S5(cleanup)** — S1 전체 선행. 차단. (string renderer 통합/제거 = pdf-workspace 마이그레이션 후.)
- **⚠️ 자율 도달 한계** = S4b-1/S4b-2 = presentational island(자율 가능). S1b/S1c/S5 =
  사용자/물리기기/pen-fix 게이트. 조용히 reorder 금지.

> ❌ **SUPERSEDED (2026-05-31)**: 직전 handoff 의 "S4b = subject-class PDF-workspace pointer
> 결합 / week = controlled-input sync parity gate 필요 / clean slice 아님" framing 은 **코드
> 실독으로 정정됨**. renderPdfMaterialCard(pdf-library.ts:279) = presentational, userNotes
> handler(main.ts:2203) = renderApp 미호출(pure-props). sprint-26 brainstorm.md/plan.md 가 SoT.

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
