---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W20-sprint-9"
workspace: "cdp-design-smoke-mcp-gate-secret-notice-recent-conversations-404-card-visual-evidence"
handoff_dir: "docs/solon/persona/conversation/design-smoke-mcp-gate-recent-conversations/20260516"
goal: "CDP design smoke — MCP gate / secret notice / recent conversations / 404 card visual evidence"
created_at: ""
last_touched_at: "2026-05-16T01:05:09+09:00"
closed_at: 2026-05-16T01:03:03+09:00
---

# 회고

## 1. 계속할 것

- CDP smoke 를 DOM assertion, visual screenshot, security negative evidence 로 묶는 방식은 유지한다.
- UI screenshot 은 target scene 이 실제로 보이도록 overlay/gate state 를 먼저 제어한다.
- secret scan 오탐이나 404 fallback 같은 문제를 smoke 중 발견하면 scope 밖으로 밀지 않고 bounded fix 로 닫는다.
- report/retro 에는 raw scratch 대신 durable evidence, command result, warning 만 남긴다.

## 2. 문제

- Docker socket 은 sandbox 안에서 바로 접근되지 않아 smoke 실행에 권한 승인이 필요했다.
- 처음 recent conversations screenshot 은 MCP gate overlay 가 남아 target scene evidence 로 부적합했다.
- secret scan 이 evidence date `20260516` 을 8-digit PII 로 오탐했다.
- `fetchConversation` 이 cookie 를 보내지 않아 stale 404 card 가 backend `CONVERSATION_NOT_FOUND` 대신 generic auth path 로 흐를 수 있었다.
- `sfs review --gate 6` 실행 중 Gate 3 review scratch 가 중첩 생성되는 adapter 이상 징후가 있었다.

## 3. 시도할 것

- CDP smoke 에서 scene 별 precondition 을 명시적으로 둔다.
- secret scan allowlist 는 evidence date 처럼 synthetic/structural 값만 좁게 허용한다.
- cookie-auth frontend port 는 신규 endpoint 추가 시 `credentials: "include"` 여부를 점검한다.
- SFS review adapter 의 Gate 6 재진입/Gate 3 scratch 생성 현상은 solon-product upstream 재현 후보로 남긴다.

## 4. 이어갈 것

- Sprint-8 carry-over:
  - apps/web vitest infra.
  - handoff gamma 운영 ADR / 배포.
  - D1=b / D4 / D5 후속.
  - list item dots/메뉴 UI.
- 이번 sprint 후속:
  - PNG OCR 기반 secret scan 은 필요성이 생길 때 별도 slice 로 검토한다.
  - CDP smoke 의 공통 helper 추출은 smoke 가 2~3개 더 누적된 뒤 판단한다.
  - infra activation light 추천은 배포/관측/rollback sprint 를 잡을 때 반영한다.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (269 tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-16T01:03:03+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
