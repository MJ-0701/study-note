# 🎯 ACTIVE — S1a merged(prod live) / 다음 슬라이스 = S2(auth) — S1b widget 연기 결정

> SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.
> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.

## 상태 (정정 — 이전 핸드오프 stale 였음)

- **S1a = 머지 완료 + prod live.** `#129`(41371bd) 머지 → 무한루프 incident → 롤백 →
  **fix-forward `#130`(d990f5d) 머지 → fe-v0.1.73 prod success**. main = `d990f5d`.
  남은 것 = operator QA(툴바 실렌더 시각 diff, 자동화 불가) 1회뿐. **S1a 재논의 X.**
- 작업트리 clean (untracked `apps/web/.claude/` worker 아티팩트만).

## 🚀 다음 세션 FIRST ACTION = S2(auth) brainstorm (fresh session 에서)

사용자가 "S1b 시작" 했으나 **조사 후 슬라이스 재배치 결정 → 다음 = S2(auth views)**.
S1b(widget 컴포넌트화)는 연기. 결정·근거 필독:
- `docs/solon/web/react-migration/20260530/s1b-decision-reroute-to-s2.md` (결정)
- `docs/solon/web/react-migration/20260530/s1b-prebrainstorm-findings.md` (조사)

### 왜 S1b 연기 (false safety)
PDF 위젯 5종(chart/table/star/sticky/textbox·checklist) **전부** drag/resize 가 main.ts
공유 pointer dispatcher(pointerdown ~2530–2761, pointermove ~2822)로 동작 — 사용자가 뺀
ink/pen 과 **동일 표면**. markup-only JSX 화 = 이득 0, drag/resize React 이전 = 연기한
native-pointer 본체 + data-action 역방향 이중처리 + pen second-stroke 버그(REOPENED)와
같은 dispatcher → 회귀 구분 불가. widget 작업 미래 자리 = pen-fix + native-pointer
직결(roadmap §3.3) 묶음 슬라이스.

### 왜 S2 가 적합 (코드 실독)
- auth 뷰 = `src/auth/authViews.ts` 순수 string render fn 2개:
  `renderLoginPage(authMode, loginFeedback)`(L4) + `renderSessionCheckPage(authBootNotice)`(L56).
  drag/resize 0. INV-2/3/4 무관, INV-8(XSS form escape)만 주의.
- `authStore`(S0) 에 authSession/authMode/loginFeedback 이미 완성 → store 분해 거의 불필요.
- **⚠️ auth = route 아님**: `renderApp`(main.ts:4399) early-return guard 2단
  (authBootState==="checking" → sessionCheck / !authSession → login, 둘 다 parseRoute 전).
  → roadmap "route LegacyView 치환" 전제와 다름. S2 = router 위 조건부 React mount(authGate)
  vs island(S1a 패턴) 택일 = brainstorm 결정.
- 탭 전환 `data-action="auth-tab-login/signup"`(authViews.ts:19/26) = document click 위임.
  React 화 시 R2b(data-action 미emit) + roadmap §3 이벤트 경계 적용.
- **로그인 *전* 화면 = headless playwright mount 가능**(auth-gated 아님) → S1a 의 loop-gate
  함정 회피, prod-build playwright 실 게이트 박기 가능.
- **⚠️ "저위험" ≠ freebie**: S1a 는 툴바만 위임 경계를 풀었음 → S2 는 "React auth form vs
  document submit/input 위임" 을 새로 풀어야 함(실 작업). 회귀 위험은 낮으나 작업량 0 아님.
- **재배치 성격**: strictly-better 아닌 risk-based reorder. roadmap 은 S1b(pdf, forcing
  function)를 앞에 둔 게 의도적. 우리는 pen 버그 미해결 + widget pointer 전략 미설계라
  "지금은 타이밍 나쁨" 으로 연기한 것. "S1b 무가치" 아님.

## 🔑 직전 사고 교훈 (S1a, 재발 방지 — S2 에도 적용)
- **visible React slice = prod-build playwright GREEN 후에만 deploy 태그 push.** unit(jsdom
  단발 render)+정적 cross 는 런타임 effect 루프 못 잡음(self-CPO+Gemini 2run PASS 했으나 누락).
- **finding 기각 시 라인 실독 필수** — Gemini cross 의 re-entrancy 경고(focus #4)를 코드
  미실독으로 dismiss 한 것이 incident 실제 root cause.
- deploy 태그와 게이트 검증을 같은 batch 에 넣지 말 것.
- loop-gate 에 **negative control**(value-equality guard 누락 setState 신호 심어 red 확인)
  의무 — 게이트가 실제로 루프를 잡는지 증명.

## 자산 (보존)
- React island 패턴(createPortal → morphdom-preserved 슬롯 + uiStore signal +
  shouldPreserveReactIsland) = S2~S4 재사용. fix 완료(값-동일성 guard + useShallow).

## 정책 ambient (SFS 0.6.138, 자세히 CLAUDE.md)
- 구현 = Sonnet worker. main(Opus)=plan/아키텍처/review/INV 판단.
- commit=branch, push=명시 승인(user 터미널). cross = codex 복구 후 @codex, down 시 Gemini.

## 잔여 / 주의
- sprint = `2026-W22-sprint-24`(계획). docs = `docs/solon/web/react-migration/20260530/`.
- roadmap = `docs/solon/web/react-migration/20260529/react-migration-roadmap.md` (§4 슬라이스,
  §5 INV ledger). S2 는 roadmap §4 표상 S0 만 선행 → 재배치 가능.
- **세션 채널 손상 가능성**(직전 incident §"세션 채널 노이즈" 재현 증상) → deterministic
  명령 교차검증한 결론만 신뢰. 실 S2 brainstorm/plan/implement = **fresh session 권장**.
