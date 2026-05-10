---
phase: decision
decision_id: "0007"
sprint_id: "2026-W19-sprint-1"
created_at: "2026-05-09T22:15:00+09:00"
status: accepted
gate: G1
related_plan: ".sfs-local/sprints/2026-W19-sprint-1/plan.md"
related_review: ".sfs-local/sprints/2026-W19-sprint-1/review.md"
---

# Decision 0007 — Module architecture redistribution (pnpm workspaces 평평 monorepo)

## 1. Context

Sprint `2026-W19-sprint-1` 의 sprint goal 은 "모듈 아키텍처 재설계 (설계 sprint, S7·S8 PII hygiene 코드 변경 한정)" 다. README 가 다음 sprint 의 rewrite-수준 리팩토링을 예고했고, 본 sprint 는 그 모듈 경계 / 공통 설정 / 영향 path / 운영 가정 / 보안 측면을 합의한다. 본 ADR 은 이 합의의 단일 산출물이다.

브레인스토밍 (`brainstorm.md`) 라운드 1~5 에서 hard mode 8개 owner-decision 이 lock 됐다.

| Q | 결정 |
|---|---|
| Q1 sprint 성격 | (a) 설계 sprint, 다음 sprint 에 실제 이동 |
| Q2 workspaces 도구 | pnpm workspaces (corepack 도입) |
| Q3 모듈 명명 | Node 관행 (`backend/`, `frontend/`, `infra/` 컨셉) |
| Q4 공유 도메인 SoT | `packages/domain` 별 workspace 모듈 |
| Q5 ADR 0001 운영 형상 supersede | 본 sprint 와 분리, 실제 배포 임박 시 별 brainstorm + decision |
| Q6 컨테이너 분산 | Dockerfile = 각 service 모듈, `docker-compose.yml` + db + s3(localstack) = `infra/`, redis 미도입 |
| Q7 backend surface 입자 | api/mcp/cli/web 별 모듈 |
| Q8 폴더 모양 | `apps/{api,mcp,cli,web}` + `infra/` + `packages/*` (평평 monorepo) |

운영 형상 가정 — 본 ADR 의 도면은 GitHub Student Pack 기반 Azure + DigitalOcean 분리 배포를 가정하고 그려졌다. ADR 0001 (NestJS + Vite + MySQL + S3 + .env stack lock-in) 의 stack 결정은 유지하되, ADR 0001 의 운영 형상 절 ("EC2 small + docker-compose 단일 호스트") 의 supersede 는 본 ADR 이 처리하지 않는다 (Q5 lock). 운영 ADR 작성은 §15 다음 sprint 의무.

Plan 컨트랙트 (`plan.md`) 는 R1~R12 / AC1~AC12 / S1~S8 / 위험 R1~R8 로 구성됐고, Gate 3 cross review 가 5 라운드 끝에 codex CPO (gpt-5.5 xhigh, security lens) 에서 PASS 받았다 (`review.md` round 5).

## 2. Decision

본 sprint 의 모듈 아키텍처 재설계를 다음 8 항목으로 합의한다.

- **D1**. pnpm workspaces 기반 평평 monorepo. `pnpm-workspace.yaml` = `packages: ["apps/*", "infra", "packages/*"]`.
- **D2**. backend surface 4종 (Nest HTTP / MCP stdio / CLI / web bundle) 을 별 모듈로 분리. `apps/api`, `apps/mcp`, `apps/cli`, `apps/web`.
- **D3**. 공유 도메인 = `packages/domain` 별 workspace 모듈. workspace protocol (`"@study-note/domain": "workspace:*"`) 로 다른 모듈이 import.
- **D4**. 컨테이너 분산 — Dockerfile 은 각 `apps/*` 가 자기 빌드 컨텍스트로 소유, `docker-compose.yml` + db (MySQL) + s3 (localstack) 는 `infra/` 가 소유. redis 미도입.
- **D5**. PII fixture 정리 — repo 의 commit 값에서 사용자 본인 PII 를 제거하고 env interpolation + `.env` (gitignored) 주입으로 전환. dummy 는 placeholder (Dev User / 20260001 / dev1@example.com 형태).
- **D6**. `scripts/db-persistent.mjs` 가 `.env` overwrite 시 사용자 정의 `STUDY_NOTE_*` 환경변수를 보존하는 read-and-merge 로직.
- **D7**. backend layer packages 후보 5종 (`persistence` / `storage` / `auth` / `corpus` / `persona-engine`) 을 도면에 명시, 추출은 다음 sprint 우선순위에 따라.
- **D8**. ADR 0001 의 운영 형상 절 supersede 는 별 ADR (`docs/solon/decisions/000N-operational-form-azure-digitalocean.md`) 의 의무 — 실제 배포 임박 시 작성.

## 3. 모듈 도면 (R1, AC1)

| 모듈 | 책임 | 진입점 | 외부 의존 (모듈) | 현재 위치 | 차세대 위치 |
|---|---|---|---|---|---|
| `apps/api` | Nest HTTP API server | `apps/api/src/main.ts` | persistence, storage, auth, persona-engine, corpus | `backend/src/main.ts` + `app.module.ts` + 대부분의 `backend/src/*` (cli/mcp-server 제외) | `apps/api/src/` |
| `apps/mcp` | MCP stdio server (외부 agent 가 호출) | `apps/mcp/src/index.ts` | persistence, corpus, domain | `backend/src/mcp-server/*` | `apps/mcp/src/` |
| `apps/cli` | CLI binaries (ingest-pdf, persona-turn) | `apps/cli/src/{ingest-pdf,persona-turn}.ts` | persistence, storage, corpus, persona-engine | `backend/src/cli/*` | `apps/cli/src/` |
| `apps/web` | Vite SPA (lecture-note + persona-turn 두 entry) | `apps/web/index.html` + `apps/web/persona-turn.html` + `apps/web/src/main.ts` | api (HTTP), domain (타입만) | root `index.html` + `persona-turn.html` + `vite.config.ts` + `src/*` | `apps/web/` |
| `infra` | docker-compose + db + s3 (localstack) + 운영 deploy 자료 | `infra/docker-compose.yml` | (없음, infra leaf) | root `docker-compose.yml` + `localstack/` + `Dockerfile` | `infra/` |
| `packages/domain` | 공유 타입 + 순수 함수 (PDF workspace, conversation, persona, source label) | `packages/domain/src/index.ts` | (없음, leaf) | `src/domain/*` ∪ `backend/src/domain/*` | `packages/domain/src/` |
| `packages/persistence` (후보, §9) | Prisma schema + client + repository wrapper | TBD | DB driver | `backend/src/prisma/*` + `backend/prisma/*` | `packages/persistence/src/` (다음 sprint) |
| `packages/storage` (후보, §9) | S3 / local-mock storage abstraction (StoragePort) | TBD | S3 SDK | `backend/src/storage/*` | `packages/storage/src/` (다음 sprint) |
| `packages/auth` (후보, §9) | session-auth + users + sessions + guard | TBD | persistence | `backend/src/auth/*` | `packages/auth/src/` (다음 sprint) |
| `packages/corpus` (후보, §9) | RAG corpus + chunk + embedding + retrieval | TBD | transformers, pdf-parse, persistence | `backend/src/corpus/*` | `packages/corpus/src/` (다음 sprint) |
| `packages/persona-engine` (후보, §9) | persona response + agent adapter registry | TBD | corpus, agent CLIs | `backend/src/persona/*` | `packages/persona-engine/src/` (다음 sprint) |

