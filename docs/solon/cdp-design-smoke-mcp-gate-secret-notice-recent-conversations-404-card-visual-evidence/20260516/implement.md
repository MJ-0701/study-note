---
phase: implement
sprint_id: "2026-W20-sprint-9"
goal: "CDP design smoke — MCP gate / secret notice / recent conversations / 404 card visual evidence"
artifact_type: "CDP design smoke evidence"
created_at: "2026-05-16T00:40:00+09:00"
---

# CDP design smoke evidence

## 1. 변경 요약

- `scripts/smoke-persona-design.mjs` 신규:
  - Docker smoke DB, API server, Vite, headless Chrome 을 random port 로 실행.
  - Chrome DevTools Protocol 은 `127.0.0.1:<randomPort>` 로만 연결.
  - Chrome profile 은 temp `user-data-dir` 로 생성하고 cleanup.
  - DOM selector assertion + screenshot evidence + artifact secret scan 수행.
- `package.json`:
  - `smoke:persona-design` 추가.
- `apps/web/src/persona-turn/api/personaTurns.ts`:
  - cookie-auth endpoint 호출에 `credentials: "include"` 추가.
  - 대상: conversation create / history fetch / append turn / standalone persona turn.

## 2. AC evidence matrix

| AC | Evidence | Result |
|:--|:--|:--|
| AC1 CDP harness / localhost / temp profile | `pnpm smoke:persona-design` 로그의 `CDP localhost target ready: http://127.0.0.1:<port>` + 정상 cleanup | PASS |
| AC2 MCP gate | `evidence/01-mcp-gate.png`; selector `data-mcp-onboarding-gate`, actions `guide/completed/deferred/external-close` | PASS |
| AC3 secret notice | `evidence/02-secret-notice.png`; selector `data-secret-handling-notice`, `data-secret-handling-id=S1/S2/S3`, `#trouble` | PASS |
| AC4 recent conversations | `evidence/03-recent-conversations.png`; seeded active row `회로 1주차 요약해줘`, `href="#/conversation/<id>"` | PASS |
| AC5 stale 404 card | `evidence/04-conversation-404.png`; selector `data-conversation-not-found="true"` | PASS |
| AC6 mobile minimum | `evidence/05-mobile-gate.png`, `evidence/06-mobile-recent-conversations.png`; bounding-box viewport checks | PASS |
| AC7 evidence index | This document + screenshot files under `evidence/` | PASS |
| AC8 regression | web specs 12/12, 6/6, 7/7, 9/9 + web build | PASS |
| AC9 auth negative | `pnpm smoke:persona-design` signed-out row absence + `pnpm smoke:conversation-list` `(a)/(e)/(g)` | PASS |
| AC10 secret scan | `pnpm smoke:persona-design` output `artifact secret scan passed` | PASS |

## 3. Screenshot files

- `evidence/01-mcp-gate.png`
- `evidence/02-secret-notice.png`
- `evidence/03-recent-conversations.png`
- `evidence/04-conversation-404.png`
- `evidence/05-mobile-gate.png`
- `evidence/06-mobile-recent-conversations.png`

## 4. Verification commands

```text
pnpm smoke:persona-design
pnpm smoke:conversation-list
pnpm test:web-gate
pnpm test:web-onboarding-copy
pnpm test:web-recent-conversations
pnpm test:web-conversation-route
pnpm --filter @study-note/web build
```

## 5. Notes

- `pnpm smoke:persona-design` first exposed a false positive in the secret scan:
  evidence path date `20260516` matched the 8-digit PII heuristic. The scan now
  allows the evidence date explicitly while still checking captured session
  cookie values, DB URL, session pepper, session cookie assignments, and
  unexpected 8-digit values.
- The CDP visual evidence initially captured the recent conversations row while
  the MCP gate overlay was still open. The script now defers the gate before
  recent/404 scenes so the screenshot shows the target screen state directly.
- `personaTurns.ts` credential fixes are required for cross-origin Vite smoke:
  `fetchConversation` must send the cookie for the stale 404 card to render from
  backend `CONVERSATION_NOT_FOUND` instead of falling into a generic auth error.

## 6. Gate 6 review

- Command: `sfs review --gate 6 --executor codex --generator codex`
- Result: PASS
- Output: `.sfs-local/tmp/review-runs/2026-W20-sprint-9-gate6-20260515T154856Z-50352/result.md`
- Warning: generator/evaluator were both Codex, so review independence is recorded as a warning, not a product blocker.
- Next SFS action: `sfs retro`
