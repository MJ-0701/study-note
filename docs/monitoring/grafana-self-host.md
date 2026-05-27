---
title: Grafana + Prometheus 자체 호스팅 가이드
owner: infra
status: draft
created_at: 2026-05-28
last_reviewed_at: 2026-05-28
---

# Grafana + Prometheus on ACA (B path)

study-note 운영 지표의 두 번째 channel.

- **A** (already live) = Datadog (push). admin SPA `/admin.html#ops` panel + Datadog Public Dashboard URL.
- **B** (이 문서) = Prometheus (pull) + Grafana. study-note-api `/api/metrics` 를 scrape, Grafana 가 시각화. Datadog plugin 이 enterprise-only 라서 무료 self-host stack 별도 구축.

## 구성

| Component | image | port | ACA Container App |
|---|---|---|---|
| study-note-api | (기존) | 3000 (인지 internal) | `study-note-api` (기존) |
| Prometheus | `ghcr.io/<owner>/study-note-prometheus:latest` | 9090 | `study-note-prometheus` (신규) |
| Grafana | `ghcr.io/<owner>/study-note-grafana:latest` | 3000 | `study-note-grafana` (신규) |

같은 Container Apps Environment 안. ACA service discovery 가 internal FQDN (`study-note-prometheus`, `study-note-grafana`) 로 호출 가능.

## Image build + push

`infra-v*` tag 푸시 → `.github/workflows/infra-release.yml` 가 두 image 빌드 + ghcr push.

```bash
# repo 안에서
git tag -a infra-v0.1.0 -m "first Prometheus + Grafana image build"
git push origin infra-v0.1.0
```

또는 workflow_dispatch 로 수동 실행:

```bash
gh workflow run infra-release.yml
```

빌드 끝나면 GHCR 에 이미지 두 개:
- `ghcr.io/mj-0701/study-note-prometheus:latest`
- `ghcr.io/mj-0701/study-note-grafana:latest`

GHCR 이미지가 private 면 ACA 가 GHCR pull 권한 필요. workflow 가 `packages: write` 권한으로 push 하지만, public/private 가시성은 ghcr.io 콘솔에서 별 설정. **public 권장** (운영 image 자체에 secret 없음).

## ACA Prometheus Container App 생성

```bash
# admin password 등 secret 없음 — Prometheus 는 internal 만 expose 권장.
# 단 demo 용으로 external = true 도 가능 (anonymous read).
az containerapp create \
  --name study-note-prometheus \
  --resource-group study-note-be-rg \
  --environment study-note-be-env \
  --image ghcr.io/mj-0701/study-note-prometheus:latest \
  --target-port 9090 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.25 \
  --memory 0.5Gi

# 만약 environment 이름이 다르면:
#   az containerapp env list --resource-group study-note-be-rg
# 로 정확한 environment 이름 확인.
```

(Container Apps Environment 이름 확인 = `az containerapp show -n study-note-api -g study-note-be-rg --query properties.managedEnvironmentId -o tsv`.)

## ACA Grafana Container App 생성

```bash
# admin 비밀번호 (anonymous read 외 admin 작업 시).
az containerapp secret set \
  --name study-note-grafana \
  --resource-group study-note-be-rg \
  --secrets grafana-admin-password=<STRONG_PASSWORD>

# 단 secret set 은 container app 가 존재해야 함. 첫 create 시 --secrets 같이.
az containerapp create \
  --name study-note-grafana \
  --resource-group study-note-be-rg \
  --environment study-note-be-env \
  --image ghcr.io/mj-0701/study-note-grafana:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --secrets grafana-admin-password=<STRONG_PASSWORD> \
  --env-vars \
    GF_SECURITY_ADMIN_PASSWORD=secretref:grafana-admin-password
```

생성 후 fqdn 확인:

```bash
az containerapp show \
  --name study-note-grafana \
  --resource-group study-note-be-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv
# 예: study-note-grafana.bluesea-474361c6.koreacentral.azurecontainerapps.io
```

## admin SPA link 활성

발급된 Grafana FQDN 을 Vercel env 에 등록 — admin ops 탭 link 두 번째:

```bash
# 만약 Datadog public URL 만 link 표시 중이라면 두 개 별도 노출:
# 옵션 1: VITE_PUBLIC_DASHBOARD_URL 를 Grafana 로 바꾸고 Datadog 는 별도 env
# 옵션 2: VITE_PUBLIC_DASHBOARD_URL_2 신규 (코드 변경 필요)

vercel env add VITE_PUBLIC_DASHBOARD_URL production
# value: https://study-note-grafana.bluesea-474361c6.koreacentral.azurecontainerapps.io/d/study-note-ops
```

또는 Porkbun 도메인 `grafana.910701.xyz` → ACA Grafana fqdn 으로 CNAME → ACA custom domain binding + managed TLS. 안정적 URL.

## 검증 순서

1. **be-v0.1.15** (or later) BE deploy 후 → `curl https://study-note.api.910701.xyz/api/metrics` 가 Prometheus text format 반환 (HTTP 200, header `Content-Type: text/plain`).
2. `infra-v*` tag push → infra-release.yml 가 image build + ghcr push (2~3분).
3. ACA Prometheus + Grafana create (위 az 명령).
4. Grafana fqdn 접속 → "study-note Live Ops (Self-host, Prometheus)" dashboard 보임.
5. 처음엔 데이터 없음 — `curl https://study-note.910701.xyz/api/v1/auth/me` 등으로 traffic 발생시키면 채워짐 (15s scrape interval).

## 비용 추정

ACA 무료 credit:
- 매월 첫 180,000 vCPU-초 + 360,000 GiB-초 무료.
- Prometheus 0.25 vCPU + 0.5 GiB = ~648,000 vCPU-초/월 (24/7).
- Grafana 0.5 vCPU + 1.0 GiB = ~1,296,000 vCPU-초/월.

→ 무료 credit 부족할 수 있음. 결과 = 월 ~$15~30 추정 (Standard tier 기준).

비용 ↓ 옵션:
- min-replicas=0 — scale-to-zero. 단 Grafana 첫 접속 시 cold-start.
- 더 작은 cpu/memory.
- 또는 demo 용으로만 일시 띄우고 종료.

## Open question

- **TLS** — `grafana.910701.xyz` custom domain 시 ACA managed cert 자동 발급 (DNS validation 완료 후).
- **Auth** — anonymous read 활성. admin login 막으려면 `GF_AUTH_DISABLE_LOGIN_FORM=true`.
- **Persistence** — Prometheus / Grafana storage 가 ACA replicas restart 시 손실. 영속 필요 시 Azure Files volume mount.
