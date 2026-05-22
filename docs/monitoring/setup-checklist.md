---
title: Monitoring Setup Checklist
owner: infra
status: draft
created_at: 2026-05-22
last_reviewed_at: 2026-05-22
---

# Monitoring Setup Checklist

## 1. Datadog RUM

- Use `https://us5.datadoghq.com`.
- Create a JavaScript RUM app named `study-note-web`.
- Keep `applicationId` and `clientToken`.
- Do not use Datadog API Key in frontend env.

## 2. Vercel Production Env

```text
VITE_DD_APPLICATION_ID=<Datadog RUM application id>
VITE_DD_CLIENT_TOKEN=<Datadog RUM client token>
VITE_DD_SITE=us5.datadoghq.com
VITE_DD_SERVICE=study-note-web
VITE_DD_ENV=production
VITE_DD_SESSION_REPLAY_SAMPLE_RATE=0
VITE_DD_TRACK_USER_INTERACTIONS=false
```

Redeploy after changing env. Vite reads `VITE_*` values at build time.

## 3. Azure Integration

- Datadog `Integrations` -> `Azure`.
- Use Quickstart.
- Run the generated script in Azure Cloud Shell.
- Confirm `azure.app_containerapps.*` metrics for `study-note-api`.

## 4. Backend APM

- Datadog `Organization Settings` -> `API Keys`에서 API key를 만든다.
- Azure Container Apps `study-note-api`에 secret `dd-api-key`를 추가한다.
- Container App environment variable에 `DD_API_KEY=secretref:dd-api-key`를 연결한다.
- 다음 BE 배포 태그부터 Docker image가 `dd-trace`와 `serverless-init`로 실행된다.
- 배포 후 Datadog `APM` -> `Services`에서 `study-note-api`가 생성되는지 확인한다.

Azure CLI equivalent:

```sh
az containerapp secret set \
  --name study-note-api \
  --resource-group study-note-be-rg \
  --secrets dd-api-key=<DATADOG_API_KEY>

az containerapp update \
  --name study-note-api \
  --resource-group study-note-be-rg \
  --set-env-vars DD_API_KEY=secretref:dd-api-key
```

Required production env:

```text
DD_API_KEY=secretref:dd-api-key
DD_SERVICE=study-note-api
DD_ENV=production
DD_VERSION=<be tag version>
DD_SITE=us5.datadoghq.com
DD_LOGS_ENABLED=true
DD_LOGS_INJECTION=true
DD_SOURCE=nodejs
```

## 5. First Verification

- Deploy FE from a new `fe-v*` tag after the RUM code is committed.
- Open `https://study-note.910701.xyz`.
- Confirm a RUM session in Datadog.
- Test login and PDF upload actions.
- Deploy BE from a new `be-v*` tag after adding the Azure secret.
- Open `https://study-note.api.910701.xyz/api/health`.
- Confirm APM traces and logs under service `study-note-api`.

## 6. Hackle

Hackle can be revisited later for feature flags and A/B testing. For now,
Datadog RUM/Product Analytics is the default because the student-pack account is
already active.
