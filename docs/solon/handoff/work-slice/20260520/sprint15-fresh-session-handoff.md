---
purpose: "sprint-15 fresh-session handoff (Gate 5 = Handoff)"
sprint_id: "2026-W21-sprint-2"
created_at: "2026-05-20T17:30:00+09:00"
target_audience: "다음 Claude Code session (또는 Codex/Gemini adaptor)"
---

# sprint-15 Fresh-Session Handoff

## 상태 요약

- Gate 3 (Plan) = **PASS by user waiver** (2026-05-20T17:00:00+09:00, 6 round cross-review 누적 22 finding patched).
- Gate 5 (Handoff) = **이 문서** + plan/implement.md scaffold.
- 다음 = Gate 5 → 6 = Codex `gpt-5.4` worker 가 S1 (Azure resource skeleton) 진행.

## 주요 산출물 경로

| 파일 | 역할 |
|---|---|
| `.sfs-local/sprints/2026-W21-sprint-2/brainstorm.md` | Gate 2 결정 record (Azure 풀이전, Korea Central, 분할안 B 등) |
| `.sfs-local/sprints/2026-W21-sprint-2/plan.md` | Gate 3 contract (R 22, AC 10, slice 10, RBAC matrix, CSRF spec, role mapping) |
| `.sfs-local/sprints/2026-W21-sprint-2/implement.md` | Gate 5 scaffold + S1 worker handoff capsule |
| `.sfs-local/decisions/0004-azure-fullmigration-and-prod-auth-acceptance.md` | ADR (architecture + 보안 acceptance) |
| `docs/solon/work-slice/20260520/self-cpo-gate3.md` | Gate 3 self-CPO PASS by waiver record |
| `.sfs-local/tmp/review-runs/2026-W21-sprint-2-gate3-*/result.md` | Codex 6 round cross-review 결과 |

## Gate 2 결정 (확정)

- Cloud = **Azure 풀이전** (Korea Central)
- Compute = **Azure Container Apps** (api) + **Azure Static Web Apps Free** (web, Vite SPA)
- DB = **Azure Database for MySQL Flexible Server B1ms** (private endpoint)
- Storage = **Azure Blob Storage** (managed identity only, no account key)
- Registry = **Azure Container Registry Basic** (`adminUserEnabled=false`)
- Secret = **Azure Key Vault** + ACA system-assigned managed identity
- DNS = **Porkbun NS → Azure DNS apex `910701.xyz`** (멀티프로젝트 hub)
  - `study-note.910701.xyz` (SWA)
  - `api.study-note.910701.xyz` (ACA api custom domain)
- Deploy = **GitHub Actions 2-step**: OIDC primary + SWA Environment secret token (scoped exception)
- Observability = **Datadog APM (`dd-trace`) + Application Insights + Azure Monitor logs**, same Datadog org 향후 사업 AWS 와 multi-cloud
- Sprint split = **B**: sprint-15 = 인프라+배포+도메인+APM 기본 / sprint-16 = Grafana + 알람 + multi-tagging
- Cost = $5-19/월 정상요금, Student credit $100 = 5-20개월 운영
- Auth = dev seed 유지 (사용자 acceptance) + `Reviewer / 20260002` read-only + prod sign-up disable + CSRF double-submit + rate limit

## Slice 진행 순서

| # | slice | worker | 의존 | 블로커 |
|---|---|---|---|---|
| **S1** | Azure resource skeleton (Bicep) | Codex `gpt-5.4` | — | **다음 진입** |
| S2 | Secret seed + identity wiring | Codex `gpt-5.4` | S1 + D3 | D3 (Datadog API key) |
| S3 | Blob adapter + dd-trace + CSRF/role/throttle middleware | Codex `gpt-5.3-codex` 또는 Sonnet 4.6 | — | independent (S1과 parallel 가능) |
| S4 | Dockerfile prod variants | Codex `gpt-5.4` | S3 | — |
| S5 | GHA workflow + OIDC + 2-step deploy | Codex `gpt-5.4` | S1+S2+S4 | — |
| S6 | DNS + TLS (두 custom domain) | Codex `gpt-5.4` | S1 + D2 | D2 (Porkbun NS) |
| S7 | S3→Blob 마이그 + IAM lifecycle | Codex `gpt-5.4` | S1+S3 | — |
| S8 | Datadog + AppInsights | Codex `gpt-5.4` | S2+S3 | D3 |
| S9 | Cost Budget | Codex `gpt-5.4` | S1 | — |
| S10 | Runbook + cleanup | Sonnet 4.6 | S5+S6+S7 | — |

## 사용자 사전 작업 (병행 가능)

- **D2**: Porkbun 콘솔 → `910701.xyz` NS 4개를 Azure DNS hosted zone NS 로 교체. (S1 완료 후 Azure NS 확인 가능, 그 뒤 변경.) 전파 24~48h.
- **D3**: Datadog signup (Student Pack) → org 1개 + API key 발급 → Key Vault `DD_API_KEY` secret 에 직접 seed (사용자 콘솔 작업, main agent 가 secret value 미접근).

## 다음 Session 진입 명령

1. session 시작 후 `/sfs status` 로 sprint-15 현재 상태 확인.
2. 이 handoff 파일 + plan.md + implement.md 읽기.
3. S1 진행 = Codex worker (`gpt-5.4`) 위임. capsule 은 implement.md §3.1 에 명시.
4. main agent (Opus 4.7) 는 capsule 전달 + Codex 산출물 review only. 직접 코딩 X.
5. S1 PASS 후 `sfs review --gate 6` (Gate 6 review) 또는 S3/S7/S9 자유 slice 로 이동.

## 잔여 Codex finding (waiver 후 implementation 단계에서 정확화)

- Role enum mapping (study-note source 의 `master/admin/normal` vs plan 의 `ROLE_USER/REVIEWER/ADMIN`) → S3 generator 가 source 보고 commit 함께 갱신.
- 자세한 항목 = plan §8 트레이서빌리티 표 + `self-cpo-gate3.md` 의 6 round 누적 record.

## Memory 갱신 사항

- `project_sprint15_inprogress.md` 신규 (Gate 3 waiver PASS + S1 대기 state).
- sprint-14 handoff 는 closed.

## Token Continuation 이유

현 session = brainstorm + plan + 6차 review + ADR + self-CPO artifact + implement scaffold 누적 = 매우 길어짐. plan rule "If 50% or higher before a new gate/worker handoff, stop and create a compact fresh-session handoff" 적용 = 이 파일이 그 결과.
