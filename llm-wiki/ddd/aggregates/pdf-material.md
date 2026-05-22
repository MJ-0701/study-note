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
| `storageKey` | R2 object key. 실제 형식 = `users/${ownerId}/materials/${materialId}/${sanitizeFileName(fileName)}` (`apps/api/src/materials/materials.service.ts:73`) |
| `uploadStatus` | `pending` / `uploaded` |
| `createdAt`, `updatedAt` | timestamps |

### PdfMaterialDraft (FE)

- `id` — local id or BE id mirror
- `backendMaterialId?` — BE 부여 후 채워짐. annotation PUT key 의 의미적 anchor.
- `selectedPage`, `selectedTool` — 사용자의 현재 도구 / 페이지 상태 (PdfWorkspace 의 tool union 과 sync)
- `uploadStatus` — `local` / `pending` / `uploaded`
- `classDate?` — optional. 미설정 시 FE 가 `metadata-pending` sentinel 을 BE 에
  보내 record 는 만들고 사용자가 나중에 classDate 를 채울 수 있게 허용
  ([private 0006](../../references/decisions.md#private-0006)).

## Invariants

### M1. ownerId 가 write guard 의 storage field, uploaderId 는 DTO/API alias
- BE service (`apps/api/src/materials/materials.service.ts`) 의 모든 write/lookup
  은 `where: { ownerId, ... }` 로 식별. ownerId 가 영속 layer 의 SoT.
- API/DTO 표면에는 `uploaderId` alias 가 노출되며 mapper 가 `uploaderId = ownerId`
  로 채운다 (legacy 명명 통일 작업이 진행 중일 때 두 이름이 공존).
- 정책: uploader (ownerId) 만 write/delete, cohort 내 다른 사용자는 **shared read**
  ([private 0005](../../references/decisions.md#private-0005)).
- 위반 = ownerId 검증 우회 → cross-user write.

### M2. classDate 는 UI metadata + `metadata-pending` sentinel 허용
- `classDate` 는 BE storage 의미에 영향 없는 UI metadata.
- FE intake 가 classDate 없이도 upload 시작할 수 있도록 `metadata-pending`
  sentinel 을 사용 (사용자가 사후에 채움).
- 위반 = UI 가 classDate 를 강제 차단해서 입력 흐름이 막힘.
- decision: [private 0006](../../references/decisions.md#private-0006).

### M3. R2 key = `users/${ownerId}/materials/${materialId}/${sanitizeFileName(fileName)}`
- key prefix `users/<owner>/materials/<material>/...` 으로 owner namespace 분리.
  같은 bucket 안에서 다른 storage 데이터 (notes/, annotations/) 와 prefix 로 격리.
- 새 R2 provider 도입 X — 기존 `StoragePort` / `S3StorageService` 의
  `putObject`/`getObject` 재사용.
- 위반 = key collision / 비용 fragmentation / owner namespace breakage.
- 원문: `apps/api/src/materials/materials.service.ts:73`, `CLAUDE.md` 인프라 현황.

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

upload (classDate 는 선택)
  uploadMaterialFile(apiBaseUrl, intent, file)
    → POST /api/materials/upload-intent → pre-signed URL
    → R2 PUT (또는 /api/materials/:id/file proxy)
    → POST /api/materials/:id/complete → BE Record 확정
    classDate 가 없으면 `metadata-pending` sentinel 로 record 만 만들어 두고
    사용자가 사후 채움 (M2).
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
- **MySQL**: PdfMaterialRecord row (Prisma).
- **PdfWorkspace**: `material` + `materials[]` reference.
- **AuthSession**: `request.user.id` 가 `ownerId` 로 들어감. FE 의 `authSession.user.id`
  와 동일.

## 변경 이력

- [private 0005](../../references/decisions.md#private-0005) — ownerId write guard, uploaderId DTO alias, shared read
- [private 0006](../../references/decisions.md#private-0006) — classDate UI-only + `metadata-pending` sentinel
- sprint-14 — PDF 70vh UX + tan 함수 등 surface 개선

## Open questions / TODO

- material soft-delete vs hard-delete 정책 미명시.
- R2 lifecycle policy (old material 자동 정리) 미설정.
- BE 의 ownerId field 제거 시점 (deprecated 표시 후).
