---
phase: retro
gate_id: G5
sprint_id: 2026-W18-sprint-6
goal: "nest.js 백엔드 구축 -> 내가볼때 지금 1,2번은 한번에 가는게 맞은 백엔드 기능이라"
created_at: "2026-05-02T14:52:35+09:00"
last_touched_at: 2026-05-02T08:30:12+00:00
closed_at: 2026-05-02T08:30:12+00:00
---

# Retro — NestJS Backend MVP

> Sprint **G5 — Sprint Retro** 산출물. 학습 루프 (정성, N PDCA 집계).
> `/sfs retro --close` 로 본 sprint 의 `closed_at` 을 frontmatter 에 기록 + `.sfs-local/events.jsonl` 의 `sprint_close` event append.
> SSoT: `gates.md §1` (G5) + `05-gate-framework.md §5.1.3` (Sprint Retro).
> 생명주기: `retro.md` 는 history/learning 을 보존하는 문서다. 실제 작업 결과는 close 전
> `report.md` 로 압축하고, workbench 문서는 compact stub 로 정리한다.

---

## §1. KPT (Keep / Problem / Try)

### Keep — 잘 된 것 (계속)

- Backend slice를 auth/session, material ownership, storage boundary, annotation, export bundle로 작게 잘랐다.
- Gate 6 review가 요구하는 raw output과 source evidence를 `implement.md`에 남겨 CPO가 AC1-AC12를 확인할 수 있게 했다.
- `smoke:backend`가 user ownership을 material/get/download/annotation/export까지 확인한다.
- `smoke:pdf-workspace`가 backend와 Vite를 직접 띄우고 실제 login form submit으로 invalid/valid auth를 검증한다.
- SFS review packaging 문제를 제품 결함과 분리해서 확인했고, 0.5.76에서 Gate 6 pass까지 검증했다.

### Problem — 안 된 것 / 막힌 것

- 초기 Gate 6 review는 product code보다 SFS evidence packaging gap 때문에 여러 번 partial이 났다.
- Backend runtime persistence는 아직 in-memory다. Prisma schema는 contract artifact이고 실제 MySQL persistence는 다음 sprint 범위다.
- Frontend login gate는 localStorage session을 먼저 신뢰한다. Backend API는 보호되지만, 앱 시작 시 `/api/me` revalidation이 아직 없다.
- Dev credential seed는 local MVP에만 적합하다. 배포 전 계정/secret 운영 정책이 필요하다.

### Try — 다음 sprint 시도

- 앱 시작 시 stored session을 `/api/me`로 재검증하고 실패 시 login으로 돌린다.
- material/annotation/session runtime을 Prisma/MySQL로 연결한다.
- `StoragePort`에 real S3 provider를 추가하고 bucket/region/key/CORS를 `.env` 기반으로 검증한다.
- 배포 전 dev credentials와 in-memory state를 제거하거나 명시적으로 local profile로 격리한다.

## §2. PDCA 학습

- **Plan**: G1은 real S3/MySQL 대신 local/mock contract를 허용했지만, "Prisma/MySQL schema"와 "runtime persistence" 경계가 혼동될 수 있었다. 구현 evidence에서 schema artifact와 active runtime을 분리해 명시했다.
- **Do**: Backend는 `StoragePort`를 public boundary로 두고, `MaterialsService.getMaterial(ownerId, materialId)`를 모든 protected material sub-route의 ownership gate로 사용했다.
- **Check**: Gate 6 final verdict는 pass. CPO는 AC1-AC12가 embedded evidence로 충족된다고 판단했다.
- **Act**: 다음 backend sprint는 "contract artifact"가 아니라 active runtime persistence/S3 provider를 목표로 잡아야 한다. Smoke는 외부 서버 precondition 없이 자체 서버를 띄우는 방식으로 유지한다.

## §3. 정량 메트릭 (선택)

- **Gate 6 review verdict 분포**: partial 여러 차례 후 final pass.
- **AC 통과율**: AC1-AC12 pass by final Gate 6 review.
- **검증 명령**:
  - `npm run build` pass
  - `npm run smoke:backend` pass
  - `npm run smoke:pdf-workspace` pass
  - secret grep no matches

## §4. 다음 sprint 인계

- **이어가는 항목**:
  - `/api/me` 기반 frontend session revalidation.
  - Prisma/MySQL runtime persistence for users/sessions/materials/annotations.
  - Real S3 provider behind `StoragePort`.
- **분기되는 WU/sprint**:
  - True flattened annotated PDF export는 별도 sprint.
  - Deployment hardening은 real persistence/S3 이후 별도 sprint.
- **결정 대기 (W10 후보)**:
  - 실제 S3 bucket/region/IAM key 전달.
  - signup/admin-created user policy.
  - 배포 전 credential/secret 운영 방식.

## §5. G5 close 체크

- [x] Gate 6 Review final verdict = pass.
- [x] `closed_at` frontmatter 기록 (`sfs retro --close` 가 자동 채움)
- [x] Durable result compressed into `report.md`.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T08:30:12+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