총 11 행 (AC1 minimum 10 ≥ 10).

## 4. 공통 설정 명세 (R2, AC2)

Spring multi-module → Node 표준 매핑. root 한 곳에서 선언, 각 모듈이 `extends` 로 상속.

| 파일 | 위치 | 핵심 키 / 값 (예시) | Spring 등가 |
|---|---|---|---|
| `pnpm-workspace.yaml` | root | `packages: ["apps/*", "infra", "packages/*"]` | `settings.gradle` (`include 'be-module'`) |
| `tsconfig.base.json` | root | `target: ES2022`, `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: Bundler` | root `build.gradle` 의 java toolchain version + 공통 compiler options |
| `.eslintrc.json` | root | `extends: ["@typescript-eslint/recommended"]`, project-wide rules | spotless / checkstyle root config |
| `.prettierrc` | root | `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"` | spotless format rule |
| `.editorconfig` | root | `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true` | `.editorconfig` (동일 표준) |
| `.nvmrc` 또는 `package.json#engines.node` | root | `>=20.10.0` (Node LTS, native 모듈 호환) | `java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }` |
| `.npmrc` | root | `auto-install-peers=true`, `strict-peer-dependencies=false`, `public-hoist-pattern[]=*types*` | `gradle.properties` (project-wide property) |
| root `package.json#devDependencies` | root | `typescript`, `prettier`, `eslint`, `@typescript-eslint/*`, `@types/node` | root `build.gradle` 의 공통 `dependencies { implementation ... }` |

총 8 행 (AC2 정확 매칭).

## 5. SoT migration 매핑 (R3, AC3)

현재 `src/domain/*` (frontend) 와 `backend/src/domain/*` (backend) 의 export 를 `packages/domain/src/*` 로 통합. 중복 4종은 invariant 차이 컬럼이 핵심 (drift risk 의 source).

| 현재 export (위치) | 차세대 위치 (`packages/domain/src/*`) | invariant 차이 (frontend ↔ backend) |
|---|---|---|
| `PdfStickyNote` (frontend `pdfWorkspace.ts`) ↔ `PdfStickyNote` (backend `workspace.types.ts`) — **중복** | `packages/domain/src/pdf-workspace.ts` | frontend = `id, page, blocks[], createdAt`; backend = `id, page, blocks[], createdAt, materialId, ownerUserId`. 통합 필드 = backend rich + frontend optional `materialId`/`ownerUserId`. |
| `PdfStickyNoteBlock` (frontend) ↔ `PdfStickyNoteBlock` (backend) — **중복** | `packages/domain/src/pdf-workspace.ts` | frontend = block kind discriminated union (`text` / `checklist` / `table` / `chart-note`); backend = subset (`text` / `checklist`). 통합 = frontend full union + backend round-trip 가능성 명시. |
| `PdfInkPoint` (frontend) ↔ `PdfInkPoint` (backend) — **중복** | `packages/domain/src/pdf-workspace.ts` | 동일 shape (`x: number`, `y: number`, normalized). 통합 trivial. |
| `PdfInkStroke` (frontend) ↔ `PdfInkStroke` (backend) — **중복** | `packages/domain/src/pdf-workspace.ts` | frontend = `points[], color, width`; backend = `points[], color, width, strokeId`. 통합 = backend rich. |
| `PdfWorkspaceTool` (frontend) | `packages/domain/src/pdf-workspace.ts` | frontend-only, 통합 후에도 frontend 만 사용. |
| `StickyNoteBlockKind` (frontend) | `packages/domain/src/pdf-workspace.ts` | frontend-only. |
| `NormalizedPoint` (frontend) | `packages/domain/src/pdf-workspace.ts` | frontend-only. |
| `PdfMaterialDraft` (frontend) | `packages/domain/src/pdf-workspace.ts` | frontend-only (upload intent 이전 단계). |
| `SubjectPdfWorkspace` + `PdfWorkspaceStore` (frontend) | `packages/domain/src/pdf-workspace.ts` | frontend store contract. |
| `BackendPdfMaterialInput` (frontend) | `packages/domain/src/pdf-workspace.ts` | frontend → backend mapping shape. |
| `PdfMaterialRecord` (backend) | `packages/domain/src/pdf-workspace.ts` | backend rich record (id, ownerUserId, status, uploadedAt). |
| `AnnotationSnapshotRecord` (backend) | `packages/domain/src/pdf-workspace.ts` | backend annotation snapshot. |
| `UserProfile` (backend) | `packages/domain/src/user.ts` | backend-only auth/session. |
| `SourceKind` / `SourceVisibility` / `KeywordCoverageStatus` / `ConceptPriority` / `ShareAccess` / `SourceMaterial` (frontend `lectureNote.ts`) | `packages/domain/src/lecture-note.ts` | frontend-only domain enum + value object. |
| `WeekNoteImportPayload` / `ImportValidationResult` / `ApplyImportResult` + 함수들 (frontend `lectureNoteImport.ts`) | `packages/domain/src/lecture-note-import.ts` | frontend-only import pipeline. |

총 15 행 (AC3 minimum 12 ≥ 12). 중복 4종 모두 invariant 차이 컬럼이 비-empty.

> 전체 export 목록은 §7 의 영향 path 표 + grep (`grep -rn "^export " src/domain/ backend/src/domain/`) 으로 도출 가능. 본 표는 mandatory 4종 + load-bearing 11종으로 좁힌 minimum view.

