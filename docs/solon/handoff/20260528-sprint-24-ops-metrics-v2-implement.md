# Handoff — sprint-W22-sprint-24 ops-metrics v2 (implement entry)

작성: 2026-05-28 04:36 KST
작성자: Claude main (claude-opus-4-7) session A
대상: 다음 fresh session

## 0. 한 줄

Grafana 가 사실상 APM only 라는 user 진단에서 출발. 본 sprint = Product (P1) + Cost (P2) + SLO (P3) 3 dashboard 신설 + BE cron 2 + log-derived metric 10 + DD SLO 3 + monitor 6 + `/api/metrics` token gate (security boundary 변경). Gate 3 self + cross PASS + user-approval capture 완료. **implement 진입 OK.**

## 1. 현재 상태 (2026-05-28 04:36 KST)

- **branch**: `feature/ops-metrics-v2` (from main = `c92d113`).
- **working tree**: untracked `.claude/commands/` + `.claude/skills/` 만 (이전 세션부터). plan/brainstorm/review 모두 commit X (sprint workbench `.sfs-local/sprints/sprint-W22-sprint-24/` 는 private workbench).
- **sprint-23** (React migration foundation) = draft brainstorm 보존, sprint-24 와 독립.
- **SFS sprint state**: `sprint-W22-sprint-24` active. Gate 3 = PASS + user-approval captured (`2026-05-27T19:36:17Z` events.jsonl).
- **Codex worktree** (`/private/tmp/study-note-readme-datadog-ops`) = PR #84 fix 후속. main 과 충돌 없음. 본 sprint 와 무관.

## 2. 핵심 결정 (Q1~Q5 user 답변 + 6+3 finding patch)

### Q1~Q5 (brainstorm §6)

| Q | 답 | 의미 |
|---|---|---|
| Q1 cron 환경 | **A** `@nestjs/schedule` 인프로세스 + sprint-15 keep-alive 의존 | cron miss 거의 X. ACA min-replicas=0 의 cold start 우려는 keep-alive 가 완화. |
| Q2 emit 채널 | **A** Prom + DD dual | 기존 prom-client + dd-trace 둘 다 emit. dual 비용 ~$1~3/월. |
| Q3 dashboard JSON | **A** `infra/grafana/dashboards/*.json` 코드 SoT | 버전 관리 + 재현 가능. |
| Q4 SLO window | **A** 7d + SRE burn rate (fast 1h>14.4× / slow 6h>6×) | Google SRE 표준. |
| Q5 R2 API token | **지금 발급** (Account API token, `R2 Analytics:Read` permission) | user 가 P2 진입 전 발급. Bucket-scoped token 으론 GraphQL Analytics 접근 불가. |

### Finding patch 결과 (6 round 1 self-CPO + 3 codex self-review)

| ID | 영향 | 결과 |
|---|---|---|
| F-R1 | AC8 ops-dashboard reuse premise 오류 | Prisma 직쿼리로 정정 (S5) |
| F-R2 | AC2 Azure ACA 인증 미명시 | AC2-2 deferred 백로그. S2 = MySQL+R2+DD 3 gauge |
| F-R3 | AC1 note/chart/table schema 부재 | AC1 9→7 gauge. widget create 는 AC4 log-derived 로 (5→10) |
| F-I1 | AC1 SQL 식 모호 | 7 gauge 각각 1:1 명시 |
| F-I2 | R2 GB source 미명시 | Cloudflare GraphQL Analytics `r2StorageAdaptiveGroups` + token type |
| F-I3 | DD 비용 추정 근거 부재 | $1~3/월 산정식 |
| **F-R4** (codex) | `/api/metrics` unauth 확장 = business intel leak | **AC14 신규** `MetricsScrapeGuard` token gate. 별 Prometheus scraper config 갱신 필요 |
| **F-I4** (codex) | widget log emit schema | **AC15 신규** `{event, kind}` 만, PII 0 grep test |
| **F-I5** (codex) | R2/DD client token mask | **AC16 신규** negative test 4 case (missing/invalid/401/403) |

## 3. Plan 산출물 (모두 PASS 상태)

- `.sfs-local/sprints/sprint-W22-sprint-24/brainstorm.md` — §0~§9
- `.sfs-local/sprints/sprint-W22-sprint-24/plan.md` — §1~§12 (16 AC + 5 slice + 6 division ledger + risk + SLO 정의)
- `.sfs-local/sprints/sprint-W22-sprint-24/review.md` — Gate 3 self+cross PASS evidence
- `.sfs-local/sprints/sprint-W22-sprint-24/log.md` — user-approval capture
- `.sfs-local/events.jsonl` — sprint_start / brainstorm_open / plan_open / review_open×3 / review_run×3 / capture events

## 4. Implement 진입 시작점

### 4.1 우선순위 = S1 (Product cron + `/metrics` guard + spec)

