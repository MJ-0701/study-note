---
id: study-note-agg-pdf-workspace
title: PdfWorkspace Aggregate
language: ko
load_when:
  - PdfWorkspace
  - SubjectPdfWorkspace
  - annotation
  - sticky
  - ink
  - textbox
  - checklist
  - table
  - chart
  - eraser
summary: SubjectPdfWorkspace aggregate 의 root, owned entities (sticky/ink/text/checklist/table/chart), invariant, hydrate 정책.
---

# PdfWorkspace Aggregate

## Root

- `SubjectPdfWorkspace` (`packages/domain/src/pdf-workspace.ts:185-200`)
  - 식별: `subjectId`
  - 메타: `updatedAt`, `tool: PdfWorkspaceTool`, `eraserShape`, `eraserSize`
  - 현재 활성 PDF: `material?: PdfMaterial`
  - 보유 자료: `materials: PdfMaterial[]`
  - annotation 묶음: `stickyNotes[]`, `inkStrokes[]`, `textBoxes[]`,
    `checklists[]`, `tables[]`, `charts[]`

- 컨테이너: `PdfWorkspaceStore` (line 202-204) = `{ workspaces: { [subjectId]: SubjectPdfWorkspace } }`
- localStorage 키 base: `pdfWorkspaceStorageKey = "study-note.pdf-workspaces.v1"`
  → sprint-3/S2 이후 `{base}:{userId}` 형태로 namespaced.

## Owned entities

| Entity | 정의 | 식별 / 위치 |
|---|---|---|
| `PdfStickyNote` | `pdf-workspace.ts:53-63` | `pageNumber` + `anchor: NormalizedPoint` + `blocks[]` |
| `PdfStickyNoteBlock` | `pdf-workspace.ts:44-49` | sticky 내부 text / checklist / table / chart-note 블록 |
| `PdfInkStroke` | `pdf-workspace.ts:65-77` | `page` + `points: PdfInkPoint[]` + pen meta |
| `PdfTextBox` | `pdf-workspace.ts:79-88` | sprint-12. `page` + `position: NormalizedPoint` + content |
| `PdfChecklist` | `pdf-workspace.ts:96-110` | sprint-12. items[] + collapsed |
| `PdfTable` | `pdf-workspace.ts:112-121` | sprint-13. rows × cols content |
| `PdfChart` | `pdf-workspace.ts:125-139` | sprint-13. sparkline 등 |

## Tool union

`PdfWorkspaceTool = "read" | "sticky" | "pen" | "eraser" | "text" | "checklist" | "table" | "chart"`
(`pdf-workspace.ts:7-15`)

- 가드: `isPdfWorkspaceTool` (line 17-28)
- **주의**: `main.ts` 의 `LocalPdfTool` 와 sync 필수. drift = surface-layer 기능 깨짐.

## Invariants

### W1. NormalizedPoint coordinate space
- 모든 annotation 의 (x, y) 는 0~1 정규화.
- page rendering 크기 변경 (zoom, fullscreen) 에 무관하게 위치 보존.
- `normalizePdfPoint` (line 235) 가 입력 사이드에서 보정.
- 위반 = zoom 변경 시 annotation 위치 drift.

### W2. material ID = annotation PUT key
- annotation PUT 대상 = `nextMaterial.backendMaterialId ?? nextMaterial.id`.
- material 교체 (A → B) 시 PUT 은 발사 X (이전 material 의 annotation 을 B 의
  record 에 쓰면 mis-attribution).
- 검증: `main.ts` `updatePdfWorkspace` 의 `previousId === nextId` 가드.
- **sprint-2/S2 fix** (codex P1) 가 이 invariant 를 enforced.

### W3. Hydrate fail-closed per entry
- `hydrateSubjectPdfWorkspace` (line 1017) 가 textBox / checklist / table /
  chart entry 마다 검증. 한 개 corrupt = 그것만 drop, 나머지 보존.
- sticky / ink BC: 배열만 보장 (느슨한 hydrate).
- 위반 = invalid entry 가 runtime error 유발.

### W4. workspace updatedAt = mutator time
- `updatePdfWorkspace` 가 `updatedAt: new Date().toISOString()` 항상 갱신.
- BE hydrate revision check (sprint-3 backlog) 의 기준.

