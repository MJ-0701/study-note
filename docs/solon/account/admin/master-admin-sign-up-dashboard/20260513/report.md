---
phase: report
status: final
sprint_id: "2026-W20-sprint-2"
workspace: "master-admin-sign-up-dashboard"
handoff_dir: "docs/solon/account/admin/master-admin-sign-up-dashboard/20260513"
goal: "관리자 대시보드 — 회원가입 자동 통과 + master/admin 권한 분리 + sign-up 현황 dashboard"
created_at: "2026-05-13T15:51:18+09:00"
last_touched_at: "2026-05-13T15:51:18+09:00"
closed_at: "2026-05-13T15:51:18+09:00"
---

# 보고서

## 1. 결과

- 목표: 회원가입 자동 통과 + master/admin 권한 분리 + sign-up 현황 admin dashboard
- 상태: **done** (5 slice 완료, Gate 6 CTO push-back 후 close, 17/17 smoke PASS)
- 판정: codex automated verdict (Gate 3 6 rounds + Gate 6 1 round) = partial; CTO push-back accepted with smoke + build evidence
- 한 줄 결과: POST /v1/auth/sign-up + 4 admin endpoint + RolesGuard 매트릭스 + 4 smoke + normal-access smoke + web sign-up tab + admin.html dashboard + sprint-1 회귀 가드 17/17 PASS

## 2. 완료한 것

- **slice-1 schema + RolesGuard**: User.reviewedAt DateTime? + migration 20260513124134 + RolesGuard errorCode FORBIDDEN_ROLE shape
- **slice-2 sign-up API**: POST /v1/auth/sign-up — 즉시 통과 (role=NORMAL, devUserFlag=true, reviewedAt=null) + cookie + smoke-auth-signup (AC1/AC1-D/AC1-S/AC1-A)
- **slice-3 admin API + 4 smoke**: GET /v1/admin/users + PUT users/:id/role + PUT users/:id/dev-user-flag + PUT users/:id/review. RolesGuard + self-modify 차단 + admin→MASTER 차단. audit log 3 mutation 종 + 4 smoke
- **slice-4 web UI**: PersonaSidebar role-aware (🛡️ 관리자 group for master/admin) + persona-turn sign-up tab + admin.html vite entry + admin.tsx dashboard (table + 등업 + 반려/재활성 + review + 미review badge + self-row disable)
- **slice-5 regression + handoff**: smoke-normal-access (AC6) + 17 smoke sweep PASS + handoff.md 9 cleanup items

## 3. 결정

- **D-plan-1~7** (plan §5.4) — Q1~Q7 lock: NORMAL full access / 알림 X / 학번 8자리 / sign-up 즉시 통과 / role 매트릭스 / 자가 작업 차단 / PII 정책 약화
- **신규 ADR 없음** — sprint-1 의 ADR 0001 (superseded) / 0002 / 0003 적용
- **Gate 3 / Gate 6 push-back accepted** — codex ops lens unbounded + factual error; 17 smoke PASS + build green = SSoT evidence (review.md push-back section 참조)

## 4. 검증

### 자동 (17 smoke ALL PASS + 5 build exit 0)

| Build | Result |
|:--|:--|
| `@study-note/auth build` | exit 0 |
| `@study-note/api build` | exit 0 |
| `@study-note/web build` | exit 0 (4 dist HTML entries) |
| `@study-note/mcp build` | exit 0 |
| `@study-note/persona-engine build` | exit 0 |
| `prisma:migrate:deploy` | exit 0 (20260513124134_add_user_reviewed_at applied) |

| Smoke (17) | Result |
|:--|:--|
| auth-signin / auth-deny / auth-session-cookie / auth-dev-disable / auth-pii-redaction | PASS (5) |
| auth-signup | PASS (신규) |
| mcp-tool-list / mcp-fail-closed / mcp-env-validate / mcp-persona-prompt | PASS (4) |
| admin-users-list / admin-role-promote / admin-reject / admin-review | PASS (4 신규) |
| normal-access | PASS (신규) |
| persona-turn / corpus-ingest | PASS (2) |

### 수동 확인 (사용자 UAT 필요)
- web sign-up tab → 본인 학번/이름 입력 → 즉시 진입
- master 본인 → 🛡️ 관리자 사이드바 → admin.html → list + 미review badge + 등업/반려/review action
- admin → 동일하되 반려 disabled + MASTER promote 미노출
- normal → 사이드바 미노출 + admin.html 직접 접근 → 403

## 5. 위험 / 후속

- **위험 (수용)**: master 1명 운영 + codex ops lens unbounded rubric + SFS evidence bundle builder 누락
- **후속 (handoff.md 9건)**: AdminModule refactor / audit log 자동 smoke / Conversation 인증 / ConversationService smoke / MCP single-user-host / ops lens 개선 / codex profile attestation / evidence bundle builder

## 6. 남긴 것 / 접은 것

- **남김 (durable)**: `docs/solon/account/admin/master-admin-sign-up-dashboard/20260513/{retro,report}.md`
- **private (`.sfs-local/`)**: `sprints/2026-W20-sprint-2/{brainstorm,plan,review,handoff}.md` + tmp/review-{prompts,runs}

## 7. 다음

- 사용자 UAT 후 후속 sprint 우선순위:
  - handoff #4 Conversation routes 인증 (작은 sprint)
  - handoff #1 AdminModule refactor
  - 운영 deploy ADR γ (fail-closed default + secrets manager + tunnel/hosting)
- 사용자 distribute 의향 표명 시 MCP architecture sprint 진입

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (191 tracked files), domains=0, last_review=partial, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-13T15:51:18+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
