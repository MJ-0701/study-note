---
phase: implement
sprint_id: "2026-W20-sprint-7"
slice_id: "slice-1"
slice_title: "gate UX 3버튼 + dismiss 정책 + MCPDisconnectedCard"
goal: "MCP onboarding handoff α — install/auth/smoke 연결"
created_at: "2026-05-14T20:30:00+09:00"
worker: "Opus 4.7 (plan §5.1 의 gpt-5.3-codex 대체 — bounded slice 가 Opus 직접 처리에 적합)"
---

# slice-1 implement — gate UX 3버튼 + dismiss 정책 + MCPDisconnectedCard

## 1. 작업 산출물

### 1.1 신규

- `apps/web/src/persona-turn/components/gate-state.ts` — dismiss state machine 의 pure
  logic. React 의존 없이 `node:test` 로 검증 가능하도록 분리.
- `apps/web/src/persona-turn/components/gate-state.spec.ts` — 12 case node:test spec
  (isGateDismissed 5 + 3 버튼 액션 + external-close + 2 invariant).
- `apps/web/src/persona-turn/components/MCPDisconnectedCard.tsx` — 503 AUTH_DEV_DISABLED
  매핑 카드 + `isMcpDisconnectedError` 분리 helper.

### 1.2 수정

- `apps/web/src/persona-turn/components/MCPOnboardingGate.tsx` — 단일 localStorage flag
  →  3 버튼 (data-mcp-gate-action="guide"/"completed"/"deferred") + storage state
  machine 위임 (gate-state.ts) + Escape/X/배경 클릭 = `external-close` 액션 매핑.
- `apps/web/src/persona-turn/App.tsx` —  `MCPDisconnectedCard` import + `mcpDisconnected`
  state + `handleSubmit` catch 분기 (503 AUTH_DEV_DISABLED 만 카드, 그 외는 기존 error
  카드) + mode/form change 시 stale state clear.
- `apps/web/tsconfig.json` — `"exclude": ["src/**/*.spec.ts"]` 추가 (web vite/tsc 빌드 가
  node:test spec 을 type-check 하려다 `node:assert` 미설치로 실패하는 것 회피).
- `package.json` — `test:web-gate` script 추가 (`node --experimental-strip-types --test
  apps/web/src/persona-turn/components/gate-state.spec.ts`).

### 1.3 design 단계 micro 결정 (plan §5.4 → 결정 lock)

