---
title: Observability — Datadog metric / span / RUM emit points
visibility: raw-internal
created: 2026-05-24
last_reviewed: 2026-05-27
related_handoff: docs/solon/handoff/20260523-datadog-ops-monitoring.md
---

# Observability — Datadog metric / span / RUM emit points

sprint-W21-sprint-1 의 Datadog 2차 integration partial (코드 측 emit 만).
대시보드 JSON 은 `docs/monitoring/datadog-study-note-ops-dashboard.json` 에
현재 운영 연결 기준 live query 로 보존한다. Datadog 콘솔 import / monitor /
alert recipient 설정은 user scope.

앱 내부 운영 화면은 `/api/v1/admin/ops-dashboard` 로 같은 Datadog live query
계열을 서버 사이드에서 조회한다. master/admin 만 접근 가능하고, API key 는
브라우저로 내려가지 않는다.

## BE log-derived metrics (Datadog log scraper)

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

## Admin ops snapshot

- source: `apps/api/src/admin/ops-dashboard.service.ts`
- API metrics: Datadog Metrics v1 query (`trace.web.request.*`)
- log counts: Datadog Logs v2 aggregate (`metric=sync.put.*`,
  `metric=annotation.cas.stale`)
- RUM counts: Datadog RUM v2 aggregate (`@type:session`, `@type:error`,
  `@type:action`)
- required secrets: `DD_API_KEY`, `DD_APP_KEY`

## Backlog (다음 sprint)

- Datadog 콘솔에 운영 dashboard JSON import + sample traffic 으로 각 패널 숫자 확인.
- RUM ↔ APM ↔ Logs 상관관계 검증 (sample trace).
- SLO threshold 결정 (p95 latency / error rate).
- alert monitor JSON 또는 Terraform 관리 여부 결정.
