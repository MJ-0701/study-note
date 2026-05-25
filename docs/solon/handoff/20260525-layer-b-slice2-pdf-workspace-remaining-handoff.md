---
handoff_type: "claude-fresh-session"
created_at: "2026-05-25T11:00:00+09:00"
source_session: "Claude (sprint-W22-sprint-1 layer B/slice-1 close)"
target_session: "Claude (fresh, layer B/slice-2 PDF workspace 나머지)"
topic: "apps/web/src/main.ts layer B/slice-2 — PDF workspace 의 나머지 (ink/drag/canvas mount/nav/drill/star/fullscreen/classDate)"
status: "Layer B/slice-1 (annotation sync) PR #58 merged (main=2fd4a0d). 위험도 매우 높음 — 5 fragile invariant 동시 검증. sub-slice multi-sprint 권장."
predecessor_handoff: "docs/solon/handoff/20260525-layer-b-pdf-workspace-handoff.md"
sprint_b1_retro: "docs/solon/document/pdf/main-ts-layer-b-slice-1-annotation-sync-r2-put-get-revision-cas-stale-recovery-batch-hydrate-apps-web-src-pdf-workspace-annotation-sync-ts/20260525/retro.md"
---

# Layer B/slice-2 (PDF workspace 나머지) 분해 인계 (fresh session)

## 0. 컨텍스트 회복

본 인계 = `20260525-layer-b-pdf-workspace-handoff.md` 의 옵션 C (hybrid)
의 **second sprint**. Layer B/slice-1 (annotation sync) PR #58 머지 완료
(main=2fd4a0d).

