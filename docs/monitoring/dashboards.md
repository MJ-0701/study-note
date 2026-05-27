---
title: 운영 대시보드 안내 (Grafana)
owner: infra
status: live
created_at: 2026-05-28
last_reviewed_at: 2026-05-28
---

# 운영 대시보드 안내

study-note 의 공개 운영 지표는 Grafana 를 기준으로 안내합니다.

| Channel | 역할 | 접속 |
|---|---|---|
| **Grafana (self-host)** | Prometheus scrape 기반 운영 SoT | <https://study-note-grafana.bluesea-474361c6.koreacentral.azurecontainerapps.io/d/study-note-ops> |

Grafana = anonymous viewer (read-only). 누구나 link 로 접속 가능.

비개발자 면접관용 CTA = admin SPA `https://study-note.910701.xyz/admin.html#ops`
(master/admin 로그인 후). 이 화면은 Grafana link 만 활성화하고 Datadog 조회 버튼은
비활성 상태로 표시한다.

## Grafana — `study-note Live Ops (Self-host, Prometheus)`

Prometheus 가 study-note-api 의 `/api/metrics` 를 15s 마다 scrape. self-host stack
이라 외부 의존 없음. ACA 의 Container App 2 개 (study-note-prometheus / study-note-grafana).

### Panel 구성

| Panel | 설명 |
|---|---|
| API 호출량 (5분) | 최근 5분 동안 서버 호출 누적 |
| 5xx 오류 (5분) | 서버 5xx 응답 누적 (0 = 정상) |
| p95 응답 지연 | 응답 시간 상위 5% 케이스 평균 |
| CAS 충돌 (총) | 동시 편집 충돌 누적 (0 = 안정) |
| API 호출량 — route 별 | endpoint 별 req/s 시계열 |
| 응답 지연 — p50/p95/p99 | percentile 시계열 |
| 필기 자동저장 — outcome 별 | success / failure / stale 시계열 |
| Node.js 프로세스 — heap / event loop | 프로세스 health (heap 사용 / event loop lag) |

### Screenshot

`docs/monitoring/screenshots/grafana-overview.png` 추가:

![Grafana overview](./screenshots/grafana-overview.png)

(screenshot 미 commit 상태이면 위 placeholder 이미지는 없는 link. screenshot 캡쳐 후 위 path 로 add.)

## Datadog 상태

Datadog dashboard / `/api/v1/admin/ops-dashboard` 는 개발자 참고용 legacy snapshot 으로만
보존한다. 2026-05-28 기준 ACA `serverless-init` workloadmeta init fail 로 backend APM
metric 이 안정적으로 들어오지 않아 공개 안내/시연 경로에서 제외한다.

## 면접관 시연 path

1. <https://study-note.910701.xyz> 접속, 리뷰어 / 20260000 로그인 (master).
2. 좌측 sidebar `🛡️ 관리자` → `운영 지표`.
3. `/admin.html#ops` 에서:
   - `Grafana + Prometheus 기준` 문구 확인.
   - `Datadog 조회 비활성화` 버튼은 눌리지 않는 상태.
   - **Grafana 운영 대시보드 열기 ↗** click → 위 Grafana URL 직접 접속.
4. Grafana = 1h window, 15s refresh. 실시간 API 호출량 / 응답 지연 / 필기 저장 outcome 등.

## Screenshots 추가 절차

repo 안 `docs/monitoring/screenshots/` 에 PNG/JPG drop:

```bash
# macOS — Grafana dashboard 화면 캡쳐 (Cmd+Shift+4) → 저장 위치를 repo 안으로:
mv ~/Desktop/Screen\ Shot\ *.png /Users/mj/IdeaProjects/study-note/docs/monitoring/screenshots/grafana-overview.png

git add docs/monitoring/screenshots/grafana-overview.png
git -c commit.gpgsign=false commit -m "docs(monitoring): Grafana overview screenshot"
git push origin main
```

→ GitHub render 시 README 또는 본 doc 안 image 자동 표시.

## 추가 후보 screenshot

| 파일 | 화면 |
|---|---|
| `grafana-overview.png` | Grafana 전체 dashboard (현재 viewport) |
| `grafana-api-route.png` | API 호출량 route 별 시계열 zoom |
| `grafana-latency-percentile.png` | p50/p95/p99 시계열 |
| `admin-ops-tab.png` | `/admin.html#ops` 의 비개발자용 1줄 status + CTA |
| `admin-users-tab.png` | `/admin.html#users` 사용자 관리 화면 |
| `pdf-workspace.png` | PDF workspace 의 필기/포스트잇/별표 widget |

원하는 만큼 add. README 또는 본 doc 에 embed.
