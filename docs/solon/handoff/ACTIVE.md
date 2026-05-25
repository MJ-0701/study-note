# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. layer 진행
> 시 매 sprint close 후 다음 sprint handoff 로 갱신.

## 진행 상황 (2026-05-25)

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57, main=25f3cb9) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 (prev) | ✅ merged (PR #58, main=2fd4a0d) |
| **B/slice-2a. canvas mount + workspace state** | 2026-W22-sprint-1 (this) | ✅ merged (PR #59, main=c84439e) |
| **B/slice-2b. classDate + touch/swipe + nav** | TBD | ⏳ 다음 sprint (위험도 중-낮음) |
| B/slice-2c. ink stroke + pen RAF batch | TBD | ⏳ backlog (위험도 매우 높음, 단독 sprint 필수) |
| B/slice-2d. drill highlight | TBD | ⏳ backlog (위험도 중) |
| B/slice-2e. star mark + renderer | TBD | ⏳ backlog (위험도 중-높음, renderer ~1200 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → 9,954 (-1,095, -9.91%). 9k target (layer A~D 누적)
까지 -954 line 더 필요.

## 활성 작업 = layer B/slice-2b sprint (classDate + touch/swipe + nav/fullscreen)

**전 sprint retro** = `docs/solon/document/pdf/main-ts-layer-b-slice-2a-pdf-canvas-mount-workspace-state/20260525/retro.md`

**slice-2b 후보 함수** (~500 line 추정):
- `assignPdfMaterialClassDate`, `normalizePdfMaterialClassDateValue`,
  `patchPdfWorkspaceMaterial`, `replacePdfWorkspaceMaterial`,
  `createClassDateWeekId` (~200 line)
- `handleDocumentTouchEnd/Start/Move`, `commitPdfSwipeGesture`,
  `handleDocumentChange` (~200 line)
- `togglePdfFullscreen`, `getActivePdfWorkspaceSubjectId`, `movePdfPage`,
  `setPdfPage`, `setPdfTool` (~100 line)

**invariant 1종**: touch event multi-touch + swipe gesture threshold + iOS
Safari `event.preventDefault()` timing. mobile QA 부담.

**다음 명령**:
```bash
sfs status                  # 빈 sprint 확인
sfs start "main.ts layer B/slice-2b — classDate + touch/swipe + nav/fullscreen 분리"
sfs brainstorm "..."        # Q1 = touch handler ctx 격리 단위
sfs plan → review --gate 3 self → cross → implement → Gate 6 self → cross → PR → @codex → merge → retro
```

**위험도 매우 높음** (slice-2c, 단독 sprint): 좌표 0~1 ratio + RAF batch +
getCoalescedEvents + morphdom canvas preservation + pdfjs polyfill saga =
5 fragile invariant.

## Layer B/slice-2a 결과 (참고)

- main.ts -299 line (10,253 → 9,954).
- canvas-mount.ts (286 line) + workspace-store.ts (386 line) 신규.
- characterization spec 35 case new + annotation-sync 20 case 회귀 0.
- Waiver 3건: `bl-pdf-blob-url-scheme-allowlist` + `bl-pdf-rum-error-scrubbing` + `bl-fe-spec-fix-pre-existing`.
- Gate 3/6 self+cross PASS, @codex bot PASS.
- 패턴 = layer A/B-slice-1 의 Context + Callbacks + module-private state + characterization spec + domain helper ctx 주입 (annotation-sync 일치).

## SFS 0.6.119 정책 ambient (CLAUDE.md 참조)

- Division sub-agent council (strategy-pm/dev/QA/design/infra/taxonomy) always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh from probe banner)
- Handoff-only stop contract (interrupt active loops)
- Executable Action Ownership (auth+runtime+approval 있으면 직접 실행)
- Monitor checkpoint classification (long-running watch 의무)
- Review autopilot rework loop (deterministic finding 직접 patch + rerun)
- Findings label = Critical/Required/Important/Optional/FYI
- Session Continuation Guard ambient (autopilot fresh-session transfer)
- 자세히 = `CLAUDE.md` 의 "SFS 0.6.114 → 0.6.117 추가 정책" 섹션 + CHANGELOG 0.6.118 + 0.6.119
