---
id: study-note-module-apps-web
title: apps/web 모듈 지도
language: ko
load_when:
  - 프론트엔드
  - apps/web
  - main.ts
  - Vite
  - 렌더링
  - sidebar
summary: vite + TypeScript frontend. main.ts (Layer A~D 분해 후 4,448 line) + 4 HTML entry + sub-module (auth, pdf-workspace, subject-views, sidebar, sync, storage, app). React 19.2.6 dependency = admin/persona-turn entry 사용 중, main entry React migration = next phase.
---

# apps/web 모듈 지도

Vite 7 + TypeScript. 빌드 = `pnpm --filter @study-note/web build`. Vite multi-entry.

## 진입점 (4)

- `apps/web/index.html` → `apps/web/src/main.ts` — 메인 SPA. vanilla TS + morphdom 렌더. **4,448 line** (sprint-W22-sprint-22 기준, -59.74%).
- `apps/web/admin.html` → `apps/web/src/admin/admin.tsx` — 관리자 SPA (React). 사용자 관리 + 학기/과목 관리 + 운영 지표 panel (PR #84).
- `apps/web/persona-turn.html` → `apps/web/src/persona-turn/` — 디공이 turn UI (React).
- `apps/web/onboarding-mcp.html` → `apps/web/src/onboarding-mcp/` — MCP onboarding flow (React).

(React migration sprint-23+ 가 진행되면 main entry 도 React 화. audit = `.sfs-local/sprints/react-migration-audit.md`.)

## main.ts 분해 phase 결과 (Layer A~D 완료)

main.ts 11,049 → 4,448 line (-6,601 / -59.74%). 잔여 = render entry + dispatcher + ambient identity.

### Layer A (routing/shell)

- `apps/web/src/app/routes.ts` — Route 타입 + parseRoute + 13 route path helper.
- `apps/web/src/app/appShell.ts` — `RenderSink` (appRoot + postMountEffects) + `renderInto` (morphdom diff) + composeShell.
- `apps/web/src/app/escape-html.ts` — HTML escape SSoT.
- `apps/web/src/app/notebook-storage.ts` — localStorage userId-scoped notebook persistence (sprint-19).

### Layer B (PDF workspace, 14 slice — sprint-W22-sprint-1~8)

- `apps/web/src/pdf-workspace/annotation-sync.ts` — 디바운스 PUT + race guard + CAS revision + 5xx pause (sprint-1).
- `apps/web/src/pdf-workspace/canvas-mount.ts` — pdfjs-dist mount preservation (sprint-1).
- `apps/web/src/pdf-workspace/workspace-store.ts` — pdfWorkspaceStore lifecycle (sprint-1).
- `apps/web/src/pdf-workspace/class-date.ts`, `ink-stroke.ts`, `drill-highlight.ts`, `star-mark.ts` — 도구별 (sprint-2~3).
- `apps/web/src/pdf-workspace/chart-content.ts`, `markdown-table.ts`, `chart-widget.ts`, `table-widget.ts`, `simple-widget.ts` — content leaves (sprint-2~6).
- `apps/web/src/pdf-workspace/page-render.ts`, `renderPdfWorkspacePage.ts` — page render entry (sprint-7~8).

### Layer C (subject views, 10 slice — sprint-W22-sprint-9~18)

- `apps/web/src/subject-views/cards.ts` (subject-cards leaves, sprint-9).
- `apps/web/src/subject-views/sidebar.ts` — renderHomeSidebar + renderSubjectSidebar + renderSidebarTermGroups (sprint-10).
- `apps/web/src/subject-views/intake.ts` (sprint-11).
- `apps/web/src/subject-views/class.ts` (sprint-12).
- `apps/web/src/subject-views/summaries.ts` + safe-url shared (sprint-13).
- `apps/web/src/subject-views/memorize.ts` (sprint-14).
- `apps/web/src/subject-views/mcp.ts` (sprint-15).
- `apps/web/src/subject-views/week.ts` (sprint-16).
- `apps/web/src/pdf-library/...` (pdf-workspaces 화면, sprint-17).
- `apps/web/src/quick-note/...` (sprint-18, 🎯 5k 달성).

### Layer D (storage + identity + sync, 4 slice — sprint-W22-sprint-19~22)

- `apps/web/src/app/notebook-storage.ts` (notebook localStorage, sprint-19 — Layer A 와 같은 디렉토리이지만 별 slice).
- `apps/web/src/auth/sessionState.ts` — authBootState + revalidateStoredSession + retry timer + T1~T14 transition contract (sprint-20).
- `apps/web/src/auth/sessionBoot.ts` — readAuthSessionHint + writeAuthSessionHint (session_hint cookie + localStorage hint).
- `apps/web/src/sidebar/sidebar-cache.ts` — 3 cache (terms / subjects / openTermIds) + race guard (sprint-21).
- `apps/web/src/ui/ephemeral-state.ts` — hotkeyHelpModalOpen state primitive (sprint-21).
- `apps/web/src/sync/user-notes-sync.ts` — PUT chain + abort + paused gate + 4 cache (sprint-22, 🎯 Layer D 분해 완료 4,448).

### main.ts 잔여 (4,448 line)

- Imports (1~340).
- Module-level state: `notebook` (let), `pdfWorkspaceStore` (let), `authSession` (let), `authMode` (let), `loginFeedback`, `inspectorOpen`, `quickNote`, `intakeFeedback`, `pendingPdfRetry`, 6 drag states.
- `if (isBrowserRuntime) { ... }` block (L520~573): document-level listener 13개 + `queueMicrotask(() => { renderApp(); revalidate(); })` (TDZ hotfix fe-v0.1.26).
- `handleDocumentClick` / `Input` / `Submit` / `Change` / `Pointer*` / `KeyDown` / `Touch*` dispatcher.
- Module-bound state mutator (e.g., `addStarMark`, `applyChartMove`).
- `renderApp()` (L4075) + composeShell wiring per route.
- Module-level context / callbacks const (Layer B/C/D slice 와 wiring).

### TDZ 주의 (fe-v0.1.26 hotfix)

`mainRenderSink.postMountEffects` (L489) 가 `() => refreshTableWidgets()` / `refreshChartWidgets()` 포함. 이 fn 들은 module-level const (`tableWidgetContext` L3793, `chartWidgetContext` L3833, `starMarkContext` L3847) 참조. module init 시 renderApp() 동기 호출하면 TDZ throw. **`queueMicrotask(() => renderApp())`** 로 deferred — module init 끝난 후 fire.

## React migration (next phase, sprint-W22-sprint-23+)

- 첫 route = `subject-mcp` (Option B / component-first vertical slice).
- audit = `.sfs-local/sprints/react-migration-audit.md` (53 data-action + 13 listener + 9 ambient let 분포).
- 선택 옵션: A (render-first JSX 만) vs B (vertical slice + Context). brainstorm 에서 B + subject-mcp 권장.

## sub-module 의존

- `@study-note/domain` (packages/domain) — 모든 도메인 타입 + helper.
- `pdfjs-dist` — PDF 렌더링 (canvas, iOS Safari polyfill 포함).
- `morphdom` — 점멸 없는 DOM 패치 (sprint-12 fix 후 사용).
- `react` + `react-dom` 19.2.6 — admin/persona-turn entry 사용. main entry React migration = 다음 phase.
- `@datadog/browser-rum` + `@datadog/browser-logs` — RUM beacon.

## Tests

`apps/web/src/**/__tests__/` + `apps/web/src/**/*.spec.ts`:

| 영역 | 파일 |
|---|---|
| storage / migration | `__tests__/storage-namespacing.spec.ts` |
| pdf annotation | `__tests__/pdf-annotation-layer.spec.ts`, `clear-pdf-annotations.spec.ts` |
| widget | `__tests__/{eraser,textbox,checklist,table,chart}-tool.spec.ts` |
| inspector | `__tests__/inspector-{drill,open}.spec.ts` |
| Layer A | `app/__tests__/routes.spec.ts`, `app/__tests__/appShell.spec.ts` |
| Layer B | `pdf-workspace/__tests__/*.spec.ts` (14 slice 각 spec) |
| Layer C | `subject-views/__tests__/*.spec.ts` (10 slice 각 spec, 특히 `sidebar.spec.ts` 23 case) |
| Layer D | `auth/sessionState.spec.ts`, `sidebar/sidebar-cache.spec.ts`, `sync/user-notes-sync.spec.ts` |

실행: `node --experimental-strip-types --no-warnings --test <file>.spec.ts`.

## 갱신 의무

- main.ts 줄 수 / Layer 분해 단계 / React migration 진행 시 본 page 갱신.
- 새 sub-module 추가 시 Layer 별 표 갱신.
- 신규 HTML entry 추가 시 진입점 섹션 갱신.
- 새 도메인 타입 사용은 `@study-note/domain` 으로 끌어올리고 wiki 의 [modules/packages-domain](packages-domain.md) 도 갱신.
