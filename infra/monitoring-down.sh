#!/usr/bin/env bash
# sprint-W22-be-sync/B — Grafana + Prometheus 임시 종료 (Azure 비용 보호).
#
# 기본 = scale-to-zero (replicas=0). resource definition 보존, 다음 부팅 빠름.
# 완전 삭제 원하면 MODE=delete bash infra/monitoring-down.sh.
#
# Caveat:
#   - scale-to-zero 시 Prometheus 가 scrape 안 함. data 손실 (no PV).
#   - long-term retention 필요하면 Datadog (always-on) 사용.

set -euo pipefail

RG="${RG:-study-note-be-rg}"
MODE="${MODE:-scale-zero}"   # 'scale-zero' (default) or 'delete'

case "${MODE}" in
  scale-zero)
    echo "[monitoring-down] mode=scale-zero — replicas=0 (resource 보존)"
    az containerapp update -n study-note-grafana    -g "${RG}" --min-replicas 0 --max-replicas 1
    az containerapp update -n study-note-prometheus -g "${RG}" --min-replicas 0 --max-replicas 1
    echo "[monitoring-down] DONE (scale-to-zero) — 다시 부팅 = scale up 또는 monitoring-up.sh 의 az update 로 min=1."
    ;;
  delete)
    echo "[monitoring-down] mode=delete — container app 완전 삭제"
    az containerapp delete -n study-note-grafana    -g "${RG}" --yes
    az containerapp delete -n study-note-prometheus -g "${RG}" --yes
    echo "[monitoring-down] DONE (deleted) — 다시 부팅 = monitoring-up.sh 재실행."
    ;;
  *)
    echo "[monitoring-down] ERROR: MODE 는 'scale-zero' 또는 'delete' 만 허용." >&2
    exit 2
    ;;
esac
