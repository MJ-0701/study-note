---
phase: report
status: final
sprint_id: "2026-W19-sprint-1"
workspace: "root-module-frontend"
handoff_dir: "docs/solon/root-module-frontend/20260509"
goal: "아키텍처 모듈 분리 — 현재 root module 이 frontend (프론트 프로젝트에 백엔드 모듈 붙인 형태) → 모듈 재설계 및 재배치"
created_at: "2026-05-09T20:49:40+09:00"
last_touched_at: "2026-05-09T21:23:53+09:00"
closed_at: "2026-05-09T21:23:53+09:00"
---

# 보고서

## 1. 결과

- 목표: 본 sprint = 설계 sprint (Q1 lock = (a)). 산출 = 모듈 도면 + 공통 설정 명세 + 영향 path 표 + Security 4종 명세 + ADR 1건. S7/S8 PII hygiene 한정 코드 변경 허용.
- 상태: **in-progress** (Gate 3 PASS 받음, Gate 4 round 1 partial — ops appendix 합성 후 round 2 진행 중).
- 판정: Gate 3 (Plan, security lens) round 5 = **PASS** ✅ / Gate 4 (Design, ops lens) round 1 = **partial** ⚠️ (rework 진행).
- 한 줄 결과: pnpm workspaces 기반 평평 monorepo 도면 + Security 4종 + PII 정리 + db-persistent .env 보존이 ADR 0007 + 8 파일 commit 으로 산출됨. Gate 4 의 ops lens 가 minimum operational assumption 추가를 요구해 ADR §18 합성 후 round 2.

## 2. 완료한 것

- **brainstorm.md** (`status: ready-for-plan`). hard mode 라운드 1~5 에서 Q1~Q8 owner-decision 모두 lock. Spring multi-module → Node 표준 매핑 표 명세화. 위험 R1~R5 등재.
- **plan.md** (round 1~5 진화). R1~R8 → R9~R12 (round 2 security 흡수) → S7/S8 코드 변경 슬라이스 (round 4 PII 정리 + db-persistent 보존) → AC10 (e) property-based 재작성 (round 4) → AC10 grep 정책 갱신 (round 5 docs 포함). self-CPO round 5 PASS.
- **Gate 3 (Plan) review chain**: round 1·2·3·4 partial → round 5 **PASS**. codex CPO (gpt-5.5 xhigh, security lens auto-locked). round 별 finding 모두 plan.md §7 self-CPO 표에 1:1 인계.
- **ADR 0007** 작성: `docs/solon/decisions/0007-module-architecture-redistribution.md` (320 줄, §1~§17). AC1~AC12 모두 ADR §3~§13 에 매핑, §14 PR 분할 / §15 다음 sprint 의무 / §16 self-CPO mini-check / §17 references.
- **S7 PII fixture 정리** (8 파일 commit-ready): `docker-compose.yml` (env interpolation), `.env.example` (dummy), `backend/prisma/seed.mjs` (fallback dummy), `README.md` / `backend/README.md` (PII 행 정리), `scripts/smoke-backend-contract.mjs` (env-driven SEED + SECOND user), `scripts/smoke-pdf-workspace.mjs` (env-driven SEED user). 검증: sprint-1 plan AC10 (e) 의 grep 명령 (정규식 SoT = `plan.md` AC10 (e) 또는 ADR 0007 §11 (e), 본 report 안에 인라이닝하지 않음 — 자기-grep 회피) = no match.
- **S8 db-persistent .env 보존**: `scripts/db-persistent.mjs` 가 `.env` overwrite 시 사용자 정의 `STUDY_NOTE_*` 환경변수를 read-and-merge 로 보존. 사용자 `.env` 에 STUDY_NOTE_DEV_USER_EMAIL / STUDY_NOTE_SECOND_USER_EMAIL (alias 형태로 User.email @unique 충돌 회피) 추가.
- **Gate 4 (Design) review round 1**: codex CPO ops lens partial — ADR design 자체는 acceptable, ops 측면 (rollback / recovery / observability / blast radius / deploy / env matrix) minimum assumption 미명시.

## 3. 결정

