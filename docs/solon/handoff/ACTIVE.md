# 🎯 ACTIVE — S4c 완료(prod 배포). 다음 = **잔여 follow-up / S5 / S1(게이트)**

> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.
> S4c 까지 전체 lifecycle(brainstorm→Gate6→배포→@codex) 누적 → 새 GOAL 은 fresh session 권장.

## ✅ 직전 완료 — S4c pdf-workspaces React island (sprint 2026-W23-sprint-1 closed)
- **prod 배포 완료**. PR#139 squash→main `263208a` → **fe-v0.1.84** → Vercel prod 200
  `main-tK9mwvCl.js`. branch 삭제. @codex post-merge = **no findings**.
- Gate 3/6 self+cross(codex) PASS, 0 blocking. 독립검증: build -r exit0 / test:run
  **165-0**(신규 51) / loop-gate exit0(GREEN RICH-metric + FOCUS-PRES N/A + DIST + RED-A#185 + RED-B§5-C).
- 상세 = MEMORY `project_sprint_w23_1_s4c_pdf_workspaces.md` + retro
  `docs/solon/document/pdf/s4c-pdf-workspaces-react-island/20260601/`.
- 🔑 decision A=duplicate(prod S4b-2 무터치). 카드=body+badges+"열기"만(class-date control 없음,
  oracle=`renderPdfMaterialCard{isCurrent:false,showClassDateControl:undefined}`). pure-props→#185 불가.
- 누적 prod island: S1a·S2·S3·S3b·S4a·S4b-1·S4b-2·**S4c** 전부 live. **11 island / 1 string 잔여**.

## 🚀 다음 GOAL 후보 (우선순위 순)
1. **PdfMaterialCard 공유 leaf 추출** (follow-up, 자율 가능). SubjectClassView ↔ PdfWorkspacesView
   동형 카드 DRY. 단 두 prod island 동시 터치 → parity 재검증 비용. brainstorm 에서 scope/위험 결정.
2. **S5 — old string renderer 제거** (`renderPdfWorkspaceIndex` 등 island 전환 완료분의 죽은 oracle).
   S1 후행 권장(pdf-workspace 단수가 아직 string).
3. **S1 (pdf-workspace 단수, 작업공간)** = 마지막 string renderer. **🔴 게이트**: S1b(pen
   2nd-stroke 버그)·S1c(annotation sync 물리 cross-device) = 사용자/물리 검증 필요, 자율 한계.

## 패턴 (검증된 자산, 그대로 미러 — 8 island 누적)
- leaf `subject-views/{X}View.tsx` pure-props(hook 0, effect-setState 0).
- portal `app/react-shell/{X}IslandPortal.tsx`, store `stores/uiStore.ts`(slot/Props + JSON value-eq setter),
  slot `subject-view-slots.ts`, producer main.ts(build{X}Props + 분기 + postMount signal),
  router.tsx(portal sibling + neg-ctrl flag), vite.config.ts(neg-ctrl define),
  loop-gate `scripts/playwright-{X}-loop.mjs`(GREEN 비공허 + DIST + RED-A#185 + RED-B§5-C),
  spec×2(View static-source + uiStore loop-immunity).
- **🔑 신규 spec → `apps/web/package.json` `test:run` 등록 필수**(node:test=명시 enumerate, 누락 시 gate 밖).
  loopgate:{X} npm alias 도 추가.

## 🔑 필수 교훈 (누적)
- **parity = oracle source-diff(old renderer 1:1) + render/dispatch 양면 실독**. descriptor mismatch=spec 못잡음.
- **worker 자가보고 불신 → main(Opus) build -r + test:run + loop-gate 독립 재실행.**
- **uncontrolled-across-rerender 트랩**(S4b 4 변종): morphdom slot identity 유지 re-render 에서
  defaultValue/defaultChecked 무시. textarea/text/radio 있으면 key 변별자/token remount. file-input-only=면역.
- **fe tag 선점 확인**: `git tag -l 'fe-v*'|sort -V|tail` + `merge-base --is-ancestor`. 현재 최신=**fe-v0.1.84**.
- **gh pr merge --squash --delete-branch**: 로컬 main 에 unpushed commit 있으면 fast-forward abort 가능.
  원격 squash 는 성공 → 내용 folded 확인 후 `git reset --hard origin/main` 동기화.
- **배포 = 매번 별도 승인**(host classifier enforce). "배포 ㄱㄱ" 1회 = 1 release.
- **cross**: 직접 codex executor(sfs review bridge=결정성) + GitHub @codex(post-merge, inline finding 읽기).

## 정책 ambient (SFS 0.6.138)
- 구현 = Sonnet worker(generator). main(Opus) = plan/아키텍처/review/INV + 독립검증.
- commit = branch, push/deploy = 명시 승인. 조용히 reorder 금지.

## follow-up backlog (별개)
- codex #4(FullscreenButton pure-props, pre-existing prod impurity) = 별도 fix-forward.
- operator 시각 QA(subject-class/week/pdf-workspaces 렌더, auth-gated) = user 후속.
