# 🚨 S1a — PROD INCIDENT + 복구 완료 (2026-05-30)

## TL;DR
S1a React 툴바 배포가 **prod 전체 화이트스크린**(React #185, 무한 렌더 루프)을 냈고,
**git 태그 롤백으로 복구 완료**. prod 정상. S1a 코드는 main 에 머지된 상태(버그 포함) →
**fix-forward 는 다음 세션**. iPad 와 무관한 PC/전체 라우트 크래시였음.

## 타임라인
1. S1a PR #129 squash merge → main (b449b7f).
2. PC playwright(`smoke:auth-boot-playwright`) 실행 → **FAIL**. 동시 batch 로 deploy 태그
   fe-v0.1.70(=41371bd) push → fe-release 즉시 success → **버그 빌드 prod 배포**.
   (사고 직접 원인: 게이트 검증과 deploy 를 같은 batch 에 넣음.)
3. playwright FAIL = flake 아님 확인(재실행+debug). root cause = PdfToolbarPortal 무한 루프.
4. prod 확인: `/#/` + pdf-workspace 둘 다 `#app` empty + React #185. 번들 main-ekiB6toY.js.
5. **롤백**: `fe-v0.1.72` → `fcb483e`(= fe-v0.1.69 last-good, legacy 툴바) push →
   fe-release run **success**.
6. **복구 확인** (browser playwright, cache-bust):
   - `/#/` → app_empty=false, login_screen=1, **pageErrors=0** ✅
   - `/#/subjects/.../pdf-workspace` → app_empty=false, login_screen=1, **pageErrors=0** ✅
   - prod 번들 = `main-B0yn3PSC.js` (버그 main-ekiB6toY.js 아님). **prod 정상.**

## 버그 (확인됨, fix-forward 대상)
`apps/web/src/app/react-shell/PdfToolbarPortal.tsx` 무한 렌더 루프:
- 증상: `Maximum update depth exceeded` / `getSnapshot should be cached to avoid an infinite
  loop` / minified `React error #185`.
- PdfToolbarPortal 은 React shell 최상위에 항상 mount(slot 없으면 null 반환) → 루프가
  **모든 라우트**(home 포함) 크래시. pdf-workspace 한정 아님.
- root cause: main.ts postMountEffects 가 **매 renderApp 마다**
  `setPdfToolbarSlot(root.querySelector('[data-react-island="pdf-toolbar"]'))` 호출.
  morphdom preserve 로 DOM 노드 ref 는 동일하나 `uiStore.setState({pdfToolbarSlot: el})`
  가 매번 새 통지 → PdfToolbarPortal 재렌더 → useSyncExternalStore snapshot 불일치 →
  forceStoreRerender → Maximum update depth.

### Fix 방향 (검증 전, next session)
1. **main.ts slot signal 값-동일성 guard** (핵심):
   ```ts
   const el = root.querySelector<HTMLElement>('[data-react-island="pdf-toolbar"]');
   if (getPdfToolbarSlot() !== el) setPdfToolbarSlot(el);  // 같은 노드면 setState skip
   ```
2. PdfToolbarPortal selector 안정성 재검토 (slot + workspaceState 결합 루프 가능성).
3. **검증 = prod build(vite build) 기반** playwright (dev-server vite dep-optimize reload
   flake 회피) + 실제 prod 배포 후 라우트 무crash 확인.

## 현재 상태
- **prod = 정상** (fe-v0.1.72 → fcb483e, legacy 툴바). S1a React 툴바는 prod 에서 롤백됨.
- **main = b449b7f** (S1a 머지 + docs, **버그 포함**). fix 는 main 위 새 브랜치.
- 로컬 임시 debug 스크립트 정리 완료.

## 교훈 (재발 방지)
- **visible React slice = prod-build playwright GREEN 후에만 deploy 태그 push.** unit(jsdom
  단발 render) + 정적 cross(self-CPO/Gemini)는 런타임 effect 루프 못 잡음 — self-CPO +
  Gemini 2run 모두 PASS 했으나 이 루프 누락.
- **deploy 태그와 게이트 검증을 같은 batch 에 넣지 말 것** (이번 사고 직접 원인).
- **Gemini cross focus #4(renderApp→postMount→setState 재진입)를 "non-blocker" dismiss 한 것이
  실제 root cause.** cross 의 re-entrancy 경고는 런타임 재현으로 검증할 것.
- dev-server playwright 의 vite dep-optimize reload 는 1회 flake 가능하나 **재실행도 FAIL
  이면 real** — flake 단정 금지.
- irreversible 인프라 op = 결과 검증 가능할 때만. (이번엔 deterministic nonce echo +
  browser playwright 로 복구 검증함.)

## 세션 채널 노이즈
세션 후반 일부 tool-result 가 이전 결과 cache replay / garble. **deterministic 명령(nonce
echo, git ls-remote, curl cache-bust, browser playwright)으로 교차검증**한 결론만 신뢰.
fresh session 권장.

## fresh session FIRST ACTION
1. prod 정상 재확인: `curl -s https://study-note.910701.xyz/ | grep main-` ≠ main-ekiB6toY.js.
2. **PdfToolbarPortal fix-forward** (위 Fix 방향) → prod-build playwright 검증 → 새 fe 태그 배포.
3. 관련 docs: 본 파일 + s1a-gemini-cross-verdict.md + s1a-deploy-handoff.md.
