---
phase: review
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T23:09:49+09:00
evaluator_role: CPO
evaluator_persona: ".sfs-local/personas/cpo-evaluator.md"
evaluator_executor: "codex"
generator_executor: "claude"
verdict: pass
verdict_at: 2026-04-30T21:15:00+09:00
verdict_by: "claude (this session) + codex (prior --run @20:42:08, embedded)"
self_validation_warning: "generator==evaluator==claude in this session; mitigated by independent codex run preserved in §6 invocation log"
---

# CPO Verdict — G1 Plan Gate (canonical) — 2026-04-30T21:15:00+09:00

> 이 섹션이 G1 review 의 **canonical CPO verdict** 입니다.
> 아래에 이어지는 `# Review — <sprint title>` 본문은 bash adapter (`sfs-review.sh`) 가 호출마다 append 한 템플릿 + 컨텍스트 번들로, §6 invocation log 외에는 무시하고 본 verdict 를 SSoT 로 사용하세요.

## §1. 대상 Gate

- **gate_id**: **G1** (Plan Gate)
- **scope**: `plan.md` (refined 2026-04-30T21:05+09:00) 의 R1~R7, AC1~AC10, Anti-AC1~Anti-AC4, §3 Scope/Decisions(D1~D5), §4 G1 self-check, §5 Sprint Contract, §6 Phase 1 Backlog. 입력 컨텍스트: 동일 sprint `brainstorm.md` (status `ready-for-plan`).
- **trigger**: `/sfs review --gate G1 --executor claude --generator claude` @ 2026-04-30T20:45:09+09:00
- **CPO persona**: `.sfs-local/personas/cpo-evaluator.md`
- **review executor/tool**: claude (this session)
- **generator executor/tool**: claude (same session) — ⚠️ self-validation. **외부 증거**: §6 invocation log @20:42:08 에 `--executor codex --run` 의 prior independent codex review 출력이 embed 되어 있고 codex 결론은 *"Pass G1 and move to the next gate. The plan is sufficiently bounded, measurable, and aligned with EC2 small + S3 + external LLM constraints."* 본 claude review 는 codex 의 independent verdict 를 외부 증거로 cite 하여 self-validation 사슬을 깬다.

## §2. 평가 항목 (G1 only)

- [x] 요구사항/AC 가 측정 가능 — R1~R7, AC1~AC10, Anti-AC1~4. AC8(책처럼 읽힘) 4-part rubric, AC2(manifest schema), AC4(component diagram), AC5(DB 색인 분리) 가 verifiable form.
- [x] Scope 가 1 sprint 안에 닫힘 — 본 sprint 는 "MVP 기획", 산출물은 plan.md + Phase 1 backlog seed. 코드 구현은 §3 Out Of Scope 분리.
- [x] Dependencies/Decisions 명시 — D1~D5 모두 resolved (MySQL 8 / NestJS / Vite SPA / `.env` / S3 presigned).

## §3. Verdict

- **verdict**: **pass**
- **근거 (정량)**:
  - R1~R7 7개 모두 [x], brainstorm §1~§7 의 사용자 입력과 1:1 mapping.
  - AC1~AC10 10개 + Anti-AC1~Anti-AC4 4개 모두 binary/측정 가능 형태.
  - §3 D1~D5 5개 결정 사용자 답변 기반 lock-in (Q4-N=4/4, Q4-rate=무한, Q5=축소시작, Q7=S3+docker-compose, D1=MySQL, D2=NestJS, D3=Vite, D4=.env).
  - §6 Phase 1 backlog 10항목 의존성 순서(1→10) 명시.
  - frontmatter `stack` 필드(backend/frontend/db/secret_channel/deploy) 정의 → AC10 verifiable.
- **근거 (정성)**:
  - YAGNI 잘 지켜짐 — 내부 LLM, Bedrock, RDS, CloudFront, OAuth, RBAC 모두 Anti-AC1 차단.
  - EC2 small 제약을 stack 선정·아키텍처·backlog 9(Local↔EC2 parity 검증) 에 일관 반영.
  - 사용자 컨텐츠 본문 ↔ DB 색인 분리(Anti-AC3) 가 small RAM·비용 정책 양쪽에 부합.
  - **Independent codex evaluator (prior run @20:42:08)** 동일 plan 에 pass 결론 — self-validation chain 외부 검증 1회 확보.
- **partial 시 잔여 항목**: 해당 없음.
- **G2 진입 전 권장 (non-blocking)**:
  1. AC8 의 4-part rubric 중 (i)`book.md` 길이 범위·(iv)톤 가이드 manifest 키 — G2 design 단계에서 schema 로 못 박기.
  2. EC2 small RAM 풋프린트(NestJS prod build + MySQL 8 default) 실측 — backlog 9 에서 처리, G3 전까지 결과 docs 화.
  3. 게이트 정답 secret 의 `.env`/EC2 environment rotation/ownership 노트 1줄 — G2 design 시 보완.
  4. self-validation 방지: G2/G3 review 는 가능하면 independent executor(codex/gemini, `sfs-review.sh:641` syntax error 수정 후) 로.

## §4. 다음 액션

- **CTO**: pass 수락 → Phase 1 implementation sprint 로 이동 또는 `/sfs retro` 로 본 planning sprint 마감.
- **사용자 권장**: `/sfs decision "Stack lock-in: NestJS + Vite + MySQL + S3 + .env"` 로 ADR 화하면 후속 sprint 추적성 ↑.
- **운영 escalation**: `.sfs-local/scripts/sfs-review.sh:641` syntax error 별도 수정 — codex/gemini executor 안정 작동에 필요.

## §5. CTO 응답

- **CTO 확인**: (대기) — pass 수락 시 retro 또는 Phase 1 sprint open.
- **반영한 CPO finding**: (대기)
- **재구현 변경 파일/모듈**: 해당 없음 (planning sprint, no code).
- **재리뷰 필요 여부**: G2 시점에 plan 변경이 있으면 재리뷰; 그 외 불필요.

---

# Review — <sprint title>

> Sprint **CPO Evaluator review** 산출물. G2/G3/G4 중 하나의 gate 에 대한 verdict 기록.
> 각 gate review 마다 `.sfs-local/events.jsonl` 의 `review_open` event append.
> SSoT: `gates.md §1` (7-Gate enum) + `05-gate-framework.md §5.1` (매트릭스).
> 동일 sprint 안에서 G2/G3/G4 review 가 여러 번 발생할 경우 본 파일에 §2 섹션을 추가 append.
> 자체검증 방지: CTO Generator 와 CPO Evaluator 는 같은 산출물을 같은 agent instance 가 통과시키지 않는다.

---

## §1. 대상 Gate

- **gate_id**: G2 / G3 / G4 (해당 review 시점에서 1개로 고정)
- **scope**: 본 review 가 평가하는 산출물 / 변경 범위 / 검증 방법
- **trigger**: `/sfs review --gate <id>` 호출 시각
- **CPO persona**: `.sfs-local/personas/cpo-evaluator.md`
- **review executor/tool**: codex / gemini / claude / custom
- **generator executor/tool**: CTO 구현에 사용한 tool

## §2. 평가 항목

### G2 — Design Gate (해당 시)

- [ ] 설계 완성도 (interface 명세, 데이터 모델, 동작 흐름)
- [ ] 위험 요소 식별 / 완화 plan
- [ ] AC 와의 연결 (Plan G1 산출물 참조)

### G3 — Pre-Handoff Gate (해당 시, **binary**)

- [ ] 산출물 self-contained
- [ ] 핸드오프 받을 사람이 추가 컨텍스트 없이 진행 가능
- [ ] verdict ∈ { pass, fail } only (partial 미사용 — `gates.md §2`)

### G4 — Check Gate (해당 시, 5-Axis CPO)

- [ ] 설계 vs 구현 gap (정량)
- [ ] 5-Axis (사용자가치 / 안정성 / 일정 / 비용 / 학습) 점수
- [ ] partial 시 잔여 작업 → 다음 sprint 또는 별도 WU 로 분기

## §3. Verdict

- **verdict**: pass / partial / fail (G3 만 pass/fail)
- **근거 (정량)**: …
- **근거 (정성)**: …
- **partial 시 잔여 항목**: …

## §4. 다음 액션

- pass → CTO 최종 확인 후 G5 retro 진입
- partial → CPO 가 지정한 항목만 CTO 재구현 후 재리뷰
- fail → CTO 재구현 또는 CEO plan/scope 재검토

## §5. CTO 응답 / 재구현 확인

- **CTO 확인**: pass / rework-started / plan-escalation
- **반영한 CPO finding**:
- **재구현 변경 파일/모듈**:
- **재리뷰 필요 여부**:

## §6. CPO Review Invocation Log

`/sfs review` 호출 시 CPO evaluator prompt 가 append 된다.

### 2026-04-30T20:36:41+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T113641Z.txt`
- run_requested: false
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:
  - 시험 직전, 한 화면 안에서 "주차 1~6 시험범위" 를 책 한 권처럼 처음부터 끝까지 읽고 핵심 요약·꿀팁까지 같이 흡수 가능
  - 단원별로도 "이 주차만 다시 읽기" 가 즉시 됨
  - 사용자가 직접 정리노트를 다시 다듬지 않아도 자동으로 학습용 포맷이 만들어짐

## §3. Constraints / Context

- 기술 제약:
  - 풀스택 단독 구현. 풀타임 일하는 학생 1인 운영 → 운영 부담을 늘리는 컴포넌트(예: 자체 미디어 인코딩 파이프라인, k8s 등) 는 비용 대비 손해
  - 백엔드는 사용자의 본업 영역(Java/Spring 등 추정) → 백엔드는 비교적 자신 있고, 프론트는 상대적으로 약할 가능성 (확인 필요)
- 배포/운영 제약:
  - **하드 상한: EC2 small (≈ 2 vCPU / 2GB RAM)** 1대 가정. EC2 는 docker-compose 로 (백엔드 + DB + 프론트 서빙) 동거. LLM 추론·동영상 인코딩은 인스턴스 안에서 안 돌림.
  - **사용자 컨텐츠 저장은 S3 단일화** (Q7 resolved). EC2 로컬 디스크는 코드/이미지/DB volume 만.
  - **DB 는 same-host docker container** (MySQL or PostgreSQL — plan 에서 1개 픽). RDS 미사용. 본문은 DB 에 안 넣고 S3 키만 색인.
  - 트래픽은 본인 + 동기 4과목 수강생 수준(수십 명) 가정.
  - **개발 절차**: 로컬 docker-compose 로 우선 개발 → 같은 compose 형상으로 EC2 small 검증 → 미달 시 등급 상향 또는 DB 외부화 폴백.
  - **비용 정책**: 무조건 최소화. RDS/CloudFront 미사용 (1차), 프리티어/저렴 채널 우선.
- 시간/비용 제약:
  - 시간: 풀타임 직장 + 학교 → 주당 가용 개발 시간 제한. 기말 시즌 전에 의미 있는 형태가 동작해야 ROI 있음
  - 비용: 학생 자비. EC2 small + 도메인 + S3(storage + GET) + 외부 LLM 호출 비용. CloudFront/CDN 은 v1 미포함, 비용 보고 결정. 동영상 인코딩 비용 0(외부 생성·업로드).
- 사용자 역량/학습 맥락:
  - CS 기초가 약하므로, 이 프로젝트 자체가 "공부용 + 포트폴리오" 두 목적을 동시에 가진다고 봐야 함
  - 따라서 "최단 거리로 동작하는 MVP" 와 "원리를 이해하고 직접 만든 부분" 사이의 균형이 의사결정 축
- 아직 모르는 것 (resolved 2026-04-30, §1 후속 답변 참고):
  - ~~Q1. 입력 소스~~ → A1: PDF 원본 + 키워드 메모 .md, LLM 호출은 외부 CLI 측에서. 서비스는 결과물 업로드/저장/뷰어 책임만.
  - ~~Q2. 사용자 범위~~ → A2: 본인 + 동기. 간단한 로그인 1종 v1 범위 가능.
  - ~~Q3. 동영상 정의~~ → A3: TTS+슬라이드, 단 Bedrock 미사용. 외부 LLM 으로 사용자가 생성→mp4/링크 업로드. 서비스는 인코딩 책임 없음.
  - 남은 Open Questions:
    - Q4. 인증 방식 1종을 무엇으로? (이메일+비밀번호 자체구현 vs 카카오/구글 OAuth 1종) — v1 범위 결정 필요.
    - Q5. 업로드된 산출물 포맷 표준은? (예: `concept.md`, `summary.md`, `book.md`, `video.mp4` 같은 고정 파일명 / 또는 한 묶음 zip / 또는 JSON manifest + assets) — 데이터 모델·업로드 UX 모두에 영향.
    - Q6. 멀티 과목인가, 단일 과목인가 (v1 시점)?

## §4. Options

최소 2개 이상. "아무것도 안 한다" 도 유효한 옵션이다.

- **Option A — Static-first MVP (read-only 학습 뷰어)**
  - 구성: `lecture-note-organizer` 산출물을 Git 저장소나 단순 폴더에 두고, 빌드 타임에 LLM 으로 (1)개념설명·(2)핵심요약·(3)책 모드 long-form 텍스트를 사전 생성 → 정적 사이트(Next.js SSG 또는 Astro) 로 EC2 small 의 nginx/Node 한 프로세스로 서빙. 동영상은 미포함.
  - 장점: small 인스턴스에 충분, 운영 부담 거의 0, LLM 비용은 빌드 시점에만, 캐싱·검색이 가벼움.
  - 단점: 새 강의 추가 시 매번 빌드/재배포 필요. 멀티유저·로그인·진도 추적 같은 풀스택 학습 가치는 적음.
  - 버릴/보류할 이유: "풀스택 경험" 이라는 사용자의 학습 목표를 절반밖에 못 채움.
- **Option B — Lean fullstack MVP (S3 컨텐츠 + EC2 docker-compose + 게이트 1단) ← 채택 + 확정**
  - 구성:
    - EC2 small 1대 안에 docker network + `docker-compose` 로 (백엔드 / DB / 프론트 서빙) 동거.
    - DB = MySQL or PostgreSQL container (plan 에서 1개 픽).
    - **사용자 컨텐츠는 모두 S3** (`concept.md / summary.md / book.md / video.(mp4|url) / meta.json`, 회차마다 들어 있는 종류만).
    - LLM 추론은 서비스 밖(사용자 로컬 Claude/Codex/Gemini CLI). 사용자가 산출물 묶음을 만들어 게이트 통과 후 presigned URL 로 S3 직접 업로드 → 백엔드가 manifest 읽고 DB 색인.
    - 화면 = (a) 주차별 뷰, (b) 시험범위 뷰. 빈 산출물은 자동 생략.
    - 게이트 = 공유 ID/PW + 4문항 (4/4 정답, 무한 재시도) → 짧은 만료 서명 쿠키.
    - 개발 순서: **로컬 docker-compose 우선 → EC2 small 검증 → 미달 시 폴백**.
  - 장점: 디스크 압박 0(컨텐츠 S3), 풀스택 학습 효과(직접 docker-compose 운영), 비용 거의 EC2 small + S3 standard 만, 4과목·N주차 빌드 없이 추가, 게이트 1단으로 동기 공유 커버.
  - 단점: small 호스트에 백엔드 + DB 동거라 RAM 여유 빠듯 → DB 선정·튜닝 필요. S3 정책(CORS·presigned 만료) 학습 곡선 1회. manifest 스키마는 unknown 키 허용형으로 1회 못 박기.
  - 버릴/보류할 이유: 없음.
- **Option C — Full feature MVP (AI 동영상 + 멀티유저 + 실시간 LLM)**
  - 구성: 사용자가 화면에서 즉석 LLM 질의, AI 가 슬라이드+TTS 로 요약 동영상을 자동 생성, 멀티유저, 진도 추적, 검색.
  - 장점: 최종 비전 그 자체.
  - 단점: small 인스턴스 한계 초과(인코딩 RAM·디스크), LLM 호출 비용 폭증, 1인 개발 일정 초과 위험. 동영상 인코딩·스토리지·CDN 만으로도 별도 인프라.
  - 버릴/보류할 이유: MVP 단계에서는 명백히 과적합. v2/v3 후보로 분리.

## §5. Scope Seed

- 이번 sprint(=MVP 기획) 에 넣을 것:
  - 5대 핵심 기능 (1)개념설명·(2)핵심요약·(3)책 모드·(4)요약 동영상(업로드형)·(5)주차별/시험범위별 뷰의 **요구사항 정의 + 기술 선택**
  - 산출물 업로드 포맷 표준 — `manifest.json + assets/` 스키마 1차안(zip 단일 업로드도 동일 구조로 정규화)
  - EC2 small 위 풀스택 아키텍처 1차안 (백엔드 1프로세스 + DB + 정적 자산 + 업로드 저장소)
  - 게이트 1단 (공유 ID/PW + 질문 1개) 의 인터페이스 1차안 — 세부 정책은 후속
  - 컨텐츠 업로드/색인 파이프라인 (사용자→외부 LLM CLI→manifest+assets 업로드→DB index→뷰어) 1차 흐름
  - 4과목 동시 지원을 전제로 한 `course → week → artifact` + `exam_range` 데이터 모델 1차안
- 이번 sprint 에서 뺄 것:
  - 실제 코드 구현 (다음 sprint)
  - 서비스 내부에서의 LLM 추론·동영상 인코딩 (외부 위탁 고정)
  - 진도 게이미피케이션, 즐겨찾기, 코멘트 같은 부가 기능
  - 권한 분리(viewer 외) / 결제 / 알림
- 다음 sprint 후보:
  - Phase 1: 데이터 스키마 + 업로드 endpoint + 최소 뷰어 (주차별)
  - Phase 2: 시험범위 뷰 + 책 모드(긴 글 reader UI) + 재미요소(문체 톤·진행도 바·삽화 placeholder)
  - Phase 3: 동영상 업로드/재생 + 외부 호스팅(예: S3/유튜브) 링크 모드
  - Phase 4: 동기 공유 (인증 + 단일 viewer 권한) — 또는 Phase 1 과 합쳐서 가져갈 수도 있음(Q4 결과에 따라)

## §6. Plan Seed

`/sfs plan` 으로 넘길 때 필요한 최소 재료.

- Goal:
  - "EC2 small 1대에서 운영 가능한, 외부 LLM 으로 사전 생성된 강의 학습 산출물(개념·요약·책 모드 본문·선택적 동영상) 을 강의/주차/시험범위 단위로 업로드하여 본인+동기가 책처럼 읽을 수 있는 풀스택 서비스의 MVP 기획서를 확정한다."
