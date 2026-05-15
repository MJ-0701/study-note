---
phase: implement
sprint_id: "2026-W20-sprint-8"
slice_id: "slice-2"
slice_title: "frontend sidebar 최근 대화 group + listConversations port"
goal: "conversation persistence handoff β"
worker: "Opus 4.7"
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

