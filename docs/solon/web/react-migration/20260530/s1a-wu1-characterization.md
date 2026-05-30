# S1a / WU1 — characterization + S0 foundation 실측 증거

> sprint `2026-W22-sprint-23`. Gate 2 Q1 = **B(toolbar-first)**. 본 문서 = 구현 *전*
> 현 동작 고정(characterization) + S0 foundation 실측. 마이그레이션 후 동일성 기준선.
> 측정일 2026-05-30. branch = main (origin/main b56fa48, S0=PR #118 merged).

## 1. INV-2/3 structural characterization (자동 spec, green)

```
node --experimental-strip-types --no-warnings --test \
  apps/web/src/pdf-workspace/__tests__/{canvas-mount,ink-stroke,page-render}.spec.ts
→ tests 38 / pass 38 / fail 0
```

- **canvas-mount.spec** (INV-2): canvas mount 보존 로직(applyPdfCanvasMounts /
  shouldPreservePdfCanvasMount dataset key) green.
- **ink-stroke.spec** (INV-3): pen point + RAF batch + getCoalescedEvents + pressure
  green. **이 파일은 S1a 에서 무변경**(B) → 마이그레이션 후 동일 green 이 INV-3 무접촉 증명.
- **page-render.spec** (toolbar): toolbar tool-button trusted attribute escape green.
  → WU2 의 React `<PdfToolbar>` 가 동일 출력을 내는지의 equivalence 기준.

**기준선 합의**: WU2 후 위 38 case 가 그대로 green(또는 toolbar 분리에 맞춰 명시 갱신된
case 만 변경) + 신규 실패 0 이면 INV-2/3 structural 동일성 충족.

## 2. toolbar contract (WU2 입력 + 이중처리 표면)

- 렌더: `renderPdfToolbar` (apps/web/src/pdf-workspace/page-render.ts:120) — 순수 HTML
  string, user content 0(버튼 라벨 정적), `escapeHtml` 경유. → React JSX 1:1 이전 안전.
- 구조: `.pdf-toolbar` > `.pdf-page-controls`(prev/page-input/next) +
  `.pdf-tool-group`×3(입력도구 read/sticky/pen/eraser · annotation text/checklist/table/
  chart/star · 화면전환 fullscreen) + eraser 시 sub-toolbar.
- **data-action 집합** (legacy document 위임이 keying):
  | action | 엘리먼트 | legacy 핸들러 |
  |---|---|---|
  | `set-pdf-tool` (+ `data-tool`) | button | main.ts:1476 (click) |
  | `pdf-prev-page` | button | main.ts:1500 (click) |
  | `pdf-next-page` | button | main.ts:1511 (click) |
  | `toggle-pdf-fullscreen` | button | main.ts:1284 (click) |
  | `select-pdf-page` | input[number] | main.ts input 핸들러(1950대) |
  | eraser shape/size | sub-toolbar | renderEraserSubToolbar(context) |
- ⚠ **이중처리 차단(R2b)**: React `<PdfToolbar>` 가 동일 `data-action` 을 emit 하면
  document click/input 위임이 React onClick 과 **동시 발화**. WU2 는 (i) React 툴바를
  onClick 으로만 동작시키고 위 data-action 미emit, 또는 (ii) 위 5 분기를 legacy body
  미존재로 dead 화 → 제거. body(canvas/ink) 위임(pointer 2457/2857/3105)은 무변경.
  - 참고: main.ts:3470 = PR #52 codex Round-1 P1 (toolbar click 이 set-pdf-tool 분기로
    가는 기존 주석) — WU2 에서 분기 제거 시 이 주석 맥락 함께 정리.
- store 배선: 현 콜백은 `updatePdfWorkspace`(workspace-store.ts:339, INV-6 sink) 경유.
  WU2 React onClick → 동일 store action 호출 → legacy body 가 동일 store read (R2).

## 2b. toolbar behavioral contract (advisor 지적 — HTML 아닌 *동작* 계약)

> ⚠ page-render.spec 는 HTML 문자열만 검증. 클릭 시 *무엇이 일어나는지*는 아래가 SoT.
> WU2 의 React onClick 은 이 동작을 1:1 보존해야 한다.

