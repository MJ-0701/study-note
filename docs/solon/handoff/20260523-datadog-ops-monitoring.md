---
title: "Datadog 인프라 연결 인계 + 운영 모니터링 sprint 계획"
created_at: "2026-05-23"
author: "사용자 (인프라 1차 직접 수행) + Claude (인계 문서화)"
status: "1차 완료 / 2차 sprint 백로그"
related_memory: "project_datadog_split"
---

# Datadog 인프라 인계 + 운영 모니터링 sprint 계획

## 1. 1차 (완료, 2026-05-23) — user 직접 수행

### 완료 범위

- **org**: GitHub Student Pack Datadog **US5** org.
- **FE**: Vercel 앱에 Datadog **RUM** 연결 + 수집 확인.
- **BE**: Azure Container Apps `study-note-api` 에 Datadog **APM** 연결 완료.
  - APM Service 에 `study-note-api` 노출 확인.
  - `/api/health` + 실제 API trace 수집 확인.
  - endpoint/resource 별 trace + latency 확인 가능.
- **docs**: `docs/monitoring/` 하위 setup checklist + metrics registry 초안.

### 현재 이해 / 결정

- ACA 는 EC2 처럼 host agent install 방식 아님. **컨테이너 내부
  serverless-init + dd-trace** 방식으로 APM 연결.
- Datadog 에서 서비스 전체 지표 = **Service Summary**.
- API 별 지표 = **Resources / Endpoints**.
- 단일 API 의 p50/p95/p99 = endpoint/resource 상세 **Latency 그래프 Inspect**.
- **배포 직후 우선 확인 지표**: p95 latency / error rate / request count.
- p99 = 대시보드 참고만, 초반 알림 기준으로는 과민할 수 있음.

## 2. 2차 (다음 sprint 백로그) — 운영 모니터링 지표 구축

### 남은 작업

- 운영 모니터링 대시보드 구성.
- Release Check Dashboard 구성.
- endpoint/resource 별 p50/p95/p99 패널.
- error rate / 5xx / p95 latency 알림 monitor.
- RUM custom action 기반 퍼널 / 리텐션 지표.
- RUM ↔ APM ↔ Logs 상관관계 (trace_id propagation).

### 대시보드 후보

#### 전체 서비스 (study-note-api)
- request count 전체
- error rate 전체
- p95 latency 전체

#### endpoint / resource 단위
- request count top list
- p95 latency top list
- error rate top list
- 5xx count top list

#### 핵심 비즈니스 API 그룹별
- p50 / p95 / p99 latency
- request count / error rate

#### 배포 (version) 단위
- requests/s by version
- p95 latency by version
- error rate by version

### 핵심 비즈니스 API 그룹

| 그룹 | endpoint |
|---|---|
| Auth | sign-in, sign-up, me, sign-out |
| Materials | list, detail, upload-intent, upload file, complete, download |
| PDF Annotation | annotation load / save (`/api/v1/pdf-annotations/...`) |
| Notes | note load / save (`/api/v1/notes/subject/:subjectId/week/:weekId`) |
| Persona / Conversation | conversation create / list / detail, turn create |
| Admin | user review / role / dev-user 관리 |

### 모니터링 구성 원칙

1. **drill-down 흐름** — 전체 서비스 상태 → endpoint 별 이상 탐지 → 특정
   resource 상세 trace 순서.
2. **포괄적 endpoint coverage** — 핵심 사용자 플로우에 연결된 API 는 모두
   endpoint/resource 단위로 p50/p95/p99 + request count + error rate 가
   대시보드에 보이게.
3. **알림 점진 배치** — 처음부터 모든 API 세밀 알림 X. 전체 p95 + error rate
   + 5xx + 핵심 API 그룹 단위부터.
4. **배포 직후 검증** — version 기준 requests/s + p95 latency + error rate
   비교.

## 3. Sprint 진입 조건 + 분할 제안

### 진입 조건

다음 sprint trigger = user 의 "운영 모니터링 시작" 시그널. 이때 결정 필요한
사용자 항목:
- SLO 목표 값 (p95 latency / error rate 임계값).
- alert recipient (channel / email / on-call).
- 대시보드 우선순위 (모든 후보 한 번에 vs. 핵심 1-2 화면부터).

### Sprint 분할 후보 (다음 sprint plan 시 user 확인)

- **옵션 A — 단일 sprint**: 모든 대시보드 + 알림 + RUM funnel + 상관관계 한 번에.
  scope 큼.
- **옵션 B — 2 sprint 분리** (권장):
  - sprint-N: 전체 + endpoint top list 대시보드 + 5xx/p95/error rate 알림
    (= 최소 운영 가시성).
  - sprint-N+1: 핵심 API 그룹 패널 + version diff + RUM funnel + RUM↔APM↔Logs
    상관관계.

### Claude scope vs. user scope (재확인)

- **user**: dashboard / monitor / alert UI 셋팅, SLO 목표 결정, on-call /
  alert recipient 설정, dashboard sharing 정책.
- **Claude** (코드 integration):
  - service-level metric emit point (`sync.put.success/failure`, `sync.paused`,
    `storage.migration.rate`, `annotation.batch.size`, `annotation.cas.stale`
    등) 를 BE service / FE main.ts 의 적절한 위치에 삽입.
  - dashboard JSON / monitor JSON 이 repo 에 commit 되어야 한다면 그 file.
  - RUM custom action emit 코드 (FE main.ts 의 user mutation 시점).
  - trace_id propagation header / logger correlation 코드.
  - wiki 의 `llm-wiki/modules/apps-api.md` "인프라 / 의존" 표 갱신 + 신규
    `llm-wiki/flows/observability.md` (Datadog metric / span / RUM 흐름).

## 4. Repo 영향

- `docs/monitoring/` — user 의 초안 문서 보존. 다음 sprint 가 갱신.
- `apps/api/src/observability/` 또는 동등 — sprint 진입 시 신설 검토 (dd-trace
  tagging helper / span enrichment).
- `apps/web/src/observability/datadogRum.ts` — user 의 1차 작업물. 다음 sprint
  의 custom action 코드가 여기에 추가.
- `llm-wiki/flows/observability.md` — 신규, 다음 sprint 의 첫 commit 으로
  생성.
- `llm-wiki/ddd/invariants.md` — 신규 invariant 후보 (예: "모든 5xx 응답은
  error rate metric 으로 emit") 다음 sprint 에서 추가.

## 5. 인계 evidence

- 본 문서 (`docs/solon/handoff/20260523-datadog-ops-monitoring.md`).
- `docs/monitoring/` 의 user 초안.
- user 의 sprint-4-s2-annotation-batch-get / sprint-5-datadog-rum branch 의
  Datadog 관련 commit.
- memory: `project_datadog_split.md`.
- Datadog console: study-note-api Service Summary + `/api/health` trace 수집
  화면 (외부 evidence).
