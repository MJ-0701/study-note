# S1b 사전 조사 — "widget 컴포넌트화" 슬라이스 재검토 (브레인스토밍 진입 전)

> 2026-05-30. sprint 후보 `2026-W22-sprint-24`. main = d990f5d (S1a merged).
> 본 문서 = `/sfs brainstorm` 진입 전 advisor 의 challenge 에 따른 behavioral-contract
> 조사 결과. **결론: S1b 를 roadmap 원안대로 진행하면 안 된다 — slice 형태/순서 재결정 필요.**

## 0. S1a 상태 정정 (stale handoff)

- ACTIVE handoff 는 "S1a merge 대기(codex cross + operator QA)" 라 했으나 **stale**.
- git log: `#129`(41371bd, S1a) + `#130`(d990f5d, 무한루프 fix-forward) **머지 완료**.
  MEMORY = fe-v0.1.73 prod 배포 success. **S1a = closed-except-operator-QA**(툴바 실렌더
  시각 diff, 자동화 불가 = 운영자 수동 1회만 남음).
- 다음 세션은 S1a merge 재논의 X.

## 1. 핵심 발견 — "presentational only" 는 false safety

사용자 결정 = "ink/canvas-pointer 빼고 presentational widgets(chart/table/sticky/star/
eraser) 만 컴포넌트화". 이 carve-out 은 **pen 두번째-획 버그**는 피했으나 **native-pointer
표면 자체는 못 피한다.**

### 증거 (직접 코드 실독, main.ts)

5개 위젯 전부 **drag/resize 가 main.ts 공유 pointer dispatcher 를 통해** 동작한다:

| 위젯 | pointerdown 분기 (main.ts) | begin 핸들러 |
|---|---|---|
| eraser | `resize-eraser-handle` (~2682) | beginEraserResize |
| sticky-note | `sticky-note-drag-handle` (~2691) | beginStickyNoteDrag |
| star-mark | `resize-star-mark-handle` (~2699) + `star-mark-drag-handle` (~2731) | beginStarMarkResize/Drag |
| chart | `resize-chart-handle` (~2707) + `chart-drag-handle` (~2723) | beginChartResize/Drag |
| table | `resize-table-handle` (~2715) + `table-drag-handle` (~2737) | beginTableResize/Drag |
| textbox/checklist | `textbox-drag-handle` (~2745) / `checklist-drag-handle` (~2751) | beginTextboxDrag/beginChecklistDrag |

pointermove dispatcher (main.ts ~2822–2861) 가 `activeEraserResize / activeStickyNoteDrag /
activeStarMarkResize / activeStarMarkDrag / activeChartResize / activeChartDrag /
activeTableResize / activeTableDrag / activeTextboxDrag / activeChecklistDrag` module-level
singleton 들을 순차 분기한다. **이 dispatcher 는 ink/pen stroke 도 같이 처리한다** (사용자가
S1b 에서 뺀 바로 그 표면).

### 함의

- 위젯의 **시각 markup 은 사소**하고, **본질 동작 = drag/resize pointer**다. 이걸 React 로
  옮기려면:
  - (a) pointer 는 legacy main.ts dispatcher 에 남기고 React 는 markup 만 렌더 →
    React 가 렌더한 DOM 이 동일 `data-action` 을 emit + document/컨테이너 위임이 닿는
    위치에 살아야 함. **이는 S1a 툴바가 일부러 피한 data-action 이중처리(R2b)를 역방향으로
    재도입**. 게다가 "컴포넌트화" 라 부르기엔 markup 만 JSX 화 = advisor 가 말한
    "busywork dressed as migration" (순수 leaf 는 이미 slice-2g 에서 증명됨, JSX 재렌더
    이득 거의 0 + island 1개 추가 비용).
  - (b) drag/resize 를 React native-pointer effect 로 이전 → **공유 dispatcher 분리 필요 +
    사용자가 방금 연기한 native-pointer 작업 본체**. ink 와 같은 dispatcher 라 ink 만 빼고
    위젯 pointer 만 React 화 = dispatcher 를 어정쩡하게 둘로 쪼갬.
- 렌더 경로 = HTML string (`widgetsHtml`) workspace-page.ts 조립 → morphdom. 상태 =
  `pdfWorkspaceStore` + `updatePdfWorkspace` reducer (INV-6).

## 2. island topology (advisor)

1. **portal-per-widget (N island)** — S1a 무한루프 machinery 를 가장 churn 많은 표면에
   N배 복제. **기각.**
2. **single widget-layer island (1 portal)** — 현재 페이지 전 위젯을 1개 React subtree 가
   `pdfWorkspaceWidgetsState` 스냅샷 1개로 id-keyed 렌더. 구독 1 / guard 1 / morphdom 은
   컨테이너 1개만 보존. 정직한 toolbar 패턴 재사용. **그나마 유일하게 할 만한 형태.**
3. **geometry 컴포넌트화 보류** — 순수 leaf 만 JSX 화. 이득 거의 0. 사실상 busywork.

## 3. loop-gate 주의 (incident L1 재발 방지)

- playwright 존재함: `smoke:auth-boot-playwright` (`@playwright/test ^1.60.0`). 확장 대상.
- **auth-gated route 함정**: 위젯 표면은 로그인 뒤 → headless prod-build playwright 가
  실제 위젯을 mount 못 하면 게이트가 **green 인데 아무것도 검증 안 함**(무게이트보다 나쁨).
  AC 로 박기 전 **prod-build headless 에서 실위젯 mount 가능함을 먼저 증명**. 불가면 게이트는
  operator-QA 로 강등 + slice 위험 프로파일 상향.
- **negative control 은 S1a 루프를 구체적으로 재현해야** 함: 일부러 value-equality guard
  없는 setState 신호를 하나 심어 smoke 가 red 나는지 증명. 그래야 게이트가 값어치 있음.

## 4. 권고 (사용자 결정 필요)

S1b "widget 컴포넌트화" 는 **다음 슬라이스로 부적합** — 고위험·저가치. 이유 = 위 1·2.

대안:
- **A. 슬라이스 재배치** — 다음 = **S2 (auth views)**. 진짜 presentational + 저위험,
  S1a island 패턴 바로 재사용. 또는 **S1c (annotation sync store reducer + R2 CAS)** 를
  먼저 — 위젯이 나중에 올라탈 실 store 를 만든다. 위젯 컴포넌트화는 pointer dispatcher
  전략(ink 포함, pen-bug fix 후)이 정해진 뒤로 연기.
- **B. S1b 축소 재정의** — option-2 single widget-layer island 로만, drag/resize 는
  legacy 유지(markup-only). 단 data-action 역방향 이중처리 경계를 명시 설계 + 이득 작음 인지.
- **C. 원안 강행** — 비권장 (false safety + dispatcher 분리 위험).

## 5. 채널 주의

본 세션 후반 tool-result 채널이 truncate/garble (incident 문서 §"세션 채널 노이즈"와 동일
증상). 직접 실독한 pointer dispatcher 증거(§1 표)는 garble 이전 확보분으로 신뢰 가능.
**실제 plan/implement 는 fresh session 권장.** investigator 에이전트(별도 컨텍스트) 결과로
render-export 명/state/already-react 교차확인 보강 예정.
