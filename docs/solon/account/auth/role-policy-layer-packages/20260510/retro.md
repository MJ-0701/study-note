---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W19-sprint-4"
goal: "layer packages 3차 추출 - auth + persistence + storage + auth role policy (master admin normal)"
prior_sprints: ["sprint-1", "sprint-2", "sprint-3"]
workspace: "layer-packages-3-auth-persistence-storage-auth-role-policy-master-admin-normal"
handoff_dir: "docs/solon/account/auth/role-policy-layer-packages/20260510"
last_touched_at: "2026-05-10T21:41:18+09:00"
closed_at: 2026-05-10T21:41:18+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **Gate 3 first try PASS (gemini cross reviewer)** — sprint-1·2·3 의 5 round chain 대비 4 round 절약. sprint-3 retro 의 학습 (stage-split + evidence target 사전 명시) 을 plan round 1 에 미리 박은 결과. plan §3 AC1~AC6 + §4 위험 R1~R6 + §5 worker 라우팅 + §7 self-CPO 표 모두 round 1 에 lock.
- **worker 3-tier 라우팅 (Claude CTO + gemini CPO + Spark mechanical)** — Codex 사용량 제한 (May 12 reset) 시기에도 multi-adaptor 정합 작동. 사용자 라운드 답 ("설계/리뷰는 claude+gemini, 단순 구현은 Spark 로 토큰 효율") 그대로 lock.
- **plan-side stage-split (intent vs PUT) + evidence target 사전 명시** — sprint-3 retro 의 학습 인계. 본 sprint 에선 RoleGuard 의 "fail-closed" 검증 4 assertion (unauth 401, normal 403, master 200, admin 200) 사전 명시 → smoke 직접 lock.
- **direct backend stderr 디버깅** — smoke 의 401/500 response 만 보고 빙빙 돌지 않고 직접 backend stderr capture (`stdio: ["ignore", "pipe", "pipe"]` + `[backend stderr]` prefix) 로 root cause 즉시 진단. sprint-2 retro 인계 패턴.

## 2. 문제