- Acceptance Criteria 후보 (이번 기획 sprint 의 done 기준):
  - AC1. 5대 핵심 기능 각각이 MVP 포함 / v2 보류 / 폐기 중 어디에 속하는지 표가 있다.
  - AC2. 입력 산출물(외부 LLM 결과) 의 포맷 표준 — `manifest.json + assets/` 스키마 1차안 (산출물 종류·필수/선택 구분·과목/주차/시험범위 태깅 필드 포함) 이 정의돼 있다.
  - AC3. EC2 small 위 1인 운영 기준의 컴포넌트 다이어그램(웹/백엔드/DB/오브젝트 스토리지·디스크/인증) 이 1장 있다.
  - AC4. 업로드→색인→조회 파이프라인이 절차 4~6단계로 적혀 있다.
  - AC5. v1 에 포함/보류되는 항목(특히 동영상 인코딩, 권한 분리, 게이미피케이션) 의 보류 사유가 명시돼 있다.
  - AC6. 게이트(공유 ID/PW + 4문항 본인확인) 의 인터페이스 1차안이 정의돼 있다 — 통과 기준 4/4, 재시도 무한, 정답은 환경변수/secret 보관(평문 커밋 금지), 통과 후 짧은 만료 서명 쿠키 1개.
- AC6-1. 데이터 모델은 4과목(`디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론`) 을 동시에 담을 수 있는 `course → week → artifact` + `exam_range` 구조로 1차 정의돼 있다.
  - AC7. CTO Generator 가 Phase 1 sprint 로 바로 들어갈 수 있는 1차 작업 목록이 도출돼 있다.
- 주요 risk:
  - R1. EC2 small RAM 한계로 backend + DB(MySQL/Postgres container) + 정적 서빙 동거 시 OOM 가능성. → 완화: 로컬 compose 로 동일 형상 검증 후 EC2 검증 → 미달 시 인스턴스 등급 상향 또는 DB 외부화 폴백.
  - R2. manifest 스키마가 흔들리면 사용자 LLM 프롬프트도 같이 흔들림 → 한 번에 못 박고 unknown 키 허용으로 확장.
  - R3. "책 모드 / 재미요소" 가 정성적이라 acceptance 가 흐려질 수 있음 → AC 에 측정 가능한 형태로 풀어 적기.
  - R4. 게이트 정답이 소스/Git 에 노출되면 의미가 사라짐 → 환경변수/secret 채널 강제, 평문 커밋 금지 정책 명시.
  - R5. ~~EC2 small 디스크 한계~~ → S3 단일화로 해소 (Q7 resolved).
  - R6(new). S3 presigned URL 의 만료/CORS 설정 실수로 업로드/다운로드가 깨질 수 있음 → plan 의 데이터 흐름 절차에 명시적 기본값 포함.
- generator agent 가 만들 산출물:
  - `plan.md` (Sprint 목표 / scope / acceptance / risk 정리)
  - 컴포넌트 다이어그램(텍스트 ASCII 또는 mermaid) 1장
  - 데이터 흐름(외부 LLM → 업로드 → DB index → 뷰어) 1다이어그램
  - 5대 기능 분류 표
  - 업로드 산출물 포맷 표준 정의(예: manifest.json + assets/ 형태)
- evaluator agent (CPO) 가 검증할 기준:
  - AC1~AC7 모두 1차 충족 여부
  - YAGNI 위반(EC2 small 제약·1인 운영 제약 위반) 항목 수
  - "책 모드/재미요소" 가 실제로 측정 가능한 기준으로 풀려 있는지
  - 동영상 인코딩·권한 분리가 v1 에서 안전하게 보류돼 있는지
  - 업로드 포맷 표준이 사용자가 외부 LLM 프롬프트로 그대로 시킬 수 있을 정도로 명확한지

### Open Questions

- All resolved as of 2026-04-30:
  - Q1(input=PDF+key.md), Q2(본인+동기), Q3(외부 LLM TTS+슬라이드), Q4(공유ID/PW+4문항), Q4-detail(C교수/디공요일/컴개교수/정통교수), Q4-N(4/4), Q4-rate(무한 재시도), Q5(축소 시작·manifest unknown 키 허용·있는 산출물만 표시), Q6(4과목), Q7(S3 단일화 + EC2 docker-compose + 비용 최소).
- Plan 단계에서 1차 픽이 필요한 항목:
  - DB 선정: MySQL vs PostgreSQL (small RAM 풋프린트 비교 후 1개).
  - 백엔드 언어/프레임워크 1개 (사용자 본업 스택과 정합 우선).
  - 프론트 형태 1개 (Next.js / Vite SPA / 단순 SSR 중 택1).

## §7. G0 Checklist

- [x] raw brief / 대화 메모가 남아 있다 (§1, §8)
- [x] 문제와 성공 상태가 한 줄로 설명된다 (§2)

### file: .sfs-local/sprints/2026-W18-sprint-2/plan.md

---
phase: plan
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T21:05:00+09:00
status: ready-for-review
refined_by: solon-ceo
refined_at: 2026-04-30T21:05:00+09:00
stack:
  backend: "Node.js / NestJS"
  frontend: "Vite (SPA)"
  db: "MySQL 8"
  secret_channel: ".env (local) / EC2 environment"
  deploy: "EC2 small + Docker Compose, S3 for user content"
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

### file: .sfs-local/sprints/2026-W18-sprint-2/log.md

---
phase: do
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
---

# Log — <sprint title>

> Sprint **Do** 단계 작업 로그. 시간순 append 형식. 각 entry 는 1줄 요약 + 필요 시 details.
> `.sfs-local/events.jsonl` 이 machine-readable trace, 본 파일은 human-readable 보강.
> 새 entry 는 본 §1 의 **위쪽** 에 append 권장 (최신 우선).

---

## §1. 작업 로그 (시간순 append)

```
### YYYY-MM-DDTHH:MM:SS+09:00 — <요약>

- 무엇을 했는가
- 왜 했는가 / 어떤 결정에 의한 것인가
- 결과 / 관찰 / 다음 액션
```

<!-- 첫 entry 예시 (삭제 후 실 entry 로 교체) -->

### YYYY-MM-DDTHH:MM:SS+09:00 — sprint kickoff

- `/sfs start` 로 본 sprint dir 생성
- Plan 단계 진입 — `plan.md` 의 R/AC 채우기
- 다음: G1 review 통과 후 Do 진입

## §2. 발견된 결정 / 블로커 (decision log 후보)

- 결정 갈림길 발견 시 `.sfs-local/decisions/<topic>.md` 로 mini-ADR 분리.
- 차단 요소 (외부 답변 대기, 리소스 부족 등) 는 본 섹션에 기록 후 `review.md` 에서 verdict 로 반영.

## §3. CTO 구현 메모

- **CTO Generator persona**: `.sfs-local/personas/cto-generator.md`
- **구현 executor/tool**: claude / codex / gemini / custom / human
- **변경 파일/모듈**:
- **실행한 테스트/스모크 체크**:
- **CPO 에게 넘길 검증 포인트**:

## §4. 다음 단계 / 핸드오프 메모

- G3 Pre-Handoff Gate 통과를 위한 산출물 목록 정리.
- 인계받을 사람이 추가 컨텍스트 없이 진행 가능한 상태 점검.

### file: .sfs-local/sprints/2026-W18-sprint-2/review.md

---
phase: review
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:36:41+09:00
evaluator_role: CPO
evaluator_persona: ".sfs-local/personas/cpo-evaluator.md"
evaluator_executor: "codex"
generator_executor: "claude"
---

# Review — <sprint title>

> Sprint **CPO Evaluator review** 산출물. G2/G3/G4 중 하나의 gate 에 대한 verdict 기록.
> 각 gate review 마다 `.sfs-local/events.jsonl` 의 `review_open` event append.
> SSoT: `gates.md §1` (7-Gate enum) + `05-gate-framework.md §5.1` (매트릭스).
> 동일 sprint 안에서 G2/G3/G4 review 가 여러 번 발생할 경우 본 파일에 §2 섹션을 추가 append.
> 자체검증 방지: CTO Generator 와 CPO Evaluator 는 같은 산출물을 같은 agent instance 가 통과시키지 않는다.

---

## §1. 대상 Gate

- **gate_id**: G2 / G3 / G4 (해당 review 시점에서 1개로 고정)
- **scope**: 본 review 가 평가하는 산출물 / 변경 범위 / 검증 방법
- **trigger**: `/sfs review --gate <id>` 호출 시각
- **CPO persona**: `.sfs-local/personas/cpo-evaluator.md`
- **review executor/tool**: codex / gemini / claude / custom
- **generator executor/tool**: CTO 구현에 사용한 tool

## §2. 평가 항목

### G2 — Design Gate (해당 시)

- [ ] 설계 완성도 (interface 명세, 데이터 모델, 동작 흐름)
- [ ] 위험 요소 식별 / 완화 plan
- [ ] AC 와의 연결 (Plan G1 산출물 참조)

### G3 — Pre-Handoff Gate (해당 시, **binary**)

- [ ] 산출물 self-contained
- [ ] 핸드오프 받을 사람이 추가 컨텍스트 없이 진행 가능
- [ ] verdict ∈ { pass, fail } only (partial 미사용 — `gates.md §2`)

### G4 — Check Gate (해당 시, 5-Axis CPO)

- [ ] 설계 vs 구현 gap (정량)
- [ ] 5-Axis (사용자가치 / 안정성 / 일정 / 비용 / 학습) 점수
- [ ] partial 시 잔여 작업 → 다음 sprint 또는 별도 WU 로 분기

## §3. Verdict

- **verdict**: pass / partial / fail (G3 만 pass/fail)
- **근거 (정량)**: …
- **근거 (정성)**: …
- **partial 시 잔여 항목**: …

## §4. 다음 액션

- pass → CTO 최종 확인 후 G5 retro 진입
- partial → CPO 가 지정한 항목만 CTO 재구현 후 재리뷰
- fail → CTO 재구현 또는 CEO plan/scope 재검토

## §5. CTO 응답 / 재구현 확인

- **CTO 확인**: pass / rework-started / plan-escalation
- **반영한 CPO finding**:
- **재구현 변경 파일/모듈**:
- **재리뷰 필요 여부**:

## §6. CPO Review Invocation Log

`/sfs review` 호출 시 CPO evaluator prompt 가 append 된다.

Return exactly this shape:
Verdict: pass | partial | fail
Evidence checked:
- ...
Findings:
- ...
Required CTO actions:
- ...
Final recommendation:
- ...

```

### 2026-04-30T20:42:08+09:00 — CPO evaluator result recovered (G1)

- executor: `codex`
- generator_executor: `claude`
- source: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T114208Z.stderr.txt`
- recovery_reason: Codex CLI returned non-zero after producing a verdict-shaped result; older SFS script treated this as failure.

```text
Verdict: pass

Evidence checked:
- Embedded brainstorm.md for G0 context, resolved decisions, constraints, and AC seed.
- Embedded plan.md for G1 requirements, measurable AC, scope, anti-AC, stack decisions, and Phase 1 backlog.
- Embedded review.md invocation metadata: generator claude, evaluator codex.
- Embedded git status --short and empty git diff --stat.

Findings:
- G1 passes: requirements, scope, stack decisions, anti-AC, resource constraints, S3 separation, gate policy, and Phase 1 backlog are sufficiently explicit for the next sprint.
- Self-validation risk is low: evidence says CTO Generator was claude and this review is codex, not the same executor/tool.
- Minor evidence gap: no actual component diagram, data model diagram, or manifest schema artifact was embedded. For G1 this is acceptable because the plan defines them as CTO Generator deliverables/backlog items, but they must exist before G2/G3 review.
- Minor product risk: MySQL memory estimate is plausible but not yet verified on EC2 small. The plan correctly carries this into Local<->EC2 parity validation.

Required CTO actions:
- Proceed to Phase 1 planning/implementation from plan.md §6.
- Before G2/G3, produce concrete artifacts for component diagram, data model, manifest schema, and upload/data flow.
- Keep secret answers out of git and provide only .env.example placeholders.

Final recommendation:
- Pass G1 and move to the next gate.
```

### 2026-04-30T20:39:44+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `unknown`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T113944Z.txt`
- run_requested: false
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: unknown
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:
  - 시험 직전, 한 화면 안에서 "주차 1~6 시험범위" 를 책 한 권처럼 처음부터 끝까지 읽고 핵심 요약·꿀팁까지 같이 흡수 가능
  - 단원별로도 "이 주차만 다시 읽기" 가 즉시 됨
  - 사용자가 직접 정리노트를 다시 다듬지 않아도 자동으로 학습용 포맷이 만들어짐

## §3. Constraints / Context

- 기술 제약:
  - 풀스택 단독 구현. 풀타임 일하는 학생 1인 운영 → 운영 부담을 늘리는 컴포넌트(예: 자체 미디어 인코딩 파이프라인, k8s 등) 는 비용 대비 손해
  - 백엔드는 사용자의 본업 영역(Java/Spring 등 추정) → 백엔드는 비교적 자신 있고, 프론트는 상대적으로 약할 가능성 (확인 필요)
- 배포/운영 제약:
  - **하드 상한: EC2 small (≈ 2 vCPU / 2GB RAM)** 1대 가정. EC2 는 docker-compose 로 (백엔드 + DB + 프론트 서빙) 동거. LLM 추론·동영상 인코딩은 인스턴스 안에서 안 돌림.
  - **사용자 컨텐츠 저장은 S3 단일화** (Q7 resolved). EC2 로컬 디스크는 코드/이미지/DB volume 만.
  - **DB 는 same-host docker container** (MySQL or PostgreSQL — plan 에서 1개 픽). RDS 미사용. 본문은 DB 에 안 넣고 S3 키만 색인.
  - 트래픽은 본인 + 동기 4과목 수강생 수준(수십 명) 가정.
  - **개발 절차**: 로컬 docker-compose 로 우선 개발 → 같은 compose 형상으로 EC2 small 검증 → 미달 시 등급 상향 또는 DB 외부화 폴백.
  - **비용 정책**: 무조건 최소화. RDS/CloudFront 미사용 (1차), 프리티어/저렴 채널 우선.
- 시간/비용 제약:
  - 시간: 풀타임 직장 + 학교 → 주당 가용 개발 시간 제한. 기말 시즌 전에 의미 있는 형태가 동작해야 ROI 있음
  - 비용: 학생 자비. EC2 small + 도메인 + S3(storage + GET) + 외부 LLM 호출 비용. CloudFront/CDN 은 v1 미포함, 비용 보고 결정. 동영상 인코딩 비용 0(외부 생성·업로드).
- 사용자 역량/학습 맥락:
  - CS 기초가 약하므로, 이 프로젝트 자체가 "공부용 + 포트폴리오" 두 목적을 동시에 가진다고 봐야 함
  - 따라서 "최단 거리로 동작하는 MVP" 와 "원리를 이해하고 직접 만든 부분" 사이의 균형이 의사결정 축
- 아직 모르는 것 (resolved 2026-04-30, §1 후속 답변 참고):
  - ~~Q1. 입력 소스~~ → A1: PDF 원본 + 키워드 메모 .md, LLM 호출은 외부 CLI 측에서. 서비스는 결과물 업로드/저장/뷰어 책임만.
  - ~~Q2. 사용자 범위~~ → A2: 본인 + 동기. 간단한 로그인 1종 v1 범위 가능.
  - ~~Q3. 동영상 정의~~ → A3: TTS+슬라이드, 단 Bedrock 미사용. 외부 LLM 으로 사용자가 생성→mp4/링크 업로드. 서비스는 인코딩 책임 없음.
  - 남은 Open Questions:
    - Q4. 인증 방식 1종을 무엇으로? (이메일+비밀번호 자체구현 vs 카카오/구글 OAuth 1종) — v1 범위 결정 필요.
    - Q5. 업로드된 산출물 포맷 표준은? (예: `concept.md`, `summary.md`, `book.md`, `video.mp4` 같은 고정 파일명 / 또는 한 묶음 zip / 또는 JSON manifest + assets) — 데이터 모델·업로드 UX 모두에 영향.
    - Q6. 멀티 과목인가, 단일 과목인가 (v1 시점)?

## §4. Options

최소 2개 이상. "아무것도 안 한다" 도 유효한 옵션이다.

- **Option A — Static-first MVP (read-only 학습 뷰어)**
  - 구성: `lecture-note-organizer` 산출물을 Git 저장소나 단순 폴더에 두고, 빌드 타임에 LLM 으로 (1)개념설명·(2)핵심요약·(3)책 모드 long-form 텍스트를 사전 생성 → 정적 사이트(Next.js SSG 또는 Astro) 로 EC2 small 의 nginx/Node 한 프로세스로 서빙. 동영상은 미포함.
  - 장점: small 인스턴스에 충분, 운영 부담 거의 0, LLM 비용은 빌드 시점에만, 캐싱·검색이 가벼움.
  - 단점: 새 강의 추가 시 매번 빌드/재배포 필요. 멀티유저·로그인·진도 추적 같은 풀스택 학습 가치는 적음.
  - 버릴/보류할 이유: "풀스택 경험" 이라는 사용자의 학습 목표를 절반밖에 못 채움.
- **Option B — Lean fullstack MVP (S3 컨텐츠 + EC2 docker-compose + 게이트 1단) ← 채택 + 확정**
  - 구성:
    - EC2 small 1대 안에 docker network + `docker-compose` 로 (백엔드 / DB / 프론트 서빙) 동거.
    - DB = MySQL or PostgreSQL container (plan 에서 1개 픽).
    - **사용자 컨텐츠는 모두 S3** (`concept.md / summary.md / book.md / video.(mp4|url) / meta.json`, 회차마다 들어 있는 종류만).
    - LLM 추론은 서비스 밖(사용자 로컬 Claude/Codex/Gemini CLI). 사용자가 산출물 묶음을 만들어 게이트 통과 후 presigned URL 로 S3 직접 업로드 → 백엔드가 manifest 읽고 DB 색인.
    - 화면 = (a) 주차별 뷰, (b) 시험범위 뷰. 빈 산출물은 자동 생략.
    - 게이트 = 공유 ID/PW + 4문항 (4/4 정답, 무한 재시도) → 짧은 만료 서명 쿠키.
    - 개발 순서: **로컬 docker-compose 우선 → EC2 small 검증 → 미달 시 폴백**.
  - 장점: 디스크 압박 0(컨텐츠 S3), 풀스택 학습 효과(직접 docker-compose 운영), 비용 거의 EC2 small + S3 standard 만, 4과목·N주차 빌드 없이 추가, 게이트 1단으로 동기 공유 커버.
  - 단점: small 호스트에 백엔드 + DB 동거라 RAM 여유 빠듯 → DB 선정·튜닝 필요. S3 정책(CORS·presigned 만료) 학습 곡선 1회. manifest 스키마는 unknown 키 허용형으로 1회 못 박기.
  - 버릴/보류할 이유: 없음.