| 결정 | 값 | 근거 |
|:--|:--|:--|
| localStorage key 명 | `study-note.mcp.onboarding-completed.v1` | 의미 명확화 — 기존 `study-note.mcp.onboarding-shown` 은 "보여졌음" 만 의미했고 plan §3 AC2 의 "완료" 의미 명확화 필요. v1 suffix 로 향후 schema 변경 여유. |
| sessionStorage key 명 | `study-note.mcp.onboarding-deferred.v1` | localStorage 와 평행 명명. deferred = "나중에" 명시. |
| "지금 안내 보기" 이동 target | `/onboarding-mcp.html#trouble` | plan §3 AC2 lock 그대로. slice-2 가 onboarding-mcp.tsx 에 `id="trouble"` anchor 보강. |
| "지금 안내 보기" 액션의 storage transition | 미변경 (action="guide") | plan §3 AC2 의 invariant: 영구 dismiss 는 "이미 설정 완료" 명시 클릭만. 사용자가 안내 페이지 갔다 돌아오면 gate 다시 노출 가능. |
| spec runner | `node --experimental-strip-types --test` (vitest 가 아닌 node:test) | plan AC2 는 "vitest unit (`MCPOnboardingGate.spec.tsx`)" 로 표기했지만 apps/web 에 vitest infra 미존재. 전 프로젝트 test pattern (node:test, mcp/__tests__/*.spec.ts 와 동일) 으로 변경. spec.tsx → spec.ts (React 렌더 미검증 — pure state machine 만 검증; React 렌더 검증은 slice-3 의 CDP design smoke 로 이월). |

## 2. AC ↔ 산출물 ↔ 증거 매핑

| AC | 산출물 | 증거 |
|:--|:--|:--|
| AC1 (3 버튼 표시) | `MCPOnboardingGate.tsx` 의 3 `<button data-mcp-gate-action="…">` | DOM markup: `data-mcp-gate-action="guide"` (지금 안내 보기), `="completed"` (이미 설정 완료), `="deferred"` (나중에). 추가로 X 버튼 = `="external-close"`. design smoke 가 slice-3 이후 캡처 예정. |
| AC2 (dismiss state machine) | `gate-state.ts` + `gate-state.spec.ts` | `pnpm test:web-gate` → 12/12 pass (§3.1 로그 첨부). |
| AC2-amend (MCP error mapping, auth boundary 분리) | `MCPDisconnectedCard.tsx` + `App.tsx` 의 `isMcpDisconnectedError` 분기 | 코드 inspection: `App.tsx` `handleSubmit` catch 의 `if (isMcpDisconnectedError(...))` 가 503 AUTH_DEV_DISABLED 만 cover. 401 SESSION_REQUIRED 는 `else { setError(...) }` 로 빠짐 (기존 일반 error 카드). |
| AC2-amend2 (S1/S2/S3 카피) | (slice-2 scope) | 본 slice 미포함 — slice-2 가 onboarding-mcp.tsx 에 카피 추가. |
| AC3, AC4, AC5 | (slice-3, slice-4 scope) | 본 slice 미포함. |

## 3. 검증 evidence

### 3.1 `pnpm test:web-gate` 결과 (12/12 pass)

```
> @ test:web-gate /Users/mj/IdeaProjects/study-note
> node --experimental-strip-types --no-warnings --test apps/web/src/persona-turn/components/gate-state.spec.ts

  ▶ gate-state — MCPOnboardingGate dismiss state machine (plan §3 AC2)
    ▶ isGateDismissed
      ✔ empty stores → gate 표시 (dismissed=false)
      ✔ localStorage completed=true → 영구 dismiss
      ✔ sessionStorage deferred=true → 임시 dismiss
      ✔ localStorage completed 값이 'true' 외 (예 'false') → dismiss 아님
      ✔ sessionStorage deferred 값이 'true' 외 → dismiss 아님
    ✔ applyDismiss("completed") — "이미 설정 완료" 영구 dismiss
      ✔ localStorage 에 completed=true 기록 + willReappear=false
    ✔ applyDismiss("deferred") — "나중에" 임시 dismiss
      ✔ sessionStorage 에 deferred=true 기록 + willReappear=true
      ✔ 새 session simulation (sessionStorage clear) 후 다시 표시
    ✔ applyDismiss("guide") — "지금 안내 보기" 안내 페이지 이동
      ✔ storage 미변경 + willReappear=true (안내 페이지 다녀온 뒤 다시 노출 가능)
    ✔ applyDismiss("external-close") — Escape / X / 배경 클릭
      ✔ sessionStorage deferred=true 기록 (deferred 와 동일 — 임시 dismiss)
    ✔ invariant — 영구 dismiss 는 'completed' 클릭만 가능
      ✔ deferred 후 guide 후 external-close 모두 거쳐도 localStorage 영구화 안 됨
      ✔ 'completed' 클릭 시점에서만 localStorage 기록

  ℹ tests 12
  ℹ pass 12
  ℹ fail 0
```

### 3.2 `pnpm --filter @study-note/web build` 결과 (tsc + vite 통과)

```
vite v7.3.3 building client environment for production...
✓ 59 modules transformed.
dist/index.html                            0.63 kB
dist/persona-turn.html                     0.79 kB
dist/onboarding-mcp.html                   0.83 kB
…
✓ built in 393ms
```

→ 타입 에러 0, 빌드 산출물 정상.

### 3.3 design smoke (CDP 기반 manual UAT) — 이월

sprint-6 retro §3 의 "Chrome CDP 기반 admin UAT smoke" 패턴 재사용 예정.
slice-3 시 `smoke-mcp-onboarding` 와 별도 lane 으로 `smoke-mcp-gate-design` 도입 가능
하지만 현 sprint scope 는 slice-3 = MCP server smoke 단독. 따라서 본 AC1 의 3 버튼 DOM
+ AC2 의 클릭 후 storage transition 의 시각 evidence 는 사용자 manual UAT 로 이월
(sprint-7 retro 시 회수).

## 4. 보안 confirmation (plan §0 self-CPO 와 일관)

- **PII redaction**: `MCPDisconnectedCard` 본문이 학번/세션 토큰 미포함 (정적 안내문만).
  caller 가 `children` prop 으로 sensitive 값 주입 가능하지만 App.tsx 의 사용처는
  `<MCPDisconnectedCard />` (children 미주입).
- **auth boundary 분리**: `isMcpDisconnectedError` 가 status===503 AND errorCode===
  "AUTH_DEV_DISABLED" 양조건 모두 요구. 401 SESSION_REQUIRED 는 별 분기로 빠짐.
- **storage safe fallback**: `safeStorage("local")` / `("session")` 의 Safari private
  mode probe 가 in-memory fallback 으로 graceful degrade. throw 가 사용자 페이지를
  깨지 않는다.

## 5. 한계 / 후속

- spec.tsx → spec.ts 변경 (vitest infra 부재) 의 trade-off: React 컴포넌트 렌더 자체는
  본 slice 에서 자동 검증 안 됨. sprint-7 retro § "시도할 것" 또는 후속 sprint 에서
  `apps/web` 에 vitest + react-testing-library + jsdom 도입 검토.
- AC2 invariant 의 "안내 페이지 다녀온 뒤 gate 재표시" 의 end-to-end 흐름은 CDP smoke
  미도입 상태 → 사용자 manual UAT 로 이월.
- slice-2 가 onboarding-mcp.tsx 의 `#trouble` anchor 보강 필요 (현재 `id="section-trouble"`
  존재; slice-2 시 `id="trouble"` alias 또는 deep-link target 명세).

---

# slice-2 implement — onboarding S1/S2/S3 카피 + #trouble anchor

## 6. slice-2 산출물

### 6.1 신규

- `apps/web/src/onboarding/secret-handling-copy.ts` — S1_LOCAL_ONLY /
  S2_DO_NOT_COMMIT / S3_LEAST_PRIVILEGE const + `SECRET_HANDLING_COPY` 묶음. React
  의존 없는 string 모듈로 spec 가 import 가능.
- `apps/web/src/onboarding/secret-handling-copy.spec.ts` — 6 case node:test.
  (1) 3 const substring lock + 묶음 동일성, (2) onboarding-mcp.tsx 가 import + 식별자
  사용, (3) `id="trouble"` (또는 동등 anchor) 존재 — source 파일 직접 read 로 검증.

### 6.2 수정

- `apps/web/src/onboarding/onboarding-mcp.tsx`:
  - `S1_LOCAL_ONLY / S2_DO_NOT_COMMIT / S3_LEAST_PRIVILEGE` import.
  - Claude Desktop 섹션의 CodeBlock 직후에 `aside.secret-handling-notice` 노출 — 3
    `<li data-secret-handling-id="S1|S2|S3">` 로 카피 mount.
  - 트러블슈팅 `<section>` 에 `id="trouble"` 추가 (기존 `aria-labelledby="section-trouble"`
    backward-compat 유지).
  - `useEffect` 로 `location.hash` 기반 `scrollIntoView` 처리 (StrictMode race 회피 — plan
    §6 R-4 mitigation).
- `package.json` — `test:web-onboarding-copy` script 추가.

### 6.3 design 단계 micro 결정 (plan §5.4)

| 결정 | 값 | 근거 |
|:--|:--|:--|
| S1/S2/S3 카피 위치 | Claude Desktop 섹션 CodeBlock 직후 (aside `secret-handling-notice`) | 사용자가 JSON snippet 채우기 직전/직후에 보는 시점 — plan §3 AC2-amend2 "JSON snippet 인접 영역" lock. Cursor 섹션은 "위 스니펫 동일" 안내라 1회 노출로 충분. |
| `#trouble` anchor 방식 | `<section id="trouble" aria-labelledby="section-trouble">` (h2 의 기존 id 유지) | section 자체에 id 부여 → URL fragment 가 section 시작점으로 스크롤. h2 id 변경 시 a11y label reference 깨질 위험 회피. |
| hash anchor scroll fallback | `useEffect` + `getElementById(hash).scrollIntoView` | 브라우저 default 가 React mount 전에 발화하면 정확한 좌표로 못 도달; SSR 미사용이지만 React StrictMode 의 mount/unmount cycle 이 layout 을 재산정 — 명시 scroll 안전. |
| copy spec runner | `node --experimental-strip-types --test` (gate-state.spec.ts 와 동일 pattern) | gate-state 와 일관된 test pattern. fs.readFile 로 source tsx 직접 inspect. |

## 7. slice-2 AC ↔ 산출물 ↔ 증거

| AC | 산출물 | 증거 |
|:--|:--|:--|
| AC2-amend2 (S1/S2/S3 카피 measurable) | `secret-handling-copy.ts` + onboarding-mcp.tsx 의 `aside.secret-handling-notice` | `pnpm test:web-onboarding-copy` → 6/6 pass (§8.1 로그). substring lock + source import 검증. |
| R2 (#trouble anchor) | onboarding-mcp.tsx 의 `<section id="trouble">` | spec 의 "trouble anchor" describe block (1 case) + source grep `id="trouble"`. |

## 8. slice-2 검증 evidence

### 8.1 `pnpm test:web-onboarding-copy` 결과 (6/6 pass)

```
▶ secret-handling-copy (plan §3 AC2-amend2 / §4.1 S1/S2/S3)
  ▶ const presence + substring lock
    ✔ S1 = local-only 카피 (Claude Desktop / Cursor stdio 명시)
    ✔ S2 = do-not-commit 카피 (DATABASE_URL 명시 + commit/push/공유 금지)
    ✔ S3 = least-privilege 카피 (dev 전용 role + master/superuser 회피)
    ✔ SECRET_HANDLING_COPY 묶음 = S1/S2/S3 3-key map
  ▶ onboarding-mcp.tsx renders S1/S2/S3
    ✔ source 파일이 SECRET_HANDLING_COPY import + 3 substring 모두 노출
  ▶ trouble anchor (plan implement.md §5 후속)
    ✔ onboarding-mcp.tsx 의 트러블슈팅 섹션이 id="trouble" 또는 동등 anchor 노출
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### 8.2 회귀 (gate spec + web build)

- `pnpm test:web-gate` → 12/12 pass 유지.
- `pnpm --filter @study-note/web build` → tsc + vite 통과 (onboarding-mcp 번들 8.78 kB,
  slice-1 대비 +1.32 kB = S1/S2/S3 카피 + scrollIntoView useEffect 분량 일치).

## 9. slice-2 한계 / 후속

- `<aside>` 의 시각 evidence (실제 사용자가 본 화면) 는 CDP smoke 미도입으로 manual UAT.
- Cursor 섹션 자체에는 S1/S2/S3 카피 미반복 — 사용자가 Claude Desktop 섹션 안내문을
  follow 하리라는 가정. 안내문이 "위 스니펫 동일" 로 명시되어 있어 사용자 시선이 위로 향함.
  Cursor 섹션 inline 반복 vs 1회 노출 의 UX trade-off 는 retro 시 사용자 manual UAT 결과로
  재평가.
