# SLO 정의 (SoT)

sprint-W22-sprint-24 / AC9. 본 문서가 단일 원천.
Datadog UI 의 *Service Mgmt → SLO* 등록 시 본 정의를 1:1 옮긴다.

## 공통 정책

- baseline window = **7d (rolling)**. 7일 누적 후 alert 활성 (Deferred AC9-2).
- error budget burn alert = **Google SRE 표준 multi-window**.
  - fast: 1h window > **14.4×** burn rate → page.
  - slow: 6h window > **6×** burn rate → ticket.
- alert routing = sprint-15 keep-alive workflow 와 동일 channel.
- env = `production` only (`env:production` 태그 필수).

## SLO 3

### 1. API Availability

- objective: **99.5%** (월 약 3.6h 다운 허용).
- numerator: `study_note_http_requests_total{status=~"2..|3..", route!~"/api/health.*"}`
- denominator: `study_note_http_requests_total{route!~"/api/health.*"}`
- 출처: prom-client `MetricsService.observeHttp`.
- 비고: `/api/health` 는 keep-alive ping 이므로 제외해야 사용자 트래픽 기준이 된다.

### 2. Latency p95 < 800ms

- objective: **95%** of requests under 800ms (per 1m window).
- threshold: histogram `study_note_http_request_duration_seconds` bucket le=0.8 점유율 ≥ 0.95.
- 비고: cold-start tick (sprint-15 keep-alive) 가 1~2% spike. burn 평가 시 99분위만 추적.

### 3. Sync success rate

- objective: **99.0%** of `study_note_sync_put_total` outcomes = `success`.
- numerator: `study_note_sync_put_total{outcome="success"}`
- denominator: `study_note_sync_put_total`
- 비고: `outcome="stale"` (409 CAS 충돌) 은 user retry 로 회복 가능 → success 가 아니지만 사업 영향 약하다. 별 panel 에서 stale rate 분리 표시.

## Burn rate monitor (6 = 3 SLO × fast + slow)

각 SLO 별 multi-window:

| monitor | window | burn rate | severity |
|---|---|---|---|
| `slo.api_availability.burn_fast` | 1h | > 14.4× | P1 page |
| `slo.api_availability.burn_slow` | 6h | > 6× | P2 ticket |
| `slo.latency_p95.burn_fast` | 1h | > 14.4× | P1 page |
| `slo.latency_p95.burn_slow` | 6h | > 6× | P2 ticket |
| `slo.sync_success.burn_fast` | 1h | > 14.4× | P1 page |
| `slo.sync_success.burn_slow` | 6h | > 6× | P2 ticket |

`burn rate = (1 - SLI) / (1 - SLO)` 의 windowed 적용. Datadog SLO UI 의 자동 burn rate alert 활용.

## 7일 baseline dry-run

- T+0d: SLO 등록 + monitor 생성, alert **mute**.
- T+7d: 누적 data 검토. 비정상 burn 없으면 alert unmute.
- T+30d: 첫 retro — error budget 소진율 + alert noise 평가.