이유 = AC14 (`/metrics` token gate) 가 security boundary 변경 + 본 sprint 의 다른 모든 metric 확장 전제. S1 안에 묶음.

### 4.2 S1 작업 단위

| # | 파일 | 작업 |
|---|---|---|
| 1 | `apps/api/package.json` | `@nestjs/schedule` ^4.x dep 추가 |
| 2 | `apps/api/src/observability/metrics.service.ts` | gauge helper `emitGauge(name, value, tags)` + Product gauge 7 + Org gauge 6 register (Prom + dd-trace dogstatsd dual-emit) |
| 3 | `apps/api/src/observability/product-metrics-cron.service.ts` | `@Cron('*/30 * * * *')` + 13 gauge SQL collect + emit. Prisma 직쿼리. AC1 + AC8. |
| 4 | `apps/api/src/observability/metrics-scrape.guard.ts` | NestJS Guard. `x-prometheus-token` header vs `METRICS_INTERNAL_TOKEN` env. missing env → fail-closed (403). AC14. |
| 5 | `apps/api/src/observability/metrics.controller.ts` | `@UseGuards(MetricsScrapeGuard)` apply. 주석의 "추후 networking 제한" backlog 해소 명시. |
| 6 | `apps/api/src/observability/metrics.module.ts` | `ScheduleModule.forRoot()` + `ProductMetricsCronService` + `MetricsScrapeGuard` provide |
| 7 | `apps/api/src/app.module.ts` | MetricsModule export 확인 |
| 8 | `apps/api/src/observability/__tests__/product-metrics-cron.spec.ts` | mock PrismaService + mock MetricsService. 7 gauge × 시나리오 + role gauge × 3 + org gauge × 3 + PII grep assertion |
| 9 | `apps/api/src/observability/__tests__/metrics-scrape.guard.spec.ts` | valid token → 200, invalid → 403, missing header → 403, missing env → 403 (fail-closed). 4 case. |

**완료 조건**: `pnpm --filter @study-note/api build` + `pnpm --filter @study-note/api test -- product-metrics-cron metrics-scrape.guard` PASS + grep `rg "studentNumber|email|userId" apps/api/src/observability/*cron*.ts apps/api/src/observability/*guard*.ts` = 0.

### 4.3 S1 후 진입 순서

- **S2** (Cost cron + R2/DD client + spec, AC2/16): user 가 R2 token 발급 + ACA secret `CLOUDFLARE_R2_API_TOKEN` 주입 후. Cloudflare GraphQL Analytics + DD Usage API.
- **S5** (role/org Prisma metric, AC8): S1 의 product cron 안에서 같이 emit. 분리 PR 불요 (사실상 S1 일부).
- **S3** (log-derived + SLO 정의 + 문서 + widget log emit, AC4/9/11/13/15): docs + annotation PUT route 의 log emit 1줄 추가.
- **S4** (Grafana dashboard JSON × 3, AC5/6/7): S1+S2+S3 metric 정의 완료 후. datasource = `${DS_PROMETHEUS}` template variable.

### 4.4 PR 전략

권장 = **단일 large PR squash merge** (5 slice 가 ops-metrics v2 라는 하나의 product policy 변경).
대안 = S1 (cron + guard) + S2 (cost) + S3+S4 (docs + dashboards) = 3 PR.

### 4.5 Merge 후 prod deploy (자동 진행)

PR squash merge 완료 시 **별도 prompt 없이 다음 step 진행**:

1. **BE deploy** = `be-v0.1.15` tag (예상). 별 ACA api + study-note-prometheus 둘 다 update:
   - `study-note-api` = AC14 Guard 포함 image rebuild + `METRICS_INTERNAL_TOKEN` env binding (`secretref:metrics-internal-token`) 추가.
   - `study-note-prometheus` = `prometheus.yml` 갱신 (authorization bearer + `${METRICS_INTERNAL_TOKEN}` expansion) + Dockerfile CMD `--enable-feature=expand-env` flag + env binding + image rebuild.
   - **동시 deploy 필수** (cutover). 둘 중 하나만 deploy 시 scrape 403 → metric pipeline 끊김.
2. **FE deploy** = 본 sprint 는 FE 변경 0 → fe-v0.1.28 tag 불요. (Datadog RUM funnel 은 추후 user-side DD UI 등록만)
3. **smoke check** (deploy 후 T+5min):
   - `curl https://study-note-api.../api/health` = 200.
   - `curl -H "Authorization: Bearer <METRICS_TOKEN>" https://study-note-api.../api/metrics` = 200 + Prom format.
   - `curl https://study-note-api.../api/metrics` (no header) = 403 (fail-closed).
   - ACA log = Product cron 30min interval 첫 run 시 `ProductMetricsCron emit N gauges` 로그 확인.
