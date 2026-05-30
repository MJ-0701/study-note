# 결정 — S1b(widget 컴포넌트화) 연기, 다음 슬라이스 = S2(auth views)

> 2026-05-30. main = d990f5d (S1a merged, fe-v0.1.73 prod). 사용자 결정 2건:
> (1) "presentational only" carve-out, (2) **슬라이스 재배치 → S2 auth**.
> 근거 = `s1b-prebrainstorm-findings.md` (behavioral-contract 조사).

## 결정

**S1b "pdf-workspace widget 컴포넌트화" 를 연기한다.** roadmap §4 의 S1b 자리에 S2(auth)를
먼저 넣는다. 슬라이스 의존성상 S2 는 S0 만 선행으로 요구 → 재배치 가능(roadmap §4 표).

### 결정의 성격 (정직하게)
이건 **strictly-better 가 아니라 risk-based reorder** 다. roadmap 이 S1b 를 S2 앞에 둔 건
의도적 — pdf-workspace 가 forcing-function 슬라이스(최악 케이스 먼저 검증). S2 우선 =
"컨텍스트 신선할 때 어려운 것부터" 를 "쉬운 것부터 + 어려운 표면 설계 성숙시킨 뒤" 로
교환. 둘 다 정당. 우리가 택한 근거 = (1) pen second-stroke 버그가 미해결이라 지금 pointer
표면 건드리면 회귀 구분 불가, (2) widget pointer 전략이 ink 포함해 아직 미설계. 즉
**"S1b 가 무가치"가 아니라 "지금은 타이밍이 나쁘다"**.

## 왜 (조사 결론)

1. **"presentational only" = false safety.** 5개 위젯(chart/table/star/sticky/
   textbox·checklist) **전부** drag/resize 가 main.ts 공유 pointer dispatcher
   (pointerdown ~2530–2761, pointermove ~2822)로 동작. 이 dispatcher 는 사용자가 S1b 에서
   뺀 ink/pen 과 **동일 표면**. star-mark 만 resize 까지 있음(~2698). 위젯 markup 만 JSX
   화하면 "컴포넌트화" 라기엔 이득 ≈ 0(순수 leaf 는 slice-2g 에서 이미 분리됨), drag/resize
   를 React 로 옮기면 곧 native-pointer 본체 = 사용자가 방금 연기한 작업.
2. **data-action 역방향 이중처리.** S1a 가 일부러 피한 R2b(React DOM 이 data-action emit →
   legacy 위임 이중 발화)를 위젯에서 되살려야 함.
3. **pen second-stroke 버그(REOPENED)** 가 같은 dispatcher 에 살아있어 migration 회귀와
   기존 버그 구분 불가 + 롤백 엉킴.

## S2(auth) 가 더 나은 이유 (코드 실독 확인)

- **진짜 presentational.** auth 뷰 = `src/auth/authViews.ts` 순수 string render fn **2개**:
  - `renderLoginPage(authMode, loginFeedback)` (authViews.ts:4) — login/signup 탭 통합.
  - `renderSessionCheckPage(authBootNotice)` (authViews.ts:56) — boot 중 로딩 화면.
  pointer drag/resize 0. INV-2/3/4 무관.
- **store 이미 완성.** `authStore`(S0, sprint-3) 에 `authSession` / `authMode` /
  `loginFeedback` 보유 (get/set accessor 까지). authBootState/authBootNotice 는 별도
  getter(`getAuthBootStateValue`/`getAuthBootNoticeValue`) — store 흡수 여부 brainstorm 확인.
  → S2 는 새 store 분해 거의 불필요, 구독만.
- **⚠️ route 가 아니라 pre-router gate** (중요 정정). auth 뷰는 `parseRoute` route 가
  **아니다**. `renderApp`(main.ts:4399) 의 **early-return guard 2단**:
  ```
  if authBootState === "checking"  → renderSessionCheckPage(...)  [router 전]
  if !authSession                  → renderLoginPage(...)         [router 전]
  // 여기 통과해야 parseRoute + route dispatch
  ```
  → roadmap 의 "route 단위 LegacyView→React 치환" 전제와 다름. S2 = **router 위
  조건부 mount**(authGate)로 설계. router 변경 불필요(저위험 측면), 단 LegacyView
  route-swap 패턴 그대로는 안 맞음 → island(S1a) 또는 root-level 조건부 React mount 중
  택일 = brainstorm 결정.
- **이벤트 경계 (확인됨).** login/signup 탭 전환 = `data-action="auth-tab-login"` /
  `"auth-tab-signup"` (authViews.ts:19/26) → **document click 위임**. form submit 도
  document 위임(submit ~1832) 경유 추정. React 화 = SyntheticEvent 전환 + 위임 매칭 제거
  (S1a R2b 패턴: data-action 미emit) 필요. **roadmap §3 이벤트 경계 적용 대상.**
- **저위험 — 단, "freebie" 아님.** auth form submit/tab 이 document 위임(submit ~1832)에
  걸려 있고 S1a 는 **툴바만** 위임 경계를 풀었다. 즉 S2 는 "React auth form vs document
  submit/input 위임" 을 **새로 풀어야** 함 = 실 작업. INV-2/3/4(canvas/pen/sync) 무관이라
  *회귀 위험*은 낮지만 *작업량*이 0인 건 아님. "저위험" 이 brainstorm 확인 전에 굳지 않게
  주의(아래 §확인 2). INV-8(XSS, email/password/feedback escape)이 핵심 보안 주의.

## S2 brainstorm 진입 시 확인할 것 (fresh session)

1. ~~auth route parse~~ → **정정됨**: route 아님, renderApp early-guard(위). S2 설계 =
   authGate 조건부 React mount vs island 택일.
2. **form submit 이벤트 경로** — submit(~1832)/input(~1950) document 위임 중 auth 매칭
   부분 정확히 grep. React 전환 시 위임에서 제거할 hook 목록 확정(R2b 이중처리 차단).
3. authBootState/authBootNotice 를 authStore 로 흡수할지(현재 별도 getter) — store 단일화
   범위 결정.
4. **loop-gate 재설계** (incident L1): auth 는 **로그인 *전* 화면 = headless playwright 가
   실제로 mount 가능**(auth-gated 아님) → S1a 함정 회피 가능. prod-build playwright 로
   login 화면 무crash + form 렌더 + 탭 전환을 **실 게이트**로 박을 수 있음을 먼저 증명.
   negative control = value-equality guard 누락 setState 신호 1개 심어 red 확인.

## 남은 위젯 작업의 미래 자리

widget 컴포넌트화는 **pointer dispatcher 전략이 정해진 뒤**로 — 즉 ink/pen(pen second-stroke
fix 완료) + native-pointer React 직결(roadmap §3.3)을 하나의 슬라이스로 묶어 S1c 이후 또는
별도 S1d 로. 그때 위젯 drag/resize 가 같은 native-pointer effect 에 자연스럽게 올라탐.

## 채널 주의

본 세션 후반 tool-result 채널 garble(incident §"세션 채널 노이즈" 재현). 실제 S2
brainstorm/plan/implement 는 **fresh session 권장**. 본 결정·조사는 garble 이전 직접 실독
증거 기반이라 신뢰 가능.