**핵심 사실: 모든 toolbar action 은 store mutation 후 명시적 `renderApp()` 을 호출한다**
(renderApp 은 `updatePdfWorkspace` sink 에 baked 되어 있지 *않다* — 각 핸들러가 직접 호출).
→ React 툴바 onClick 은 **helper + renderApp() 둘 다** 호출해야 legacy body(canvas/ink)가
새 tool/page 로 재렌더된다. helper 는 main.ts 함수이므로 **registry 에 action 그룹 노출**
(S0 least-privilege 패턴), 각 wrapper = legacy 분기 본체 그대로 이전.

| action | legacy 분기(본체) | registry wrapper |
|---|---|---|
| set-pdf-tool | main.ts:1476 `setPdfTool(s,tool); renderApp()` | `setTool(s,tool)` |
| pdf-prev-page | 1500 `movePdfPage(s,-1); renderApp()` | `prevPage(s)` |
| pdf-next-page | 1511 `movePdfPage(s,+1); renderApp()` | `nextPage(s)` |
| select-pdf-page (number input) | document-change.ts change → `commitPage: setPdfPage`(main.ts:1211→3911) + renderApp | `setPage(s,n)` |
| set-eraser-shape | 1488 `applySetEraserShape(s,shape); renderApp()` | `setEraserShape(s,shape)` |
| set-eraser-size (input) | ~1945 `applySetEraserSize(s,Number(v))` (+renderApp) | `setEraserSize(s,n)` |
| toggle-pdf-fullscreen | 1284 `togglePdfFullscreen()` (**renderApp 없음**) | `toggleFullscreen()` |

**fullscreen 정정**: `isPdfWorkspaceFullscreen()`(main.ts:2206) 은 모듈 flag 가 *아니라*
`document.fullscreenElement?.id === PDF_WORKSPACE_ROOT_ID` 파생값. → **uiStore lift 할
flag 없음**. React 툴바 fullscreen 버튼 = native `fullscreenchange` 이벤트 구독 + 위
파생식 재평가로 reactive. registry 는 `toggleFullscreen` 만 노출. (readers 전수: 2213
FullscreenPort 내부, 4652 PdfToolbarContext→renderPdfToolbar = 툴바 React 화 후 unused.)

**store 반응성**: selectedTool/selectedPage/eraserShape/eraserSize/material 전부 domain
`PdfWorkspace` type(pdfWorkspaceStore `workspaces[subjectId]`) 안 → React 가 store
subscribe 로 active tool/page number/eraser UI 갱신. fullscreen 만 native event.

## 3. S0 foundation 실측 (vite dev preview, 익명 경로)

- `pnpm --filter @study-note/web dev` (port 5173) fresh main checkout boot.
- 측정(preview_eval): `#app > #legacy-app-root`, `legacy-app-root` display=`contents`,
  익명 boot → 로그인 페이지 렌더("PRIVATE STUDY WORKSPACE / study-note / 로그인·회원가입").
- **console error 0**. 시각 baseline screenshot 확보(로그인 카드 정상).
- 결론: S0 react-shell(createRoot #app + LegacyView display:contents)가 fresh main 에서
  **boot/익명 렌더/무에러** 동작 ✅.

## 4. 미측정 / operator QA 이연 (정직 기재)

- **auth→PDF workspace canvas cross-page 보존 (INV-2 full)** = 로컬 풀스택(BE API +
  seed PDF + 로그인 세션) 필요 → 본 WU1(익명 preview)에서 **미측정**. structural INV-2
  는 §1 spec 으로 green 이나, *실제 인증+PDF 페이지 전환 시 canvas 재마운트 0* 은
  operator QA gate(prod 리뷰어 계정 또는 iPad 실기기, AC5/operator)에서 검증.
  → advisor 가 지목한 "S0 un-QA'd auth→PDF" 는 **여전히 실기기/풀스택 QA 미완**.
  WU2 진입 전 latent canvas bug 가능성은 structural spec green 으로 1차 완화, 최종
  확증은 operator QA.
- **INV-3 iPad 실기기 필기 smoke** = S1a 종료 시 operator QA(Mac Safari 원격 인스펙트).
  unit test(§1)로 대체 금지(advisor 제약 2).

## 5. WU1 판정

- characterization 기준선 = §1 (38/38 green). toolbar contract = §2. S0 boot = §3 ✅.
- **latent S0 bug 게이트**: 익명 경로·structural spec 에서 회귀 징후 0 → WU2 진입 차단
  사유 없음. 단 auth→PDF full QA(§4) 미완 = operator gate 로 명시 추적.
- 다음 = WU2(toolbar 분리 React, Sonnet worker) — Gate 3 PASS + user 구현 승인 후.
