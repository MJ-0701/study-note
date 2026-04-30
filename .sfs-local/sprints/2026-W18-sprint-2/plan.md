---
phase: plan
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T23:10:00+09:00
status: closed
refined_by: solon-ceo
refined_at: 2026-04-30T23:10:00+09:00
codex_review_history:
  - at: 2026-04-30T12:14:15Z
    verdict: partial
    addressed_in: ["§7", "§8", "§9", "§10", "§11"]
stack:
  backend: "Node.js / NestJS"
  frontend: "Vite (SPA)"
  db: "MySQL 8"
  secret_channel: ".env (local) / EC2 environment"
  deploy: "EC2 small + Docker Compose, S3 for user content"
closed_at: 2026-04-30T14:16:56+00:00
---

# Plan — EC2 small급 풀스택 학습 요약 서비스 MVP 기획

> Sprint **G1 — Plan Gate** 산출물. 본 문서의 목적은 **요구사항·AC 의 측정 가능성 확보**.
> 변경 이력은 `.sfs-local/events.jsonl` 의 `phase_change` / `gate_review` event 로 추적.
> SSoT: `05-gate-framework.md §5.1` (Gate 매트릭스).
> 입력 기준: 같은 sprint 의 `brainstorm.md` (G0) 를 먼저 읽고 작성한다.

---

## §1. 요구사항 (Requirements)

본 sprint 가 풀어야 할 문제 / 사용자 니즈 / 비즈니스 입력. 1줄 요약 + 배경 컨텍스트.

- [x] R1: 사용자는 컴공 1학년 학생이자 현직 백엔드 개발자이며, CS 기초 부족을 보완하기 위해 강의 PDF + 키워드 메모 기반 학습 산출물을 시험 직전에 빠르게 복습할 수 있어야 한다.
- [x] R2: 기존 Notion 정리노트는 작성/보관에는 유용하지만 시험범위 단위로 쭉 읽기 어렵기 때문에, 주차별/시험범위별로 책처럼 읽히는 학습 뷰어가 필요하다.
- [x] R3: v1 서비스는 EC2 small급 단일 호스트에서 Docker Compose 로 운영 가능해야 하며, 사용자 컨텐츠 본문과 동영상은 EC2 로컬 디스크가 아니라 S3 에 저장해야 한다.
- [x] R4: 입력은 서비스 내부 LLM 호출이 아니라 외부 Claude/Codex/Gemini CLI 로 생성된 산출물 묶음이다. 서비스는 업로드, 저장, 색인, 조회, 뷰어 역할에 집중한다.
- [x] R5: v1 은 4과목(`디지털공학개론`, `정보통신개론`, `C언어`, `컴퓨터개론`) 을 동시에 지원해야 하며, `course → week → artifact` 와 `exam_range` 구조가 필요하다.
- [x] R6: 동기 공유를 위해 표준 회원가입 없이 단일 공유 ID/PW + 4문항 본인확인 게이트를 제공한다. 정답은 소스에 커밋하지 않고 `.env` (또는 EC2 environment) 로 관리한다.
- [x] R7: 기술 스택은 **NestJS (Node.js) backend + Vite SPA frontend + MySQL 8** 로 lock-in 한다. 사유: 사용자의 본업 스택(Spring Boot + Kotlin) 은 풀스택 일관성/JVM RAM 측면에서 EC2 small 에 부담. Node 단일 런타임 + Vite/NestJS 동형 TypeScript 가 small 인스턴스 + 풀스택 학습 목표에 더 적합. MySQL 은 NestJS ORM 친화 + small footprint + 사용자의 약한 선호에 부합.

## §2. Acceptance Criteria (AC, 측정 가능)

각 요구사항에 대해 **측정 가능한 통과 조건** 정의. "되면 안 되는 것" (anti-AC) 도 명시.