- D1 (brainstorm Q1) — 본 sprint = 설계 sprint, 실제 이동은 다음 sprint.
- D2 (Q2) — pnpm workspaces (corepack 도입).
- D3 (Q3) — Node 관행 폴더 명명.
- D4 (Q4) — `packages/domain` 별 workspace 모듈 SoT.
- D5 (Q5) — ADR 0001 운영 형상 supersede 본 sprint 와 분리, 별 운영 ADR (§15 #1).
- D6 (Q6) — 컨테이너 분산: Dockerfile = 각 service, `docker-compose.yml`+db+s3(localstack) = `infra/`, redis 미도입.
- D7 (Q7) — backend surface 4종 (api/mcp/cli/web) 별 모듈.
- D8 (Q8) — `apps/*` + `infra/` + `packages/*` 평평 monorepo.
- D9 (라운드 4) — PII fixture 정리 옵션 A (synthetic placeholder + env interpolation, .env gitignored 주입).
- D10 (라운드 5 + 7) — alias 형태 이메일로 User.email @unique 충돌 회피 (학교 메일 시스템 alias 동작 컨펌). 추후 운영 ADR 작성 시점에 stack 후보 (deploy / observability / secret manager / DB managed / CDN) 의 장단점 표 + 사용자 환경 (학생 Student Pack + Azure + DigitalOcean) 권장 default 제시 의무.

## 4. 검증

- 명령 / 체크:
  - sprint-1 plan AC10 (e) 의 grep 명령 (round 5 갱신 후, 정규식 SoT = `plan.md` AC10 (e) 또는 ADR 0007 §11 (e), 본 report 인라이닝 회피) = **no match** (2026-05-09 21:45 KST).
  - smoke-backend-contract `SECOND_USER_NAME`/`STUDENT_NUMBER` env-driven 정렬: line 8-9 + 267-268 모두 통과.
  - Gate 3 review round 5 codex CPO 본인 환경에서 동일 grep 실행 → no matches (independent verification).
  - plan.md §7 self-CPO mini-check round 5 = PASS (9 행 모두 통과).
- 결과: Gate 3 (security lens) PASS, Gate 4 (ops lens) round 1 partial → round 2 rework 진행.
- 수동 확인: 사용자 `.env` (gitignored) 에 PII 환경변수 alias 형태로 inject. 학교 메일 시스템에서 + alias 동작 사용자 라운드 5 컨펌.

## 5. 위험 / 후속

- 위험 (brainstorm §7 + plan §6 인계):
  - R1 도메인 SoT invariant 차이 (frontend ↔ backend rich) — ADR §5 표에 invariant 차이 컬럼 명시.
  - R2 pnpm hoisting × native 모듈 (onnxruntime-node / @xenova/transformers / pdf-parse) 미검증 — 다음 sprint 첫 슬라이스 smoke 1회 의무.
  - R3 scripts/*.mjs 10개 PR 단위 — ADR §14 PR 분할 4단계.
  - R4 ADR 0001 supersede 분리 부작용 (운영 형상 가정 위에 도면) — ADR §1 + §15 #1.
  - R5 layer packages 후보 후순위 결정 부담 — ADR §9 우선순위 표 (1차/2차/3차).
  - R6 ADR 길이 폭주 — 320 줄로 압축, plan §6 R6 mitigation 통과.
  - R7 brainstorm ↔ ADR drift — 라운드 5/7 raw 답변 모두 §8 append log 보존.
  - R8 security lens partial 재발 — Gate 3 round 5 PASS, 본 risk 종료.
- 후속:
  - **즉시**: ADR §18 ops appendix 합성 (Gate 4 round 1 finding F1) + ADR §6 compose 분리 노트 (F2) → `sfs review --gate 4` round 2.
  - **Gate 4 PASS 후**: `sfs retro [--close]` 로 sprint 종료. ADR 0007 + S7/S8 commit + report.md 가 다음 sprint 의 입력.
  - **다음 sprint** (이동 sprint): ADR §14 의 PR 4단계 (workspaces 도입 → domain 통합 → surface 분리 → infra 분리). ADR §13 의 6 security regression 을 다음 sprint AC 로 등재. ADR §15 #2 의 native 모듈 호환성 smoke 의무.
  - **운영 ADR (별 sprint, 실제 배포 임박 시)**: ADR 0001 운영 형상 절 supersede + 사용자 환경 (학생 Student Pack + Azure + DigitalOcean) 기반 stack 후보 장단점 표 + 권장 default 제시 (라운드 7 컨펌).

## 6. 남긴 것 / 접은 것

- 남김 (durable, 다음 sprint 의 입력):
  - `docs/solon/decisions/0007-module-architecture-redistribution.md` (ADR 0007, 320 줄)
  - 본 report.md (sprint workspace handoff)
  - S7/S8 코드 변경 8 파일 (commit 후 다음 sprint 의 baseline)
- private archive (`.sfs-local/sprints/2026-W19-sprint-1/`):
  - `brainstorm.md` (라운드 1~5 owner decision raw + 정제)
  - `plan.md` (round 1~5 contract 진화)
  - `review.md` (Gate 3 round 1~5 + Gate 4 round 1 호출 기록)
  - `.sfs-local/tmp/review-runs/2026-W19-sprint-1-gate3-*.result.md` (Gate 3 raw result 5개)
  - `.sfs-local/tmp/review-runs/2026-W19-sprint-1-gate4-*.result.md` (Gate 4 raw result 1개 + 후속)
- 접은 것: 본 sprint scope 외 (운영 ADR / Azure·DO 실제 deploy script / native 모듈 hoisting smoke / layer packages 실제 추출 / 영향 path 의 실제 patch — 모두 다음 sprint 또는 별 sprint).

## 7. 다음

- 즉시 next: `sfs review --gate 4` round 2 (ADR §18 ops appendix 추가 후).
- Gate 4 PASS 후: `sfs retro [--close]` → sprint close.
- 다음 sprint plan seed: ADR 0007 의 §14 PR 분할 4단계 + §15 의무 6개 + §13 security regression 6 행을 입력으로 새 brainstorm.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (144 tracked files), domains=0, last_review=partial, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T21:23:53+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
