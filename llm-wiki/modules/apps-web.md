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
summary: vite + TypeScript frontend. main.ts 단일 파일 중심 + sub-page 진입점 (admin, onboarding, persona-turn).
---

# apps/web 모듈 지도

Vite + TypeScript. 빌드 = `pnpm --filter @study-note/web build`.

## 진입점

- `apps/web/src/main.ts` — 메인 SPA. notebook / pdfWorkspace / auth / sync / render 다 포함. **6000줄 이상의 거대 파일** — 의도된 단일 모듈 (sprint-1 정책).
- `apps/web/src/admin/` — admin 페이지 (관리자 surface).
- `apps/web/src/onboarding/` — onboarding flow.
- `apps/web/src/persona-turn/` — 디공이 multi-turn (pre-pivot, 유지).
- `apps/web/src/styles.css` — 전역 스타일.
- `apps/web/src/api/` — API client helper.
- `apps/web/src/data/` — fixture / sample 데이터.

## main.ts 의 region 지도

라인 범위는 변경 가능 — `grep` 으로 검증. 주요 영역:

| 영역 | 대략 라인 | 키워드 |
|---|---|---|
| Import | 1~120 | `import` |
| 상수 + storage key | 170~220 | `notebookStorageKey`, `pdfWorkspaceStorageKey`, `lastSessionUserStorageKey` |
| Module-level state | 200~260 | `notebook`, `pdfWorkspaceStore`, `authSession`, `lastSessionUserId` |
| Inspector / drill state | 215~260 | `inspectorDrillStorageKey`, `inspectorOpen` |
| Notebook load/save + migration | 660~810 | `buildNotebookKey`, `loadStoredNotebook`, `migrateLegacyNotebookForUser`, `saveNotebook` |
| Sync helper (debounce / abort / chain / failure tracker) | 820~1000 | `userNotesPutTimers`, `userNotesPutAborts`, `userNotesPutChains`, `syncFailureTracker` |
| PDF preview / fetch | 1100~1400 | `loadPdfPreviewFromBackend`, `fetchAnnotationIfMissing` |
| `updatePdfWorkspaceStoreFromServer` (hydrate) | 1354~1410 | hydrate 분기 + PUT 발사 차단 |
| `applySessionTransitionForUser` | 1465~1530 | sprint-3/S2+S3 변경 |
| `clearAuthSession` | 1532~1600 | transient 실패에도 호출 |
| Boot / auth revalidate | 1650~1750 | `attemptSessionRevalidation`, `applySessionTransitionForUser` 호출 |
| `loadPdfWorkspaceStore` + `savePdfWorkspaceStore` + migration | 1810~1985 | sprint-3/S2 |
| `updatePdfWorkspace` | 1990~2050 | annotation mutator, PUT 차단 가드 |
| Render entry | renderApp 시작 — grep 으로 위치 |
| Event handler / UI dispatch | 3000~5000+ | `handleDocumentSubmit`, click handlers |

(정확한 라인은 main.ts 가 자주 바뀌므로 [retrieval-guide](../retrieval-guide.md) 참고하여 grep 으로 보강.)

## sub-module 의존

- `@study-note/domain` (packages/domain) — 모든 도메인 타입 + helper.
- `pdfjs-dist` — PDF 렌더링.
- `morphdom` — 점멸 없는 DOM 패치 (sprint-12 fix 후 사용).

## Tests

`apps/web/src/__tests__/`:

| 파일 | 영역 |
|---|---|
| `storage-namespacing.spec.ts` | sprint-3/S1+S2 — buildNotebookKey/buildPdfWorkspaceKey + migration owner gate |
| `pdf-material-library.spec.ts` | material library |
| `pdf-annotation-layer.spec.ts` | annotation 렌더 |
| `clear-pdf-annotations.spec.ts` | annotation clear |
| `eraser-tool.spec.ts`, `textbox-tool.spec.ts`, `checklist-tool.spec.ts`, `table-tool.spec.ts`, `chart-tool.spec.ts` | 각 도구 |
| `inspector-drill.spec.ts`, `inspector-open.spec.ts` | inspector UX |

실행: `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/<file>.spec.ts`

## 갱신 의무

- main.ts 의 region 라인 범위가 크게 바뀌면 이 wiki page 의 표 갱신.
- 새 sub-page 추가 시 진입점 섹션 갱신.
- 새 도메인 타입 사용은 `@study-note/domain` 으로 끌어올리고 wiki 의 [modules/packages-domain](packages-domain.md) 도 갱신.
