# infra/grafana — dashboard SoT

Grafana 운영 dashboard JSON 코드화 (별 ACA `study-note-grafana` import).

## 디렉토리

- `provisioning/` — provisioning manifest (datasource / dashboard provider).
- `dashboards/` — 코드 SoT JSON. UI 에서 수정 후 export → 본 디렉토리로 PR.

## 등록 dashboard

| 파일 | uid | 용도 |
|---|---|---|
| `study-note-ops.json` | `study-note-ops` | 기존 HTTP / sync 메트릭 (sprint-W22-be-sync). |
| `study-note-product.json` | `study-note-product` | sprint-W22-sprint-24 / AC5 — 사용자 / 콘텐츠 / 역할 분포 (30min cron). |
| `study-note-cost.json` | `study-note-cost` | sprint-W22-sprint-24 / AC6 — R2 / MySQL / DD ingestion (6h cron). |
| `study-note-slo.json` | `study-note-slo` | sprint-W22-sprint-24 / AC7 — 3 SLO + burn rate 안내 (alert 본체는 DD). |

## Import 순서 (배포 후 user 작업)

1. `study-note-product.json` import.
2. `study-note-cost.json` import.
3. `study-note-slo.json` import.

각 JSON 의 datasource = default Prometheus. mixed datasource 가 필요할 경우 패널별로 override.

## metric 출처

- Prom (`/api/metrics`, scrape interval 15s, AC14 token 게이트):
  - `study_note_http_*`, `study_note_sync_*` — middleware.
  - `study_note_product_*`, `study_note_cost_*` — cron dual-emit (Prom + DD).
- Datadog (log-derived, SoT = `docs/observability/log-derived-metrics.md`):
  - `study_note.event.signup` / `signin` / `pdf_upload` / `annotation_put` / `mcp_call`.
  - widget create 5 = deferred.

## SLO / Alert

`docs/observability/slos.md` SoT. Datadog Service Mgmt 에서 SLO + burn rate monitor 6 등록.
