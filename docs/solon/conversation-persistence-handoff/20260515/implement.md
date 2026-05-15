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