4. **deploy 후 user-side action 안내** (handoff doc §5 와 동일):
   - Datadog UI 등록 (log-derived metric 10 + SLO 3 + monitor 6)
   - Grafana dashboard import (Product/Cost/SLO JSON × 3)
5. **sprint close** = `sfs retro --close` + memory 갱신 + ACTIVE.md 후속 sprint 안내.

## 5. user-side action (구현 중 또는 후)

1. **R2 API token 발급** (P2 진입 전): Cloudflare dashboard → Manage Account API Tokens → Create Token → "Custom" template → `R2 Analytics:Read` (+ `Account Analytics:Read` if needed) → ACA secretref `cloudflare-r2-analytics-token`.
2. **Datadog UI 등록** (BE deploy 후 T+1d): log-derived metric 10 (`docs/observability/log-derived-metrics.md` SoT) + SLO 3 + burn rate monitor 6 (`docs/observability/slos.md` SoT).
3. **Grafana dashboard import**: `infra/grafana/dashboards/{study-note-product,study-note-cost,study-note-slo}.json` 3 파일 import.
4. **별 Prometheus scraper config 갱신** (AC14 의존): 별 ACA `study-note-prometheus` 의 scrape_configs 에 header `x-prometheus-token: ${METRICS_INTERNAL_TOKEN}` 추가. 미적용 시 본 ACA scrape 가 403 → metric pipeline 끊김 → cron 데이터 인입 X. **S1 deploy 와 동시에 갱신 필수.**

## 6. 위험·주의

- **DD ingestion 비용 ↑ ~$1~3/월** (24 series × $0.05). sprint 머지 후 1주 비용 review.
- **AC14 cutover 동시성**: BE deploy + 별 Prometheus scraper config 갱신을 동시에. timing mismatch 시 ACA scrape 403 → Grafana panel 빈 채로 인입 X.
- **AC2-2 deferred**: Azure ACA Active-CPU 는 본 sprint 밖. 따로 backlog.
- **SLO baseline 7일**: P3 의 SLO panel 데이터 신뢰성 = 7일 누적 후. alert 활성도 7일 dry-run 후.
- **PII grep test 범위**: docs 와 dashboard JSON 까지 포함 (cross-review 코멘트 반영).

## 7. SFS 상태 명령 reference

```bash
# 활성 sprint + gate 확인
sfs status

# 진행 (implement)
sfs implement                      # Gate 3 PASS 확인 후 진입

# Gate 6 review (구현 후)
sfs review --gate 6 --stage self --executor codex
sfs review --gate 6 --stage cross --executor codex

# user-approval (이미 captured for Gate 3, 새 round 필요 시)
sfs capture --kind user-approval --gate 6 "User approved Gate 6 implementation."

# 머지 후 retro
sfs retro --close
```

## 8. References

- 본 sprint workbench: `.sfs-local/sprints/sprint-W22-sprint-24/`
- 이전 sprint memory: `project_sprint_w22_22_layer_d_complete` (sprint-22 close)
- Datadog 인입 baseline: `project_datadog_split` (2026-05-23)
- React migration handoff (sprint-23 draft, 별도): `.sfs-local/sprints/sprint-W22-sprint-23/brainstorm.md`
- 운영 standards: `docs/standards/metric-spec.md`, `docs/standards/observability-rules.md`
- Codex review independence note: gate 3 cross 의 "Review independence risk: warning" = self+cross 모두 codex executor (claude bridge 401 auth 실패). artifact verdict 는 영향 없음.
- 본 session log.md user-approval capture id: `20260527T193617Z-59156`

## 9. 첫 명령 (fresh session 시작 시)

```bash
git status                           # branch=feature/ops-metrics-v2 확인
sfs status                           # sprint-W22-sprint-24 + Gate 3 PASS 확인
cat .sfs-local/sprints/sprint-W22-sprint-24/plan.md  # 16 AC 재숙지
# 시작 = §4.2 S1 작업 단위 #1 (@nestjs/schedule dep 추가) 부터
```

## 10. 부수: CLAUDE.md 비대화 정리 별도 backlog

본 session 초반 user 가 `CLAUDE.md` 226줄 (SFS 정책 본문 ~200줄) 비대 지적 + AGENTS.md/GEMINI.md 와 일관성 부재 확인. **별도 sprint** 로:
- CLAUDE.md 226 → ~40 (bootstrap 15 + 인프라 20 + 운영규율 5).
- SFS 정책 본문 → SFS.md 로 이동.
- AGENTS.md / GEMINI.md 에 `인프라 현황` (R2/Azure/MySQL) 섹션 추가.
- 3 adapter (CLAUDE/AGENTS/GEMINI) 동등 1급 원칙 일관성 확보.

본 sprint 와 무관 — fresh session 에서 user 가 명시 요청 시 진입.
