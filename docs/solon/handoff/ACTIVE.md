# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject.

## 진행 상황 (2026-05-26) — **9k + 8k + 7k 달성**

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 | ✅ merged (PR #58) |
| **B/slice-2a. canvas mount** | 2026-W22-sprint-1 | ✅ merged (PR #59) |
| **B/slice-2b. classDate** | 2026-W22-sprint-2 | ✅ merged (PR #60) |
| **B/slice-2c. ink stroke** | 2026-W22-sprint-3 | ✅ merged (PR #61) |
| **B/slice-2d. drill highlight** | 2026-W22-sprint-2 | ✅ merged (PR #62) |
| **B/slice-2e. star mark** | 2026-W22-sprint-3 | ✅ merged (PR #63) |
| **B/slice-2f/i. chart-content** | 2026-W22-sprint-4 | ✅ merged (PR #64) |
| **B/slice-2f/ii. markdown-table** | 2026-W22-sprint-2 | ✅ merged (PR #65) |
| **B/slice-2g. chart-widget** | 2026-W22-sprint-3 | ✅ merged (PR #66) — **8k 달성** |
| **B/slice-2g-table. table-widget** | 2026-W22-sprint-5 | ✅ merged (PR #67) |
| **B/slice-2f/iii. simple-widget** | 2026-W22-sprint-6 | ✅ merged (PR #68) |
| **B/slice-2f/iv. page-render helper** | 2026-W22-sprint-7 | ✅ merged (PR #69, main=942d81a) — **7k 달성** |
| **B/slice-2f/iv-bis. renderPdfWorkspacePage** | TBD | ⏳ 후보 (마지막 big container, heavy Context) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 |

main.ts: 11,049 → **6,909** (-4,140, **-37.47%**). **9k + 8k + 7k 3 target
달성**. 6k 호기심 = 잔여 -909, slice-2f/iv-bis (~200 estimate) + layer C
초기 정리 시 가능.

## 활성 작업 = layer B/slice-2f/iv-bis (renderPdfWorkspacePage) **또는** layer C 진입

**전 sprint retro** = `docs/solon/document/pdf/main-ts-layer-b-slice-2f-iv-container-page-renderpdfworkspacepage-7k/20260526/retro.md`

### 후보 1: slice-2f/iv-bis — renderPdfWorkspacePage extraction

- scope = renderPdfWorkspacePage 본체 (204 line) + heavy Context (25+ module
  state getter — pdfWorkspaceStore + getActivePdfObjectUrl +
  hasActivePdfPreviewLoad + getSubjectPdfMaterials + canManagePdfMaterials +
  isPdfWorkspaceFullscreen + 다수 widget render callback).
- AC9(e) permission denylist 동반 verification (waiver lineage closure).
- 위험도 = 중-높음 (heavy Context 설계 + spec 재구성).

### 후보 2: layer C 진입 (subject views)

- main.ts 6,909 line 의 잔존 = 비-PDF 영역 (subject/admin/auth/route
  dispatch). 분해 효과 큰 영역 식별 후 진입.
- 7k 보존 + layer B 의 잔여 정리 후 자연스러운 단계.

### slice-2f/iv 학습

- **R-U 신규** — review capsule 의 untracked file 자동 inclusion 제안.
- **R-V 신규** — Gate 6 self/cross 순서 자동 재실행 (R-L lineage).
- scope adjustment user-approval pattern — heavy coupling 발견 시 capture
  + waiver + plan revision.

### slice-2f/iv 결과 (참고)

- main.ts -197 line (7,107 → 6,910). page-render.ts 239 line / 9 export +
  spec 13 case (5 invariant 1:1). chart-widget 패턴 직접 적용.
- AC9 4-layer (a/b/c/d) closure + (e) permission boundary deferred (waiver
  with renderPdfWorkspacePage).
- Gate 3 = 5 round / Gate 6 = 8+5 round. @codex 👍 :tada:.

## SFS 0.6.121 정책 ambient

- Division sub-agent council always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh)
- Executable Action Ownership
- Review autopilot rework loop
- Session Continuation Guard ambient
- 자세히 = `CLAUDE.md`
