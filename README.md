# study-note

회사일로 수업을 제대로 듣지 못하는 컴공 1학년이, 4과목의 전공기초를 강의 PDF + 과목별 AI 튜터 페르소나로 최소 시간·최대 효율로 학습하기 위한 개인 study workspace입니다.

저는 본업이 백엔드 개발자라 학교 수업을 모두 출석할 수 없습니다. 그러나 컴공 전공기초는 한 학기에 한 번 듣고 넘기기엔 너무 중요한 토대입니다. 그래서 이 프로젝트는 단순한 lecture-note reader가 아니라, **교수님 강의 PDF를 흡수해서 사용자에게 적극적으로 질문을 던지고 핵심을 가리켜주는 AI 튜터 페르소나**를 만드는 쪽으로 방향을 잡습니다. 기말고사 대비는 이 흐름의 자연스러운 부분집합이지, 본질이 아닙니다.

## Product Direction

대상 4과목:

- 디지털공학개론
- 정보통신개론
- C언어
- 컴퓨터개론

각 과목마다 **전용 AI 튜터 페르소나 1명**이 있고, 각 페르소나는 자기 과목의 강의 PDF를 RAG corpus로 참조합니다. 사용자는 PDF를 직접 읽기보다, 페르소나와 대화하며 PDF의 어느 부분이 시험 핵심인지·자기 수준에서 무엇이 비어있는지 파악합니다.

**핵심 invariant — 페르소나의 가치는 LLM provider와 독립적으로 정의됩니다.** 즉, 페르소나가 사용자에게 제공하는 학습 가치 (PDF 출처 명시·사용자 수준 추정 후 질문·시험 핵심 우선순위 표시 등) 는 Bedrock·Claude·Codex·Gemini 어느 LLM이 뒷단에 있든 동일해야 합니다. 모델은 교체 가능한 means이고, 페르소나의 행동 기준이 본질입니다.

주요 사용 환경은 데스크톱보다 iPad·태블릿·모바일에 가깝습니다. 좁은 화면에서도 PDF 보기·페르소나와 대화·핵심 메모 남기기가 끊기지 않는 쪽을 우선합니다.

## Core Experience

`study-note`가 만들고 싶은 학습 흐름:

1. 과목을 선택한다.
2. 해당 과목 강의 PDF를 업로드한다 (또는 이미 업로드된 corpus에서 시작한다).
3. 과목 전용 페르소나가 PDF를 RAG로 참조해 사용자에게 먼저 질문을 던진다 — "지난 수업 핵심 키워드 중 어느 것을 다시 보고 싶으세요?" 같은.
4. 사용자는 페르소나와 대화하며 개념을 익히고, 페르소나는 PDF의 출처를 매번 명시한다.
5. 사용자가 직접 PDF를 펼쳐 보고 싶을 때는 PDF workspace에서 본문을 보고 메모·필기를 남긴다.
6. 시험 직전에는 같은 페르소나에게 시험 범위 위주의 빠른 점검을 요청한다.

이 흐름의 north star는 "회사일로 수업을 제대로 듣지 못하는 사용자가 최소 시간·최대 효율로 전공기초를 잡는다" 입니다.

## Current Implementation (legacy)

본 프로젝트는 현재 sprint `2026-W19-sprint-1` 에서 product identity를 위와 같이 새로 잡았고, **다음 sprint부터 전체 리팩토링 (rewrite 수준)** 이 시작됩니다. 따라서 현재 working tree에 남아있는 다음 구현물은 legacy로 분류되며, 보존/재구축/폐기 표 (sprint plan §8 참조) 에 따라 처리됩니다.

현재 legacy 구현 범위:

- Vite 기반 lecture note reader (과목별 홈, 과목 총정리, 날짜별 노트)
- Claude가 생성한 `study-note.week-note.v1` JSON의 과목별 local import
- 이름 + 학번 기반 로그인, `/api/me` session revalidation
- NestJS backend, Prisma/MySQL persistence
- PDF material metadata 저장
- local/mock 또는 S3-compatible storage provider (운영 환경은 Cloudflare R2)
- backend proxy PDF upload/download
- frontend PDF workspace backend 연동
- PDF 위 포스트잇 메모와 펜 stroke local persistence

