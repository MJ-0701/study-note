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
single-tenant per-user product.

DDD 원칙: bounded context 는 **도메인 의미가 분리되는 영역** 이지 코드 모듈이
아니다. study-note 는 **4 개 domain bounded context** + **application sync flow** +
**infrastructure adapter** 로 분리한다. application/infra 는 bounded context 가
아니라 supporting layer.

## Domain bounded contexts (4)

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
- **Aggregate root**: `PdfMaterialRecord` (BE persistence), `PdfMaterialDraft` (FE intake VO)
- **책임**: 강의 PDF 파일 메타 + R2 object 참조 + 페이지 수 + 분류 (class date).
- **상세**: [aggregates/pdf-material](aggregates/pdf-material.md)
- **원문**: `packages/domain/src/pdf-workspace.ts` (`PdfMaterialRecord`,
  `PdfMaterialDraft`, `BackendPdfMaterialInput`), `apps/api/src/materials/`

### 4. AuthSession (인증/세션)
- **Aggregate root**: `AuthSession` (FE in-memory) / BE `/api/v1/auth/me` 응답
- **책임**: 사용자 식별, 세션 lifecycle, A→B 전환 detection.
- **상세**: [aggregates/auth-session](aggregates/auth-session.md)
- **원문**: `apps/api/src/auth/`, `apps/web/src/main.ts` (auth 블록)

## Application layer (도메인 아님)

### Sync flow (BE persistence orchestration)
- bounded context 아님 — 위 4 개 domain context 가 BE 와 동기화되는 **application
  service / orchestration**. PUT debounce, AbortController, per-key chain, 5xx
  backoff, hot path GET hydrate.
- **상세**: [flows/autosave-sync](../flows/autosave-sync.md)
- **원문**: `apps/web/src/main.ts` sync 블록, `apps/api/src/user-notes/`, `apps/api/src/pdf-annotations/`

## Infrastructure adapter (도메인 아님)

### Storage adapter (localStorage + R2 + MySQL)
- bounded context 아님 — **infra port**. domain context 가 read/write 할 때
  지나가는 채널.
- localStorage: client cache (sprint-3 의 `{base}:{userId}` namespacing).
- R2 object storage: PDF 원본 + annotation snapshot.
- MySQL: PdfMaterialRecord row, user 테이블, session.
- **상세**: [flows/storage-namespacing](../flows/storage-namespacing.md)
- **원문**: `apps/api/src/materials/` (R2 via `S3StorageService` port), Prisma schema (MySQL)

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

## DDD 자산 맵 (study-note tactical patterns)

| 패턴 | 본 프로젝트에서 어디 |
|---|---|
| **Aggregate root** | `StudyNotebook`, `SubjectPdfWorkspace`, `PdfMaterialRecord` (BE) + `PdfMaterialDraft` (FE), `AuthSession` |
| **Value object** | `NormalizedPoint`, `PdfInkPoint`, `CoverageSummary`, `SubjectSummary`, `SharePolicy`, `PdfMaterialDraft` (intake VO) |
| **Entity** | aggregate 의 owned entities (위 각 aggregate page 참조) |
| **Repository / port** | `S3StorageService` (R2 adapter, `apps/api/src/materials/materials.service.ts`), Prisma 의 `PrismaService` (apps/api 내 MySQL repository 역할) |
| **Anti-corruption layer** | `createPdfMaterialFromBackend` (`packages/domain/src/pdf-workspace.ts:276`) — BE schema → FE draft, `hydrateSubjectPdfWorkspace` (line 1017) — legacy/corrupt localStorage payload fail-closed |
| **Shared kernel** | `packages/domain/` — apps/web + apps/api 가 동일 타입 import |
| **Domain event** | **없음** (현 시점). 모든 변경은 imperative mutation + autosave PUT. 도입 시 본 표 갱신. |
| **Domain service** | `getSubjectCoverage` / `getNotebookCoverage` / `getIntegrityWarnings` (stateless domain logic in `lecture-note.ts`) |
| **Factory** | `createEmptyPdfWorkspace`, `createPdfMaterialDraft`, `createStickyNote`, `createInkStroke`, `createTextBox`, … |

## 외부 시스템 (application/infra 의존)

- **Cloudflare R2** — S3-compatible object storage (legacy 명칭 그대로 `S3StorageService` 가 R2 endpoint).
- **Azure MySQL Flex** — user / session / pdf-annotations 관계형 데이터.
- **Azure SWA** — frontend host.
- **Azure Container Apps** — backend host (scale-to-zero → cold start, sprint-15 keep-alive workflow 가 완화).
- **Porkbun 910701.xyz** — DNS / 운영 도메인.

자세한 인프라 결정 = [references/decisions — private 0004](../references/decisions.md#private-0004).
