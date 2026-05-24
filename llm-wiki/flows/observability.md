---
title: Observability — Datadog metric / span / RUM emit points
visibility: raw-internal
created: 2026-05-24
related_handoff: docs/solon/handoff/20260523-datadog-ops-monitoring.md
---

# Observability — Datadog metric / span / RUM emit points

sprint-W21-sprint-1 의 Datadog 2차 integration partial (코드 측 emit 만).
대시보드 / monitor / alert UI 는 user scope.

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
- propagation = HTTP header `x-datadog-trace-id` (RUM → APM 자동).

## Backlog (다음 sprint)

- 운영 dashboard JSON commit (Service Summary + endpoint top list + alert monitor).
- RUM ↔ APM ↔ Logs 상관관계 검증 (sample trace).
- SLO threshold 결정 (p95 latency / error rate).
