---
title: Monitoring Setup Checklist
owner: infra
status: draft
created_at: 2026-05-22
last_reviewed_at: 2026-05-27
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
- Datadog `Organization Settings` -> `Application Keys`에서 admin snapshot용
  application key를 만든다.
- Azure Container Apps `study-note-api`에 secret `dd-api-key`를 추가한다.
- Azure Container Apps `study-note-api`에 secret `dd-app-key`를 추가한다.
- Container App environment variable에 `DD_API_KEY=secretref:dd-api-key`를 연결한다.
- Container App environment variable에 `DD_APP_KEY=secretref:dd-app-key`를 연결한다.
- 다음 BE 배포 태그부터 Docker image가 `dd-trace`와 `serverless-init`로 실행된다.
- 배포 후 Datadog `APM` -> `Services`에서 `study-note-api`가 생성되는지 확인한다.

Azure CLI equivalent:

```sh
az containerapp secret set \
  --name study-note-api \
  --resource-group study-note-be-rg \
  --secrets \
    dd-api-key=<DATADOG_API_KEY> \
    dd-app-key=<DATADOG_APPLICATION_KEY>

az containerapp update \
  --name study-note-api \
  --resource-group study-note-be-rg \
  --set-env-vars \
    DD_API_KEY=secretref:dd-api-key \
    DD_APP_KEY=secretref:dd-app-key \
    DD_SITE=us5.datadoghq.com
```

Required production env:

```text
DD_API_KEY=secretref:dd-api-key
DD_APP_KEY=secretref:dd-app-key
DD_SERVICE=study-note-api
DD_ENV=production
DD_VERSION=<be tag version>
DD_SITE=us5.datadoghq.com
DD_TRACE_ENABLED=true
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
- Sign in as master/admin and open `/admin.html`; confirm the 운영 지표 panel
  returns `ready` or `partial` instead of `not_configured`.

## 6. Operations Dashboard

Dashboard payload:

- `docs/monitoring/datadog-study-note-ops-dashboard.json`

Import it in Datadog US5 from the dashboard JSON editor. Confirm template
variables after import:

```text
env=production
service=study-note-api
web_service=study-note-web
```

The dashboard uses:

- APM trace metrics from the actual dd-trace default v0 operation:
  `trace.web.request`, `trace.web.request.hits`, and
  `trace.web.request.errors`.
- Log text searches for the actual backend messages containing
  `metric=sync.put.success`, `metric=sync.put.failure`,
  `metric=annotation.cas.stale`, and `metric=annotation.batch.size`.
- RUM event queries for sessions, browser errors, and login/signup/PDF upload
  product actions.

The admin dashboard uses the same live sources through
`GET /api/v1/admin/ops-dashboard`. It requires both `DD_API_KEY` and
`DD_APP_KEY`; without them, the endpoint returns a safe `not_configured`
snapshot for review/debugging.

## 7. Optional Log Facets

The dashboard works without custom log parsing because it searches the raw log
message text. Create these Datadog facets only for nicer manual drill-downs:

| Facet | Required for |
|---|---|
| `@metric` | Selecting `sync.put.*` and `annotation.*` log metrics. |
| `@type` | Splitting sync write success into `create` and `update`. |
| `@reason` | Splitting sync failures by cause. |
| `@truncated` | Splitting batch annotation load shape. |

Do not promote user or material identifiers as dashboard facets. Keep the
operations view at service/resource/reliability granularity.

## 8. Release Check Routine

After each production tag:

1. Set dashboard time range to 15 minutes.
2. Filter `env=production`.
3. For BE releases, inspect the Release Comparison panel grouped by `version`.
4. Check API errors, then p95 latency, then slow/erroring resources.
5. Check annotation sync failure and stale conflict widgets.
6. Check RUM browser errors and key product actions.
7. Drill into the failing APM resource, trace, or log group if any panel is red.

## 9. Hackle

Hackle can be revisited later for feature flags and A/B testing. For now,
Datadog RUM/Product Analytics is the default because the student-pack account is
already active.
