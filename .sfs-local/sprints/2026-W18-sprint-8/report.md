---
phase: report
status: final
sprint_id: 2026-W18-sprint-8
goal: "Prisma/MySQL runtime persistence for users/sessions/materials/annotations"
created_at: "2026-05-02T18:41:59+09:00"
last_touched_at: 2026-05-02T09:42:48+00:00
closed_at: 2026-05-02T09:42:48+00:00
---

# Report — Prisma/MySQL Runtime Persistence

## Summary

Sprint 8 moved study-note backend runtime state from process memory to MySQL through Prisma while preserving the existing frontend/backend API contract. Users, sessions, PDF material metadata, and annotation snapshots are now DB-backed. PDF binary storage remains behind `StoragePort`; real S3 is still deferred.

## Delivered

- Added Prisma 6.19.3 runtime, generated client setup, MySQL schema, and migration.
- Added idempotent seed for four subjects and two local MVP users.
- Added Nest `PrismaService` and workspace mappers.
- Replaced in-memory runtime storage in auth/session/material/annotation services with Prisma-backed persistence.
- Persisted sessions as deterministic HMAC `tokenHash` only; raw bearer tokens are not stored.
- Preserved owner-scoped material/download/annotation/export access.
- Updated backend and PDF workspace smokes to run against DB-backed MySQL runtime.
- Documented local `DATABASE_URL`, Prisma commands, smoke DB behavior, and S3 deferral.

## Verification

- `npm run build` passed.
- `npm run smoke:backend` passed against temporary MySQL, including migration, seed twice, auth/session checks, ownership checks, export bundle, and backend restart persistence.
- `npm run smoke:pdf-workspace` passed against DB-backed backend.
- `npx prisma validate` and `npx prisma generate` passed.
- Source search found no remaining target runtime `Map` storage in backend services/scripts.
- Gate 6 (Review) via Gemini passed with no evidence gaps and no required CTO actions.

## Decisions And Boundaries

- Prisma is pinned to 6.19.3 because Prisma 7 no longer supports the schema `datasource.url` pattern used here.
- `StoragePort` remains the binary storage boundary; S3 provider work is not included in this sprint.
- Local MVP authentication remains `name + studentNumber`; production hardening is deferred.
- Seed-based users are acceptable for local validation, but real sharing needs a provisioning decision.

## Next Actions

- Sprint closed with `sfs retro --close`.
- Next likely sprint: real S3 provider or cohort/user provisioning, depending on whether storage or sharing is the bigger immediate blocker.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T09:42:48+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
