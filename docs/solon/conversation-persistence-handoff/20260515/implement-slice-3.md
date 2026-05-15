---
phase: implement
sprint_id: "2026-W20-sprint-8"
slice_id: "slice-3"
slice_title: "URL fragment routing + App.tsx wiring + 404 안내"
goal: "conversation persistence handoff β"
worker: "Opus 4.7"
---

# slice-3 implement — URL fragment routing + App.tsx wiring + 404 안내

## 10. slice-3 산출물

### 10.1 신규

- `apps/web/src/persona-turn/conversation-route.ts` —
  `parseConversationRoute(hash)` + `buildConversationRoute(id)` pure 함수.
  cuid 패턴 (`^c[a-z0-9]{24,}$/i`) 검증으로 stale URL leak 방지.
- `apps/web/src/persona-turn/conversation-route.spec.ts` — 9 case node:test
  (empty / 정상 추출 / 정규화 / cuid 패턴 미일치 / 다른 fragment / query suffix
  + buildConversationRoute null / cuid / round-trip).

### 10.2 수정

- `apps/web/src/persona-turn/App.tsx`:
  - `readInitialConversationId()` 추가 — URL 우선, localStorage fallback.
  - `conversations` state + `conversationNotFound` state 추가.
  - `useEffect` 3개 추가:
    - `hashchange` 리스너 — back/forward + sidebar 클릭 모두 cover.
    - `conversationId` 변경 시 `history.replaceState` + localStorage 동기.
      hashchange 무한 루프 방지 (`if (window.location.hash !== expectedHash)` 가드).
    - `authState === "signed-in" && conversationId 변동` 시 `listConversations()`
      fetch — sidebar list 자동 갱신.
  - `useEffect` history fetch catch 분기: 404 / `CONVERSATION_NOT_FOUND` 시
    `conversationNotFound = true` (기존 error 카드 가 아닌 분리 카드).
  - `handleSubmit`: 새 conversation 생성 후 `listConversations()` 재fetch.
  - `handleNewConversation`: localStorage 직접 조작 제거 (state 변경이
    useEffect 로 동기 처리).
  - `<PersonaSidebar conversations={…} activeConversationId={…} />` props 주입.
  - 404 안내 카드 `<section data-conversation-not-found="true">` 추가.
  - `handleFormChange` 가 `setConversationNotFound(false)` 도 clear.
- `package.json` — `test:web-conversation-route` script.

### 10.3 design 단계 micro 결정 (plan §5.4 lock)

| 결정 | 값 | 근거 |
|:--|:--|:--|
| URL fragment path prefix | `#/conversation/<id>` (plan §3 AC3 그대로) | bookmark / 사용자 가독성. `#/c/<id>` 같은 단축은 후속 cleanup. |
| URL ↔ state 동기화 방식 | `history.replaceState(null, "", expectedHash)` (push 아닌 replace) | 동일 페이지 안 navigation — back stack 폭발 회피. hashchange 가 sidebar 클릭으로만 발생. |
| 동기 useEffect 의 race 방지 | `if (window.location.hash !== expectedHash)` 가드 | 무한 루프 회피 (replaceState → hashchange 미발화이지만 안전성). |
| 404 vs 일반 error 분기 | status===404 OR errorCode==="CONVERSATION_NOT_FOUND" → 별 카드 | plan §4.1 의 stale id = 404 동등 lock. existence leak 안 함. |
| 404 안내 카드 위치 | `mcpDisconnected` 카드 와 일반 `error` 카드 사이 | 시각적 분리. 한 페이지 안에 3종 카드 모두 동시 가능 (mcp / not-found / error) — 우선순위 = mcp > not-found > error. |
| sidebar list 재fetch trigger | `authState` + `conversationId` 의존 useEffect + handleSubmit 직후 명시 호출 | 대화 생성 / 전환 / 삭제 모두 cover. handleSubmit 직후는 새 conversation 노출 즉시성 보장. |
| cuid 패턴 frontend 검증 | `^c[a-z0-9]{24,}$/i` (backend `CUID_PATTERN` 과 동일) | 클라이언트가 부정 입력 미리 차단 — backend 호출 절약 + URL fragment 의 stale string leak 회피. |

## 11. slice-3 AC ↔ 산출물 ↔ 증거

| AC | 산출물 | 증거 |
|:--|:--|:--|
| AC3 (URL routing + 404 안내) | `conversation-route.ts` + App.tsx 의 useEffect 3개 + 404 카드 | `pnpm test:web-conversation-route` 9/9 pass + tsc + vite 통과. parseConversationRoute 가 stale ID 안전 (cuid 패턴 미일치 = null) — plan §4.1 invariant 회귀 가드. |
| (URL routing 의 sidebar wiring) | App.tsx 의 `<PersonaSidebar conversations={…} activeConversationId={…} />` | slice-2 의 `data-conversation-id` row + slice-3 의 `activeConversationId` 결합 → 활성 표시 정상 동작. |

## 12. slice-3 검증 evidence

### 12.1 `pnpm test:web-conversation-route` (9/9 pass)

```
▶ parseConversationRoute (sprint-8 slice-3, AC3)
  ✔ 빈 hash → conversationId null
  ✔ `#/conversation/<cuid>` → conversationId 추출
  ✔ `#` prefix 없어도 동작 (정규화)
  ✔ cuid 패턴 미일치 → null (stale URL leak X)
  ✔ 다른 fragment → null
  ✔ query / 추가 segment 무시
▶ buildConversationRoute (sprint-8 slice-3, AC3)
  ✔ null → '#/'
  ✔ cuid → '#/conversation/<id>'
  ✔ round-trip 일관성
ℹ tests 9 / pass 9 / fail 0
```

### 12.2 회귀 — prior web specs / build

- `pnpm test:web-gate` 12/12 / `pnpm test:web-onboarding-copy` 6/6 /
  `pnpm test:web-recent-conversations` 7/7 — 모두 회귀 0.
- `pnpm --filter @study-note/web build` → tsc + vite 통과 (persona-turn bundle
  92.16 kB, slice-2 대비 +1.68 kB = URL routing + 404 카드 + list fetch 분량).

## 13. slice-3 한계 / 후속

- React 컴포넌트 자체 렌더 + hashchange event 실제 발화 시퀀스는 manual UAT /
  CDP design smoke 로 이월.
- listConversations 호출이 실패 시 silent fallback (빈 list) — 명시 error toast
  미노출. 사용자가 sidebar 의 placeholder 만 보고 backend 장애를 알기 어려운
  trade-off. 후속 sprint 에서 sidebar 의 retry / refresh UI 고려.
- backend 가 LIST endpoint 도 cookie-only enforcement 이므로 cookie 만료 시 401
  → silent catch → 빈 list. signed-out 으로 fall-through 는 자체 boot useEffect 에
  의해 처리 (다음 사용자 액션 시 또는 새로고침 시).

