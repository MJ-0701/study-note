---
phase: decision
decision_id: "0001"
sprint_id: "2026-W18-sprint-2"
created_at: "2026-04-30T14:12:09+00:00"
status: accepted   # proposed | accepted | rejected | deprecated | superseded
gate: G1
related_review: ".sfs-local/sprints/2026-W18-sprint-2/review.md"
---

# Decision 0001 — Stack lock-in: NestJS + Vite + MySQL + S3 + .env

## Context

- 본 ADR 의 트리거는 sprint `2026-W18-sprint-2` 의 G1 plan gate 통과(2026-04-30T14:09:49Z, codex independent CPO `pass`).
- Plan(`plan.md`) §3 Dependencies/Decisions 의 D1~D5 는 이미 lock-in 되어 있지만, 후속 sprint(Phase 1 implementation 이후 G2/G3/G4) 에서 stack 변경 압력이 들어왔을 때 추적/재검토 가능하도록 ADR 형태로 별도 정착이 필요.
- 사용자 제약 핵심: **EC2 small (≈2 vCPU / 2GB RAM) 1대 + Docker Compose**, 비용 최소화(RDS/CloudFront 미사용), 1인 운영 + 동기 4명 내외 사용, 풀스택 학습 부수 목표(컴공 1학년 + 현직 백엔드).
- 사용자 본업 스택은 Spring Boot + Kotlin 이지만 본 프로젝트에 그대로 적용 시 small RAM 위반 위험.

## Decision

We will lock-in the v1 stack as:

- **Backend**: NestJS (Node.js + TypeScript)
- **Frontend**: Vite (SPA)
- **DB**: MySQL 8 (same-host docker container)
- **Object storage**: AWS S3 (사용자 컨텐츠 본문·동영상 단일 저장소)
- **Secret 채널**: `.env` (local) / EC2 environment (prod)

핵심 근거 3개:

1. EC2 small RAM 친화 — JVM 대비 Node 단일 런타임이 가볍고, MySQL 8 default 메모리 풋프린트가 Postgres 대비 약간 가벼움(소규모 워크로드 기준).
2. 풀스택 일관성 — Vite 와 NestJS 가 동형 TypeScript, 동일 toolchain 으로 학습·운영 부담 최소화.
3. 비용 최소화 — RDS / CloudFront / Secrets Manager / SSM Parameter Store 미사용, S3 standard + EC2 small + 도메인만으로 운영. 본 프로젝트의 학생 자비 예산 정책에 부합.

## Alternatives

- **Spring Boot + Kotlin (사용자 본업 스택)** — 보류. 사유: JVM + MySQL + nginx 동거 시 EC2 small (2GB) RAM 압박 큼. Plan §6 backlog item 9 의 Local↔EC2 parity 검증 단계에서도 동일 결론 가능성 높아 사전 회피.
- **PostgreSQL 16** — 보류. 사유: NestJS ORM(Prisma/TypeORM) 친화도 MySQL 과 동등, JSON 컬럼·기본 SQL 모두 본 워크로드(읽기 중심 색인) 에 결정적 차이 없음. MySQL 의 약한 사용자 선호 + 운영 단순성 우선.
- **Next.js (SSR)** — 보류. 사유: 본 v1 의 화면은 게이트 + 과목/주차/시험범위 3종 reader 정도라 SSR 가치 낮고, Node 프로세스 1개 추가 시 small RAM 부담.
- **AWS Secrets Manager / SSM Parameter Store** — 보류. 사유: 사용자 비용 최소화 정책. 본 v1 의 secret 갯수(공유 ID/PW + 4문항 정답 + cookie 서명키 ≤ 7개) 와 운영자 수(1인) 가 작아 `.env` 로 충분, 평문 git 커밋 금지(Anti-AC2) 만 강제.
- **EKS / k8s / 멀티 인스턴스** — 보류. 사유: scope 외(brainstorm Out Of Scope), 동기 4명 트래픽으로 over-engineering.

## Consequences

긍정:

- 코드베이스가 단일 TypeScript 로 묶여 학습·디버깅 비용 낮음.
- 비용이 EC2 small + S3 + 도메인 ≒ 월 $10 미만으로 예상 가능.
- 사용자 컨텐츠 본문이 S3 에만 저장(plan Anti-AC3) 되어 EC2 디스크 압박 거의 0.
- ADR 로 정착되어 후속 sprint(Phase 1~4) 의 G2/G3/G4 review 시 stack 일관성 자동 검증 기준이 됨.

부정 / trade-off:

- 사용자 본업 스택(Spring/Kotlin) 학습 효과를 본 프로젝트로 직접 받지 못함 — 풀스택 학습 부수 목표는 Node/NestJS 로 전환됨을 수용.
- MySQL 의 JSON 컬럼·고급 인덱싱은 Postgres 만큼 풍부하지 않음 — 미래에 추천/검색 같은 기능을 붙이게 되면 stack 재평가 필요(별도 ADR).
- `.env` 운영의 사람 의존성: secret rotation 의무 없음 → 사용자 부주의로 평문 노출 가능. mitigation: `.env.example` 만 커밋 + `.gitignore` 강제 + 가능하면 `gitleaks` pre-commit hook.

영향 받는 영역:

- Phase 1 backlog 1·2·5 (compose · DB · gate) 가 본 ADR 에 직접 의존.
- G2 design 시 plan §10 데이터 모델은 본 ADR 의 MySQL 8 전제로 ORM(Prisma 또는 TypeORM) 1개 픽 후 마이그레이션.
- G3 deployment 시 S3 bucket 정책 + CORS + presigned URL TTL 이 본 ADR 의 "S3 단일화" 전제 위에 설계됨.

## References

- Sprint plan: `.sfs-local/sprints/2026-W18-sprint-2/plan.md` (frontmatter `stack` 필드, R7, AC9, AC10, §3 D1~D5, §11)
- Sprint brainstorm: `.sfs-local/sprints/2026-W18-sprint-2/brainstorm.md` (G0 후속 답변 1·2·3·4차, A1~A7, A4-detail, A5-detail, A7-detail)
- G1 review (codex pass): `.sfs-local/tmp/review-runs/2026-W18-sprint-2-G1-20260430T140949Z.result.md`
- Solon adapter patch (review embed window 800/400/220/80): `.sfs-local/scripts/sfs-review.sh:508`
- 관련 사용자 제약: `CLAUDE.md` (Solon SFS 워크플로) + `SFS.md`
