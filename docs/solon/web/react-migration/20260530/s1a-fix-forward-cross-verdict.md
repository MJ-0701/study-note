# S1a fix-forward — Gemini cross verdict (PdfToolbarPortal 무한루프 fix)

> 2026-05-30. 대상 commit = `9f6656d` (branch `fix/s1a-toolbar-portal-loop`, off main).
> codex usage-limit (5/31 06:13 복구) → Gemini 2run cross (multi-adaptor 정책).
> capsule-only review (full transcript 미전달, Runtime Token Firewall).

## verdict = 2run 모두 NO BLOCKING FINDINGS → merge 게이트 PASS

| run | 결과 | 핵심 |
|:--|:--|:--|
| 1 | NO BLOCKING FINDINGS | #1 guard = global loop 의 load-bearing fix. #2 useShallow = #185/getSnapshot 요건 해소. lifecycle(null/element/replace) 정확. |
| 2 | NO BLOCKING FINDINGS | dual-loop 둘 다 load-bearing(#1 외부통지, #2 site-wide crash 직접원인). stale closure/portal target lifecycle 안전. shouldPreserveReactIsland 가 morphdom fight 차단 확인. |

## 4 pressure-test 답 (양 run 합치)
1. **guard 정확** — shouldPreserveReactIsland(appShell)로 노드 ref 보존 → 동일노드 통지 skip 정확. navigate-away=null, 노드 genuine 교체 시 ref 달라져 setState 정상 발화. stale-slot 오skip 없음.
2. **#1·#2 둘 다 load-bearing** — #1=외부 통지storm 차단. #2=useSyncExternalStore 가 selector 새객체 반환 시 store update 없이도 내부 루프 → home 포함 전 라우트 mount 라 site-wide crash 의 직접 원인. 어느 하나만으로는 불완전.
3. **잔여 루프/stale 위험 없음** — uiStore slot selector=primitive ref 안정. subjectId=prop dep, zustand hook 정상. createPortal target=signal 관리.
4. **transition 정확** — null→element(mount)/element→null(unmount)/element→element(remount) 전부 정확.

## non-blocking findings (backlog, 미적용 — 검증된 GREEN 보존)
- **Optional** `PdfToolbarPortal.tsx:23` — `!subjectId` default object literal 매번 새 할당. static `DEFAULT_WORKSPACE_STATE` const 가 더 idiomatic. (단 `!subjectId` 면 컴포넌트가 line 40 에서 null 반환 → 그 값 미사용 → 실효성 낮음.)
- **FYI** `main.ts:550` — `root.querySelector` 매 legacy 렌더 호출. 방지하는 재렌더 대비 무시 가능.

## 검증 evidence (cross 와 독립)
- prod-build(dist) playwright gate `apps/web/scripts/playwright-s1a-toolbar-loop.mjs`.
- **negative control**: fix 제거 + 재빌드 → home + pdf-workspace 양 라우트 **React #185 + #app 빈값**. fix 복원 → 양 라우트 **pageError 0 + #app non-empty(len 1176)**. → 게이트 민감도 입증.
- tsc --noEmit clean. island(8)+toolbar(13)=21 spec pass. `pnpm -r build` green.
- 교훈: unit(jsdom)+정적 cross 는 런타임 effect 루프 못 잡음(원 incident self-CPO+Gemini 2run PASS 했으나 누락) → **prod-build playwright 게이트가 진짜 merge 면**.

## merge/deploy 게이트 (doc §4/§5)
- ⚠️ deploy 태그 push 는 playwright GREEN + cross PASS 확인 후 **별도 단계** (게이트 검증과 같은 batch 금지 = 원 incident 직접 원인).
- 명령: main 머지 → `git tag fe-v0.1.73 <merge-commit>` → `git push origin fe-v0.1.73` (fe-release.yml) → `gh run watch` → prod 양 라우트 pageError 0 재검증.
- 회귀 시 롤백: `git tag fe-v0.1.74 fcb483e && git push origin fe-v0.1.74` (검증된 legacy).
- push/merge/deploy = user 터미널 (Solon §1.5, 세션-scoped 권한).
