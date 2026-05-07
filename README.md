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
- local/mock 또는 S3 storage provider
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
- Storage: local/mock provider 또는 S3 provider
- Sprint workflow: Solon Product SFS

리팩토링 후 추가 예정 (다음 sprint 결정에 따라):

- AI provider: AWS Bedrock (primary) + 로컬 AI agent fallback
- RAG: vector store (후보 미정 — pgvector / OpenSearch / 기타)
- Embedding pipeline: PDF → 청크 → embedding → vector store

## Local Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev
```

기본 개발 계정은 `.env.example`에 정의되어 있습니다.

```text
이름: 채명정
학번: 20264514
```

## Verification

```bash
npm run build
npm run smoke:backend
npm run smoke:pdf-workspace
npm run smoke:s3-storage
```

실제 S3 검증은 bucket/credential이 준비된 뒤 opt-in으로 실행합니다.

```bash
RUN_REAL_S3_SMOKE=1 STORAGE_PROVIDER=s3 S3_BUCKET="..." S3_REGION="..." npm run smoke:s3-real
```

(다음 sprint의 rewrite 결과에 따라 위 npm script 들이 재구축될 수 있습니다.)

## Project Notes

- `local-materials/`는 로컬 강의자료 보관용이며 git에 올리지 않습니다.
- `.env`와 credential은 git에 올리지 않습니다.
- SFS sprint 산출물은 `.sfs-local/sprints/`에 남깁니다.
- 다음 sprint의 첫 rewrite slice 후보는 `.sfs-local/sprints/2026-W19-sprint-1/plan.md` §9 backlog 에서 픽됩니다.