## Planned Direction (post-rewrite)

다음 sprint들에서 도입 예정:

- **AI 튜터 페르소나 4명** — 과목별 전용. 공통 system prompt 골격 + 과목별 specialization layer.
- **Multi-provider AI stack** — Bedrock primary, 월 비용 상한 도달 시 또는 Bedrock 미채택 선택 시 로컬 AI agent (Claude CLI · Codex CLI · Gemini CLI 등) 로 자동 fallback. Provider 교체 시에도 페르소나 가치는 동일.
- **RAG over lecture PDFs** — 강의 PDF를 청크 단위로 embedding 해서 vector store에 저장, 페르소나가 답변 시 PDF 출처를 명시.
- **데이터 거버넌스** — 강의 PDF 저작권 (교수님 자료) 와 provider cloud 송신 경계, 사용자 노트 송신 여부, embedding 저장 위치 등이 ADR로 정착됩니다.

월 AI 비용 상한은 별도 ADR (proposed) 에서 안 A ($10) / 안 B ($30) / 안 C ($0 — Bedrock 미사용, 로컬 agent only) 중 다음 sprint G2 직전에 결정됩니다.

이 방향성과 관련된 결정·근거는 모두 `docs/solon/decisions/` 의 ADR (특히 0001 amend 자료, AI tutor stack ADR, 비용 옵션 ADR) 에 기록됩니다.

## Tech Stack

현재 (legacy):

- Frontend: Vite, TypeScript
- Backend: NestJS
- Database: MySQL, Prisma
- Storage: local/mock provider 또는 S3-compatible provider (운영: Cloudflare R2, `STORAGE_PROVIDER=s3` + `S3_ENDPOINT=...r2.cloudflarestorage.com`)
- Sprint workflow: Solon Product SFS

리팩토링 후 추가 예정 (다음 sprint 결정에 따라):

- AI provider: AWS Bedrock (primary) + 로컬 AI agent fallback
- RAG: vector store (후보 미정 — pgvector / OpenSearch / 기타)
- Embedding pipeline: PDF → 청크 → embedding → vector store

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

기본 개발 계정은 `.env.example`에 정의되어 있습니다 (placeholder). 실제 사용 시
`.env` (git ignored) 에 본인의 이름·학번·이메일을 채워 주입하세요.

```text
이름: Dev User
학번: 20260001
```

### Corpus ingest CLI (sprint-2)

Sprint `2026-W19-sprint-2` 에서 PDF → corpus ingest 최소 경로를 도입했습니다. 4과목 중
**디지털공학개론** 1과목 PDF 1개를 텍스트 추출 → 청크 (512 token / 50 overlap) → embedding
(`Xenova/multilingual-e5-base`, 768 dim, 로컬 inference) → Prisma 영속까지 흘려보냅니다.
경계는 다음과 같습니다:

- Embedding 은 로컬 (`@xenova/transformers`) 만 사용합니다 — Bedrock 호출 없음. ONNX
  runtime 은 `onnxruntime-node` (optionalDependency, 1.14.0) 로 실행됩니다 — `npm install`
  시 자동 설치되지만 일부 환경에서 prebuild 가 빠질 수 있어 `npm i onnxruntime-node@1.14.0`
  로 재시도 가능합니다. 모델 cache 는 `local-materials/.xenova-cache/` 에 자동 생성되며,
  최초 1회 약 500MB 다운로드가 발생합니다 (이후 재사용). 해당 경로는 `.gitignore` 의
  `local-materials/` 로 covered.
- Vector 영속은 `chunk.embedding` Bytes BLOB 에 Float32 buffer 로 저장하는 **stub** 입니다 —
  본 sprint 는 검색 가능한 ANN index 를 만들지 않습니다. 실제 vector store 통합은 다음
  sprint 작업입니다 (ADR 0004 follow-up 참조).
