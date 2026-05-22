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

- apps/web: 모든 도메인 타입 import + factory 사용.
- apps/api: BE controller / service 가 DTO 변환 시 동일 타입 참조 (예:
  `BackendPdfMaterialInput` → BE 직렬화 schema).

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
