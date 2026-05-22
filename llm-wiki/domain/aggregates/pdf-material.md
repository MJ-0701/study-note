---
id: study-note-agg-pdf-material
title: PdfMaterial Aggregate
language: ko
load_when:
  - PdfMaterial
  - PdfMaterialRecord
  - PdfMaterialDraft
  - backendMaterialId
  - R2 upload
  - storageKey
summary: 강의 PDF 원본 aggregate. BE Record + FE Draft, R2 storage key, ownerId/uploaderId 분리.
---

# PdfMaterial Aggregate

## Root

PDF material 은 **두 표현** 을 가진다:

- BE record: `PdfMaterialRecord` (`packages/domain/src/pdf-workspace.ts:141-156`)
- FE draft: `PdfMaterialDraft` (`packages/domain/src/pdf-workspace.ts:167-182`)

서로 다른 라이프사이클 단계지만 같은 식별 (`id` / `backendMaterialId`) 공유.

### PdfMaterialRecord (BE SoT)

| Field | 의미 |
|---|---|
| `id` | BE PK |
| `ownerId` | **@deprecated** uploader alias. 코드에서 ownerId 검증 시 uploaderId 와 동일 처리. |
| `uploaderId` | 업로드한 user id |
| `subjectId` | 소속 subject |
| `classDate` | 수업 날짜 (UI-only metadata) |
| `fileName`, `fileSize`, `pageCount`, `contentType` | 파일 메타 |
| `storageKey` | R2 object key (예: `materials/<user>/<id>.pdf`) |
| `uploadStatus` | `pending` / `uploaded` |
| `createdAt`, `updatedAt` | timestamps |

### PdfMaterialDraft (FE)

- `id` — local id or BE id mirror
- `backendMaterialId?` — BE 부여 후 채워짐. annotation PUT key 의 핵심
- `selectedPage`, `selectedTool` — 사용자의 현재 도구 / 페이지 상태 (PdfWorkspace 의 tool union 과 sync)
- `uploadStatus` — `local` / `pending` / `uploaded`
- `classDate?` — `classDate` 미설정 시 BE upload 차단

## Invariants

### M1. uploaderId = SoT, ownerId = legacy alias
- 모든 신규 검증은 `uploaderId` 기준.
- BE 정책: 업로더만 write, **shared read** (cohort 내 다른 학생도 read 가능).
- decision: [0005-pdf-material-ownerid-uploader-shared-read](../../references/decisions.md#0005)

### M2. UI-only classDate contract
- `classDate` 는 UI metadata. BE storage 영향 X.
- 누락 시 upload 차단 (FE intake 가드).
- decision: [0006-pdf-metadata-ui-only-classdate-contract](../../references/decisions.md#0006)

### M3. R2 key = `materials/<key prefix>/<id>.<ext>`
- R2 key prefix 분리 정책 (notes/, materials/, annotations/) 으로 다른 storage
  데이터와 같은 bucket 공유. 새 R2 provider 도입 X.
- 위반 = key collision / 비용 fragmentation.
- 원문: `CLAUDE.md` 인프라 현황 + `apps/api/src/materials/`.

### M4. backendMaterialId 이전엔 annotation PUT 차단
- FE draft 가 `uploadStatus: 'local'` 또는 `'pending'` 인 동안 annotation PUT 은
  발사하지 않는다. `backendMaterialId` 가 PUT key 의 의미적 anchor.
- 위반 = PUT 가 local id 로 발사 → BE 404 or mis-attribute.

### M5. material 교체 시 annotation PUT 차단
- `updatePdfWorkspace` 의 `previousId === nextId` 가드.
- 위반 = 이전 material 의 annotation 이 새 material 의 BE record 에 쓰임.

## 라이프사이클

```
intake (FE)
  createPdfMaterialDraft(subjectId, fileName, fileSize, pageCount)
    → uploadStatus = 'local', id = `local-pdf-...`

classDate 설정 후 upload
  uploadMaterialFile(apiBaseUrl, intent, file)
    → multipart upload, R2 putObject
    → BE Record 생성, returns BackendPdfMaterialInput
  createPdfMaterialFromBackend(material, previous)
    → backendMaterialId 채워짐, selectedPage/selectedTool 보존

retry (실패 시)
  pendingPdfRetry intent 보존, 사용자가 재시도 버튼 누름 → 동일 flow

material swap (다른 PDF 로 교체)
  updatePdfWorkspace(subjectId, ws => ({ ...ws, material: nextMaterial }))
  PUT 발사 X (가드)
  이전 material 의 annotation 은 BE 에 보존 (hot path GET 으로 복원)
```

## 외부 의존

- **R2 (S3-compatible)**: putObject / getObject. `apps/api/src/materials/`.
- **MySQL**: PdfMaterialRecord row.
- **PdfWorkspace**: `material` + `materials[]` reference.
- **AuthSession**: uploaderId = `authSession.user.id`.

## 변경 이력

- decision 0005 — uploaderId / shared read 정책
- decision 0006 — classDate UI-only contract
- sprint-14 — PDF 70vh UX + tan 함수 등 surface 개선

## Open questions / TODO

- material soft-delete vs hard-delete 정책 미명시.
- R2 lifecycle policy (old material 자동 정리) 미설정.
- BE 의 ownerId field 제거 시점 (deprecated 표시 후).
