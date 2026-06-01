# 🎯 ACTIVE — 다음 = **S4c (pdf-workspaces 자료실 인덱스 React island)** 자율진행

> 신규 세션 handoff (Session Continuation Guard — 직전 대화가 S4b-2 전체 lifecycle +
> 잔여정리까지 누적 → fresh session 전환). user = "신규세션에서 자율진행".
> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.

## ✅ 직전 완료
- **S4b-2 subject-class = prod 배포 완료**(sprint-27 closed). PR#137(fe-v0.1.82)+#138(codex
  P2 fix, fe-v0.1.83) → main `3485c51` → prod 200 `main-CwfbS8kw.js`. 상세 = MEMORY
  `project_sprint_w22_27_s4b2_subject_class.md`.
- **잔여 슬라이스 정리** = `docs/solon/web/react-migration/20260601/remaining-slices.md`
  (main `f259f27`). 코드 실독 전수: **10 island 완료 / 2 string 잔여**.
- 누적 prod island: S1a·S2·S3·S3b·S4a·S4b-1·S4b-2 전부 live.

## 🚀 다음 GOAL = S4c (pdf-workspaces 자료실 인덱스)

**scope = `pdf-workspaces` route 1개** (PDF 자료실 목록 화면, `#/pdf-workspaces`).
⚠️ **pdf-workspace(단수, 작업공간)= S1, scope 아님 — 혼동 금지.**

- 현재 = string renderer `renderPdfWorkspaceIndex`(pdf-library.ts:149) → main.ts:4678
  `if (route.name === "pdf-workspaces")` 분기서 `mountRender(composeShell(...,
  renderPdfWorkspaceIndex(pdfLibraryContext, getNotebook(), getSubjectPdfMaterials), ...))`.
- presentational(react-island 0 확인) = **clean island, 게이트 없음, 자율 가능**.
- 내용: hero + summary metric(renderMetric ×3: 등록자료/과목/필기) + 과목별
  `renderPdfSubjectLibrarySection`(pdf-library.ts:187) = uploadCard + PdfMaterialCard[].
- 🔑 **PdfMaterialCard 공유 추출 기회**: S4b-2 SubjectClassView 안 PdfMaterialCard 와
  동형(compact 차이뿐). 공유 leaf 추출 검토. 단 무리한 추출 < parity 안전 — brainstorm 결정.

## 패턴 (검증된 자산, 그대로 미러)
S4a/S4b-1/S4b-2 island 패턴 동일:
- leaf `subject-views/PdfWorkspacesView.tsx`(가칭) pure-props(hook 0, effect-setState 0).
  이 화면 input = file upload(uncontrolled)뿐.
- portal `app/react-shell/PdfWorkspacesIslandPortal.tsx`(weekSlot/subjectClassSlot 미러).
- store `stores/uiStore.ts`: pdfWorkspacesSlot/Props + JSON value-eq setter.
- slot `subject-view-slots.ts`: renderPdfWorkspacesSlot().
- producer main.ts: buildPdfWorkspacesProps + 4678 분기 배선 + postMount slot signal
  (676 옆 setWeekSlot 류 패턴).
- router.tsx: PdfWorkspacesIslandPortal sibling + neg-ctrl flag(S4C).
- vite.config.ts: `__S4C_LOOP_NEG_CTRL_A__/B__`.
- loop-gate `scripts/playwright-s4c-pdf-workspaces-loop.mjs`: route=`#/pdf-workspaces`,
  GREEN(island content 단언, vacuous 금지) + DIST + RED-A(mount#185) + RED-B(click §5-C).
  ※ textarea 없음 → FOCUS-PRES 대상 = file input 또는 생략(uncontrolled file=focus 무관). brainstorm 결정.
- spec: PdfWorkspacesView.spec(parity 분기 + XSS) + uiStore-s4c spec.
- old renderPdfWorkspaceIndex = parity oracle 보존.

## 🔑 필수 교훈 (S4b 누적 — 반드시 적용)
- **uncontrolled-across-rerender = 반복 함정(S4b 에서 4 변종)**: morphdom slot identity
  유지 re-render 에서 defaultValue/defaultChecked 무시→이전값 잔존. 카드 list = stable
  key 필수. file input value 는 보안상 set 불가라 위험 낮음(점검만).
- **island acceptance = render-half(producer math) + dispatch-half(data-action/name/
  data-*) 둘 다 실독.** descriptor mismatch=parity break(spec 못잡음).
- **AC2 parity = producer math source-diff(old renderPdfWorkspaceIndex 1:1).** vacuous
  loop-gate(empty data) 금지 — rich fixture(sampleLectureNote fallback) 단언.
- **fe tag 선점 확인**: `git tag -l 'fe-v*'|sort -V|tail` + `merge-base --is-ancestor`.
  현재 최신 = **fe-v0.1.83**. (fe-v0.1.81 = 무관 commit 선점 — 주의.)
- **mergePushedDate ruleset**: gh pr merge BLOCKED 가능 → `--admin`(own PR).
- **배포 = 매번 별도 승인**(host classifier enforce 확인). "배포 쭉" 1회 = 1 release.
- **worker 자가보고 불신**: main(Opus) 이 build -r + unit + loop-gate 독립 재실행.
- **cross**: 직접 codex executor(sfs review bridge=generic boilerplate, 신뢰 X) +
  GitHub @codex(post-merge, inline P2 류 finding 반드시 읽기).

## 정책 ambient (SFS 0.6.138)
- 구현 = Sonnet worker(generator). main(Opus) = plan/아키텍처/review/INV + 독립검증.
- commit = branch, push/deploy = 명시 승인.
- 잔여 게이트: S1b(pen)·S1c(물리기기)·S5(S1 후) = 자율 한계. **S4c 만 자율.** 조용히 reorder 금지.

## 첫 명령
```
/sfs start "S4c pdf-workspaces 자료실 인덱스 React island"
→ /sfs brainstorm  (premise 검증: renderPdfWorkspaceIndex 실독 + PdfMaterialCard 공유추출 결정)
→ /sfs plan → review --gate 3 self+cross → implement(worker) → 독립검증 → Gate 6 self+cross → 배포 승인 요청
```

## follow-up backlog (별개)
- codex #4(FullscreenButton pure-props, pre-existing prod impurity) = 별도 fix-forward.
- operator 시각 QA(subject-class/week 렌더, auth-gated) = user 후속.
