---
phase: report
status: final
sprint_id: "2026-W21-sprint-1"
workspace: "pdf"
handoff_dir: "docs/solon/user/accounts/persistence/20260521"
goal: "공용 PDF 자료와 사용자별 필기 저장 분리"
created_at: "2026-05-21T04:00:17+09:00"
last_touched_at: "2026-05-21T04:00:17+09:00"
closed_at: "2026-05-21T04:00:17+09:00"
domain: "user"
subdomain: "accounts"
feature: "persistence"
---

# 보고서

## 1. 결과

- 목표: PDF 원본 자료는 master/admin이 업로드한 공용 자료로 공유하고, 학생 필기/annotation은 사용자별로 독립 저장한다.
- 상태: done
- 판정: Gate 6 (Review) Claude `api-contract` PASS
- 한 줄 결과: backend source-of-truth 기준으로 normal 사용자는 업로드가 403으로 차단되고, admin/master 업로드 PDF는 모든 인증 사용자가 읽되 annotation은 `(materialId, ownerId)`별로 분리된다.

## 2. 완료한 것

- Upload endpoint 권한:
  - `POST /materials/upload-intent`
  - `PUT /materials/:id/file`
  - `POST /materials/:id/complete`
  - 위 3개에 `@Roles("master", "admin")` + `RoleGuard` 적용.
- Shared-read contract:
  - 본인 자료는 계속 조회 가능.
  - uploaded + admin/master 업로더 자료는 모든 인증 사용자가 list/get/file/download/export/annotation 접근 가능.
  - normal이 과거 업로드한 legacy 자료는 owner-only로 유지.
  - pending 자료는 uploader-only로 유지.
- Annotation persistence:
  - Prisma unique key를 `materialId` 단독에서 `(materialId, ownerId)` compound unique로 변경.
  - `saveAnnotation`/`getAnnotation`은 현재 사용자 snapshot만 update/read.
  - snapshot이 없으면 현재 사용자 기준 empty annotation 객체 반환.
- DTO:
  - `PdfMaterialRecord.uploaderId` 추가.
  - `ownerId`는 호환용 uploader/audit alias로 유지하고 deprecated 처리.
- Smoke/test 갱신:
  - stale cross-user deny smoke를 새 shared-read 계약으로 교체.
  - normal upload 403, normal shared-read/download/file, normal independent annotation, empty list response 회귀 테스트 추가.

## 3. 결정

- Decision 0005: `ownerId`를 즉시 삭제하지 않고 `uploaderId`를 additive field로 추가한다. `ownerId`는 이번 WU에서는 uploader alias이며 access owner로 해석하지 않는다.
- FE upload panel 숨김은 후속 UI WU로 분리한다. 이번 WU는 backend contract 안정화가 acceptance.
- visibility enum이나 material model 분리는 장기적으로 가능하지만 이번에는 shared-read query + per-user annotation으로 최소 변경한다.

## 4. 검증

- 명령/체크:
  - `pnpm prisma:generate`
  - `pnpm --filter @study-note/persistence build`
  - `pnpm test:backend`
  - `pnpm --filter @study-note/storage build`
  - `pnpm smoke:backend`
  - `pnpm --filter @study-note/web build`
  - `pnpm --filter @study-note/api build`
  - `sfs review --gate 6 --lens api-contract --executor claude --generator codex`
- 결과:
  - Prisma generate PASS.
  - Backend tests PASS: 4 spec files, 29 tests, 29 pass.
  - Backend smoke PASS with real MySQL Docker DB, all 9 migrations applied.
  - Web/API/persistence/storage builds PASS.
  - Claude Gate 6 (Review) PASS.
- 수동 확인:
  - Docker smoke는 sandbox socket 권한 때문에 escalated run으로 검증.
  - Migration은 MySQL FK index 요구 때문에 compound unique index를 먼저 만들고 기존 unique index를 drop하는 순서로 수정.

## 5. 위험 / 후속

- 위험:
  - FE는 아직 normal 사용자에게 upload panel을 보여줄 수 있다. backend는 403으로 막지만 UX는 다음 WU에서 정리해야 한다.
  - FE가 material 404의 legacy `message`만 읽는 곳이 있다면 `{ errorCode, errorMessage }`를 함께 처리해야 한다.
  - `ownerId` raw value는 normal UI에 그대로 노출하지 않는 것이 좋다.
- 후속:
  - Role-aware PDF upload UI: normal은 upload dropzone/CTA 숨김.
  - Empty shared material copy: "아직 등록된 공용 PDF가 없습니다. 관리자에게 자료 업로드를 요청하세요."
  - stale-tab 403 copy + `role="alert"` inline feedback.

## 6. 남긴 것 / 접은 것

- 남김:
  - FE upload panel policy WU.
  - raw `ownerId` display policy 정리.
- private archive:
  - `.sfs-local/sprints/2026-W21-sprint-1/`
  - Cold archive: `.sfs-local/archives/sprints/2026-W21-sprint-1/2026-05-21T04-00-17-09-00/sprint-evidence.tar.gz`
  - Claude Gate 6 result is archived inside that tarball at `tmp/review-runs/2026-W21-sprint-1-gate6-20260520T185835Z-70021/stdout.md`

## 7. 다음

- 다음 sprint 권장: normal 사용자용 PDF upload UI 숨김/empty-state/stale 403 안내를 반응형 UI 기준으로 구현.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (308 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T04:00:17+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