## 6. 컨테이너 분산 명세 (R4, AC4)

Dockerfile 은 각 `apps/*` 가 자기 빌드 컨텍스트로 소유. `infra/docker-compose.yml` 이 service 합성 책임.

| service | Dockerfile 위치 | build context | base image | port (host:container) | 핵심 env | depends_on |
|---|---|---|---|---|---|---|
| `api` | `apps/api/Dockerfile` | `apps/api/` (+ workspace deps via pnpm fetch) | `node:20-alpine` | `3001:3000` | `DATABASE_URL`, `S3_*`, `SESSION_TOKEN_PEPPER`, `STUDY_NOTE_*_USER_*` (dummy in compose, real via .env) | `mysql`, `localstack` |
| `web` | `apps/web/Dockerfile` | `apps/web/` (+ build-time API base url) | multi-stage: `node:20-alpine` (build) → `nginx:alpine` (serve) | `80:80` | (build-time only) `VITE_API_BASE_URL` | `api` |
| `mcp` | `apps/mcp/Dockerfile` | `apps/mcp/` | `node:20-alpine` | (stdio, no network port) | `DATABASE_URL`, `STUDY_NOTE_*` | `mysql` |
| `cli` | `apps/cli/Dockerfile` | `apps/cli/` (on-demand `docker run`) | `node:20-alpine` | (entrypoint script, no port) | `DATABASE_URL`, `S3_*`, `STUDY_NOTE_LLM_*` | `mysql` |
| `mysql` | (image only, no Dockerfile) | n/a | `mysql:8.0` | `3306:3306` | `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | (none) |
| `localstack` | (image only, no Dockerfile) | n/a | `localstack/localstack` | `4566:4566` | `SERVICES=s3` | (none) |

총 6 행 (AC4 정확 매칭). **redis: 미도입** (사용자 라운드 4 답, 본 sprint 와 다음 sprint 모두 적용 외 — 향후 sprint 에서 caching/queue 가 필요해질 때 별 ADR).

### 현재 상태 vs 다음 sprint 이후 상태 (Gate 4 round 1 finding F2 인계)

본 §6 표는 다음 sprint PR 4 (`infra/` 분리) 가 끝난 후의 상태를 그린다. 본 sprint 진입 시점에서 root `docker-compose.yml` 은 그대로 root 에 있고 service 합성도 root 의존이다. `STORAGE_PROVIDER` 의 분기는 환경마다 다르다 — root `docker-compose.yml` 의 `STORAGE_PROVIDER=local` 은 컨테이너 환경의 hardcode 가 아니라 S7 round 4 patch 후 `${STORAGE_PROVIDER:-local}` env interpolation 이고, `.env.example` 의 `STORAGE_PROVIDER=s3` 는 `npm run dev:backend` 같이 host 에서 직접 실행하는 dev 명령용 default 다. 두 환경 (host dev_backend vs docker-compose) 이 다른 storage 의향을 가지는 게 정상 (전자 = localstack 컨테이너 활용, 후자 = local file). 다음 sprint 의 `infra/compose` 이동 시점에 두 의향을 §18.6 env matrix 와 한 번 더 정렬한다.

## 7. 영향 path 표 (R5, AC5)

새 layout 으로 갈 때 patch 가 필요한 모든 path 의 목록. 다음 sprint 의 이동 sprint 의 입력.

| 현재 path | 새 path | 변경 모양 | 영향 surface |
|---|---|---|---|
| `vite.config.ts` (root) | `apps/web/vite.config.ts` | move + rollupOptions.input 경로 갱신 | web build |
| `tsconfig.json` (root, `include: ["src"]`) | 삭제 → root `tsconfig.base.json` + `apps/web/tsconfig.json (extends base)` | split | web build |
| `index.html` (root) | `apps/web/index.html` | move | web entry |
| `persona-turn.html` (root) | `apps/web/persona-turn.html` | move | web entry |
| `src/main.ts` | `apps/web/src/main.ts` | move | web entry |
| `src/styles.css` | `apps/web/src/styles.css` | move | web |
| `src/api/materials.ts` | `apps/web/src/api/materials.ts` | move | web → api HTTP client |
| `src/persona-turn/*` (App.tsx, main.tsx, styles.css, components/, api/) | `apps/web/src/persona-turn/*` | move | web persona-turn entry |
| `src/data/*` (intakeGuide, sampleLectureNote, classSchedule) | `apps/web/src/data/*` | move | web local data |
| `src/domain/lectureNote.ts` | `packages/domain/src/lecture-note.ts` | move + symbol re-export from `apps/web` | web import → workspace import |
| `src/domain/lectureNoteImport.ts` | `packages/domain/src/lecture-note-import.ts` | move | web |
| `src/domain/pdfWorkspace.ts` | `packages/domain/src/pdf-workspace.ts` (중복 4종 통합) | move + invariant merge | web + api + mcp + cli |
| `backend/src/main.ts` | `apps/api/src/main.ts` | move | api entry |
| `backend/src/app.module.ts` | `apps/api/src/app.module.ts` | move | api Nest module root |
| `backend/src/health.controller.ts` | `apps/api/src/health.controller.ts` | move | api |
| `backend/src/materials/*` | `apps/api/src/materials/*` | move | api |
| `backend/src/auth/*` | `apps/api/src/auth/*` (다음 sprint 우선순위 3차에 `packages/auth` 추출) | move | api |
| `backend/src/corpus/*` | `apps/api/src/corpus/*` (다음 sprint 우선순위 2차에 `packages/corpus` 추출) | move | api + cli + mcp |
| `backend/src/persona/*` | `apps/api/src/persona/*` (다음 sprint 우선순위 2차에 `packages/persona-engine` 추출) | move | api + cli |
| `backend/src/storage/*` | `apps/api/src/storage/*` (다음 sprint 우선순위 2차에 `packages/storage` 추출) | move | api + cli |
| `backend/src/prisma/*` | `apps/api/src/prisma/*` (§8 잠정, 다음 sprint 에 `packages/persistence` 추출 결정) | move | api + cli + mcp |
| `backend/src/domain/workspace.types.ts` | `packages/domain/src/pdf-workspace.ts` (frontend 중복과 통합) | move + merge | api + mcp + cli + web |
| `backend/src/cli/ingest-pdf.ts` | `apps/cli/src/ingest-pdf.ts` | move | cli |
| `backend/src/cli/persona-turn.ts` | `apps/cli/src/persona-turn.ts` | move | cli |
| `backend/src/mcp-server/index.ts` | `apps/mcp/src/index.ts` | move | mcp |
| `backend/src/mcp-server/get-chunks.tool.ts` | `apps/mcp/src/get-chunks.tool.ts` | move | mcp |
| `backend/tsconfig.json` | 삭제 → `apps/api/tsconfig.json` + `apps/mcp/tsconfig.json` + `apps/cli/tsconfig.json` (모두 extends `tsconfig.base.json`) | split | api/mcp/cli build |
| `apps/api/prisma/schema.prisma` | `apps/api/prisma/schema.prisma` (§8 잠정) | move | api/cli/mcp DB |
| `backend/prisma/migrations/*` | `apps/api/prisma/migrations/*` (§8 잠정) | move | api DB |
| `apps/api/prisma/seed.mjs` | `apps/api/prisma/seed.mjs` (§8 잠정) | move | api DB seed |
| `backend/Dockerfile` | `apps/api/Dockerfile` | move + build context 갱신 | api docker |
| `Dockerfile` (root, frontend serve) | `apps/web/Dockerfile` | move + multi-stage 정리 | web docker |
| `docker-compose.yml` (root) | `infra/docker-compose.yml` | move + service 경로 갱신 (build context = `../apps/*`) | infra |
| `localstack/*` (root) | `infra/localstack/*` | move | infra |
| `scripts/smoke-backend-contract.mjs` (`apps/api/dist/main.js` 하드코드) | scripts/* 그대로, 내부 path → `apps/api/dist/main.js` | patch (3+ 경로) | smoke |
| `scripts/smoke-corpus-ingest.mjs` (`apps/cli/dist/ingest-pdf.js` 등) | 내부 path → `apps/cli/dist/ingest-pdf.js` | patch (3 경로) | smoke |
| `scripts/smoke-pdf-workspace.mjs` (`apps/api/dist/main.js`) | 내부 path → `apps/api/dist/main.js` | patch | smoke |
| `scripts/smoke-persona-turn.mjs` | 내부 path → `apps/cli/dist/persona-turn.js` 또는 `apps/api/dist/main.js` | patch | smoke |
| `scripts/smoke-s3-storage.mjs` / `smoke-real-s3-storage.mjs` | 내부 path → `apps/api/dist/main.js` | patch | smoke |
| `scripts/ac13-fixture-evidence.mjs` / `ac13-real-pdf-evidence.mjs` | 내부 path → `apps/api/dist/main.js` 또는 `apps/cli/dist/persona-turn.js` | patch | evidence |
| `scripts/manual-real-pdf-ingest.mjs` | 내부 path → `apps/cli/dist/ingest-pdf.js` | patch | manual |
| `scripts/run-backend-tests.mjs` | 내부 path → `apps/api/dist/*` | patch | test |
| `scripts/db-persistent.mjs` | 그대로 (DB only, surface 모듈 의존 없음) | unchanged | infra |
| `package.json#scripts.dev` (`vite --host 127.0.0.1`) | `pnpm --filter @study-note/web dev` | replace | dev |
| `package.json#scripts.dev:backend` (`build:backend && node apps/api/dist/main.js`) | `pnpm --filter @study-note/api dev` (또는 build + node) | replace | dev |
| `package.json#scripts.build:frontend` (`tsc --noEmit && vite build`) | `pnpm --filter @study-note/web build` | replace | build |
| `package.json#scripts.build:backend` (`tsc -p backend/tsconfig.json`) | `pnpm --filter @study-note/api build` (+ mcp/cli) | replace | build |
| `package.json#scripts.smoke:*` (모든 smoke 항목) | `pnpm --filter @study-note/api build && node scripts/smoke-*` (filter prefix 추가) | replace | smoke |
| `package.json#scripts.mcp:server` (`apps/mcp/dist/index.js`) | `pnpm --filter @study-note/mcp start` | replace | mcp run |
| `package.json#scripts.persona:turn` / `ingest:pdf` (`apps/cli/dist/*`) | `pnpm --filter @study-note/cli run *` | replace | cli run |
| `package.json#scripts.preview` (`vite preview`) | `pnpm --filter @study-note/web preview` | replace | preview |
| `package.json#scripts.prisma:*` (schema path = `apps/api/prisma/schema.prisma`) | schema path → `apps/api/prisma/schema.prisma` (§8 잠정), 또는 `pnpm --filter @study-note/api prisma:*` | replace | DB |
| `README.md` (Vite-편향 root layout 설명) | layout 섹션 갱신 (apps/* + infra + packages/*) | patch | docs |
| `backend/README.md` (root path 가정) | api/mcp/cli 분리 반영 | patch | docs |

총 39 행 (AC5 minimum 30 ≥ 30). `scripts/*.mjs` 10개 (brainstorm probe 의 hardcoded path 10건) 모두 등장.

## 8. Prisma schema 위치 결정 (R6, AC6)

선택지 둘:

- **A. `apps/api/prisma/` 잠정** (defer-to-next-sprint 추출): 본 sprint 에서 schema/migrations/seed 를 `apps/api/prisma/` 아래에 이동만. `apps/cli` 와 `apps/mcp` 는 `apps/api` 의 prisma client 를 import (workspace 의존) 또는 schema path 를 명시 참조. 다음 sprint 의 `packages/persistence` 추출 결정 (§9 우선순위 2차) 에서 `packages/persistence/prisma/` 로 이동.
- **B. 본 sprint 에 `packages/persistence/prisma/` lock**: 본 sprint 가 schema/migrations/seed 를 `packages/persistence/prisma/` 로 한 번에 이동. `apps/api`, `apps/cli`, `apps/mcp` 는 모두 `packages/persistence` 의 client export 를 import. `packages/persistence` 의 다른 책임 (repository wrapper, transaction helper) 은 다음 sprint.

**선택: A (defer-to-next-sprint)**.

근거 — §9 의 layer packages 우선순위 표에서 `persistence` 가 2차 (다음 sprint 1차 추출 후 그 다음 슬라이스) 다. 본 sprint 에서 schema 만 미리 `packages/persistence` 로 옮기면 `packages/persistence` 가 도면에는 명시되지만 본 ADR 의 "후보 = 도면 박스만" 일관성과 충돌. trigger rule = "다음 sprint 의 `packages/persistence` 추출 슬라이스 (§9 우선순위 2차) 에서 schema/migrations/seed 를 `packages/persistence/prisma/` 로 일괄 이동, 그 시점에 client export shape 도 함께 결정".

## 9. Backend layer packages 후보 우선순위 (R7, AC7)

§3 의 도면에 등장한 5 후보 모듈의 추출 우선순위. 본 sprint 는 도면 박스만, 실제 추출은 다음 sprint 부터.

| 후보 | 추출 우선순위 | 추출 기준 (어느 surface 가 공유하는가) | 다음 sprint 의무 여부 |
|---|---|---|---|
| `packages/persistence` | 2차 | `apps/api` (Nest controllers), `apps/cli` (ingest-pdf, persona-turn), `apps/mcp` (get-chunks). 셋 다 같은 prisma schema 를 본다. | 의무 (§8 의 schema 위치 lock 시점) |
| `packages/storage` | 2차 | `apps/api` (materials controller), `apps/cli` (ingest-pdf 의 PDF 업로드). 두 surface 가 storage abstraction 공유. | 의무 |
| `packages/persona-engine` | 2차 | `apps/api` (persona-turn controller), `apps/cli` (persona-turn). 같은 persona response 합성 로직. | 의무 |
| `packages/corpus` | 2차 | `apps/api` (질의응답), `apps/mcp` (get_chunks tool), `apps/cli` (ingest-pdf). 세 surface 가 chunk/embedding 공유. | 의무 |
| `packages/auth` | 3차 | 현재 `apps/api` 만 사용 (web 전용 session). `apps/mcp` 가 향후 인증을 가질 가능성 (별 ADR). | 선택 (다음 sprint 가 아닌 그 다음 sprint 또는 이후) |

총 5 행 (AC7 정확 매칭). 1차 = `packages/domain` 은 §3 / §5 에서 본 ADR 가 lock (다음 sprint 의 첫 추출).

## 10. Threat model (R9, AC9)

| surface | attacker | untrusted input | trust boundary | failure mode | mitigation |
|---|---|---|---|---|---|
| `apps/web` | malicious site (XSS) / end user (untrusted upload) / stolen session token | PDF file content, post-it/ink content, login form, localStorage state | browser ↔ `apps/api` HTTPS | DOM injection, persisted XSS, session hijack | DOMPurify (현재), CSP header, CORS allowlist, secure/sameSite cookie 정책, server-side validation per request |
| `apps/api` | unauthenticated client / cross-user / malformed PDF / oversized payload | HTTP body, file upload, query param, header | `apps/api` ↔ MySQL/S3 | unauth access, parameter injection, path traversal, oversized upload, S3 path collision | session-auth guard (현재), Prisma parameterized only (no raw SQL), `PDF_UPLOAD_MAX_BYTES` (현재), S3 path = `users/<userId>/<materialId>` scoping, zod input validation |
| `apps/mcp` | malicious agent / prompt injection via tool args / unbounded retrieval | MCP tool call args (`query`, `count`), embedded UNTRUSTED_CONTEXT chunk text | mcp stdio ↔ `packages/persistence` + `packages/corpus` | tool argument abuse (oversized / SQL-shaped), unbounded retrieval cost, prompt injection through chunk content | zod tool args schema (현재), `get_chunks` 의 count 상한, untrusted-context delimiter, no privileged ops on stdio (read-only by design) |
| `apps/cli` | env-shell attacker / dev machine compromise / supply chain | CLI args (PDF path, query string), env vars (LLM credentials, DB url) | cli process ↔ MySQL/S3 + LLM agent CLI | path traversal, env leak via logs, real PII in cli stdout | `safeBasename` + `path.resolve` 검증 (현재), env-only secret channel (no flag-based), no PII in logs (sources = display-safe label only) |
| `infra/mysql` | direct DB attacker (rare in local), credential leak | network port 3306, MYSQL_PASSWORD env | docker network ↔ MySQL | unauthorized direct DB connection, credential reuse | docker network isolation (`study-note-net`), local-dev-only (production = managed DB, 별 운영 ADR), MYSQL_PASSWORD via env interpolation only |
| `infra/localstack` | local network attacker | port 4566, S3 path | docker network ↔ S3 sim | unauthorized direct S3-sim access, fixture artifact leak | local-dev-only (production = real S3 with IAM, 별 운영 ADR), `STORAGE_PROVIDER=local` fallback for safest dev mode |

총 6 행 (AC9 정확 매칭). 모든 mitigation 컬럼 비-empty.

## 11. Secret/PII handling 정책 (R10, AC10)

본 sprint S7/S8 슬라이스에서 PII fixture 정리 및 환경변수 보존을 commit 했다. 본 절은 ADR artifact 가 그 정책을 명시 형태로 lock 하는 역할.

(a) **Production secret 주입 채널**. `.env` (gitignored, 로컬 dev) → docker-compose 의 `${VAR:-default}` env interpolation → 컨테이너 process. 운영 환경은 cloud secret manager (Azure Key Vault for App Service, DigitalOcean App Platform 의 env binding) 를 통해 직접 주입 — 이 매핑 명세는 별 운영 ADR (§15 다음 sprint 의무) 의 책임.

(b) **`.env.example` only 정책**. repo 안의 `.env.example` 은 placeholder dummy 값만 (예: `Dev User`, `20260001`, `dev1@example.com` 같은) 보유. 실제 값은 `.env` (gitignored) 에 로컬에서만 채워진다. 본 sprint S7 슬라이스가 `.env.example` 의 placeholder 화를 commit 했다.

(c) **`.gitignore` 새 layout 패턴 (≥ 4)**. 다음 sprint 이동 시 추가될 패턴 (현재 패턴은 `.env`, `.env.local`, `backend/.env`, `backend/.env.local` 4개 — 새 layout 에서 동등 + 확장):
- `apps/*/.env`
- `apps/*/.env.local`
- `infra/.env`
- `infra/.env.local`
- `packages/*/dist/`
- `apps/*/dist/`

(d) **학생 fixture local-only 라벨링**. `STUDY_NOTE_DEV_USER_*` 와 `STUDY_NOTE_SECOND_USER_*` 환경변수는 docker-compose 의 env interpolation 에서만 inject 되고 repo 의 commit 값은 dummy 만. 사용자의 실제 학생 정보는 `.env` (gitignored) 에서만 살아남는다.

(e) **Committed fixture 가 synthetic 으로 정리됨 (property-based 검증)**. 본 sprint S7 슬라이스 commit 이후 tracked repo 전체 (본 ADR 포함) 에서 사용자 본인 PII 가 0건. 검증의 정규식과 grep 명령은 `plan.md` AC10 (e) 단락이 단일 SoT (canonical regex 가 plan 에만 산다 — 본 ADR 안에 인라이닝 시 자기-grep 가 자기 본문에 hit 하는 self-conflict 회피, Gate 3 review round 4 finding F1 인계). 통과 evidence: `review.md` round 5 self-CPO 표의 "실측 evidence (round 5, AC10 (e) property — 갱신)" 행 — 명령 실행 결과 no match (2026-05-09 21:45 KST). codex CPO round 5 가 본인 환경에서 동일 명령 재실행 후 PASS 판정.

## 12. Service exposure (R11, AC11)

| service | 노출 분류 | production 가용 |
|---|---|---|
| `apps/web` | external (정적 호스팅, public) | Yes — Azure Static Web Apps 또는 DigitalOcean App Platform 정적 호스팅. CDN-equivalent. 인증 없음 (가입 후 SPA 가 api 에 인증 요청). |
| `apps/api` | external (HTTPS, auth-gated) | Yes — Azure App Service 또는 DigitalOcean Droplet. session-auth 필수. CORS allowlist 로 `apps/web` 도메인만 허용. |
| `apps/mcp` | on-demand (stdio agent) — 현재는 internal-only (local agent 실행) | TBD-by-운영 ADR. 향후 mcp 가 server 모드로 expose 되면 internal-only (private network + agent 인증) 로 가능, public 노출은 별 결정. |
| `apps/cli` | on-demand (operator shell, batch) | TBD-by-운영 ADR. 운영 시 CI/CD 의 batch step 또는 admin shell 에서만 실행. external 노출 없음. |
| `infra/mysql` | internal-only (private network, port 3306) | **Local-dev only**. production 은 managed DB (Azure Database for MySQL / DigitalOcean Managed MySQL) — 별 운영 ADR 의 책임. |
| `infra/localstack` | internal-only (private network, port 4566) | **Local-dev only**. production 은 real S3 (AWS / Azure Blob with S3 compat / DigitalOcean Spaces) — 별 운영 ADR 의 책임. |

총 6 행 (AC11 정확 매칭). mysql 과 localstack 의 "Local-dev only" 라벨링 명시.

## 13. Security regression mapping (R12, AC12)

다음 sprint 의 마이그레이션 AC 가 검증해야 할 보안 regression set. 본 sprint 는 매핑 명세까지, 실제 검증은 다음 sprint smoke.
본 sprint-3 commit (TBD) 에서 이전 보류 의무를 종료하고 §13 보안 regression 6행을 활성화한다.

| regression case | 영향 surface | 다음 sprint AC ID (잠정) | 검증 방법 |
|---|---|---|---|
| auth boundary (unauthenticated request 가 401 받는지) | `apps/api` | next-AC-sec-1 | must-pass — `smoke-backend-contract` 의 "unauthenticated materials are rejected" + "unauthenticated /me is rejected" assertions (이미 존재, path 갱신 후 재실행) |
| cross-user material access (user2 가 user1 의 material 에 접근 시 401/404) | `apps/api` | next-AC-sec-2 | must-pass — `smoke-backend-contract` 의 cross-user 테스트 (S7 round 4 fix 로 SECOND_USER_NAME/STUDENT_NUMBER env-driven 정렬됨) |
| raw bearer token persistence (DB 에 raw token 이 저장 안 되는지) | `apps/api` + `packages/persistence` | next-AC-sec-3 | must-pass — `smoke-backend-contract` 의 `assertRawTokenIsNotPersisted` (이미 존재) |
| upload validation (oversized / non-PDF MIME / 잘못된 magic bytes 거부) | `apps/api` | next-AC-sec-4 | must-pass — `smoke-backend-contract` upload negative case (`PDF_UPLOAD_MAX_BYTES` 초과, content-type mismatch, `%PDF-` 첫 5 bytes 검증, fileSize 하한, fail-closed 보장) |
| S3 config 실패 (S3_ENDPOINT 잘못 / 권한 없음 시 graceful fail) | `apps/api` + `packages/storage` | next-AC-sec-5 | must-pass — `smoke-s3-storage` / `smoke-real-s3-storage` (이미 존재, path 갱신 후 재실행) |
| CLI path traversal / 외부 파일 접근 | `apps/cli` | next-AC-sec-6 | must-pass — `smoke-cli-path` 및 `smoke-pdf-workspace`의 cli ingest-pdf path validation (`safeBasename` 검증, 이미 존재) + cli args 의 절대 경로 거부 negative case 추가 |

총 6 행 (AC12 minimum 6 정확 매칭). 6 keyword (auth boundary, cross-user, raw-token, upload validation, S3 config, CLI path) 모두 첫 컬럼에 등장.

## 14. PR 분할 전략 (위험 R3 mitigation)

다음 sprint 의 이동 sprint 가 단일 PR 로 가면 patch 량이 크고 review 부담; 여러 PR 로 자르면 working tree 가 일시 깨질 수 있다. 4 단계 분할 권장 (각 PR 끝에 빌드/smoke 통과 의무).

1. **Workspaces 도입 PR**. `pnpm-workspace.yaml`, root `tsconfig.base.json`, `.eslintrc.json`, `.prettierrc`, `.editorconfig`, `.nvmrc`, `.npmrc`, root `devDependencies` 갱신. 코드 이동 없음. PR 끝 검증 = `pnpm install` + `pnpm -r build` (현재 단일 모듈만 build 하지만 통과해야 함).
2. **Domain 통합 PR**. `packages/domain/` 신설 + frontend `src/domain/*` ∪ backend `backend/src/domain/*` 통합 + 중복 4종 invariant merge + import path 갱신. PR 끝 검증 = `pnpm -r build` + 기존 smoke 모두 통과.
3. **Surface 분리 PR**. `apps/{api,mcp,cli,web}` 으로 코드 이동 + 각 app `package.json` + tsconfig + Dockerfile 신설 + `scripts/*.mjs` 의 apps/*/dist path 일괄 patch + html 이동. PR 끝 검증 = `pnpm -r build` + 모든 smoke 명령 (`smoke:backend`, `smoke:s3-storage`, `smoke:pdf-workspace`, `smoke:persona-turn` 등) 통과.
4. **Infra 분리 PR**. `infra/docker-compose.yml` + `infra/localstack/*` 이동 + `apps/*/Dockerfile` 작성 + root `Dockerfile` 삭제 + `docker-compose.yml` 의 build context 갱신. PR 끝 검증 = `docker compose build` + `docker compose up` healthcheck 통과.

