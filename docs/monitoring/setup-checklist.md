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

## 4. First Verification

- Deploy FE from a new `fe-v*` tag after the RUM code is committed.
- Open `https://study-note.910701.xyz`.
- Confirm a RUM session in Datadog.
- Test login and PDF upload actions.

## 5. Hackle

Hackle can be revisited later for feature flags and A/B testing. For now,
Datadog RUM/Product Analytics is the default because the student-pack account is
already active.
