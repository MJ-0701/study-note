---
handoff_type: "claude-fresh-session"
created_at: "2026-05-24T03:30:00+09:00"
source_session: "Claude (sprint-W21-sprint-1 close)"
target_session: "Claude (fresh, main.ts DDD split sprint)"
topic: "apps/web/src/main.ts DDD 분해 — feature boundary 단위 이동"
status: "auth boundary done (Codex, 2026-05-23). 후속 분해 미착수. sprint-1 feature 머지로 main.ts 11049 line 로 증가 → 우선순위 상승."
predecessor_handoff: "docs/solon/handoff/20260523-auth-boot-main-ddd-handoff.md"
---

# main.ts DDD 분해 인계 (fresh session)

## 0. 컨텍스트 회복

이 인계는 `20260523-auth-boot-main-ddd-handoff.md` 의 §5~§6 (남은 본 작업)
을 직접 잇는다. 본 문서가 후속이고, 앞 문서가 baseline 다.

전제:
- Codex 가 auth boundary 만 분리 완료 (`apps/web/src/auth/*`).
- 본 작업은 **routing/shell → PDF workspace → subject views → state/sync**
  순서로 main.ts 를 더 분해하는 sprint.
- 직전 sprint-W21-sprint-1 은 Term/Subject 기능 sprint 였고 (10 PR merged),
  main.ts 가 ~8000 → **11049 line** 으로 증가. 분해 부담 더 커짐.

## 1. 현재 main.ts 상태

```
$ wc -l apps/web/src/main.ts
   11049 apps/web/src/main.ts

$ grep -c "^function\|^async function\|^export function" apps/web/src/main.ts
   332
```

이미 분리된 모듈 (재진입 금지, 더 키우지 말 것):

| 폴더 | 책임 | 기존 모듈 |
|---|---|---|
| `apps/web/src/auth/` | session boot, /v1/auth/me, sign-in/up/out, login/signup view | sessionBoot.ts, authApi.ts, authViews.ts, authSession.ts |
| `apps/web/src/sidebar/` | term grouping pure | term-grouping.ts |
| `apps/web/src/pdf-workspace/` | ESC action pure | esc-action.ts |
| `apps/web/src/pdf/` | PDF canvas viewer (pdf.js) | pdf-canvas-viewer.ts |
| `apps/web/src/admin/` | admin panel (Terms/Subjects CRUD) | terms-panel.tsx |
| `apps/web/src/api/` | fetch wrapper | materials.ts, terms.ts |
| `apps/web/src/observability/` | Datadog RUM init | datadogRum.ts |
| `apps/web/src/onboarding/`, `data/`, `persona-turn/` | 기타 feature | (참고만) |

이 폴더들의 책임은 main.ts 에서 import 만 하고, 로직을 main.ts 로 복사하지
말 것. main.ts 안에 같은 역할 헬퍼가 남아 있으면 그 헬퍼를 위 모듈로 이동.

## 2. main.ts 남은 책임 (분해 대상)

### A. Routing / Shell (1순위 — pure-first)

- `Route`, `parseRoute(href)`, route → title, route → renderer dispatch
- 후보 이동:
  - `apps/web/src/app/routes.ts` — pure route parsing/serialize
  - `apps/web/src/app/appShell.ts` 또는 `renderApp.ts` — top-level renderApp + route dispatch
- 위험도: 낮음 (pure helpers 먼저). PDF/subject route 가 많으니 parsing 부터 떼고
  renderer dispatch 는 그 다음 commit.

### B. PDF workspace feature (2순위 — 충돌 표면 가장 큼)

- annotation render, ink stroke render, drill highlight, drag handlers, resize,
  pen pointer handler (handleDocumentPointerMove 등), starMark widget render,
  PDF nav, page button, fullscreen toggle, classDate dropdown
- 후보 이동:
  - `apps/web/src/pdf-workspace/annotation-render.ts`
  - `apps/web/src/pdf-workspace/ink-stroke.ts`
  - `apps/web/src/pdf-workspace/drill-highlight.ts`
  - `apps/web/src/pdf-workspace/drag-handlers.ts`
  - `apps/web/src/pdf-workspace/star-mark.ts`
  - `apps/web/src/pdf-workspace/pdf-nav.ts`
- 위험도: 높음. 좌표계 (0~1 ratio), pen latency RAF batch, getCoalescedEvents,
  reattachLiveInkPolyline 등 sprint-W21-sprint-1 S4/S6 로직 다수. 이동만 하는
  commit 부터 차근차근.

### C. Subject / Notebook views (3순위)

- `renderSubjectSidebar`, `renderClassPage`, summaries, memorize, MCP panel,
  textbox/checklist/table/chart tool render, eraser widget
- 후보 이동:
  - `apps/web/src/subject/sidebar-render.ts`
  - `apps/web/src/subject/class-page.tsx`
  - `apps/web/src/subject/widgets/{textbox,checklist,table,chart,eraser}.ts`
- 위험도: 중. domain 패키지의 `SubjectNote`, `WeekNote` 와 가까운 pure helpers
  부터 추출 (storage-namespacing.ts, classdate-format.spec.ts 와 정렬).

### D. State transition / sync (4순위 — blast radius 큼)

- `applySessionTransitionForUser`, `clearAuthSession` (auth 잔여 후크),
  `scheduleAnnotationPut`, `putAnnotationToBE`, `fetchAnnotationsForSubject`,
  `fetchAnnotationIfMissing`, `handleAnnotationStaleResponse`,
  `updatePdfWorkspaceStoreFromServer`, `scheduleUserNotePut`,
  `fetchUserNoteIfMissing`, sync metric helpers (`recordSyncFailure`,
  `recordSyncSuccess`, `recordFetchFailure`, `recordFetchSuccess`)
