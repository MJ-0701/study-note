# main 앱 React 마이그레이션 Roadmap

> sprint `2026-W22-sprint-2` 산출물 (Gate 3 plan → implement). 대상 = `apps/web` 의
> `index.html` → `src/main.ts` 단일 SPA. **본 문서는 전략/순서/invariant 설계이며 코드
> 변경을 포함하지 않는다.** 후속 구현 sprint 의 단일 입력(mission checklist).
>
> 결정 근거: Gate 2 brainstorm (`brainstorm.md`), dependency graph 매핑
> (cavecrew-investigator), [[project-react-migration-backlog]].

---

## 0. 현재 구조 (사실)

- **stack**: vanilla TS + Vite + morphdom + innerHTML. React 19 이미 설치
  (`react`/`react-dom` deps, `@vitejs/plugin-react`). admin / persona-turn /
  onboarding 은 **이미 별도 vite entry 의 독립 React SPA** (`createRoot(#xxx-root)`).
- **vanilla 잔존 = main entry 만**: `index.html` → `main.ts` (4,682 line) + 모듈 트리.
- **module import 방향** (bottom-up 마이그레이션 순서의 근거):

  ```
  leaf (src 의존 0): auth, pdf, ui, observability, telemetry
  data → domain          api → observability     sync → domain
  sidebar → auth
  pdf-workspace → {app, domain}
  subject-views → {app, data, pdf-workspace}      [최상위]
  ```

- **모듈 규모**: pdf-workspace 19,284 / subject-views 7,891 / auth 2,652 /
  sync 1,700 / sidebar 1,392 / app 1,727 / main.ts 4,682 line.

- **mutable singleton (main.ts module-level)** — React store 전환 대상:

  | 이름 | line | 역할 |
  |---|---|---|
  | `notebook` | 369 | StudyNotebook (주 도메인 상태) |
  | `pdfWorkspaceStore` | 371 | PDF workspace dict |
  | `authSession` | 386 | 인증 세션 |
  | `intakeFeedback` | 486 | import 피드백 |
  | `loginFeedback` | 487 | 로그인 에러 메시지 |
  | `inspectorOpen` | 380 | inspector 토글 |
  | `activeXxxDrag` (8개) | 407–479 | drag/resize 임시 상태 |
  | `quickNote` | 490 | week 페이지 패널 |
  | `pendingPdfRetry` | 489 | 업로드 retry 큐 |

- **render flow**: `hashchange` → `renderApp()` (main.ts:4310) → `parseRoute` →
  12 route branch (4343–4489) → `composeShell` (4566) → `mountRender` (522) →
  morphdom. **단일 `#app` mount.**
- **event**: `document`-level 8 핸들러 (change 1170 / click 1225 / submit 1832 /
  input 1950 / keydown 2221 / pointerdown 2422 / pointermove 2822 /
  pointerup 3070) + touch 4 + hashchange. **전역 위임.**
- **central sink**: `updatePdfWorkspace(subjectId, reducer)` (main.ts:1140+) — 모든
  PDF 변경 → `savePdfWorkspaceStore` → `renderApp`.
- **route 12종** (`app/routes.ts`): home, intake, pdf-workspaces, subject,
  subject-class, subject-summaries, subject-summary-detail, subject-mcp,
  subject-memorize, subject-intake, pdf-workspace, week.

---

## 1. ADR — 접근 결정

### 결정: **A. React-shell strangler** (채택)

`#app` mount 를 `createRoot` 로 React 가 소유하고 hash router 가 route dispatch.
미마이그레이션 route 는 `<LegacyView>` 가 기존 vanilla 렌더 함수의 HTML 을 컨테이너에
mount. slice 마다 한 route 씩 React 로 치환, 나머지는 legacy 유지. **feature freeze 0,
route 단위 배포.**

### 기각: B. big-bang 전체 재작성
- 5~7주 feature freeze + 중간 배포 불가. PDF/iPad invariant(INV-2/3/4) 회귀 위험이
  한 sprint 에 집중 → 직전 saga(#42/#44/#45/#46 polyfill, sprint-W21-sprint-2 sync
  6 round)가 보여준 위험을 한꺼번에 떠안음. 단독 개발자 환경에서 회귀 디버깅 부담 정점.

