---
title: Monitoring Metrics Registry
owner: infra
status: draft
created_at: 2026-05-22
last_reviewed_at: 2026-05-22
---

# Monitoring Metrics Registry

This file records which monitoring and product analytics metrics study-note
tracks and why. Update it whenever a metric, event, dashboard, monitor, or
funnel changes.

## Current Topology

| Surface | Runtime |
|---|---|
| Frontend | Vercel production SPA |
| Backend | Azure Container Apps, `study-note-api` |
| Datadog site | US5 |

## Privacy Boundary

Do not send raw note text, PDF annotation payloads, PDF file names, student
names, student IDs, email addresses, session cookies, API keys, persona prompts,
persona responses, or `clientRevision` values.

Allowed examples: `role`, `env`, `service`, `version`, `status_code`,
`file_size_bucket`, `page_count_bucket`, `tool_type`.

## Initial Metrics

| ID | Status | Source | Metric or event | Why |
|---|---|---|---|---|
| OBS-001 | candidate | RUM | browser errors, resource latency | Detect broken FE deploys. |
| OBS-002 | candidate | Azure integration | `azure.app_containerapps.*` | Observe ACA requests, replicas, restarts, CPU, memory, cold starts. |
| OBS-003 | candidate | APM/logs | API 5xx rate, p95 latency | Detect BE regressions. |
| PROD-001 | candidate | RUM action | `sign_up_started`, `sign_up_completed` | Signup funnel. |
| PROD-002 | candidate | RUM action | `login_completed` | Returning user access. |
| PROD-003 | candidate | RUM action | `pdf_upload_started`, `pdf_upload_completed`, `pdf_upload_failed` | PDF ingestion funnel. |
| PROD-004 | candidate | RUM action | `annotation_created` | Core learning action. |
| SYNC-001 | candidate | RUM action/log metric | `sync_put_success`, `sync_put_failure`, `sync_paused` | Autosave reliability. |
| COST-001 | candidate | Datadog/Azure usage | Datadog usage, Azure credit | Keep student-pack usage under control. |

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