- **Option C — Full feature MVP (AI 동영상 + 멀티유저 + 실시간 LLM)**
  - 구성: 사용자가 화면에서 즉석 LLM 질의, AI 가 슬라이드+TTS 로 요약 동영상을 자동 생성, 멀티유저, 진도 추적, 검색.
  - 장점: 최종 비전 그 자체.
  - 단점: small 인스턴스 한계 초과(인코딩 RAM·디스크), LLM 호출 비용 폭증, 1인 개발 일정 초과 위험. 동영상 인코딩·스토리지·CDN 만으로도 별도 인프라.
  - 버릴/보류할 이유: MVP 단계에서는 명백히 과적합. v2/v3 후보로 분리.

## §5. Scope Seed

- 이번 sprint(=MVP 기획) 에 넣을 것:
  - 5대 핵심 기능 (1)개념설명·(2)핵심요약·(3)책 모드·(4)요약 동영상(업로드형)·(5)주차별/시험범위별 뷰의 **요구사항 정의 + 기술 선택**
  - 산출물 업로드 포맷 표준 — `manifest.json + assets/` 스키마 1차안(zip 단일 업로드도 동일 구조로 정규화)
  - EC2 small 위 풀스택 아키텍처 1차안 (백엔드 1프로세스 + DB + 정적 자산 + 업로드 저장소)
  - 게이트 1단 (공유 ID/PW + 질문 1개) 의 인터페이스 1차안 — 세부 정책은 후속
  - 컨텐츠 업로드/색인 파이프라인 (사용자→외부 LLM CLI→manifest+assets 업로드→DB index→뷰어) 1차 흐름
  - 4과목 동시 지원을 전제로 한 `course → week → artifact` + `exam_range` 데이터 모델 1차안
- 이번 sprint 에서 뺄 것:
  - 실제 코드 구현 (다음 sprint)
  - 서비스 내부에서의 LLM 추론·동영상 인코딩 (외부 위탁 고정)
  - 진도 게이미피케이션, 즐겨찾기, 코멘트 같은 부가 기능
  - 권한 분리(viewer 외) / 결제 / 알림
- 다음 sprint 후보:
  - Phase 1: 데이터 스키마 + 업로드 endpoint + 최소 뷰어 (주차별)
  - Phase 2: 시험범위 뷰 + 책 모드(긴 글 reader UI) + 재미요소(문체 톤·진행도 바·삽화 placeholder)
  - Phase 3: 동영상 업로드/재생 + 외부 호스팅(예: S3/유튜브) 링크 모드
  - Phase 4: 동기 공유 (인증 + 단일 viewer 권한) — 또는 Phase 1 과 합쳐서 가져갈 수도 있음(Q4 결과에 따라)

## §6. Plan Seed

`/sfs plan` 으로 넘길 때 필요한 최소 재료.

- Goal:
  - "EC2 small 1대에서 운영 가능한, 외부 LLM 으로 사전 생성된 강의 학습 산출물(개념·요약·책 모드 본문·선택적 동영상) 을 강의/주차/시험범위 단위로 업로드하여 본인+동기가 책처럼 읽을 수 있는 풀스택 서비스의 MVP 기획서를 확정한다."
- Acceptance Criteria 후보 (이번 기획 sprint 의 done 기준):
  - AC1. 5대 핵심 기능 각각이 MVP 포함 / v2 보류 / 폐기 중 어디에 속하는지 표가 있다.
  - AC2. 입력 산출물(외부 LLM 결과) 의 포맷 표준 — `manifest.json + assets/` 스키마 1차안 (산출물 종류·필수/선택 구분·과목/주차/시험범위 태깅 필드 포함) 이 정의돼 있다.
  - AC3. EC2 small 위 1인 운영 기준의 컴포넌트 다이어그램(웹/백엔드/DB/오브젝트 스토리지·디스크/인증) 이 1장 있다.
  - AC4. 업로드→색인→조회 파이프라인이 절차 4~6단계로 적혀 있다.
  - AC5. v1 에 포함/보류되는 항목(특히 동영상 인코딩, 권한 분리, 게이미피케이션) 의 보류 사유가 명시돼 있다.
  - AC6. 게이트(공유 ID/PW + 4문항 본인확인) 의 인터페이스 1차안이 정의돼 있다 — 통과 기준 4/4, 재시도 무한, 정답은 환경변수/secret 보관(평문 커밋 금지), 통과 후 짧은 만료 서명 쿠키 1개.
- AC6-1. 데이터 모델은 4과목(`디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론`) 을 동시에 담을 수 있는 `course → week → artifact` + `exam_range` 구조로 1차 정의돼 있다.
  - AC7. CTO Generator 가 Phase 1 sprint 로 바로 들어갈 수 있는 1차 작업 목록이 도출돼 있다.
- 주요 risk:
  - R1. EC2 small RAM 한계로 backend + DB(MySQL/Postgres container) + 정적 서빙 동거 시 OOM 가능성. → 완화: 로컬 compose 로 동일 형상 검증 후 EC2 검증 → 미달 시 인스턴스 등급 상향 또는 DB 외부화 폴백.
  - R2. manifest 스키마가 흔들리면 사용자 LLM 프롬프트도 같이 흔들림 → 한 번에 못 박고 unknown 키 허용으로 확장.
  - R3. "책 모드 / 재미요소" 가 정성적이라 acceptance 가 흐려질 수 있음 → AC 에 측정 가능한 형태로 풀어 적기.
  - R4. 게이트 정답이 소스/Git 에 노출되면 의미가 사라짐 → 환경변수/secret 채널 강제, 평문 커밋 금지 정책 명시.
  - R5. ~~EC2 small 디스크 한계~~ → S3 단일화로 해소 (Q7 resolved).
  - R6(new). S3 presigned URL 의 만료/CORS 설정 실수로 업로드/다운로드가 깨질 수 있음 → plan 의 데이터 흐름 절차에 명시적 기본값 포함.
- generator agent 가 만들 산출물:
  - `plan.md` (Sprint 목표 / scope / acceptance / risk 정리)
  - 컴포넌트 다이어그램(텍스트 ASCII 또는 mermaid) 1장
  - 데이터 흐름(외부 LLM → 업로드 → DB index → 뷰어) 1다이어그램
  - 5대 기능 분류 표
  - 업로드 산출물 포맷 표준 정의(예: manifest.json + assets/ 형태)
- evaluator agent (CPO) 가 검증할 기준:
  - AC1~AC7 모두 1차 충족 여부
  - YAGNI 위반(EC2 small 제약·1인 운영 제약 위반) 항목 수
  - "책 모드/재미요소" 가 실제로 측정 가능한 기준으로 풀려 있는지
  - 동영상 인코딩·권한 분리가 v1 에서 안전하게 보류돼 있는지
  - 업로드 포맷 표준이 사용자가 외부 LLM 프롬프트로 그대로 시킬 수 있을 정도로 명확한지

### Open Questions

- All resolved as of 2026-04-30:
  - Q1(input=PDF+key.md), Q2(본인+동기), Q3(외부 LLM TTS+슬라이드), Q4(공유ID/PW+4문항), Q4-detail(C교수/디공요일/컴개교수/정통교수), Q4-N(4/4), Q4-rate(무한 재시도), Q5(축소 시작·manifest unknown 키 허용·있는 산출물만 표시), Q6(4과목), Q7(S3 단일화 + EC2 docker-compose + 비용 최소).
- Plan 단계에서 1차 픽이 필요한 항목:
  - DB 선정: MySQL vs PostgreSQL (small RAM 풋프린트 비교 후 1개).
  - 백엔드 언어/프레임워크 1개 (사용자 본업 스택과 정합 우선).
  - 프론트 형태 1개 (Next.js / Vite SPA / 단순 SSR 중 택1).

## §7. G0 Checklist

- [x] raw brief / 대화 메모가 남아 있다 (§1, §8)
- [x] 문제와 성공 상태가 한 줄로 설명된다 (§2)

### file: .sfs-local/sprints/2026-W18-sprint-2/plan.md

---
phase: plan
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T21:05:00+09:00
status: ready-for-review
refined_by: solon-ceo
refined_at: 2026-04-30T21:05:00+09:00
stack:
  backend: "Node.js / NestJS"
  frontend: "Vite (SPA)"
  db: "MySQL 8"
  secret_channel: ".env (local) / EC2 environment"
  deploy: "EC2 small + Docker Compose, S3 for user content"
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

### file: .sfs-local/sprints/2026-W18-sprint-2/log.md

---
phase: do
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
---

# Log — <sprint title>

> Sprint **Do** 단계 작업 로그. 시간순 append 형식. 각 entry 는 1줄 요약 + 필요 시 details.
> `.sfs-local/events.jsonl` 이 machine-readable trace, 본 파일은 human-readable 보강.
> 새 entry 는 본 §1 의 **위쪽** 에 append 권장 (최신 우선).

---

## §1. 작업 로그 (시간순 append)

```
### YYYY-MM-DDTHH:MM:SS+09:00 — <요약>

- 무엇을 했는가
- 왜 했는가 / 어떤 결정에 의한 것인가
- 결과 / 관찰 / 다음 액션
```

<!-- 첫 entry 예시 (삭제 후 실 entry 로 교체) -->

### YYYY-MM-DDTHH:MM:SS+09:00 — sprint kickoff

- `/sfs start` 로 본 sprint dir 생성
- Plan 단계 진입 — `plan.md` 의 R/AC 채우기
- 다음: G1 review 통과 후 Do 진입

## §2. 발견된 결정 / 블로커 (decision log 후보)

- 결정 갈림길 발견 시 `.sfs-local/decisions/<topic>.md` 로 mini-ADR 분리.
- 차단 요소 (외부 답변 대기, 리소스 부족 등) 는 본 섹션에 기록 후 `review.md` 에서 verdict 로 반영.

## §3. CTO 구현 메모

- **CTO Generator persona**: `.sfs-local/personas/cto-generator.md`
- **구현 executor/tool**: claude / codex / gemini / custom / human
- **변경 파일/모듈**:
- **실행한 테스트/스모크 체크**:
- **CPO 에게 넘길 검증 포인트**:

## §4. 다음 단계 / 핸드오프 메모

- G3 Pre-Handoff Gate 통과를 위한 산출물 목록 정리.
- 인계받을 사람이 추가 컨텍스트 없이 진행 가능한 상태 점검.

### file: .sfs-local/sprints/2026-W18-sprint-2/review.md

---
phase: review
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:39:44+09:00
evaluator_role: CPO
evaluator_persona: ".sfs-local/personas/cpo-evaluator.md"
evaluator_executor: "codex"
generator_executor: "unknown"
---

# Review — <sprint title>

> Sprint **CPO Evaluator review** 산출물. G2/G3/G4 중 하나의 gate 에 대한 verdict 기록.
> 각 gate review 마다 `.sfs-local/events.jsonl` 의 `review_open` event append.
> SSoT: `gates.md §1` (7-Gate enum) + `05-gate-framework.md §5.1` (매트릭스).
> 동일 sprint 안에서 G2/G3/G4 review 가 여러 번 발생할 경우 본 파일에 §2 섹션을 추가 append.
> 자체검증 방지: CTO Generator 와 CPO Evaluator 는 같은 산출물을 같은 agent instance 가 통과시키지 않는다.

---

## §1. 대상 Gate

- **gate_id**: G2 / G3 / G4 (해당 review 시점에서 1개로 고정)
- **scope**: 본 review 가 평가하는 산출물 / 변경 범위 / 검증 방법
- **trigger**: `/sfs review --gate <id>` 호출 시각
- **CPO persona**: `.sfs-local/personas/cpo-evaluator.md`
- **review executor/tool**: codex / gemini / claude / custom
- **generator executor/tool**: CTO 구현에 사용한 tool

## §2. 평가 항목

### G2 — Design Gate (해당 시)

- [ ] 설계 완성도 (interface 명세, 데이터 모델, 동작 흐름)
- [ ] 위험 요소 식별 / 완화 plan
- [ ] AC 와의 연결 (Plan G1 산출물 참조)

### G3 — Pre-Handoff Gate (해당 시, **binary**)

- [ ] 산출물 self-contained
- [ ] 핸드오프 받을 사람이 추가 컨텍스트 없이 진행 가능
- [ ] verdict ∈ { pass, fail } only (partial 미사용 — `gates.md §2`)

### G4 — Check Gate (해당 시, 5-Axis CPO)

- [ ] 설계 vs 구현 gap (정량)
- [ ] 5-Axis (사용자가치 / 안정성 / 일정 / 비용 / 학습) 점수
- [ ] partial 시 잔여 작업 → 다음 sprint 또는 별도 WU 로 분기

## §3. Verdict

- **verdict**: pass / partial / fail (G3 만 pass/fail)
- **근거 (정량)**: …
- **근거 (정성)**: …
- **partial 시 잔여 항목**: …

## §4. 다음 액션

- pass → CTO 최종 확인 후 G5 retro 진입
- partial → CPO 가 지정한 항목만 CTO 재구현 후 재리뷰
- fail → CTO 재구현 또는 CEO plan/scope 재검토

## §5. CTO 응답 / 재구현 확인

- **CTO 확인**: pass / rework-started / plan-escalation
- **반영한 CPO finding**:
- **재구현 변경 파일/모듈**:
- **재리뷰 필요 여부**:

## §6. CPO Review Invocation Log

`/sfs review` 호출 시 CPO evaluator prompt 가 append 된다.

### 2026-04-30T20:36:41+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T113641Z.txt`
- run_requested: false
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:

Return exactly this shape:
Verdict: pass | partial | fail
Evidence checked:
- ...
Findings:
- ...
Required CTO actions:
- ...
Final recommendation:
- ...

```

### 2026-04-30T20:42:08+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T114208Z.txt`
- run_requested: true
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:
  - 시험 직전, 한 화면 안에서 "주차 1~6 시험범위" 를 책 한 권처럼 처음부터 끝까지 읽고 핵심 요약·꿀팁까지 같이 흡수 가능
  - 단원별로도 "이 주차만 다시 읽기" 가 즉시 됨
  - 사용자가 직접 정리노트를 다시 다듬지 않아도 자동으로 학습용 포맷이 만들어짐

## §3. Constraints / Context

- 기술 제약:
  - 풀스택 단독 구현. 풀타임 일하는 학생 1인 운영 → 운영 부담을 늘리는 컴포넌트(예: 자체 미디어 인코딩 파이프라인, k8s 등) 는 비용 대비 손해
  - 백엔드는 사용자의 본업 영역(Java/Spring 등 추정) → 백엔드는 비교적 자신 있고, 프론트는 상대적으로 약할 가능성 (확인 필요)
- 배포/운영 제약:
  - **하드 상한: EC2 small (≈ 2 vCPU / 2GB RAM)** 1대 가정. EC2 는 docker-compose 로 (백엔드 + DB + 프론트 서빙) 동거. LLM 추론·동영상 인코딩은 인스턴스 안에서 안 돌림.
  - **사용자 컨텐츠 저장은 S3 단일화** (Q7 resolved). EC2 로컬 디스크는 코드/이미지/DB volume 만.
  - **DB 는 same-host docker container** (MySQL or PostgreSQL — plan 에서 1개 픽). RDS 미사용. 본문은 DB 에 안 넣고 S3 키만 색인.
  - 트래픽은 본인 + 동기 4과목 수강생 수준(수십 명) 가정.
  - **개발 절차**: 로컬 docker-compose 로 우선 개발 → 같은 compose 형상으로 EC2 small 검증 → 미달 시 등급 상향 또는 DB 외부화 폴백.
  - **비용 정책**: 무조건 최소화. RDS/CloudFront 미사용 (1차), 프리티어/저렴 채널 우선.
- 시간/비용 제약:
  - 시간: 풀타임 직장 + 학교 → 주당 가용 개발 시간 제한. 기말 시즌 전에 의미 있는 형태가 동작해야 ROI 있음
  - 비용: 학생 자비. EC2 small + 도메인 + S3(storage + GET) + 외부 LLM 호출 비용. CloudFront/CDN 은 v1 미포함, 비용 보고 결정. 동영상 인코딩 비용 0(외부 생성·업로드).
- 사용자 역량/학습 맥락:
  - CS 기초가 약하므로, 이 프로젝트 자체가 "공부용 + 포트폴리오" 두 목적을 동시에 가진다고 봐야 함
  - 따라서 "최단 거리로 동작하는 MVP" 와 "원리를 이해하고 직접 만든 부분" 사이의 균형이 의사결정 축
- 아직 모르는 것 (resolved 2026-04-30, §1 후속 답변 참고):
  - ~~Q1. 입력 소스~~ → A1: PDF 원본 + 키워드 메모 .md, LLM 호출은 외부 CLI 측에서. 서비스는 결과물 업로드/저장/뷰어 책임만.
  - ~~Q2. 사용자 범위~~ → A2: 본인 + 동기. 간단한 로그인 1종 v1 범위 가능.
  - ~~Q3. 동영상 정의~~ → A3: TTS+슬라이드, 단 Bedrock 미사용. 외부 LLM 으로 사용자가 생성→mp4/링크 업로드. 서비스는 인코딩 책임 없음.
  - 남은 Open Questions:
    - Q4. 인증 방식 1종을 무엇으로? (이메일+비밀번호 자체구현 vs 카카오/구글 OAuth 1종) — v1 범위 결정 필요.
    - Q5. 업로드된 산출물 포맷 표준은? (예: `concept.md`, `summary.md`, `book.md`, `video.mp4` 같은 고정 파일명 / 또는 한 묶음 zip / 또는 JSON manifest + assets) — 데이터 모델·업로드 UX 모두에 영향.
    - Q6. 멀티 과목인가, 단일 과목인가 (v1 시점)?

## §4. Options

최소 2개 이상. "아무것도 안 한다" 도 유효한 옵션이다.

- **Option A — Static-first MVP (read-only 학습 뷰어)**
  - 구성: `lecture-note-organizer` 산출물을 Git 저장소나 단순 폴더에 두고, 빌드 타임에 LLM 으로 (1)개념설명·(2)핵심요약·(3)책 모드 long-form 텍스트를 사전 생성 → 정적 사이트(Next.js SSG 또는 Astro) 로 EC2 small 의 nginx/Node 한 프로세스로 서빙. 동영상은 미포함.
  - 장점: small 인스턴스에 충분, 운영 부담 거의 0, LLM 비용은 빌드 시점에만, 캐싱·검색이 가벼움.
  - 단점: 새 강의 추가 시 매번 빌드/재배포 필요. 멀티유저·로그인·진도 추적 같은 풀스택 학습 가치는 적음.
  - 버릴/보류할 이유: "풀스택 경험" 이라는 사용자의 학습 목표를 절반밖에 못 채움.
