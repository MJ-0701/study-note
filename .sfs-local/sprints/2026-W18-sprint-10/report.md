---
phase: report
status: final
sprint_id: 2026-W18-sprint-10
goal: "frontend PDF workspace integration with backend upload/download"
created_at: "2026-05-02T21:45:00+09:00"
last_touched_at: 2026-05-02T12:46:08+00:00
closed_at: 2026-05-02T12:46:08+00:00
---

# Report — Frontend PDF Workspace Backend Upload/Download Integration

## Summary

Sprint 10 connected the frontend PDF workspace to the backend material storage contract from Sprint 9. PDF selection now creates a backend upload intent, uploads PDF bytes through the backend proxy, fetches the stored PDF with bearer authentication, and renders the preview through a browser Blob URL. Reload/session revalidation can restore the latest uploaded PDF per subject.

## Delivered

- Added typed frontend material API helpers in `src/api/materials.ts`.
- Extended the PDF workspace material model with backend metadata:
  - `backendMaterialId`
  - `classDate`
  - `contentType`
  - `uploadStatus`
  - `updatedAt`
- Replaced local-only PDF import with:
  - `POST /api/materials/upload-intent`
  - `PUT /api/materials/:materialId/file`
  - authenticated `GET /api/materials/:materialId/file`
  - Blob URL iframe preview
- Added latest uploaded material restore after login and `/api/me` session revalidation.
- Preserved existing local sticky note/table/chart-note/pen annotation flow.
- Updated PDF workspace copy/status from local-only prototype language to backend-connected upload/download language.
- Added Blob URL lifecycle management and failed preview fetch dedupe.
- Extended PDF workspace smoke coverage for backend upload/download, reload restore, auth rejection, annotation persistence, and mobile toolbar layout.

## Verification

- `npm run build:frontend` passed.
- `npm run smoke:backend` passed.
- `npm run smoke:pdf-workspace` passed.
- `npm run build` passed.
- Gate 3 (Plan) review via Gemini passed.
- Gate 6 (Review) review via Gemini passed with no evidence gaps and no required CTO actions.

## Decisions And Boundaries

- The browser does not iframe a private backend URL directly because iframe requests cannot attach bearer Authorization headers.
- The chosen boundary is authenticated fetch -> Blob URL -> iframe preview.
- The frontend consumes the existing backend route contract; no backend schema/API/storage provider rewrite happened in this sprint.
- Local/mock storage remains acceptable for local smoke, but process-restart PDF byte durability still depends on real S3 configuration.
- Annotation backend sync remains deferred. This sprint only changed PDF file source of truth and preview restoration.
- Material selector/library/delete/rename/versioning/share UX remains deferred. The current restore rule is latest uploaded material per subject.

## Changed Artifacts

- `src/api/materials.ts`
- `src/domain/pdfWorkspace.ts`
- `src/main.ts`
- `src/styles.css`
- `scripts/smoke-pdf-workspace.mjs`
- `.sfs-local/sprints/2026-W18-sprint-10/implement.md`
- `.sfs-local/sprints/2026-W18-sprint-10/log.md`

## Next Actions

- Sprint closed with `sfs retro --close`.
- Next likely sprint: backend-backed annotation sync for sticky notes/pen strokes.
- Later:
  - material selector/library UX
  - real S3 credential manual smoke
  - material delete plus storage object cleanup
  - share/cohort access model

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T12:46:08+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