- HTTP endpoint 는 노출하지 않습니다 — **CLI 만** 제공합니다.
- 사용자가 본 CLI 로 ingest 하는 PDF 는 1과목 (디지털공학개론) 1개만 검증합니다. 나머지
  과목 (정보통신개론·C언어·컴퓨터개론) 은 다음 sprint 후보입니다.

```bash
pnpm --filter @study-note/cli build && node --env-file-if-exists=.env apps/cli/dist/ingest-pdf.js --path <path-to-pdf> --subject digital-engineering
pnpm --filter @study-note/api build && node scripts/smoke-corpus-ingest.mjs
```

`ingest:pdf` 는 `apps/cli/dist` 빌드 후 `node apps/cli/dist/ingest-pdf.js` 를 실행합니다.
같은 PDF 를 두 번 ingest 하면 SHA256 content_hash dedupe 가 동작하여 두 번째 호출은
no-op + `alreadyIngested: true` 로 종료됩니다 (idempotency 정책 = 중복 무시).

### Persona turn CLI (sprint-3)

Sprint `2026-W19-sprint-3` 에서 디지털공학개론 페르소나 1명 (`디공이`, 친근한 멘토 톤)
의 첫 응답 turn 을 제공합니다. sprint-2 corpus 위에 in-memory cosine top-k retrieval
+ Claude CLI stub provider 를 결합. 경계는 다음과 같습니다:

- 페르소나는 1과목 (디지털공학개론) 1명만 지원합니다 — 다른 subject 호출 시 exit 1.
  4과목 4 페르소나 점진 도입은 다음 sprint 후보 (ADR 0004 (f)).
- Retrieval 은 `chunk.embedding` Bytes BLOB 메모리 로드 → cosine top-k. 실 vector
  store 마이그레이션은 D1 (월 AI 비용 안) 결정 후 sprint-4+ 후보.
- LLM provider 는 **Claude CLI** stub (`claude -p --dangerously-skip-permissions`).
  Bedrock 호출 0건 (D1 결정 전). Routing 은 fixture-default + opt-in:
  - `STUDY_NOTE_LLM_FIXTURE=1` → fixture mode (deterministic, Anthropic API 송신 0).
  - `STUDY_NOTE_LLM_REAL_OPT_IN=1` (fixture 미세팅 시) → real Claude CLI subprocess.
  - 둘 다 unset → fixture default (= 사용자 명시 opt-in 없으면 cloud 송신 안 됨).
- Real mode 호출 시 system prompt + retrieved PDF chunks 가 Claude CLI 를 통해
  **Anthropic API** 로 송신됩니다 (CLI 시작 시 stderr banner 1줄 안내). 사용자 본인
  PDF 의 저작권 (교수님 자료) + fair use 가정에서 1인 실행만 허용 — 외부 공유 금지
  (ADR 0004 (h.1)).
- HTTP endpoint 는 노출하지 않습니다 — **CLI 만**. POST `/v1/persona/turn` 등은
  frontend sprint 직전 후보.

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

CLI stdout 은 인간 가독 응답 + 마지막 줄 JSON (`personaName, subject, response,
sources, provider, modelName, retrievalCount, isFallback`) 으로 구성. NestJS
Logger 는 `createApplicationContext({logger:false})` 로 비활성화되어 stdout 오염 0건.

### Persona turn web UI (sprint-5)

Sprint `2026-W19-sprint-5` 에서 디공이 turn 을 React + Vite 프론트엔드 + NestJS HTTP
endpoint 로 노출. CLI lane 은 그대로 보존, 새로 web 화면 lane 이 추가됩니다.

- HTTP endpoint: `POST /api/v1/persona-turns` body `{subject, query, k?, mode?}` →
  CLI 와 동일한 sprint-3 stdout schema JSON 반환. `mode = "fixture" | "real"` 가
  body 로 전달되면 backend `resolveProviderMode` 의 priority lock (`mode` >
  `STUDY_NOTE_LLM_REAL_OPT_IN` > `STUDY_NOTE_LLM_FIXTURE` > fixture default) 발동.
