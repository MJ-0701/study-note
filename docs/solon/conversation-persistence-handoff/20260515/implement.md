---
phase: implement
sprint_id: "2026-W20-sprint-8"
goal: "conversation persistence handoff β"
worker: "Opus 4.7 (plan §5.1 의 gpt-5.3-codex / gpt-5.4 대체)"
artifact_type: "index — slice 별 file split (sprint-8 retro §3 시도할 것 적용)"
---

# sprint-8 implement — index

reviewer bundle truncation 회피 위해 slice 별 file split. 본 index 가 각
implement-slice-N.md + 추가 fix doc 의 entry point.

## 1. slice 인덱스

| slice | scope | file | commit |
|:--|:--|:--|:--|
| slice-1 | backend LIST endpoint + derivedTitle PII redact | [implement-slice-1.md](implement-slice-1.md) | `d0eb657` |
| slice-2 | frontend sidebar "최근 대화" group + listConversations port | [implement-slice-2.md](implement-slice-2.md) | `85a8ff9` |
| slice-3 | URL fragment routing + App.tsx wiring + 404 안내 | [implement-slice-3.md](implement-slice-3.md) | `59260dc` |
| slice-4 | smoke-conversation-list (AC4 7 시나리오) | [implement-slice-4.md](implement-slice-4.md) | `9ce4cfe` |
| PR P1+P2 fix | turn submit race + derivedTitle redact 순서 | [implement-pr-p1-p2-fix.md](implement-pr-p1-p2-fix.md) | `2591132` |

## 2. AC ↔ slice ↔ 산출물 mapping

| AC | 산출물 | slice | 검증 |
|:--|:--|:--|:--|
| AC1 LIST endpoint | `apps/api/src/persona/conversation.controller.ts` `@Get()` + `packages/persona-engine/src/services/conversation.service.ts` `list()` + `dto/conversation.dto.ts` `ListConversationsQueryDto` | slice-1 | spec 16/16 + smoke (a)(b)(c)(d) |
| AC1-amend PII redact | `conversation.service.ts` `deriveTitleFromQuery` (PR P2 fix 으로 단일 alternation regex) | slice-1 + P2 fix | spec 16/16 (P2 회귀 가드 포함) + smoke (f) |
| AC2 sidebar group | `apps/web/src/persona-turn/components/PersonaSidebar.tsx` + `recent-conversations.ts` + `personaTurns.ts` `listConversations` | slice-2 | spec 7/7 (recent-conversations) + web build |
| AC3 URL routing | `apps/web/src/persona-turn/conversation-route.ts` + `App.tsx` hashchange useEffect + 404 안내 카드 + PR P1 fix race guard | slice-3 + P1 fix | spec 9/9 (conversation-route) + web build |
| AC4 smoke | `scripts/smoke-conversation-list.mjs` + `package.json` `smoke:conversation-list` | slice-4 | 7 시나리오 (a-g) 통과 |

## 3. 검증 evidence 종합

### 3.1 `pnpm smoke:conversation-list` (전 시나리오 통과)

```
(a) GET /v1/conversations without cookie → 401
(b) empty list after sign-in OK
(c) 1 conversation + 1 turn → derivedTitle / turnCount OK
(d) subject query param filter OK
(e) cross-owner leak guard OK
(f) derivedTitle PII redact OK
(g) subject query param validation guard OK
Conversation list smoke passed
```

### 3.2 unit test 종합 (P1+P2 fix 반영 후)

| spec | runner | pass / total |
|:--|:--|:--|
| `conversation.service.spec.js` (persona-engine) | `node --test packages/persona-engine/dist/services/__tests__/conversation.service.spec.js` | 16/16 |
| `recent-conversations.spec.ts` (web) | `pnpm test:web-recent-conversations` | 7/7 |
| `conversation-route.spec.ts` (web) | `pnpm test:web-conversation-route` | 9/9 |
| `gate-state.spec.ts` (web, sprint-7 회귀 가드) | `pnpm test:web-gate` | 12/12 |
| `secret-handling-copy.spec.ts` (web, sprint-7 회귀 가드) | `pnpm test:web-onboarding-copy` | 6/6 |
| backend (api) | `pnpm test:backend` | 11/11 |
| **합계** | — | **61 case 모두 통과** |

### 3.3 build

- `pnpm --filter @study-note/persona-engine build` → tsc 0 에러.
- `pnpm --filter @study-note/api build` → tsc 0 에러.
- `pnpm --filter @study-note/web build` → tsc + vite 통과 (persona-turn bundle 92.29 kB).

## 4. 보안 요약 (cpo-evaluator security lens 대응)

- **cross-owner filter** = `where: { ownerId: req.user.id }` 단독. service `list()`
  + 기존 `history()` / `appendTurn()` 모두 동일 패턴. smoke (e) 회귀 가드.
- **PII redaction** = `deriveTitleFromQuery` 단일 alternation regex
  `/[a-f0-9]{32,}|\d{8}/gi`. hex 좌측 우선이라 partial leak 회피 (P2 fix).
  spec "hex 토큰이 8자리 digit run 으로 시작해도 partial leak 없음" + smoke (f)
  양쪽 가드.
- **subject Shield Pattern** = `^[a-z][a-z0-9-]{0,63}$` regex + MaxLength 64
  (`ListConversationsQueryDto`). global ValidationPipe 가 위반 시 400. smoke (g)
  5 bad subject 모두 거부.
- **404 vs 403** = LIST 는 cross-owner row 누락 (= empty), GET `:id` 는 404. 모두
  existence leak X. URL fragment 의 stale id 도 cuid 패턴 검증 + 404 안내 카드 분리.
- **cookie-only enforcement** = sprint-7 `SessionAuthGuard` regression guard 그대로
  적용. smoke (a) cookie 부재 401.
- **turn submit race** = `liveConversationIdRef` + active id mismatch 시 discard
  (P1 fix). 다른 conversation 의 UI 에 stale response 가 섞이지 않음.

## 5. cross-CPO 진척 (sfs review --gate 6)

| 회차 | verdict | 처리 |
|:--|:--|:--|
| 1 | partial | F1 evidence packaging (단일 implement.md bundle truncation — slice-2/3/4 본문 reviewer 가 못 봤다고 오인) + F2 prior Gate 3 record reuse + F3 reviewer-runtime profile (artifact 무관). |
| **재시도 준비** | — | (1) implement.md → slice 별 file split (본 commit). (2) smoke 실행 output 명시 embed. (3) P1+P2 fix 별 file (PR review 사항 반영). |
| 2 | (대기) | re-run 후 결과 본 표 갱신. |

본 sprint G6 PASS 는 0.6.87 `cpo-evaluator.md` policy 그대로 — **codex GitHub bot
review 는 external evidence only**. PASS 는 `sfs review` 가 기록하거나 사용자가
명시 waive 한다.