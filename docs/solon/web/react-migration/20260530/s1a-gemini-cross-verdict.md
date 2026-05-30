# S1a — Gemini cross review VERDICT (2026-05-30, 이어서 세션)

> sprint `2026-W22-sprint-23`. branch `feature/react-migration-s1a` HEAD `49df8c1`.
> user 지시 = "gemini 로 cross review" (codex usage-limit 5/31 06:13 대체, multi-adaptor 동등).
> Gemini cross **2회 실행 (full diff, main.ts 포함) 모두 exit 0**. 결론 = **실 merge-blocker 0**.

## 실행 메타
- capsule v2 = goal + AC2/3/INV-2/INV-3/AC6/R2b + slot 배선 explainer(workspace-page.ts:215
  빈 슬롯 / main.ts:548 postMount querySelector→setPdfToolbarSlot / appShell
  shouldPreserveReactIsland onBeforeElUpdated false) + **full code diff (10 file, 958 ins)**.
- 1차 capsule 은 glob 이 main.ts 누락 → uiStore "slot 미배선" false-Required 발생.
  v2 에서 main.ts 포함 → 해당 false 소멸. 양 run 교차검증.

## 종합 finding 표 (2 run 합산 + 트리아지)

| sev (gemini) | 위치 | finding | 트리아지 판정 |
|---|---|---|---|
| Important | PdfToolbarPortal.tsx:22 | workspaceState selector 새 객체 → 매 렌더 리렌더, useShallow 누락 | **FALSE** — 코드 line 25 `useStore(store, useShallow((s)=>{...}))` 이미 적용(prior gemini round F2 반영). 양 run 이 stale premise 재flag. |
| Important | PdfToolbar.tsx:298(241) | navigator.platform deprecated + SSR undefined 런타임 에러 | **FALSE(런타임)** — line 241 `typeof navigator !== "undefined" && /Mac\|iPhone\|iPad/.test(navigator.platform ?? "")` 가드 완비. 346 test green 이 증명(미가드면 crash). deprecated 표면 정정은 S1b Optional. |
| **Required** | appShell.ts:81 | shouldPreserveReactIsland 가 canvas preserve 뒤 배치 → 두 속성 공존 시 canvas 우선 | **NOT blocker** — gemini 본문도 "현재 설계상 겹칠 일 없음" 인정. island slot 과 canvas mount 는 서로 다른 노드(data-react-island vs data-pdf-canvas-key). OR-combine 이라 우선순위 무관(둘 중 하나 true면 preserve). severity 오표기. |
| Optional | PdfToolbar.tsx:254/265 | PageControls render-phase setLocalPage / 화살표 클릭 localPage 만 갱신 commit 은 blur·Enter | non-blocking. 화살표 즉시반영 = s1a-done.md 의 알려진 spinner watchlist(operator QA 확인 항목). React 19 허용 패턴. S1b 정리. |
| Optional | PdfToolbar.tsx:288 | Enter → commitPage() 후 blur() → onBlur 재 commitPage() 중복 | non-blocking. commitPage 동일 page set = idempotent(renderApp 결과 동일). guard 추가는 S1b Optional. |
| FYI | workspace-page.ts:215 | display:contents 슬롯 a11y/focus/SR tree | **operator QA a11y 항목으로 이관**(s1a-done.md §미완게이트 2). PdfToolbar aria-label 완비라 저위험. |
| FYI | main.ts:1323 | handleDocumentClick legacy 툴바 위임 = 주석처리 dead code 잔존 | 의도된 상태(R2b: data-action 미emit 이라 inert). S1b 위임 범위축소 시 일괄 제거. |
| FYI | appShell.ts:127 | instanceof HTMLElement, linkedom/iframe 컨텍스트 false 위험 | 저위험. node test 는 globalThis 주입으로 통과. duck-typing 은 장기 고려. |

## 양 run 공통 긍정 확인 (cross evidence)
- **R2b 준수** — React 툴바 data-action/data-tool/data-subject-id 미emit → legacy global
  delegation 이중발화 원천차단. (양 run 명시 확인.)
- **Island lifecycle 견고** — appShell onBeforeElUpdated 보존 + main.ts postMount 슬롯
  signal 조합이 morphdom 환경에서 React 안정 호스팅.
- **INV-2 preservation** — canvas 보존 로직과 무충돌, react-island-preserve.spec(8) 완비.

## 최종 판정
**실 merge-blocker = 0.** Required 1건은 severity 오표기(설계상 불가 시나리오). Important
2건은 stale/false premise(useShallow 적용됨, navigator 가드 완비). 나머지 Optional/FYI 는
S1b backlog 또는 operator QA 항목. **deterministic patch 불필요** — 모두 false 거나
이미 처리됨. autopilot rework loop: user escalation 불요.

## Gate 6 cross 상태 갱신
- self-CPO PASS (이전) + **Gemini cross PASS (본 세션, 2 run)**. 
- codex 는 5/31 06:13 복구 후 GitHub `@codex` post-implementation evidence 로 추가 가능(선택).
  user 가 gemini cross 로 대체 지시 → multi-adaptor 동등성상 merge 게이트 1(cross) 충족.
- **남은 merge 게이트 = operator QA 단 1개** (auth-gated, 자동화 불가).

## 다음 (fresh session FIRST ACTION)
1. **operator QA** — s1a-done.md §미완게이트 2 체크리스트. 시작 전 `git pull` + `pnpm -r build`.
   a11y(display:contents focus order) 항목 추가.
2. **push + PR + merge** — user 터미널. operator QA PASS 후.
3. origin/branch divergence(README 1줄, #128 rebase) = squash 머지로 무의미, 무시 가능.
