# ACTIVE — React migration Phase 1 공유 leaf 배포 완료

> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.
> latest_code = PR#143 → main squash `51a61fc` (2026-06-01).
> latest_fe_release = `fe-v0.1.85` → GitHub Actions FE Release run `26739780203` success.
> status = S5 dead cleanup + Phase 1 `PdfMaterialCard` shared leaf 완료/배포. S1 단수 route는 hard stop.

## ✅ Phase 1 결과 — `PdfMaterialCard` 공유 leaf 추출

S4b-2 `SubjectClassView`와 S4c `PdfWorkspacesView`에 중복되어 있던 material card JSX leaf를 공유 컴포넌트로 추출했다.

### 변경 파일
- `apps/web/src/subject-views/PdfMaterialCard.tsx`
  - shared `PdfMaterialCard` 추가.
  - `showClassDateControl: true` branch에서만 수업일 picker/적용 버튼 렌더.
  - uncontrolled radio parity 유지: `defaultChecked={opt.checked}` + ``key={`${opt.value}:${opt.checked}`}``.
- `apps/web/src/subject-views/SubjectClassView.tsx`
  - local `PdfMaterialCard`/class-date control leaf 제거.
  - shared card import 후 `showClassDateControl={true}`로 호출.
- `apps/web/src/subject-views/PdfWorkspacesView.tsx`
  - local `PdfMaterialCard` 제거.
  - shared card import 후 `showClassDateControl`를 넘기지 않음(false branch).
- `apps/web/src/subject-views/__tests__/SubjectClassView.spec.ts`
  - shared leaf source + subject-class callsite를 함께 검사하도록 조정.
- `apps/web/src/subject-views/__tests__/PdfWorkspacesView.spec.ts`
  - shared leaf source + pdf-workspaces callsite를 함께 검사.
  - pdf-workspaces callsite가 `showClassDateControl={true}`를 넘기지 않는 negative guard 유지.

### 검증 evidence
- targeted static specs:
  - `node --experimental-strip-types --no-warnings --test apps/web/src/subject-views/__tests__/SubjectClassView.spec.ts apps/web/src/subject-views/__tests__/PdfWorkspacesView.spec.ts`
  - exit 0 · 87 pass · 0 fail
- workspace build:
  - `pnpm -r build`
  - exit 0
- web explicit tests:
  - `pnpm --filter web test:run`
  - exit 0 · 165 pass · 0 fail
- loop gates:
  - `node apps/web/scripts/playwright-s4b2-subject-class-loop.mjs`
  - exit 0 · GREEN + FOCUS-PRES + DIST delta + RED A/B PASS
  - `node apps/web/scripts/playwright-s4c-pdf-workspaces-loop.mjs`
  - exit 0 · GREEN + FOCUS-PRES N/A + DIST delta + RED A/B PASS
  - 참고: sandbox 안 preview listen은 `EPERM`으로 실패해, 같은 스크립트를 sandbox 밖에서 재실행했다.
- SFS review:
  - Gate 3 self/cross: PASS
  - Gate 6 self/cross: PASS
- GitHub:
  - PR#143 `@codex review`: major issues 없음
  - GitHub Action `Smoke (Backend Contract)` run #48: success

### 배포 evidence
- PR#143 squash merged to main: `51a61fc`.
- tag: `fe-v0.1.85` pushed at `51a61fc`.
- FE Release (Vercel) run `26739780203`: success.
- Vercel deployment URL: `https://study-note-27x31i4rm-study-note.vercel.app`.
- custom domain prod smoke:
  - `PROD_URL=https://study-note.910701.xyz/ node scripts/playwright-prod-smoke.mjs`
  - exit 0 · HTTP 200 · login visible true · signup visible true · PASS

## ✅ S5 결과 — dead S4c oracle renderer 제거

S4c가 `#/pdf-workspaces`를 React island로 대체한 뒤 남아 있던 old string renderer를 제거했다.

### 삭제한 함수
- `apps/web/src/subject-views/pdf-library.ts`
  - `renderPdfWorkspaceIndex`
  - `renderPdfSubjectLibrarySection`
  - `renderPdfLibraryUploadCard`
- 함께 제거: 위 함수 전용 unused import(`StudyNotebook`, `sanitizeExternalUrl`, `subjectPdfWorkspacePath`, `renderMetric`).

### liveness 판정
- 정의 파일 포함 전체 grep으로 재확인했다.
- `renderPdfWorkspaceIndex`: live caller 0. 기존 ref는 S4c JSX mirror 주석/spec뿐이었다.
- `renderPdfSubjectLibrarySection`: live caller 0. 기존 caller는 `renderPdfWorkspaceIndex` 본체뿐이었다.
- `renderPdfLibraryUploadCard`: `subject-class.ts` old string producer가 `main.ts`에서 호출되지 않아 runtime dead로 판정했다.
- PR#141 squash merged to main: `55f6d5f`.
- S5는 dead-code/source cleanup이라 `fe-v*` tag/Vercel 배포를 하지 않았다.

## 🔴 KEEP / Hard Stop

S1 단수 `#/subjects/:id/pdf` string route는 아직 live라 유지한다.

경로:
`apps/web/src/pdf-workspace/workspace-page.ts` → `renderSubjectPdfMaterialBrowser` → `renderPdfMaterialCard` → `renderPdfMaterialClassDateControl`

삭제하지 않은 함수:
- `renderSubjectPdfMaterialBrowser`
- `renderPdfMaterialCard`
- `renderPdfMaterialClassDateControl`

## 잔여 로드맵

- **S1 (pdf-workspace 단수)** — 마지막 string route.
  - S1b: pen 2nd-stroke physical check 필요.
  - S1c: annotation physical cross-device gate 필요.
  - 위 두 물리 게이트 unlock 전에는 agent 자율 구현 금지.

## 필수 교훈 (보존)

- dead-code trace = 정의 파일 포함 전체 grep. caller-count만으로 dead 단정 금지.
- worker/자가보고 불신 → build/test/grep 직접 재실행 후 보고.
- 신규 spec은 `apps/web/package.json`의 explicit `test:run` 등록 필요(node:test glob 아님).
- 배포는 scope별 명시 승인과 release evidence가 필요하다. S5 dead cleanup처럼 번들 무변화면 배포 금지.
- 조용히 roadmap reorder 금지.

## follow-up backlog (별개)

- codex #4(FullscreenButton pure-props) = 별도 fix-forward.
- operator 시각 QA(subject-class/week/pdf-workspaces, auth-gated) = user 후속.
