---
phase: report
status: final
sprint_id: "2026-W20-sprint-9"
workspace: "cdp-design-smoke-mcp-gate-secret-notice-recent-conversations-404-card-visual-evidence"
handoff_dir: "docs/solon/cdp-design-smoke-mcp-gate-secret-notice-recent-conversations-404-card-visual-evidence/20260516"
goal: "CDP design smoke — MCP gate / secret notice / recent conversations / 404 card visual evidence"
created_at: "2026-05-16T01:03:03+09:00"
last_touched_at: "2026-05-16T01:05:09+09:00"
closed_at: "2026-05-16T01:03:03+09:00"
---

# 보고서

## 1. 결과

- 목표: CDP design smoke 로 MCP onboarding gate, secret notice, recent conversations, stale conversation 404 card 의 시각 evidence 를 남긴다.
- 상태: done
- 판정: Gate 6 (Review) PASS, security lens.
- 한 줄 결과: headless Chrome CDP smoke 와 screenshot evidence 6개를 추가했고, smoke 중 드러난 cross-origin cookie-auth 누락을 bounded fix 로 닫았다.

## 2. 완료한 것

- `scripts/smoke-persona-design.mjs` 신규 추가.
  - Docker smoke DB, API server, Vite, headless Chrome 을 random port 로 실행.
  - Chrome DevTools Protocol 은 `127.0.0.1:<randomPort>` 로만 연결.
  - Chrome profile 은 temp `user-data-dir` 로 생성하고 cleanup.
  - DOM selector assertion, screenshot capture, artifact secret scan 을 수행.
- `package.json` 에 `smoke:persona-design` script 추가.
- `apps/web/src/persona-turn/api/personaTurns.ts` 에서 cookie-auth endpoint 호출에 `credentials: "include"` 추가.
  - 대상: conversation create, conversation history fetch, append turn, standalone persona turn.
- screenshot evidence 6개 생성.
  - `evidence/01-mcp-gate.png`
  - `evidence/02-secret-notice.png`
  - `evidence/03-recent-conversations.png`
  - `evidence/04-conversation-404.png`
  - `evidence/05-mobile-gate.png`
  - `evidence/06-mobile-recent-conversations.png`

## 3. 결정

- 이번 sprint scope 는 전용 CDP design smoke 와 evidence 남기기로 제한했다.
- vitest/jsdom infra, UI redesign, dots/menu, archive/delete/rename, pagination, visual diff baseline, smoke framework 전면 추출은 제외했다.
- CDP smoke 가 발견한 cookie-auth 누락은 acceptance blocker 라서 `personaTurns.ts` 에서 즉시 수정했다.
- AC10 secret scan 은 DOM/stdout/text 기반으로 수행했다. PNG OCR 은 이번 scope 에 포함하지 않았다.
- Gate 6 (Review) 는 Codex-on-Codex 로 실행되어 review independence risk warning 을 남겼고, product artifact blocker 는 없었다.

## 4. 검증

- 명령/체크:
  - `pnpm smoke:persona-design`
  - `pnpm smoke:conversation-list`
  - `pnpm test:web-gate`
  - `pnpm test:web-onboarding-copy`
  - `pnpm test:web-recent-conversations`
  - `pnpm test:web-conversation-route`
  - `pnpm --filter @study-note/web build`
  - `git diff --check`
- 결과:
  - `pnpm smoke:persona-design` PASS.
    - signed-out browser does not expose recent conversations.
    - MCP onboarding gate renders 4 stable actions.
    - onboarding secret-handling notice renders S1/S2/S3.
    - recent conversations sidebar renders seeded active row.
    - stale conversation URL renders 404 guidance card.
    - mobile gate/sidebar fit checks passed.
    - artifact secret scan passed.
  - `pnpm smoke:conversation-list` PASS.
    - cookie 부재 401, cross-owner leak guard, invalid subject validation guard 확인.
  - web regression specs PASS: 12/12, 6/6, 7/7, 9/9.
  - web build PASS.
  - Gate 6 (Review) PASS.
- 수동 확인:
  - `01-mcp-gate.png`: gate modal, stable actions, close action 확인.
  - `03-recent-conversations.png`: overlay 없이 recent row active 상태 확인.
  - `04-conversation-404.png`: 전용 404 guidance card 확인.

## 5. 위험 / 후속

- 위험:
  - `pnpm smoke:persona-design` 는 Docker + Chrome 이 필요하다. sandbox 에서는 Docker socket 권한 때문에 실패할 수 있다.
  - Gate 6 review 는 generator/evaluator 모두 Codex 라서 same-tool independence warning 이 남았다.
  - CPO runtime/profile proof 는 bundle 에서 독립 검증되지 않았다.
  - PNG OCR 은 하지 않는다. secret acceptance 는 DOM/stdout/text scan 과 no-secret UI assertion 에 의존한다.
- 후속:
  - Sprint-8 carry-over: apps/web vitest infra, handoff gamma, D1=b/D4/D5 후속, list item dots/menu UI.
  - SFS review adapter 가 Gate 6 실행 중 Gate 3 review scratch 를 중첩 생성한 현상은 solon-product upstream issue 후보.
  - 자동화 후보: implement slice 별 file split 을 plan §5.2 산출물 명세에서 강제.

## 6. 남긴 것 / 접은 것

- 남김:
  - 이 `report.md`.
  - `retro.md`.
  - `implement.md`.
  - screenshot evidence 6개.
- private archive:
  - `.sfs-local/archives/sprints/2026-W20-sprint-9/2026-05-16T01-03-03-09-00/sprint-evidence.tar.gz`
  - archive manifest 기준 raw workbench 4개와 tmp review scratch 151개가 cold history 로 접혔다.

## 7. 다음

- `sfs commit plan`
- 이후 의도한 group 을 확인한 뒤 `sfs commit apply --group <name>`
- 다음 sprint 후보는 carry-over 중 우선순위가 높은 `apps/web vitest infra` 또는 `list item dots/메뉴 UI`.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (269 tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-16T01:03:03+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
