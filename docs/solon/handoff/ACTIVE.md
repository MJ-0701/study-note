# 🎯 ACTIVE — S5 죽은 oracle 제거 완료 (Code Review Only, 배포 없음)

> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.
> merged = PR#141 → main squash `55f6d5f` (2026-06-01).
> status = S5 source cleanup 완료. 배포 없음.

## ✅ S5 결과 — dead S4c oracle renderer 제거
S4c가 `#/pdf-workspaces`를 React island로 대체한 뒤 남아 있던 old string renderer를 제거했다.

### 삭제한 함수
- `apps/web/src/subject-views/pdf-library.ts`
  - `renderPdfWorkspaceIndex`
  - `renderPdfSubjectLibrarySection`
  - `renderPdfLibraryUploadCard`
- 함께 제거: 위 함수 전용 unused import(`StudyNotebook`, `sanitizeExternalUrl`, `subjectPdfWorkspacePath`, `renderMetric`).

### spec/source-grep 정리
- `apps/web/src/subject-views/__tests__/pdf-library.spec.ts`
  - 삭제된 `pdf-workspaces` string index/section/upload-card renderer 단언 제거.
  - KEEP set인 `renderSubjectPdfMaterialBrowser`, `renderPdfMaterialCard`, `renderPdfMaterialClassDateControl` 단언은 유지.
- `apps/web/src/__tests__/pdf-material-library.spec.ts`
  - 삭제된 renderer source-grep 단언 제거.
  - S4b/S4a 이후 현재 route 배선에 맞게 `renderApp` 단언을 island slot/props 경로로 갱신.
- `apps/web/package.json`
  - `test:run` 목록 변경 없음. 위 두 spec은 등록 목록에 없었다.

## 🔎 liveness 판정
- 정의 파일 포함 전체 grep으로 재확인했다.
- `renderPdfWorkspaceIndex`: live caller 0. 기존 ref는 S4c JSX mirror 주석/spec뿐이었다.
- `renderPdfSubjectLibrarySection`: live caller 0. 기존 caller는 `renderPdfWorkspaceIndex` 본체뿐이었다.
- `renderPdfLibraryUploadCard`: `subject-class.ts`가 main route에서 호출되는지 먼저 확인했다.
  - `main.ts`는 `subject`/`subject-class` route에서 `setSubjectClassProps(buildSubjectClassProps(subject))` + `renderSubjectClassSlot()`만 사용한다.
  - `renderSubjectClassPage(subjectClassContext, subject)` live call 없음.
  - 따라서 `pdf-library.ts`의 `renderPdfLibraryUploadCard` export는 runtime dead로 판정해 삭제했다.
  - 남은 `ctx.renderPdfLibraryUploadCard` 문자열은 `subject-class.ts` old oracle/test callback 이름이며 `pdf-library.ts` export 참조가 아니다.

## 🔴 KEEP set 확인
S1 단수 `#/subjects/:id/pdf` string route는 아직 live라 유지했다.

경로:
`apps/web/src/pdf-workspace/workspace-page.ts` → `renderSubjectPdfMaterialBrowser` → `renderPdfMaterialCard` → `renderPdfMaterialClassDateControl`

삭제하지 않은 함수:
- `renderSubjectPdfMaterialBrowser`
- `renderPdfMaterialCard`
- `renderPdfMaterialClassDateControl`

## ✅ 검증
- 보조 spec 직접 실행:
  - `node --experimental-strip-types --no-warnings --test apps/web/src/subject-views/__tests__/pdf-library.spec.ts apps/web/src/__tests__/pdf-material-library.spec.ts`
  - exit 0 · 35 pass · 0 fail
- 필수 build:
  - `pnpm -r build`
  - exit 0
- 필수 web tests:
  - `pnpm --filter web test:run`
  - exit 0 · 165 pass · 0 fail
- orphan 단언 확인:
  - `apps/web/src/subject-views/__tests__/pdf-library.spec.ts`, `apps/web/src/__tests__/pdf-material-library.spec.ts`, `apps/web/package.json`에서 삭제 함수명 grep 결과 0.

## 🚫 배포/릴리스 상태
- PR: #141 squash merged to main (`55f6d5f`).
- duplicate PR #140 closed unmerged (local main ahead docs가 섞여 clean PR로 재작성).
- `fe-v*` tag: 생성하지 않음.
- Vercel/prod 배포: 하지 않음.
- S5는 dead-code/source cleanup이라 release 대상이 아니다.

## 리뷰/검증 evidence
- GitHub Action `Smoke (Backend Contract)` run #44: success.
- `@codex review` on PR#141: major issues 없음, review threads 0.
- clean PR diff: 1 commit, 6 files. S4c report/retro docs가 섞였던 duplicate PR#140은 닫았다.

## 잔여 로드맵 (S5 후 보존)
- **#1 PdfMaterialCard 공유 leaf 추출** — user 명시 승인 필요(decision-A 반전, prod island 2개 터치).
- **S1 (pdf-workspace 단수)** — 마지막 string. S1b(pen 2nd-stroke)·S1c(annotation 물리 cross-device) 게이트 = 자율 한계.

## 필수 교훈 (보존)
- dead-code trace = 정의 파일 포함 전체 grep. caller-count만으로 dead 단정 금지.
- worker/자가보고 불신 → build/test/grep 직접 재실행 후 보고.
- 신규 spec은 `apps/web/package.json`의 explicit `test:run` 등록 필요(node:test glob 아님).
- 배포 = 매번 별도 승인. dead cleanup은 fe tag/Vercel release 금지.
- 조용히 roadmap reorder 금지.

## follow-up backlog (별개)
- codex #4(FullscreenButton pure-props) = 별도 fix-forward.
- operator 시각 QA(subject-class/week/pdf-workspaces, auth-gated) = user 후속.
