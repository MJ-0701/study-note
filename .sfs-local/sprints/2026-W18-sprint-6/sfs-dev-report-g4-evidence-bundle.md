# SFS Dev Report — G4 Evidence Bundle 누락/오분류

- 작성일: 2026-05-02
- 프로젝트: `/Users/mj/IdeaProjects/study-note`
- SFS version: `0.5.73-product`
- Sprint: `2026-W18-sprint-6`
- 실행 명령: `sfs review --gate G4 --executor codex`
- G4 result path: `.sfs-local/tmp/review-runs/2026-W18-sprint-6-G4-20260502T063650Z.result.md`
- G4 prompt path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-6-G4-20260502T063650Z.txt`

## TL;DR

G4 CPO review가 `partial`이 된 원인 중 상당 부분은 제품 코드 자체보다 SFS evidence bundle packaging 문제다.

현재 G4 prompt의 embedded evidence가 실제 구현 범위인 `backend/**`, `backend/prisma/schema.prisma`, `backend/README.md`, `.env.example`, `.gitignore`, `package-lock.json` 등을 포함하지 못했다. 이 때문에 CPO evaluator는 백엔드 구현을 확인할 수 없어서 "backend source is not embedded"를 evidence gap으로 판단했다.

코드레벨로도 추가 보강할 항목은 있다. 예를 들어 ownership smoke가 `GET /materials/:id`에만 집중되어 있고, PDF workspace smoke가 Vite 서버 precondition을 가진다. 하지만 `backend/**` 미포함은 SFS review bundle 생성기의 결함으로 보이며, 이 상태에서는 실제 구현이 있어도 CPO가 검증할 수 없다.

## 재현 절차

1. `study-note` 프로젝트에서 NestJS backend MVP를 `backend/` 아래에 구현한다.
2. 구현 파일이 대부분 untracked 상태인 상황에서 G4 review를 실행한다.

```bash
sfs review --gate G4 --executor codex
```

3. 생성된 prompt를 확인한다.

```bash
sed -n '1,120p' .sfs-local/tmp/review-prompts/2026-W18-sprint-6-G4-20260502T063650Z.txt
```

## 실제 동작

G4 prompt의 evidence bundle에는 아래처럼 root 일부 파일과 `src/`, `scripts/` 일부만 포함됐다.

```text
### git status --short (review-filtered)

?? index.html
?? package.json
?? tsconfig.json
?? vite.config.ts

### untracked file manifest

src/main.ts
src/styles.css
scripts/smoke-backend-contract.mjs
scripts/smoke-pdf-workspace.mjs
package.json

### reviewable implementation file manifest

scripts/dependencies
src/main.ts
src/styles.css
scripts/smoke-backend-contract.mjs
scripts/smoke-pdf-workspace.mjs
package.json
```

하지만 실제 구현에는 다음 파일들이 존재했고 G4 검증에 필수였다.

```text
backend/src/app.module.ts
backend/src/auth/auth.controller.ts
backend/src/auth/auth.service.ts
backend/src/auth/session-auth.guard.ts
backend/src/auth/sessions.service.ts
backend/src/auth/users.service.ts
backend/src/domain/workspace.types.ts
backend/src/health.controller.ts
backend/src/main.ts
backend/src/materials/materials.controller.ts
backend/src/materials/materials.service.ts
backend/src/storage/local-mock-storage.service.ts
backend/src/storage/storage.port.ts
backend/prisma/schema.prisma
backend/README.md
backend/package.json
backend/tsconfig.json
.env.example
package-lock.json
.gitignore
```

CPO result도 동일하게 evidence gap을 지적했다.

```text
Backend source is not embedded: no backend/src/**, backend/package.json,
backend/tsconfig.json, backend/prisma/schema.prisma, backend/README.md,
.env.example, .gitignore, or lockfile excerpts.
```

## 문제 1 — untracked nested directory가 review bundle에서 누락됨

### 영향

이번 sprint의 핵심 구현은 `backend/**`인데, G4 prompt에는 해당 파일들이 전혀 들어가지 않았다. CPO evaluator는 "백엔드 구현이 있는지"를 검증할 수 없고, 실제 구현 여부와 무관하게 partial/fail로 갈 수밖에 없다.

### 기대 동작

SFS review evidence collector는 untracked directory를 파일 단위로 재귀 확장해야 한다.

권장 후보:

```bash
git ls-files --others --exclude-standard
git diff --name-only
git diff --cached --name-only
```

또는 `git status --short --untracked-files=all`을 사용해야 한다.

### 수정 제안

- reviewable file list 생성 시 untracked directory를 collapse하지 말고 recursive file manifest로 확장한다.
- `backend/**`, `src/**`, `scripts/**`, `package*.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `.env.example` 같은 product path를 기본 review target으로 포함한다.
- `plan.md` 또는 `implement.md`의 "변경 파일/모듈" 섹션에 나온 경로도 evidence candidate로 merge한다.

## 문제 2 — `.gitignore`가 SFS system scope로 통째 필터링됨

### 영향

이번 sprint의 AC11은 secret hygiene이고, `.env`, `.env.local`, `backend/.env`, `backend/.env.local` ignore가 검증 근거다. 그런데 G4 prompt는 `.gitignore`를 아래 SFS/system scope로 분류해 product evidence에서 제외했다.

```text
#### SFS-managed system/runtime changes filtered from product scope

.gitignore
```

`.gitignore`에는 Solon managed block이 있더라도, 그 바깥의 product-owned hunk는 review 대상이어야 한다.

### 기대 동작

- `.gitignore` 전체를 system file로 분류하지 않는다.
- 최소한 Solon managed block 바깥 hunk는 product implementation evidence로 포함한다.
- secret hygiene AC가 plan/implement에 있으면 `.gitignore`와 `.env.example`은 우선 evidence로 포함한다.

### 수정 제안

- `.gitignore`는 path-level classifier가 아니라 hunk-level classifier를 적용한다.
- `### BEGIN solon-product ###` ~ `### END solon-product ###` 내부만 system-managed로 보고, 그 외 변경은 product scope로 둔다.

## 문제 3 — priority evidence section matcher가 `implement.md`의 검증 섹션을 못 찾음

G4 prompt에는 아래처럼 표시됐다.

```text
### priority evidence sections: .sfs-local/sprints/2026-W18-sprint-6/implement.md

(no priority evidence sections matched)
```

하지만 `implement.md`에는 `## §3. Artifact Changes Made`, `## §4. Verification`, `## §5. Review Handoff`가 존재한다.

### 영향

구현자가 `implement.md`에 verification/evidence를 기록해도 G4 prompt가 해당 핵심 섹션을 우선 포함하지 못한다. 결과적으로 CPO는 "raw output/evidence missing"으로 판단할 가능성이 커진다.

### 기대 동작

다음 heading 형태를 모두 priority evidence section으로 인식해야 한다.

```text
## §3. Artifact Changes Made
## §4. Verification
## §5. Review Handoff
```

한국어/영어 혼합, section sign(`§`), 숫자 prefix가 있어도 매칭되어야 한다.

### 수정 제안

- section matcher를 exact string보다 regex/normalized heading 기반으로 바꾼다.
- 예: `(?i)^##\\s*(§\\d+\\.?\\s*)?(verification|artifact changes|review handoff|검증|변경|핸드오프)`

## 문제 4 — 존재하지 않는 `scripts/dependencies`가 reviewable manifest에 들어감

G4 prompt의 reviewable implementation file manifest에 다음 항목이 있었다.

```text
scripts/dependencies
```

현재 프로젝트에는 해당 파일이 없다.

### 영향

CPO result에 "`scripts/dependencies` is listed but missing"이라는 노이즈가 추가됐다. 실제 제품 구현과 무관한 누락 항목이 review finding으로 섞인다.

### 기대 동작

- manifest 생성 시 파일 존재 여부를 검증한다.
- 존재하지 않는 path는 reviewable manifest에서 제외한다.
- 꼭 필요한 synthetic/dependency section이라면 `generated evidence section`으로 명확히 표시한다.

## 문제 5 — raw command output 요구와 수집 방식이 불일치함

CPO prompt는 raw verification output이 중요하다고 판단하지만, SFS가 `npm run build`, `npm run smoke:*`, secret grep의 실제 stdout/stderr를 자동 수집하지 않는다. 현재는 구현자가 `implement.md`에 직접 붙이지 않으면 review bundle에 들어가지 않는다.

### 기대 동작

둘 중 하나로 contract를 명확히 해야 한다.

1. SFS가 implement evidence command를 실행/수집하는 공식 경로를 제공한다.
2. 아니면 `implement.md`에 raw output을 반드시 붙이라고 template/checklist에서 강제하고, G4는 해당 섹션을 확실히 embed한다.

### 수정 제안

- `implement.md` template에 "Raw Verification Output" fenced block을 기본 섹션으로 둔다.
- G4 collector는 해당 fenced block을 우선 포함한다.
- 향후에는 `sfs evidence add --command "npm run build"` 같은 command evidence append 기능을 고려한다.

## 기대되는 수정 후 G4 prompt 상태

같은 프로젝트에서 재실행했을 때 G4 prompt에 최소한 아래 evidence가 포함되어야 한다.

```text
backend/src/auth/session-auth.guard.ts
backend/src/auth/sessions.service.ts
backend/src/auth/auth.controller.ts
backend/src/materials/materials.service.ts
backend/src/materials/materials.controller.ts
backend/src/storage/storage.port.ts
backend/src/storage/local-mock-storage.service.ts
backend/src/domain/workspace.types.ts
backend/prisma/schema.prisma
backend/README.md
backend/package.json
backend/tsconfig.json
.env.example
.gitignore product-owned hunk
package-lock.json summary or dependency delta
scripts/smoke-backend-contract.mjs
scripts/smoke-pdf-workspace.mjs
src/main.ts login gate excerpts
src/styles.css login responsive excerpts
implement.md §3/§4/§5 excerpts
```

## 수정 검증 Acceptance Criteria

- AC-SFS-1: `backend/**` 같은 untracked nested directory가 G4 prompt에 bounded excerpts로 포함된다.
- AC-SFS-2: `.gitignore`의 Solon managed block 바깥 product hunk가 evidence에 포함된다.
- AC-SFS-3: `implement.md`의 `## §4. Verification` 섹션이 priority evidence로 포함된다.
- AC-SFS-4: 존재하지 않는 `scripts/dependencies`가 reviewable manifest에 들어가지 않는다.
- AC-SFS-5: G4 CPO가 backend source missing 때문에 partial을 내지 않는다. 단, 실제 코드 품질 finding은 정상적으로 낼 수 있어야 한다.

## 이번 study-note G4에서 SFS와 제품 코드 이슈 구분

SFS 쪽 이슈:

- `backend/**` 누락
- `.gitignore` product hunk 오분류
- `implement.md` priority evidence section 미매칭
- nonexistent `scripts/dependencies` manifest 포함
- raw verification output 수집/임베딩 contract 불명확

제품 코드/구현 쪽 보강 필요:

- `smoke:pdf-workspace`가 Vite dev server를 직접 띄우지 않거나 precondition을 명확히 하지 않는다.
- cross-user denial smoke가 `GET /materials/:id` 외에 `download`, `annotation`, `export-bundle`까지 확장되어야 한다.
- G1의 Prisma/MySQL scope와 실제 in-memory runtime persistence 사이의 MVP 허용 범위를 `implement.md`에 더 명확히 적어야 한다.

즉, 이번 `partial`은 SFS review 시스템만의 문제도 아니고 제품 코드만의 문제도 아니다. 다만 G4 evidence bundle 누락은 SFS 개발팀에서 먼저 고쳐야 이후 CPO review가 실제 구현 품질을 정확히 판단할 수 있다.
