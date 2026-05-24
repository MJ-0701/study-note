---
handoff_type: "claude-fresh-session"
created_at: "2026-05-25T01:50:00+09:00"
source_session: "Claude (sprint-W21-sprint-2 layer A close)"
target_session: "Claude (fresh, sprint-W21-sprint-3 layer B PDF workspace)"
topic: "apps/web/src/main.ts DDD 분해 layer B — PDF workspace feature 분리"
status: "Layer A (routing/shell) PR #57 머지 완료 (main=25f3cb9). Layer B 미착수. SFS 0.6.117 의 Session Continuation Guard 로 fresh session 권장."
predecessor_handoff: "docs/solon/handoff/20260524-main-ts-ddd-split-handoff.md"
sprint_a_retro: "docs/solon/main-ts-routing-shell-layer-ddd-app-routes-ts-app-appshell-ts/20260525/retro.md"
---

# Layer B (PDF workspace) 분해 인계 (fresh session)

## 0. 컨텍스트 회복

본 인계 = `20260524-main-ts-ddd-split-handoff.md` 의 §2-B 를 직접 잇는다.
앞 session 이 Layer A (routing/shell) 완료 후 closed.

전제:
- Layer A merged: PR [#57](https://github.com/MJ-0701/study-note/pull/57)
  squash sha=25f3cb9. main.ts 11,049 → 10,784 line (-2.40%).
- 신규 boundary 모듈 `apps/web/src/app/{routes,appShell,escape-html}.ts` +
  AppShellContext (least-privilege) + RenderSink interface 도입.
- SFS 0.6.114 → 0.6.117 upgrade 반영 (commit 5fae2c9).
- Layer B = handoff §2-B (2순위, 위험도 매우 큼). 본 사이클 = layer B 만.

## 1. 현재 main.ts 상태

```
$ wc -l apps/web/src/main.ts
   10784 apps/web/src/main.ts

$ grep -c "^function\|^async function\|^export function" apps/web/src/main.ts
   ~310 (layer A 분해 후)
```

이미 분리된 boundary 모듈 (재진입 금지):

| 폴더 | 책임 |
|---|---|
| `apps/web/src/auth/` | session boot, /v1/auth/me, sign-in/up/out, login/signup view |
| `apps/web/src/sidebar/` | term grouping pure |
| `apps/web/src/pdf-workspace/` | ESC action pure |
| `apps/web/src/pdf/` | PDF canvas viewer (pdf.js) |
| `apps/web/src/admin/` | admin panel (Terms/Subjects CRUD) |
| `apps/web/src/api/` | fetch wrapper |
| `apps/web/src/observability/` | Datadog RUM init |
| `apps/web/src/app/` | **NEW (Layer A)** — Route + parseRoute + path helpers + renderInto + renderShell + AppShellContext + RenderSink + escapeHtml |

## 2. Layer B scope — PDF workspace feature

handoff §2-B 의 후보 함수 (line 은 layer A 분해 후 기준):

### annotation 관련
- `putAnnotationToBE` (line ~1184)
- `scheduleAnnotationPut` (line ~1306)
- `handleAnnotationStaleResponse` (line ~1322)
- `hydrateAnnotationFromCanonicalEntry` (line ~1417)
- `fetchAnnotationsForSubject` (line ~1448)
- `fetchAnnotationIfMissing` (line ~1566)
- `updatePdfWorkspaceStoreFromServer` (line ~1698)
- annotation render (renderApp 안 / PDF workspace renderer 안)

### ink stroke 관련
- `getSurfacePoint` (line ~5100)
- ink stroke render / live polyline / `reattachLiveInkPolyline`
- iPad pen latency RAF batch + `getCoalescedEvents` (sprint-W21-sprint-1 S4/S6)
- pen pointer handler (`handleDocumentPointerMove` 등)

### PDF canvas / mount
- `applyPdfCanvasMounts` (line ~377) **= 이미 appShell.ts 의 sink callback
  으로 등록됨**. layer B 에서 main.ts 잔류 본체를 별 모듈로 이동.
- `setActivePdfObjectUrl` (line ~1947)
- `disposePdfDocumentCache`, `revokeAllPdfObjectUrls`

### workspace state
- `buildPdfWorkspaceKey`, `loadPdfWorkspaceStore`, `savePdfWorkspaceStore`
  (line ~2122~)
- `updatePdfWorkspace` (line ~2205)
- `syncCurrentPdfMaterial` (line ~2248)
- `getPdfMaterialKey`, `getPdfWorkspaceMaterials`,
  `sortPdfMaterialsNewestFirst`, `upsertPdfWorkspaceMaterial`,
  `replacePdfWorkspaceMaterials`, `selectPdfWorkspaceMaterial`,
  `getSubjectPdfMaterials` (line 2270~2435)
- `assignPdfMaterialClassDate`, `normalizePdfMaterialClassDateValue`,
  `patchPdfWorkspaceMaterial`, `replacePdfWorkspaceMaterial`
  (line 2477~2630)

### touch / swipe / drag
- `handleDocumentTouchEnd`, `handleDocumentTouchStart`,
  `handleDocumentTouchMove`, `commitPdfSwipeGesture` (line 2858~)
- `handleDocumentChange` (line 2696)

### PDF nav / fullscreen
- `togglePdfFullscreen` (line ~3917)
- `getActivePdfWorkspaceSubjectId` (line ~3968)
- `movePdfPage`, `setPdfPage`, `setPdfTool` (line 5682~5728)

### renderer (PDF workspace page)
- `renderPdfWorkspacePage` (line ~8472, ~1100 line 추정)
- `renderPdfWorkspaceIndex` (line ~10282)
- `renderPdfFrameStack` + 좌표 매핑 helper

### drill highlight (PDF 검사기)
- `getDrillHighlightSelector`, `getDrillHighlightDatasetKey`,
  `findDrillHighlightElement`, `applyPendingDrillHighlight`,
  `findPdfAnnotationSurface`, `getDrillHighlightKey`,
  `applyTrackedDrillHighlight`, `refreshActiveDrillHighlights`,
  `scheduleDrillHighlightRetry`, `applyQueuedDrillHighlight` (line 542~)

= **30+ 함수, ~3000~4000 line 추정**. 본 sprint scope 결정 시 advisor +
brainstorm Q 사전 합의 필수.

## 3. 위험 인벤토리 (sprint-W21-sprint-1 + sprint-W21-sprint-2 의 invariant)

본 layer B 가 가장 부담스러운 이유 = 다음 5개 fragile invariant 가 PDF
workspace 영역 안에 집중.

1. **pdfjs polyfill saga** (PR #42/#44/#45/#46) — `polyfills.ts` 의
   `Map.prototype.getOrInsertComputed` polyfill. top-level import 순서가
   timing critical. PDF canvas mount 분리 시 import 순서 유지 필수.
   ([[project-ipad-blank-canvas-fix]])
2. **morphdom canvas mount preservation** (sprint-W21-sprint-4/S1) —
   layer A 의 `shouldPreservePdfCanvasMount` callback. 이미 appShell.ts
   가 자체 보유. layer B 의 PDF canvas 모듈 이동 시 dataset key 일치
   (`data-pdf-mount`, `data-material-id`, `data-page-number`,
   `data-blob-url`) 유지 필수.
3. **iPad pen RAF batch + `getCoalescedEvents`** (sprint-W21-sprint-1 S4/S6) —
   pointer event handler 이동 시 native event API 우회 안 함 (React 면 더
   심각, vanilla 는 그대로 옮길 수 있음). RAF throttle 이 다른 widget
   render (eraser, drill highlight) 와 timing 공유.
4. **annotation 좌표 0~1 ratio + Hybrid R2 sync** (sprint-W21-sprint-2
   sync hardening 6 round) — revision/CAS, 1970 epoch sentinel,
   `STALE_REVISION_NO_RECORD`, batch GET fallback. annotation sync 모듈
   분리 시 invariant 다수.
5. **inspector drill highlight** (sprint-11) — drill highlight 의 retry +
   timer + active map. layer A 의 RenderSink postMountEffects 에 이미
   `applyQueuedDrillHighlight` + `refreshActiveDrillHighlights` 등록됨.
   layer B 분리 시 callback registration 변경 영향 검토.

## 4. 작업 규칙 (재확인)

기존 `20260524-main-ts-ddd-split-handoff.md` §3 의 원칙 + Layer A 회고
교훈 누적:

1. **이동만 하는 commit + behavior commit 분리** (slice 1 / slice 2 / ...).
2. **DOM 없는 pure function / state transition 먼저** 새 모듈로. DOM
   renderer 는 import 사이트 정리 후.
3. **기존 smoke 깨지 말 것**:
   - `pnpm --filter @study-note/web build`
   - 모든 `apps/web/src/__tests__/*.spec.ts` PASS
   - `pnpm smoke:auth-boot-playwright`
4. **boundary 모듈 5+1 layer 유지**:
   - `apps/web/src/auth/*` + `app/*` (Layer A 신규) + `sidebar/*` +
     `pdf-workspace/*` + `pdf/*` + `admin/*` + `api/*`. PDF workspace 모듈
     은 `apps/web/src/pdf-workspace/` 의 기존 esc-action 옆에 추가.
5. **Context (least-privilege) + Sink interface 패턴 재사용** = Layer A
   의 AppShellContext + RenderSink 같이, PDF workspace 도 module state
   결합을 끊는 인터페이스 도입.
6. **plan 의 source excerpt + sink-escaping evidence + profile attestation
   사전 embed** = Layer A 의 Gate 6 self+cross round 의 반복 finding 회피.
7. **AC8 commit count 강제 X** = Layer A 회고에서 "최소 N commit + review
   finding 대응 commit 무한 허용" 로 plan AC 완화.

## 5. 시작 sprint 권장 scope (Q1 brainstorm)

**sprint name 안**: `2026-W21-sprint-3-main-ts-pdf-workspace` (또는 W22-sprint-1)

**Gate 2 brainstorm Q1 — 분해 단위**:
- **옵션 A (slice 별 multi-sprint)** — annotation sync / ink stroke / drag /
  canvas mount / nav 등을 각 별 sprint. 각 sprint 작음 (~500~800 line),
  안전, review round 수 적음. 단점 = sprint 횟수 5~6 sprint.
- **옵션 B (PDF workspace 전체 1 sprint)** — 30+ 함수 한 번에. main.ts
  -3000~4000 line 큰 절감. 단점 = invariant 5종 모두 동시 검증, review
  round 많음, 한 PR 가 매우 큰 diff.
- **옵션 C (hybrid)** — annotation sync (1 sprint) + 나머지 (1 sprint).
  invariant 분리.

→ **옵션 C 권장** (회고의 위험 인벤토리 분리 효과).

**Gate 3 plan goal (옵션 C 의 first sprint)**: `apps/web/src/main.ts` 의
annotation sync 책임 (`putAnnotationToBE` / `scheduleAnnotationPut` /
`handleAnnotationStaleResponse` / `hydrateAnnotationFromCanonicalEntry` /
`fetchAnnotationsForSubject` / `fetchAnnotationIfMissing` /
`updatePdfWorkspaceStoreFromServer`) 를 `apps/web/src/pdf-workspace/
annotation-sync.ts` 로 분리.

**AC 후보 (annotation sync 1st sprint)**:
- AC1: `annotation-sync.ts` 가 7+ 함수 export. main.ts 의 동일 정의 0.
- AC2: `annotation-sync.spec.ts` 신규. revision/CAS / `STALE_REVISION_NO_RECORD`
  / batch fallback / 1970 epoch sentinel 의 characterization spec.
- AC3: 모든 기존 spec PASS + 새 spec PASS. 회귀 0.
- AC4: `pnpm smoke:auth-boot-playwright` PASS.
- AC5: `pnpm --filter @study-note/web build` PASS.
- AC6: main.ts line 감소 (목표 = layer A~D 누적으로 9k 진행 metric).
- AC7 (security): annotation sync 모듈의 BE response (canonical entry,
  stale response) 의 trust boundary 명시. revision string 의 schema 검증.

**ADR 후보**: ADR-N "annotation sync = pdf-workspace/annotation-sync.ts +
Context+Sink (R2 client + revision store + retry policy 주입)".

## 6. 외부 변경 (Codex / Wiki)

- Codex = study-note app 코드 수정 금지 유지 (sprint-W21-sprint-1 rule).
  QA/QC evidence durable home = `/Users/mj/agent_architect/llm-wiki/
  external-observations/study-note/`.
- llm-wiki DDD root = `llm-wiki/ddd/`. PDF workspace 분해로 frontend
  bounded context page (`llm-wiki/ddd/frontend-app-shell/`?) 갱신 필요 시
  retro 에서 evidence 기록.

## 7. 잔여 manual 작업

이전 인계의 manual 작업 그대로:
1. **prod backfill** (sprint-W21-sprint-1 의 S3 Subject.termId): 사용자
   직접 실행 남음.
2. **prod migration apply**: 미실행.
3. **iPad 실기기 QA**: layer A 머지 후 PDF workspace 진입 + 펜 + ESC +
   starMark + 768px breakpoint + PDF DatePicker 사용자 직접 확인 필요.
   layer B 진입 전 가시성 확보 권장.
4. **Datadog dashboard/monitor UI**: 별 ops sprint.

## 8. backlog (Layer A 회고에서 누적)

- `bl-subject-id-href-escape` — path helper 의 `encodeURIComponent(id)` +
  sink 측 `escapeHtml` 도입 (layer C/D AC).
- `bl-week-id-encode` — `weekSummaryPath` 의 `week.id` 동일.
- `bl-trusted-html-brand` — TrustedHtml 구조적 brand type (layer C).
- `bl-parseRoute-empty-segment` — `#/subjects//class` home fallback guard
  (security 영향 minor).
- `bl-fe-spec-fix-pre-existing` — chart-tool / inspector-drill /
  pdf-material-library subtest 6/9 의 pre-existing 3 fail (본 sprint 전부터
  존재).

## 9. SFS 0.6.117 추가 정책 (ambient)

본 session 부터 적용:
- **Executable Action Ownership** = auth/runtime 갖춰지면 직접 실행.
- **Monitor checkpoint classification** = long-running watch 의무.
- **Handoff-only stop contract** = handoff 요청만이면 즉시 stop.
- **Review autopilot rework loop** = deterministic finding 직접 patch +
  rerun, "진행?" 안 묻기.
- **Findings label** = Critical / Required / Important / Optional / FYI.
- **Korean closing colon 금지** + **Korean-first source file 첫 줄 한국어
  role 주석**.
- **Session Continuation Guard** = 본 인계가 그 결과. 30%+/50%+/multi-WU.
- 자세히 = `CLAUDE.md` 의 "SFS 0.6.114 → 0.6.117 추가 정책" 섹션.

## 10. fresh session 시작 프롬프트

```text
docs/solon/handoff/20260525-layer-b-pdf-workspace-handoff.md 읽고 이어서
작업해. 직전 sprint-W21-sprint-2 (layer A routing/shell) PR #57 머지 완료
(main=25f3cb9). 이번엔 main.ts DDD 분해 layer B (PDF workspace) sprint
진입. handoff §5 의 Q1 brainstorm = 분해 단위 결정 (slice 별 multi-sprint
vs 전체 1 sprint vs hybrid). hybrid (annotation sync 1 sprint + 나머지)
권장.

먼저 sfs start → sfs brainstorm 으로 Q1~Q4 사용자 결정 받기. 그 다음
sfs plan → Gate 3 self-CPO PASS → cross codex review → sfs implement.
SFS 0.6.117 정책 준수 (Executable Action Ownership, Monitor checkpoint
classification, Handoff-only stop contract, autopilot rework loop, ...).

main.ts 안에서 이동 후보 함수는 handoff §2 의 30+ 함수 목록. boundary
모듈 = apps/web/src/pdf-workspace/ 폴더 안에 추가 (esc-action 옆). layer
A 의 AppShellContext + RenderSink pattern 재사용 — Context (least-privilege)
+ Sink interface 로 module state 결합 끊기.

이동만 하는 commit / behavior commit 반드시 분리. smoke (build + 모든
apps/web/src/__tests__/*.spec.ts + pnpm smoke:auth-boot-playwright) 매
commit 유지. plan 의 source excerpt + sink-escaping evidence + profile
attestation 사전 embed (layer A 의 Gate 6 self+cross round 반복 finding
회피).
```
