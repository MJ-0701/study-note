# Codex CPO cross review — S1a~S3b React island 마이그레이션 (post-merge 외부 evidence)

> 2026-05-31 10:45 KST. codex(`gpt-5.5` xhigh, `codex exec --full-auto`) 가 이미 prod
> 머지된 4 슬라이스(S1a toolbar #130 · S2 auth #131 · S3 home+intake #132 · S3b sidebar #133)를
> **set 으로** cross review. 07:00 obligation(codex usage reset 06:13 후) 이행분.
> S3b Gate 6 waiver(`20260530T175927Z-96631`)의 "codex 보강 예정" 충족.
> 원문 = `.sfs-local/tmp/codex-s1a-s3b-review-result.md` · 프롬프트 = `.sfs-local/tmp/codex-s1a-s3b-review-prompt.txt`.

## VERDICT = concerns

- XSS(INV-8) 활성 결함 0, morphdom-preserve clobber 0, build pass(`pnpm --filter @study-note/web build`).
- 핵심 우려 = S3 view-model publication 의 loop-immunity gap 2건 + PDF toolbar double-commit 1건.

## Findings

| # | sev | loc | 문제 | fix |
|---|---|---|---|---|
| 1 | **Required** | main.ts:4555 | Home props 가 매 `renderApp` 새 nested array/object 할당 → `HomeIslandPortal` shallow selector 가 value-equal re-render 억제 불가. loop-immunity 계약 gap | value-key memoize 또는 `setHomeProps` 를 deep/value equality 로 guard |
| 2 | **Required** | main.ts:4572 | general intake props 가 매 `renderApp` `subjectCoverageRates` 재생성 → value-equality loop-immunity 계약 무력화 | general-intake view-model memoize 또는 값 불변 시 `setIntakeProps` skip |
| 3 | Important | PdfToolbar.tsx:289 | Enter → page commit, 직후 `blur()` 가 `onBlur={commitPage}` 발화 → **같은 page 이중 commit** | Enter commit 후 다음 blur commit 억제 또는 강제 blur 제거 |
| 4 | Important | PdfToolbar.tsx:191 | `FullscreenButton` 이 leaf-local `useEffect`+`setState` 로 fullscreen 상태 유지 + document `fullscreenchange` 도 `renderApp` 호출 = pure-props 밖 2nd render source | fullscreen 상태를 portal/view-model 경로로 lift 또는 명시 예외 guard |
| 5 | FYI | IntakeView.tsx:223 | intake island 이 delegated `data-action` 을 document listener 로 발화. markup-only → 현재 double-fire 0. event ownership split 잔존 | action 마이그레이션 전까지 React handler 금지 regression guard 유지 |
| 6 | FYI | SidebarView.tsx:77 | sidebar `data-action="sidebar-term-toggle"` 동일 경계. markup-only | static no-`onClick`/no-`onToggle` guard 유지 또는 React 소유 시 delegated action 제거 |

## premise 검토 (codex-finding-filter 정책)

- **#1/#2 (Required)** = 진짜 계약 gap. producer 가 view-model 전체 JSON memoize 를 안 해
  매 renderApp 동일-값 새 ref → island 불필요 re-render. **단 "loop" 은 과표현** — root.render
  은 idempotent, child effect-setState 없으면 무한루프 아님(#185 와 구분). prod(fe-v0.1.77)
  무사고 = latent 낭비-render. 그래도 loop-immunity 자산 계약 위반 → 수정 가치 있음.
- **#3 (double-commit)** = 구체적 재현 가능 버그. 실 UX 결함.
- **#4 (fullscreen)** = 실제 pure-props 위반. 명시 예외로 문서화하거나 lift.
- **#5/#6 (FYI)** = 현재 무해(markup-only). 미래 R2b 가드 유지 권고.

## 처리 (fix-forward 후보 — 별 트랙)

머지/prod 코드 → 수정 = 각자 작은 fix-forward PR(implement→review→deploy). **S4a 와 무관.**
우선순위 = #3(실버그) ≈ #1/#2(계약 gap) > #4(impurity) > #5/#6(guard 유지). 사용자 결정 대기.
