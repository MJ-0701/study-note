# S1a implement — DONE 요약 + Gate 6 acceptance ledger (toolbar React 전환)

> sprint `2026-W22-sprint-23`. branch `feature/react-migration-s1a` (WU2a e43a30e +
> WU2b 4bbde03). **미push** (push=user 터미널, merge=codex Gate 6 cross 후 5/31 06:13).
> Gate 2 Q1 = B(toolbar-first). 설계 SoT = roadmap §4 S1a / §5 INV ledger.

## 한 줄
pdf-workspace 툴바가 React `<PdfToolbar>` 로 전환됨 — legacy morphdom shell 안에
**React island**(createPortal → morphdom-preserved 슬롯)로 mount. canvas/ink/widget
body 는 legacy 유지(B). 동작·시각 무변경 목표, INV-2/3 무회귀.

## 산출물 (WU 단위)
- **WU1** characterization (`s1a-wu1-characterization.md`) — INV-2/3 structural spec
  baseline(38/38) + toolbar behavioral contract(§2b, 모든 action=helper+renderApp) +
  S0 boot 익명 실측.
- **WU2a** (e43a30e) React island 인프라 — `shouldPreserveReactIsland`(appShell.ts) +
  `#pdf-toolbar-island` 슬롯(workspace-page.ts) + uiStore.pdfToolbarSlot signal +
  `<PdfToolbarPortal>` placeholder + react-island-preserve.spec(8).
- **WU2b** (4bbde03) 툴바 React — registry.pdfToolbar action 7종 + `<PdfToolbar>`
  (createElement, 1:1 fidelity) + portal 실배선 + legacy renderPdfToolbar 호출 제거 +
  pdf-toolbar.spec(13).

## Gate 6 — implementation acceptance ledger

| AC | 상태 | 근거/증거 |
|---|---|---|
| AC1 characterization + S0 boot | ✅ implemented (auth→PDF full = deferred) | WU1 doc §1(38/38) + §3(boot 익명 console0). auth→PDF cross-page full = operator QA(§4). |
| AC2 toolbar React | ✅ implemented | PdfToolbar.tsx 1:1(class/aria/순서/라벨/kbd) + HOTKEY_LABELS·eraser subtoolbar 원본 일치 확인. workspace-page renderPdfToolbar 호출 제거. pdf-toolbar.spec 구조동등. |
| AC3 store 단일화 | ✅ implemented | onClick→registry.pdfToolbar.X→helper(updatePdfWorkspace sink)+renderApp. portal 이 pdfWorkspaceStateStore 구독→props. legacy body 동일 store read. |
| AC4 INV-2 canvas 보존 | ✅ implemented(structural) / live=deferred | canvas-mount.spec green 유지. island preserve = canvas preserve 와 동일 기전 OR-combine. live cross-page = operator QA. |
| AC5 INV-3 무접촉 | ✅ implemented(diff0) / iPad=deferred | git diff: main.ts pointer 핸들러·ink-stroke·ink-decimate 변경 0. ink-stroke.spec green. iPad 실기기 필기 = operator QA(unit 대체 금지). |
| AC6 회귀 0 | ✅ implemented | tsc clean / node:test 346 pass(toolbar13+island8+전 pdf-workspace/app, 신규 실패 0) / vite build green. |
| R2b 이중처리 차단 | ✅ implemented | PdfToolbar 가 data-action/data-tool/data-subject-id 미emit → legacy document 위임 매칭 0. legacy 분기는 dead(미제거, 주석 표기). pdf-toolbar.spec case 8/9 단언. |

**self-CPO premise 검토**: behavioral contract(모든 toolbar action=helper+renderApp,
fullscreen=document.fullscreenElement 파생/flag 부재) 코드 실독 확인. registry action
7종 = legacy 분기 본체 1:1(eraser-size 포함 renderApp 일치 확인). placeholder-as-
acceptance 0. SEED/mock 0.

## 미완 게이트 (merge 전 필수)
1. **Gate 6 cross (@codex)** — usage-limit 5/31 06:13 복구 후 `@codex review`. 현재
   self-CPO 만(codex bridge down). visible UI slice 라 codex 정식 cross 가 merge 게이트.
2. **operator QA** (auth-gated route = 로컬 풀스택/iPad 필요, 자동화 불가분):
   - 인증 로그인 → pdf-workspace 진입 → 툴바 시각 diff 0 (React 툴바가 legacy 와 동일
     위치/스타일). screenshot before(main)/after(branch) 비교.
   - 툴 전환/페이지 이동/지우개 shape·size/fullscreen 동작 + active 표시 갱신.
   - 페이지 전환 시 canvas 보존(INV-2) + iPad 필기 부드러움(INV-3, Mac Safari 원격 인스펙트).
   - cross-device sync(INV-4) 1회 무회귀.
3. **push + PR** — user 터미널 (Solon §1.5). merge = 위 1+2 PASS 후.

## 다음 (S1b 이후)
- S1b = pdf-workspace widgets(chart/table/sticky/star/eraser/ink) 컴포넌트화 — 이때
  canvas+native pointer React 직결(roadmap §3.3) + 위임 범위축소 본격. pen second-stroke
  버그(REOPENED)와 충돌 주의.
- S1c = annotation sync reducer + R2 CAS(INV-4).

## 재사용 자산 (asset promotion)
- **React island 패턴**(createPortal → morphdom-preserved 슬롯 + uiStore signal +
  shouldPreserveReactIsland)은 S2~S4 의 모든 "legacy shell 안 React 부분 전환"에 재사용
  가능. WU2a 가 검증한 핵심 machinery.
