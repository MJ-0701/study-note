---
title: Monitoring Setup Checklist
owner: infra
status: active
created_at: 2026-05-22
last_reviewed_at: 2026-05-28
---

# Monitoring Setup Checklist

Grafana + Prometheus 가 공개 운영 안내의 SoT 이다. Datadog 은 개발자 참고용 legacy
snapshot 으로 보존하지만, `/admin.html#ops` 에서는 더 이상 Datadog API 를 호출하지 않는다.

## 1. Grafana / Prometheus Runtime

- Azure Container Apps environment: `study-note-cae`.
- Prometheus app: `study-note-prometheus` (internal ingress).
- Grafana app: `study-note-grafana` (external ingress).
- Prometheus scrape target: `study-note-api` `/api/metrics`.
- Grafana dashboard URL:
  <https://study-note-grafana.bluesea-474361c6.koreacentral.azurecontainerapps.io/d/study-note-ops>

## 2. Frontend Env

`VITE_GRAFANA_URL` 은 선택값이다. 미설정 시 admin SPA 는 production Grafana dashboard
URL 로 fallback 한다.

```text
VITE_GRAFANA_URL=https://study-note-grafana.bluesea-474361c6.koreacentral.azurecontainerapps.io/d/study-note-ops
VITE_GRAFANA_LABEL=Grafana 운영 대시보드
```

Datadog public dashboard URL 은 더 이상 frontend 안내에 사용하지 않는다.

## 3. First Verification

1. Open `https://study-note.910701.xyz`.
2. Sign in as master/admin.
3. Open `/admin.html#ops`.
4. Confirm:
   - `Grafana + Prometheus 기준` text is visible.
   - `Datadog 조회 비활성화` button is disabled.
   - `Grafana 운영 대시보드 열기` opens the Grafana dashboard.
5. In Grafana, confirm API request count, 5xx, p95 latency, route throughput,
   CAS conflicts, Node.js heap, and event loop panels render data.

## 4. Grafana Dashboard Panels

| Panel | Source | Purpose |
|---|---|---|
| API 호출량 (5분) | Prometheus | Recent request volume. |
| 5xx 오류 (5분) | Prometheus | Backend 5xx pulse. |
| p95 응답 지연 | Prometheus histogram | Review slow responses quickly. |
| CAS 충돌 (총) | Prometheus counter | Detect stale annotation writes. |
| API 호출량 — route 별 | Prometheus labels | Compare endpoint traffic. |
| 응답 지연 — p50/p95/p99 | Prometheus histogram | Latency distribution. |
| 필기 자동저장 — outcome 별 | Prometheus counter | Sync success/failure/stale pulse. |
| Node.js 프로세스 — heap / event loop | Prometheus / Node metrics | Runtime health. |

## 5. Cost Routine

Grafana/Prometheus always-on can exceed the free ACA grant. If student credit
protection is more important than always-on monitoring:

```sh
pnpm run infra:monitoring:down
```

To bring it back:

```sh
GRAFANA_PASSWORD='<strong-password>' pnpm run infra:monitoring:up
```

## 6. Datadog Archive

Kept for developer-only investigation:

- `docs/monitoring/datadog-study-note-ops-dashboard.json`
- `docs/monitoring/datadog-dashboard.md`
- `GET /api/v1/admin/ops-dashboard`

2026-05-28 status: Datadog RUM has data, but backend APM trace metrics are not
reliable on ACA because `serverless-init` reports workloadmeta initialization
failures. Do not use Datadog as the public demo path.
