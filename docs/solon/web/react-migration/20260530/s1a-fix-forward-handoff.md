# S1a fix-forward 핸드오프 — PdfToolbarPortal 무한 렌더 루프 수정

> 작성 2026-05-30. 다음 세션 전용. prod 는 이미 롤백 복구됨(legacy 툴바). 이 문서 =
> S1a React 툴바를 무한루프 fix 후 prod 재투입하는 절차.
> 전체 사고 경위 = `s1a-prod-incident.md` (같은 폴더). 본 문서 = 실행 가능한 fix 지침.

## 0. 시작 전 상태 (불변)
- **prod = 정상** (fe-v0.1.72 → fcb483e, legacy 툴바). 건들지 말 것.
- **main = `24e30b5`** (origin synced). S1a React 툴바 머지됨 + **버그 코드 포함**.
- 버그 파일: `apps/web/src/app/react-shell/PdfToolbarPortal.tsx` + `apps/web/src/main.ts` (slot signal).
- fix 는 main 위 새 브랜치에서.

## 1. 버그 (확정)
prod/dev 양쪽 화이트스크린. 증상:
- `Maximum update depth exceeded` / `getSnapshot should be cached to avoid an infinite loop`
  / minified `React error #185`.
- PdfToolbarPortal 은 React shell 최상위에 항상 mount (slot 없으면 null) → 루프가
  **모든 라우트(home `/#/` 포함)** 크래시. pdf-workspace 한정 아님.

### root cause
`apps/web/src/main.ts` postMountEffects (line ~547-549):
```ts
(root) => {
  setPdfToolbarSlot(root.querySelector<HTMLElement>('[data-react-island="pdf-toolbar"]'));
}
```
- postMountEffects 는 **매 renderApp() 마다** 실행됨 (renderApp = main.ts 의 morphdom 렌더 루프, 코드 전역 100+ 호출처).
- morphdom preserve 로 DOM 노드 ref 는 동일하지만 `uiStore.setState({pdfToolbarSlot: el})`
  가 매번 새 통지 발생.
- `PdfToolbarPortal` 의 `useStore(uiStore, s=>s.pdfToolbarSlot)` 가 매 통지에 재렌더 →
  렌더 중 store 통지 연쇄 → useSyncExternalStore snapshot 불일치 → forceStoreRerender →
  Maximum update depth.

## 2. fix 방향 (핵심 = #1, 검증 필수)
### #1 — main.ts slot signal 값-동일성 guard (근본)
같은 DOM 노드면 setState 자체를 skip → 매-renderApp 통지 차단.
`uiStore.ts` 에 `getPdfToolbarSlot` 이미 export 됨 (line 30). main.ts effect 수정:
```ts
(root) => {
  const el = root.querySelector<HTMLElement>('[data-react-island="pdf-toolbar"]');
  if (getPdfToolbarSlot() !== el) {
    setPdfToolbarSlot(el);
  }
}
```
+ main.ts import 에 `getPdfToolbarSlot` 추가 (line 363, 현재 `setPdfToolbarSlot` 만 import).

### #2 — PdfToolbarPortal selector 안정성 재검토 (보강)
- `useStore(uiStore, s=>s.pdfToolbarSlot)` = primitive ref selector, 안정적 (문제 아님).
- `useStore(pdfWorkspaceStateStore, useShallow(...))` = 이미 useShallow 적용 (line 25).
- **#1 으로 충분할 가능성 높음.** #1 적용 후 재현 안 되면 #2 불요. 그래도 effect 루프
  재발 방지 위해 PdfToolbarPortal 에 별도 setState 유발 경로 없는지 확인.

## 3. 검증 (이번 사고의 핵심 교훈 — 반드시)
unit(jsdom) + 정적 cross 는 런타임 effect 루프 **못 잡음** (self-CPO + Gemini 2run PASS
했으나 누락). **prod-build 기반 playwright 필수**:

```bash
cd /Users/mj/IdeaProjects/study-note
pnpm -r build                              # stale dist 함정 회피 (필수)
# prod build 산출물(apps/web/dist) 대상 정적 서빙 + playwright. dev server(vite) 는
# dep-optimize reload flake 있으니 가급적 preview 사용:
pnpm --filter @study-note/web preview      # vite preview, dist 서빙 (127.0.0.1)
# 별도 터미널/스크립트에서 preview URL 의 /#/ + /#/subjects/.../pdf-workspace 를
# headless chromium 으로 열어 pageError 0 + #app non-empty 확인.
```
검증 스크립트 패턴 (사고 때 쓴 것, 재사용 — repo 내부에 둬야 node_modules resolve 됨):
- `apps/web/scripts/` 아래 임시 .mjs 작성: chromium launch →
  `executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` →
  goto 양 라우트 → `page.on("pageerror")` 수집 → `#app` innerHTML empty 여부 확인.
- 기존 `scripts/playwright-auth-boot.mjs` 는 **dev server(vite) 기반** 이라 dep-optimize
  reload flake 가능 — fix 검증엔 preview(dist) 기반 권장. (단 auth-boot 자체는 CI 게이트라
  유지.)
- 통과 기준: 양 라우트 pageErrors=0, `#app` non-empty, login_screen 보임.

## 4. 배포 (검증 GREEN 후에만)
- ⚠️ **deploy 태그 push 는 playwright GREEN 확인 후 별도 단계로.** 게이트 검증과 같은
  batch 금지 (이번 사고 직접 원인).
- fix 커밋 → (self-review + 가능시 Gemini/codex cross) → main 머지 → 새 fe 태그:
```bash
git tag -l 'fe-v*' | sort -V | tail -1     # 최신 확인 (현재 fe-v0.1.72)
git tag fe-v0.1.73 <fix-merge-commit>
git push origin fe-v0.1.73                  # fe-release.yml 트리거
gh run watch                                # 배포 완료 대기
# 배포 후 prod 재검증 (cache-bust):
curl -s "https://study-note.910701.xyz/?cb=$(date +%s)" | grep -oE 'main-[A-Za-z0-9_]+\.js'
# + browser playwright 로 prod 양 라우트 pageErrors=0 확인.
```
- 회귀 시 즉시 롤백: `git tag fe-v0.1.74 fcb483e && git push origin fe-v0.1.74`
  (fcb483e = 검증된 마지막 정상 legacy).

## 5. 권한 메모
- push/PR/merge/deploy 태그 = user 가 이전 세션에서 직접 권한 부여했으나 **session-scoped**.
  새 세션 = 리셋 → fresh session 에서 재확인 후 진행.

## 6. 관련 파일
- 버그: `apps/web/src/app/react-shell/PdfToolbarPortal.tsx`, `apps/web/src/main.ts` (line 363 import, 547-549 effect).
- store: `apps/web/src/stores/uiStore.ts` (getPdfToolbarSlot/setPdfToolbarSlot).
- island preserve: `apps/web/src/app/appShell.ts` (shouldPreserveReactIsland, 정상).
- docs: `s1a-prod-incident.md`(사고전말) / `s1a-gemini-cross-verdict.md`(cross, focus#4 dismiss 오판) /
  `s1a-done.md`(원 acceptance) / `s1a-deploy-handoff.md`(구 배포절차) / 본 파일.
