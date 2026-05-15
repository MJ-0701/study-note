---
phase: implement
sprint_id: "2026-W20-sprint-8"
slice_id: "slice-1"
slice_title: "backend LIST endpoint + derivedTitle PII redact"
goal: "conversation persistence handoff β"
created_at: "2026-05-15T15:10:00+09:00"
worker: "Opus 4.7 (plan §5.1 의 gpt-5.3-codex 대체 — bounded backend slice)"
---

# slice-1 implement — backend LIST endpoint + derivedTitle PII redact

## 1. 작업 산출물

### 1.1 신규

- (없음 — 기존 파일 확장만)

### 1.2 수정

- `packages/persona-engine/src/dto/conversation.dto.ts`:
  - `ListConversationsQueryDto` 신규 — `subject?` (optional, Shield Pattern: regex
    `^[a-z][a-z0-9-]{0,63}$` + MaxLength 64). global ValidationPipe 위반 시
    400 `VALIDATION_ERROR`.
- `packages/persona-engine/src/services/conversation.service.ts`:
  - `ConversationListItem` interface export (id / subject / personaName /
    derivedTitle / createdAt / updatedAt / turnCount).
  - `deriveTitleFromQuery(query)` export — 40자 truncate (39 + `…`) +
    `\d{8}` (학번) + `[a-f0-9]{32,}` (토큰 hex) → `[redacted]` + empty fallback
    `"(빈 대화)"`.
  - `list(ownerId, query)` 메서드 — `where: { ownerId, subject? }` +
    `orderBy: { updatedAt: "desc" }` + `include: { _count: { turns: true },
    turns: { take: 1, orderBy: { createdAt: "asc" }, select: { query: true } } }`.
    N+1 회피 (plan §6 R-4).
- `apps/api/src/persona/conversation.controller.ts`:
  - `@Get()` 메서드 추가 — `@Query() query: ListConversationsQueryDto` + `@Req`
    로 owner id 추출. `SessionAuthGuard` 는 클래스 레벨에 이미 적용 → cookie 부재
    = 401.
- `packages/persona-engine/src/services/__tests__/conversation.service.spec.ts`:
  - `deriveTitleFromQuery` 7 case (empty/nullish/짧음/긴 truncate/hex aggressive/
    학번/토큰/조합).
  - `list()` 4 case (cross-owner filter / subject filter / empty turn /
    학번 redact).

### 1.3 design 단계 micro 결정 (plan §5.4 → lock)

| 결정 | 값 | 근거 |
|:--|:--|:--|
| redact placeholder 문자열 | `"[redacted]"` | 명시 의미 + sprint-7 의 PII guard 패턴 (smoke 도 `[redacted]` 문자열로 인지). 빈 string 은 의미 모호. |
| 빈 conversation derivedTitle | `"(빈 대화)"` (한글, 괄호) | 사용자 친화. plan §3 AC1 lock. |
| LIST orderBy | `updatedAt desc` | "최근 대화" group 의미와 일치. createdAt 아닌 updatedAt — turn append 가 updatedAt trigger (Prisma @updatedAt). |
| turnCount source | Prisma `_count: { turns: true }` | N+1 회피 (R-4 mitigation). |
| 첫 turn query 수집 | `include: { turns: { take: 1, orderBy: createdAt asc, select: query } }` | 단일 쿼리 안에서 처리. 별 query round-trip 없음. |
| controller `@Get()` 시그니처 | `@Query() query: ListConversationsQueryDto` | global ValidationPipe `transform: true` 가 query 객체 자동 변환. |
| spec runner | node:test (persona-engine 의 기존 pattern) | dist 컴파일 후 `node --test packages/persona-engine/dist/services/__tests__/conversation.service.spec.js`. |

## 2. AC ↔ 산출물 ↔ 증거 매핑

| AC | 산출물 | 증거 |
|:--|:--|:--|
| AC1 (LIST endpoint) | controller `@Get()` + service `list()` | spec 15/15 pass + dist 빌드 정상. SessionAuthGuard 는 클래스 레벨에서 적용 → cookie 부재 = 401 (existing 패턴 재사용). |
| AC1-amend (PII redact) | `deriveTitleFromQuery` + spec 7 case | 학번 / hex token / 조합 모두 `[redacted]` 매핑. spec "학번 8자리 포함 query" 회귀 가드. |
| AC2/3/4 | (slice-2/3/4 scope) | 본 slice 미포함. |

