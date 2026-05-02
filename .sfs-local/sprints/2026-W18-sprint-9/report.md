---
phase: report
status: final
sprint_id: 2026-W18-sprint-9
goal: "S3-backed material storage provider"
created_at: "2026-05-02T21:15:34+09:00"
last_touched_at: 2026-05-02T12:16:19+00:00
closed_at: 2026-05-02T12:16:19+00:00
---

# Report — S3-backed Material Storage Provider

## Summary

Sprint 9 added the backend contract for private S3-backed PDF storage. The browser still talks to the backend, not S3 directly. The backend owns upload/download proxying, Prisma/MySQL owns `PdfMaterial` metadata and `uploadStatus`, and `StoragePort` isolates local/mock vs S3 storage.

## Delivered

- Added `PdfMaterial.uploadStatus` with `pending` and `uploaded`.
- Added backend proxy endpoints:
  - `PUT /api/materials/:materialId/file`
  - `GET /api/materials/:materialId/file`
- Evolved `StoragePort` to support `putObject` and `getObject`.
- Kept `LocalMockStorageService` as the default provider and made it store PDF bytes in-process for local smoke.
- Added `S3StorageService` using AWS SDK v3 S3 `PutObject` / `GetObject`.
- Added `STORAGE_PROVIDER=local|s3` provider selection.
- Added mocked S3 smoke and optional real S3 smoke.
- Updated `.env.example` and `backend/README.md` with env-only S3 config, private bucket assumptions, backend proxy flow, upload status, and file size limit.

## Verification

- `npm run build` passed.
- `npm run smoke:s3-storage` passed.
- `npm run smoke:s3-real` skipped cleanly without `RUN_REAL_S3_SMOKE=1`.
- `npm run smoke:backend` passed with temporary MySQL and both Prisma migrations.
- `npm run smoke:pdf-workspace` passed with temporary MySQL.
- Prisma schema validation and client generation passed.
- Gate 6 (Review) via Gemini passed with no evidence gaps and no required CTO actions.

## Decisions And Boundaries

- Backend proxy upload/download is the chosen MVP path; browser-direct presigned S3 is deferred.
- S3 config is env-only. Bucket/IAM creation is not automated in this sprint.
- Local/mock storage remains the default for development and smoke tests.
- The frontend PDF workspace still uses its local file-selection UX; connecting it to the backend upload/download contract is the next product slice.

## Next Actions

- Sprint closed with `sfs retro --close`.
- Next likely sprint: frontend PDF workspace integration with backend upload/download.
- Later: real AWS bucket/IAM validation and material deletion/S3 cleanup.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T12:16:19+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
