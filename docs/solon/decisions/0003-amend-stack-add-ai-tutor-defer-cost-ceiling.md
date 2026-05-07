---
phase: decision
decision_id: "0003"
sprint_id: "2026-W19-sprint-1"
created_at: "2026-05-07T20:25:00+09:00"
status: accepted
gate: G1
amends: "0001"
related_plan: ".sfs-local/sprints/2026-W19-sprint-1/plan.md"
related_brainstorm: ".sfs-local/sprints/2026-W19-sprint-1/brainstorm.md"
---

# Decision 0003 — Amend ADR 0001: add AI tutor stack, defer cost ceiling

## Context

ADR 0001 (`0001-stack-lock-in-nestjs-vite-mysql-s3-env.md`) 은 NestJS + Vite + MySQL + S3 + .env
를 v1 stack 으로 lock-in 했다. 핵심 가정 두 가지가 본 sprint (`2026-W19-sprint-1`) 의
identity 재정의로 명시적으로 흔들렸다:

1. ADR 0001 §Alternatives 의 *"AWS Bedrock·외부 AI API 보류"* → identity 가 "AI 튜터
   페르소나가 PDF RAG 로 학습을 돕는다" 로 바뀌면서 Bedrock + RAG 가 1급 신규 자산이
   되었다.
2. ADR 0001 §Decision 의 *"비용 최소화 / EC2 small + S3 + 도메인 ≒ 월 $10 미만"* → AI 호출
   비용은 이 모델에 들어있지 않다. 비용 상한은 별도 ADR 에서 옵션 enumerate (proposed)
   하고 다음 sprint G2 직전 결정으로 미룬다.

ADR 0001 의 나머지 — backend NestJS · frontend Vite · DB MySQL 8 · object storage S3 ·
secret 채널 `.env`/EC2 environment — 는 본 sprint 에서 흔들지 않는다. 따라서 *supersede*
(전체 폐기) 가 아니라 *amend* (부분 갱신) 로 처리한다.

## Decision

ADR 0001 의 다음 두 항목을 본 ADR 로 갱신한다.

- **AI provider 가정**: "보류" → "AWS Bedrock primary + 로컬 AI agent (Claude CLI · Codex CLI ·
  Gemini CLI 등) fallback" 으로 채택. 상세 stack 결정은 ADR 0004 (AI tutor stack) 에서.
- **비용 가정**: "월 $10 미만 단일 가정" → "EC2 small + S3 + 도메인 hosting 비용은 그대로
  유지하되, AI 호출 비용은 별도 차원으로 분리. 안 A ($10) / 안 B ($30) / 안 C ($0
  no-Bedrock) 중 택1 — 결정은 ADR 0005 에서, 트리거는 다음 sprint G2 직전".

ADR 0001 의 다음은 그대로 유지한다 (재확인):

- Backend: NestJS · Frontend: Vite · DB: MySQL 8 · Object storage: AWS S3
- Secret 채널: `.env` (local) / EC2 environment (prod)
- "Spring/Kotlin·PostgreSQL·Next.js·AWS Secrets Manager·k8s 보류" — 동일 이유로 유지

## Alternatives

- **ADR 0001 전체 supersede**: 거부. NestJS/Vite/MySQL/S3 lock-in 이 무너질 이유가 없고, AI
  추가가 stack 의 *교체* 가 아니라 *확장* 이기 때문. 전체 supersede 는 다음 sprint 의 rewrite
  결과가 stack 자체를 흔들 때 (예: NestJS → Hono) 만 정당.
- **AI 비용을 본 ADR 안에서 단일 값 결정**: 거부. 사용자가 plan brainstorm Q3 에서 "아직
  모르겠음 — plan 에서 2개안 동시 고려" 로 결정 보류 선택. 단일 값을 강제하면 잘못된
  prematurely-locked 결정.
- **ADR 0001 의 "동기 4명" 사용자 가정 동시 갱신**: 본 ADR 에서는 안 한다. 사용자가 1인
  학습 전용으로 identity 를 좁혔고 SFS.md 에 "1인 운영" 으로 반영했으나, 이 이슈는 제품
  surface 결정 (multi-user share / single-user only) 의 일부라서 별도 ADR 후보로 backlog.

## Consequences

긍정:

- ADR 0001 의 "비용 최소화" 정신은 유지하면서 AI 호출 비용만 제어 가능한 차원으로 분리.
- Multi-provider fallback (ADR 0004) 이 "Bedrock 비용 폭증 시 즉시 0원으로 떨어짐 (안 C 또는
  fallback)" 을 가능하게 함 — 비용 안전망.
- ADR 0001 의 stack core 는 흔들지 않아 다음 sprint rewrite 의 backend/frontend 결정에는
  추가 부담 없음.

부정 / trade-off:

- ADR 0001 의 단일 값 ($10) 비용 가정이 ADR 0005 의 옵션 enumerate 로 분기되어, 운영
  비용을 단일 숫자로 말하기 어렵게 됨 — README/SFS.md 도 안 A/B/C 표기로 살아감.
- ADR 0001 의 "Bedrock 보류" 명문이 본 ADR 로 뒤집히면서, 다음 sprint G2 직전까지 사용자가
  AI 비용 의사결정 미루는 한 dev 시 Bedrock-호환 mock/stub 또는 로컬 agent 직접 사용 중
  default 를 ADR 0004 가 명시해야 함.

영향 받는 영역:

- README, SFS.md (이미 본 sprint R1·R2 로 갱신됨)
- ADR 0004 (AI tutor stack 본체)
- ADR 0005 (비용 옵션, proposed)
- ADR 0001 의 "Phase 1 backlog 의존" 항목은 본 ADR 의 amend 후에도 유효하지만, 다음 sprint
  rewrite 가 시작되면 그 backlog 자체가 재구성되므로 상위 plan 이 갱신.

## References

- ADR 0001: `docs/solon/decisions/0001-stack-lock-in-nestjs-vite-mysql-s3-env.md` (amends 대상)
- 본 sprint plan: `.sfs-local/sprints/2026-W19-sprint-1/plan.md` (R3 / AC2)
- 본 sprint brainstorm Q1·Q2·Q3 답: `.sfs-local/sprints/2026-W19-sprint-1/brainstorm.md` §9