- [x] AC1: 5대 핵심 기능(개념설명, 핵심요약+꿀팁, 책 모드, 요약 동영상, 주차별/시험범위별 뷰)이 v1 포함/선택/보류로 분류되어 있다 — verify by §3 scope + CTO 산출물 목록.
- [x] AC2: 업로드 산출물 표준이 `manifest.json + assets/` 로 정의되어 있고, `concept.md`, `summary.md`, `book.md`, `video.(mp4|url)`, `meta.json` 은 모두 선택 산출물로 처리된다 — verify by CTO 산출물의 manifest schema.
- [x] AC3: 빈 산출물은 화면에서 보이지 않아야 하며, manifest 에 있는 산출물만 뷰어에 노출된다 — verify by UI behavior requirement.
- [x] AC4: 아키텍처는 EC2 small 1대 + Docker Compose + backend container + DB container + frontend/static serving + S3 로 설명되어 있다 — verify by component diagram.
- [x] AC5: 사용자 컨텐츠 본문(`*.md`, `*.mp4`, `meta.json`) 은 S3 에 저장하고, DB 에는 S3 object key 와 과목/주차/시험범위 metadata 만 저장한다 — verify by data model.
- [x] AC6: 게이트는 공유 ID/PW + 4문항 전체 정답(4/4) + 무한 재시도 + 짧은 만료 signed cookie 로 정의되어 있다 — verify by auth/gate spec.
- [x] AC7: plan 말미에 CTO Generator 가 바로 다음 구현 sprint 로 가져갈 Phase 1 작업 목록이 있다 — verify by §6.
- [x] AC8: "책처럼 읽힘 / 재미요소" 가 측정 가능한 형태로 분해되어 있다 — verify by 다음 4개 중 ≥3개 충족: (i) `book.md` 한 주차당 권장 본문 길이 범위(예: 1500~5000자) 명시, (ii) 시험범위 뷰는 여러 주차의 `book.md` 를 한 페이지에서 연속 스크롤로 읽힘, (iii) 진행도 표시(주차/전체) UI 요구사항이 있음, (iv) "비유·예시·질문 유도 섹션" 같은 톤 가이드가 manifest 또는 문체 가이드로 명시.
- [x] AC9: 게이트 정답·secret 운영 채널은 **`.env` (local 개발) / EC2 environment (배포)** 로 lock-in. AWS Secrets Manager / SSM Parameter Store 는 비용 정책상 v1 미사용. 단 평문 git 커밋 금지(Anti-AC2 유지) 는 강제.
- [x] AC10: 기술 스택은 frontmatter `stack` 필드에 명시되며, 그 외 스택은 v1 에서 도입하지 않는다 — verify by frontmatter `stack` + Anti-AC4.
- [x] Anti-AC1: v1 에서 서비스 내부 LLM 호출, Bedrock, 동영상 인코딩, CloudFront, RDS, 정식 회원가입/OAuth, RBAC 는 구현하지 않는다.
- [x] Anti-AC2: S3 secret, 게이트 정답, AWS credential 은 git 에 커밋하지 않는다.
- [x] Anti-AC3: 사용자 컨텐츠 본문은 DB 에 저장하지 않는다 (S3 객체 키와 메타데이터만 색인).
- [x] Anti-AC4: v1 에서 stack 필드 외 추가 런타임/DB(예: Spring Boot, PostgreSQL, Redis, Elasticsearch 등) 는 도입하지 않는다.

## §3. 범위 (Scope)

- **In scope**: 본 sprint 안에서 처리할 것.
- **Out of scope**: 의도적으로 제외 (다음 sprint 또는 별도 WU).
- **Dependencies**: 다른 sprint / 외부 리소스 / 결정 대기 (W10 후보).

### In Scope

- MVP 제품 기획서 확정: 사용자, 문제, 성공 상태, v1/v2 기능 경계.
- EC2 small 단일 호스트 아키텍처 확정: Docker Compose, backend, DB, frontend/static, S3.
- 데이터 모델 1차안: `Course`, `Week`, `Artifact`, `ExamRange`, `GateSession`.
- 업로드 산출물 포맷 1차안: `manifest.json + assets/`, 선택 산출물 허용, unknown key 허용.
- 게이트 정책 1차안:
  - 공유 ID/PW 1개.
  - 질문 4개 전체 정답.
  - 재시도 무한.
  - 통과 후 signed cookie.
  - 정답은 `.env`/secret 으로만 주입.
- v1 화면 구성 1차안:
  - 과목 목록.
  - 주차별 뷰.
  - 시험범위 뷰.
  - artifact tab/section: 개념, 요약, 책 모드, 동영상.

### Out Of Scope

- 실제 코드 구현.
- 서비스 내부 LLM 추론.
- TTS/슬라이드/동영상 생성.
- AWS Bedrock.
- RDS, CloudFront, k8s, queue, worker.
- OAuth/SSO, 정식 회원가입, 사용자별 권한/진도 저장.
- 검색, 북마크, 코멘트, 학습 통계, 게이미피케이션.

