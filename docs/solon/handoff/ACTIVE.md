# ACTIVE — PR#119/#120 main 반영 + fe/be 배포 완료

> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.
> latest_code = PR#119/#120 → integration merge `7fe3270` (2026-06-01).
> latest_fe_release = `fe-v0.1.86` → GitHub Actions FE Release run `26751853547` success.
> latest_be_release = `be-v0.1.37` → GitHub Actions BE Release run `26751854442` success.
> status = REVIEWER 제한 권한 + PDF annotation material scoping fix 운영 반영. React migration Phase 1/S5 완료, S1 단수 route는 hard stop.

## ✅ 2026-06-01 운영 반영 — PR#119 + PR#120

### 반영한 PR
- PR#119 `feat(authz): REVIEWER role — 운영지표 전용 제한 권한`
  - `REVIEWER` role 추가.
  - 리뷰어 계정은 운영 지표 진입점만 허용하고 사용자/콘텐츠 관리 API는 서버에서 차단.
  - seed/smoke는 reviewer와 admin 계정을 분리해 권한 경계를 검증.
- PR#120 `fix(pdf-workspace): material 전환 시 annotation display bleed 차단`
  - material 전환 중 pending annotation/hydration merge가 다른 material 화면에 새지 않도록 scoping 보정.

### merge / review evidence
- #119/#120 모두 `@codex review` major issues 없음.
- stacked PR 충돌 때문에 최신 `origin/main`에서 integration branch `codex/merge-119-120`로 수동 통합.
- conflict resolution:
  - `packages/persistence/prisma/seed-subjects.mjs`: main의 `Term` relation backfill과 PR#119 default term SoT를 함께 보존.
  - `scripts/smoke-backend-contract.mjs`: reviewer/admin 권한 smoke를 현재 seed 계정 기준으로 정리.
- main 반영:
  - merge commit `4d0275a` = PR#119 통합.
  - merge commit `7fe3270` = PR#120 통합.
  - PR#119/#120 `MERGED` at `2026-06-01T11:22:17Z`.

### pre-merge 검증 evidence
- `pnpm -r build`
  - exit 0.
- `pnpm --filter @study-note/web test:run`
  - exit 0 · 165 pass · 0 fail.
- `node --experimental-strip-types --no-warnings --test apps/web/src/pdf-workspace/__tests__/annotation-sync.spec.ts apps/web/src/pdf-workspace/__tests__/workspace-store.spec.ts packages/domain/__tests__/pdf-workspace.spec.ts`
  - exit 0 · 163 pass · 0 fail.
- `pnpm test:backend`
  - exit 0 · 250 pass · 0 fail.
- `pnpm smoke:backend`
  - exit 0.
  - sandbox 안 Docker socket permission으로 1차 실패 후, sandbox 밖에서 재실행.
  - reviewer `/v1/admin/users` 403, reviewer `/v1/admin/ops-dashboard` allowed, admin `/v1/admin/users` accepted 확인.

### 배포 evidence
- tag `fe-v0.1.86` pushed at `7fe3270`.
  - FE Release (Vercel) run `26751853547`: success.
  - Vercel deployment URL: `https://study-note-pqa1smxco-study-note.vercel.app`.
- tag `be-v0.1.37` pushed at `7fe3270`.
  - BE Release (Azure Container Apps) run `26751854442`: success.
- prod smoke:
  - `curl -fsS https://study-note.910701.xyz/api/health`
    - exit 0 · `{"ok":true,"service":"study-note-backend","storageProvider":"s3"}`.
  - `curl -fsSI https://study-note.910701.xyz/`
    - exit 0 · HTTP 200.
  - `curl -fsS https://study-note.api.910701.xyz/api/health`
    - exit 0 · `{"ok":true,"service":"study-note-backend","storageProvider":"s3"}`.
  - `PROD_URL=https://study-note.910701.xyz/ node scripts/playwright-prod-smoke.mjs`
    - exit 0 · HTTP 200 · login visible true · signup visible true · PASS.
    - sandbox 안 Chrome process control `EPERM`으로 1차 실패 후, sandbox 밖에서 재실행.

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
