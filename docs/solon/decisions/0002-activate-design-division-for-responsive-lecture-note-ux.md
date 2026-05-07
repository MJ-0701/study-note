---
phase: decision
decision_id: "0002"
sprint_id: "2026-W18-sprint-4"
created_at: "2026-05-01T15:26:27+00:00"
status: accepted   # proposed | accepted | rejected | deprecated | superseded
gate: G2
related_review: ".sfs-local/sprints/2026-W18-sprint-4/design-review.md"
---

# Decision 0002 — Activate design division for responsive lecture note UX

## Context

- `divisions.yaml` 에서 design 본부는 기존 design template 차용을 이유로 `abstract` 상태였다.
- 현재 제품은 단순 Vite prototype 에서 과목별/주차별 reader, 과목별 JSON import, quick-note action, tablet/mobile responsive layout 까지 확장되었다.
- 사용자는 주요 사용 환경이 웹 데스크톱보다 iPad 같은 태블릿 PC와 모바일이라고 명확히 했다.
- 따라서 CPO 품질검증과 별개로, 정보구조, 가독성, touch interaction, 반응형 우선순위를 전담해서 보는 design 본부가 필요하다.

## Decision

We will activate the design division for Phase 1 lecture-note reader work.

Design division owns:

- tablet/mobile-first UX review
- subject/week information architecture
- lecture-note readability and scan order
- action hierarchy for quick-note, missing keyword, and subject intake flows
- responsive/touch/accessibility review before G4 handoff

## Alternatives

- Keep design as `abstract` and rely only on the borrowed `solon-design` template.
  - Rejected: the product now has domain-specific study flows that the generic docs template does not fully solve.
- Let CPO review cover design issues implicitly.
  - Rejected: CPO review checks overall product quality, but tablet/mobile reading ergonomics need a separate, explicit lens.

## Consequences

Positive:

- UX problems can be recorded before they become implementation debt.
- Tablet/mobile decisions become first-class sprint evidence rather than casual comments.
- The next implementation slice can target concrete design findings instead of broad "make it better" work.

Trade-off:

- Sprint artifacts gain one more review surface.
- Design activation does not mean Figma-heavy ceremony; artifacts stay lightweight unless a visual spec is actually needed.

Affected areas:

- `.sfs-local/divisions.yaml`
- `.sfs-local/sprints/2026-W18-sprint-4/design-review.md`
- future reader UI changes in `src/main.ts` and `src/styles.css`

## References

- Current sprint plan: `.sfs-local/sprints/2026-W18-sprint-4/plan.md`
- Current implementation notes: `.sfs-local/sprints/2026-W18-sprint-4/implement.md`
- Current work log: `.sfs-local/sprints/2026-W18-sprint-4/log.md`
- User direction on 2026-05-02: design division activation and tablet/mobile responsive priority.
