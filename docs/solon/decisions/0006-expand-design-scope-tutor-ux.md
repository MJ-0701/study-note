---
phase: decision
decision_id: "0006"
sprint_id: "2026-W19-sprint-1"
created_at: "2026-05-07T20:30:00+09:00"
status: accepted
gate: G1
amends: "0002"
related_plan: ".sfs-local/sprints/2026-W19-sprint-1/plan.md"
---

# Decision 0006 — Expand design division scope: add AI tutor UX

## Context

ADR 0002 (`0002-activate-design-division-for-responsive-lecture-note-ux.md`) 는 design 본부를
"tablet/mobile lecture-note reader UX" owner 로 활성화했다. 본 sprint 의 product identity
재정의로 1급 surface 가 **lecture-note reader → AI 튜터 QA 대화 + PDF 보조 surface** 로
이동한다. 이에 대해 design 본부 scope 를 어떻게 처리할지 결정한다.

세 가지 후보:

- **유지** (no change): design 은 reader UX 만 owner. tutor UX 는 다른 본부 (또는 owner 없음).
- **확장** (expand): design owner scope 를 reader + tutor UX + PDF↔chat split layout 까지로
  넓힌다. ADR 0002 의 활성 상태와 lead 는 유지.
- **Supersede**: ADR 0002 폐기 후 새 design 본부 scope 정의 ADR 발행.

## Decision

**확장 (expand)** 을 선택한다. ADR 0002 의 design 본부 활성 상태·lead·일반 정신은 유지하되,
owner scope 를 다음으로 확장한다:

- 기존 ADR 0002 scope (유지):
  - tablet/mobile-first UX review
  - subject/week information architecture
  - lecture-note readability and scan order
  - responsive/touch/accessibility review
- 본 ADR 로 추가 scope:
  - **AI 튜터 QA 대화 UX** — 채팅 메시지 ergonomics, persona presence/voice, 스트리밍 응답
    표시, 인용/PDF 출처 표시, fallback (Bedrock → 로컬 agent) 전환 시 사용자 가시성 정책.
  - **PDF ↔ chat split layout** — 좁은 화면 (iPad/모바일) 에서 PDF 본문과 페르소나 대화의
    동시 표시 / 전환 정책. 사용자 펜 필기·메모와의 공존.
  - **Persona 톤·voice 가이드 (UX 측면)** — D2 (페르소나 4명 공통 system prompt 톤) 가
    결정될 때 그 톤이 UI 상에서 어떻게 보여지는지 (avatar, 명칭 표기, 메시지 헤더 등) 의
    UX 측면. 톤 자체 결정은 ADR 0004 의 후속 결정 항목.
  - **데이터 거버넌스 UX** — 강의 PDF 가 cloud provider 로 송신될 때 사용자에게 그 사실을
    보여주는 in-product 표시 (예: "이 답변은 Bedrock 으로 전송된 PDF 청크 기반" 메타데이터),
    안 C (no-Bedrock) 채택 시에도 같은 자리에 "로컬 agent 전송" 표시.

## Alternatives

- **유지**: 거부. 1급 surface 가 tutor 로 이동했는데 design 이 reader 만 보면, 가장 사용자
  대면 surface 가 design ownership 공백 상태가 되어 K6 (페르소나 톤 일관성 깨짐) 위험을
  못 잡는다.
- **Supersede**: 거부. ADR 0002 의 정신 (tablet/mobile-first, ergonomics, 명시적 design
  본부 활성) 이 그대로 유효하다. supersede 는 새 ADR 본문이 ADR 0002 의 95% 를 그대로
  복제하게 만들어 noise 만 늘림.

## Consequences

긍정:

- 1급 surface (tutor QA) 가 design ownership 안에 들어옴 → K6 (페르소나 톤·UX 일관성) 의
  실제 review surface 확보.
- 다음 sprint rewrite 의 frontend 작업 (rewrite map 에서 reader 가 폐기 또는 재구축 대상)
  이 design review 를 명확한 owner 와 함께 진행 가능.
- 데이터 거버넌스의 사용자 가시성 (provider 송신 표시) 이 design 본부 scope 에 들어와
  ADR 0004 (h) 의 결정이 UI 까지 자연스럽게 연결됨.

부정 / trade-off:

- Design 본부 scope 가 넓어져서 design review 산출물이 reader / tutor / 데이터 거버넌스
  UX 세 surface 를 동시에 봐야 함. mitigation: 각 sprint 의 design-review.md 에서 surface
  하나씩만 deep-dive, 나머지는 sanity check.
- Persona 톤·voice (UI 표기) 의 결정은 ADR 0004 의 후속 결정 항목인데, design review 가
  D2 결정 전에 이걸 미리 가이드 만들면 D2 결정에 design 의견이 강하게 반영될 수 있음 —
  이는 의도된 협업 양상으로 본다.

영향 받는 영역:

- `.sfs-local/divisions.yaml` 의 design 본부 notes 항목은 본 ADR 로 갱신 (별도 commit).
- 다음 sprint rewrite 의 frontend 작업 시 design-review.md 가 필수 산출물.
- README §"Core Experience" 의 흐름 (특히 2~4단계 페르소나 대화 부분) 이 design review
  대상이 됨.

## References

- ADR 0002: `docs/solon/decisions/0002-activate-design-division-for-responsive-lecture-note-ux.md`
- 본 sprint plan: `.sfs-local/sprints/2026-W19-sprint-1/plan.md` (R4 / AC5)
- ADR 0004 (AI tutor stack, 본 sprint R5 산출): persona 가치·톤·UX 가시성의 source-of-truth.