### Dependencies / Decisions (resolved 2026-04-30)

- ~~D1. DB~~ → **MySQL 8** lock. 사유: NestJS ORM 친화(Prisma/TypeORM 모두 1급 지원), small RAM footprint(`mysqld` ~150~250MB tunable), 사용자의 약한 선호. PostgreSQL 보류 사유: 기능 차이가 본 워크로드에 결정적이지 않고, 도입 이득 < 운영 단순성 손실.
- ~~D2. Backend~~ → **NestJS (Node.js + TypeScript)** lock. 사유: Vite 프론트와 동형 TypeScript, EC2 small RAM 친화(JVM 대비), 사용자의 풀스택 일관성 우선 의도. Spring Boot 보류 사유: 사용자 본업 스택이지만 EC2 small (≈2GB RAM) 에서 JVM + DB + nginx 동거 압박, 본 프로젝트의 학습 목적과 별개로 운영 비용이 커짐.
- ~~D3. Frontend~~ → **Vite (SPA)** lock. 사유: 가장 단순한 빌드/개발 경험, backend API 분리 깔끔, Next.js SSR 의 추가 운영 부담 회피.
- ~~D4. Secret 채널~~ → **`.env` (local) / EC2 environment (배포)** lock. AWS Secrets Manager / SSM 보류 사유: 비용 최소화 정책. 평문 git 커밋은 Anti-AC2 로 강제.
- D5. S3 접근: presigned upload/download 기본, public bucket 금지, CORS 는 도메인 화이트리스트.

## §4. G1 Gate 자기 점검

- [x] R/AC 가 측정 가능 (정량 또는 binary)
- [x] 범위가 sprint 1개 안에서 닫힘
- [x] 의존성 / 결정 대기 항목이 명시됨

> 본 체크리스트 통과 = `/sfs review --gate G1` 진입 조건. verdict (pass / partial / fail) 는 `review.md` 에 기록.

## §5. Sprint Contract (Generator ↔ Evaluator)

`brainstorm.md` 의 G0 맥락을 기반으로 이번 sprint 의 실행 계약을 명시한다.
역할 흐름은 **CEO → CTO Generator ↔ CPO Evaluator → CTO 구현 → CPO 리뷰 → CTO rework/final confirm → retro** 이다.

- **CEO 요구사항/plan 결정**:
  - 문제 정의: 강의 요약 산출물은 이미 만들 수 있지만, 시험범위 단위로 읽고 복습하기에는 Notion 기반 정리 흐름이 너무 방대하고 불편하다.
  - 최종 목표: EC2 small + S3 기반으로 운영 가능한 풀스택 학습 요약 서비스 MVP 의 요구사항, 아키텍처, 데이터 모델, 산출물 포맷, 구현 순서를 확정한다.
  - 이번 sprint 에서 버릴 것: 코드 구현, 내부 LLM, 동영상 생성, 정식 회원가입, RDS/CloudFront, 과한 권한/진도 기능.
- **CTO Generator 가 만들 것**:
  - persona: `.sfs-local/personas/cto-generator.md`
  - preferred executor: claude
  - 산출물:
    - MVP 기획 문서 1개.
    - component diagram 1개.
    - data model 초안 1개.
    - `manifest.json` schema 초안 1개.
    - Phase 1 구현 backlog 1개.
  - 변경 파일/모듈:
    - `.sfs-local/sprints/2026-W18-sprint-2/plan.md`
    - 필요 시 `docs/product/mvp-plan.md`
    - 필요 시 `docs/architecture/ec2-small-architecture.md`
  - 구현하지 않을 것:
    - 애플리케이션 코드.
    - AWS 리소스 생성.
    - DB migration.
    - 인증 secret 작성.
