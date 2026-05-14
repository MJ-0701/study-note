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
