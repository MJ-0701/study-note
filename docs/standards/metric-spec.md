# Metric Spec (조직 표준)

본 문서는 study-note BE/FE/인프라가 노출하는 모든 metric 의 namespace / 태그
정책 단일 원천이다. 변경 시 `docs/observability/*.md` 와 짝지어 갱신한다.

## Namespace

| prefix | source | 단위 / 의미 |
|---|---|---|
| `study_note_http_*` | `MetricsService.observeHttp` (in-process middleware) | HTTP counter + histogram. `{method, route, status}` 라벨. |
| `study_note_sync_*` | `MetricsService.observeSyncPut` | annotation PUT 결과 counter. `{outcome}` 라벨. |
| `study_note_annotation_cas_stale_total` | `observeSyncPut("stale")` 동시 증가 | CAS 충돌 counter. 라벨 없음. |
| `study_note.product.*` | `ProductMetricsCronService` (30min) | 13 gauge: 사용자/콘텐츠/역할/조직. dual-emit. |
| `study_note.cost.*` | `CostMetricsCronService` (6h) | 4 gauge: MySQL row / R2 / DD. dual-emit. |
| `study_note.slo.*` | Datadog SLO UI (정의 = `docs/observability/slos.md`) | API availability / latency p95 / sync success. |
| `study_note.event.*` | log-derived metric (Datadog UI 등록, `docs/observability/log-derived-metrics.md`) | 10 count: auth/identity 5 + widget create 5. |

`study_note.*` (dot.case) = Datadog namespace. Prom 으로 export 시 자동으로 `_` 로 치환되어 `study_note_product_users_total` 같은 형태가 된다.

## 라벨 정책

- **legacy HTTP/sync metric**: `{app="study-note-api"}` default + 기존 라벨 유지 (`method`, `route`, `status`, `outcome`). env / version 추가 X — 기존 Grafana panel 호환.
- **신규 product / cost gauge**: `{app, source, env, version}`. `source` = 어떤 cron 이 emit 했는지 (`product_metrics_cron`, `cost_metrics_cron`). env = `DD_ENV` 또는 `NODE_ENV`. version = `DD_VERSION` 또는 `APP_VERSION`.
- **log-derived event**: 라벨 없음 (group by 없음, raw count).
- **금지 라벨**: `userId`, `studentNumber`, `email`, `displayName`, `tokenHash`, 그 외 사용자 식별자. 어떤 metric 도 PII 를 라벨로 가질 수 없다 (AC12 / security-rules).

## Dual-emit 경계

- Prom: `/api/metrics` exposition. 별 ACA `study-note-prometheus` scraper 가 pull.
- DD dogstatsd: `tracer.dogstatsd.gauge(...)`. dd-trace serverless-init 컨테이너의 statsd agent 가 forward.
- emit 단계는 `MetricsService.emitGauge` 하나로 통합. 호출자는 dual-emit 여부를 알 필요 없음.

## 추가 시 절차

1. `MetricsService` 의 `KNOWN_GAUGES` 에 `{ name, help }` 등록.
2. 본 표 + `docs/observability/log-derived-metrics.md` 또는 `slos.md` 갱신.
3. 새 cron 또는 emit site 에서 `source` 태그 명시.
4. spec (PII grep 포함) 추가.
5. Grafana / Datadog UI 등록.