- **packages/* 신규 추가 시 tsconfig decorator flag 누락 패턴** — packages/auth + packages/storage 의 tsconfig 가 `experimentalDecorators` + `emitDecoratorMetadata` 누락. tsc build/strict type 단계에서 안 잡혀 runtime DI 실패 (TypeError: this.users undefined) 로만 표면. sprint-2 의 packages/persistence 는 정상 (sprint-2 시점에 lock 됐음) 단 본 sprint 신규 2 packages 가 누락. → 다음 sprint 의 lint 룰 활성 또는 base.json 의 default 로 강제 의무.
- **DB user row 의 학번 lock vs seed.mjs upsert where 의 mismatch** — sprint-1 시점에 만들어진 user-dev-1 row 가 학번 20264514 로 lock. seed.mjs 의 `where: { studentNumber }` 가 .env 의 학번 변경 시 매칭 못 함 → 새 row create 시도 → PK ('user-dev-1') 충돌. Fix = `where: { id }` 로 idempotency 강화 + studentNumber 도 update field 로.
- **smoke:backend 의 master 토큰 logout 후 admin route 401** — line 373 의 logout 으로 master token revoked. line 390 의 admin route call 이 같은 token 사용 → 401. Fix = admin 검증 직전 master re-login (smoke line 390 부근에 reloginForAdmin 추가). plan stage-split 도 보완 의무 (logout 후 admin 검증 stage 분리).
- **Gate 6 review nothing-to-review 패턴 4번째 반복** — sprint-1·2·3·4 동일. SFS upstream issue 인계. manual smoke 5 종으로 보완.

## 3. 시도할 것

- **tsconfig decorator-lint 룰 활성** (sprint-5 carry) — packages/* 의 tsconfig 가 `experimentalDecorators` + `emitDecoratorMetadata` 모두 true 인지 lint 단계에서 강제. 또는 tsconfig.base.json 에 default 로 lock + opt-out 만 허용.
- **sprint-5 plan 의 prior-sprint stage-split 인계 정착** — 본 sprint 에서 sprint-3 학습 인계가 Gate 3 first try PASS 결과로 직결 → 다음 sprint 도 prior retro 의 "시도할 것" 항목을 plan §3 의 AC pre-decision 로 명시 의무.
- **smoke 의 stage 명시 의무** — login → action → logout → re-login 의 cycle 이 smoke 안에 있을 때 각 stage 마다 token 재발급 의무를 plan AC 차원에 명시. 본 sprint 의 admin 401 같은 case 회피.

## 4. 이어갈 것

- **다음 sprint = sprint-5 (운영 ADR)**:
  - Azure + DigitalOcean stack 권장 default ADR (사용자 EC2 폐기 의향 + 학생 무료 cloud 활용).
  - ADR 0001 (단일 EC2 단일 AZ) supersede + 본 sprint 의 layer 3차 추출 완료 후 운영 layer 결정.
  - carry: tsconfig decorator-lint 룰 (위 §3 학습), `.env` user PII 보존 정책 (db-persistent.mjs 의 STUDY_NOTE_ prefix preserve 검증).
- **다음 sprint 입력 (sprint-4 commit `120b62a` + `2312782`)** — packages/auth + packages/persistence + packages/storage 활성. RoleGuard + @Roles + AdminController 활성. ADR 0007 §9 표 갱신 (3차 추출 완료).
- **Gate 6 review 한계 후속** — Solon SFS upstream 의 commit-aware evidence packaging 한계 (sprint-1·2·3·4 4 sprint 누적). 별 issue 작성 후속 고려.

## 5. 종료 체크

- [x] report 가 최신이다 — `report.md` status `final` lock (sfs retro adapter 자동 처리, 2026-05-10).
- [x] review 조치가 완료 또는 이월됐다 — Gate 3 first try PASS (gemini, sprint-1·2·3 의 5 round chain 대비 절약). Gate 6 = nothing-to-review (SFS adapter 한계 인계, manual smoke 로 보완). manual smoke 5 종 (smoke:backend + smoke:s3-storage + smoke:corpus-ingest + smoke:persona-turn + smoke:cli-path) 모두 PASS.
- [x] workbench 가 접혔다 — `.sfs-local/sprints/2026-W19-sprint-4/` 의 brainstorm/plan/review 보존. retro.md 본 파일 작성 후 sfs close adapter 가 docs/solon/<workspace>/<date>/ 로 archive.

### Sprint 본질 요약

- **brainstorm** simple round 1 → ready-for-plan (sprint-1·2·3 의 ADR + retro 인계가 owner-decision 의 대부분을 lock).
- **plan** round 1 → R1·R2·R3·R4·R5·R6 + AC1~AC6 + S1~S6 + 위험 R1~R6 + worker 3-tier 라우팅 + self-CPO round 1 PASS.
- **Gate 3 review (gemini)**: round 1 **first try PASS** (sprint-1·2·3 의 5 round chain 대비 4 round 절약).
- **Implementation** 2 commit (`120b62a` product-code + `2312782` runtime-upgrade): packages/auth + packages/persistence + packages/storage 신규 활성, apps/api 의 prisma/auth/storage 추출, RoleGuard + @Roles + AdminController 신설, Role enum + migration `20260510124500_add_user_role`, seed.mjs idempotency (where=id) 강화, smoke:backend 의 admin 4 assertion 추가, ADR 0007 §9 표 갱신 (3차 추출 완료), `.gitignore` 의 `.pnpm-store/` 추가.
- **manual smoke**: smoke:backend (admin 4 + 정상) ✅ + smoke:s3-storage ✅ + smoke:corpus-ingest ✅ + smoke:persona-turn ✅ + smoke:cli-path ✅.
- **deliverable**: layer packages 3차 추출 종료 (sprint-2 의 1차/2차 인계 완성). auth role policy 3 단계 (master/admin/normal) lock. 사용자 본인 = master, 별 admin user (학번 20264514a / 채명정 admin) 로 RoleGuard 4 검증 통과.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (186 tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-10T21:41:18+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
