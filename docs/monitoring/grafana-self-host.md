---
title: Grafana + Prometheus 임시 부팅 runbook (Azure for Students 비용 보호)
owner: infra
status: temporary
created_at: 2026-05-28
last_reviewed_at: 2026-05-28
---

# Grafana + Prometheus on ACA — 임시 사용 전용

study-note 운영 지표의 보조 channel.

- **Always-on** = Datadog (push). admin SPA `/admin.html#ops` panel + Datadog Public Dashboard URL. **여기가 SoT**.
- **Temporary self-host** = Prometheus (pull) + Grafana. 면접/시연/운영 확인 직전에 **올렸다 끄는** 운영. 학생 크레딧 ($100) 안 영구 상시 운영 X.

## 왜 임시인가

Azure for Students $100 credit + 현재 월 과금:
- MySQL Flex (B1ms, 20GB) ≈ ₩5,500/월 (확정).
- DNS ≈ ₩200/월.
- ACA api (min=1, 0.25 vCPU / 0.5 GiB) = 무료 grant 안 (현재 청구 0).

Grafana + Prometheus always-on (min=1) 추가 비용:
- 0.75 vCPU + 1.5 GiB × 24h × 30d = 1.94M vCPU-s + 3.89M GiB-s.
- 무료 grant (180K vCPU-s / 360K GiB-s) 초과량 청구.
- **추정 idle ₩25,000~27,000/월 / active ₩86,000/월** — MySQL 보다 비쌈.

→ 항상 띄우지 않는다. 시연 전 부팅, 끝나면 종료.

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
# Grafana URL 받아서 admin SPA link 활성 (선택).
vercel env add VITE_GRAFANA_URL production
# value: https://<grafana-fqdn>/d/study-note-ops
git tag -a fe-v0.1.<next> -m "redeploy with grafana url"
git push origin fe-v0.1.<next>
```

## 종료 (시연 후)

**시연 끝나면 즉시**:

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

기본 = **A (scale-to-zero)** — 부팅 빠름. 더 안전 원하면 **B**.

## Caveat

- **Prometheus min=0**: scrape 안 함. data 손실 (no PV). 장기 retention 불가.
- **Grafana min=0**: cold-start 첫 접속 시 10~30s 지연.
- **장기 historical monitoring** = Datadog 가 SoT. self-host 는 demo / spike 용.
- **External ingress 보안**: Grafana 가 외부 노출됨 — 강한 admin password + anonymous viewer (read-only).
- **Prometheus 는 internal only** — 외부 노출 X.

## 사용 흐름 요약

```
시연 30분 전:
  bash infra/monitoring-up.sh
  → vercel env add VITE_GRAFANA_URL ...
  → fe-v0.1.<next> tag push

시연 진행:
  /admin.html#ops 에 Datadog + Grafana 두 link 동시 표시.
  면접관 click → 외부 Grafana 대시보드 (24h scale).

시연 후 (즉시):
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
