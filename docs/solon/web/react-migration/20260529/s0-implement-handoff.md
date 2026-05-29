# S0 implement handoff — React shell foundation

> fresh session 용 인계문서. sprint `2026-W22-sprint-3`. Gate 3 plan + self-review
> PASS + user 승인 완료. **다음 세션 first action = S0 구현.** Session Continuation
> Guard 로 구현을 fresh session 으로 분리(최고 위험 인프라 pivot).

## 0. 한 줄 요약

main 앱(`index.html`→`main.ts`)을 React-shell strangler 로 마이그레이션 시작. **S0 =
React 가 `#app` 소유 + 얇은 hash router + `<LegacyView>` + Zustand store 4종. 전 route
LegacyView 라 사용자 동작 무변경.** 이게 모든 후속 slice(S1 pdf-workspace 먼저)의 선행.

## 1. 읽을 것 (순서)

1. `docs/solon/web/react-migration/20260529/react-migration-roadmap.md` — 전략 전체
   (§1 ADR=A 채택 / §2 Zustand / §3 이벤트경계 / §4 slice 표 / §5 INV-1~8 ledger).
2. `.sfs-local/sprints/2026-W22-sprint-3/plan.md` — S0 plan (R1~R6, AC1~6, 위험).
3. `.sfs-local/sprints/2026-W22-sprint-3/brainstorm.md` — Q1/Q2 결정 근거.

## 2. 확정된 결정 (재논의 X)

- 접근 = **A. React-shell strangler** (user 승인).
- 순서 = S0(shell) → **S1 pdf-workspace 먼저(PDF-first)** → auth → home/sidebar → subject → cleanup.
- 상태관리 = **Zustand** (strangler 기간 legacy `getState/setState` + React `useStore` 가 단일 store 공유).
- **Q1**: 이벤트 위임 범위축소 = **S0 아님, S1 이연** (S0 는 React 콘텐츠 0 → 이중처리 불가 → `document` 위임 유지가 정확).
- **Q2**: 라우터 = **얇은 custom hash router**(`parseRoute` 재사용, 신규 dep 0, 12 route 1:1). store 이전 = **accessor shim**(legacy read-site 최소 변경).

## 3. S0 작업 (WU 순서)

- **WU-1 characterization**: 구현 전 12 route 동작/화면 기준선 기록(AC2 회귀 대조용). 기존 `node:test` spec green baseline 확인.
- **WU-2 stores**: `apps/web/src/stores/{authStore,notebookStore,pdfWorkspaceStore,uiStore}.ts` 신규(Zustand). main.ts mutable singleton 이전:
  - `notebook`(369), `quickNote`(490), `intakeFeedback`(486), `pendingPdfRetry`(489) → notebookStore.
  - `authSession`(386), `loginFeedback`(487) → authStore.
  - `pdfWorkspaceStore`(371) + `updatePdfWorkspace`(1140+) sink 의미 보존(INV-6) → pdfWorkspaceStore.
  - `inspectorOpen`(380), `activeXxxDrag`(407-479) → uiStore (drag 임시상태는 S1 에서 PDF 컴포넌트로 흡수 가능).
  - legacy 참조는 accessor shim(`getNotebook()` 등)으로 최소 변경. 도메인 로직은 `@study-note/domain` 유지(store 에 안 넣음).
- **WU-3 react-shell**: `apps/web/src/app/react-shell/{root,router,LegacyView}.tsx`.
  - `root.tsx`: **최상단 `import "../../polyfills"` (INV-1 1순위)** + `createRoot(#app)` + StrictMode.
  - `router.tsx`: hashchange 구독 → `parseRoute` → `<LegacyView route={...}/>`.
  - `LegacyView.tsx`: route 별 기존 렌더 함수 호출 → 컨테이너 ref `innerHTML`(신뢰출력만, INV-8) → post-mount `applyPdfCanvasMounts`(INV-2) + 기존 async hydration(annotation/user-note) 보존. React 는 컨테이너만 소유, 내부는 morphdom(현 동작). key 고정으로 재mount 방지.
  - `main.ts`: `renderApp`/`mountRender`/`hashchange`(578) 진입점을 shell 로 위임. 렌더 함수들을 LegacyView 가 호출하도록 registry 노출.
- **WU-4 통합 검증**: `pnpm add zustand` → web build green + 기존 spec PASS + 12 route 수동 smoke + **iPad 1회 PDF 로드(INV-1/2)** + localStorage round-trip(데이터 손실 0).

## 4. 첫 명령

```bash
# 1) 작업 디렉토리 = repo root
cd /Users/mj/IdeaProjects/study-note
# 2) sprint 상태 확인
sfs status
# 3) plan review 이미 self-PASS+승인 → implement 진입 (bridge 다운이면 --allow-unreviewed-plan)
sfs implement   # 막히면: sfs implement --allow-unreviewed-plan
# 4) zustand 의존 추가
cd apps/web && pnpm add zustand && cd ../..
```

## 5. 회귀 invariant (S0 적용분 — 반드시 보존)

| INV | S0 적용 | 검증 |
|---|---|---|
| INV-1 polyfill | root.tsx 최상단 import | iPad PDF 로드 |
| INV-2 canvas mount | LegacyView post-mount applyPdfCanvasMounts | 페이지전환 canvas 보존 |
| INV-5 hash route | router = parseRoute 1:1 | routes.spec green + 12 route smoke |
| INV-6 central reducer | pdfWorkspaceStore action = updatePdfWorkspace 의미 | PDF 변경→persist→render |
| INV-7 RUM | LegacyView post-mount RUM emit 보존 | Datadog event |
| INV-8 XSS | LegacyView innerHTML = 신뢰출력만 | user-content 주입면 0 |

## 6. 위험 + 대응

- singleton 참조 누락 → grep 전수 + shim 일괄.
- createRoot timing polyfill 늦음 → root.tsx 최상단 import + iPad 검증.
- LegacyView morphdom↔React 충돌 → React 는 단일 컨테이너만, key 고정.
- localStorage 키/스키마 변경 → `buildPdfWorkspaceKey`/notebook 키 불변 + round-trip.

## 7. 미해결 / 이월

- **cross-review(@codex) 차단**: Codex usage-limit **2026-05-31 06:13 까지**. 설계 sprint(2026-W22-sprint-2) Gate 6 cross + S0 Gate 6 cross 모두 codex 복구 후 보강. 그때까지 Claude main 수동 self-review.
- **설계 sprint(2026-W22-sprint-2) close 이월**: review-runner 다운으로 `sfs retro --close` exit 8. 실질 완료(roadmap 승인). codex 복구 후 review run → close.
- review bridge 둘 다 다운(codex usage-limit, claude nested-spawn fail) — Gate review 는 Claude main 수동 + capture evidence 로 진행 중.

## 8. 커밋 미상태

본 세션 작업 = **문서만**(roadmap + handoff + plan/brainstorm). **코드 변경 0.** 미커밋.
git status 에 보이는 CLAUDE.md/AGENTS.md/GEMINI.md/SFS.md/.claude 변경은 **이전 `sfs
upgrade` 의 미커밋 상태**(본 작업 무관) — 커밋 시 분리 주의.
