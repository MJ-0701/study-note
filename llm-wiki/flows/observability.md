---
title: Observability — Grafana SoT / Datadog archive
visibility: raw-internal
created: 2026-05-24
last_reviewed: 2026-05-28
related_handoff: docs/solon/handoff/20260523-datadog-ops-monitoring.md
---

# Observability — Grafana SoT / Datadog archive

2026-05-28 기준 공개 운영 안내는 Grafana + Prometheus 가 SoT 다. Prometheus 는
`study-note-api` 의 `/api/metrics` 를 scrape 하고 Grafana dashboard
`study-note-ops` 가 API 호출량, 5xx, p95 지연, CAS 충돌, sync outcome, Node.js
heap/event-loop 를 표시한다.

Datadog integration 은 developer-only archive 로 남긴다. 대시보드 JSON 은
`docs/monitoring/datadog-study-note-ops-dashboard.json` 에 보존하지만,
`/admin.html#ops` 는 더 이상 `/api/v1/admin/ops-dashboard` 를 호출하지 않는다.
해당 화면은 Grafana CTA 만 활성화하고 Datadog 조회 버튼은 비활성 상태로 보여준다.

## BE log-derived emit points (legacy Datadog / logs)

| metric | source | severity | meaning |
|---|---|---|---|
| `sync.put.success` (type=update/create) | `pdf-annotations.service` putAnnotation 성공 직전 | INFO | 정상 sync write count. type=update (CAS 분기) vs type=create (신규). |
| `sync.put.failure` (reason=r2_write_failed) | `pdf-annotations.service` r2 write fail + rollback | WARN | R2 write fail count. compensating delete/updateMany 실행 후 emit. |
| `annotation.cas.stale` | `pdf-annotations.service` CAS count=0 + existing != null | WARN | client 가 stale revision 보낸 case. stale conflict 빈도. |
| `annotation.batch.size` (total/returned/truncated) | `pdf-annotations.service` batch GET 응답 직전 | INFO | batch list 분포 (truncated 비율 / returned 평균). |
| `[Term] action=...` / `[Subject] action=...` | terms/subjects service mutation | WARN | admin CRUD audit. action=create|update|delete|move |
| `[Admin] role update / devUserFlag update / review marked` | admin service | INFO | admin user mutation audit. |

## FE RUM custom actions (trackRumAction)

| action | source | context | meaning |
|---|---|---|---|
| `pen-stroke.next-paint` | `main.ts` ink commit RAF | `{ durationMs }` | iPad 펜 한박자 fix 의 next-paint latency (S4 AC19). |
| `pdf_upload_started` | `main.ts` importPdfMaterialFile | `{ file_size_bucket }` | PDF upload start count. |
| `login_completed` | `main.ts` signIn success | `{ role }` | login conversion. |
| `sign_up_started` | `main.ts` auth-tab-signup click | — | signup funnel start. |

## Span / trace conventions

- BE NestJS controller/service spans = dd-trace auto-instrument (ACA `serverless-init`).
- repo 는 `DD_TRACE_SPAN_ATTRIBUTE_SCHEMA` 를 설정하지 않는다. dd-trace v5 기본값은
  `v0` 이므로 service-entry trace metric 은 `trace.web.request`,
  `trace.web.request.hits`, `trace.web.request.errors` 를 사용한다.
- propagation = HTTP header `x-datadog-trace-id` (RUM → APM 자동).
- 2026-05-28: ACA `serverless-init` workloadmeta init fail 로 backend APM metric 은
  안정적이지 않다. 공개 운영 판단은 Grafana 로 한다.

## Admin ops snapshot (legacy/internal)

- source: `apps/api/src/admin/ops-dashboard.service.ts`
- API metrics: Datadog Metrics v1 query (`trace.web.request.*`)
- log counts: Datadog Logs v2 aggregate (`metric=sync.put.*`,
  `metric=annotation.cas.stale`)
- RUM counts: Datadog RUM v2 aggregate (`@type:session`, `@type:error`,
  `@type:action`)
- required secrets: `DD_API_KEY`, `DD_APP_KEY`
- current FE usage: disabled; admin SPA points users to Grafana only.

## Backlog (다음 sprint)

- Grafana screenshot/runbook 을 최신 상태로 유지.
- Prometheus alert rule 후보 결정 (p95 latency / 5xx / sync failure).
- Datadog 를 다시 공개 경로로 승격하려면 ACA sidecar 비용/안정성 spike 후 별도 결정.