### 기각: C. route → 별도 vite-entry 분리
- admin.html 패턴을 hash route 로 확장하려면 multi-page 전환 + URL 구조 변경 필요.
  공유 상태(notebook/auth/pdfWorkspaceStore)를 entry 간 재로드/동기화하는 인프라가
  마이그레이션 본체보다 커짐. hash SPA 의 단일 세션 UX 도 깨짐.

### 옛 전제 폐기
[[project-react-migration-backlog]] 의 **"strangler 불가 (단일 hash router + 단일
mount 다툼)"** 전제는 **폐기**. 근거 = admin/persona-turn/onboarding 이 별도 entry React
로 이미 공존 실증 + main.ts 가 11k→4.7k 로 분해돼 module boundary 가 정리됨. 단,
*같은 mount 안* 공존은 여전히 과제 → §3 이벤트 경계 설계로 해소.

---

## 2. 상태관리 결정 (R4)

### 결정: **Zustand**

| 기준 | Zustand | Context + useReducer |
|---|---|---|
| 고빈도 업데이트 (ink pointermove) | selector 구독 → 변경 store 만 re-render | Provider value 변경 시 하위 전체 re-render (memo 보일러플레이트 필요) |
| **strangler 공존** (핵심) | `getState()`/`setState()` 로 **React 밖 legacy 코드도 같은 store 직접 읽기/쓰기** | Provider 트리 밖에서 접근 불가 → legacy/React 상태 이원화 |
| 보일러플레이트 | store 함수 1개 | Provider 중첩 + dispatch 배선 |
| 도메인 순수성 | store = thin state holder, 도메인 로직은 `@study-note/domain` 유지 | 동일 |

**결정적 이유 = strangler 공존.** slice 0~N 전환 기간 동안 legacy 렌더 함수와 React
컴포넌트가 **동일 Zustand store 를 단일 진실원**으로 공유한다. legacy 는
`pdfWorkspaceStore.getState()` / `.setState()`, React 는 `usePdfWorkspaceStore(selector)`.
상태 이원화 없이 점진 가능.

### store 분해 (slice 0 산출)
- `authStore` ← `authSession`, `loginFeedback`, auth boot 상태.
- `notebookStore` ← `notebook`, `quickNote`, `intakeFeedback`, `pendingPdfRetry`.
- `pdfWorkspaceStore` ← `pdfWorkspaceStore` + `updatePdfWorkspace` reducer 의미 보존
  (INV-6). drag/resize 임시 상태(`activeXxxDrag`)는 PDF slice 에서 store 또는 컴포넌트
  로컬 state 로 흡수.
- `uiStore` ← `inspectorOpen` 등 ephemeral UI.

도메인 로직(`@study-note/domain`)은 store 에 넣지 않는다 — store 는 상태 보관 + 액션만.

---

## 3. 이벤트 경계 설계 (R5)

### 문제
현재 8개 `document`-level 위임 핸들러 + 4 touch. React 가 일부 subtree 를 소유하면
같은 이벤트를 React SyntheticEvent + document 핸들러가 **이중 처리**할 위험.

### 설계
1. **위임 범위 축소 (S1 에서, S0 아님 — 2026-05-29 정정)**: `document.addEventListener(...)`
   → **`<LegacyView>` 컨테이너 엘리먼트 scoped 위임**으로 이전. legacy 핸들러는 legacy
   DOM 에 대해서만 발화. React 로 마이그레이션된 route 는 LegacyView 컨테이너 밖 →
   legacy 핸들러가 닿지 않음. 이중처리 구조적 차단.
   - **정정 사유**: S0 는 전 route 가 LegacyView(React 렌더 콘텐츠 0) → 이중처리가
     구조적으로 불가능. S0 에서는 `document` 위임 유지가 동작 무변경 + 저위험. 위임
     축소는 **첫 React route 가 등장하는 S1 에서** 수행해야 정확하다.
2. **React route 이벤트**: 일반 UI 는 React SyntheticEvent (onClick/onChange/onSubmit).
3. **PDF pen/pointer (INV-3)**: SyntheticEvent 우회 — `useEffect` + ref 로 canvas
   엘리먼트에 **native `pointerdown/move/up` + `getCoalescedEvents`** 직접 부착 +
   cleanup. React 합성 이벤트는 coalesced event 를 보장 안 하므로 native 직결 필수.
   legacy 위임과 무관(다른 엘리먼트 + native).