- **CPO Evaluator 가 검증할 것**:
  - persona: `.sfs-local/personas/cpo-evaluator.md`
  - preferred executor: codex
  - self-validation 방지: 구현한 agent/tool 과 다른 evaluator instance/tool 사용 권장
  - AC 검증 방법:
    - AC1~AC7 이 문서에서 직접 추적 가능한지 확인.
    - Anti-AC 위반이 없는지 확인.
    - EC2 small 제약과 비용 최소화 원칙이 아키텍처에 반영됐는지 확인.
    - 외부 LLM 산출물 업로드 흐름이 서비스 책임과 분리되어 있는지 확인.
  - 회귀/위험 체크:
    - Spring Boot + DB container 조합이 small RAM 을 초과할 가능성.
    - S3 presigned URL / CORS / secret 관리 누락.
    - manifest schema 가 너무 빡빡해서 향후 산출물 추가가 어려워지는 문제.
    - "책처럼 읽힘" 이 UI/콘텐츠 요구사항으로 충분히 분해되지 않는 문제.
  - 통과/부분통과/실패 기준:
    - pass: AC 전부 충족, 구현 sprint 로 넘길 backlog 가 선명함.
    - partial: 주요 구조는 맞지만 DB/프론트/manifest 중 하나가 결정되지 않음.
    - fail: EC2 small/비용 최소화/외부 LLM 분리/S3 단일화 중 하나를 위반함.
- **CTO ↔ CPO 재작업 계약**:
  - CPO `pass`: 최종 통과 + retro 진입
  - CPO `partial`: 지정된 항목만 CTO 재구현 후 재리뷰
  - CPO `fail`: plan/scope 재검토 또는 구현 재작업
- **사용자 최종 결정 (resolved 2026-04-30)**:
  - DB: **MySQL 8** ✓
  - Backend: **NestJS (Node.js + TypeScript)** ✓ (Spring Boot 보류 — small RAM 부담)
  - Frontend: **Vite SPA** ✓
  - Secret 채널: **`.env` / EC2 environment** ✓ (Secrets Manager 미사용, 비용 정책)
  - 잔여 결정 없음 → G2 진입 준비됨.

## §6. Phase 1 구현 Backlog Seed

순서는 의존성 우선. 각 항목은 별도 sprint 로 쪼갤 수 있으나 1·2·3 은 후속 작업의 전제이므로 묶어서 들어가는 것을 권장.