- **Option B — Lean fullstack MVP (S3 컨텐츠 + EC2 docker-compose + 게이트 1단) ← 채택 + 확정**
  - 구성:
    - EC2 small 1대 안에 docker network + `docker-compose` 로 (백엔드 / DB / 프론트 서빙) 동거.
    - DB = MySQL or PostgreSQL container (plan 에서 1개 픽).
    - **사용자 컨텐츠는 모두 S3** (`concept.md / summary.md / book.md / video.(mp4|url) / meta.json`, 회차마다 들어 있는 종류만).
    - LLM 추론은 서비스 밖(사용자 로컬 Claude/Codex/Gemini CLI). 사용자가 산출물 묶음을 만들어 게이트 통과 후 presigned URL 로 S3 직접 업로드 → 백엔드가 manifest 읽고 DB 색인.
    - 화면 = (a) 주차별 뷰, (b) 시험범위 뷰. 빈 산출물은 자동 생략.
    - 게이트 = 공유 ID/PW + 4문항 (4/4 정답, 무한 재시도) → 짧은 만료 서명 쿠키.
    - 개발 순서: **로컬 docker-compose 우선 → EC2 small 검증 → 미달 시 폴백**.
  - 장점: 디스크 압박 0(컨텐츠 S3), 풀스택 학습 효과(직접 docker-compose 운영), 비용 거의 EC2 small + S3 standard 만, 4과목·N주차 빌드 없이 추가, 게이트 1단으로 동기 공유 커버.
  - 단점: small 호스트에 백엔드 + DB 동거라 RAM 여유 빠듯 → DB 선정·튜닝 필요. S3 정책(CORS·presigned 만료) 학습 곡선 1회. manifest 스키마는 unknown 키 허용형으로 1회 못 박기.
  - 버릴/보류할 이유: 없음.
- **Option C — Full feature MVP (AI 동영상 + 멀티유저 + 실시간 LLM)**
  - 구성: 사용자가 화면에서 즉석 LLM 질의, AI 가 슬라이드+TTS 로 요약 동영상을 자동 생성, 멀티유저, 진도 추적, 검색.
  - 장점: 최종 비전 그 자체.
  - 단점: small 인스턴스 한계 초과(인코딩 RAM·디스크), LLM 호출 비용 폭증, 1인 개발 일정 초과 위험. 동영상 인코딩·스토리지·CDN 만으로도 별도 인프라.
  - 버릴/보류할 이유: MVP 단계에서는 명백히 과적합. v2/v3 후보로 분리.

## §5. Scope Seed

- 이번 sprint(=MVP 기획) 에 넣을 것:
  - 5대 핵심 기능 (1)개념설명·(2)핵심요약·(3)책 모드·(4)요약 동영상(업로드형)·(5)주차별/시험범위별 뷰의 **요구사항 정의 + 기술 선택**
  - 산출물 업로드 포맷 표준 — `manifest.json + assets/` 스키마 1차안(zip 단일 업로드도 동일 구조로 정규화)
  - EC2 small 위 풀스택 아키텍처 1차안 (백엔드 1프로세스 + DB + 정적 자산 + 업로드 저장소)
  - 게이트 1단 (공유 ID/PW + 질문 1개) 의 인터페이스 1차안 — 세부 정책은 후속
  - 컨텐츠 업로드/색인 파이프라인 (사용자→외부 LLM CLI→manifest+assets 업로드→DB index→뷰어) 1차 흐름
  - 4과목 동시 지원을 전제로 한 `course → week → artifact` + `exam_range` 데이터 모델 1차안
- 이번 sprint 에서 뺄 것:
  - 실제 코드 구현 (다음 sprint)
  - 서비스 내부에서의 LLM 추론·동영상 인코딩 (외부 위탁 고정)
  - 진도 게이미피케이션, 즐겨찾기, 코멘트 같은 부가 기능
  - 권한 분리(viewer 외) / 결제 / 알림
- 다음 sprint 후보:
  - Phase 1: 데이터 스키마 + 업로드 endpoint + 최소 뷰어 (주차별)
  - Phase 2: 시험범위 뷰 + 책 모드(긴 글 reader UI) + 재미요소(문체 톤·진행도 바·삽화 placeholder)
  - Phase 3: 동영상 업로드/재생 + 외부 호스팅(예: S3/유튜브) 링크 모드
  - Phase 4: 동기 공유 (인증 + 단일 viewer 권한) — 또는 Phase 1 과 합쳐서 가져갈 수도 있음(Q4 결과에 따라)

## §6. Plan Seed

`/sfs plan` 으로 넘길 때 필요한 최소 재료.

- Goal:
  - "EC2 small 1대에서 운영 가능한, 외부 LLM 으로 사전 생성된 강의 학습 산출물(개념·요약·책 모드 본문·선택적 동영상) 을 강의/주차/시험범위 단위로 업로드하여 본인+동기가 책처럼 읽을 수 있는 풀스택 서비스의 MVP 기획서를 확정한다."
- Acceptance Criteria 후보 (이번 기획 sprint 의 done 기준):
  - AC1. 5대 핵심 기능 각각이 MVP 포함 / v2 보류 / 폐기 중 어디에 속하는지 표가 있다.
  - AC2. 입력 산출물(외부 LLM 결과) 의 포맷 표준 — `manifest.json + assets/` 스키마 1차안 (산출물 종류·필수/선택 구분·과목/주차/시험범위 태깅 필드 포함) 이 정의돼 있다.
  - AC3. EC2 small 위 1인 운영 기준의 컴포넌트 다이어그램(웹/백엔드/DB/오브젝트 스토리지·디스크/인증) 이 1장 있다.
  - AC4. 업로드→색인→조회 파이프라인이 절차 4~6단계로 적혀 있다.
  - AC5. v1 에 포함/보류되는 항목(특히 동영상 인코딩, 권한 분리, 게이미피케이션) 의 보류 사유가 명시돼 있다.
  - AC6. 게이트(공유 ID/PW + 4문항 본인확인) 의 인터페이스 1차안이 정의돼 있다 — 통과 기준 4/4, 재시도 무한, 정답은 환경변수/secret 보관(평문 커밋 금지), 통과 후 짧은 만료 서명 쿠키 1개.
- AC6-1. 데이터 모델은 4과목(`디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론`) 을 동시에 담을 수 있는 `course → week → artifact` + `exam_range` 구조로 1차 정의돼 있다.
  - AC7. CTO Generator 가 Phase 1 sprint 로 바로 들어갈 수 있는 1차 작업 목록이 도출돼 있다.
- 주요 risk:
  - R1. EC2 small RAM 한계로 backend + DB(MySQL/Postgres container) + 정적 서빙 동거 시 OOM 가능성. → 완화: 로컬 compose 로 동일 형상 검증 후 EC2 검증 → 미달 시 인스턴스 등급 상향 또는 DB 외부화 폴백.
  - R2. manifest 스키마가 흔들리면 사용자 LLM 프롬프트도 같이 흔들림 → 한 번에 못 박고 unknown 키 허용으로 확장.
  - R3. "책 모드 / 재미요소" 가 정성적이라 acceptance 가 흐려질 수 있음 → AC 에 측정 가능한 형태로 풀어 적기.
  - R4. 게이트 정답이 소스/Git 에 노출되면 의미가 사라짐 → 환경변수/secret 채널 강제, 평문 커밋 금지 정책 명시.
  - R5. ~~EC2 small 디스크 한계~~ → S3 단일화로 해소 (Q7 resolved).
  - R6(new). S3 presigned URL 의 만료/CORS 설정 실수로 업로드/다운로드가 깨질 수 있음 → plan 의 데이터 흐름 절차에 명시적 기본값 포함.
- generator agent 가 만들 산출물:
  - `plan.md` (Sprint 목표 / scope / acceptance / risk 정리)
  - 컴포넌트 다이어그램(텍스트 ASCII 또는 mermaid) 1장
  - 데이터 흐름(외부 LLM → 업로드 → DB index → 뷰어) 1다이어그램
  - 5대 기능 분류 표
  - 업로드 산출물 포맷 표준 정의(예: manifest.json + assets/ 형태)
- evaluator agent (CPO) 가 검증할 기준:
  - AC1~AC7 모두 1차 충족 여부
  - YAGNI 위반(EC2 small 제약·1인 운영 제약 위반) 항목 수
  - "책 모드/재미요소" 가 실제로 측정 가능한 기준으로 풀려 있는지
  - 동영상 인코딩·권한 분리가 v1 에서 안전하게 보류돼 있는지
  - 업로드 포맷 표준이 사용자가 외부 LLM 프롬프트로 그대로 시킬 수 있을 정도로 명확한지

### Open Questions

- All resolved as of 2026-04-30:
  - Q1(input=PDF+key.md), Q2(본인+동기), Q3(외부 LLM TTS+슬라이드), Q4(공유ID/PW+4문항), Q4-detail(C교수/디공요일/컴개교수/정통교수), Q4-N(4/4), Q4-rate(무한 재시도), Q5(축소 시작·manifest unknown 키 허용·있는 산출물만 표시), Q6(4과목), Q7(S3 단일화 + EC2 docker-compose + 비용 최소).
- Plan 단계에서 1차 픽이 필요한 항목:
  - DB 선정: MySQL vs PostgreSQL (small RAM 풋프린트 비교 후 1개).
  - 백엔드 언어/프레임워크 1개 (사용자 본업 스택과 정합 우선).
  - 프론트 형태 1개 (Next.js / Vite SPA / 단순 SSR 중 택1).

## §7. G0 Checklist

- [x] raw brief / 대화 메모가 남아 있다 (§1, §8)
- [x] 문제와 성공 상태가 한 줄로 설명된다 (§2)

### file: .sfs-local/sprints/2026-W18-sprint-2/plan.md

---
phase: plan
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T21:05:00+09:00
status: ready-for-review
refined_by: solon-ceo
refined_at: 2026-04-30T21:05:00+09:00
stack:
  backend: "Node.js / NestJS"
  frontend: "Vite (SPA)"
  db: "MySQL 8"
  secret_channel: ".env (local) / EC2 environment"
  deploy: "EC2 small + Docker Compose, S3 for user content"
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

### file: .sfs-local/sprints/2026-W18-sprint-2/log.md

---
phase: do
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
---

# Log — <sprint title>

> Sprint **Do** 단계 작업 로그. 시간순 append 형식. 각 entry 는 1줄 요약 + 필요 시 details.
> `.sfs-local/events.jsonl` 이 machine-readable trace, 본 파일은 human-readable 보강.
> 새 entry 는 본 §1 의 **위쪽** 에 append 권장 (최신 우선).

---

## §1. 작업 로그 (시간순 append)

```
### YYYY-MM-DDTHH:MM:SS+09:00 — <요약>

- 무엇을 했는가
- 왜 했는가 / 어떤 결정에 의한 것인가
- 결과 / 관찰 / 다음 액션
```

<!-- 첫 entry 예시 (삭제 후 실 entry 로 교체) -->

### YYYY-MM-DDTHH:MM:SS+09:00 — sprint kickoff

- `/sfs start` 로 본 sprint dir 생성
- Plan 단계 진입 — `plan.md` 의 R/AC 채우기
- 다음: G1 review 통과 후 Do 진입

## §2. 발견된 결정 / 블로커 (decision log 후보)

- 결정 갈림길 발견 시 `.sfs-local/decisions/<topic>.md` 로 mini-ADR 분리.
- 차단 요소 (외부 답변 대기, 리소스 부족 등) 는 본 섹션에 기록 후 `review.md` 에서 verdict 로 반영.

## §3. CTO 구현 메모

- **CTO Generator persona**: `.sfs-local/personas/cto-generator.md`
- **구현 executor/tool**: claude / codex / gemini / custom / human
- **변경 파일/모듈**:
- **실행한 테스트/스모크 체크**:
- **CPO 에게 넘길 검증 포인트**:

## §4. 다음 단계 / 핸드오프 메모

- G3 Pre-Handoff Gate 통과를 위한 산출물 목록 정리.
- 인계받을 사람이 추가 컨텍스트 없이 진행 가능한 상태 점검.

### file: .sfs-local/sprints/2026-W18-sprint-2/review.md

---
phase: review
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:42:08+09:00
evaluator_role: CPO
evaluator_persona: ".sfs-local/personas/cpo-evaluator.md"
evaluator_executor: "codex"
generator_executor: "claude"
---

# Review — <sprint title>

> Sprint **CPO Evaluator review** 산출물. G2/G3/G4 중 하나의 gate 에 대한 verdict 기록.
> 각 gate review 마다 `.sfs-local/events.jsonl` 의 `review_open` event append.
> SSoT: `gates.md §1` (7-Gate enum) + `05-gate-framework.md §5.1` (매트릭스).
> 동일 sprint 안에서 G2/G3/G4 review 가 여러 번 발생할 경우 본 파일에 §2 섹션을 추가 append.
> 자체검증 방지: CTO Generator 와 CPO Evaluator 는 같은 산출물을 같은 agent instance 가 통과시키지 않는다.

---

## §1. 대상 Gate

- **gate_id**: G2 / G3 / G4 (해당 review 시점에서 1개로 고정)
- **scope**: 본 review 가 평가하는 산출물 / 변경 범위 / 검증 방법
- **trigger**: `/sfs review --gate <id>` 호출 시각
- **CPO persona**: `.sfs-local/personas/cpo-evaluator.md`
- **review executor/tool**: codex / gemini / claude / custom
- **generator executor/tool**: CTO 구현에 사용한 tool

## §2. 평가 항목

### G2 — Design Gate (해당 시)

- [ ] 설계 완성도 (interface 명세, 데이터 모델, 동작 흐름)
- [ ] 위험 요소 식별 / 완화 plan
- [ ] AC 와의 연결 (Plan G1 산출물 참조)

### G3 — Pre-Handoff Gate (해당 시, **binary**)

- [ ] 산출물 self-contained
- [ ] 핸드오프 받을 사람이 추가 컨텍스트 없이 진행 가능
- [ ] verdict ∈ { pass, fail } only (partial 미사용 — `gates.md §2`)

### G4 — Check Gate (해당 시, 5-Axis CPO)

- [ ] 설계 vs 구현 gap (정량)
- [ ] 5-Axis (사용자가치 / 안정성 / 일정 / 비용 / 학습) 점수
- [ ] partial 시 잔여 작업 → 다음 sprint 또는 별도 WU 로 분기

## §3. Verdict

- **verdict**: pass / partial / fail (G3 만 pass/fail)
- **근거 (정량)**: …
- **근거 (정성)**: …
- **partial 시 잔여 항목**: …

## §4. 다음 액션

- pass → CTO 최종 확인 후 G5 retro 진입
- partial → CPO 가 지정한 항목만 CTO 재구현 후 재리뷰
- fail → CTO 재구현 또는 CEO plan/scope 재검토

## §5. CTO 응답 / 재구현 확인

- **CTO 확인**: pass / rework-started / plan-escalation
- **반영한 CPO finding**:
- **재구현 변경 파일/모듈**:
- **재리뷰 필요 여부**:

## §6. CPO Review Invocation Log

`/sfs review` 호출 시 CPO evaluator prompt 가 append 된다.

### 2026-04-30T20:36:41+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T113641Z.txt`
- run_requested: false
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:

Return exactly this shape:
Verdict: pass | partial | fail
Evidence checked:
- ...
Findings:
- ...
Required CTO actions:
- ...
Final recommendation:
- ...

```

### 2026-04-30T20:42:08+09:00 — CPO evaluator result (G1)

- executor: `codex`
- executor_cmd: `codex exec --full-auto`
- exit_code: `0`
- stdout_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T114208Z.stdout.md`
- stderr_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T114208Z.stderr.txt`

```text
Verdict: pass

Evidence checked:
- Embedded `brainstorm.md` for G0 context, resolved decisions, constraints, and AC seed.
- Embedded `plan.md` for G1 requirements, measurable AC, scope, anti-AC, stack decisions, and Phase 1 backlog.
- Embedded `review.md` invocation metadata: generator `claude`, evaluator `codex`.
- Embedded `git status --short` and empty `git diff --stat`.

Findings:
- G1 passes: requirements, scope, stack decisions, anti-AC, resource constraints, S3 separation, gate policy, and Phase 1 backlog are sufficiently explicit for the next sprint.
- Self-validation risk is low: evidence says CTO Generator was `claude` and this review is `codex`, not the same executor/tool.
- Minor evidence gap: no actual component diagram, data model diagram, or manifest schema artifact was embedded. For G1 this is acceptable because the plan defines them as CTO Generator deliverables/backlog items, but they must exist before G2/G3 review.
- Minor product risk: MySQL memory estimate is plausible but not yet verified on EC2 small. The plan correctly carries this into Local↔EC2 parity validation.

Required CTO actions:
- Proceed to Phase 1 planning/implementation from §6.
- Before G2/G3, produce concrete artifacts for component diagram, data model, manifest schema, and upload/data flow.
- Keep secret answers out of git and provide only `.env.example` placeholders.

Final recommendation:
- Pass G1 and move to the next gate. The plan is sufficiently bounded, measurable, and aligned with EC2 small + S3 + external LLM constraints.

```

#### stderr

```text
Reading prompt from stdin...
OpenAI Codex v0.125.0 (research preview)
--------
workdir: /Users/mj/Soongsil
model: gpt-5.5
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR, /Users/mj/.codex/memories]
reasoning effort: xhigh
reasoning summaries: none
session id: 019dde32-4369-7721-9ea3-8c69f83b3aac
--------
user
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:
  - 시험 직전, 한 화면 안에서 "주차 1~6 시험범위" 를 책 한 권처럼 처음부터 끝까지 읽고 핵심 요약·꿀팁까지 같이 흡수 가능
  - 단원별로도 "이 주차만 다시 읽기" 가 즉시 됨
  - 사용자가 직접 정리노트를 다시 다듬지 않아도 자동으로 학습용 포맷이 만들어짐

## §3. Constraints / Context

- 기술 제약:
  - 풀스택 단독 구현. 풀타임 일하는 학생 1인 운영 → 운영 부담을 늘리는 컴포넌트(예: 자체 미디어 인코딩 파이프라인, k8s 등) 는 비용 대비 손해
  - 백엔드는 사용자의 본업 영역(Java/Spring 등 추정) → 백엔드는 비교적 자신 있고, 프론트는 상대적으로 약할 가능성 (확인 필요)
- 배포/운영 제약:
  - **하드 상한: EC2 small (≈ 2 vCPU / 2GB RAM)** 1대 가정. EC2 는 docker-compose 로 (백엔드 + DB + 프론트 서빙) 동거. LLM 추론·동영상 인코딩은 인스턴스 안에서 안 돌림.
  - **사용자 컨텐츠 저장은 S3 단일화** (Q7 resolved). EC2 로컬 디스크는 코드/이미지/DB volume 만.
  - **DB 는 same-host docker container** (MySQL or PostgreSQL — plan 에서 1개 픽). RDS 미사용. 본문은 DB 에 안 넣고 S3 키만 색인.
  - 트래픽은 본인 + 동기 4과목 수강생 수준(수십 명) 가정.
  - **개발 절차**: 로컬 docker-compose 로 우선 개발 → 같은 compose 형상으로 EC2 small 검증 → 미달 시 등급 상향 또는 DB 외부화 폴백.
  - **비용 정책**: 무조건 최소화. RDS/CloudFront 미사용 (1차), 프리티어/저렴 채널 우선.
