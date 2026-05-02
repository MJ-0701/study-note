# study-note

시험 직전에 방대한 강의자료를 다시 헤매지 않기 위한 개인 lecture note workspace입니다.

중간고사 때 Notion에 전공 강의 핵심 요약본을 정리해 두었지만, 자료가 많아질수록 진짜 시험에 필요한 개념을 빠르게 찾기 어려웠습니다. 페이지가 과목/주차별로 쪼개지면서 이동도 번거로웠고, 교수님이 강조한 키워드가 실제 요약 안에 제대로 반영됐는지도 한눈에 확인하기 어려웠습니다.

`study-note`는 그 문제를 풀기 위해 만든 프로젝트입니다. 교수님 강의 PDF와 시험 키워드를 바탕으로 기말고사 대비 노트를 만들고, 과목별 총정리와 수업일별 노트, PDF 필기 공간을 한곳에서 이어서 보는 것이 목표입니다.

## Product Direction

이 프로젝트는 네 과목 기말고사 대비를 위한 학습 도구입니다.

- 디지털공학개론
- 정보통신개론
- C언어
- 컴퓨터개론

주요 사용 환경은 데스크톱보다 iPad, 태블릿 PC, 모바일에 가깝습니다. 그래서 화면은 단순히 큰 모니터에서 예쁘게 보이는 것보다, 좁은 화면에서도 과목 이동, PDF 읽기, 포스트잇 메모, 펜 필기가 끊기지 않는 쪽을 우선합니다.

## Core Experience

`study-note`가 만들고 싶은 공부 흐름은 다음과 같습니다.

1. 과목을 선택한다.
2. 과목별 총정리에서 시험 범위와 핵심 개념을 확인한다.
3. 날짜별 수업 노트로 들어가 교수님 키워드, 개념 설명, 예제문제를 본다.
4. PDF 작업공간에서 강의 PDF를 업로드하고 메모/필기를 남긴다.
5. 새로고침 후에도 로그인 세션이 유효하면 업로드한 PDF를 다시 불러온다.

현재 PDF 원문은 backend material storage를 기준으로 저장합니다. 브라우저는 S3에 직접 접근하지 않고, backend proxy를 통해 PDF를 업로드/다운로드합니다. PDF preview는 인증된 fetch 결과를 Blob URL로 만들어 iframe에 표시합니다.

## Current Scope

현재 구현된 범위:

- Vite 기반 lecture note reader
- 과목별 홈, 과목 총정리, 날짜별 노트
- Claude가 생성한 `study-note.week-note.v1` JSON의 과목별 local import
- 이름 + 학번 기반 로그인
- `/api/me` session revalidation
- NestJS backend
- Prisma/MySQL persistence
- PDF material metadata 저장
- local/mock 또는 S3 storage provider
- backend proxy PDF upload/download
- frontend PDF workspace backend 연동
- PDF 위 포스트잇 메모와 펜 stroke local persistence

아직 의도적으로 제외한 범위:

- PDF 자동 파싱/RAG
- Bedrock 또는 외부 AI API 연결
- backend annotation sync
- 과목별 material library UX
- 동기 공유/권한 모델
- 영상/오디오 생성

## Study Material Flow

이 프로젝트는 당장 AI 생성 파이프라인을 서버에 붙이지 않습니다.

기본 운영 방식은 다음과 같습니다.

1. 교수님 PDF와 중요 키워드를 로컬에서 준비한다.
2. Claude 같은 도구로 강의노트 JSON을 생성한다.
3. 사람이 검수한 JSON만 과목별 자료 투입 화면에서 import한다.
4. PDF 원문은 backend material storage에 업로드해 PDF workspace에서 본다.

원문 PDF를 공개 공유하는 기능은 현재 범위가 아닙니다.

## Tech Stack

- Frontend: Vite, TypeScript
- Backend: NestJS
- Database: MySQL, Prisma
- Storage: local/mock provider or S3 provider
- Sprint workflow: Solon Product SFS

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

## Project Notes

- `local-materials/`는 로컬 강의자료 보관용이며 git에 올리지 않습니다.
- `.env`와 credential은 git에 올리지 않습니다.
- SFS sprint 산출물은 `.sfs-local/sprints/`에 남깁니다.
- 현재 다음 후보 작업은 backend-backed annotation sync입니다.
