---
phase: decision
decision_id: "0004"
sprint_id: "2026-W19-sprint-1"
created_at: "2026-05-07T20:35:00+09:00"
status: accepted
gate: G1
related_plan: ".sfs-local/sprints/2026-W19-sprint-1/plan.md"
related_brainstorm: ".sfs-local/sprints/2026-W19-sprint-1/brainstorm.md"
follow_up_decisions:
  - "D2: 페르소나 4명 공통 system prompt 톤 (엄격한 교수 / 친근한 멘토 / 소크라테스식 질문자)"
  - "Bedrock 모델 최종 픽 (Haiku 4.5 vs Sonnet 4.6)"
  - "Vector store 최종 픽 (sqlite-vec vs pgvector vs OpenSearch vs FAISS)"
---

# Decision 0004 — AI tutor stack (persona value · multi-provider · RAG · governance)

## Context

본 sprint 의 product identity 가 "강의 PDF + 과목별 AI 튜터 페르소나로 최소 시간·최대 효율
학습" 으로 재정의되면서 (brainstorm Q1 답), AI 튜터 stack 의 모든 차원을 한 ADR 에 묶어
정착시킨다. 본 ADR 은 plan R5/AC3 의 (a)~(h) 모두를 포함한다.

핵심 invariant: **페르소나의 가치는 LLM provider 와 독립적으로 정의된다**. 이 invariant
가 깨지면 (K6) 사용자가 "어떤 모델을 쓰는지" 를 의식하게 되어 학습 흐름 끊김.

## Decision

### (a) 페르소나 가치 명세 (provider-independent)

공통 행동 기준 — 4 페르소나 모두 다음을 지킨다:

- 모든 답변은 **PDF 출처 (페이지/절 번호)** 를 명시한다.
- 답변 전에 **사용자 수준을 추정하는 짧은 질문 1개** 를 던진다 (회사일로 시간 제약 큼 → 깊이는 사용자 요청 시).
- 시험 핵심 우선순위를 표시한다 ("이건 매 시험에 나옵니다" / "이건 보조 개념입니다").
- 답변은 짧게 (default 5문장 이내), 사용자가 "더 깊이" 요청 시 확장한다.
- **PDF 외 정보로 추측 금지**. 모르면 모른다고 한다 + PDF 의 어느 부분을 더 봐야 할지 가리킨다.

과목별 가치:

- **디지털공학개론 페르소나**: 게이트·플립플롭·조합/순차회로·진법 기초. 진리표/논리식 변환을
  손계산 단계로 함께 풀어줌. PDF 의 도식 (게이트 그림) 을 자연어로 풀어 설명.
- **정보통신개론 페르소나**: 신호·전송·OSI/TCP·매체·변조. PDF 의 신호 도식·계층 다이어그램을
  자연어로 풀어 설명. "이 신호가 어떤 변조인지" 같은 시험 패턴을 PDF 예제와 함께 훈련.
- **C언어 페르소나**: 포인터·메모리·구조체·파일 IO·표준 라이브러리. 사용자가 작성한 코드
  단편을 받아 PDF 표준 예제와 비교. 컴파일 에러·undefined behavior 의 원인을 PDF 출처로
  가리킴.
- **컴퓨터개론 페르소나**: 하드웨어·OS·네트워크·DB·SE의 광범위 개론. PDF 의 어느 절이 시험
  범위에 포함되는지 우선순위. 사용자의 본업 백엔드 경험을 활용해 추상 개념을 실무 매핑으로
  연결 (사용자 1인 전용 컨텍스트라 가능).

### (b) Multi-provider fallback 전략

- **Primary**: AWS Bedrock (모델은 (c)).
- **Fallback** (순서): 로컬 AI agent — Claude CLI (`claude -p --dangerously-skip-permissions`)
  → Codex CLI (`codex exec --full-auto --ephemeral`) → Gemini CLI. 사용자 환경에 모두 존재.
- **Fallback 트리거**:
  1. ADR 0005 의 월 비용 안 채택값 도달.
  2. ADR 0005 안 C ($0, no-Bedrock) 채택 시 항상 fallback.
  3. Bedrock API 5xx 연속 3회 (장애).
- **Provider 교체 시 invariant**: (a) 의 행동 기준 동일, system prompt 골격 동일, RAG corpus
  동일, 응답 메타데이터 (출처) 동일.
- **변경 가능**: 응답 latency, 모델별 톤·길이의 미세 차이. UI 에서 "현재 provider: Bedrock |
  Claude | Codex | Gemini" 메타데이터 노출 (ADR 0006 design scope).

### (c) Bedrock 모델 후보

ADR 0005 안 결정에 따라 후속 결정. 본 ADR 은 후보군만 enumerate.

- 안 A ($10): **Claude Haiku 4.5** (저비용·짧은 응답, 학습 보조에 충분).
- 안 B ($30): Haiku 4.5 주력 + 어려운 질문 시 **Sonnet 4.6** within Bedrock.
- 안 C ($0): Bedrock 미사용. 후보 무관.

### (d) RAG corpus 경계

- **1차 (본 ADR)**: 강의 PDF 4과목. 페르소나는 자기 과목 corpus 만 참조 (cross-subject 금지).
- **2차 (옵션, 후속)**: 사용자 노트·필기·포스트잇. 데이터 거버넌스 (h.4) 결정 후 활성.
- **3차 (제외)**: 외부 웹·다른 학생 자료. 본 ADR 명시 제외.

### (e) Vector store 후보