PR 사이 working tree 가 깨지지 않도록 각 PR 끝에 빌드/smoke 통과 의무. 한 PR 에 다 묶거나 더 잘게 자르는 결정은 다음 sprint plan 의 일.

## 15. 다음 sprint 의무

본 sprint (설계) 는 다음 sprint (이동) 에 다음 의무를 넘긴다.

1. **운영 형상 ADR 작성** (별 ADR, ADR 0001 운영 형상 절 supersede). Q5 lock — Azure + DigitalOcean 분리 배포의 구체 service 매핑, secret manager 채널, prod-grade DB / S3 / CDN 결정. 본 ADR 0007 의 §11 (a), §12 의 production 가용 컬럼이 그 ADR 의 입력. 작성 시점 = 실제 배포 임박 시.
2. **pnpm hoisting × native 모듈 호환성 smoke 1회**. 다음 sprint 의 첫 슬라이스 (위 §14 PR 1 또는 PR 2 시작 시점) 에서 `pnpm install` 후 `onnxruntime-node` / `@xenova/transformers` / `pdf-parse` 모듈이 정상 로드되는지 corpus/persona/pdf smoke 1회. 깨지면 `.npmrc` 의 `public-hoist-pattern` 또는 `shamefully-hoist=true` 같은 옵션으로 hoist 정책 조정. 위험 R2 mitigation.
3. **Layer packages 추출 우선순위 적용**. §9 표대로: 1차 = `packages/domain` (다음 sprint 첫 PR), 2차 = `persistence` / `storage` / `persona-engine` / `corpus` (다음 sprint 또는 그 다음), 3차 = `auth` (이후 sprint).
4. **Prisma schema 위치 lock 시점에 §8 결정 적용**. defer-to-next-sprint default 채택 — `packages/persistence` 추출 슬라이스에서 schema/migrations/seed 를 `apps/api/prisma/` (잠정) → `packages/persistence/prisma/` 로 일괄 이동. client export shape 도 그 시점에 결정.
5. **영향 path 표 (§7) 의 모든 path patch + smoke 통과**. 39 행의 path 변경이 다음 sprint 의 measurable deliverable.
6. **Security regression mapping (§13) 의 6 행을 다음 sprint AC 로 등재**. next-AC-sec-1 ~ next-AC-sec-6 의 ID 를 다음 sprint plan 이 lock.
7. **운영 ADR 작성 시점에 stack 후보의 장단점 표 + 사용자 환경 (학생 Student Pack + Azure + DigitalOcean) 권장 default 제시 의무** (사용자 라운드 7 컨펌). 비교 대상 = deploy host (Azure App Service vs DigitalOcean Droplet vs DigitalOcean App Platform), observability stack (Datadog vs Azure Monitor vs Sentry vs OpenTelemetry self-host), secret manager (Azure Key Vault vs DigitalOcean App Platform env binding), DB managed service (Azure Database for MySQL vs DigitalOcean Managed MySQL), CDN/static (Azure Static Web Apps vs DigitalOcean Spaces). 비용 ceiling + 학생 Pack 크레딧 + 본인 학습 가치 측면을 모두 가중치로.

