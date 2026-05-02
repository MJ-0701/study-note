---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5          # legacy storage id
sprint_id: 2026-W18-sprint-9
goal: "S3-backed material storage provider"
created_at: "2026-05-02T20:13:46+09:00"
last_touched_at: 2026-05-02T12:16:19+00:00
closed_at: 2026-05-02T12:16:19+00:00
---

# Retro — S3-backed Material Storage Provider

> Sprint **Gate 7 — Retro** 산출물. 학습 루프 (정성, N PDCA 집계).
> `/sfs retro --close` 로 본 sprint 의 `closed_at` 을 frontmatter 에 기록 + `.sfs-local/events.jsonl` 의 `sprint_close` event append.
> SSoT: `gates.md §1` (Gate 7) + `05-gate-framework.md §5.1.3` (Sprint Retro).
> 생명주기: `retro.md` 는 history/learning 을 보존하는 문서다. 실제 작업 결과는 close 전
> `report.md` 로 압축하고, workbench 문서는 compact stub 로 정리한다.

---

## §1. KPT (Keep / Problem / Try)

### Keep — 잘 된 것 (계속)

- Gate 2에서 S3 방식을 명확히 고른 것이 좋았다: 실제 S3 경로 포함, upload status DB 관리, backend proxy 처리.
- Sprint 8에서 만든 `StoragePort` 경계를 그대로 살려서 S3 provider를 넣었다. controller가 AWS SDK에 직접 의존하지 않는 구조가 유지됐다.
- `pending -> uploaded` 순서를 storage write 성공 뒤 DB update로 잡아서 stale metadata 위험을 눈에 보이게 만들었다.
- local/mock provider를 기본값으로 유지해서 AWS env 없이도 기존 개발/스모크 흐름이 계속 돈다.
- mocked S3 smoke, DB-backed backend contract smoke, PDF workspace smoke가 모두 통과해서 evidence가 단단하다.

### Problem — 안 된 것 / 막힌 것

- Docker daemon이 처음 꺼져 있어 DB-backed smokes가 한 번 막혔다. Docker Desktop 실행 후 재검증해서 해결했다.
- 이번 sprint는 backend contract 중심이라, 실제 frontend에서 PDF 파일을 서버로 업로드하고 서버 URL로 preview하는 UX는 아직 붙지 않았다.
- 실제 AWS bucket/IAM 생성과 credentials 전달은 아직 사용자 영역으로 남아 있다.
- backend proxy 방식은 MVP에는 맞지만, 파일 크기/사용자 수가 커지면 presigned direct upload로 전환할 가능성이 있다.

### Try — 다음 sprint 시도

- 다음 frontend slice에서는 `PUT /api/materials/:materialId/file`을 실제 PDF 선택 flow에 연결하고, `GET /api/materials/:materialId/file`로 preview를 열게 한다.
- 실제 AWS credentials가 준비되면 `RUN_REAL_S3_SMOKE=1`로 real S3 put/get smoke를 한 번 돌린다.
- 배포 전에는 `PDF_UPLOAD_MAX_BYTES`, IAM policy, bucket lifecycle, backup/삭제 정책을 별도 infra checklist로 점검한다.
- material delete API를 만들 때 S3 object cleanup도 같은 sprint scope에 넣는다.

## §2. PDCA 학습

- **Plan**: backend proxy, DB upload status, env-only S3 config라는 핵심 결정이 구현과 거의 그대로 맞아떨어졌다.
- **Do**: `StoragePort`를 URL intent만이 아니라 `putObject/getObject` boundary로 확장한 것이 작고 효과적인 변화였다.
- **Check**: Gate 6 (Review) Gemini verdict는 `pass`. Evidence gaps와 required CTO actions 모두 없음.
- **Act**: 다음 slice에서는 backend contract를 바꾸기보다 frontend PDF workspace를 이 계약에 연결하는 쪽으로 진행한다.

## §3. 정량 메트릭 (선택)

- **AC 통과율**: AC1-AC13 모두 Gate 6 review pass.
- **검증 명령**: `npm run build`, `npm run smoke:s3-storage`, `npm run smoke:s3-real`, `npm run smoke:backend`, `npm run smoke:pdf-workspace`, Prisma validate/generate.
- **Gate 6 verdict 분포**: Gemini 1회, `pass`.
- **Required CTO actions**: 0개.

## §4. 다음 sprint 인계

- **이어가는 항목**:
  - `StoragePort` + `S3StorageService` backend binary storage boundary.
  - `PdfMaterial.uploadStatus` with `pending` / `uploaded`.
  - Backend proxy endpoints: `PUT /api/materials/:materialId/file`, `GET /api/materials/:materialId/file`.
  - Local/mock default provider and optional real S3 smoke.
- **분기되는 WU/sprint**:
  - Frontend PDF workspace integration with backend upload/download.
  - Real AWS bucket/IAM validation once credentials are available.
  - Material deletion plus S3 object cleanup.
  - Cohort sharing/user provisioning.
- **결정 대기 (W10 후보)**:
  - 실제 S3 bucket name/region/credential 전달.
  - production PDF max file size.
  - backend proxy를 계속 유지할지, 사용자 수 증가 시 presigned direct upload로 바꿀지.

## §5. Gate 7 close 체크

- [x] events.jsonl 마지막 entry = Gate 7 review/close verdict (`sprint_close` 기록 확인)
- [x] `closed_at` frontmatter 기록 (`2026-05-02T12:16:19+00:00`)
- [x] `report.md`에 본 sprint 결과/검증/다음 액션 압축

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (38 tracked files), domains=0, last_review=pass, infra_signals=0, ui_signals=0
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- generated_at: 2026-05-02T12:16:19+00:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