- 시간/비용 제약:
  - 시간: 풀타임 직장 + 학교 → 주당 가용 개발 시간 제한. 기말 시즌 전에 의미 있는 형태가 동작해야 ROI 있음
  - 비용: 학생 자비. EC2 small + 도메인 + S3(storage + GET) + 외부 LLM 호출 비용. CloudFront/CDN 은 v1 미포함, 비용 보고 결정. 동영상 인코딩 비용 0(외부 생성·업로드).
- 사용자 역량/학습 맥락:
  - CS 기초가 약하므로, 이 프로젝트 자체가 "공부용 + 포트폴리오" 두 목적을 동시에 가진다고 봐야 함
  - 따라서 "최단 거리로 동작하는 MVP" 와 "원리를 이해하고 직접 만든 부분" 사이의 균형이 의사결정 축
- 아직 모르는 것 (resolved 2026-04-30, §1 후속 답변 참고):
  - ~~Q1. 입력 소스~~ → A1: PDF 원본 + 키워드 메모 .md, LLM 호출은 외부 CLI 측에서. 서비스는 결과물 업로드/저장/뷰어 책임만.
  - ~~Q2. 사용자 범위~~ → A2: 본인 + 동기. 간단한 로그인 1종 v1 범위 가능.
  - ~~Q3. 동영상 정의~~ → A3: TTS+슬라이드, 단 Bedrock 미사용. 외부 LLM 으로 사용자가 생성→mp4/링크 업로드. 서비스는 인코딩 책임 없음.
  - 남은 Open Questions:
    - Q4. 인증 방식 1종을 무엇으로? (이메일+비밀번호 자체구현 vs 카카오/구글 OAuth 1종) — v1 범위 결정 필요.
    - Q5. 업로드된 산출물 포맷 표준은? (예: `concept.md`, `summary.md`, `book.md`, `video.mp4` 같은 고정 파일명 / 또는 한 묶음 zip / 또는 JSON manifest + assets) — 데이터 모델·업로드 UX 모두에 영향.
    - Q6. 멀티 과목인가, 단일 과목인가 (v1 시점)?

## §4. Options

최소 2개 이상. "아무것도 안 한다" 도 유효한 옵션이다.

- **Option A — Static-first MVP (read-only 학습 뷰어)**
  - 구성: `lecture-note-organizer` 산출물을 Git 저장소나 단순 폴더에 두고, 빌드 타임에 LLM 으로 (1)개념설명·(2)핵심요약·(3)책 모드 long-form 텍스트를 사전 생성 → 정적 사이트(Next.js SSG 또는 Astro) 로 EC2 small 의 nginx/Node 한 프로세스로 서빙. 동영상은 미포함.
  - 장점: small 인스턴스에 충분, 운영 부담 거의 0, LLM 비용은 빌드 시점에만, 캐싱·검색이 가벼움.
  - 단점: 새 강의 추가 시 매번 빌드/재배포 필요. 멀티유저·로그인·진도 추적 같은 풀스택 학습 가치는 적음.
  - 버릴/보류할 이유: "풀스택 경험" 이라는 사용자의 학습 목표를 절반밖에 못 채움.
- **Option B — Lean fullstack MVP (S3 컨텐츠 + EC2 docker-compose + 게이트 1단) ← 채택 + 확정**
  - 구성:
    - EC2 small 1대 안에 docker network + `docker-compose` 로 (백엔드 / DB / 프론트 서빙) 동거.
    - DB = MySQL or PostgreSQL container (plan 에서 1개 픽).
    - **사용자 컨텐츠는 모두 S3** (`concept.md / summary.md / book.md / video.(mp4|url) / meta.json`, 회차마다 들어 있는 종류만).
    - LLM 추론은 서비스 밖(사용자 로컬 Claude/Codex/Gemini CLI). 사용자가 산출물 묶음을 만들어 게이트 통과 후 presigned URL 로 S3 직접 업로드 → 백엔드가 manifest 읽고 DB 색인.
    - 화면 = (a) 주차별 뷰, (b) 시험범위 뷰. 빈 산출물은 자동 생략.
    - 게이트 = 공유 ID/PW + 4문항 (4/4 정답, 무한 재시도) → 짧은 만료 서명 쿠키.
    - 개발 순서: **로컬 docker-compose 우선 → EC2 small 검증 → 미달 시 폴백**.
  - 장점: 디스크 압박 0(컨텐츠 S3), 풀스택 학습 효과(직접 docker-compose 운영), 비용 거의 EC2 small + S3 standard 만, 4과목·N주차 빌드 없이 추가, 게이트 1단으로 동기 공유 커버.
  - 단점: small 호스트에 백엔드 + DB 동거라 RAM 여유 빠듯 → DB 선정·튜닝 필요. S3 정책(CORS·presigned 만료) 학습 곡선 1회. manifest 스키마는 unknown 키 허용형으로 1회 못 박기.
  - 버릴/보류할 이유: 없음.
- **Option C — Full feature MVP (AI 동영상 + 멀티유저 + 실시간 LLM)**
  - 구성: 사용자가 화면에서 즉석 LLM 질의, AI 가 슬라이드+TTS 로 요약 동영상을 자동 생성, 멀티유저, 진도 추적, 검색.
  - 장점: 최종 비전 그 자체.
  - 단점: small 인스턴스 한계 초과(인코딩 RAM·디스크), LLM 호출 비용 폭증, 1인 개발 일정 초과 위험. 동영상 인코딩·스토리지·CDN 만으로도 별도 인프라.
  - 버릴/보류할 이유: MVP 단계에서는 명백히 과적합. v2/v3 후보로 분리.

## §5. Scope Seed

- 이번 sprint(=MVP 기획) 에 넣을 것:
  - 5대 핵심 기능 (1)개념설명·(2)핵심요약·(3)책 모드·(4)요약 동영상(업로드형)·(5)주차별/시험범위별 뷰의 **요구사항 정의 + 기술 선택**
  - 산출물 업로드 포맷 표준 — `manifest.json + assets/` 스키마 1차안(zip 단일 업로드도 동일 구조로 정규화)
  - EC2 small 위 풀스택 아키텍처 1차안 (백엔드 1프로세스 + DB + 정적 자산 + 업로드 저장소)
  - 게이트 1단 (공유 ID/PW + 질문 1개) 의 인터페이스 1차안 — 세부 정책은 후속
  - 컨텐츠 업로드/색인 파이프라인 (사용자→외부 LLM CLI→manifest+assets 업로드→DB index→뷰어) 1차 흐름
  - 4과목 동시 지원을 전제로 한 `course → week → artifact` + `exam_range` 데이터 모델 1차안
- 이번 sprint 에서 뺄 것:
  - 실제 코드 구현 (다음 sprint)
  - 서비스 내부에서의 LLM 추론·동영상 인코딩 (외부 위탁 고정)
  - 진도 게이미피케이션, 즐겨찾기, 코멘트 같은 부가 기능
  - 권한 분리(viewer 외) / 결제 / 알림
- 다음 sprint 후보:
  - Phase 1: 데이터 스키마 + 업로드 endpoint + 최소 뷰어 (주차별)
  - Phase 2: 시험범위 뷰 + 책 모드(긴 글 reader UI) + 재미요소(문체 톤·진행도 바·삽화 placeholder)
  - Phase 3: 동영상 업로드/재생 + 외부 호스팅(예: S3/유튜브) 링크 모드
  - Phase 4: 동기 공유 (인증 + 단일 viewer 권한) — 또는 Phase 1 과 합쳐서 가져갈 수도 있음(Q4 결과에 따라)

## §6. Plan Seed

`/sfs plan` 으로 넘길 때 필요한 최소 재료.

- Goal:
  - "EC2 small 1대에서 운영 가능한, 외부 LLM 으로 사전 생성된 강의 학습 산출물(개념·요약·책 모드 본문·선택적 동영상) 을 강의/주차/시험범위 단위로 업로드하여 본인+동기가 책처럼 읽을 수 있는 풀스택 서비스의 MVP 기획서를 확정한다."
- Acceptance Criteria 후보 (이번 기획 sprint 의 done 기준):
  - AC1. 5대 핵심 기능 각각이 MVP 포함 / v2 보류 / 폐기 중 어디에 속하는지 표가 있다.
  - AC2. 입력 산출물(외부 LLM 결과) 의 포맷 표준 — `manifest.json + assets/` 스키마 1차안 (산출물 종류·필수/선택 구분·과목/주차/시험범위 태깅 필드 포함) 이 정의돼 있다.
  - AC3. EC2 small 위 1인 운영 기준의 컴포넌트 다이어그램(웹/백엔드/DB/오브젝트 스토리지·디스크/인증) 이 1장 있다.
  - AC4. 업로드→색인→조회 파이프라인이 절차 4~6단계로 적혀 있다.
  - AC5. v1 에 포함/보류되는 항목(특히 동영상 인코딩, 권한 분리, 게이미피케이션) 의 보류 사유가 명시돼 있다.
  - AC6. 게이트(공유 ID/PW + 4문항 본인확인) 의 인터페이스 1차안이 정의돼 있다 — 통과 기준 4/4, 재시도 무한, 정답은 환경변수/secret 보관(평문 커밋 금지), 통과 후 짧은 만료 서명 쿠키 1개.
- AC6-1. 데이터 모델은 4과목(`디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론`) 을 동시에 담을 수 있는 `course → week → artifact` + `exam_range` 구조로 1차 정의돼 있다.
  - AC7. CTO Generator 가 Phase 1 sprint 로 바로 들어갈 수 있는 1차 작업 목록이 도출돼 있다.
- 주요 risk:
  - R1. EC2 small RAM 한계로 backend + DB(MySQL/Postgres container) + 정적 서빙 동거 시 OOM 가능성. → 완화: 로컬 compose 로 동일 형상 검증 후 EC2 검증 → 미달 시 인스턴스 등급 상향 또는 DB 외부화 폴백.
  - R2. manifest 스키마가 흔들리면 사용자 LLM 프롬프트도 같이 흔들림 → 한 번에 못 박고 unknown 키 허용으로 확장.
  - R3. "책 모드 / 재미요소" 가 정성적이라 acceptance 가 흐려질 수 있음 → AC 에 측정 가능한 형태로 풀어 적기.
  - R4. 게이트 정답이 소스/Git 에 노출되면 의미가 사라짐 → 환경변수/secret 채널 강제, 평문 커밋 금지 정책 명시.
  - R5. ~~EC2 small 디스크 한계~~ → S3 단일화로 해소 (Q7 resolved).
  - R6(new). S3 presigned URL 의 만료/CORS 설정 실수로 업로드/다운로드가 깨질 수 있음 → plan 의 데이터 흐름 절차에 명시적 기본값 포함.
- generator agent 가 만들 산출물:
  - `plan.md` (Sprint 목표 / scope / acceptance / risk 정리)
  - 컴포넌트 다이어그램(텍스트 ASCII 또는 mermaid) 1장
  - 데이터 흐름(외부 LLM → 업로드 → DB index → 뷰어) 1다이어그램
  - 5대 기능 분류 표
  - 업로드 산출물 포맷 표준 정의(예: manifest.json + assets/ 형태)
- evaluator agent (CPO) 가 검증할 기준:
  - AC1~AC7 모두 1차 충족 여부
  - YAGNI 위반(EC2 small 제약·1인 운영 제약 위반) 항목 수
  - "책 모드/재미요소" 가 실제로 측정 가능한 기준으로 풀려 있는지
  - 동영상 인코딩·권한 분리가 v1 에서 안전하게 보류돼 있는지
  - 업로드 포맷 표준이 사용자가 외부 LLM 프롬프트로 그대로 시킬 수 있을 정도로 명확한지

### Open Questions

- All resolved as of 2026-04-30:
  - Q1(input=PDF+key.md), Q2(본인+동기), Q3(외부 LLM TTS+슬라이드), Q4(공유ID/PW+4문항), Q4-detail(C교수/디공요일/컴개교수/정통교수), Q4-N(4/4), Q4-rate(무한 재시도), Q5(축소 시작·manifest unknown 키 허용·있는 산출물만 표시), Q6(4과목), Q7(S3 단일화 + EC2 docker-compose + 비용 최소).
- Plan 단계에서 1차 픽이 필요한 항목:
  - DB 선정: MySQL vs PostgreSQL (small RAM 풋프린트 비교 후 1개).
  - 백엔드 언어/프레임워크 1개 (사용자 본업 스택과 정합 우선).
  - 프론트 형태 1개 (Next.js / Vite SPA / 단순 SSR 중 택1).

## §7. G0 Checklist

- [x] raw brief / 대화 메모가 남아 있다 (§1, §8)
- [x] 문제와 성공 상태가 한 줄로 설명된다 (§2)

### file: .sfs-local/sprints/2026-W18-sprint-2/plan.md

---
phase: plan
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T21:05:00+09:00
status: ready-for-review
refined_by: solon-ceo
refined_at: 2026-04-30T21:05:00+09:00
stack:
  backend: "Node.js / NestJS"
  frontend: "Vite (SPA)"
  db: "MySQL 8"
  secret_channel: ".env (local) / EC2 environment"
  deploy: "EC2 small + Docker Compose, S3 for user content"
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

### file: .sfs-local/sprints/2026-W18-sprint-2/log.md

---
phase: do
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
---

# Log — <sprint title>

> Sprint **Do** 단계 작업 로그. 시간순 append 형식. 각 entry 는 1줄 요약 + 필요 시 details.
> `.sfs-local/events.jsonl` 이 machine-readable trace, 본 파일은 human-readable 보강.
> 새 entry 는 본 §1 의 **위쪽** 에 append 권장 (최신 우선).

---

## §1. 작업 로그 (시간순 append)

```
### YYYY-MM-DDTHH:MM:SS+09:00 — <요약>

- 무엇을 했는가
- 왜 했는가 / 어떤 결정에 의한 것인가
- 결과 / 관찰 / 다음 액션
```

<!-- 첫 entry 예시 (삭제 후 실 entry 로 교체) -->

### YYYY-MM-DDTHH:MM:SS+09:00 — sprint kickoff

- `/sfs start` 로 본 sprint dir 생성
- Plan 단계 진입 — `plan.md` 의 R/AC 채우기
- 다음: G1 review 통과 후 Do 진입

## §2. 발견된 결정 / 블로커 (decision log 후보)

- 결정 갈림길 발견 시 `.sfs-local/decisions/<topic>.md` 로 mini-ADR 분리.
- 차단 요소 (외부 답변 대기, 리소스 부족 등) 는 본 섹션에 기록 후 `review.md` 에서 verdict 로 반영.

## §3. CTO 구현 메모

- **CTO Generator persona**: `.sfs-local/personas/cto-generator.md`
- **구현 executor/tool**: claude / codex / gemini / custom / human
- **변경 파일/모듈**:
- **실행한 테스트/스모크 체크**:
- **CPO 에게 넘길 검증 포인트**:

## §4. 다음 단계 / 핸드오프 메모

- G3 Pre-Handoff Gate 통과를 위한 산출물 목록 정리.
- 인계받을 사람이 추가 컨텍스트 없이 진행 가능한 상태 점검.

### file: .sfs-local/sprints/2026-W18-sprint-2/review.md

---
phase: review
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:42:08+09:00
evaluator_role: CPO
evaluator_persona: ".sfs-local/personas/cpo-evaluator.md"
evaluator_executor: "codex"
generator_executor: "claude"
---

# Review — <sprint title>

> Sprint **CPO Evaluator review** 산출물. G2/G3/G4 중 하나의 gate 에 대한 verdict 기록.
> 각 gate review 마다 `.sfs-local/events.jsonl` 의 `review_open` event append.
> SSoT: `gates.md §1` (7-Gate enum) + `05-gate-framework.md §5.1` (매트릭스).
> 동일 sprint 안에서 G2/G3/G4 review 가 여러 번 발생할 경우 본 파일에 §2 섹션을 추가 append.
> 자체검증 방지: CTO Generator 와 CPO Evaluator 는 같은 산출물을 같은 agent instance 가 통과시키지 않는다.

---

## §1. 대상 Gate

- **gate_id**: G2 / G3 / G4 (해당 review 시점에서 1개로 고정)
- **scope**: 본 review 가 평가하는 산출물 / 변경 범위 / 검증 방법
- **trigger**: `/sfs review --gate <id>` 호출 시각
- **CPO persona**: `.sfs-local/personas/cpo-evaluator.md`
- **review executor/tool**: codex / gemini / claude / custom
- **generator executor/tool**: CTO 구현에 사용한 tool

## §2. 평가 항목

### G2 — Design Gate (해당 시)

- [ ] 설계 완성도 (interface 명세, 데이터 모델, 동작 흐름)
- [ ] 위험 요소 식별 / 완화 plan
- [ ] AC 와의 연결 (Plan G1 산출물 참조)

### G3 — Pre-Handoff Gate (해당 시, **binary**)

- [ ] 산출물 self-contained
- [ ] 핸드오프 받을 사람이 추가 컨텍스트 없이 진행 가능
- [ ] verdict ∈ { pass, fail } only (partial 미사용 — `gates.md §2`)

### G4 — Check Gate (해당 시, 5-Axis CPO)

- [ ] 설계 vs 구현 gap (정량)
- [ ] 5-Axis (사용자가치 / 안정성 / 일정 / 비용 / 학습) 점수
- [ ] partial 시 잔여 작업 → 다음 sprint 또는 별도 WU 로 분기

## §3. Verdict

- **verdict**: pass / partial / fail (G3 만 pass/fail)
- **근거 (정량)**: …
- **근거 (정성)**: …
- **partial 시 잔여 항목**: …

## §4. 다음 액션

- pass → CTO 최종 확인 후 G5 retro 진입
- partial → CPO 가 지정한 항목만 CTO 재구현 후 재리뷰
- fail → CTO 재구현 또는 CEO plan/scope 재검토

## §5. CTO 응답 / 재구현 확인

- **CTO 확인**: pass / rework-started / plan-escalation
- **반영한 CPO finding**:
- **재구현 변경 파일/모듈**:
- **재리뷰 필요 여부**:

## §6. CPO Review Invocation Log

`/sfs review` 호출 시 CPO evaluator prompt 가 append 된다.

### 2026-04-30T20:36:41+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T113641Z.txt`
- run_requested: false
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:

Return exactly this shape:
Verdict: pass | partial | fail
Evidence checked:
- ...
Findings:
- ...
Required CTO actions:
- ...
Final recommendation:
- ...