1. **Repository scaffold + dev compose**: `apps/api` (NestJS) / `apps/web` (Vite SPA) / `docker-compose.yml` (api + mysql + web 정적 서빙 또는 nginx) / `docs/` / `.env.example`. monorepo 또는 멀티 폴더 중 1차안 1개.
2. **DB schema (1차, MySQL 8)**: `course`, `week`, `artifact`, `exam_range`, `exam_range_week` join, `gate_session`. ORM(Prisma 또는 TypeORM) 1개 픽 후 스키마 + 마이그레이션 1차.
3. **manifest schema (1차)**: `manifest.json` JSON schema 1차안 + 산출물 후보(`concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json`) 의 선택 필드 명세 + unknown key 허용.
4. **S3 integration**: presigned upload/download (NestJS `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), object key convention(`<course>/<week>/<artifact-type>/<filename>`), CORS 정책 도큐먼트, 평문 secret 금지.
5. **Gate (4문항 + 짧은 만료 signed cookie)**: `.env` 의 정답 4종 + 공유 ID/PW 로드 → 4/4 정답 시 NestJS 가 서명 쿠키(`HttpOnly`, `Secure` in prod, 24h 만료) 발급 → 미들웨어로 보호 라우트 게이트.
6. **Upload flow**: 게이트 통과 사용자만 presigned URL 받아 manifest+assets 업로드 → 서버측 manifest 검증 → DB 색인 생성.
7. **Viewer API**: `GET /courses`, `GET /courses/:id/weeks`, `GET /weeks/:id`, `GET /exam-ranges/:id`, artifact signed download URL 발급 엔드포인트.
8. **Frontend MVP (Vite SPA)**: 게이트 화면, 과목 목록, 주차 reader(있는 산출물만 탭/섹션 노출), 시험범위 reader(여러 주차 `book.md` 연속 스크롤 + 진행도 UI).
9. **Local↔EC2 parity 검증**: 동일 compose 형상으로 EC2 small 배포 → RAM/디스크 측정(`docker stats`, `free -m`) → 미달 시 인스턴스 등급 상향 또는 DB 외부화 폴백 결정.
10. **CPO review (gate 별)**: G2(요구) / G3(설계) / G4(구현) 각 gate 에서 small-resource·secret·S3·UX 검증.

---

## §7. 5대 핵심 기능 v1/optional/deferred 분류표

> 출처: brainstorm `§1` 사용자 명시 5대 기능. codex G1 partial review action 1 대응.
> v1 = MVP 1차에 반드시 포함 / optional = manifest 가 들어 있으면 표시, 없어도 무방 / deferred = v2 이후.

| #  | 기능                       | 분류         | v1 동작 / 보류 사유                                                                                                       |
|----|----------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------|
| F1 | 개념설명                   | **v1**       | `concept.md` 산출물 업로드 시 주차 reader 의 "개념" 탭으로 노출. manifest 에 없으면 탭 자동 숨김(AC3).                     |
| F2 | 핵심요약 + 꿀팁            | **v1**       | `summary.md` 산출물. 주차 reader "요약" 탭 + 시험범위 reader 의 첫 블록.                                                  |
| F3 | 책처럼 읽히는 long-form    | **v1**       | `book.md` 산출물. 주차 reader "책 모드" 탭 + 시험범위 reader 의 연속 스크롤 본문(AC8). 권장 길이 1500~5000자.              |
| F4 | 요약 동영상 (TTS+슬라이드) | **optional** | `video.mp4`(S3 직접) 또는 `video.url`(외부 unlisted 링크). 둘 다 외부 LLM 으로 사용자가 생성 후 업로드. 인코딩은 서비스 책임 아님. 없으면 탭 자동 숨김. |
| F5 | 주차별/시험범위별 뷰       | **v1**       | 주차 reader = 단일 `week` 뷰. 시험범위 reader = `exam_range` 가 묶은 여러 `week` 의 산출물 연속 표시(F3 의 연속 스크롤 패턴).    |

deferred (v1 미포함):
- 사용자별 진도 저장, 즐겨찾기, 코멘트, 게이미피케이션
- 검색·필터(과목 내 키워드 검색 등)
- 산출물 내부 LLM 질의/대화
- TTS·슬라이드·동영상 자체 생성
- 권한 단계 (viewer 단일 등급 외)

## §8. `manifest.json` 1차 schema draft

> codex action 2 대응. 사용자가 외부 LLM 으로 산출물 묶음을 만들 때 따라야 할 1차 표준.
> unknown key 허용 — 미래에 산출물 종류 추가/실험 가능. 누락된 산출물 항목은 자동 생략(AC3).
> 정식 JSON Schema 작성은 Phase 1 backlog 항목 3 에서 진행하되, 본 plan 시점에 의미 1차 정의 완료.

### 8.1 필수 필드

| key                   | type              | 비고                                                                                              |
|-----------------------|-------------------|---------------------------------------------------------------------------------------------------|
| `manifest_version`    | int               | 1차 = `1`. 향후 호환성 깨질 변경 시 +1.                                                            |
| `course`              | string (slug)     | `digital-engineering` / `info-comm` / `c-lang` / `cs-intro` (4과목 fixed slug, R5 / §11 참조).      |
| `week`                | int (1-N)         | 해당 산출물이 묶이는 주차.                                                                          |
| `exam_ranges`         | string[]          | 이 주차가 속한 시험범위 slug 배열. 비어 있으면 정규 시험범위 미배정 상태.                              |
| `created_at`          | string (ISO 8601) | 산출물 생성 시각.                                                                                  |
| `artifacts`           | object            | 아래 8.2 참조.                                                                                     |

### 8.2 `artifacts` 객체 (각 키 모두 선택)

| key         | value 형태                                       | 비고                                                                            |
|-------------|--------------------------------------------------|---------------------------------------------------------------------------------|
| `concept`   | `{ "path": "assets/concept.md" }`                | F1. 없으면 "개념" 탭 숨김.                                                       |
| `summary`   | `{ "path": "assets/summary.md" }`                | F2. 없으면 "요약" 탭 숨김.                                                       |
| `book`      | `{ "path": "assets/book.md", "char_count": 3200, "tone": ["analogy","example"] }` | F3 / AC8. `char_count` 권장 1500~5000, `tone` 자유 키워드 배열. |
| `video`     | `{ "path": "assets/video.mp4" }` 또는 `{ "url": "https://..." }` | F4. 둘 중 하나만 있어도 됨. 둘 다 없으면 자동 생략.                |
| `meta`      | `{ "path": "assets/meta.json", "title": "...", "summary_one_line": "..." }` | F5 보조 메타. 주차 reader 헤더에 노출.       |
| _unknown_   | 임의 object                                       | 서버는 unknown key 무시 + 그대로 색인 (DB JSON column). 향후 실험 키 안전.        |

### 8.3 예제

```json
{
  "manifest_version": 1,
  "course": "digital-engineering",
  "week": 6,
  "exam_ranges": ["midterm-2026-1"],
  "created_at": "2026-04-29T22:00:00+09:00",
  "artifacts": {
    "concept": { "path": "assets/concept.md" },
    "summary": { "path": "assets/summary.md" },
    "book": {
      "path": "assets/book.md",
      "char_count": 3210,
      "tone": ["analogy", "example", "self-question"]
    },
    "video": { "url": "https://www.youtube.com/watch?v=UNLISTED_ID" },
    "meta": {
      "path": "assets/meta.json",
      "title": "카르노맵 (1~n 변수)",
      "summary_one_line": "K-map 으로 부울식 최소화하는 절차"
    },
    "experiment_quiz_v0": { "path": "assets/quiz.json" }
  }
}
```

> `experiment_quiz_v0` 같은 unknown key 도 거부되지 않고 DB 의 `Artifact.extra` JSON 컬럼에 그대로 저장됨 — 향후 새 산출물 형태 도입 시 manifest_version 안 올리고도 실험 가능.

### 8.4 업로드 시 서버측 검증 규칙 (1차)

- `manifest_version == 1` 인지 확인 (다른 값이면 reject).
- `course ∈ {digital-engineering, info-comm, c-lang, cs-intro}` 인지 확인.
- `week` 가 양수 int 인지 확인.
- `artifacts` 객체의 path 가 실제 업로드된 asset 키와 매칭되는지 확인.
- 알려진 키 (`concept` / `summary` / `book` / `video` / `meta`) 의 형태가 8.2 와 일치하는지 확인. 알려지지 않은 키는 형태 검증 없이 통과.

## §9. Component diagram + data-flow diagram

> codex action 3 대응. text/mermaid 표현, 1차안. 운영 호스트 = EC2 small 1대.

### 9.1 Component diagram

```text
                 ┌──────────────────────────────────────┐
                 │ 사용자 브라우저 (학생 + 동기 4명 내외) │
                 └──────────────────────────────────────┘
                           │ HTTPS (게이트 쿠키)
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       EC2 t3.small (≈ 2 vCPU / 2GB)                      │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐      │
│  │  web (nginx) │◀──▶│  api (NestJS)    │◀──▶│  mysql 8 (docker)  │      │
│  │  Vite SPA    │    │  Node.js + TS    │    │  same docker net   │      │
│  └──────────────┘    └──────────────────┘    └────────────────────┘      │
│        │                  │   │                                          │
│        │  static assets   │   │  presigned URL 발급                      │
└────────┼──────────────────┼───┼──────────────────────────────────────────┘
         │                  │   │
         │  (브라우저 직접) │   │  (브라우저 ⇄ S3 직접 업/다운)
         ▼                  ▼   ▼
                 ┌──────────────────────────┐
                 │  AWS S3 bucket (private) │
                 │  manifest.json + assets/ │
                 └──────────────────────────┘

외부(서비스 책임 밖):
  사용자 로컬 PC ─→ Claude / Codex / Gemini CLI ─→ 산출물 묶음(zip 또는 manifest+assets)
```

- EC2 small = `web (nginx 정적 서빙)` + `api (NestJS)` + `mysql 8` 세 컨테이너를 docker-compose 단일 호스트에서 운영.
- 사용자 컨텐츠 본문은 EC2 디스크에 두지 않음 → 디스크 압박 ≈ 0.
- 동영상도 S3 mp4 또는 외부 unlisted url 만 참조, 서비스가 인코딩 안 함.

### 9.2 Upload → index → viewer data-flow

```text
[1] 외부 LLM 산출물 생성 (사용자 로컬, 서비스 책임 밖)
       │ PDF + 키워드 메모 → Claude/Codex/Gemini CLI → manifest.json + assets/
       ▼
[2] 게이트 통과 (web SPA → api)
       │ 공유 ID/PW + 4문항 정답 4/4 → api 가 signed cookie 발급 (24h)
       ▼
[3] 업로드 요청 (web SPA → api → S3)
       │ POST /uploads/presign  { course, week, files[] }
       │ api 가 S3 presigned PUT URL 들 발급 → 브라우저가 S3 에 직접 PUT
       ▼
[4] manifest 색인 (web SPA → api → mysql)
       │ POST /uploads/commit  { manifest, s3_keys[] }
       │ api: manifest 검증(§8.4) → DB 에 course/week/artifact/exam_range 색인 생성
       │     본문은 DB 에 안 들어감 (Anti-AC3) — S3 object key 만 저장
       ▼
[5] 조회 (web SPA → api → S3 presigned GET)
       │ GET /courses, /weeks/:id, /exam-ranges/:id  (게이트 통과 쿠키 필수)
       │ api: DB 에서 색인 조회 → S3 presigned GET URL 묶어서 응답
       │ 브라우저: presigned URL 로 S3 에서 .md / .mp4 직접 fetch (CDN 미사용)
       ▼
[6] 뷰어 렌더 (web SPA)
       │ 주차 reader: artifact 가 있는 탭만 노출(AC3)
       │ 시험범위 reader: 묶인 모든 week 의 book.md 를 진행도 UI 와 함께 연속 스크롤(AC8)
```

## §10. 데이터 모델 1차 (MySQL 8)

> codex action 4 대응. ORM(Prisma 또는 TypeORM) 픽은 Phase 1 backlog 2 에서. 본 plan 은 의미 모델 1차안.
> 본문 저장 금지 (Anti-AC3) — `*.md`, `*.mp4` 본문은 S3, DB 에는 키와 메타만.

### 10.1 Entity 요약

| Entity        | 용도                                              | 1건 = ?                                |
|---------------|---------------------------------------------------|----------------------------------------|
| `Course`      | 과목 (4과목 고정)                                  | 1 = 디지털공학개론 등 1과목            |
| `Week`        | 한 주차                                           | 1 = 특정 과목의 N주차                  |
| `Artifact`    | 한 주차 안에 업로드된 산출물 묶음 1번             | 1 = manifest 1개 = S3 prefix 1개       |
| `ExamRange`   | 시험범위(여러 주차 묶음)                           | 1 = "midterm-2026-1" 등                |
| `ExamRangeWeek` | join (M:N)                                       | exam_range × week pair                 |
| `GateSession` | 게이트 통과 세션(서명 쿠키 매칭용 audit)            | 1 = 통과 1건                           |

### 10.2 필드 1차안

```text
Course
  id              BIGINT PK
  slug            VARCHAR(64)  UNIQUE  -- "digital-engineering" 등
  name            VARCHAR(128)         -- "디지털공학개론"
  professor_name  VARCHAR(64)          -- 게이트 정답에 사용 (§11). DB 에는 평문 금지 → 빈 값/마스크 허용, 정답은 .env.
  schedule_day    VARCHAR(16)          -- "월요일" 등 (디공 요일 게이트 정답에 사용)
  display_order   INT                  -- 과목 목록 정렬
  created_at      DATETIME

Week
  id              BIGINT PK
  course_id       BIGINT  FK → Course
  week_no         INT                  -- 1..N
  title           VARCHAR(255)         -- "카르노맵 (1~n 변수)" 등 (manifest.meta.title 미러)
  summary_one_line VARCHAR(255)        -- manifest.meta.summary_one_line 미러
  UNIQUE (course_id, week_no)

Artifact
  id              BIGINT PK
  week_id         BIGINT  FK → Week
  manifest_version INT                 -- = manifest.json.manifest_version
  s3_prefix       VARCHAR(512)         -- 예: "digital-engineering/6/2026-04-29T22-00/"
  manifest_key    VARCHAR(512)         -- s3_prefix + "manifest.json"
  has_concept     BOOL
  has_summary     BOOL
  has_book        BOOL
  book_char_count INT NULL             -- AC8 (i) 측정용
  book_tone       JSON NULL            -- AC8 (iv) tone 배열
  has_video       BOOL                 -- mp4 또는 url 둘 중 하나라도 있으면 true
  video_kind      ENUM('mp4','url') NULL
  video_locator   VARCHAR(512) NULL    -- mp4 의 S3 키 또는 외부 url
  meta_key        VARCHAR(512) NULL    -- assets/meta.json S3 키
  extra           JSON NULL            -- manifest 의 unknown 키들 그대로 저장
  created_at      DATETIME

ExamRange
  id              BIGINT PK
  course_id       BIGINT  FK → Course  -- 시험범위는 과목 내 묶음 (cross-course 미지원, v1)
  slug            VARCHAR(64)          -- "midterm-2026-1"
  title           VARCHAR(128)         -- "2026 1학기 중간고사"
  display_order   INT
  UNIQUE (course_id, slug)

ExamRangeWeek
  exam_range_id   BIGINT  FK → ExamRange
  week_id         BIGINT  FK → Week
  ordinal         INT                  -- 시험범위 안에서 읽기 순서
  PRIMARY KEY (exam_range_id, week_id)

GateSession
  id              BIGINT PK
  cookie_id       VARCHAR(64)          -- 서명 쿠키의 sid (HMAC 검증용)
  issued_at       DATETIME
  expires_at      DATETIME             -- 24h
  user_agent      VARCHAR(255)         -- 감사 (PII 거의 없음 가정)
  revoked_at      DATETIME NULL
```

### 10.3 관계도 (text)

```text
Course (1) ──< Week (N) ──< Artifact (N)
   │                 │
   │                 └──< ExamRangeWeek (M:N) >── ExamRange
   │
   └──< ExamRange (N)

GateSession  -- (시스템 단일 사용자 게이트) -- 다른 entity 와 FK 관계 없음
```

### 10.4 JOIN/조회 패턴

- 주차 reader: `Week JOIN Artifact ON week_id`. 가장 최신 `Artifact` 1건의 `has_*` flag 로 탭 노출 결정.
- 시험범위 reader: `ExamRange JOIN ExamRangeWeek JOIN Week JOIN Artifact (latest per week)` → ordinal 정렬 → 각 주차의 `book.md` S3 presigned GET.
- 본문 stream: 항상 S3 presigned GET URL 만 응답, DB 에서 본문 절대 미반환.

## §11. 게이트 4문항 + secret/env 정책

> codex action 5 대응. brainstorm `A4` / `A4-detail` lock-in 을 plan 본문으로 복사.

### 11.1 게이트 4문항 (fixed v1)

| # | 질문                              | 정답 보관 env 변수            | 소유자      | 비고                              |
|---|-----------------------------------|------------------------------|-------------|-----------------------------------|
| 1 | "C언어 교수님 성함은?"              | `GATE_ANSWER_CLANG_PROFESSOR` | 사용자(본인) | 평문 git 커밋 금지 (Anti-AC2)     |
| 2 | "디지털공학개론 수업 요일은?"       | `GATE_ANSWER_DIGENG_DAY`      | 사용자(본인) | 예: "월요일"                       |
| 3 | "컴퓨터개론 교수님 성함은?"         | `GATE_ANSWER_CSINTRO_PROFESSOR` | 사용자(본인) | —                                 |
| 4 | "정보통신개론 교수님 성함은?"       | `GATE_ANSWER_INFOCOMM_PROFESSOR` | 사용자(본인) | —                                 |

추가 env:

| key                             | 용도                                                 |
|---------------------------------|------------------------------------------------------|
| `GATE_SHARED_USERNAME`          | 단일 공유 ID                                          |
| `GATE_SHARED_PASSWORD`          | 단일 공유 PW (해시는 v1 에서 선택, 최소 평문 비교 허용) |
| `GATE_COOKIE_SIGNING_KEY`       | HMAC 서명 키 (32+ bytes random)                       |
| `GATE_COOKIE_TTL_HOURS`         | 기본 24                                               |

### 11.2 통과 정책

- **통과 기준**: 4/4 모두 정답. 부분 정답 통과 없음 (brainstorm A4-N).
- **재시도**: 무한 (rate limit / IP 차단 없음, brainstorm A4-rate). 소규모 운영 가정.
- **세션**: 통과 시 NestJS 가 `HttpOnly` + (prod 에서) `Secure` + `SameSite=Lax` 서명 쿠키 발급, 만료 24h.
- **실패 시**: 동일 화면 재표시 + "정답이 일치하지 않습니다" 안내. 시도 횟수 표시 안 함.

### 11.3 Secret 운영 정책

- 저장 채널: **`.env` (local 개발용, `.gitignore` 등록)** + **EC2 environment (배포)**. AWS Secrets Manager / SSM 미사용 (D4 / 비용 정책).
- git: `.env.example` 만 커밋 (placeholder). 평문 정답·키 커밋 금지 (Anti-AC2). pre-commit hook 또는 CI gitleaks 검사 권장.
- rotation: 정기 rotation 의무 없음. 다만 정답 변경(예: 학기/교수 변경)이나 secret 노출 의심 시 사용자가 `.env` 갱신 + EC2 재기동.
- ownership: 모든 정답·키는 사용자 본인 단독 관리. 동기에게는 ID/PW 와 4문항만 공유, env 파일 자체는 공유 금지.
