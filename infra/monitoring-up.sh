#!/usr/bin/env bash
# sprint-W22-be-sync/B — Grafana + Prometheus 임시 부팅.
# Azure for Students $100 credit 보호 = 면접/시연 직전 1회 띄움. 끝나면
# infra/monitoring-down.sh 로 즉시 종료.
#
# 전제:
#   1. az login 완료 + study-note-be-rg subscription active.
#   2. ghcr.io/mj-0701/study-note-{prometheus,grafana} image 가 public.
#      (안 public 이면 GitHub Packages 에서 visibility 변경 — docs 참조).
#   3. infra-v* image tag 빌드 완료 (infra-release.yml workflow success).

set -euo pipefail

RG="${RG:-study-note-be-rg}"
ENV_NAME="${ENV_NAME:-study-note-cae}"
GHCR_OWNER="${GHCR_OWNER:-mj-0701}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-}"

if [[ -z "${GRAFANA_PASSWORD}" ]]; then
  echo "[monitoring-up] ERROR: GRAFANA_PASSWORD env 필수 (Grafana admin)." >&2
  echo "  usage: GRAFANA_PASSWORD='<strong-password>' bash infra/monitoring-up.sh" >&2
  exit 2
fi

echo "[monitoring-up] resource group = ${RG} / env = ${ENV_NAME}"

# 1. Prometheus — internal ingress only (Grafana 만 접근).
echo "[monitoring-up] creating study-note-prometheus..."
az containerapp create \
  --name study-note-prometheus \
  --resource-group "${RG}" \
  --environment "${ENV_NAME}" \
  --image "ghcr.io/${GHCR_OWNER}/study-note-prometheus:${IMAGE_TAG}" \
  --target-port 9090 \
  --ingress internal \
  --min-replicas 1 --max-replicas 1 \
  --cpu 0.25 --memory 0.5Gi \
  --query "properties.configuration.ingress.fqdn" -o tsv

# 2. Grafana — external ingress + admin password secret.
echo "[monitoring-up] creating study-note-grafana..."
az containerapp create \
  --name study-note-grafana \
  --resource-group "${RG}" \
  --environment "${ENV_NAME}" \
  --image "ghcr.io/${GHCR_OWNER}/study-note-grafana:${IMAGE_TAG}" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 --max-replicas 1 \
  --cpu 0.5 --memory 1.0Gi \
  --secrets "grafana-admin-password=${GRAFANA_PASSWORD}" \
  --env-vars "GF_SECURITY_ADMIN_PASSWORD=secretref:grafana-admin-password" \
  --query "properties.configuration.ingress.fqdn" -o tsv

GRAFANA_FQDN="$(az containerapp show -n study-note-grafana -g "${RG}" --query 'properties.configuration.ingress.fqdn' -o tsv)"
echo ""
echo "[monitoring-up] DONE"
echo "  Grafana URL: https://${GRAFANA_FQDN}"
echo "  admin login: admin / <GRAFANA_PASSWORD>"
echo "  anonymous viewer = read-only OK"
echo ""
echo "  다음 step (admin SPA link 활성):"
echo "    vercel env add VITE_GRAFANA_URL production"
echo "    # value: https://${GRAFANA_FQDN}/d/study-note-ops"
echo "    git tag -a fe-v0.1.<next> -m 'grafana url'"
echo "    git push origin fe-v0.1.<next>"
echo ""
echo "  시연 끝나면 즉시 비용 보호 종료:"
echo "    bash infra/monitoring-down.sh"
