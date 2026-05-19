---
phase: implement
sprint_id: "2026-W20-sprint-8"
slice_id: "slice-4"
slice_title: "smoke-conversation-list (AC4)"
goal: "conversation persistence handoff β"
worker: "Opus 4.7"
---

# slice-4 implement — smoke-conversation-list (AC4)

## 14. slice-4 산출물

### 14.1 신규

- `scripts/smoke-conversation-list.mjs` — AC4 7 시나리오 (a~g) 단일 스크립트.
  sprint-7 의 `smoke-cookie-jar.mjs` 헬퍼 import. Prisma 직접 insert 로 LLM/corpus
  bypass.

### 14.2 수정

- `package.json` — `smoke:conversation-list` lane 추가
  (`pnpm --filter @study-note/api build && node scripts/smoke-conversation-list.mjs`).

### 14.3 design 단계 micro 결정

| 결정 | 값 | 근거 |
|:--|:--|:--|
| Turn 데이터 생성 방식 | Prisma 직접 insert (`insertSyntheticTurn`) | LLM/corpus 의존 0 — backend LIST contract 자체 검증에만 집중. `smoke-persona-turn` 가 LLM/corpus 통합 path cover (별 lane). |
| conv2 의 `c-language` subject | Prisma 직접 insert (POST X) | `archetypeFor` 가 `digital-engineering` 만 허용 — POST 거부됨. subject filter test 에 필요한 다른 subject row 는 schema 직접. |
| second user 학번 | `20269801` (별 namespace) | seed master `20260001` 와 충돌 회피 + 8자리 regex 통과. |
| bad subject 후보 (g) | `<script>`, `UPPERCASE`, `with space`, `with/slash`, `"a".repeat(80)` | XSS-like + 대문자 + 공백 + 슬래시 + 길이 폭격. 모두 Shield Pattern 거부 (400) 또는 200 empty 허용. |
| 400 / 200 empty 둘 다 허용 | `if (response.status !== 400 && response.status !== 200)` | 향후 validation 정책 변경 (예 silent ignore) 도 cross-owner row leak 만 차단되면 통과. plan §3 AC4(g) 그대로. |

## 15. slice-4 AC ↔ 산출물 ↔ 증거

| AC | 시나리오 | 출력 라벨 |
|:--|:--|:--|
| AC4 (a) | cookie 부재 → 401 | `(a) GET /v1/conversations without cookie → 401` |
| AC4 (b) | sign-in 후 빈 list | `(b) empty list after sign-in OK` |
| AC4 (c) | 1 conversation + 1 turn → derivedTitle / turnCount | `(c) 1 conversation + 1 turn → derivedTitle / turnCount OK` |
| AC4 (d) | subject query filter | `(d) subject query param filter OK` |
| AC4 (e) | cross-owner LIST | `(e) cross-owner leak guard OK` |
| AC4 (f) | PII guard (학번 + hex token) | `(f) derivedTitle PII redact OK` |
| AC4 (g) | bad subject 입력 (400 또는 empty) | `(g) subject query param validation guard OK` |

## 16. slice-4 검증 evidence

### 16.1 `pnpm smoke:conversation-list` (전 시나리오 통과)

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

backend log 의 `[VALIDATION_ERROR] subject: subject must match ^[a-z][a-z0-9-]{0,63}$`
가 (g) 5 bad subject 모두에서 발화 → Shield Pattern 정상 동작.

### 16.2 회귀 — 기존 모든 test

- `pnpm test:backend` 11/11 pass.
- `pnpm test:web-gate` 12/12 / `pnpm test:web-onboarding-copy` 6/6 /
  `pnpm test:web-recent-conversations` 7/7 / `pnpm test:web-conversation-route` 9/9
  — 모두 회귀 0.

## 17. slice-4 한계 / 후속

- LLM/corpus 통합 path (실제 `POST /v1/conversations/:id/turns`) 는 별 smoke
  (`smoke-persona-turn`) cover. 본 smoke 는 LIST contract 만.
- (g) 의 long subject (`"a".repeat(80)`) 가 MaxLength 64 + regex 둘 다 위반 →
  400 항상 발생. future tightening (예 regex 만 / length 만) 시 본 smoke
  retry 필요.
- sprint-7 retro §4 chore 의 `apps/web` vitest infra 도입 시 sidebar React DOM