codex
Using the SFS skill because this is a Solon gate review, and I’ll keep the review grounded in the embedded evidence plus the requested CPO persona.
exec
/bin/zsh -lc "sed -n '1,220p' /Users/mj/Soongsil/.agents/skills/sfs/SKILL.md && sed -n '1,220p' /Users/mj/Soongsil/.sfs-local/personas/cpo-evaluator.md" in /Users/mj/Soongsil
 succeeded in 0ms:
---
name: sfs
description: Solon SFS workflow for Codex — use $sfs status/start/guide/auth/brainstorm/plan/review/decision/retro/loop or natural language to dispatch to bash adapter SSoT; for brainstorm, capture raw input then fill §1~§7 as Solon CEO, and for plan, fill G1 requirements/AC/scope + CTO/CPO sprint contract from brainstorm.md. Trigger when a Codex surface delivers $sfs, sfs <command>, /sfs text that reaches the model, or a Solon SFS workflow request (e.g., "현재 상태 확인", "guide 보기", "auth 확인", "sprint 시작", "브레인스토밍", "plan 작성", "review 작성", "decision 기록", "retro close", "loop 자율 진행"). Bash adapter is single source of truth for command I/O — paraphrase forbidden, exit codes verbatim.
---

# Solon SFS — Codex Skill

This project uses Solon SFS. In Codex, prefer `$sfs <command>` or a natural
language Solon workflow request. Bare `/sfs` may be intercepted by the Codex
native slash UI before this Skill sees it (`커맨드 없음` / `Unrecognized command`).
When the user invokes `$sfs <command>`, types `sfs <command>`, sends `/sfs`
text that actually reaches the model, or expresses a Solon SFS workflow intent,
dispatch the request to the corresponding bash script under
`.sfs-local/scripts/` first.
For every command except `brainstorm` and `plan`, stop after printing adapter
output. For `brainstorm`, continue with the CEO refinement flow below after
successful raw capture. For `plan`, continue with the G1 refinement flow below
after the adapter opens `plan.md`.

If you can read a user message that begins with `/sfs`, the runtime has already
delivered the Solon command to this Skill. Dispatch it. But do not claim Codex
native slash registration exists: current Codex app/CLI surfaces can block
unknown slash commands before the model sees them. In that case the user should
invoke `$sfs status`, `sfs status`, natural language, or direct bash
(`bash .sfs-local/scripts/sfs-status.sh`).

The bash adapter execution is **deterministic** and must NOT be
re-interpreted by the model. Bash adapter is single source of truth (SSoT) for
command I/O. `brainstorm` and `plan` have documented AI-side follow-ups:
Solon CEO refinement of `brainstorm.md` §1~§7, then G1 plan + CTO/CPO sprint
contract refinement of `plan.md`.

## Dispatch Table

| User intent / first arg | Script to run | Notes |
|:--|:--|:--|
| `status` (또는 "현재 상태", "어디까지 했는지") | `bash .sfs-local/scripts/sfs-dispatch.sh status [--color=auto/always/never]` | 1줄 dashboard |
| `start <goal>` (또는 "sprint 시작", "새 sprint") | `bash .sfs-local/scripts/sfs-dispatch.sh start <goal> [--id <sprint-id>] [--force]` | sprint workspace 초기화 + sprint files cp |
| `guide [--path|--print]` (또는 "가이드", "처음 사용법") | `bash .sfs-local/scripts/sfs-dispatch.sh guide [--path|--print]` | 기본은 짧은 맥락 브리핑, `--path` 는 경로만, `--print` 는 full guide 본문 |
| `auth status|check|login|probe` (또는 "인증 확인", "Gemini 로그인") | `bash .sfs-local/scripts/sfs-dispatch.sh auth <args>` | Codex/Claude/Gemini review executor 인증 점검/부트스트랩/더미 요청 |
| `brainstorm [text|--stdin]` (또는 "브레인스토밍", "요구사항 정리") | `bash .sfs-local/scripts/sfs-dispatch.sh brainstorm <raw context>` | G0 raw 요구사항/대화 맥락을 brainstorm.md 에 기록한 뒤 §1~§7을 Solon CEO로 정리. newline 허용 |
| `plan` (또는 "plan 작성", "이번 sprint 계획") | `bash .sfs-local/scripts/sfs-dispatch.sh plan` | plan.md 진입 + plan_open event 후 brainstorm.md 기반 G1 plan/contract 작성 |
| `review --gate <id> [--executor <tool>] [--run]` (또는 "CPO review", "검증 기록") | `bash .sfs-local/scripts/sfs-dispatch.sh review --gate <id> [--executor <tool>] [--generator <tool>] [--run]` | CPO Evaluator persona prompt. `--run` skips empty reviews unless `--allow-empty`. id ∈ G-1, G0, G1, G2, G3, G4, G5 |
| `decision <title>` (또는 "결정 기록", "ADR 추가") | `bash .sfs-local/scripts/sfs-dispatch.sh decision "<title>" [--id <id>]` | full ADR 또는 mini-ADR 분기 |
| `retro [--close]` (또는 "회고", "sprint close") | `bash .sfs-local/scripts/sfs-dispatch.sh retro [--close]` | `--close` 시 sprint close + auto commit |
| `loop [OPTIONS]` (또는 "자율 진행", "loop 시작") | `bash .sfs-local/scripts/sfs-dispatch.sh loop [OPTIONS]` | Ralph Loop + Solon mutex (see `--help`) |

## Procedure

1. **Existence check** — Use the shell tool to verify the dispatcher and target
   script exist and are executable (`ls -l .sfs-local/scripts/sfs-dispatch.sh
   .sfs-local/scripts/sfs-<name>.sh`). If either is
   missing, tell the user which script is missing in 1 line and stop (do NOT
   try to recreate the script — install/upgrade is user's responsibility via
   `install.sh` / `upgrade.sh`).

   On Windows PowerShell, use `.sfs-local/scripts/sfs.ps1 <command> [args]`
   when direct `bash` invocation is unavailable. The wrapper requires Git Bash.
   WSL users should invoke the bash adapter from inside the WSL shell.

2. **Quote args safely** — Re-quote `<remaining args>` for the shell. Reject
   any argument containing a newline or NUL byte by reporting `unknown arg`,
   except for `brainstorm`, where multiline raw requirement context is allowed.

3. **Execute** — Run the script via the shell tool. Capture stdout, stderr,
   and exit code. Do not pipe through any other transformer.

4. **Print output verbatim** — Emit the script's stdout exactly as produced.
   If exit code is non-zero, also print stderr and the exit code on a final
   line: `exit <code>`. Map known exit codes per the script contract:
   - status: `0`=ok, `1`=no `.sfs-local/`, `2`=corrupt `events.jsonl`,
     `3`=not a git repo, `99`=unknown.
   - start: `0`=ok, `1`=sprint id conflict (suggest `--force`), `4`=templates
     missing, `5`=permission, `99`=unknown.
   - guide: `0`=ok, `1`=no `.sfs-local/`, `4`=guide missing,
     `99`=unknown.
   - auth: `0`=ok, `1`=no `.sfs-local/`, `7`=usage,
     `9`=auth missing/bootstrap failed, `99`=unknown.
   - brainstorm: `0`=ok, `1`=no `.sfs-local/` or no active sprint,
     `2`=corrupt `events.jsonl` / `current-sprint`, `3`=not a git repo,
     `4`=template missing, `5`=permission, `99`=unknown.
   - plan: `0`=ok, `1`=no `.sfs-local/` or no active sprint, `4`=template
     missing, `99`=unknown.
   - review: `0`=ok, `1`=no `.sfs-local/` or no active sprint, `4`=template
    missing, `6`=gate id invalid or required, `7`=usage,
    `9`=executor bridge missing/failed, `99`=unknown.
   - decision: `0`=ok, `1`=id conflict, `4`=template missing, `7`=usage,
     `99`=unknown.
   - retro: `0`=ok, `1`=no `.sfs-local/` or no active sprint, `4`=template
     missing, `7`=usage, `8`=`--close` requested but review.md missing,
     `99`=unknown.
   - loop: `0`=success, `1`=invalid usage, `2`=PROGRESS parse error,
     `3`=drift, `4`=mutex claim failed, `5`=safety_lock, `6`=spec missing,
     `7`=verify fail, `8`=heartbeat fail, `9`=executor resolve fail,
     `99`=unknown.

5. **Stop or continue only for brainstorm/plan** — For commands other than
   `brainstorm` and `plan`, do not summarize, paraphrase, or add commentary.
   The bash adapter is the SSoT. For `brainstorm`, continue to the CEO
   refinement flow below after a zero exit code. For `plan`, continue to the G1
   refinement flow below after a zero exit code.

## Brainstorm CEO Refinement

`/sfs brainstorm` is not capture-only in AI runtimes. After the bash adapter
succeeds and stdout has been shown verbatim:

1. Resolve the active `brainstorm.md` path from adapter stdout. If stdout cannot
   be parsed, read `.sfs-local/current-sprint` and open
   `.sfs-local/sprints/<current-sprint>/brainstorm.md`.
2. Read `brainstorm.md`, especially `§8. Append Log`. Treat the append log as
   user raw data and preserve it.
3. Act as **Solon CEO**. Fill or update `§1` through `§6` from the raw input and
   existing context:
   - `§1` concise raw brief / conversation notes.
   - `§2` problem owner, urgency, current pain, success state.
   - `§3` technical, deployment, cost/time, and user learning constraints.
   - `§4` at least two options, including a deliberately smaller MVP option.
   - `§5` in scope / out of scope / next sprint candidates.
   - `§6` goal, acceptance criteria candidates, major risks, CTO Generator
     deliverables, and CPO Evaluator review criteria.
4. Update `§7` checklist based only on what is actually satisfied.
5. If critical information is missing, add concise open questions inside `§6`
   or immediately before `§7`, and ask up to 3 questions in the final response.
   Still fill known sections with explicit assumptions and unknowns.
6. Set frontmatter `status: ready-for-plan` only when `§6` is usable for
   `/sfs plan`; otherwise keep `status: draft`.
7. Do not implement code, choose a framework, or run `/sfs plan` automatically.
8. Final response shape after editing:
   - first line: `brainstorm.md refined: <path>`
   - then `questions: <N>` and the questions only if needed
   - then `next: /sfs plan` when status is `ready-for-plan`, otherwise
     `next: answer questions, then /sfs brainstorm`

## Plan G1 Refinement

`/sfs plan` is not adapter-only in AI runtimes. `$sfs plan` / `sfs plan` should
first run the bash adapter, then fill `plan.md` from the current G0 context.

1. Resolve the active `plan.md` path from adapter stdout. If stdout cannot be
   parsed, read `.sfs-local/current-sprint` and open
   `.sfs-local/sprints/<current-sprint>/plan.md`.
2. Open the same sprint's `brainstorm.md`. Treat `brainstorm.md` §1~§7 and
   §8 Append Log as the source of truth.
3. Act as **Solon CEO** for requirements and scope, then write the
   **CTO Generator ↔ CPO Evaluator** sprint contract:
   - `§1` measurable requirements.
   - `§2` binary/verifiable acceptance criteria and anti-AC.
   - `§3` in scope / out of scope / dependencies and decision points.
   - `§4` G1 checklist based only on satisfied items.
   - `§5` CEO decision, CTO deliverables, CPO validation criteria,
     rework contract, and user decision points.
   - Add `§6 Phase 1 구현 Backlog Seed` when it materially helps the next
     implementation sprint.
4. Preserve user edits already present in `plan.md`; refine or complete them
   rather than replacing with a generic template.
5. If `brainstorm.md` is too sparse, fill known assumptions, leave explicit
   open questions, and ask up to 3 questions in the final response.
6. Do not implement code, choose irreversible infrastructure, or run
   `/sfs review` automatically.
7. Final response shape after editing:
   - first line: `plan.md refined: <path>`
   - then `questions: <N>` and the questions only if needed
   - then `next: /sfs review --gate G1 --executor codex --generator claude`
     when ready, otherwise `next: answer questions, then /sfs plan`

## If first arg is empty or `help`

Print this 3-line usage and stop:

```
Usage: /sfs <command> [args]
Commands: status, start, guide, auth, brainstorm, plan, review, decision, retro, loop
Help: bash .sfs-local/scripts/sfs-<command>.sh --help
```

## ⚠️ Safety Locks

- `/sfs retro --close` triggers an auto-commit. Confirm the user explicitly
  requested it (don't infer from neighboring context, don't auto-invoke).
- Never run `git push origin *` automatically — push is user-only (§1.5).
- If the bash adapter is missing, do NOT try to fall back to a paraphrase
  workflow that simulates Solon SFS — instead tell the user the adapter is
  missing and suggest `install.sh` / `upgrade.sh`.

## Multi-adaptor Parity

This Skill is the Codex 1급 entry point for Solon SFS. The same workflow is
also exposed through these entry points:

- **Claude Code**: `.claude/commands/sfs.md` (slash command, native dispatch)
- **Gemini CLI**: `.gemini/commands/sfs.toml` (TOML custom command, native slash)
- **Codex**: 본 Skill (`.agents/skills/sfs/SKILL.md`, project-scoped).
  `$sfs ...` / `sfs ...` / natural language are the practical Codex entry paths
  because current Codex app/CLI surfaces may intercept bare `/sfs` before the
  model sees it. If `/sfs ...` text does reach this Skill, dispatch it.

All entry points dispatch to the SAME bash adapter (`.sfs-local/scripts/sfs-*.sh`).
Vendor-asymmetry between adapters is forbidden — if you find drift, it's a
bug to escalate via `/sfs decision` or report upstream.
---
role_id: cpo-evaluator
role_name: CPO Evaluator
phase: review
default_executor: codex
---

# CPO Evaluator — Quality Review Owner

You are the Solon CPO Evaluator persona.

Mission:
- Review CTO Generator output against the CEO plan and sprint contract.
- Protect against self-validation: the implementation author must not be the sole reviewer.
- Prefer an independent tool/agent instance for review, such as Codex or Gemini CLI when the implementation was produced in Claude.
- Return a clear verdict that CTO can act on.

Rules:
- Do not rewrite the implementation during review.
- Do not rubber-stamp vague evidence.
- Check acceptance criteria, regression risk, failure behavior, UX/API clarity, and scope creep.
- If evidence is missing, return `partial` or `fail` with exact required fixes.
- `pass` means CTO can proceed to final close/retro.

Output shape:
- Verdict: pass / partial / fail
- Evidence checked
- Findings
- Required CTO actions
- Final recommendation

codex
Verdict: pass

Evidence checked:
- Embedded `brainstorm.md` for G0 context, resolved decisions, constraints, and AC seed.
- Embedded `plan.md` for G1 requirements, measurable AC, scope, anti-AC, stack decisions, and Phase 1 backlog.
- Embedded `review.md` invocation metadata: generator `claude`, evaluator `codex`.
- Embedded `git status --short` and empty `git diff --stat`.

Findings:
- G1 passes: requirements, scope, stack decisions, anti-AC, resource constraints, S3 separation, gate policy, and Phase 1 backlog are sufficiently explicit for the next sprint.
- Self-validation risk is low: evidence says CTO Generator was `claude` and this review is `codex`, not the same executor/tool.
- Minor evidence gap: no actual component diagram, data model diagram, or manifest schema artifact was embedded. For G1 this is acceptable because the plan defines them as CTO Generator deliverables/backlog items, but they must exist before G2/G3 review.
- Minor product risk: MySQL memory estimate is plausible but not yet verified on EC2 small. The plan correctly carries this into Local↔EC2 parity validation.

Required CTO actions:
- Proceed to Phase 1 planning/implementation from §6.
- Before G2/G3, produce concrete artifacts for component diagram, data model, manifest schema, and upload/data flow.
- Keep secret answers out of git and provide only `.env.example` placeholders.

Final recommendation:
- Pass G1 and move to the next gate. The plan is sufficiently bounded, measurable, and aligned with EC2 small + S3 + external LLM constraints.
2026-04-30T11:42:51.600877Z ERROR codex_core::session: failed to record rollout items: thread 019dde32-4369-7721-9ea3-8c69f83b3aac not found
tokens used
35,915

```

### 2026-04-30T20:45:09+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `claude`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T114509Z.txt`
- run_requested: false
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: claude

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:
  - 시험 직전, 한 화면 안에서 "주차 1~6 시험범위" 를 책 한 권처럼 처음부터 끝까지 읽고 핵심 요약·꿀팁까지 같이 흡수 가능
  - 단원별로도 "이 주차만 다시 읽기" 가 즉시 됨
  - 사용자가 직접 정리노트를 다시 다듬지 않아도 자동으로 학습용 포맷이 만들어짐

## §3. Constraints / Context

- 기술 제약:
  - 풀스택 단독 구현. 풀타임 일하는 학생 1인 운영 → 운영 부담을 늘리는 컴포넌트(예: 자체 미디어 인코딩 파이프라인, k8s 등) 는 비용 대비 손해
  - 백엔드는 사용자의 본업 영역(Java/Spring 등 추정) → 백엔드는 비교적 자신 있고, 프론트는 상대적으로 약할 가능성 (확인 필요)
- 배포/운영 제약:
  - **하드 상한: EC2 small (≈ 2 vCPU / 2GB RAM)** 1대 가정. EC2 는 docker-compose 로 (백엔드 + DB + 프론트 서빙) 동거. LLM 추론·동영상 인코딩은 인스턴스 안에서 안 돌림.
  - **사용자 컨텐츠 저장은 S3 단일화** (Q7 resolved). EC2 로컬 디스크는 코드/이미지/DB volume 만.
  - **DB 는 same-host docker container** (MySQL or PostgreSQL — plan 에서 1개 픽). RDS 미사용. 본문은 DB 에 안 넣고 S3 키만 색인.
  - 트래픽은 본인 + 동기 4과목 수강생 수준(수십 명) 가정.
  - **개발 절차**: 로컬 docker-compose 로 우선 개발 → 같은 compose 형상으로 EC2 small 검증 → 미달 시 등급 상향 또는 DB 외부화 폴백.
  - **비용 정책**: 무조건 최소화. RDS/CloudFront 미사용 (1차), 프리티어/저렴 채널 우선.
- 시간/비용 제약:
  - 시간: 풀타임 직장 + 학교 → 주당 가용 개발 시간 제한. 기말 시즌 전에 의미 있는 형태가 동작해야 ROI 있음
  - 비용: 학생 자비. EC2 small + 도메인 + S3(storage + GET) + 외부 LLM 호출 비용. CloudFront/CDN 은 v1 미포함, 비용 보고 결정. 동영상 인코딩 비용 0(외부 생성·업로드).
- 사용자 역량/학습 맥락:
  - CS 기초가 약하므로, 이 프로젝트 자체가 "공부용 + 포트폴리오" 두 목적을 동시에 가진다고 봐야 함
  - 따라서 "최단 거리로 동작하는 MVP" 와 "원리를 이해하고 직접 만든 부분" 사이의 균형이 의사결정 축