- Frontend entry: vite multi-entry — 기존 `/` (lecture-reader prototype) 보존, 신규
  `/persona-turn.html` 가 React app entry. 학습 use-case 페이지.
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
- 화면: turn form (subject + query + k) → response panel (markdown + 응답 복사 버튼)
  + sources panel (chunk[N] · pdfBasename · score) + mode toggle (fixture/real) +
  consent banner (real 켤 때만, 1초 delay).
- 회귀: `pnpm --filter @study-note/api build && node scripts/run-backend-tests.mjs` 가 CLI 패턴 (sprint-3/4) 을 그대로 회귀 PASS, HTTP
  endpoint 패턴 (sprint-5 신규) 6 case 추가. 총 44/44 PASS.

### MCP server: get_chunks tool (sprint-2 post-adopt)

Sprint `2026-W19-sprint-2` 에서 Anthropic MCP server 의 first slice 가 추가됩니다.
Claude Desktop / Cursor 같은 MCP client 가 본 backend 의 corpus retrieval 을 *tool*
로 호출 가능 — 사용자 본인 Claude Pro 구독으로 LLM 호출, mj backend 는 corpus + retrieval
만 hosting (사용자 명시 architecture 의도).

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

등록 후 Claude Desktop 재시작 → 디공이 turn (또는 다른 chat) 에서 `@study-note` 도구
호출 → tool call paste evidence (sprint-2 AC7).

#### Security note (sprint-2 Gate 6 round 1 F3 carry — local stdio MCP trust boundary)

이 first slice 는 *로컬 stdio* 만 (network listener 0). 그러나 Claude Desktop 의 MCP
config 에 등록된 *모든 MCP client* 가 `get_chunks` 호출 가능 — corpus chunk 텍스트는
사용자 PDF 본문이라 *untrusted content* (prompt injection 가능). 즉:

- DB 자격증명 (`DATABASE_URL`) 은 위 config 의 `env` 안에만, repo 에는 commit 0.
- 반환되는 `sourcePdfPath` 는 항상 basename 만 (절대 경로 노출 0, scheme strip).
- 반환되는 `text` 는 *user-untrusted* — LLM client (Claude Desktop) 가 system prompt
  level 명령으로 신뢰하지 않도록 주의.
- 내부 retrieval 오류 메시지는 MCP wire 에 redact ("retrieval failure" generic only),
  detail 은 `mcp-server` 프로세스 stderr 에만.
- HTTP/SSE transport (sprint-3+) 도입 시 별도 인증 + rate limit 정책 필요.

## Verification

```bash
pnpm -r build
pnpm --filter @study-note/api build && node scripts/smoke-backend-contract.mjs
pnpm --filter @study-note/api build && node scripts/smoke-pdf-workspace.mjs
pnpm --filter @study-note/api build && node scripts/smoke-s3-storage.mjs
```

실제 S3 검증은 bucket/credential이 준비된 뒤 opt-in으로 실행합니다.

```bash
RUN_REAL_S3_SMOKE=1 STORAGE_PROVIDER=s3 S3_BUCKET="..." S3_REGION="..." pnpm --filter @study-note/api build && node scripts/smoke-real-s3-storage.mjs
```

(다음 sprint의 rewrite 결과에 따라 위 npm script 들이 재구축될 수 있습니다.)

## Project Notes

- `local-materials/`는 로컬 강의자료 보관용이며 git에 올리지 않습니다.
- `.env`와 credential은 git에 올리지 않습니다.
- SFS sprint 산출물은 `.sfs-local/sprints/`에 남깁니다.
- 다음 sprint의 첫 rewrite slice 후보는 `.sfs-local/sprints/2026-W19-sprint-1/plan.md` §9 backlog 에서 픽됩니다.
