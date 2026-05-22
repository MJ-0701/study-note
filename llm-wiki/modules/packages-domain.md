---
id: study-note-module-packages-domain
title: packages/domain 모듈 지도
language: ko
load_when:
  - 도메인 타입
  - shared kernel
  - packages/domain
  - lecture-note.ts
  - pdf-workspace.ts
summary: 도메인 shared kernel. apps/web 과 apps/api 가 공유하는 타입 + 헬퍼.
---

# packages/domain 모듈 지도

apps/web 과 apps/api 가 공유하는 도메인 shared kernel. 모든 타입 / helper 의
SoT.

## 파일

| 파일 | 책임 | 주요 export |
|---|---|---|
| `src/index.ts` | barrel | 아래 4개 re-export |
| `src/lecture-note.ts` | Notebook aggregate | `StudyNotebook`, `SubjectNote`, `WeekNote`, `Concept`, `RequiredKeyword`, `ExampleQuestion`, `SourceMaterial`, `SubjectSummary`, `SharePolicy`, `CoverageSummary`, helper (`getSubjectCoverage`, `getNotebookCoverage`, `getConceptById`, `getQuestionById`, `getKeywordById`, `getSourceById`, `getIntegrityWarnings`) + enum types (`SourceKind`, `SourceVisibility`, `KeywordCoverageStatus`, `ConceptPriority`, `ShareAccess`, `ExamPhase`) |
| `src/pdf-workspace.ts` | PdfWorkspace + PdfMaterial aggregate | `SubjectPdfWorkspace`, `PdfWorkspaceStore`, `PdfStickyNote(Block)`, `PdfInkStroke(Point)`, `PdfTextBox`, `PdfChecklist(Item)`, `PdfTable`, `PdfChart`, `PdfMaterialRecord`, `PdfMaterialDraft`, `AnnotationSnapshotRecord`, `BackendPdfMaterialInput`, tool union + 헬퍼, `hydrateSubjectPdfWorkspace`, factory/mutator (createStickyNote, createInkStroke, createTextBox, addChecklistItem, …) |
| `src/lecture-note-import.ts` | WeekNote import flow | `WeekNoteImportPayload`, `ImportValidationResult`, `ApplyImportResult`, helper |
| `src/user.ts` | UserProfile | `UserProfile` interface |

## 의존 / 사용처

- apps/web: 모든 도메인 타입 import + factory 사용. `PdfMaterialDraft`,
  `SubjectPdfWorkspace`, `StudyNotebook`, factory/mutator 전부 FE 측 사용.
- apps/api: BE 측이 import 하는 도메인 타입은 주로 **`UserProfile`,
  `PdfMaterialRecord`, `AnnotationSnapshotRecord`** 이다 (`apps/api/src/materials/`,
  `apps/api/src/pdf-annotations/` 에서 grep). `BackendPdfMaterialInput` 은 FE 가
  BE 응답을 받아 `createPdfMaterialFromBackend` 으로 변환할 때 쓰는 **FE-facing
  schema mirror** 이지 BE 가 직접 응답에 쓰는 타입은 아니다 — anti-corruption
  layer 의 입력 형식으로 보는 게 정확.

## 명명 규칙

- enum 류는 string literal union (`"midterm" | "final"`). 가드 함수는
  `isXxx(value: unknown): value is Xxx` 형태.
- factory: `createXxx(...)`
- mutator: `updateXxx`, `addXxx`, `deleteXxx`, `toggleXxx`, `moveXxx`
- hydrate: `hydrateXxx` — fail-closed per item, corrupt entry drop.
- helper accessor: `getXxxById` — `undefined` 반환 허용.

## 도메인 invariant (코드 enforce)

- `normalizePdfPoint(x, y)` — 0~1 clamp.
- `createPdfMaterialDraft` — `pageCount = Math.max(1, …)` (최소 1).
- `createPdfMaterialFromBackend` — `selectedPage` 를 `pageCount` 안으로 clamp.
- `getSubjectCoverage` / `getNotebookCoverage` — total 0 보호.
- `hydrateSubjectPdfWorkspace` — corrupt textBox/checklist/table/chart drop.

## 갱신 의무

- 새 aggregate 추가 시 `index.ts` barrel + 이 wiki 갱신.
- enum 확장 (예: PdfWorkspaceTool 신규 도구) 시 `isXxx` 가드 + `LocalPdfTool`
  (main.ts) 와 함께 sync. 둘 중 하나 누락 = sprint-12 회귀 클래스.
- @deprecated 마킹된 field (`PdfMaterialRecord.ownerId`) 제거 시 dependency
  grep 필수.