## 3. 검증 evidence

### 3.1 `node --test packages/persona-engine/dist/services/__tests__/conversation.service.spec.js` (15/15 pass)

```
▶ deriveTitleFromQuery (sprint-8 slice-1, AC1-amend PII redact)
  ✔ empty / nullish → (빈 대화) placeholder
  ✔ ≤40자 trimmed query 그대로
  ✔ 41자 이상 → 39자 + …
  ✔ hex token regex 가 aggressive — 32자+ [a-f0-9] 연속이면 redact (의도된 동작)
  ✔ 학번 8자리 redact
  ✔ 토큰 hex (32자+) redact
  ✔ 학번 + 토큰 둘 다 redact
▶ list() (sprint-8 slice-1, AC1)
  ✔ ownerId 일치 row 만 반환, cross-owner row 미노출
  ✔ subject query param filter 동작
  ✔ turn 0 conversation → derivedTitle = (빈 대화)
  ✔ 학번 8자리 포함 query → derivedTitle redacted (AC1-amend smoke 회귀 가드)
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

### 3.2 `pnpm --filter @study-note/persona-engine build` + `pnpm --filter @study-note/api build`

둘 다 정상 종료 (tsc 0 에러).

### 3.3 `pnpm test:backend` — 회귀 없음

기존 11/11 그대로 통과.

## 4. 보안 confirmation

- **cross-owner filter**: `where.ownerId = req.user.id` 단독. spec "ownerId 일치 row
  만" 회귀 가드.
- **PII redaction**: `\d{8}` + `[a-f0-9]{32,}` 매치 시 `[redacted]`. hex regex 가
  aggressive — 32자 이상 연속 `[a-f0-9]` 이면 토큰으로 간주 (false positive 가능성보다
  leak 회피 우선). spec "hex token regex 가 aggressive — 의도된 동작" 으로 명시.
- **subject Shield Pattern**: `^[a-z][a-z0-9-]{0,63}$` regex + MaxLength 64. global
  ValidationPipe 가 위반 시 400 `VALIDATION_ERROR` emit. SQL injection / 길이 폭격
  회피.
- **404 vs 403**: LIST 는 빈 array (cross-owner row 누락). existence leak X.

## 5. 한계 / 후속

- LIST endpoint 의 실제 HTTP 시나리오 (cookie 부재 401 / sign-in 200 / subject query
  filter / cross-owner) 의 end-to-end 검증은 slice-4 의 `smoke-conversation-list`
  에서 cover. 본 slice 는 service unit + DTO 검증까지만.
- PII redact pattern 은 학번 + hex token 만. 사용자 본인 이름 / 이메일 prefix 같은
  identifying string 은 본 sprint 미해결 (plan §6 R-1). cross-owner leak 자체는 ownerId
  filter 가 보장하므로 본 사용자 본인이 본인 데이터 보는 것은 정상.
- `subject` 외 query param (예 personaName / 활성 여부) 추가는 후속 sprint scope.

---

# slice-2 implement — frontend sidebar "최근 대화" group + listConversations port

## 6. slice-2 산출물

### 6.1 신규

- `apps/web/src/persona-turn/components/recent-conversations.ts` —
  `RecentConversationItem` view model + `buildRecentConversationItems` pure 함수
  (React 의존 0).
- `apps/web/src/persona-turn/components/recent-conversations.spec.ts` — 7 case
  node:test (empty / active null / active match / label preservation / href
  format / order preservation / false-y safety).

### 6.2 수정

- `apps/web/src/persona-turn/api/personaTurns.ts`:
  - `ConversationListItem` interface export.
  - `listConversations(subject?)` 함수 — `GET /v1/conversations[?subject=]`,
    `credentials: "include"` (cookie session).
- `apps/web/src/persona-turn/components/PersonaSidebar.tsx`:
  - props 확장 — `conversations?: ConversationListItem[]`, `activeConversationId?: string | null`. 둘 다 optional (default [] / undefined) 라 App.tsx (slice-3) 가 wire 하기 전에도 컴파일 안전.
  - 새 group `<div className="sidebar-group" data-recent-conversations="true">` ("💬 최근 대화") — `buildRecentConversationItems` 가 만든 view-model 을 1:1 anchor 로 render. 각 anchor = `data-conversation-id="<id>"` + `className="active"` (활성 일치 시).
  - 빈 list = `<p>아직 대화 없음</p>` placeholder.
  - dots / 메뉴 / 추가 액션 없음 (brainstorm §9 lock — 완전히 빈).
- `package.json` — `test:web-recent-conversations` script 추가.

### 6.3 design 단계 micro 결정 (plan §5.4 / §5.1 file scope 준수)

| 결정 | 값 | 근거 |
|:--|:--|:--|
| `conversations` / `activeConversationId` props 의 필수성 | optional (default `[]` / `undefined`) | slice-2 단독 commit 시 App.tsx 가 새 props 미주입 → 컴파일 fail 회피. slice-3 가 App.tsx wire. |
| `listConversations` 의 cookie 처리 | `credentials: "include"` 명시 | 다른 endpoint (`/v1/auth/sign-in` 등) 가 이미 사용하는 패턴. cross-origin (5173↔3001) 에서 cookie 전송 필수. |
| sidebar row 의 overflow 처리 | `whiteSpace: nowrap` + `overflow: hidden` + `textOverflow: ellipsis` | 40자 derivedTitle 도 사이드바 폭 초과 시 안전 — 시각 truncate. backend 의 40자 lock 과 layered. |
| sidebar row hover 정보 | `title` attr = `${subject} · ${label}` | 마우스 hover 로 subject 확인 가능. 별 dropdown 없음. |
| 활성 표시 | `className="active"` + 인라인 style 분기 | 기존 sidebar 의 `subActive` 패턴과 일관. CSS 분리는 후속. |
| 새 group 식별자 | `data-recent-conversations="true"` (group root) + `data-conversation-id="<id>"` (row) | 후속 CDP design smoke (sprint-7 retro §4 chore) 의 DOM query 안정성. |

## 7. slice-2 AC ↔ 산출물 ↔ 증거

| AC | 산출물 | 증거 |
|:--|:--|:--|
| AC2 (sidebar group + 빈 placeholder + active className) | `PersonaSidebar.tsx` + `recent-conversations.ts` | spec 7/7 pass (§8.1). DOM markup: `data-recent-conversations="true"` + `<p>아직 대화 없음</p>` 빈 placeholder + active item `className="active"`. |
| (listConversations port 자체) | `personaTurns.ts` 의 `listConversations` | tsc + vite build 통과 — type 안전. 실제 HTTP 시나리오 검증은 slice-4 smoke 의 (a)~(g) 와 manual UAT. |

## 8. slice-2 검증 evidence

### 8.1 `pnpm test:web-recent-conversations` (7/7 pass)

```
▶ buildRecentConversationItems (sprint-8 slice-2, AC2)
  ✔ empty input → empty array
  ✔ activeConversationId 가 null → 모두 active=false
  ✔ activeConversationId 일치 항목만 active=true
  ✔ label = derivedTitle 그대로 (frontend transform 없음)
  ✔ href = #/conversation/<id>
  ✔ backend 순서 보존 (sort 없음, updatedAt desc 가정)
  ✔ activeConversationId 가 undefined / 빈 string → 모두 active=false (false-y 안전)
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

### 8.2 회귀 — prior web specs / build

- `pnpm test:web-gate` → 12/12 pass (slice-1 sprint-7 dismiss state).
- `pnpm test:web-onboarding-copy` → 6/6 pass (slice-2 sprint-7 secret-handling).
- `pnpm --filter @study-note/web build` → tsc + vite 통과 (persona-turn bundle
  90.48 kB, slice-1 슴플 대비 +0.82 kB = sidebar group 추가분).

## 9. slice-2 한계 / 후속

- React DOM 렌더 자체는 자동 검증 안 됨 — manual UAT 또는 CDP design smoke
  (sprint-7 retro §4 chore) 로 회수.
- App.tsx wiring (props 주입) 은 slice-3 scope. 본 commit 단독 빌드는 sidebar 에
  "아직 대화 없음" placeholder 만 노출 (props default `[]`).
- `listConversations` 의 실제 HTTP 시나리오 cover = slice-4 smoke.

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