전제:
- Layer A merged (PR #57, main=25f3cb9). main.ts 11,049 → 10,784.
- Layer B/slice-1 merged (PR #58, main=2fd4a0d). main.ts 10,784 → 10,253.
- 누적 -796 line (-7.20%). 9k target 까지 -1,253 line 더 필요.
- SFS 0.6.117 자동화 하네스 (SessionStart hook + ACTIVE.md).

## 1. 현재 main.ts 상태

```
$ wc -l apps/web/src/main.ts
   10253 apps/web/src/main.ts
```

분리된 boundary 모듈:

| 폴더 | 책임 |
|---|---|
| `apps/web/src/auth/` | session boot, auth views |
| `apps/web/src/sidebar/` | term grouping |
| `apps/web/src/pdf-workspace/esc-action.ts` | ESC pure |
| `apps/web/src/pdf-workspace/annotation-sync.ts` | **NEW (slice-1)** — R2 PUT/GET + revision/CAS + STALE + batch + sync metric |
| `apps/web/src/pdf/pdf-canvas-viewer.ts` | pdf.js canvas viewer |
| `apps/web/src/admin/` | admin Terms/Subjects CRUD |
| `apps/web/src/api/` | fetch wrappers |
| `apps/web/src/observability/` | Datadog RUM |
| `apps/web/src/app/{routes,appShell,escape-html}.ts` | layer A boundary |

## 2. Layer B/slice-2 scope — PDF workspace 나머지

### invariant 5종 (위험도 매우 높음 — handoff §3)

1. **pdfjs polyfill saga** (PR #42/#44/#45/#46) — `polyfills.ts` 의
   `Map.prototype.getOrInsertComputed`. top-level import 순서 timing critical.
2. **morphdom canvas mount preservation** (sprint-W21-sprint-4/S1) — layer A
   의 `shouldPreservePdfCanvasMount` (appShell.ts 자체 보유). 본 sprint 의
   PDF canvas 모듈 이동 시 dataset key (`data-pdf-mount`,
   `data-material-id`, `data-page-number`, `data-blob-url`) 일치 필수.
3. **iPad pen RAF batch + getCoalescedEvents** (sprint-W21-sprint-1 S4/S6) —
   pointer event handler. React 면 SyntheticEvent 우회 필요, vanilla 는 그대로 옮김.
4. **annotation 좌표 0~1 ratio** — render 측이 사용 (annotation-sync 와 별).
5. **inspector drill highlight** — drill highlight retry + timer + active map.
   layer A 의 RenderSink postMountEffects 에 등록됨.

### 후보 함수 (handoff §2-B + slice-1 분리 후 잔존)

| 영역 | 함수 (~main.ts line) | 추정 line |
|---|---|---|
| **canvas mount** | `applyPdfCanvasMounts` (~377), `setActivePdfObjectUrl` (~1947), `clearActivePdfObjectUrl`, `revokeAllPdfObjectUrls`, `disposePdfDocumentCache` | ~250 |
| **workspace state** | `buildPdfWorkspaceKey`, `loadPdfWorkspaceStore`, `savePdfWorkspaceStore`, `updatePdfWorkspace`, `syncCurrentPdfMaterial`, `getPdfMaterialKey`, `getPdfWorkspaceMaterials`, `sortPdfMaterialsNewestFirst`, `upsertPdfWorkspaceMaterial`, `replacePdfWorkspaceMaterials`, `selectPdfWorkspaceMaterial`, `getSubjectPdfMaterials` | ~400 |
| **classDate** | `assignPdfMaterialClassDate`, `normalizePdfMaterialClassDateValue`, `patchPdfWorkspaceMaterial`, `replacePdfWorkspaceMaterial`, `createClassDateWeekId` | ~200 |
| **touch / swipe** | `handleDocumentTouchEnd`, `handleDocumentTouchStart`, `handleDocumentTouchMove`, `commitPdfSwipeGesture`, `handleDocumentChange` | ~200 |
| **PDF nav / fullscreen** | `togglePdfFullscreen`, `getActivePdfWorkspaceSubjectId`, `movePdfPage`, `setPdfPage`, `setPdfTool` | ~100 |
| **ink stroke + pen** | `getSurfacePoint`, ink stroke render / live polyline / `reattachLiveInkPolyline`, `handleDocumentPointerMove` (pen), RAF batch | ~500 |
| **drill highlight** | `getDrillHighlightSelector`, `getDrillHighlightDatasetKey`, `findDrillHighlightElement`, `applyPendingDrillHighlight`, `findPdfAnnotationSurface`, `getDrillHighlightKey`, `applyTrackedDrillHighlight`, `refreshActiveDrillHighlights`, `scheduleDrillHighlightRetry`, `applyQueuedDrillHighlight` | ~350 |
| **star mark** | starMark widget render | ~150 |
| **renderer** | `renderPdfWorkspacePage`, `renderPdfWorkspaceIndex`, `renderPdfFrameStack` | ~1200 |

합계 = ~3,350 line 추정. main.ts -33% 가능 (10,253 → ~6,900).

## 3. sub-slice multi-sprint 권장 (Q1 brainstorm)

본 sprint scope **전체 1 sprint = 위험**. invariant 5종 동시 검증 무리.
sub-slice 분리 권장:

| Sub-slice | 분리 대상 | 위험도 |
|---|---|---|
| **slice-2a (canvas mount + workspace state)** | applyPdfCanvasMounts + PDF object URL + workspace store CRUD | 중 (morphdom preservation invariant) |
| **slice-2b (classDate + touch/swipe + nav/fullscreen)** | classDate dropdown + touch/swipe + page nav + fullscreen toggle | 중-낮음 (event 패턴, DOM 단순) |
| **slice-2c (ink stroke + pen RAF batch)** | ink stroke + pen pointer + RAF batch + getCoalescedEvents | **매우 높음** (iPad pen latency invariant 정점) |
| **slice-2d (drill highlight)** | drill highlight retry + timer + active map | 중 (RenderSink callback registration 영향) |
| **slice-2e (star mark + renderer)** | starMark widget + renderPdfWorkspacePage / Index / FrameStack | 중-높음 (renderer ~1200 line, 가장 큰 단일 함수) |

= 5 sub-sprint 권장. 또는 일부 묶기 (a+b 또는 d+e).

## 4. 작업 규칙 (slice-1 회고 누적)

slice-1 회고에서 효과 확인된 패턴:
1. **Context (least-privilege read) + Callbacks (least-privilege write) 패턴 재사용**
2. **module-private state + clearXxxCaches() API**
3. **characterization spec** = fetch mock / DOM-free assertion / 20+ case
4. **사전 source excerpt + waiver capture** (Gate 6 round 절감 효과 큼)
5. **이동 commit + behavior commit 분리**
6. **plan AC line target 정확 값 강제 X** (metric only)
7. **codex bot post-trigger verdict 부재 case** = self+cross + CI clean +
   30+ 분 wait 후 autopilot merge

## 5. backlog (누적)

Layer A:
- `bl-subject-id-href-escape` (encodeURIComponent + sink escape)
- `bl-week-id-encode`
- `bl-trusted-html-brand`
- `bl-parseRoute-empty-segment`

Layer B/slice-1:
- `bl-annotation-render-xss-audit` — annotation render path (renderStickyNote /
  renderInkStroke / renderTextBox / renderChecklist / renderTable /
  renderChart) escape 완전성 audit. **본 slice-2 와 자연스럽게 결합 가능**
  (slice-2e renderer 분리 시 같이 audit).

Pre-existing 3 spec fail:
- `bl-fe-spec-fix-pre-existing` (chart-tool / inspector-drill / pdf-material-library
  subtest 6/9).

## 6. 잔여 manual 작업

- **prod backfill** (sprint-W21-sprint-1 의 S3 Subject.termId): 사용자
  직접 실행 남음.
- **prod migration apply**: 미실행.
- **iPad 실기기 QA** = PR #58 머지 후 PDF workspace 의 annotation sync
  + 펜 + ESC + starMark + classDate 동작 확인. layer B/slice-2 진입 전
  가시성 확보 권장.
- **Datadog dashboard/monitor UI**: 별 ops sprint.

## 7. SFS 0.6.117 정책 (ambient)

- Executable Action Ownership
- Monitor checkpoint classification
- Handoff-only stop contract
- Review autopilot rework loop
- Findings label Critical/Required/Important/Optional/FYI
- Session Continuation Guard (본 인계 = 그 결과)
- 자세히 = `CLAUDE.md` + `docs/solon/handoff/ACTIVE.md`

## 8. fresh session 시작 프롬프트

```text
docs/solon/handoff/ACTIVE.md 의 활성 작업 (layer B/slice-2) 이어서 진행.
SessionStart hook 가 ACTIVE.md 자동 inject — 별 prompt 불필요.

직전 sprint-W22-sprint-1 (layer B/slice-1 annotation sync) PR #58 머지
(main=2fd4a0d). 이번엔 layer B/slice-2 (PDF workspace 나머지) — handoff
§3 의 sub-slice 5 (a~e) 중 어느 것부터 시작할지 brainstorm Q1 결정.
slice-2a (canvas mount + workspace state) = 낮은 위험 + invariant 격리
좋음 → 첫 진입 권장.

sfs start → sfs brainstorm → sfs plan → Gate 3 self+cross → sfs implement
→ Gate 6 self+cross → PR → @codex review → merge → retro. SFS 0.6.117
정책 준수.

main.ts 안에서 이동 후보 함수는 handoff §2 의 후보 표. boundary 모듈 =
apps/web/src/pdf-workspace/ 안에 추가 (annotation-sync.ts 옆). layer A/B
slice-1 의 Context+Callbacks pattern 재사용.

이동만 하는 commit / behavior commit 분리. smoke (build + 모든 spec +
pnpm smoke:auth-boot-playwright) 매 commit 유지. plan 의 source excerpt
+ sink-escaping evidence + profile attestation 사전 embed.
```
