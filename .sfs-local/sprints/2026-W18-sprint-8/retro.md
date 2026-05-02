---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5          # legacy storage id
sprint_id: 2026-W18-sprint-8
goal: "Prisma/MySQL runtime persistence for users/sessions/materials/annotations"
created_at: "2026-05-02T18:07:35+09:00"
last_touched_at: 2026-05-02T09:42:48+00:00
closed_at: 2026-05-02T09:42:48+00:00
---

# Retro — Prisma/MySQL Runtime Persistence

> Sprint **Gate 7 — Retro** 산출물. 학습 루프 (정성, N PDCA 집계).
> `/sfs retro --close` 로 본 sprint 의 `closed_at` 을 frontmatter 에 기록 + `.sfs-local/events.jsonl` 의 `sprint_close` event append.
> SSoT: `gates.md §1` (Gate 7) + `05-gate-framework.md §5.1.3` (Sprint Retro).
> 생명주기: `retro.md` 는 history/learning 을 보존하는 문서다. 실제 작업 결과는 close 전
> `report.md` 로 압축하고, workbench 문서는 compact stub 로 정리한다.

---

## §1. KPT (Keep / Problem / Try)

### Keep — 잘 된 것 (계속)

- Gate 3에서 DB persistence 범위를 AC1-AC15로 잘 쪼갠 덕분에 구현과 리뷰가 흔들리지 않았다.
- `StoragePort`는 binary boundary로 유지하고 Prisma/MySQL은 metadata/session/annotation persistence만 담당하게 한 분리가 깔끔했다.
- 세션을 raw bearer token이 아니라 deterministic HMAC `tokenHash`로 저장한 결정은 MVP 수준에서 필요한 보안선을 넘겼다.
- DB-backed smoke가 temporary MySQL, migration, seed 2회, backend restart persistence, cross-user 404까지 한 번에 검증해서 리뷰 증거가 강했다.
- Gemini Gate 6 review에서 independence risk 없이 `pass`를 받았고 required CTO action이 없었다.

### Problem — 안 된 것 / 막힌 것

- Prisma 7은 `datasource.url` schema 방식과 맞지 않아 초기 검증이 막혔다. 현재 프로젝트는 Prisma 6.19.3으로 pin 하는 쪽이 맞다.
- `npx prisma generate`가 로컬 cache 접근 때문에 sandbox escalation을 한 번 요구했다. fresh environment에서 generate/cache 권한은 계속 주의해야 한다.
- 아직 사용자 provisioning은 seed 기반 MVP라서 실제 동기 공유 단계에서는 cohort/admin/import 흐름을 별도 sprint로 결정해야 한다.
- S3 binary upload는 의도적으로 deferred라서 PDF 원본의 운영 저장소 문제는 아직 남아 있다.

### Try — 다음 sprint 시도

- S3 연동 sprint에서는 `StoragePort` 구현체만 교체/확장하고, 이번 sprint의 Prisma metadata contract는 유지한다.
- 실제 공유 전에는 `name + studentNumber`만으로 충분한지, PIN/password 또는 admin-created cohort 방식이 필요한지 다시 Gate 2에서 결정한다.
- smoke DB helper의 `STUDY_NOTE_USE_EXISTING_DB=1` 경로를 유지해서 Docker 임시 DB와 개인 MySQL 검증을 둘 다 지원한다.
- Prisma major upgrade는 별도 dependency sprint로 다루고, schema 방식 변경 여부를 먼저 검토한다.

## §2. PDCA 학습

- **Plan**: 의도는 "runtime state를 MySQL로 옮긴다"였고 결과도 그대로 달성했다. 차이가 있었던 항목은 Prisma 최신버전 호환성뿐이며, pinning으로 처리했다.
- **Do**: Nest controller/API shape는 거의 유지하고 service boundary만 Prisma로 바꾸는 패턴이 효과적이었다. Backend restart smoke는 persistence sprint의 기본 증거로 삼을 만하다.
- **Check**: Gate 6 (Review) Gemini verdict는 `pass`. Evidence gaps와 required CTO actions 모두 없음.
- **Act**: 다음 persistence/storage sprint에서도 "public API 유지 + boundary 교체 + smoke로 재시작/소유권 검증" 패턴을 재사용한다.

## §3. 정량 메트릭 (선택)

- **AC 통과율**: AC1-AC15 모두 Gate 6 review pass.
- **검증 명령**: `npm run build`, `npm run smoke:backend`, `npm run smoke:pdf-workspace`, `npx prisma validate`, `npx prisma generate`, backend runtime `Map` source search.
- **Gate 6 verdict 분포**: Gemini 1회, `pass`.
- **Required CTO actions**: 0개.

## §4. 다음 sprint 인계

- **이어가는 항목**:
  - MySQL-backed users/sessions/materials/annotations foundation.
  - `StoragePort` boundary and local/mock storage provider.
  - Local MVP seed users and four subject seed rows.
- **분기되는 WU/sprint**:
  - Real S3 upload/download provider.
  - Cohort/user provisioning model.
  - Production auth hardening if external sharing becomes real.
  - Deployment/runtime environment setup for MySQL + backend + frontend.
- **결정 대기 (W10 후보)**:
  - 동기 공유용 계정 생성 방식: admin-created, CSV/import, self-registration 중 선택.
  - 로그인 방식: 이름+학번 유지 vs PIN/password 추가.
  - S3 bucket/region/key 전달 시점과 local/dev credential 관리 방식.

## §5. Gate 7 close 체크

- [x] events.jsonl 마지막 entry = Gate 7 review/close verdict (`sprint_close` 기록 확인)
- [x] `closed_at` frontmatter 기록 (`2026-05-02T09:42:48+00:00`)
- [x] `report.md`에 본 sprint 결과/검증/다음 액션 압축

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T09:42:48+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
