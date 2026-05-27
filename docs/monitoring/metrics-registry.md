---
title: Monitoring Metrics Registry
owner: infra
status: active
created_at: 2026-05-22
last_reviewed_at: 2026-05-28
---

# Monitoring Metrics Registry

This file records which monitoring and product analytics metrics study-note
tracks and why. Grafana + Prometheus is the public operations SoT.

## Current Topology

| Surface | Runtime |
|---|---|
| Frontend | Vercel production SPA, service `study-note-web` |
| Backend | Azure Container Apps, `study-note-api` |
| Metrics endpoint | `GET /api/metrics` on `study-note-api` |
| Scraper | `study-note-prometheus` |
| Public dashboard | `study-note-grafana` dashboard `study-note-ops` |
| Admin ops tab | `/admin.html#ops`, Grafana-only CTA |
| Datadog archive | Developer-only legacy dashboard / server snapshot |

## Privacy Boundary

Do not send raw note text, PDF annotation payloads, PDF file names, student
names, student IDs, email addresses, session cookies, API keys, persona prompts,
persona responses, or `clientRevision` values.

Allowed examples: `role`, `env`, `service`, `version`, `status_code`,
`file_size_bucket`, `page_count_bucket`, `tool_type`, route labels, outcome
labels, and bucketed latency/size values.

## Metrics

| ID | Status | Source | Metric or event | Why |
|---|---|---|---|---|
| OBS-001 | active | Prometheus | API request count by route/status | Detect traffic and route-level changes. |
| OBS-002 | active | Prometheus | 5xx count | Catch backend regressions quickly. |
| OBS-003 | active | Prometheus histogram | p50/p95/p99 latency | Track response health without external APM dependency. |
| OBS-004 | active | Prometheus | CAS conflict count | Detect stale annotation writes. |
| OBS-005 | active | Prometheus / Node metrics | heap and event loop lag | Watch runtime pressure. |
| SYNC-001 | active | Prometheus | annotation sync outcomes | Verify autosave success/failure/stale pulse. |
| COST-001 | candidate | Azure usage | ACA/Grafana/Prometheus monthly usage | Keep student credit under control. |
| DD-001 | archived | Datadog RUM/APM/Logs | RUM sessions, trace metrics, log aggregates | Developer-only investigation; not public SoT. |

## Grafana Dashboard Widgets

| Widget | Source | Query intent |
|---|---|---|
| API 호출량 (5분) | Prometheus counter | Recent API volume. |
| 5xx 오류 (5분) | Prometheus counter | Backend 5xx count. |
| p95 응답 지연 | Prometheus histogram | Slow response pulse. |
| CAS 충돌 (총) | Prometheus counter | Stale write conflicts. |
| API 호출량 — route 별 | Prometheus labels | Endpoint-level request rate. |
| 응답 지연 — p50/p95/p99 | Prometheus histogram | Latency distribution. |
| 필기 자동저장 — outcome 별 | Prometheus counter | Sync success/failure/stale outcomes. |
| Node.js 프로세스 — heap / event loop | Node/process metrics | Runtime health. |

## Admin Ops Tab

`/admin.html#ops` does not call `GET /api/v1/admin/ops-dashboard` anymore.
It shows:

- Grafana + Prometheus 기준.
- Disabled `Datadog 조회 비활성화` button.
- One active CTA to the Grafana dashboard.

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-05-22 | Created initial Datadog-first registry. | Student-pack Datadog was active; FE is Vercel; BE is Azure Container Apps. |
| 2026-05-23 | Added backend APM target service `study-note-api`. | RUM/APM/logs were explored for API debugging. |
| 2026-05-27 | Added importable Datadog operations dashboard and admin ops snapshot endpoint. | External review prep. |
| 2026-05-28 | Promoted Grafana + Prometheus to public SoT and disabled admin Datadog lookup. | ACA Datadog APM trace metrics are unreliable; Grafana already shows live data. |
