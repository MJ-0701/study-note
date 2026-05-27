---
title: Grafana + Prometheus 운영 runbook
owner: infra
status: live
created_at: 2026-05-28
last_reviewed_at: 2026-05-28
---

# Grafana + Prometheus on ACA

study-note 운영 지표의 공개 SoT.

- **Grafana** = 면접/시연/운영 안내용 dashboard.
- **Prometheus** = `study-note-api` 의 `/api/metrics` 를 15s 마다 scrape.
- **Datadog** = 개발자 참고용 legacy snapshot. admin SPA 에서는 조회 버튼 비활성화.

## 비용 메모

Azure for Students $100 credit + 현재 월 과금:
- MySQL Flex (B1ms, 20GB) ≈ ₩5,500/월 (확정).
- DNS ≈ ₩200/월.
- ACA api (min=1, 0.25 vCPU / 0.5 GiB) = 무료 grant 안 (현재 청구 0).

Grafana + Prometheus always-on (min=1) 는 추가 비용이 생길 수 있다:
- 0.75 vCPU + 1.5 GiB × 24h × 30d = 1.94M vCPU-s + 3.89M GiB-s.
- 무료 grant (180K vCPU-s / 360K GiB-s) 초과량 청구.
- **추정 idle ₩25,000~27,000/월 / active ₩86,000/월** — MySQL 보다 비쌈.

→ Grafana 를 공개 SoT 로 쓰되, 학생 크레딧 보호가 더 중요할 때는 아래 종료 절차로
scale-to-zero 한다.

## 사전 준비 (한 번만)

### A. GHCR image public 변경

GitHub.com → 본인 profile → **Packages** tab → 각 image:
- `study-note-prometheus` → Settings → "Danger Zone" → **Change visibility → Public**.
- `study-note-grafana` → 동일.

(private 면 ACA pull 시 PAT secret 필요 — public 이 간단.)

### B. ACA Environment 이름 = `study-note-cae`

```bash
az containerapp env list -g study-note-be-rg --query "[].name" -o tsv
# study-note-cae
```

## 부팅 (시연 전)

```bash
bash infra/monitoring-up.sh
```

또는 npm script:

```bash
pnpm run infra:monitoring:up
```

내부 동작:
1. Prometheus container app create (internal ingress, min=1, 0.25 vCPU/0.5 GiB).
2. Grafana container app create (external ingress, min=1, 0.5 vCPU/1.0 GiB, secret password).
3. Grafana fqdn 출력.

부팅 후 user action:
```bash
# Grafana URL 변경 시 admin SPA link 갱신.
vercel env add VITE_GRAFANA_URL production
# value: https://<grafana-fqdn>/d/study-note-ops
git tag -a fe-v0.1.<next> -m "redeploy with grafana url"
git push origin fe-v0.1.<next>
```

현재 admin SPA 는 `VITE_GRAFANA_URL` 이 없어도 production Grafana dashboard URL 로 fallback 한다.

## 종료 (크레딧 보호가 필요할 때)

비용을 0 에 가깝게 줄여야 하면:

```bash
bash infra/monitoring-down.sh
```

또는:

```bash
pnpm run infra:monitoring:down
```

내부 동작 (택 1):
- **A. scale-to-zero** (resource 보존, 빠른 재기동):
  ```bash
  az containerapp update -n study-note-grafana    -g study-note-be-rg --min-replicas 0 --max-replicas 1
  az containerapp update -n study-note-prometheus -g study-note-be-rg --min-replicas 0 --max-replicas 1
  ```
  → 진행: replicas=0 / 차세 idle traffic 들어오면 cold-start. Prometheus 는 scrape 안 함 (멈춤).
  → 비용: ACA 0, idle 시.
- **B. 완전 삭제** (가장 안전):
  ```bash
  az containerapp delete -n study-note-grafana    -g study-note-be-rg --yes
  az containerapp delete -n study-note-prometheus -g study-note-be-rg --yes
  ```
  → 다음에 다시 띄울 때 `monitoring-up.sh` 재실행.

권장 = **A (scale-to-zero)** — 부팅 빠름. 더 안전 원하면 **B**.

## Caveat

- **Prometheus min=0**: scrape 안 함. data 손실 (no PV). 장기 retention 불가.
- **Grafana min=0**: cold-start 첫 접속 시 10~30s 지연.
- **장기 historical monitoring**: Prometheus 에 PV 가 없어 scale-to-zero 중 data 는 남지 않는다.
- **External ingress 보안**: Grafana 가 외부 노출됨 — 강한 admin password + anonymous viewer (read-only).
- **Prometheus 는 internal only** — 외부 노출 X.

## 사용 흐름 요약

```
시연 30분 전:
  bash infra/monitoring-up.sh
  → vercel env add VITE_GRAFANA_URL ...
  → fe-v0.1.<next> tag push

시연 진행:
  /admin.html#ops 에 Grafana link 표시.
  Datadog 조회 버튼은 비활성화 상태.
  면접관 click → 외부 Grafana 대시보드 (24h scale).

크레딧 보호가 필요할 때:
  bash infra/monitoring-down.sh
  → 청구 0.

(VITE_GRAFANA_URL 은 env 에 남겨도 OK — URL 만 dead link 됨.
admin SPA 가 fetch 안 함, 단순 anchor.)
```

## 추가 비용 보호 옵션

study-note-api min-replicas=1 도 비용 잠재 — 면접 외 idle 시 0 로 변경 고려:

```bash
# 시연 끝나면 (학생 크레딧 보호)
az containerapp update -n study-note-api -g study-note-be-rg --min-replicas 0
```

→ cold-start 5~35s 다시 발생. UptimeRobot keep-alive 가 완화. 일상 운영 시 trade-off.