### W5. userId-scoped persistence (sprint-3/S2)
- localStorage key = `study-note.pdf-workspaces.v1:<userId>`.
- session 부재 시 save noop.
- module-init 은 빈 store, session attach 시 namespaced load.
- migration owner gate = sprint-2 marker.
- **원문**: `main.ts:1810-1985`, [flows/storage-namespacing](../../flows/storage-namespacing.md).

### W6. PDF object URL 라이프사이클
- `revokeAllPdfObjectUrls` 가 session clear / material swap 시 호출 → leak 방지.
- 위반 = blob URL 누수 → 메모리.

## 라이프사이클

```
boot
  pdfWorkspaceStore := { workspaces: {} }   (sprint-3/S2 이후 LS read X)

session attach
  pdfWorkspaceStore := loadPdfWorkspaceStore(userId)
    - scoped key 있으면 parse + hydrate (fail-closed per item)
    - 없으면 { workspaces: {} } (sprint-4/S1 이후 legacy migration helper 제거
      — server annotation GET hydrate 가 SoT 로 복원)

user annotation
  updatePdfWorkspace(subjectId, (ws) => ({ ...ws, [mutation] }))
    - syncCurrentPdfMaterial (material 의 materials[] 동기화)
    - savePdfWorkspaceStore()
    - 동일 material 일 때만 scheduleAnnotationPut

server hydrate
  fetchAnnotationIfMissing(key)
    - hot path GET (`/v1/pdf-annotations/<key>`)
    - updatePdfWorkspaceStoreFromServer 가 mergeUpdatedAt 비교 후 적용
    - savePdfWorkspaceStore (PUT 발사 X — hydrate write 가 PUT 루프 방지)

session clear / different user transition
  in-flight annotationPutAborts.values().forEach(ac.abort())
  annotationPutChains.clear()
  annotationFetchedKeys.clear()
  lastHydratedAnnotationByMaterial.clear()
  (sprint-3/S2+S3 이후 pdfWorkspaceStore wipe 는 제거 — namespacing 이 격리)
```

## 외부 의존

- **PdfMaterial**: `material` 필드. material 교체는 PUT 차단 가드 필요.
- **Sync**: per-key (= materialId) FIFO chain + AbortController.
- **AuthSession**: load/save userId 의존.
- **Storage (R2)**: PDF 원본 (annotation 이 아닌 PDF 자체).

## 변경 이력

- sprint-11: layout L2 + 지우개 (eraser tool)
- sprint-12: textbox / checklist / eraser widget + sticky drag + textbox inline redesign
- sprint-13: table / chart 도구
- sprint-14: tan 함수 / 검사기 drill-down / PDF 70vh UX
- sprint-2: annotation BE persistence — 표준 endpoint `/api/v1/pdf-annotations/:materialId` (PUT/GET). FE 의 `apps/web/src/main.ts:1168,1264` 가 호출.
- sprint-3/S2: pdfWorkspaceStore localStorage userId namespacing.
- sprint-3/S3: session transition wipe 제거.

## Annotation PUT body

FE 는 단일 PUT body 에 모든 annotation 묶음을 `payload` envelope 로 감싸 보낸다
(`apps/web/src/main.ts:1172`):
```
{
  "payload": {
    "stickyNotes": [...],
    "inkStrokes": [...],
    "textBoxes": [...],
    "checklists": [...],
    "tables": [...],
    "charts": [...]
  }
}
```
BE `PdfAnnotationsController` 가 `payload` 키를 필수로 검증한다 — envelope 없이
보내면 400 INVALID_BODY. sticky / ink 는 `AnnotationSnapshotRecord` 스키마 v1 으로
1급 명시되어 있고, sprint-12/13 에서 도입된 textBoxes / checklists / tables /
charts 는 같은 `payload` 안에 포함되어 R2 object 로 저장된다 (현재 schema 가
sticky/ink 만 1급이라 신규 필드는 "unknown payload" 로 함께 보존).

## 별도 채널 (legacy)

`apps/api/src/materials/materials.controller.ts` 의 `:materialId/annotation` PUT/GET
은 sprint-2 이전의 legacy 경로다. FE 는 더 이상 호출하지 않으며, 운영 정리 시점에
deprecation 여부 결정 필요.

## Open questions / TODO

- annotation PUT body 의 revision check 미구현 (sprint-3 backlog 후보).
- material 삭제 시 annotation 후처리 정책 미정.
- table / chart 의 BE schema 1급화 (현재 `AnnotationSnapshotRecord` 는 sticky/ink 만 명시).
- materials legacy annotation 채널의 deprecation 시점.