- 아직 모르는 것 (resolved 2026-04-30, §1 후속 답변 참고):
  - ~~Q1. 입력 소스~~ → A1: PDF 원본 + 키워드 메모 .md, LLM 호출은 외부 CLI 측에서. 서비스는 결과물 업로드/저장/뷰어 책임만.
  - ~~Q2. 사용자 범위~~ → A2: 본인 + 동기. 간단한 로그인 1종 v1 범위 가능.
  - ~~Q3. 동영상 정의~~ → A3: TTS+슬라이드, 단 Bedrock 미사용. 외부 LLM 으로 사용자가 생성→mp4/링크 업로드. 서비스는 인코딩 책임 없음.
  - 남은 Open Questions:
    - Q4. 인증 방식 1종을 무엇으로? (이메일+비밀번호 자체구현 vs 카카오/구글 OAuth 1종) — v1 범위 결정 필요.
    - Q5. 업로드된 산출물 포맷 표준은? (예: `concept.md`, `summary.md`, `book.md`, `video.mp4` 같은 고정 파일명 / 또는 한 묶음 zip / 또는 JSON manifest + assets) — 데이터 모델·업로드 UX 모두에 영향.
    - Q6. 멀티 과목인가, 단일 과목인가 (v1 시점)?

## §4. Options

최소 2개 이상. "아무것도 안 한다" 도 유효한 옵션이다.

- **Option A — Static-first MVP (read-only 학습 뷰어)**
  - 구성: `lecture-note-organizer` 산출물을 Git 저장소나 단순 폴더에 두고, 빌드 타임에 LLM 으로 (1)개념설명·(2)핵심요약·(3)책 모드 long-form 텍스트를 사전 생성 → 정적 사이트(Next.js SSG 또는 Astro) 로 EC2 small 의 nginx/Node 한 프로세스로 서빙. 동영상은 미포함.
  - 장점: small 인스턴스에 충분, 운영 부담 거의 0, LLM 비용은 빌드 시점에만, 캐싱·검색이 가벼움.
  - 단점: 새 강의 추가 시 매번 빌드/재배포 필요. 멀티유저·로그인·진도 추적 같은 풀스택 학습 가치는 적음.
  - 버릴/보류할 이유: "풀스택 경험" 이라는 사용자의 학습 목표를 절반밖에 못 채움.
- **Option B — Lean fullstack MVP (S3 컨텐츠 + EC2 docker-compose + 게이트 1단) ← 채택 + 확정**
  - 구성:
    - EC2 small 1대 안에 docker network + `docker-compose` 로 (백엔드 / DB / 프론트 서빙) 동거.
    - DB = MySQL or PostgreSQL container (plan 에서 1개 픽).
    - **사용자 컨텐츠는 모두 S3** (`concept.md / summary.md / book.md / video.(mp4|url) / meta.json`, 회차마다 들어 있는 종류만).
    - LLM 추론은 서비스 밖(사용자 로컬 Claude/Codex/Gemini CLI). 사용자가 산출물 묶음을 만들어 게이트 통과 후 presigned URL 로 S3 직접 업로드 → 백엔드가 manifest 읽고 DB 색인.
    - 화면 = (a) 주차별 뷰, (b) 시험범위 뷰. 빈 산출물은 자동 생략.
    - 게이트 = 공유 ID/PW + 4문항 (4/4 정답, 무한 재시도) → 짧은 만료 서명 쿠키.
    - 개발 순서: **로컬 docker-compose 우선 → EC2 small 검증 → 미달 시 폴백**.
  - 장점: 디스크 압박 0(컨텐츠 S3), 풀스택 학습 효과(직접 docker-compose 운영), 비용 거의 EC2 small + S3 standard 만, 4과목·N주차 빌드 없이 추가, 게이트 1단으로 동기 공유 커버.
  - 단점: small 호스트에 백엔드 + DB 동거라 RAM 여유 빠듯 → DB 선정·튜닝 필요. S3 정책(CORS·presigned 만료) 학습 곡선 1회. manifest 스키마는 unknown 키 허용형으로 1회 못 박기.
  - 버릴/보류할 이유: 없음.
- **Option C — Full feature MVP (AI 동영상 + 멀티유저 + 실시간 LLM)**
  - 구성: 사용자가 화면에서 즉석 LLM 질의, AI 가 슬라이드+TTS 로 요약 동영상을 자동 생성, 멀티유저, 진도 추적, 검색.
  - 장점: 최종 비전 그 자체.
  - 단점: small 인스턴스 한계 초과(인코딩 RAM·디스크), LLM 호출 비용 폭증, 1인 개발 일정 초과 위험. 동영상 인코딩·스토리지·CDN 만으로도 별도 인프라.
  - 버릴/보류할 이유: MVP 단계에서는 명백히 과적합. v2/v3 후보로 분리.

## §5. Scope Seed

- 이번 sprint(=MVP 기획) 에 넣을 것:
  - 5대 핵심 기능 (1)개념설명·(2)핵심요약·(3)책 모드·(4)요약 동영상(업로드형)·(5)주차별/시험범위별 뷰의 **요구사항 정의 + 기술 선택**
  - 산출물 업로드 포맷 표준 — `manifest.json + assets/` 스키마 1차안(zip 단일 업로드도 동일 구조로 정규화)
  - EC2 small 위 풀스택 아키텍처 1차안 (백엔드 1프로세스 + DB + 정적 자산 + 업로드 저장소)
  - 게이트 1단 (공유 ID/PW + 질문 1개) 의 인터페이스 1차안 — 세부 정책은 후속
  - 컨텐츠 업로드/색인 파이프라인 (사용자→외부 LLM CLI→manifest+assets 업로드→DB index→뷰어) 1차 흐름
  - 4과목 동시 지원을 전제로 한 `course → week → artifact` + `exam_range` 데이터 모델 1차안
- 이번 sprint 에서 뺄 것:
  - 실제 코드 구현 (다음 sprint)
  - 서비스 내부에서의 LLM 추론·동영상 인코딩 (외부 위탁 고정)
  - 진도 게이미피케이션, 즐겨찾기, 코멘트 같은 부가 기능
  - 권한 분리(viewer 외) / 결제 / 알림
- 다음 sprint 후보:
  - Phase 1: 데이터 스키마 + 업로드 endpoint + 최소 뷰어 (주차별)
  - Phase 2: 시험범위 뷰 + 책 모드(긴 글 reader UI) + 재미요소(문체 톤·진행도 바·삽화 placeholder)
  - Phase 3: 동영상 업로드/재생 + 외부 호스팅(예: S3/유튜브) 링크 모드
  - Phase 4: 동기 공유 (인증 + 단일 viewer 권한) — 또는 Phase 1 과 합쳐서 가져갈 수도 있음(Q4 결과에 따라)

## §6. Plan Seed

`/sfs plan` 으로 넘길 때 필요한 최소 재료.

- Goal:
  - "EC2 small 1대에서 운영 가능한, 외부 LLM 으로 사전 생성된 강의 학습 산출물(개념·요약·책 모드 본문·선택적 동영상) 을 강의/주차/시험범위 단위로 업로드하여 본인+동기가 책처럼 읽을 수 있는 풀스택 서비스의 MVP 기획서를 확정한다."
- Acceptance Criteria 후보 (이번 기획 sprint 의 done 기준):
  - AC1. 5대 핵심 기능 각각이 MVP 포함 / v2 보류 / 폐기 중 어디에 속하는지 표가 있다.
  - AC2. 입력 산출물(외부 LLM 결과) 의 포맷 표준 — `manifest.json + assets/` 스키마 1차안 (산출물 종류·필수/선택 구분·과목/주차/시험범위 태깅 필드 포함) 이 정의돼 있다.
  - AC3. EC2 small 위 1인 운영 기준의 컴포넌트 다이어그램(웹/백엔드/DB/오브젝트 스토리지·디스크/인증) 이 1장 있다.
  - AC4. 업로드→색인→조회 파이프라인이 절차 4~6단계로 적혀 있다.
  - AC5. v1 에 포함/보류되는 항목(특히 동영상 인코딩, 권한 분리, 게이미피케이션) 의 보류 사유가 명시돼 있다.
  - AC6. 게이트(공유 ID/PW + 4문항 본인확인) 의 인터페이스 1차안이 정의돼 있다 — 통과 기준 4/4, 재시도 무한, 정답은 환경변수/secret 보관(평문 커밋 금지), 통과 후 짧은 만료 서명 쿠키 1개.
- AC6-1. 데이터 모델은 4과목(`디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론`) 을 동시에 담을 수 있는 `course → week → artifact` + `exam_range` 구조로 1차 정의돼 있다.
  - AC7. CTO Generator 가 Phase 1 sprint 로 바로 들어갈 수 있는 1차 작업 목록이 도출돼 있다.
- 주요 risk:
  - R1. EC2 small RAM 한계로 backend + DB(MySQL/Postgres container) + 정적 서빙 동거 시 OOM 가능성. → 완화: 로컬 compose 로 동일 형상 검증 후 EC2 검증 → 미달 시 인스턴스 등급 상향 또는 DB 외부화 폴백.
  - R2. manifest 스키마가 흔들리면 사용자 LLM 프롬프트도 같이 흔들림 → 한 번에 못 박고 unknown 키 허용으로 확장.
  - R3. "책 모드 / 재미요소" 가 정성적이라 acceptance 가 흐려질 수 있음 → AC 에 측정 가능한 형태로 풀어 적기.
  - R4. 게이트 정답이 소스/Git 에 노출되면 의미가 사라짐 → 환경변수/secret 채널 강제, 평문 커밋 금지 정책 명시.
  - R5. ~~EC2 small 디스크 한계~~ → S3 단일화로 해소 (Q7 resolved).
  - R6(new). S3 presigned URL 의 만료/CORS 설정 실수로 업로드/다운로드가 깨질 수 있음 → plan 의 데이터 흐름 절차에 명시적 기본값 포함.
- generator agent 가 만들 산출물:
  - `plan.md` (Sprint 목표 / scope / acceptance / risk 정리)
  - 컴포넌트 다이어그램(텍스트 ASCII 또는 mermaid) 1장
  - 데이터 흐름(외부 LLM → 업로드 → DB index → 뷰어) 1다이어그램
  - 5대 기능 분류 표
  - 업로드 산출물 포맷 표준 정의(예: manifest.json + assets/ 형태)
- evaluator agent (CPO) 가 검증할 기준:
  - AC1~AC7 모두 1차 충족 여부
  - YAGNI 위반(EC2 small 제약·1인 운영 제약 위반) 항목 수
  - "책 모드/재미요소" 가 실제로 측정 가능한 기준으로 풀려 있는지
  - 동영상 인코딩·권한 분리가 v1 에서 안전하게 보류돼 있는지
  - 업로드 포맷 표준이 사용자가 외부 LLM 프롬프트로 그대로 시킬 수 있을 정도로 명확한지

### Open Questions

- All resolved as of 2026-04-30:
  - Q1(input=PDF+key.md), Q2(본인+동기), Q3(외부 LLM TTS+슬라이드), Q4(공유ID/PW+4문항), Q4-detail(C교수/디공요일/컴개교수/정통교수), Q4-N(4/4), Q4-rate(무한 재시도), Q5(축소 시작·manifest unknown 키 허용·있는 산출물만 표시), Q6(4과목), Q7(S3 단일화 + EC2 docker-compose + 비용 최소).
- Plan 단계에서 1차 픽이 필요한 항목:
  - DB 선정: MySQL vs PostgreSQL (small RAM 풋프린트 비교 후 1개).
  - 백엔드 언어/프레임워크 1개 (사용자 본업 스택과 정합 우선).
  - 프론트 형태 1개 (Next.js / Vite SPA / 단순 SSR 중 택1).

## §7. G0 Checklist

- [x] raw brief / 대화 메모가 남아 있다 (§1, §8)
- [x] 문제와 성공 상태가 한 줄로 설명된다 (§2)

### file: .sfs-local/sprints/2026-W18-sprint-2/plan.md

---
phase: plan
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T21:05:00+09:00
status: ready-for-review
refined_by: solon-ceo
refined_at: 2026-04-30T21:05:00+09:00
stack:
  backend: "Node.js / NestJS"
  frontend: "Vite (SPA)"
  db: "MySQL 8"
  secret_channel: ".env (local) / EC2 environment"
  deploy: "EC2 small + Docker Compose, S3 for user content"
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

### file: .sfs-local/sprints/2026-W18-sprint-2/log.md

---
phase: do
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
---

# Log — <sprint title>

> Sprint **Do** 단계 작업 로그. 시간순 append 형식. 각 entry 는 1줄 요약 + 필요 시 details.
> `.sfs-local/events.jsonl` 이 machine-readable trace, 본 파일은 human-readable 보강.
> 새 entry 는 본 §1 의 **위쪽** 에 append 권장 (최신 우선).

---

## §1. 작업 로그 (시간순 append)

```
### YYYY-MM-DDTHH:MM:SS+09:00 — <요약>

- 무엇을 했는가
- 왜 했는가 / 어떤 결정에 의한 것인가
- 결과 / 관찰 / 다음 액션
```

<!-- 첫 entry 예시 (삭제 후 실 entry 로 교체) -->

### YYYY-MM-DDTHH:MM:SS+09:00 — sprint kickoff

- `/sfs start` 로 본 sprint dir 생성
- Plan 단계 진입 — `plan.md` 의 R/AC 채우기
- 다음: G1 review 통과 후 Do 진입

## §2. 발견된 결정 / 블로커 (decision log 후보)

- 결정 갈림길 발견 시 `.sfs-local/decisions/<topic>.md` 로 mini-ADR 분리.
- 차단 요소 (외부 답변 대기, 리소스 부족 등) 는 본 섹션에 기록 후 `review.md` 에서 verdict 로 반영.

## §3. CTO 구현 메모

- **CTO Generator persona**: `.sfs-local/personas/cto-generator.md`
- **구현 executor/tool**: claude / codex / gemini / custom / human
- **변경 파일/모듈**:
- **실행한 테스트/스모크 체크**:
- **CPO 에게 넘길 검증 포인트**:

## §4. 다음 단계 / 핸드오프 메모

- G3 Pre-Handoff Gate 통과를 위한 산출물 목록 정리.
- 인계받을 사람이 추가 컨텍스트 없이 진행 가능한 상태 점검.

### file: .sfs-local/sprints/2026-W18-sprint-2/review.md

---
phase: review
gate_id: G1
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:45:09+09:00
evaluator_role: CPO
evaluator_persona: ".sfs-local/personas/cpo-evaluator.md"
evaluator_executor: "claude"
generator_executor: "claude"
---

# Review — <sprint title>

> Sprint **CPO Evaluator review** 산출물. G2/G3/G4 중 하나의 gate 에 대한 verdict 기록.
> 각 gate review 마다 `.sfs-local/events.jsonl` 의 `review_open` event append.
> SSoT: `gates.md §1` (7-Gate enum) + `05-gate-framework.md §5.1` (매트릭스).
> 동일 sprint 안에서 G2/G3/G4 review 가 여러 번 발생할 경우 본 파일에 §2 섹션을 추가 append.
> 자체검증 방지: CTO Generator 와 CPO Evaluator 는 같은 산출물을 같은 agent instance 가 통과시키지 않는다.

---

## §1. 대상 Gate

- **gate_id**: G2 / G3 / G4 (해당 review 시점에서 1개로 고정)
- **scope**: 본 review 가 평가하는 산출물 / 변경 범위 / 검증 방법
- **trigger**: `/sfs review --gate <id>` 호출 시각
- **CPO persona**: `.sfs-local/personas/cpo-evaluator.md`
- **review executor/tool**: codex / gemini / claude / custom
- **generator executor/tool**: CTO 구현에 사용한 tool

## §2. 평가 항목

### G2 — Design Gate (해당 시)

- [ ] 설계 완성도 (interface 명세, 데이터 모델, 동작 흐름)
- [ ] 위험 요소 식별 / 완화 plan
- [ ] AC 와의 연결 (Plan G1 산출물 참조)

### G3 — Pre-Handoff Gate (해당 시, **binary**)

- [ ] 산출물 self-contained
- [ ] 핸드오프 받을 사람이 추가 컨텍스트 없이 진행 가능
- [ ] verdict ∈ { pass, fail } only (partial 미사용 — `gates.md §2`)

### G4 — Check Gate (해당 시, 5-Axis CPO)

- [ ] 설계 vs 구현 gap (정량)
- [ ] 5-Axis (사용자가치 / 안정성 / 일정 / 비용 / 학습) 점수
- [ ] partial 시 잔여 작업 → 다음 sprint 또는 별도 WU 로 분기

## §3. Verdict

- **verdict**: pass / partial / fail (G3 만 pass/fail)
- **근거 (정량)**: …
- **근거 (정성)**: …
- **partial 시 잔여 항목**: …

## §4. 다음 액션

- pass → CTO 최종 확인 후 G5 retro 진입
- partial → CPO 가 지정한 항목만 CTO 재구현 후 재리뷰
- fail → CTO 재구현 또는 CEO plan/scope 재검토

## §5. CTO 응답 / 재구현 확인

- **CTO 확인**: pass / rework-started / plan-escalation
- **반영한 CPO finding**:
- **재구현 변경 파일/모듈**:
- **재리뷰 필요 여부**:

## §6. CPO Review Invocation Log

`/sfs review` 호출 시 CPO evaluator prompt 가 append 된다.

### 2026-04-30T20:36:41+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T113641Z.txt`
- run_requested: false
- auth_mode: `auto`
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