ADR 0005 안 결정에 따라 후속 결정. 본 ADR 은 후보군만 enumerate.

- 후보 1: **pgvector** (PostgreSQL 추가 또는 별도 PG 인스턴스).
- 후보 2: **SQLite + sqlite-vec** (lightweight, EC2 small 친화).
- 후보 3: **OpenSearch** (AWS managed, 비용 +).
- 후보 4: **로컬 파일 (FAISS · LanceDB · Chroma)** — dev/local-only.
- 권장 매핑: 안 A → 후보 2, 안 B → 2 또는 3, 안 C → 4.

### (f) 페르소나 4명 + 4과목 동시 시작 + 점진 도입

- **명세**: 디지털공학개론·정보통신개론·C언어·컴퓨터개론 각 1 페르소나 = 4명.
- **시작 시점 (Q5 답)**: 4과목 동시 시작.
- **점진 도입 정책**:
  - 안 A 또는 안 C: 4 corpus 중 **1개만 active** 시작 → 비용·운영 안정 후 다음 corpus active.
    Stage 순서는 사용자 시험 일정 우선순위에 따름.
  - 안 B: 1과목 → 2과목 → 4과목 stage 도입 (1주 간격 기준).

### (g) Dev 환경 stub·mock 전략

- **Default**: 로컬 AI agent 직접 사용 (Claude CLI 또는 Codex CLI). 사용자 환경에 이미 있음.
  별도 mock 작성은 dev 부담 ↑, 실 LLM 응답을 못 봄.
- **보조**: 단위 테스트용 stub provider 1개 — deterministic fixture 응답. RAG/persona 흐름의
  단위 테스트에서만.
- **Bedrock 직접 호출**: staging/prod 진입 시점에만. dev 시는 fallback path 가 default.

### (h) 데이터 거버넌스

- **(h.1) 저작권/IP**: 강의 PDF 는 교수님 저작물. 사용 정당성 = 사용자 본인 학습 (개인
  fair use 가정). **외부 공유 절대 금지** (README/SFS.md 도 1인 운영 명시).
- **(h.2) Bedrock 송신 데이터 단위**: **embedding-only 권장**. PDF 청크 텍스트는 1회 embedding
  후 vector store 에 저장, 이후 답변 시점에는 사용자 query + retrieved chunk 만 송신. PDF
  원문 매회 송신 금지.
- **(h.3) 로컬 agent fallback 시 다른 cloud 송신**: 사용자 명시 동의. fallback 발동 시 UI 에
  1회 confirm 또는 메타데이터 ("응답 provider: Claude") 명시 표시 (ADR 0006 design scope).
- **(h.4) 사용자 노트·필기·포스트잇**: 본 sprint 송신 제외. corpus 2차 (d) 활성 시점에 별도
  ADR 로 동의 절차.
- **(h.5) Embedding/vector 저장 위치**: 로컬 EC2/MySQL 같은 user-controlled 저장소 우선.
  AWS managed (OpenSearch) 는 안 B 채택 시 옵션.
- **(h.6) Provider retention/training 정책**: AWS Bedrock = 학습용 미사용 (정책 명시).
  Anthropic / OpenAI / Google API = opt-out 가능. 각 provider 사용 전 사용자 본인이 console
  에서 opt-out 확인.

## Alternatives

- **단일 provider (Bedrock only) lock-in**: 거부. 비용 폭증·장애·안 C 채택 시 서비스 정지.
- **페르소나 가치를 system prompt 안에만 두고 별도 명세 없이 운영**: 거부. provider 교체 시
  invariant 가 깨질 위험 (K6) 을 제어할 가시 자료가 없어짐.
- **데이터 거버넌스를 별도 ADR (예: 0007) 로 분리**: 거부. 사용자가 ADR 4건으로 줄이기를
  명시 선택 (Q5 후속 답). stack 결정과 데이터 boundary 가 동일 ADR 안에 있는 편이 다음
  sprint 의 implement 시 한 번에 reference 하기 쉽다.

## Consequences

긍정:

- 페르소나 가치가 provider-independent 한 행동 기준으로 명문화 → K6 (톤 일관성) 측정 가능.
- Multi-provider fallback 으로 비용 폭증·장애 안전망 확보.
- 데이터 거버넌스가 stack 과 동일 ADR 안에 있어 다음 sprint implement 시 boundary
  의사결정 1곳에서 추적.

부정 / trade-off:

- ADR 본문이 1페이지 초과 (8 sub-element). 다음 sprint review 시 부담 ↑. mitigation: 본
  ADR 은 "결정 본문 + 1줄 사유" 위주, 상세 근거는 brainstorm.md 참조.
- (c) Bedrock 모델 / (e) vector store 가 후속 결정으로 미뤄져 다음 sprint G2 직전까지 stack
  시안이 floating. 그러나 ADR 0005 와 묶어 단일 트리거로 처리.
- (h.6) opt-out 확인은 사용자 본인의 manual console 작업. 자동화 안 됨.

## References

- Plan: `.sfs-local/sprints/2026-W19-sprint-1/plan.md` (R5 / AC3)
- Brainstorm: `.sfs-local/sprints/2026-W19-sprint-1/brainstorm.md` §9 (Q1·Q5 답)
- ADR 0003 (amend 0001 — Bedrock·비용 가정 변경)
- ADR 0005 (비용 옵션, proposed) — 본 ADR 의 (c)·(e)·(f) 후속 결정의 트리거
- ADR 0006 (design scope expand) — 본 ADR 의 (b) provider 메타데이터·(h) 거버넌스 UX surface
