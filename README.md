# study-note

**한 줄 요약** — 강의 PDF 를 학기·과목 단위로 정리하고, PDF 위에 직접 필기하면서 학습할 수 있는 개인 study workspace.

**왜 만들었나** — 본업이 백엔드 개발자라 학교 수업 출석이 어려운데, 컴공 전공기초는 한 번 놓치면 토대가 무너짐. 그래서 **교수님 강의 PDF 를 흡수해서 사용자에게 적극적으로 질문을 던지고 핵심을 가리켜주는 AI 튜터 페르소나** 를 만드는 쪽으로 방향을 잡았다. 시험 대비는 자연스러운 부분집합 일 뿐, 본질이 아니다.

**누가 쓰나** — 본인 (운영자 mj). 향후 같은 학습 흐름이 필요한 다른 학생도 본인의 PDF·필기는 따로 관리.

**지금 어디까지 됐나** — 학기·과목 트리 + PDF 업로드/다운로드 + PDF 위 필기 (포스트잇·펜·별표·체크리스트·표·그래프) + 자동저장 + 다중 기기 동기화 + 관리자 대시보드 + 운영 지표 모니터링 까지 운영. AI 페르소나 = backlog (다음 phase).

> **비개발자도 알아볼 수 있게** — 줄임말 / 도메인 용어는 [docs/glossary.md](docs/glossary.md) 한 곳에 정리해뒀다. 화면 안 한국어 단어 (학기 / 과목 / 수업 / PDF / 필기) 가 그대로 코드 의 이름이라 면접관도 매칭 가능.

## 어떻게 구성되는지 (데이터 위계)

```
학기 (Term)
└─ 과목 (Subject)
   ├─ PDF 자료 (PdfMaterial)
   │  └─ 학생 별 필기 (AnnotationSnapshot)
   └─ 주차 노트 (WeekNote)
      └─ 자유 메모 (userNotes)
```

- 사용자가 **학기** 를 자유롭게 추가 (예: 1학년 1학기, 2학년 2학기...).
- 각 학기 아래 **과목** 을 자유 추가. 첫 학기 seed = 컴공 전공기초 4 과목 (디지털공학개론·정보통신개론·C언어·컴퓨터개론). 학기 추가 시 다른 과목이 같은 구조로 들어옴.
- 각 과목마다 **강의 PDF**, **주차별 노트**, **자유 메모**, 향후 **전용 AI 튜터 페르소나** 가 붙음.

도메인 단어 (Term / Subject / WeekNote 등) 의 자세한 의미 = [docs/glossary.md](docs/glossary.md).

## 핵심 원칙

- **페르소나의 가치 = LLM provider 독립** — Bedrock·Claude·Codex·Gemini 어느 LLM 뒷단이든 동일한 학습 가치 (PDF 출처 명시·사용자 수준 추정 후 질문·시험 핵심 우선순위 표시) 제공. 모델은 교체 가능한 means, 페르소나의 행동 기준이 본질.
- **모바일 우선** — 데스크톱보다 iPad·태블릿·모바일 환경 우선. 좁은 화면에서도 PDF 보기 + 페르소나 대화 + 메모가 끊기지 않게.
- **데이터 사용자 격리** — 학생 본인의 PDF·필기·메모는 본인만. 운영자 (MASTER/ADMIN) 가 업로드한 PDF 만 모든 학생에게 공유. 필기는 같은 PDF 위라도 학생마다 본인 row.

## 코드리뷰 · 시연 안내 (live)

운영 서버가 실제로 떠 있어서 로컬 셋업 없이 흐름을 확인할 수 있습니다. **모든 단어 정의 = [docs/glossary.md](docs/glossary.md) 참고**.

- 홈페이지 URL: <https://study-note.910701.xyz>
- 관리자 대시보드 (사용자 / 학기·과목 관리 + 운영 지표): <https://study-note.910701.xyz/admin.html>
- 리뷰어 시연 계정 (DB 에 미리 등록):
  - 이름: `리뷰어`
  - 학번: `20260000`
  - 권한 (role): `MASTER` (전체 관리자 — 다른 사람을 등급 변경 가능)
- 서버 = Azure Container Apps. 잠시 사용 안 했으면 첫 요청 시 5~35 초 콜드 스타트 가능. 5분 이내 다시 쓰면 50~150ms.

권장 시연 흐름:

1. `https://study-note.910701.xyz` 접속 → 이름 `리뷰어` + 학번 `20260000` 으로 로그인.
2. 좌측 메뉴에서 **학기 → 과목** 트리 확인. 학기/과목 추가·이동·삭제 시도 (관리자 권한이라 제한 없음).
3. 과목 카드에서 **PDF 작업공간** 진입 → PDF 업로드 → 펜·포스트잇·별표·체크리스트·표·그래프 도구로 직접 필기. 다른 디바이스 (또는 새 창) 에서 같은 계정 로그인 → 필기 자동 동기화 확인.
4. 주차 페이지의 자유 메모 입력 → 새 탭에서 같은 페이지 열면 저장된 메모 보임.
5. `/admin.html` 접속 → 사용자 목록 + 권한 변경 + 학기/과목 관리 확인. 운영 지표 탭은 Grafana CTA 만 활성화하고 Datadog 조회 버튼은 비활성화.