```text
You are the Solon CPO Evaluator.

Use persona file: .sfs-local/personas/cpo-evaluator.md

Review gate: G1
Sprint: 2026-W18-sprint-2
Generator executor/tool: claude
Evaluator executor/tool: codex

Self-validation policy:
- Do not rubber-stamp CTO Generator output.
- If this review is running in the same tool/session that generated the implementation, explicitly call that out as a risk.
- Prefer independent review evidence from Codex/Gemini/another agent instance when implementation was produced by Claude.

Review the embedded evidence below. Do not rely on executor-specific tools being available.

## Embedded Evidence Bundle

The following evidence was collected by SFS before invoking the executor. Review this embedded evidence first; do not assume your CLI has project file/tool access. If evidence is insufficient, return partial/fail and list the missing evidence instead of calling unsupported tools.

### git status --short

?? .agents/
?? .claude/
?? .gemini/
?? .gitignore
?? .sfs-local/
?? AGENTS.md
?? CLAUDE.md
?? GEMINI.md
?? SFS.md
?? docs/

### git diff --stat


### file: .sfs-local/sprints/2026-W18-sprint-2/brainstorm.md

---
phase: brainstorm
gate_id: G0
sprint_id: "2026-W18-sprint-2"
goal: "EC2 small급 풀스택 학습 요약 서비스 MVP 기획"
created_at: "2026-04-30T19:21:18+09:00"
last_touched_at: 2026-04-30T20:35:00+09:00
status: ready-for-plan        # draft | ready-for-plan | g0-reviewed
refined_by: solon-ceo
refined_at: 2026-04-30T20:35:00+09:00
---

# Brainstorm — <sprint title>

> Sprint **G0 — Brainstorm Gate** 산출물.
> 목적은 사용자의 raw 요구사항을 바로 plan 으로 굳히지 않고, 문제/대안/제약/범위를 먼저 정리하는 것.
> `/sfs start` 는 workspace 를 만들고, `/sfs brainstorm` 이 이 문서를 채운다.

---

## §1. Raw Brief / Conversation Notes

- 사용자 정체성: 숭실대 컴공 1학년 학생 + 현직 백엔드 개발자 (고졸, 비전공자 → 국비지원 → 현업, CS 기초 부족함을 자각하고 있음)
- 기존 워크플로: 매주 강의 키워드 메모 → `lecture-note-organizer` Claude 스킬로 강의자료(PDF) 참고하여 정리노트 생성 → Notion 업로드
- Trigger: 이번 중간고사 공부 시작하니 Notion 에 누적된 정리노트가 양이 너무 많고 가독성이 떨어져서 시험 학습용으로는 부적합 → 별도 학습 요약 서비스로 재가공 필요
- 기획 단계, 정해진 스펙 없음. 인프라 상한선만 정해짐: EC2 t3/t2 small 급 1대 정도, 풀스택 직접 구현 예정
- 사용자가 명시한 핵심 기능 5종:
  1. 개념설명
  2. 핵심요약 + 꿀팁
  3. 요약본을 "책처럼" 쭉쭉 읽히게, 재미요소 가미
  4. 요약 동영상 (있으면 좋음 — wishlist 톤)
  5. 범위 단위: 주차별 개별 + 시험범위(여러 주차 묶음) 전체

### G0 후속 답변 (2026-04-30, Q1~Q3 resolved)

- **A1. 입력 데이터 source**: Notion 폐기. 입력은 (a) 강의 PDF 원본 + (b) 사용자가 강의 중 작성한 짧은 키워드 메모 `.md` (예: "카르노맵 1~n 변수 카르노맵") 두 종류. 변환은 외부 LLM CLI (Claude / Codex 등) 가 PDF 와 키워드 노트를 받아 요약 산출물을 생성한 뒤 시스템에 업로드하는 흐름. 즉 LLM 추론은 EC2 안이 아니라 사용자 로컬·CLI 측에서 일어나고, 서비스는 **결과물 업로드 + 저장 + 뷰어**만 담당.
- **A2. 사용자 범위**: 본인 + 같은 학과 동기까지 공유. 따라서 간단한 로그인이 v1 범위에 포함될 수 있음 (이메일+비밀번호 또는 단일 OAuth 1종 정도, 권한은 viewer 단일 등급).
- **A3. 요약 동영상**: TTS + 슬라이드 자동 생성 방향. 단, AWS Bedrock 은 거의 안 쓸 가능성. 실제 생성은 Claude/Codex/Gemini 등 외부 호출로 사용자가 만들어 업로드하는 정적 자산 흐름이 기본선. 즉 서비스는 동영상 인코딩/렌더링을 하지 않고 업로드된 mp4(또는 외부 호스팅 링크) 를 재생만 함.

### G0 후속 답변 2차 (2026-04-30, Q4~Q6 partial-resolved)

- **A4. 인증 (v1)**: OAuth/SSO 안 씀. 이메일+비밀번호 자체 구현도 안 씀. **단일 공유 ID/PW + 질문형 본인확인**(예: "이 강의 교수님 성함은?") 으로 동기 여부만 판별하는 매우 가벼운 게이트. 표준 회원가입/세션 시스템 없음. 세부 정책은 사용자가 추후 제공 예정 → v1 plan 에서는 "1단계 게이트 컴포넌트 + 정책은 후속" 로 placeholder 처리.
  - 함의: 백엔드는 RBAC/세션·토큰 인프라 거의 안 만들어도 됨. 단순 미들웨어 한 겹.
- **A5. 업로드 포맷**: 기본은 **(b) `manifest.json + assets/` 구조**로 둠. 단 산출물 종류 리스트가 확정되면 (a) zip 한 묶음으로 단순화될 수도 있음. 즉 v1 데이터 흐름은 "(b) 가정 + 업로드 측이 zip 으로 묶어 보내도 받아서 풀어 (b) 로 정규화" 패턴이 가장 안전.
  - 산출물 후보(plan 에서 확정): `concept.md`(개념설명), `summary.md`(핵심요약+꿀팁), `book.md`(책 모드 long-form 본문), `video.mp4` 또는 `video.url`(외부 링크), `meta.json`(과목·주차·시험범위 태깅).
- **A6. 강의 범위 (v1)**: 다과목, 4과목 동시 지원. **디지털공학개론 / 정보통신개론 / C언어 / 컴퓨터개론.**
  - 함의: 데이터 모델은 처음부터 `course → week → artifact` 3단 + `exam_range`(여러 week 묶음) 1차원 태깅 구조로 설계해야 함.

### G0 후속 답변 3차 (2026-04-30, Q4-detail / Q5-detail / Q7 resolved)

- **A4-detail. 게이트 질문 (v1 4종 fixed)**:
  1. "C언어 교수님 성함은?"
  2. "디지털공학개론 수업 요일은?"
  3. "컴퓨터개론 교수님 성함은?"
  4. "정보통신개론 교수님 성함은?"
  - 정답은 평문 노출 금지 (소스 커밋 금지). 환경변수 또는 `.env` / S3 secret object 등 운영 secret 채널로 주입.
  - 통과 정책 1차안: 4문항 중 N문항 정답(예: 4/4 또는 3/4) → plan 에서 N 결정.
  - 실패 시: 단순 재시도 화면 + 시도 횟수 무제한(소규모 사용 가정) 또는 IP/세션 단위 rate limit 정도. plan 에서 결정.
  - 게이트 통과 후 세션은 짧은 만료(예: 24h) 의 서명된 쿠키 1개로 충분. JWT/refresh 같은 정식 토큰 인프라 불필요.
- **A5-detail. 산출물 종류 (v1 잠정)**: `concept.md` / `summary.md` / `book.md` / `video.(mp4|url)` / `meta.json` 5종 포함. 추후 수정·추가 가능 — manifest 스키마는 "선택 필드 추가에 열린 형태(unknown 키 허용)" 로 설계.
- **A7. 파일 저장 = S3 단일화 (lock-in)**: 업로드된 모든 산출물(`*.md`, `*.mp4`, `meta.json`) 은 **S3 에만 저장**. EC2 small 의 로컬 디스크에는 사이트 코드/실행 바이너리 외 사용자 컨텐츠를 두지 않는다.
  - 함의:
    - EC2 디스크 압박 R5 거의 해소. small RAM 만 R1 으로 남음.
    - 백엔드 책임 = (a) 업로드 presigned URL 발급, (b) S3 의 manifest 파싱 후 DB 에 색인, (c) 게이트 통과 후 다운로드 presigned URL 발급(또는 CloudFront 서빙) + 메타 조회 API.
    - DB 는 S3 객체 키와 메타데이터(과목·주차·시험범위 태그·생성시각 등)만 가짐. 본문은 DB 에 안 들어감.
    - 동영상은 S3 직접 재생 또는 외부 unlisted 링크. CDN 은 v1 미포함, 비용 보고 추가 결정.
    - 비용은 S3 storage + GET 요청 + (선택) CloudFront. 컨텐츠 양이 작으니 small 인스턴스 + S3 standard 로 월 $1~$5 수준 예상.

### G0 후속 답변 4차 (2026-04-30, micro-decisions all resolved)

- **A4-N. 통과 기준 = 4/4 (전체 정답)**. 부분 정답 통과 없음.
- **A4-rate. 재시도 = 무한 허용**. rate limit / IP 차단 없음. (소규모 사용 + 본인+동기 풀 가정상 abuse 위험 낮음 → YAGNI 적용.)
- **A5-final. 산출물 = 축소 시작**. v1 시점에 5종 전부를 강제하지 않음. manifest 가 unknown 키 허용 + 선택 필드 패턴이라, 사용자가 LLM 으로 산출물을 만드는 시점에 그 회차에 넣을 종류만 manifest 에 적어 업로드. 즉 업로드 흐름·뷰어는 "있는 산출물만 보여주기" 동작이 기본. **빈 산출물은 화면에서 자연스럽게 생략**.
- **A7-detail. 배포 형태 = EC2 + Docker Compose 단일 호스트**:
  - EC2 small 1대 안에 Docker network 구성, `docker-compose` 로 (a) 백엔드 컨테이너, (b) DB 컨테이너 (MySQL or PostgreSQL — plan 에서 1개 픽), (c) 프론트 정적 자산 서빙(예: nginx 컨테이너 또는 백엔드 통합) 을 띄움.
  - **로컬 우선 개발 → EC2 small 검증 → 안 되면 인스턴스 등급/구성 수정** 순서. 즉 v1 에 "EC2 small 강제" 는 hard goal, 미달 시 폴백 권한 명시.
  - **비용 무조건 최소화**: RDS 안 씀 (DB 도 same-host docker), CloudFront 안 씀 (1차), 도메인은 가장 싼 채널, S3 standard 사용 + lifecycle 정책 추후, 프리티어 가능한 항목 우선 활용.
  - 함의 / 새 risk:
    - **R1 (small RAM 압박) 다시 활성**: 백엔드 + DB + nginx 동거. MySQL/Postgres 각각 워크로드별 메모리 footprint 가 다름 → plan 에서 DB 선정 시 "small 메모리 풋프린트" 를 1순위로 평가.
    - 로컬 docker-compose = 운영 docker-compose 의 형상이 동일해야 "로컬 통과 → EC2 OOM" 디버그 비용 최소화.
    - DB 가 같은 호스트에 있으므로 S3 단일화의 의미는 "사용자 컨텐츠 본문" 한정. DB volume 은 EC2 디스크에 남음 — 색인 데이터만이라 용량 부담 작음.

---

## §2. Problem Space

- 누가 이 문제를 겪는가: 비전공 출신 / 기초 부실한 학생 본인 + 같은 과 동기들. 이론 강의(컴공 1학년 교양·전공기초 추정) 누적량을 시험 직전에 다시 흡수해야 하는 상황.
- 왜 지금 풀어야 하는가: 중간고사를 이미 한 번 겪으며 "Notion 정리노트는 작성용 포맷이지 학습용 포맷이 아니다" 가 검증됨. 기말 전에 학습 파이프라인을 한 단계 위로 올려야 다음 시험 사이클부터 효과를 본다.
- 기존 방식의 불편함:
  - Notion 페이지가 강의별·주차별로 단편화되어 있고, 시험범위 단위로 한 번에 훑기 어려움
  - 정리 톤이 "기록" 중심이라 처음 보는 개념을 빠르게 잡을 수 있는 "설명형" 콘텐츠가 빠져 있음
  - 텍스트만 있고 흐름 / 스토리 / 동기부여 요소가 없어 장시간 읽기 힘듦
  - 검색·재구성 비용이 높음 (수동으로 페이지 옮겨다님)
- 성공하면 어떤 상태가 되는가:

Return exactly this shape:
Verdict: pass | partial | fail
Evidence checked:
- ...
Findings:
- ...
Required CTO actions:
- ...
Final recommendation:
- ...

```

### 2026-04-30T21:14:15+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T121415Z.txt`
- run_requested: true
- auth_mode: `auto`
- prompt_size: `44526 bytes / 590 lines`
- prompt_body: stored in `prompt_path` only; not embedded in review.md to avoid recursive token growth.
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

### 2026-04-30T21:14:15+09:00 — CPO evaluator result (G1)

- executor: `codex`
- executor_cmd: `codex exec --full-auto --ephemeral --output-last-message ".sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T121415Z.result.md" -`
- exit_code: `0`
- stdout_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T121415Z.stdout.md`
- stdout_size: `1762 bytes / 23 lines`
- stderr_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T121415Z.stderr.txt`
- stderr_size: `61812 bytes / 889 lines`
- result_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T121415Z.result.md`
- result_size: `1761 bytes / 22 lines`

#### result excerpt

```text
Verdict: partial

Evidence checked:
- Embedded `brainstorm.md` G0 context and resolved decisions.
- Embedded `plan.md` G1 requirements, ACs, scope, decisions, sprint contract, backlog.
- Embedded `review.md` first 80 lines only, treated as non-authoritative because it contains a Claude same-session self-validation warning.
- `git status --short` / `git diff --stat`: no actual diff/stat evidence for generated docs beyond embedded files.

Findings:
- The plan is directionally solid: EC2 small, S3-only content, external LLM separation, no RDS/CloudFront/OAuth/RBAC, and stack decisions are coherent.
- Blocking for pass: several planning artifacts are asserted but not actually present in embedded evidence: 5-feature classification table, concrete `manifest.json` schema, component diagram, data-flow diagram, and data model fields/relationships.
- Gate/auth policy is mostly clear, but G1 plan should carry the fixed question set and env-var/secret names so CTO can implement without re-reading brainstorm.
- Current evaluator is Codex reviewing Claude output, so this review is independent. The prior embedded Claude verdict should not be counted as sufficient independent evidence.

Required CTO actions:
- Add the 5-core-feature v1/optional/deferred table.
- Add a concrete `manifest.json` draft with required fields, optional artifact entries, unknown-key policy, and one example.
- Add component and upload→index→viewer data-flow diagrams.
- Expand `Course`, `Week`, `Artifact`, `ExamRange`, `GateSession` into first-pass fields and relationships.
- Copy the 4 gate questions plus secret/env ownership into the plan.

Final recommendation:
- Do not close G1 as pass yet. Mark `partial`, apply the missing planning artifacts, then re-run G1 review.

```

### 2026-04-30T23:00:44+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T140044Z.txt`
- run_requested: true
- auth_mode: `auto`
- prompt_size: `50430 bytes / 672 lines`
- prompt_body: stored in `prompt_path` only; not embedded in review.md to avoid recursive token growth.
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

### 2026-04-30T23:00:44+09:00 — CPO evaluator result (G1)

- executor: `codex`
- executor_cmd: `codex exec --full-auto --ephemeral --output-last-message ".sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140044Z.result.md" -`
- exit_code: `0`
- stdout_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140044Z.stdout.md`
- stdout_size: `1716 bytes / 21 lines`
- stderr_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140044Z.stderr.txt`
- stderr_size: `68698 bytes / 969 lines`
- result_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140044Z.result.md`
- result_size: `1715 bytes / 20 lines`

#### result excerpt

```text
Verdict: partial

Evidence checked:
- `brainstorm.md`: resolved user constraints, EC2 small + S3 + external LLM flow, 4-course scope, gate policy.
- `plan.md`: R1-R7, AC1-AC10, Anti-AC1-4, stack lock-in, scope, Phase 1 backlog, feature classification table, manifest draft.
- `review.md`: prior pass noted, but treated as secondary evidence because it contains Claude self-validation risk.
- `git status`: all files untracked; no diff/stat evidence of a committed baseline.

Findings:
- The plan is directionally strong: EC2 small constraint, S3-only user content, external LLM separation, no RDS/CloudFront/OAuth/RBAC, and Phase 1 backlog are coherent.
- Current review is Codex evaluating Claude output, so this review is independent from the generator. The embedded prior `review.md` still has a same-session Claude self-validation warning and should not be the sole pass basis.
- AC1, AC2, AC3, AC6, AC7, AC8, AC9, AC10 are substantially supported by embedded evidence.
- Partial blocker: embedded evidence does not include the promised component diagram, data flow diagram, or detailed data model draft. AC4 and the CTO deliverables cannot be fully verified from the bundle.

Required CTO actions:
- Add or provide the missing EC2 small component diagram.
- Add or provide the external LLM → upload → S3 → DB index → viewer data-flow diagram.
- Add or provide the data model draft with core entities, relationships, and key fields for `Course`, `Week`, `Artifact`, `ExamRange`, and gate/session handling.

Final recommendation:
- Do not close G1 as pass from this embedded bundle alone. Treat it as partial, then rerun review with the full `plan.md` sections or add the missing diagrams/model evidence.

```

### 2026-04-30T23:09:49+09:00 — CPO evaluator invocation (G1)

- evaluator_role: CPO
- evaluator_persona: `.sfs-local/personas/cpo-evaluator.md`
- evaluator_executor: `codex`
- generator_executor: `claude`
- prompt_path: `.sfs-local/tmp/review-prompts/2026-W18-sprint-2-G1-20260430T140949Z.txt`
- run_requested: true
- auth_mode: `auto`
- prompt_size: `64752 bytes / 905 lines`
- prompt_body: stored in `prompt_path` only; not embedded in review.md to avoid recursive token growth.
- self_validation_policy: CTO Generator output must be checked by CPO Evaluator; independent tool/instance recommended.

### 2026-04-30T23:09:49+09:00 — CPO evaluator result (G1)

- executor: `codex`
- executor_cmd: `codex exec --full-auto --ephemeral --output-last-message ".sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140949Z.result.md" -`
- exit_code: `0`
- stdout_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140949Z.stdout.md`
- stdout_size: `1211 bytes / 21 lines`
- stderr_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140949Z.stderr.txt`
- stderr_size: `82494 bytes / 1198 lines`
- result_path: `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140949Z.result.md`
- result_size: `1210 bytes / 20 lines`

#### result excerpt

```text
Verdict: pass

Evidence checked:
- `brainstorm.md`: resolved G0 inputs, constraints, risks, accepted Option B.
- `plan.md`: R1-R7, AC1-AC10, Anti-AC1-4, scope, stack lock-in, diagrams, schema draft, data model, gate policy, Phase 1 backlog.
- `review.md` excerpt: noted but not treated as authoritative because it includes prior Claude self-validation risk.
- `git status --short`: all files untracked; acceptable for G1 content review, but no tracked diff evidence exists.

Findings:
- No blocking G1 findings.
- AC1-AC10 are materially satisfied and measurable.
- EC2 small, S3-only content storage, external LLM generation, no RDS/CloudFront/OAuth/RBAC all remain aligned with scope.
- Current review is Codex evaluating Claude-generated output, so this review is not same-tool self-validation.
- Minor G2 risk: `Course.professor_name` / `schedule_day` fields could accidentally drift into storing gate answers. G2 design should clarify these are display/masked fields only or remove them.

Required CTO actions:
- None required to pass G1.
- Carry the data-model secret ambiguity into G2 design review.

Final recommendation:
- Pass G1. Proceed to Phase 1/G2 design or close this planning sprint via retro.

```
