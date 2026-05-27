---
title: Datadog Operations Dashboard
owner: infra
status: importable
created_at: 2026-05-27
last_reviewed_at: 2026-05-27
---

# Datadog Operations Dashboard

This folder contains an importable Datadog dashboard payload wired to the
current production integration:

- `datadog-study-note-ops-dashboard.json`

The app also exposes the same class of live operational checks at
`GET /api/v1/admin/ops-dashboard`, rendered in `/admin.html` for master/admin
users. That endpoint uses server-side `DD_API_KEY` and `DD_APP_KEY` values and
returns `not_configured` if either key is missing.

The dashboard is designed for the current production names:

| Signal | Value |
|---|---|
| Datadog site | `us5.datadoghq.com` |
| Backend APM/log service | `study-note-api` |
| Frontend RUM service | `study-note-web` |
| Default env | `production` |
| Admin snapshot | `/api/v1/admin/ops-dashboard` |

## Import

1. Open Datadog US5.
2. Go to Dashboards.
3. Create or import a dashboard from JSON.
4. Paste `datadog-study-note-ops-dashboard.json`.
5. Confirm the template variables:
   - `env=production`
   - `service=study-note-api`
   - `web_service=study-note-web`

## Query Sources

The API panels use `dd-trace` v5's default v0 service-entry operation for this
repo. `.github/workflows/be-release.yml` does not set
`DD_TRACE_SPAN_ATTRIBUTE_SCHEMA`, so the backend service-entry metrics are:

- `trace.web.request`
- `trace.web.request.hits`
- `trace.web.request.errors`

If production later sets `DD_TRACE_SPAN_ATTRIBUTE_SCHEMA=v1`, change these
queries to `trace.http.server.request*`.

The RUM panels query actual RUM events instead of guessed browser metric names:

- `@type:session`
- `@type:error`
- `@type:action`

The log panels search the actual message text emitted by
`apps/api/src/pdf-annotations/pdf-annotations.service.ts`, for example
`"metric=sync.put.success"` and `"metric=annotation.cas.stale"`. They do not
require a Datadog parsing pipeline before they show values.

The admin snapshot endpoint uses:

- Metrics API v1 `/api/v1/query` for APM trace metrics.
- Logs API v2 `/api/v2/logs/analytics/aggregate` for log-derived reliability
  counts.
- RUM API v2 `/api/v2/rum/analytics/aggregate` for browser sessions/errors and
  product action counts.

## Optional Log Facets

Facets are useful for manual drill-downs, but the dashboard JSON does not depend
on them.

| Facet | Why |
|---|---|
| `@metric` | Separates `sync.put.success`, `sync.put.failure`, `annotation.cas.stale`, `annotation.batch.size`. |
| `@type` | Splits sync writes into `create` vs `update`. |
| `@reason` | Splits sync failures by operational cause. |
| `@truncated` | Shows whether batch annotation loads hit the response cap. |

Do not create dashboard facets for user or material identifiers. The operations
view should answer reliability and latency questions without encouraging
per-user inspection.

## Panel Map

| Panel | Data source | Purpose |
|---|---|---|
| API Requests | APM trace metric | `sum:trace.web.request.hits{env:$env,service:$service}.as_count()`. |
| API Errors | APM trace metric | `sum:trace.web.request.errors{env:$env,service:$service}.as_count()`. |
| API p95 Latency | APM trace metric | `p95:trace.web.request{env:$env,service:$service}`. |
| API Throughput By Resource | APM trace metric | Requests grouped by `resource_name`. |
| Slowest API Resources | APM trace metric | Top p95 by `resource_name`. |
| Erroring API Resources | APM trace metric | Top errors by `resource_name`. |
| Annotation Sync Writes | Logs | Text searches for `metric=sync.put.success` and `metric=sync.put.failure`. |
| Stale Annotation Conflicts | Logs | Text search for `metric=annotation.cas.stale`. |
| Batch Annotation Load Shape | Logs | Text searches for `metric=annotation.batch.size` split by `truncated=true/false`. |
| RUM Sessions | RUM events | `@type:session` for `study-note-web`. |
| Browser Errors | RUM events | `@type:error` for `study-note-web`. |
| RUM Product Actions | RUM events | Login/signup/upload funnel pulse. |
| Release Comparison | APM trace metric | Compare p95/errors grouped by `version` from `DD_VERSION`. |

## Review Flow

After a `fe-v*` or `be-v*` release:

1. Set dashboard time range to 15 minutes.
2. Filter `env=production`.
3. For BE releases, inspect the Release Comparison panel grouped by `version`.
4. Check API error count first.
5. Check p95 latency and slowest resources.
6. Check annotation sync failure and stale conflict widgets.
7. Check RUM browser errors and product actions.
8. Open the relevant APM resource or trace from the widget drill-down.

## Privacy Boundary

Allowed dimensions include `service`, `env`, `version`, `resource_name`,
`status_code`, `role`, `type`, `reason`, `truncated`, and bucketed sizes.

Forbidden values include raw note text, PDF annotation payloads, PDF file names,
student names, student numbers, email addresses, session cookies, API keys,
persona prompts, persona responses, and raw `clientRevision` values.