## 16. Self-CPO mini-check (Gate 4 review 전 의무)

| AC | 산출 위치 | 검증 / 통과 evidence |
|---|---|---|
| AC1 (R1 모듈 도면) | §3 표 | 행 11 ≥ 10. 컬럼 6 모두 채움 (책임 / 진입점 / 외부 의존 / 현재 위치 / 차세대 위치). |
| AC2 (R2 공통 설정) | §4 표 | 행 8 정확 매칭. Spring 등가 컬럼 모두 채움. |
| AC3 (R3 SoT migration) | §5 표 | 행 15 ≥ 12. 중복 4종 (`PdfStickyNote`, `PdfStickyNoteBlock`, `PdfInkPoint`, `PdfInkStroke`) 의 invariant 차이 컬럼 비-empty. |
| AC4 (R4 컨테이너 분산) | §6 표 + redis 미도입 노트 | 행 6 정확. redis 미도입 명시 1줄. |
| AC5 (R5 영향 path) | §7 표 | 행 39 ≥ 30. `scripts/*.mjs` 10개 모두 등장. |
| AC6 (R6 Prisma 위치 결정) | §8 단락 | "선택: A (defer-to-next-sprint)" 명시 + trigger rule 명시. |
| AC7 (R7 layer packages 우선순위) | §9 표 | 행 5 정확. 우선순위 컬럼 (1차/2차/3차) 모두 채움. |
| AC8 (R8 ADR 자체) | frontmatter + 본 ADR 전체 | frontmatter 6 키 (phase / decision_id / sprint_id / status / gate / related_*) + 본문에 ADR 0001 supersede 분리 (§1 + §2 D8 + §15 #1) + 운영 형상 = Azure + DigitalOcean 가정 (§1 + §11 (a) + §12) + 후속 운영 ADR 의무 (§15 #1) + brainstorm §7 위험 R1~R5 단락 (§5 R1, §15 #2 R2, §14 R3, §1 + §15 #1 R4, §9 R5) 등장. |
| AC9 (R9 threat model) | §10 표 | 행 6 정확. mitigation 컬럼 비-empty. |
| AC10 (R10 secret/PII) | §11 단락 | (a) production secret 주입 + (b) `.env.example` only + (c) `.gitignore` 패턴 ≥ 4 (실제 ≥ 6) + (d) fixture local-only + (e) synthetic 입증 모두 명시. (e) 의 grep 정규식은 `plan.md` AC10 (e) 참조 (자기-grep 회피). round 5 self-CPO 의 실측 evidence 인용. |
| AC11 (R11 service exposure) | §12 표 | 행 6. 노출 분류 + production 가용 컬럼 모두 채움. mysql/localstack 의 "Local-dev only" 명시. |
| AC12 (R12 security regression) | §13 표 | 행 6. 6 keyword 모두 첫 컬럼에 등장. |
| Gate 4 round 1 finding 인계 (ops lens) | §6 현재-vs-다음-sprint 노트 (F2) + §18 ops appendix 6 subsection (F1) + §15 #7 운영 ADR 의무 (F2 의 deferred 항목) | F1 (rollback / recovery / observability / blast radius / deploy / env matrix minimum 가정) → §18.1~§18.6. F2 (compose/storage-provider 불일치) → §6 노트 분리. F3 (report.md placeholder) → `docs/solon/root-module-frontend/20260509/report.md` 작성. |

self-CPO = PASS. cross review (`sfs review --gate 4 --executor codex`) 진행 가능.

## 17. References

- `brainstorm.md` Q1~Q8 lock (.sfs-local/sprints/2026-W19-sprint-1/brainstorm.md)
- `plan.md` R1~R12 / AC1~AC12 / S1~S8 / 위험 R1~R8 (.sfs-local/sprints/2026-W19-sprint-1/plan.md)
- `review.md` round 1~5 호출 기록 (.sfs-local/sprints/2026-W19-sprint-1/review.md, raw result.md = `.sfs-local/tmp/review-runs/2026-W19-sprint-1-gate3-*.result.md`)
- ADR 0001 — Stack lock-in (NestJS + Vite + MySQL + S3 + .env). 본 ADR 은 stack 결정을 유지, 운영 형상 절 supersede 는 별 ADR 의 책임.
- ADR 0006 — Design division scope 확장. 본 ADR 과 직접 의존성 없음 (UX vs architecture).

## 18. Operational assumptions (minimum, ops appendix)

본 sprint 가 운영 형상 ADR 분리 (Q5 lock) 를 결정해 구체 stack / SLO / runbook / automation 명세는 별 운영 ADR (§15 #1) 의 책임이다. 그러나 Gate 4 ops lens 의 minimum acceptance 기준에 따라 본 ADR 도 6 측면의 minimum assumption 을 명시한다. 깊이 있는 결정 (구체 service 선택, 장단점 비교, 사용자 환경 기반 권장 default) 은 모두 별 운영 ADR 작성 시점으로 이관 (사용자 라운드 7 답 = "스택은 추후에 자세히 정하는걸로 그때 장단점 + 내 환경에 맞는 추천까지").

### 18.1 Deploy path

- 가정: GitHub Student Pack 기반 Azure + DigitalOcean 분리 배포. `apps/web` = 정적 호스팅 (Azure Static Web Apps 또는 DigitalOcean App Platform 정적 site, Spaces CDN 가능). `apps/api` = container/Node host (Azure App Service 또는 DigitalOcean Droplet/App Platform). `apps/mcp` 와 `apps/cli` = production 노출 없음 (§12 lock), 운영자 shell 또는 batch 컨테이너로만.
- deferred (별 운영 ADR §15 #1 + #7): 구체 service 매핑, image registry (Azure Container Registry / DigitalOcean Container Registry / GHCR), CI/CD 트리거, build pipeline.

### 18.2 Rollback

- 가정: 각 service rollback unit = docker image tag (last-known-good tag 재배포). DB schema migration 의 down-migration 은 Prisma 가 자동 down 을 만들어 주지 않으므로 manual SQL roll-back script (다음 sprint 의 `packages/persistence` 추출 슬라이스에서 기준 정함). 운영 환경의 forward-only migration 권장 (data 보전 + 재배포 우선).
- deferred: 자동화 (Azure deployment slot swap, DigitalOcean rollback API), blue-green / canary 정책, image tag 명명 규칙. 별 운영 ADR.

### 18.3 Recovery

- 가정: production DB backup = managed DB 의 자동 snapshot (Azure Database for MySQL 또는 DigitalOcean Managed MySQL — 별 운영 ADR 의 service 선택에 따라 RPO 결정). S3 backup = bucket versioning + lifecycle (별 운영 ADR). Local-dev 환경 = docker volume `mysql-data` 가 단일 source. 손실 시 `db:up-persistent` 재실행 + `prisma:seed` (PII 없는 dummy 만 들어옴).
- deferred: RPO/RTO target, DR 시나리오, cross-region replication. 별 운영 ADR.

### 18.4 Observability

- 가정: 각 service 가 standard structured (json) log 를 stdout 으로 출력. `apps/api` 는 `/api/health` endpoint 이미 존재 (`backend/src/health.controller.ts`). 운영 환경에서는 cloud-native log (Azure Monitor 또는 DigitalOcean Insights) 가 stdout 자동 수집 가정. metric/trace 는 minimum 수준만 — process up/down + http 5xx ratio + DB 응답 시간.
- deferred: observability stack 선택 (Datadog vs Azure Monitor vs Sentry vs OpenTelemetry self-host), SLO 정의, 대시보드, alert 정책. 별 운영 ADR (§15 #7 의 장단점 표 + 사용자 환경 권장 default 의무).

### 18.5 Blast radius

- 가정: 본 프로젝트는 single-tenant (1 운영자 + 동기 4명 내외). 사용자 격리 = `User.id` 기반 S3 path (`users/<userId>/<materialId>`) + cross-user access 거부 (§13 next-AC-sec-2). 한 user PDF 손상이 다른 user 영향 없음. service blast: `apps/api` 다운 = `apps/web` 인증 페이지 / `apps/mcp` / `apps/cli` 모두 영향 (DB 의존). `apps/mcp` 또는 `apps/cli` 다운 = `apps/api` / `apps/web` 영향 없음 (separate process). DB 다운 = `apps/api` / `apps/cli` / `apps/mcp` 모두 다운, `apps/web` 정적 자산만 가용.
- deferred: multi-tenant 전환 시점, rate-limit / quota 정책, abuse detection. 별 sprint backlog.

### 18.6 Env matrix (local / dev-docker / prod)

| 환경 | secret 채널 | STORAGE_PROVIDER | PII 위치 |
|---|---|---|---|
| 로컬 host (`npm run dev`/`dev:backend`) | `.env` (gitignored, `--env-file-if-exists=.env`) | `s3` (localstack endpoint) 또는 `local` | 사용자 .env 에만 |
| 로컬 docker (`docker compose up`) | `${VAR:-default}` env interpolation, root `.env` 가 source | `local` (default) 또는 `s3` (사용자 override) | 사용자 .env 에만, dummy commit 값 fallback |
| prod (Azure / DigitalOcean) | cloud secret manager (Azure Key Vault / App Platform env binding) 직접 주입 | `s3` (real S3 endpoint) | 실 사용자 가입 시점에 DB 에 저장, repo PII 없음 |

- deferred: secret rotation 정책, env value 변경 zero-downtime 절차. 별 운영 ADR.