운영 대시보드 (로그인 불필요, 비개발자도 직접 접속 가능):

- **Grafana (자체 호스팅, 운영 모니터링 SoT)**: <https://study-note-grafana.bluesea-474361c6.koreacentral.azurecontainerapps.io/d/study-note-ops>

자세한 docs:

- 용어 정의 = [docs/glossary.md](docs/glossary.md) (비개발자 + 개발자 둘 다용)
- 운영 대시보드 안내 = [docs/monitoring/dashboards.md](docs/monitoring/dashboards.md)
- 현재 sprint 진행 = [docs/solon/handoff/ACTIVE.md](docs/solon/handoff/ACTIVE.md)
- React 전환 사전 분석 = `.sfs-local/sprints/react-migration-audit.md` (private)
- 운영 지표 backend 코드 = [PR #84](https://github.com/MJ-0701/study-note/pull/84) (Datadog 기반 내부 snapshot, 공개 시연 경로 아님)

리뷰어 계정은 데모용 권한입니다. 운영 master 계정과 분리되어 있으며 시연 후 권한 회수 / 계정 정리는 별도 운영 결정입니다.

## Core Experience

`study-note`가 만들고 싶은 학습 흐름:

1. 학기를 선택하고 그 안의 과목을 고른다.
2. 과목 강의 PDF를 업로드한다 (또는 이미 업로드된 corpus에서 시작한다).
3. 과목 전용 페르소나가 PDF를 RAG로 참조해 사용자에게 먼저 질문을 던진다 — "지난 수업 핵심 키워드 중 어느 것을 다시 보고 싶으세요?" 같은.
4. 사용자는 페르소나와 대화하며 개념을 익히고, 페르소나는 PDF의 출처를 매번 명시한다.
5. 사용자가 직접 PDF를 펼쳐 보고 싶을 때는 PDF workspace에서 본문을 보고 메모·필기·별표·하이라이트를 남긴다.
6. 시험 직전에는 같은 페르소나에게 시험 범위 위주의 빠른 점검을 요청한다.

north star = "회사일로 수업을 제대로 듣지 못하는 사용자가 최소 시간·최대 효율로 전공기초를 잡는다".

## Current Implementation (operational)

운영 시점 (`2026-W22-sprint-22` 기준):

- 학기/과목 hierarchy CRUD + 권한 위계 (master/admin/normal). admin SPA (`/admin.html`) 에서 사용자 등업·반려·review·운영 지표를 본다.
- 이름 + 학번 기반 sign-in/sign-up + httpOnly cookie session. `/api/v1/auth/me` 로 boot revalidation.
- 강의 PDF 업로드 → R2 (S3-compatible) 영속 → backend proxy → frontend PDF workspace 렌더링 (pdfjs-dist canvas + iOS/iPad polyfill).
- PDF 위 7종 widget — 포스트잇/펜 stroke/별표/하이라이트/체크리스트/표/그래프. annotation 은 `{payload, updatedAt}` canonical schema 로 R2 hybrid 저장 + CAS revision check + cross-device sync.
- 주차별 user note + 자유 노트 (`/api/v1/notes/...`) BE persistence + 디바운스 PUT + 401/403 attached-session race guard.
- Conversation/persona-turn HTTP endpoint (`/api/v1/conversations/:id/turns`, `/api/v1/persona-turns`) — 디공이 1 페르소나 web UI live. fixture default + real Claude CLI opt-in.
- corpus ingest CLI + MCP server (`get_chunks` tool, stdio).
- Grafana + Prometheus 운영 모니터링 — Prometheus 가 backend `/api/metrics` 를 15초마다 scrape 하고 Grafana 가 API 호출량, 5xx, p95 지연, route 별 처리량, CAS 충돌, Node.js heap/event-loop 상태를 표시한다.
- 호스팅 = Azure Static Web Apps (frontend, `study-note.910701.xyz`) + Azure Container Apps (backend, min-replicas=0 + UptimeRobot keep-alive). MySQL Flex (user/session/material/notes/annotation). 도메인 = Porkbun `910701.xyz`.
- FE bundling = Vite 7 multi-entry — `index.html` (main app) + `admin.html` + `persona-turn.html` + `onboarding-mcp.html`. main app 은 vanilla TS + morphdom rendering. React 19.2.6 의존은 admin/persona-turn entry 가 이미 사용 중이고, main app 의 React migration 은 다음 phase (sprint-W22-sprint-23+).
- main.ts 분해 phase (Layer A~D) 완료 — 11,049 → 4,448 line / -59.74%. 자세한 sprint 진행은 `docs/solon/handoff/ACTIVE.md`.

## Architecture

### System diagram

```mermaid
flowchart LR
    subgraph Client["Client (브라우저 · iPad · 모바일)"]
        FE["Vite SPA<br/>index.html · admin.html<br/>persona-turn.html · onboarding-mcp.html"]
    end

    subgraph Edge["Azure (운영)"]
        SWA["Static Web Apps<br/>study-note.910701.xyz"]
        ACA["Container Apps<br/>study-note-api · min-replicas=0"]
        PROM["Prometheus<br/>/api/metrics scrape"]
        GRAF["Grafana<br/>study-note Live Ops"]
        MySQL[("MySQL Flex<br/>user · session · material<br/>userNotes · annotation · term/subject")]
    end

    subgraph External["외부"]
        R2[("Cloudflare R2<br/>PDF 원본 + annotation snapshot")]
        Claude["Claude CLI<br/>(persona turn opt-in)"]
    end

    FE -- "hash router / fetch /api/v1/*" --> SWA
    SWA -- "rewrite /api/* → ACA" --> ACA
    ACA -- "Prisma" --> MySQL
    ACA -- "S3 SDK (R2 endpoint)" --> R2
    PROM -- "15s scrape /api/metrics" --> ACA
    GRAF -- "PromQL dashboard" --> PROM
    ACA -- "persona-turn subprocess<br/>(fixture default)" --> Claude
    FE -- "운영 링크" --> GRAF
```

### Repo layout (workspace)

| Path | 역할 | 핵심 모듈 |
|---|---|---|
| `apps/web` | Vite 7 SPA. main app + 3 entry. | `src/main.ts` (4,448 line, Layer A~D 분해 완료), `src/admin/admin.tsx`, `src/persona-turn/`, `src/onboarding-mcp/` |
| `apps/api` | NestJS 11 backend. 모든 HTTP endpoint. | `src/auth`, `src/subjects`, `src/terms`, `src/user-notes`, `src/pdf-annotations`, `src/materials`, `src/persona`, `src/admin`, `src/health.controller.ts` |
| `apps/cli` | CLI tool. corpus ingest + persona turn 직접 실행. | `ingest-pdf.ts`, `persona-turn.ts` |
| `apps/mcp` | MCP server. `get_chunks` tool over stdio. | `src/index.ts` |
| `packages/domain` | 순수 domain type + helper. side-effect 0. | `lecture-note.ts`, `pdf-workspace.ts` |
| `packages/auth` | NestJS guard + session decorator (shared). | `SessionAuthGuard`, `RoleGuard`, `@Roles` |
| `packages/persistence` | Prisma schema + migration + seed. | `prisma/schema.prisma`, `seed.mjs`, `seed-subjects.mjs` |
| `packages/storage` | StoragePort (R2/S3 SDK adapter). | `s3-storage.service.ts` |
| `packages/corpus` | PDF → chunk → embedding pipeline. | `extract.ts`, `embedding.ts`, `cosine.ts` |
| `packages/persona-engine` | persona turn orchestrator. fixture / real Claude CLI. | `persona-engine.ts`, `provider/claude-cli.ts` |

### Domain bounded context (DDD)

원문 = `llm-wiki/ddd/context-map.md`. 4 개 domain context + 1 application layer + 1 infra layer.

1. **Notebook (학습 노트)** — `StudyNotebook` aggregate root. 과목/주차/개념/키워드/시험분류. 원문 = `packages/domain/src/lecture-note.ts`.
2. **PdfWorkspace (PDF annotation)** — `SubjectPdfWorkspace` aggregate. 7 widget (sticky/pen/star/highlight/text/checklist/table/chart). 원문 = `packages/domain/src/pdf-workspace.ts`.
3. **PdfMaterial (PDF 원본)** — `PdfMaterialRecord` (BE) / `PdfMaterialDraft` (FE intake VO). 원문 = `apps/api/src/materials/`.
4. **AuthSession (인증)** — FE in-memory `AuthSession` + BE `/api/v1/auth/me`. 원문 = `apps/api/src/auth/`, `apps/web/src/auth/sessionState.ts` (sprint-W22-sprint-20 분해).

Application/infra (도메인 아님):

- **Sync flow** = autosave debounce + per-key promise chain + 401/403 attached-session race guard + 5xx pause/resume. 원문 = `apps/web/src/sync/annotation-sync.ts`, `apps/web/src/sync/user-notes-sync.ts`.
- **Storage adapter** = StoragePort (R2 S3-compatible). PDF 원본 + annotation snapshot 둘 다 R2. metadata 만 MySQL.

### Data flow 예시 (3 가지)

**1. Sign-in flow**

```
[FE form] → POST /api/v1/auth/sign-in (name, studentNumber)
         ← cookie session + JSON {userId, role, displayName}
[FE]   → setAuthSession + writeAuthSessionHint (readable cookie hint, no localStorage)
       → GET /api/v1/auth/me 호출 = boot revalidate (cold-start gate)
       → renderApp() → home 진입
```

**2. PDF annotation sync (디바운스 PUT + CAS)**

```
[FE pointerup] → updatePdfWorkspace(subjectId, mutate)
              → saveNotebook (localStorage) + scheduleAnnotationPut (750ms debounce)
              ↓ debounce 만료
[FE PUT]      → PUT /api/v1/pdf-annotations/:materialId  body {payload, clientRevision}
              ↓ BE
[ACA]         → atomic CAS on AnnotationSnapshot.savedAt
              → 200 {savedAt} | 409 stale {canonical body 동봉}
[FE]          → 409 = remote 가 더 신선 = rehydrate. 200 = revision 갱신.
```

**3. Persona turn (fixture default)**

```
[FE persona-turn.html] → POST /api/v1/persona-turns body {subject, query, k?, mode?}
[ACA]                  → cosine top-k retrieval on chunk.embedding BLOB
                       → resolveProviderMode (mode > REAL_OPT_IN > FIXTURE > fixture default)
                       → fixture → 미리 정의된 응답 JSON
                       → real  → child_process spawn(claude -p) ↦ Claude CLI subprocess
                                  ↦ Anthropic API 로 PDF chunk + system prompt 송신
                       ← {personaName, response, sources[], provider, modelName}
```

### 보안 · 권한 경계

- httpOnly cookie session + `SessionAuthGuard` → `request.user` 주입.
- role 위계 = `master > admin > normal`. `RoleGuard` + `@Roles(...)` decorator. self-modify 금지 + admin→MASTER 승급 금지.
- 운영 대시보드는 Grafana anonymous viewer (read-only) 로만 공개. Datadog API key 는 legacy/internal snapshot 용 ACA secret 이며 브라우저로 내려가지 않는다.
- R2 object 직접 노출 X — BE proxy (`/api/materials/:materialId/download`) 가 ownership 확인 후 stream.
- MCP server 응답 의 `sourcePdfPath` 는 basename 만 (절대 경로 차단).

### 분해 phase 상태 (Layer A~D 완료)

main.ts 11,049 → 4,448 line (-59.74%).

| Layer | sprint | 추출 모듈 |
|---|---|---|
| A. routing/shell | W21-2 | `app/routes.ts`, `app/appShell.ts`, `app/escape-html.ts` |
| B. PDF workspace (14 slice) | W22-1~8 | `pdf-workspace/annotation-sync.ts`, `canvas-mount.ts`, `workspace-store.ts`, `class-date.ts`, `ink-stroke.ts`, `drill-highlight.ts`, `star-mark.ts`, `chart-content.ts`, `markdown-table.ts`, `chart-widget.ts`, `table-widget.ts`, `simple-widget.ts`, `page-render.ts`, `renderPdfWorkspacePage.ts` |
| C. subject views (10 slice) | W22-9~18 | `subject-views/{cards,sidebar,intake,class,summaries,memorize,mcp,week}`, `pdf-library`, `quick-note` |
| D. storage + identity + sync (4 slice) | W22-19~22 | `notebook-storage.ts`, `auth/sessionState.ts`, `sidebar/sidebar-cache.ts`, `ui/ephemeral-state.ts`, `sync/user-notes-sync.ts` |

다음 phase = **React migration** (sprint-W22-sprint-23+). audit = `.sfs-local/sprints/react-migration-audit.md`.

## API Endpoints (current main)

backend NestJS global prefix = `app.setGlobalPrefix("api")`. health 와 legacy materials 제외하면 전부 `/api/v1/...` 안에 산다. 자세한 wire 규격은 `llm-wiki/modules/apps-api.md`.

| Method | Path | 모듈 | 비고 |
|---|---|---|---|
| POST | `/api/v1/auth/sign-in` `/sign-up` `/sign-out` | auth | name + studentNumber. cookie session. |
| GET | `/api/v1/auth/me` | auth | session revalidate. cookie hint 없으면 backend cold-start 회피. |
| GET | `/api/v1/terms` | terms | 사용자가 등록한 학기 목록. |
| POST | `/api/v1/terms` | terms | 새 학기 추가. `grade × semester × title` unique. |
| PUT/DELETE | `/api/v1/terms/:id` | terms | 학기 수정/삭제. delete = child subject 0 일 때만. |
| GET | `/api/v1/terms/:id/child-count` | terms | UI delete 가드. |
| GET | `/api/v1/subjects` | subjects | 학기 전체에서 평탄화. |
| POST | `/api/v1/terms/:termId/subjects` | subjects | 학기 안에 과목 추가. |
| PUT/DELETE | `/api/v1/subjects/:id` | subjects | 과목 수정/삭제. |
| PUT | `/api/v1/subjects/:id/move` | subjects | 학기 이동. |
| GET | `/api/v1/subjects/:id/child-count` | subjects | UI delete 가드. |
| GET | `/api/v1/notes` | user-notes | 사용자 자유 노트. |
| GET/PUT | `/api/v1/notes/subject/:subjectId/week/:weekId` | user-notes | 주차 노트. 디바운스 PUT + CAS revision. |
| GET | `/api/v1/pdf-annotations/by-subject/:subjectId` | pdf-annotations | batch hydrate. cap 50 material / 1MB. |
| GET/PUT | `/api/v1/pdf-annotations/:materialId` | pdf-annotations | single PDF annotation read/write. CAS on `savedAt`. |
| POST | `/api/v1/conversations/:id/turns` | persona | conversation turn 추가. |
| POST | `/api/v1/persona-turns` | persona | one-shot persona turn (디공이 1 페르소나). fixture/real mode. |
| GET | `/api/v1/admin/users` | admin | master/admin guard. 사용자 목록. |
| PUT | `/api/v1/admin/users/:id/role` `/dev-user-flag` `/review` | admin | role 변경 (master/admin 위계 검증), 반려/재활성 toggle (master only), review 완료 표시. |
| GET | `/api/v1/admin/ops-dashboard` | admin | **PR #84** — legacy/internal Datadog snapshot. 공개 운영 안내 SoT 는 Grafana. DD_API_KEY/DD_APP_KEY 없으면 `not_configured`. |
| GET/PUT/POST/PATCH | `/api/materials/...` | materials | legacy prefix (sprint-W21-sprint-2 이후 일부 410 Gone). PDF upload-intent/complete/file/download/export-bundle. annotation read/write 는 `/api/v1/pdf-annotations/...` 가 SoT. |
| GET | `/api/health` | health | LB / keep-alive ping. |

## Tech Stack

**Runtime**:

- Frontend: Vite 7 + TypeScript + (R)eact 19.2.6 (admin/persona-turn entry). main app 은 vanilla TS + morphdom — React migration 다음 phase.
- Backend: NestJS 11 + Express + Prisma 6.
- Database: MySQL (운영 = Azure MySQL Flex). schema = `packages/persistence/prisma/schema.prisma`.
- Storage: Cloudflare R2 (S3-compatible). 코드의 `STORAGE_PROVIDER=s3` + `S3_ENDPOINT=https://...r2.cloudflarestorage.com` 가 R2 endpoint. AWS S3 사용 X.
- AI: Claude CLI provider (real opt-in) + fixture default. 4 과목 4 페르소나 점진 도입 = backlog.
- corpus: `@xenova/transformers` 로컬 embedding (`Xenova/multilingual-e5-base` 768d) + Prisma `chunk.embedding` Bytes BLOB stub. 실 vector store = 후속.

**Hosting**:

- Frontend = Azure Static Web Apps. 운영 URL = `https://study-note.910701.xyz`. Vercel 미사용.
- Backend = Azure Container Apps `study-note-api`. min-replicas=0 → UptimeRobot 1분 ping + workflow keep-alive 로 cold-start 완화.
- Domain = Porkbun `910701.xyz` (운영 = `study-note.910701.xyz`).
- Observability = Grafana + Prometheus self-host. Prometheus 가 `study-note-api` 의 `/api/metrics` 를 scrape 하고 Grafana 가 운영 대시보드를 제공한다. Datadog 은 개발자용 내부 보조/히스토리로만 유지하며 공개 시연 안내에서 제외한다.

**Workflow**:

- Sprint = Solon Product SFS (`.sfs-local/sprints/`). Gate 2 brainstorm → Gate 3 plan → Gate 6 review.
- 분해 phase 4 layer (A routing/shell, B PDF workspace, C subject views, D storage/identity/sync) 완료. 다음 phase = React migration (sprint-23+).

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm --filter @study-note/api prisma:generate
pnpm --filter @study-note/api prisma:migrate:deploy
pnpm --filter @study-note/api prisma:seed
```

Backend:

```bash
pnpm --filter @study-note/api prisma:migrate:deploy
pnpm --filter @study-note/api prisma:seed
pnpm --filter @study-note/api build
node --env-file-if-exists=.env apps/api/dist/main.js
```

Frontend:

```bash
pnpm --filter @study-note/web dev
```

기본 개발 계정은 `.env.example`에 정의되어 있습니다 (placeholder). 실제 사용 시 `.env` (git ignored) 에 본인의 이름·학번·이메일을 채워 주입하세요.

```text
이름: Dev User
학번: 20260001
```

### Corpus ingest CLI (sprint-2)

Sprint `2026-W19-sprint-2` 에서 PDF → corpus ingest 최소 경로를 도입했습니다. 4과목 중 **디지털공학개론** 1과목 PDF 1개를 텍스트 추출 → 청크 (512 token / 50 overlap) → embedding (`Xenova/multilingual-e5-base`, 768 dim, 로컬 inference) → Prisma 영속까지 흘려보냅니다. 경계는 다음과 같습니다:

- Embedding 은 로컬 (`@xenova/transformers`) 만 사용합니다 — Bedrock 호출 없음. ONNX runtime 은 `onnxruntime-node` (optionalDependency, 1.14.0) 로 실행됩니다 — `npm install` 시 자동 설치되지만 일부 환경에서 prebuild 가 빠질 수 있어 `npm i onnxruntime-node@1.14.0` 로 재시도 가능합니다. 모델 cache 는 `local-materials/.xenova-cache/` 에 자동 생성되며, 최초 1회 약 500MB 다운로드가 발생합니다 (이후 재사용). 해당 경로는 `.gitignore` 의 `local-materials/` 로 covered.
- Vector 영속은 `chunk.embedding` Bytes BLOB 에 Float32 buffer 로 저장하는 **stub** 입니다 — 본 sprint 는 검색 가능한 ANN index 를 만들지 않습니다. 실제 vector store 통합은 후속 sprint 작업입니다 (ADR 0004 follow-up 참조).
- HTTP endpoint 는 노출하지 않습니다 — **CLI 만** 제공합니다.
- 사용자가 본 CLI 로 ingest 하는 PDF 는 1과목 (디지털공학개론) 1개만 검증합니다. 나머지 과목 (정보통신개론·C언어·컴퓨터개론) 은 후속 sprint 후보입니다.

```bash
pnpm --filter @study-note/cli build && node --env-file-if-exists=.env apps/cli/dist/ingest-pdf.js --path <path-to-pdf> --subject digital-engineering
pnpm --filter @study-note/api build && node scripts/smoke-corpus-ingest.mjs
```

`ingest:pdf` 는 `apps/cli/dist` 빌드 후 `node apps/cli/dist/ingest-pdf.js` 를 실행합니다. 같은 PDF 를 두 번 ingest 하면 SHA256 content_hash dedupe 가 동작하여 두 번째 호출은 no-op + `alreadyIngested: true` 로 종료됩니다 (idempotency 정책 = 중복 무시).

### Persona turn CLI (sprint-3)

Sprint `2026-W19-sprint-3` 에서 디지털공학개론 페르소나 1명 (`디공이`, 친근한 멘토 톤) 의 첫 응답 turn 을 제공합니다. sprint-2 corpus 위에 in-memory cosine top-k retrieval + Claude CLI stub provider 를 결합. 경계는 다음과 같습니다:

- 페르소나는 1과목 (디지털공학개론) 1명만 지원합니다 — 다른 subject 호출 시 exit 1. 4과목 4 페르소나 점진 도입은 후속 sprint 후보 (ADR 0004 (f)).
- Retrieval 은 `chunk.embedding` Bytes BLOB 메모리 로드 → cosine top-k. 실 vector store 마이그레이션은 D1 (월 AI 비용 안) 결정 후 후속 sprint 후보.
- LLM provider 는 **Claude CLI** stub (`claude -p --dangerously-skip-permissions`). Bedrock 호출 0건 (D1 결정 전). Routing 은 fixture-default + opt-in:
  - `STUDY_NOTE_LLM_FIXTURE=1` → fixture mode (deterministic, Anthropic API 송신 0).
  - `STUDY_NOTE_LLM_REAL_OPT_IN=1` (fixture 미세팅 시) → real Claude CLI subprocess.
  - 둘 다 unset → fixture default (= 사용자 명시 opt-in 없으면 cloud 송신 안 됨).
- Real mode 호출 시 system prompt + retrieved PDF chunks 가 Claude CLI 를 통해 **Anthropic API** 로 송신됩니다 (CLI 시작 시 stderr banner 1줄 안내). 사용자 본인 PDF 의 저작권 (교수님 자료) + fair use 가정에서 1인 실행만 허용 — 외부 공유 금지 (ADR 0004 (h.1)).
- HTTP endpoint 노출 = sprint-5 의 `POST /api/v1/persona-turns` 가 같은 turn 흐름을 backend 로 wrap.

```bash
# fixture mode (default — Anthropic 호출 0)
pnpm --filter @study-note/cli build
STUDY_NOTE_LLM_FIXTURE=1 node --env-file-if-exists=.env apps/cli/dist/persona-turn.js \
  --subject digital-engineering --query "반가산기 설명해줘" --k 3

# real Claude CLI mode (사용자 opt-in, 본인 환경에 claude CLI 가 PATH 에 있어야 함)
STUDY_NOTE_LLM_REAL_OPT_IN=1 node --env-file-if-exists=.env apps/cli/dist/persona-turn.js \
  --subject digital-engineering --query "반가산기 설명해줘"

pnpm --filter @study-note/api build && node scripts/smoke-persona-turn.mjs
pnpm --filter @study-note/api build && node scripts/run-backend-tests.mjs

# sprint-4 — 실 PDF + real Claude CLI evidence harness 와 persistent dev DB
pnpm run evidence:real-fixture
pnpm run evidence:real-pdf
pnpm run db:up-persistent
pnpm run db:down-persistent -- "<COMPOSE_PROJECT>"
```

CLI stdout 은 인간 가독 응답 + 마지막 줄 JSON (`personaName, subject, response, sources, provider, modelName, retrievalCount, isFallback`) 으로 구성. NestJS Logger 는 `createApplicationContext({logger:false})` 로 비활성화되어 stdout 오염 0건.

### Persona turn web UI (sprint-5)

Sprint `2026-W19-sprint-5` 에서 디공이 turn 을 React + Vite 프론트엔드 + NestJS HTTP endpoint 로 노출. CLI lane 은 그대로 보존, web 화면 lane 이 추가됩니다.

- HTTP endpoint: `POST /api/v1/persona-turns` body `{subject, query, k?, mode?}` → CLI 와 동일한 sprint-3 stdout schema JSON 반환. `mode = "fixture" | "real"` 가 body 로 전달되면 backend `resolveProviderMode` 의 priority lock (`mode` > `STUDY_NOTE_LLM_REAL_OPT_IN` > `STUDY_NOTE_LLM_FIXTURE` > fixture default) 발동.
- Frontend entry: vite multi-entry — `index.html` (lecture-reader main) + `persona-turn.html` (React entry) + `admin.html` (admin SPA) + `onboarding-mcp.html`.
- 3 터미널 dev 흐름 (`db:up-persistent` 가 `.env` 자동 갱신 → 이후 명령은 export 0):
  ```bash
  # 터미널 1 — DB 기동 (.env 자동 write: DATABASE_URL / COMPOSE_PROJECT / SESSION_TOKEN_PEPPER / PORT / HOST / STUDY_NOTE_LLM_TIMEOUT_MS)
  pnpm run db:up-persistent

  # 터미널 1 — (1회) PDF ingest, .env 자동 load
  pnpm --filter @study-note/cli build && node --env-file-if-exists=.env apps/cli/dist/ingest-pdf.js --path "asset/digital_logical_engine/제07장 조합논리회로_2ndE_GT.pdf" --subject digital-engineering

  # 터미널 2 — backend (NestJS, port 3010), .env 자동 load
  pnpm --filter @study-note/api prisma:migrate:deploy && pnpm --filter @study-note/api prisma:seed && pnpm --filter @study-note/api build && node --env-file-if-exists=.env apps/api/dist/main.js

  # 터미널 3 — frontend (vite, port 5173)
  pnpm --filter @study-note/web dev
  # 브라우저: http://127.0.0.1:5173/persona-turn.html
  ```
- 화면: turn form (subject + query + k) → response panel (markdown + 응답 복사 버튼) + sources panel (chunk[N] · pdfBasename · score) + mode toggle (fixture/real) + consent banner (real 켤 때만, 1초 delay).
- 회귀: `pnpm --filter @study-note/api build && node scripts/run-backend-tests.mjs` 가 CLI 패턴 (sprint-3/4) 을 그대로 회귀 PASS, HTTP endpoint 패턴 (sprint-5 신규) 6 case 추가.

### MCP server: get_chunks tool (sprint-2 post-adopt)

Sprint `2026-W19-sprint-2` 에서 Anthropic MCP server 의 first slice 가 추가됩니다. Claude Desktop / Cursor 같은 MCP client 가 본 backend 의 corpus retrieval 을 *tool* 로 호출 가능 — 사용자 본인 Claude Pro 구독으로 LLM 호출, mj backend 는 corpus + retrieval 만 hosting (사용자 명시 architecture 의도).

- **Tool**: `get_chunks(subject, query, k?)` — 강의자료 corpus 의 top-K chunks 반환.
- **Transport**: stdio (Claude Desktop default).
- **Process**: backend repo 안 entry — `pnpm --filter @study-note/mcp build && node --env-file-if-exists=.env apps/mcp/dist/index.js`.
- **Wire shape (CallToolResult)**: `{ content: [{ type: "text", text: JSON.stringify({chunks:[...], retrievedCount}) }] }`. chunk 의 `sourcePdfPath` 는 basename 만 (절대 경로 노출 0).
- **Error**: invalid input → `InvalidParams (-32602)` + `errorCode: "INVALID_INPUT"`. retrieval throw → `InternalError (-32603)` + `errorCode: "RETRIEVAL_FAILED"`.

#### Claude Desktop config (예시 — `~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "study-note": {
      "command": "npm",
      "args": ["run", "mcp:server", "--silent", "--prefix", "/ABSOLUTE/PATH/TO/study-note"],
      "env": {
        "DATABASE_URL": "mysql://study_note:study_note@127.0.0.1:<port>/study_note"
      }
    }
  }
}
```

등록 후 Claude Desktop 재시작 → 디공이 turn (또는 다른 chat) 에서 `@study-note` 도구 호출 → tool call paste evidence (sprint-2 AC7).

#### Security note (sprint-2 Gate 6 round 1 F3 carry — local stdio MCP trust boundary)

이 first slice 는 *로컬 stdio* 만 (network listener 0). 그러나 Claude Desktop 의 MCP config 에 등록된 *모든 MCP client* 가 `get_chunks` 호출 가능 — corpus chunk 텍스트는 사용자 PDF 본문이라 *untrusted content* (prompt injection 가능). 즉:

- DB 자격증명 (`DATABASE_URL`) 은 위 config 의 `env` 안에만, repo 에는 commit 0.
- 반환되는 `sourcePdfPath` 는 항상 basename 만 (절대 경로 노출 0, scheme strip).
- 반환되는 `text` 는 *user-untrusted* — LLM client (Claude Desktop) 가 system prompt level 명령으로 신뢰하지 않도록 주의.
- 내부 retrieval 오류 메시지는 MCP wire 에 redact ("retrieval failure" generic only), detail 은 `mcp-server` 프로세스 stderr 에만.
- HTTP/SSE transport (sprint-3+) 도입 시 별도 인증 + rate limit 정책 필요.

## Verification

```bash
pnpm -r build
pnpm --filter @study-note/api build && node scripts/smoke-backend-contract.mjs
pnpm --filter @study-note/api build && node scripts/smoke-pdf-workspace.mjs
pnpm --filter @study-note/api build && node scripts/smoke-s3-storage.mjs
pnpm --filter @study-note/api build && node scripts/run-backend-tests.mjs
```

실제 R2 (S3-compatible) 검증은 bucket/credential이 준비된 뒤 opt-in으로 실행합니다.

```bash
RUN_REAL_S3_SMOKE=1 STORAGE_PROVIDER=s3 S3_BUCKET="..." S3_REGION="auto" S3_ENDPOINT="https://...r2.cloudflarestorage.com" pnpm --filter @study-note/api build && node scripts/smoke-real-s3-storage.mjs
```

## Planned Direction (next phase)

분해 phase (Layer A~D) 가 끝났으니 다음은 **React migration + AI 페르소나 확장** 입니다.

- **React migration sprint-23+** — main.ts 4,448 line 의 vanilla string-template + morphdom + document-level event 모델을 React 19.2.6 component model 로 점진 전환. 첫 route = `subject-mcp` (own action 0 / ambient 의존 1개). audit = `.sfs-local/sprints/react-migration-audit.md`.
- **운영 지표 dashboard** — Grafana screenshot/시연 runbook 정리 + 필요 시 Prometheus alert rule 후보 결정.
- **AI 튜터 페르소나 4명** — 과목별 전용. 공통 system prompt 골격 + 과목별 specialization layer.
- **Multi-provider AI stack** — Bedrock primary, 월 비용 상한 도달 시 또는 Bedrock 미채택 선택 시 로컬 AI agent (Claude CLI · Codex CLI · Gemini CLI 등) 로 자동 fallback. Provider 교체 시에도 페르소나 가치는 동일.
- **RAG over lecture PDFs** — 강의 PDF embedding 을 검색 가능한 ANN index (pgvector / OpenSearch 후보) 로 옮겨, 페르소나가 답변 시 PDF 출처 명시.
- **데이터 거버넌스** — 강의 PDF 저작권 (교수님 자료) 와 provider cloud 송신 경계, 사용자 노트 송신 여부, embedding 저장 위치 등이 ADR로 정착됩니다.

월 AI 비용 상한 ADR (proposed) 는 안 A ($10) / 안 B ($30) / 안 C ($0 — Bedrock 미사용, 로컬 agent only) 중 결정 sprint 가 별도로 잡힙니다.

이 방향성과 관련된 결정·근거는 모두 `docs/solon/decisions/` 의 ADR 에 기록됩니다.

## Project Notes

- 활성 sprint goal = `docs/solon/handoff/ACTIVE.md` (SessionStart hook 가 자동 inject).
- `local-materials/`는 로컬 강의자료 보관용이며 git에 올리지 않습니다.
- `.env`와 credential은 git에 올리지 않습니다.
- SFS sprint 산출물은 `.sfs-local/sprints/` (private workbench, `.gitignore` 처리). 공유 handoff = `docs/solon/<domain>/<subdomain>/<feature>/<yyyyMMdd>/`.
- Agent (Claude/Codex/Gemini) 문서 변경 규율은 `llm-wiki/references/standards.md` 의 "Agent 문서 변경 규율" 절 참조. README/ACTIVE.md 같은 공용 문서는 명시적 rewrite 요청 없으면 최소 diff.
