---
phase: decision
decision_id: "0005"
sprint_id: "2026-W19-sprint-1"
created_at: "2026-05-07T20:40:00+09:00"
status: proposed
gate: G1
related_plan: ".sfs-local/sprints/2026-W19-sprint-1/plan.md"
related_adr:
  - "0003"  # amend 0001 비용 가정
  - "0004"  # AI tutor stack — fallback 설계 reference
trigger_for_decision: "다음 sprint G2 (Design) 진입 직전"
---

# Decision 0005 — Monthly AI cost ceiling options (proposed, deferred)

## Context

ADR 0001 의 단일 비용 가정 ("월 $10 미만") 은 ADR 0003 으로 amend 되어, AI 호출 비용은
별도 차원으로 분리되었다. 사용자 (brainstorm Q3 답) 는 본 sprint 에서 단일 값 결정을
미루고 "안 A vs B vs C 동시 enumerate" 를 선택했다. 본 ADR 은 그 옵션 표를 정착시키고,
status 를 `proposed` 로 둔 채 다음 sprint G2 직전을 결정 트리거로 명시한다.

ADR 0004 (AI tutor stack) 의 multi-provider fallback 설계와 본 ADR 의 어느 안도 모순되지
않는다 — 안 A·B 는 Bedrock primary + 한도 도달 시 fallback, 안 C 는 항상 fallback.

## Decision (proposed — not yet accepted)

세 가지 안 중 1개를 다음 sprint G2 직전에 픽한다. **본 sprint 에서는 결정하지 않는다.**

| 차원 | 안 A ($10/월) | 안 B ($30/월) | 안 C ($0/월, no-Bedrock) |
|:--|:--|:--|:--|
| **AI provider primary** | AWS Bedrock | AWS Bedrock | 없음 (로컬 agent only) |
| **Bedrock 모델** | Claude Haiku 4.5 | Haiku 4.5 + 어려운 질문 시 Sonnet 4.6 | 해당 없음 |
| **Fallback 발동 조건** | 월 $10 도달 | 월 $30 도달 | 항상 (default 가 fallback) |
| **Fallback provider** | Claude CLI / Codex CLI / Gemini CLI | 동일 | 동일 |
| **RAG 청크 전략** | 작은 청크 (256 token), aggressive cache | 중간 청크 (512 token), normal cache | 청크 정책 무관 (로컬 agent context window 활용) |
| **Vector store** | sqlite-vec (lightweight) | sqlite-vec 또는 OpenSearch | 로컬 파일 (FAISS · LanceDB · Chroma) |
| **일일 질의 한도** | 약 20-40회 (Haiku 기준) | 약 100-200회 | 사용자 로컬 agent 사용량에 따름 (별도 한도 없음) |
| **점진 도입 (4과목)** | 1 corpus active 시작 | 1→2→4 stage (1주 간격) | 1 corpus active 시작 |
| **데이터 송신 단위** | embedding-only + retrieved chunk | 동일 | 로컬 agent 로 retrieved chunk 송신 (Anthropic/OpenAI/Google cloud) |
| **사용자 동의 부담** | Bedrock opt-out 1회 + fallback 동의 | 동일 | fallback provider opt-out 만 |

## Decision trigger

본 ADR 의 status 를 `proposed` → `accepted` 로 전환하는 시점:

- **다음 sprint (`2026-W19-sprint-2` 또는 후속) 의 G2 (Design) 진입 직전.**
- 트리거가 발생하면 사용자가 위 표 중 1개 안을 선택하고, 본 ADR 본문에 `selected: A|B|C`
  필드를 추가, status 를 `accepted` 로 변경한다. 동시에 ADR 0004 의 (c)·(e)·(f) 후속 결정도
  같은 PR 에서 fix.

## Alternatives

- **본 sprint 에서 단일 안 강제 결정**: 거부. brainstorm Q3 답이 명시 보류. 잘못된 prematurely-locked
  결정 방지.
- **3개가 아닌 2개 안 (A/B 만)**: 거부. 안 C ($0, no-Bedrock) 는 사용자가 명시 추가한 시나리오
  ("Bedrock 사용하지 않을 경우") — 빼면 multi-provider fallback 설계의 하나의 valid path 가
  사라짐.
- **status 를 `accepted` 로 두고 "최종 결정은 별도" 표시**: 거부. ADR 워크플로 상 status 와
  실제 결정 상태가 일치해야 후속 추적이 명확.

## Consequences

긍정:

- 다음 sprint G2 진입 시점에 정확히 1개 결정만 하면 되도록 의사결정 surface 좁힘.
- 안 C 가 표에 있어 "비용 0원 운영" 이 항상 valid path 임이 가시화 — 비용 폭증 안전망.
- ADR 0004 의 후속 결정 (Bedrock 모델·vector store) 이 본 ADR 의 안 결정과 단일 트리거로
  묶임.

부정 / trade-off:

- 다음 sprint G2 직전까지 (c)·(e)·(f) 가 floating — design 단계에서 실제 모델 호출 spike
  를 못 함. 안 채택 후에 spike 가 시작되므로 design → spike 흐름이 1 step 더 필요.
- 사용자가 G2 직전에 결정을 또 미루면 같은 패턴이 다음 sprint 에서 반복 — K1 위험. mitigation:
  본 ADR 의 trigger 가 빠지면 다음 sprint plan 이 자동 blocked 로 marking.

## References

- Plan: `.sfs-local/sprints/2026-W19-sprint-1/plan.md` (R6 / AC4 / D1)
- Brainstorm: `.sfs-local/sprints/2026-W19-sprint-1/brainstorm.md` §9 Q3 답
- ADR 0003 (amend 0001 — 비용 가정 분리)
- ADR 0004 (AI tutor stack — fallback 설계가 본 ADR 의 모든 안과 호환됨을 명시)
