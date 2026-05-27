# Cron cold-start 위험 / 대응

sprint-W22-sprint-24 / AC13. ACA min-replicas=0 환경에서 in-process `@nestjs/schedule` cron 의 miss 위험과 완화책.

## 환경

- 호스트: Azure Container Apps. `study-note-api` revision = `min-replicas=0` (idle 시 컨테이너 종료).
- cron 라이브러리: `@nestjs/schedule` (내장 `cron` 패키지) — **in-process scheduler**. 컨테이너가 죽으면 cron 도 죽는다.
- 활성 cron:
  - `ProductMetricsCronService` — `*/30 * * * *` (30분).
  - `CostMetricsCronService` — `0 */6 * * *` (6시간).

## 위험

1. **컨테이너 idle → 종료 → cron miss**: ACA scale-to-zero 가 발동하면 다음 트래픽 인입 전까지 cron tick 이 0회 발생한다.
2. **cold-start latency 4~6s**: 트래픽이 깨운 후 boot 중에 다음 cron 시각이 지나면 또 miss.
3. **bootstrap 1회 emit 의존**: `ProductMetricsCronService.onApplicationBootstrap` 가 boot 시 1회 emit 하지만, scale-to-zero → 깨움 → bootstrap → 다음 cron 까지 metric 갱신이 없다.

## 현재 완화책

1. **sprint-15 keep-alive workflow** — GitHub Actions schedule (5분 간격) 이 `/api/health` 를 ping. ACA 컨테이너가 idle 로 떨어지지 않도록 유지. 본 cron 의 miss 위험을 사실상 0 으로 만드는 핵심.
2. **UptimeRobot 1분 ping** (sprint S0 hotfix) — GH Actions 5분 보완. cold-start 빈도 추가 감소.
3. **`onApplicationBootstrap` 의 첫 emit** — scale-to-zero → wake 시 즉시 1회 emit 으로 Grafana panel 빈 구간 최소화.

## 사후 검증

- 본 cron 의 첫 prod 1주 후 점검 항목:
  - Grafana Product dashboard 의 30분 cadence 가 끊김 없이 점 → 점으로 이어지는지.
  - Cost dashboard 의 6h cadence 점 4개/일 모두 채워지는지.
  - ACA log: `ProductMetricsCron emit 13 gauges` 가 30분 ± 5분 안에 나오는지.

## Backlog

- 외부 scheduler (Cloud Scheduler / Azure Functions Timer Trigger) 로 cron 이관.
  - 동기: scale-to-zero 안전성 (keep-alive 의존도 제거).
  - 비용: 신규 인프라 / IAM / 코드 path.
  - 트리거: cron miss 가 1주에 2회 이상 관찰될 때.

## TZ semantic (`CURDATE()` / `NOW() - INTERVAL`) — UTC

Azure MySQL Flex 의 session TZ default = UTC. `ProductMetricsCronService` 의 SQL:

- `users.new_today` (`WHERE createdAt >= CURDATE()`) — UTC 자정 기준. **KST 자정이 아니다** (KST 9:00 ≈ UTC 0:00).
- `users.daily_active` / `users.new_7d` / `content.pdf_upload_24h` (`NOW() - INTERVAL N HOUR/DAY`) — UTC clock 기준 sliding window. 시각 자체는 TZ 무관 (now-X 이므로) 이지만 KST 표시 시 + 9 시간 offset.

영향:
- "신규가입 today" 패널이 한국 사용자 입장에서는 **오전 9시에 0 으로 리셋**된다 — 자정 직후가 아님.
- DAU / new_7d / upload_24h 는 rolling window 라 영향 미미.

대응 옵션 (백로그):
- (A) 본 동작 그대로 사용 + 패널 caption 에 "UTC 일 기준" 명시.
- (B) Node 측에서 KST 자정 timestamp 계산 후 Prisma `count({ where: { createdAt: { gte: kstMidnight }}})` 로 교체.
- (C) MySQL session TZ 를 Asia/Seoul 로 강제 (`SET time_zone='+09:00'`).

본 sprint 는 (A) 채택 — 모든 외부 지표 (Datadog, Grafana panel default) 가 UTC 기준이라 통일감 유지.