- 후보 이동:
  - `apps/web/src/sync/annotation-sync.ts`
  - `apps/web/src/sync/note-sync.ts`
  - `apps/web/src/sync/sync-metrics.ts`
  - `apps/web/src/session/session-transition.ts`
- 위험도: 매우 높음. revision/CAS, 1970 epoch sentinel, R2 batch 등 sprint-2/
  W21-sprint-2 invariant 다수. routing/PDF 분리 후 마지막에.

## 3. 작업 규칙 (재확인)

기존 `20260523-auth-boot-main-ddd-handoff.md` §6 의 원칙 그대로:

1. **이동만 하는 commit 과 behavior 변경 commit 분리.** 같은 PR 안에서도
   파일 이동 commit 1 + 후속 cleanup commit 1 로 쪼개기.
2. **DOM 없는 pure function / state transition 먼저** 새 모듈로. DOM renderer
   는 import 사이트 정리 후.
3. **기존 smoke 깨지 말 것**:
   - `pnpm --filter @study-note/web build`
   - 모든 `apps/web/src/__tests__/*.spec.ts` PASS
   - `pnpm smoke:auth-boot-playwright`
4. **auth boot UX = public contract**:
   - first-time visitor = login/signup immediately
   - returning visitor = session-check allowed
   - stale session = login fallback + hint clear
5. **sprint-W21-sprint-1 의 새 boundary 유지**:
   - `apps/web/src/auth/*`, `apps/web/src/sidebar/term-grouping.ts`,
     `apps/web/src/pdf-workspace/esc-action.ts`, `apps/web/src/admin/terms-panel.tsx`,
     `apps/web/src/api/terms.ts` — 모두 import-only 로 main.ts 에서 참조.
     역기능 (다시 main.ts 로 끌어오기) 금지.
6. **sprint 단위**: A → B → C → D 를 1 sprint 1 layer 권장. 한 sprint 에
   2 layer 섞으면 PR review 부담 폭증.

## 4. 시작 sprint 권장 scope

**sprint name 안**: `2026-W21-sprint-2-main-ts-routing-shell` (또는 W22-sprint-1)

**Gate 3 plan goal**: `apps/web/src/main.ts` 의 routing / app shell 책임을
`apps/web/src/app/{routes,appShell}.ts` 로 분리. main.ts line 수 -15% 이상.

**AC 후보**:
- AC1: `Route` type + `parseRoute(href)` 가 `app/routes.ts` 에 존재 + unit test
  (URL → Route, Route → URL, invalid → fallback).
- AC2: `appShell.ts` 가 top-level renderApp + route dispatch 담당. main.ts 의
  렌더 진입점은 `import { renderApp } from "./app/appShell"` 호출 1줄.
- AC3: 모든 기존 spec (auth-boot, ipad-breakpoint, esc-tool-reset, sidebar-
  term-nav, classdate-format, ...) PASS 유지.
- AC4: `pnpm smoke:auth-boot-playwright` PASS.
- AC5: main.ts line count 11049 → 9000 이하.

**ADR 후보**: ADR-N "FE module boundary — auth/app/sidebar/pdf-workspace/
sync 5 layer". main.ts 는 entry point 만, 모든 도메인 로직은 boundary 모듈.

## 5. 외부 변경 (Codex / Wiki)

- Codex 는 study-note app 코드 수정 금지 (sprint-W21-sprint-1 rule 유지). QA/QC
  evidence durable home = `/Users/mj/agent_architect/llm-wiki/external-
  observations/study-note/`.
- llm-wiki DDD root = `llm-wiki/ddd/`. main.ts 분해로 FE module map 이 바뀌면
  `llm-wiki/ddd/` 의 frontend bounded context page 갱신 evidence 필수.

## 6. 잔여 manual 작업 (sprint-W21-sprint-1 닫힘 직전)

이전 인계 (`20260524-sprint-1-pr-loop-handoff.md`) 의 §5 그대로:

1. **prod backfill**: `MASTER_USER_ID=<prod-master-cuid> node --experimental-strip-types --no-warnings scripts/backfill-default-term.ts --apply` (Azure MySQL Flex prod).
2. **prod migration apply**: AC7 step 3 `Subject.termId` NOT NULL — backfill 검증 후.
3. **iPad 실기기 QA**: pen latency + ESC + starMark + 768px breakpoint + PDF DatePicker.
4. **Datadog dashboard/monitor UI**: `sync.put.success/failure`, `annotation.cas.stale`, `annotation.batch.size` — 별도 ops sprint.

## 7. fresh session 시작 프롬프트

```text
docs/solon/handoff/20260524-main-ts-ddd-split-handoff.md 읽고 이어서 작업해.
직전 sprint-W21-sprint-1 feature 작업은 10 PR 머지 완료. 이번엔 main.ts
DDD 분해 sprint 진입. 우선순위 = A (routing/shell) → B (PDF workspace) →
C (subject views) → D (state/sync). 1 sprint = 1 layer.

먼저 sfs brainstorm 으로 sprint goal 정리, 그 다음 sfs plan → Gate 3 self-CPO
PASS → cross codex review → sfs implement. SFS 0.6.112 정책 준수.

main.ts 안에서 이동 후보 함수는 §1 의 이미 분리된 모듈 (auth/sidebar/pdf-
workspace/pdf/admin/api/observability) 옆 폴더로 추가. 같은 폴더 안에 pure
helper 부터 분리하고 renderer 는 그 다음 commit.

이동만 하는 commit / behavior 변경 commit 반드시 분리. smoke (build + 모든
apps/web/src/__tests__/*.spec.ts + pnpm smoke:auth-boot-playwright) 매 commit
유지.
```

