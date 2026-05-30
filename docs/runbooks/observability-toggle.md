# Runbook — 운영 대시보드 (Grafana + Prometheus) 비활성화 / 재활성화

Grafana / Prometheus 는 비용 관리를 위해 한시 운영합니다. 지원·이력서 제출 시점에 다시 켜고,
그 외 기간에는 끄는 토글 절차입니다. 이미지·config·secret·Azure Files volume 은 끄더라도
유지되므로, 재활성화는 replica 토글만으로 복원됩니다 (데이터는 재가동 시점부터 새로 적재).

대상 ACA Container App (resource group `study-note-be-rg`):
- `study-note-grafana`
- `study-note-prometheus`

`study-note-api` 는 끄지 않습니다 (서비스 본체). API 의 `/api/metrics` 는 계속 노출되며,
끄는 것은 수집(Prometheus)과 시각화(Grafana) lane 뿐입니다.

## 비용 절감 상태 = scale-to-zero (기본 운영 상태)

> ⚠️ ACA 제약 (2026-05-30 실측):
> - `--max-replicas 0` 은 거부됨 → `ERROR: --max-replicas must be in the range [1,1000]`.
> - `az containerapp stop` 도 이 환경 containerapp extension 에서 미지원(`'stop' is misspelled or not recognized`).
>
> 따라서 "끄기" = **scale-to-zero (`--min-replicas 0 --max-replicas 1`)**. idle 시 replica 가
> 0 으로 내려가 **컴퓨트 비용 0**, 링크 접속 시 자동 기동되어 수 초 cold start 후 라이브로 응답.

```bash
RG=study-note-be-rg
az containerapp update -n study-note-grafana    -g $RG --min-replicas 0 --max-replicas 1
az containerapp update -n study-note-prometheus -g $RG --min-replicas 0 --max-replicas 1
```

후속:
1. 루트 `README.md` 상단 "라이브 대시보드 운영 상태" 배지를 🟢 **on-demand (scale-to-zero)** 로 유지.
2. `docs/portfolio/dashboards/` 의 스냅샷이 최신인지 확인 (즉시 확인용 대체 자료).
3. (선택) Datadog lane 은 그대로 두면 APM/Logs 는 계속 수집됨 — 완전 중단하려면 별도.

### 완전 무응답(hard-off)이 필요할 때 (선택)
scale-to-zero 는 링크 접속 시 cold start 로 응답한다. URL 자체를 무응답으로 막으려면:
```bash
RG=study-note-be-rg
az containerapp ingress disable -n study-note-grafana    -g $RG   # 재활성화는 ingress enable + target-port 재지정 필요
az containerapp ingress disable -n study-note-prometheus -g $RG
```
평상시엔 불필요(scale-to-zero 로 비용은 이미 0).

## 재활성화 (지원·이력서 제출 시점)

```bash
RG=study-note-be-rg
# scale-to-zero 허용 (idle 시 자동 절전, 호출 시 기동) — 비용 최소
az containerapp update -n study-note-prometheus -g $RG --min-replicas 0 --max-replicas 1
az containerapp update -n study-note-grafana    -g $RG --min-replicas 0 --max-replicas 1
```

상시 가동(절전 없이 즉시 응답)을 원하면 `--min-replicas 1`.

후속 검증:
1. revision 활성 + Healthy 확인:
   ```bash
   az containerapp revision list -n study-note-grafana    -g $RG --query "[?properties.active].{name:name,health:properties.healthState}" -o table
   az containerapp revision list -n study-note-prometheus -g $RG --query "[?properties.active].{name:name,health:properties.healthState}" -o table
   ```
2. Grafana 대시보드 4종 노출 확인:
   ```bash
   curl -s "https://study-note-grafana.bluesea-474361c6.koreacentral.azurecontainerapps.io/api/search?type=dash-db" \
     | python3 -c "import sys,json;[print(d['uid']) for d in json.load(sys.stdin)]"
   # 기대: study-note-ops / study-note-product / study-note-cost / study-note-slo
   ```
3. Prometheus scrape 정상 (study-note-api 메트릭 인입):
   ```bash
   TOKEN=$(az containerapp secret show -n study-note-api -g $RG --secret-name metrics-internal-token --query value -o tsv)
   curl -s -H "Authorization: Bearer $TOKEN" \
     "https://study-note-api.bluesea-474361c6.koreacentral.azurecontainerapps.io/api/metrics?n=$(date +%s)" \
     | grep -c "^study_note_"
   ```
4. 데모 트래픽으로 라이브 차트 채우기 (선택) — README 의 부하 스크립트 또는 `/admin.html#ops` 진입 후 사용.
5. 루트 `README.md` 배지를 🟢 **활성** 으로 변경.

## 주의

- secret (`metrics-internal-token`, `cloudflare-r2-analytics-token` 등) 과 Azure Files
  volume (`prometheus-data`) 은 토글과 무관하게 보존됩니다. 삭제하지 않습니다.
- Prometheus tsdb 는 영속 volume 에 있으나, 비활성 기간 동안에는 scrape 가 멈추므로
  그 구간 데이터는 비어 있습니다 (재가동 후부터 다시 적재). 이는 정상입니다.
- 완전 삭제(`az containerapp delete`)는 하지 않습니다 — 재활성화가 toggle 로 끝나지 않게 됩니다.
