# 🎯 ACTIVE — 다음 GOAL = **S5 죽은 oracle 제거** (자율, Code-Review tier, 배포 없음)

> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.
> 직전 세션이 S4c full lifecycle + 잔여논의 누적 → Session Continuation Guard 로 fresh session 인계.
> **user 승인 = S5만 자율 진행**(2026-06-01). #1 공유추출은 명시 승인 전까지 금지, S1 은 게이트.

## 🚀 GOAL = S5 — dead S4c oracle renderer 제거 (source hygiene)
S4c 가 `#/pdf-workspaces` 를 island 로 대체 → old string renderer 가 죽음. 제거.

- **tier = Code Review Only**(구현→리뷰). full PDCA/Gate 6 ceremony 불요.
- **배포 없음**: dead 함수는 이미 tree-shaken(미참조) → 번들 무변화. fe tag/Vercel release 불필요.
  (단 main 머지는 함 — 소스 정리 PR.)
- 검증 = `pnpm -r build` exit0 + `pnpm --filter web test:run` 165-0 유지 + 영향 spec 정리.

### safe-delete set — ⚠️ fresh session 이 cross-file import trace 로 재확정 후 삭제
직전 세션 1차 grep 이 정의 파일을 필터해 오판한 전력 있음 → **정의 파일 포함 전체 trace 필수.**
- ✅ **확정 dead**: `renderPdfWorkspaceIndex`(pdf-library.ts:149) — 유일 ref = PdfWorkspacesView.tsx:170 JSX-mirror **주석**뿐. live caller 0.
- ✅ **dead-with-parent**: `renderPdfSubjectLibrarySection`(pdf-library.ts:187) — caller = pdf-library.ts:180(renderPdfWorkspaceIndex 본체) 유일. 부모 제거 시 같이 dead.
- ⚠️ **미확정 — trace 필요**: `renderPdfLibraryUploadCard`(pdf-library.ts:241) — 아직 `subject-class.ts:263`(ctx.renderPdfLibraryUploadCard) 참조. **subject-class.ts(old string producer) 가 S4b-2 island 후 live 인지 dead 인지 먼저 판정.** subject-class.ts 가 main.ts 에서 미호출=dead 면 renderPdfLibraryUploadCard 도 제거 대상; live 면 KEEP.
- 🔴 **KEEP (S1 통해 live)**: `renderPdfMaterialCard`·`renderSubjectPdfMaterialBrowser`·`renderPdfMaterialClassDateControl`.
  경로 = workspace-page.ts:200(S1 pdf-workspace 단수 string) → renderSubjectPdfMaterialBrowser → renderPdfMaterialCard → (showClassDateControl 시) renderPdfMaterialClassDateControl. S1 미이전이라 전부 live.
- spec 정리: `subject-views/__tests__/pdf-library.spec.ts` 등 삭제 함수 단언 제거. orphan 단언 0 확인.

### 첫 명령 (fresh session)
```
git switch -c chore/s5-dead-oracle-removal
# 1) cross-file trace: subject-class.ts liveness 판정 → safe-delete set 확정
# 2) 삭제 + spec 정리
# 3) pnpm -r build (exit0) + pnpm --filter web test:run (165-0 유지)
# 4) self code-review → PR → @codex(post-merge) → squash main (배포 tag 없음)
```

## ✅ 직전 완료 — S4c (sprint 2026-W23-sprint-1 closed)
- PR#139 squash→main `263208a` → **fe-v0.1.84** → Vercel prod 200 `main-tK9mwvCl.js`. @codex no findings.
- Gate 3/6 self+cross PASS. 독립검증 build/test 165-0/loop-gate exit0.
- 누적 prod island 8개(S1a·S2·S3·S3b·S4a·S4b-1·S4b-2·S4c). **11 island / 1 string(pdf-workspace=S1) 잔여.**
- 상세 = MEMORY `project_sprint_w23_1_s4c_pdf_workspaces.md`.

## 📋 잔여 로드맵 (S5 후)
- **#1 PdfMaterialCard 공유 leaf 추출** — ⚠️ user 명시 승인 필요(decision-A 반전, prod island 2개 터치).
- **S1 (pdf-workspace 단수)** — 마지막 string. 🔴 S1b(pen 2nd-stroke)·S1c(annotation 물리 cross-device) 게이트 = 자율 한계.

## 🔑 필수 교훈 (누적)
- **dead-code trace = 정의 파일 포함 전체 grep**(필터 금지). caller-count 만으로 dead 판정 오판 위험.
- **parity = oracle source-diff + render/dispatch 양면 실독**. worker 자가보고 불신 → main 독립 재실행.
- **신규 spec → `apps/web/package.json` test:run 등록 필수**(node:test=명시 enumerate).
- **fe tag 선점 확인** `git tag -l 'fe-v*'|sort -V|tail` + `merge-base --is-ancestor`. 최신=**fe-v0.1.84**.
- **gh pr merge --squash**: 로컬 unpushed commit diverge 시 ff abort → reset --hard origin/main 동기화.
- **배포 = 매번 별도 승인**. **조용히 reorder 금지**(roadmap 순서 user 승인 기반).

## 정책 ambient (SFS 0.6.138)
- 구현 = Sonnet worker(generator). main(Opus) = plan/review/INV + 독립검증. commit=branch, push/deploy=명시 승인.

## follow-up backlog (별개)
- codex #4(FullscreenButton pure-props) = 별도 fix-forward.
- operator 시각 QA(subject-class/week/pdf-workspaces, auth-gated) = user 후속.
