---
id: study-note-context-map
title: Context Map
language: ko
load_when:
  - context map
  - bounded context
  - 도메인 경계
  - 모듈 관계
summary: study-note 의 bounded contexts (Notebook / PdfWorkspace / PdfMaterial / Auth-Session / Sync / Storage) 와 관계.
---

# Context Map

study-note 는 **개인 학습자가 강의 PDF + 메모/필기/암기노트를 통합 관리** 하는
single-tenant per-user product. bounded context 는 6개로 본다.

## Bounded contexts

### 1. Notebook (학습 노트)
- **Aggregate root**: `StudyNotebook`
- **소유 entity**: `SubjectNote`, `WeekNote`, `Concept`, `RequiredKeyword`,
  `ExampleQuestion`, `SourceMaterial`, `SharePolicy`
- **책임**: subject 단위 학습 진도, 메모 (`WeekNote.userNotes`), 시험 분류
  (`examPhase`), 키워드/개념 coverage.
- **상세**: [aggregates/study-notebook](aggregates/study-notebook.md)
- **원문**: `packages/domain/src/lecture-note.ts`

### 2. PdfWorkspace (PDF 작업공간 / annotation)
- **Aggregate root**: `SubjectPdfWorkspace` (subject 1개당 1개)
- **소유 entity**: `PdfStickyNote`, `PdfInkStroke`, `PdfTextBox`, `PdfChecklist`,
  `PdfTable`, `PdfChart`
- **책임**: PDF material 위 annotation, 도구 상태 (`PdfWorkspaceTool`), eraser
  config.
- **상세**: [aggregates/pdf-workspace](aggregates/pdf-workspace.md)
- **원문**: `packages/domain/src/pdf-workspace.ts`

### 3. PdfMaterial (PDF 원본)
- **Aggregate root**: `PdfMaterialRecord` (BE), `PdfMaterialDraft` (FE intake)
- **책임**: 강의 PDF 파일 메타 + R2 object 참조 + 페이지 수 + 분류 (class date).
- **상세**: [aggregates/pdf-material](aggregates/pdf-material.md)
- **원문**: `packages/domain/src/pdf-workspace.ts` (`PdfMaterialRecord`,
  `PdfMaterialDraft`, `BackendPdfMaterialInput`), `apps/api/src/materials/`

### 4. AuthSession (인증/세션)
- **Aggregate root**: `AuthSession` (FE in-memory) / BE `/v1/auth/me` 응답
- **책임**: 사용자 식별, 세션 lifecycle, A→B 전환 detection.
- **상세**: [aggregates/auth-session](aggregates/auth-session.md)
- **원문**: `apps/api/src/auth/`, `apps/web/src/main.ts` (auth 블록)

### 5. Sync (BE persistence)
- **Aggregate root**: 없음 (cross-cutting service)
- **책임**: userNotes / pdf-annotations 의 debounced PUT, AbortController,
  per-key chain, 5xx backoff, hot path GET hydrate.
- **상세**: [flows/autosave-sync](../flows/autosave-sync.md)
- **원문**: `apps/web/src/main.ts` sync 블록 (라인 820~1500 부근),
  `apps/api/src/user-notes/`, `apps/api/src/pdf-annotations/`

### 6. Storage (localStorage + R2 + MySQL)
- **Aggregate root**: 없음 (infrastructure adapter)
- **책임**: client cache (localStorage), object storage (R2), relational
  (MySQL flex).
- **상세**: [flows/storage-namespacing](../flows/storage-namespacing.md)
- **원문**: `apps/api/src/materials/` (R2), MySQL migration scripts

## 관계

```
+-------------+    holds many    +---------------+
|  Notebook   |---->>------------| SubjectNote   |
+-------------+                  +---------------+
                                        |
                                        | 1:1 by subjectId
                                        v
+----------------+    refers     +----------------+
|  PdfWorkspace  |<-------------|   PdfMaterial  |
+----------------+   subject     +----------------+
        |  uses                          |  R2 key
        |                                v
        |                          +------------+
        |                          |   Storage  |
        |  autosave via Sync       |   (R2)     |
        v                          +------------+
+--------+
|  Sync  |
+--------+
        ^
        | hydrate / PUT
        v
+----------------+
|  AuthSession   |
+----------------+
        |  userId attach
        v
+----------------+
| Storage (LS)   |
| namespaced     |
+----------------+
```

## 관계 규칙

- **Notebook ↔ PdfWorkspace**: 같은 `subjectId` 로 join. PdfWorkspace 는 Notebook
  의 SubjectNote 가 존재한다고 가정하지만 라이프사이클은 분리된다 (subject
  삭제가 PdfWorkspace 도 정리하는지는 sprint-2 시점에 명시되지 않음 — 확인 필요).
- **PdfWorkspace ↔ PdfMaterial**: `SubjectPdfWorkspace.material` 이 현재 활성
  PDF 를 가리킨다. material 교체 시 annotation 은 이전 material 에 묶여 BE 에
  보존 (sprint-2/S2 fix 참조).
- **AuthSession → 모든 user-scoped data**: 모든 user-scoped localStorage key 는
  `{base}:{userId}` 형태. session 부재 시 save 는 noop (sprint-3/S1+S2).
- **Sync ⊥ AuthSession**: A→B 전환 시 in-flight PUT 은 abort (`applySessionTransitionForUser`).
  cross-namespace authorship leak 은 구조적으로 불가.

## Anti-corruption layer / shared kernel

- `packages/domain/` 가 **shared kernel** 으로 Notebook + PdfWorkspace + User
  타입을 노출. apps/web 과 apps/api 가 동일 타입을 import.
- BE 응답 → FE 도메인 변환 = `createPdfMaterialFromBackend` 류 helper
  (`packages/domain/src/pdf-workspace.ts:276`).
- `hydrateSubjectPdfWorkspace` (line 1017) = anti-corruption layer for legacy
  / corrupt localStorage payload (fail-closed per item).

## 외부 시스템 (out of bounded contexts)

- **Cloudflare R2** — S3-compatible object storage (legacy 명칭 그대로 `S3StorageService` 가 R2 endpoint).
- **Azure MySQL Flex** — user / session / pdf-annotations 관계형 데이터.
- **Azure SWA** — frontend host.
- **Azure Container Apps** — backend host (scale-to-zero → cold start, sprint-15 keep-alive workflow 가 완화).
- **Porkbun 910701.xyz** — DNS / 운영 도메인.

자세한 인프라 결정 = [references/decisions](../references/decisions.md) 의
`0004-azure-fullmigration`.
