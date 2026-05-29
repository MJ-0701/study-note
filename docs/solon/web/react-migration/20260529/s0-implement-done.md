# S0 implement — DONE 요약 (React shell foundation)

> sprint `2026-W22-sprint-3`. branch `feature/react-migration-s0`. **미커밋**
> (commit/push 권한 = user 명시 대기). Gate 6 self = 본 문서, cross(@codex) =
> Codex usage-limit 복구(2026-05-31) 후.

## 한 줄
main 앱이 React-shell strangler 로 전환됨. `createRoot(#app)` + 얇은 hash router
+ `<LegacyView>` + Zustand store 4종. **전 route LegacyView → 동작/시각 무변경**
(runtime smoke 로 확인). 후속 slice(S1 PDF-first)의 선행 완료.

## 산출물
- 신규 `apps/web/src/stores/{notebookStore,authStore,pdfWorkspaceStore,uiStore}.ts`
  — Zustand vanilla store + get*/set* accessor shim. 단일 진실원.
- 신규 `apps/web/src/app/react-shell/{root,router,LegacyView}.tsx` + `registry.ts`.
- 수정 `apps/web/src/main.ts` (+214/-195): 9 singleton 삭제 → store 이전, 149
  read/write site 변환, 진입점(boot)을 React mount 로 위임.
- 신규 `apps/web/scripts/s0-store-shim.py` — 1회성 read/write 변환기(검토 evidence).
- `package.json`: `zustand ^5` 추가.

## 결정/구현 핵심
- **render target redirection**: React 가 #app 소유, LegacyView 는 `display:contents`
  컨테이너 1개만 렌더(layout-transparent → `.app-shell`/`.main-area`/`#app{min-width:0}`
  CSS box model 무변경). 컨테이너 children = morphdom(legacy renderApp) 소유. React 는
  JSX children 0 + 고정 key → morphdom DOM wipe 불가(INV-2 보호). `renderInto` 가 매
  호출 `sink.appRoot` 를 fresh 하게 읽으므로 getter 로 target 교체.
- **TDZ 회피**: 초기 renderApp + boot revalidate 를 LegacyView `useEffect`(passive,
  commit 후)에서 호출 → main.ts 모듈 eval 완료(L3793+ widget ctx init) 후 실행. 기존
  queueMicrotask 와 동일 timing 보장.
- **StrictMode 미사용 (S0 waiver)**: LegacyView = imperative legacy-DOM bridge →
  dev 이중 mount 가 boot revalidate(/v1/auth/me) 두 번 + render target 재bind. S1+
  순수 React route 전환 시 재검토. (root.tsx 주석 명시.)
- **이벤트 위임 S0 미변경**: document-level 8 + touch 4 핸들러 유지. React 콘텐츠 0
  이라 이중처리 불가 → 위임 축소는 S1 이연(roadmap §3, Q1). hashchange→routing 만
  router 로 이전(parseRoute 1:1).
- **activeXxxDrag(8) 이연**: roadmap §2 명시(drag 임시상태 = S1 PDF 컴포넌트 흡수).
  AC3 "singleton 0" 은 공유/영속 9 singleton 기준. 8 transient drag 는 S0 범위 밖
  (React 미소비). uiStore = inspectorOpen 만.

## INV ledger (S0 적용분)
| INV | 상태 | 근거 |
|---|---|---|
| INV-1 polyfill 1순위 | ✅ | root.tsx 최상단 `import "../../polyfills.ts"` + main.ts top import 유지. runtime smoke 무에러. |
| INV-2 canvas mount | ✅(자동) | renderApp→mountRender→postMountEffects(applyPdfCanvasMounts) 파이프라인 무변경, target=컨테이너. LegacyView 재mount 안 함(smoke: 안정 child count). **단, 인증+PDF cross-page = operator QA 필요.** |
| INV-5 hash route 1:1 | ✅ | router=parseRoute(app/routes.ts) 그대로. routes.spec green. |
| INV-6 updatePdfWorkspace sink | ✅ | WorkspaceStoreContext.getStore/setStore → pdfWorkspaceStore get/set 위임. reducer 로직 무변경. |
| INV-7 RUM | ✅ | canvasMountCallbacks postMount emit 무변경. |
| INV-8 XSS | ✅ | LegacyView=user content 0 (display:contents div). 렌더 trust 경계 무변경. 신규 dangerouslySetInnerHTML 0. |

## 검증
- tsc `--noEmit` clean. `npm run build`(tsc+vite) green (React 번들 index/main chunk).
- node:test 877 — pass 874 / fail 3 = **baseline 동일**(chart-tool / classdate source-guard
  / pdf-annotation = api/materials strip-types 인스턴스화 quirk, 본 작업 무관). **신규 실패 0.**
  auth-boot source-guard = revalidateOnBoot 단일 idiom 보존으로 green.
- **runtime smoke (vite dev + headless)**: React mount ✅, `#app>#legacy-app-root(display:contents)>legacy`
  ✅, 익명 boot=login page 렌더 ✅, hashchange→#/intake = router 재렌더 + LegacyView 무remount
  ✅, **console error 0**.

## 남은 검증 = operator/cross
- iPad 1회 실기기 PDF 로드 (INV-1 real-device).
- 인증 로그인 → app-shell + PDF workspace canvas cross-page 보존 (INV-2 full).
- localStorage round-trip (실 notebook/pdfWorkspace 데이터 손실 0).
- cross-device sync (INV-4) — S1c 본격 검증이나 S0 회귀 없는지 1회 확인 권장.
- Gate 6 cross(@codex) — usage-limit 복구(2026-05-31 06:13) 후.

## Gate 6 cross — Gemini 임시 대체 (Codex 5/31 재리뷰)

Codex usage-limit 로 cross 를 **Gemini(gemini-cli 0.41.2)** 로 임시 수행 (PR #118
코멘트에 전문). verdict = FAIL(P1×1/P2×2/P3×2) → disposition 후 **임시 PASS**:
- **P1** (LegacyView re-render 시 morphdom canvas wipe, INV-2): premise 부정확
  (smoke 가 보존 실증) but 수정 채택 — `dangerouslySetInnerHTML={{__html:""}}`
  로 INV-2 contract-level 보장 (commit 665d5ec, 2회 hashchange 재검증 PASS).
- **P2** transformer `;`-의존: script-robustness 지적, committed 출력 무영향
  (tsc/build/spec/`pending:[]` 실증). **P2** render-target race: 이론적·
  self-correcting (pre-mount #app empty + createRoot clear). 
- **P3** morphdom sink-only ✅ 검증 / StrictMode waiver ✅ 기재.
- ⚠ **임시 PASS** — Codex 복구(2026-05-31 06:13) 후 `@codex review` 정식 cross 가
  최종 merge 게이트. operator QA(체크리스트 §A~F)도 별도 blocker.

## 커밋 경계 주의
- 본 작업 = `apps/web` (stores/react-shell/main.ts/package.json/scripts) + 본 문서.
- git status 의 CLAUDE.md/AGENTS.md/SFS.md/.claude/GEMINI.md/.gitignore 변경 = 이전 sfs
  upgrade 미커밋분(무관) — 커밋 시 **분리 필수**.