4. **hashchange / 라우팅**: slice 0 이후 router 가 소유. `parseRoute`(app/routes.ts)
   순수 로직은 router 설정으로 1:1 이전 (INV-5).

### 검증
slice 1(PDF)에서 본 설계가 **최악 케이스(고빈도 pointer + canvas + 위임 공존)**로
즉시 검증된다 — strangler forcing function. 여기서 통과하면 나머지 view 는 저위험.

---

## 4. Slice Roadmap (R2)

> 순서 = bottom-up dependency + 사용자 결정(PDF-first). slice 0 은 무조건 선행.
> sp = story point 추정 (1sp ≈ 1 작업일). 위험 = 회귀 위험도.

| slice | 범위 | 포함 모듈/route | 선행 | sp | 위험 |
|---|---|---|---|---|---|
| **S0** | React shell foundation | `createRoot(#app)` + 얇은 hash router(parseRoute 1:1) + `<LegacyView>` + Zustand store 4종(singleton 이전, accessor shim). **전 route LegacyView 렌더 = 동작 무변경. 이벤트 위임은 document 유지(S1 이연).** | — | 2~3 | 높음 (인프라 pivot) |
| **S1a** | **pdf-workspace canvas + toolbar** (PDF-first) | `<PdfCanvasMount>` (INV-2) + native pointer/pen 직결 (INV-3) + 툴바 + **이벤트 위임 범위축소(§3, S0 에서 이연)** | S0 | 2~3 | **매우 높음** (INV-2/3) |
| **S1b** | pdf-workspace widgets | chart/table/sticky/star/eraser/ink 위젯 컴포넌트화 | S1a | 1~2 | 높음 |
| **S1c** | pdf-workspace annotation sync | store reducer + R2 CAS/revision (INV-4) | S1a | 1 | **매우 높음** (INV-4) |
| **S2** | auth views → React | auth/* (login, session boot, session check) | S0 | 1 | 중 |
| **S3** | home + sidebar + intake | subject-views/sidebar, home, intake, pdf-workspaces index | S0, S2 | 1~2 | 중 |
| **S4** | subject views → React | subject-class, summaries, summary-detail, week, mcp, memorize, subject-intake | S0, S1, S3 | 2~3 | 중 (week 페이지 user-note sync 주의) |
| **S5** | cleanup | LegacyView 제거, morphdom 의존 제거, `mountRender`/`composeShell` legacy 경로 삭제, main.ts thin bootstrap 화 | S1~S4 | 1 | 낮음 (dead code 제거) |

총 추정 = **11~15sp** (≈ 2~3주 분산, freeze 없음). S1(PDF)을 위험 분산 위해
S1a/b/c 로 분할 — INV-2/3(canvas/pen)와 INV-4(sync)를 별 slice 로 격리 검증.

### S0 구현 착수 경계 (AC6 — 후속 plan 입력 충분 수준)
- 신규 파일 후보:
  - `apps/web/src/app/react-shell/root.tsx` — `createRoot(#app)`, StrictMode.
  - `apps/web/src/app/react-shell/router.tsx` — hash router, `parseRoute` 1:1 매핑.
  - `apps/web/src/app/react-shell/LegacyView.tsx` — vanilla 렌더 함수 결과 mount +
    post-mount `applyPdfCanvasMounts` 훅 + 컨테이너 scoped 이벤트 위임 부착.
  - `apps/web/src/stores/{authStore,notebookStore,pdfWorkspaceStore,uiStore}.ts`.
- 변경 대상: `main.ts` — `renderApp`/`mountRender`/`hashchange` 진입점을 shell 로
  위임, mutable singleton 을 store 로 이전, 전역 `document` 위임을 LegacyView 컨테이너
  로 이전. 렌더 함수들은 LegacyView 가 호출하도록 registry 노출.
- `polyfills.ts` import 는 React entry(`root.tsx`)에서도 **1순위 보장** (INV-1).
- **동작 무변경 보장**: S0 종료 시점 전 route 가 LegacyView → 사용자 관찰 동작 동일.
  이게 S0 의 acceptance (시각 회귀 0).

---

## 5. 회귀 Invariant Ledger (R3)

> 마이그레이션 후에도 반드시 보존. 각 INV 를 slice 에 매핑 + 검증 방법. 기존 saga
> 커버 확인.

| INV | 내용 | 기원 | 매핑 slice | 검증 |
|---|---|---|---|---|
| **INV-1** | `polyfills.ts` `Map.prototype.getOrInsertComputed` (iPad Safari pdf.js) import 1순위 | PR #42/#44/#45/#46 saga | S0(React entry import), S1 | 빌드 entry 에서 polyfill 선행 확인 + iPad 실기기 PDF 로드 |
| **INV-2** | PDF canvas mount 보존 (`shouldPreservePdfCanvasMount`, `applyPdfCanvasMounts`) | morphdom canvas preserve | S0(LegacyView), S1(PdfCanvasMount) | `<PdfCanvasMount>` = useRef+useLayoutEffect+stable key+in-flight cancel. 페이지 전환 시 canvas 깜빡임/재마운트 0 |
| **INV-3** | iPad pen RAF batch + `getCoalescedEvents`, native pointer | iPad pen 안정화 | S1 | native pointer 직결(§3.3) + cleanup. iPad 실기기 필기 부드러움/지연 |
| **INV-4** | annotation 좌표 0~1 ratio + Hybrid R2 CAS + revision/1970 epoch sentinel | sprint-W21-sprint-2 6 round sync hardening | S1c | store reducer 재구성 후 cross-device sync (iPad↔PC) 재검증 |
| **INV-5** | hash route 12종 1:1 보존 + stale URL leak 방지 | app/routes.ts | S0(router) | router 매핑 = parseRoute 결과 동일, app/__tests__/routes.spec 보존 |
| **INV-6** | `updatePdfWorkspace` 단일 sink 의미 (모든 PDF 변경 → store → persist → render) | central reducer | S0(store action), S1 | store action 이 동일 persist + re-render 트리거 |
| **INV-7** | RUM/telemetry 보존 (canvasMountCallbacks RUM emit, sync metric value-level scrub) | 관측성 sprint | S1 | Datadog RUM event 발생 + PII scrub 유지 확인 |
| **INV-8** | XSS 경계 보존 — escapeHtml / DOMPurify / dangerouslySetInnerHTML 최소화 | import XSS fix (fe-v0.1.59) | S0(LegacyView innerHTML), S1~S4 | LegacyView 의 HTML 주입은 신뢰된 자체 렌더 출력만. user content 는 React JSX 자동 escape. dangerouslySetInnerHTML 사용처 = DOMPurify 경유 |

**saga 커버 확인**: #42/#44/#45/#46 polyfill → INV-1. sprint-W21-sprint-2 sync 6 round
→ INV-4. fe-v0.1.59 import XSS → INV-8. 모두 ledger 커버됨.

### iPad 실기기 QA 주기
- S0 종료 시 (동작 무변경) iPad 1회 smoke (로드/PDF 표시).
- **S1 (PDF) 종료 시 필수 full QA**: 필기 부드러움, 연속 획(OS 한계 별개
  [[project-ipad-pen-second-stroke]]), cross-device sync, 페이지 전환 canvas 보존.
- S4 종료 시 week 페이지 user-note sync 재확인.

---

## 6. 후속 sprint 분해 제안

1. **plan sprint (S0)** — React shell foundation. 본 roadmap 의 §4 S0 경계 → plan.
2. **plan sprint (S1a/b/c)** — pdf-workspace. INV-2/3/4 characterization test 선행 필수
   (TDD: 마이그레이션 전 현 동작 캡처 → 후 동일성 검증).
3. S2 → S3 → S4 → S5 순차.

각 구현 sprint 는 **INV characterization test (마이그레이션 전 현 동작 캡처)**를 first
failing/characterization evidence 로 삼는다 (본 설계 sprint 의 TDD waiver 를 후속에서 해소).

---

## 7. 범위 밖 (재확인)

- admin / persona-turn / onboarding entry 재작성 (이미 React).
- Next.js / SSR (hash SPA + Vercel 정적 유지).
- API / 백엔드 / 도메인 계약 변경.
- vite build entry 변경 (A 접근 = entry 불변, `index.html` 그대로).
- UI 시각 변경 (구조 마이그레이션, 동작/시각 동일 보존이 목표).
