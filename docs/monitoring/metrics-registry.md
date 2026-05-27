---
title: Monitoring Metrics Registry
owner: infra
status: active
created_at: 2026-05-22
last_reviewed_at: 2026-05-27
---

# Monitoring Metrics Registry

This file records which monitoring and product analytics metrics study-note
tracks and why. Update it whenever a metric, event, dashboard, monitor, or
funnel changes.

## Current Topology

| Surface | Runtime |
|---|---|
| Frontend | Vercel production SPA, service `study-note-web` |
| Backend | Azure Container Apps, `study-note-api` |
| Datadog site | US5 |
| Dashboard | `docs/monitoring/datadog-study-note-ops-dashboard.json` |
| Admin snapshot | `/api/v1/admin/ops-dashboard` |

## Privacy Boundary

Do not send raw note text, PDF annotation payloads, PDF file names, student
names, student IDs, email addresses, session cookies, API keys, persona prompts,
persona responses, or `clientRevision` values.

Allowed examples: `role`, `env`, `service`, `version`, `status_code`,
`file_size_bucket`, `page_count_bucket`, `tool_type`.

## Initial Metrics

| ID | Status | Source | Metric or event | Why |
|---|---|---|---|---|
| OBS-001 | active | RUM | browser errors, sessions, product actions | Detect broken FE deploys and basic browser traffic. |
| OBS-002 | candidate | Azure integration | `azure.app_containerapps.*` | Observe ACA replicas, restarts, CPU, memory, and cold starts once Azure metrics are fully tagged. |
| OBS-003 | active | APM traces | service `study-note-api`, request count, errors, p95 latency, resource drill-down | Detect BE regressions and debug request paths like Spring Boot APM. |
| OBS-004 | active | Logs | `sync.put.success`, `sync.put.failure`, `annotation.cas.stale`, `annotation.batch.size` | Track annotation sync reliability from existing backend log emit points. |
| PROD-001 | active | RUM action | `sign_up_started`, `sign_up_completed` | Signup funnel. |
| PROD-002 | active | RUM action | `login_completed` | Returning user access. |
| PROD-003 | active | RUM action | `pdf_upload_started`, `pdf_upload_completed`, `pdf_upload_failed` | PDF ingestion funnel. |
| PROD-004 | candidate | RUM action | `annotation_created` | Core learning action. |
| SYNC-001 | candidate | RUM action/log metric | `sync_put_success`, `sync_put_failure`, `sync_paused` | Autosave reliability. |
| COST-001 | candidate | Datadog/Azure usage | Datadog usage, Azure credit | Keep student-pack usage under control. |

## Dashboard Widgets

| Widget | Source | Query intent |
|---|---|---|
| API Requests | APM trace metric | `trace.web.request.hits` filtered by `env`, `service`. |
| API Errors | APM trace metric | `trace.web.request.errors` filtered by `env`, `service`. |
| API p95 Latency | APM trace metric | `trace.web.request` p95 for deploy health. |
| API Throughput By Resource | APM trace metric | Requests grouped by `resource_name`. |
| Slowest API Resources | APM trace metric | Top p95 latency by `resource_name`. |
| Erroring API Resources | APM trace metric | Top errors by `resource_name`. |
| Annotation Sync Writes | Logs | Raw message searches for `metric=sync.put.success` and `metric=sync.put.failure`. |
| Stale Annotation Conflicts | Logs | Raw message search for `metric=annotation.cas.stale`. |
| Batch Annotation Load Shape | Logs | Raw message searches for `metric=annotation.batch.size` split by `truncated=true/false`. |
| RUM Sessions | RUM events | `@type:session` for browser traffic sanity check. |
| Browser Errors | RUM events | `@type:error` for broken frontend deploy signal. |
| RUM Product Actions | RUM events | `@type:action` grouped by `@action.name` for `login_completed`, `sign_up_completed`, `pdf_upload_started`, `pdf_upload_completed`. |
| Release Comparison | APM trace metric | p95 latency and errors grouped by `version`. |
| Admin Ops Snapshot | Datadog API | Same APM/log/RUM live queries surfaced inside `/admin.html` for master/admin users. |

## Initial Funnels

| Funnel | Steps |
|---|---|
| New user activation | `view_home` -> `sign_up_started` -> `sign_up_completed` -> `pdf_workspace_opened` -> `annotation_created` |
| Returning learning loop | `login_completed` -> `subject_opened` -> `pdf_workspace_opened` -> `persona_turn_completed` |
| PDF upload | `pdf_upload_started` -> `pdf_upload_completed` -> `pdf_workspace_opened` |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-05-22 | Created initial Datadog-first registry. | Student-pack Datadog is active; FE is Vercel; BE is Azure Container Apps. |
| 2026-05-23 | Added backend APM target service `study-note-api`. | RUM is active; backend traces/logs are needed for API latency, 5xx, and request debugging. |
| 2026-05-27 | Added importable Datadog operations dashboard and marked existing APM/RUM/log signals active. | Prepare README and dashboard for external code review. |
| 2026-05-27 | Added admin ops snapshot endpoint backed by Datadog API keys. | Reviewers can see live operational indicators from the app, not only dashboard JSON. |
