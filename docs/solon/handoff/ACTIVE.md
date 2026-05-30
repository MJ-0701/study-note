# 🎯 ACTIVE — React 마이그레이션 S1a (toolbar React) 코드 완료 / merge = codex cross + operator QA 대기

> SessionStart hook 가 fresh session 마다 자동 inject. SFS 0.6.138.
> entry_working_dir = `/Users/mj/IdeaProjects/study-note` · entry_repo = `study-note`.

## 🚀 다음 세션 FIRST ACTION = S1a merge 게이트 처리 (둘 다 PASS 후 push+PR+merge)

branch `feature/react-migration-s1a` (커밋 e43a30e WU2a + 4bbde03 WU2b + 8213855 docs).
**미push** (push=user 터미널 Solon §1.5, merge=아래 2 게이트 후). origin/main = `b56fa48`.

1. **Gate 6 cross (@codex)** — codex usage-limit **5/31 06:13 복구** 후 `@codex review`.
   현재 self-CPO 만 통과(bridge down). visible UI slice → codex 정식 cross 가 merge 게이트.
2. **operator QA** (auth-gated route = 로컬 풀스택/iPad 필요, 자동화 불가):
   - 인증 로그인 → pdf-workspace 진입 → 툴바 **시각 diff 0** (React 툴바가 legacy 와
     동일 위치/스타일). screenshot before(main)/after(branch).
   - 툴 전환/페이지 이동/지우개 shape·size/fullscreen 동작 + active 표시 갱신.
   - 페이지 전환 canvas 보존(INV-2) + iPad 필기(INV-3, **Mac Safari 원격 인스펙트**,
     unit 대체 금지) + cross-device sync(INV-4) 1회.
   - ⚠ 시작 전 `git pull` + `pnpm -r build`(stale dist 함정).

## 직전 세션(2026-05-30, 이어서) 완료 — S1a toolbar React 전환

- 전 세션에서 **S0(React shell, PR #118) merged** 확인. 본 세션 = **S1a** (Gate 2 Q1 =
  **B toolbar-first**: canvas/ink/widget=legacy 유지, pen/pointer 코드 무변경).
- **WU1 characterization** (`docs/solon/web/react-migration/20260530/s1a-wu1-characterization.md`):
  INV-2/3 structural spec baseline(38/38) + **toolbar behavioral contract §2b**(모든
  toolbar action=helper+renderApp / fullscreen=document.fullscreenElement 파생,flag 부재).
- **WU2a** (e43a30e) **React island 패턴** — legacy morphdom shell 안 React 부분 전환의
  재사용 machinery: `shouldPreserveReactIsland`(appShell) + `#pdf-toolbar-island` 슬롯
  (id=morphdom pairing) + uiStore.pdfToolbarSlot signal + `<PdfToolbarPortal>`. 8 case spec
  (morphdom round-trip 자식 생존 + 대조군 wipe). **S2~S4 재사용 자산.**
- **WU2b** (4bbde03) — registry.pdfToolbar action 7종(=legacy 분기 1:1, helper+renderApp) +
  `<PdfToolbar>`(createElement, renderPdfToolbar/eraser subtoolbar/HOTKEY_LABELS 1:1 fidelity
  확인) + portal 실배선(pdfWorkspaceStore 구독→props) + legacy renderPdfToolbar 호출 제거 +
  13 case spec. **R2b**: data-action 미emit → 이중처리 0.
- 검증: tsc clean / node:test **346 pass**(toolbar13+island8+전 pdf-workspace/app, 신규
  실패0) / vite build green / **INV-3 pointer·ink diff 0**. (baseline 3 fail=무관 strip-types quirk.)
- Gate 6 acceptance ledger = `docs/solon/web/react-migration/20260530/s1a-done.md`.

## 🔑 이번 세션 핵심 교훈
- **behavioral contract > HTML contract**: page-render.spec 는 HTML 문자열만 검증. 클릭 시
  무엇이 일어나는지(helper+renderApp)는 코드 실독 필수였음. advisor 가 이 gap 지적 → 6 분기
  본체 실독 후에야 registry action 정확 설계 가능. **마이그레이션 = 동작 계약 캡처 먼저.**
- **flag 부재 발견**: isPdfWorkspaceFullscreen 은 모듈 flag 아니라 document.fullscreenElement
  파생 → uiStore lift 불필요, fullscreenchange 구독. reader 전수가 설계 단순화시킴.
- **고위험 slice = WU2a/WU2b 분리**(advisor). 신규 machinery(island)를 placeholder 로 먼저
  검증 → 로직(toolbar)과 분리. 각 독립 게이트.
- auth-gated route 는 익명 preview 로 검증 불가 → structural spec + operator QA 2단.

## 정책 ambient (SFS 0.6.138, 자세히 CLAUDE.md)
- 구현 = Sonnet worker(WU2a/2b 둘 다 generator). main(Opus)=plan/아키텍처/review/INV 판단.
- commit=branch, push=명시 승인(user 터미널). 머지 전 self-CPO(+codex 복구 후).

## 다음 (S1a merge 후)
- **S1b** = pdf-workspace widgets(chart/table/sticky/star/eraser/ink) 컴포넌트화. 이때
  canvas+native pointer React 직결(roadmap §3.3)+위임 범위축소 본격. **pen second-stroke
  버그(REOPENED, [[project-ipad-pen-second-stroke]])와 충돌 주의.**
- **S1c** = annotation sync reducer + R2 CAS(INV-4). 이후 S2(auth)→S3(home/sidebar)→S4→S5.

## 잔여 / 주의
- 작업트리에 세션-시작 SFS sync mods 보존 가능 — SFS runtime 관리분, 손대지 말 것.
- `apps/web/.claude/agent-memory/` = worker 아티팩트(untracked, harmless).
- sprint = `2026-W22-sprint-23`. brainstorm/plan/log = `.sfs-local/sprints/2026-W22-sprint-23/`.
