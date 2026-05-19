---
phase: report
status: final
sprint_id: "2026-W20-sprint-10"
workspace: "pdf-s3-direct-ux"
handoff_dir: "docs/solon/lecture-note/pdf-workspace/s3-direct-upload-ux/20260518"
goal: "PDF 업로드 S3 direct + 작업공간 UX 재배치"
created_at: "2026-05-18T11:25:54+09:00"
last_touched_at: "2026-05-18T11:25:54+09:00"
closed_at: "2026-05-18T11:25:54+09:00"
---

# 보고서

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 결과

- 목표: 강의 PDF (5–50MB) 가 브라우저 → S3 direct PUT (dev=localstack / prod=AWS 동일 코드) + 작업공간 진입 1–2 click + compose up 만으로 BE sign-in 동작.
- 상태: **done**
- 판정: AC1~AC8 모두 충족 (코드 + smoke + 수동 dogfood). 실 AWS S3 검증은 sprint-10 scope 외 (인프라는 사용자 측 이미 준비 — [[project-aws-s3-provisioned]]).
- 한 줄 결과: PDF S3 direct + UX D 안 + DB 자동화 dogfood-ready, env 교체만으로 prod 전환 가능 상태.

## 2. 완료한 것

- **slice-1** — S3 storage provider 분기 + localstack init + nginx 5MB safety net (R1/R3/R6/R7)
- **slice-2** — FE S3 direct PUT + completion endpoint R8 4-rule contract + `/api/health` storageProvider 동적화 (R2/R8)
- **slice-3** — PDF 작업공간 UX D 안 — sidebar 글로벌 parent + 과목 hero CTA + `#/pdf-workspaces` index route (R4)
- **slice-4** — `prisma migrate deploy` 자동화 (entrypoint DB readiness 대기 + 실패 시 exit + seed 토글) + rollback runbook (R5/R9)
- 신규 env 문서화 (`.env.example`): `STORAGE_PROVIDER`, `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `STUDY_NOTE_RUN_SEED`

## 3. 결정

- **R7 dual endpoint**: BE 의 S3Client 는 `S3_ENDPOINT` (내부 `s3-service:4566`) 로 connect, pre-signed URL 의 host 는 `S3_PUBLIC_ENDPOINT` (외부 `localhost:4566` 또는 AWS default) 로 발급. `forcePathStyle` env 분기로 localstack ↔ AWS 호환.
- **R8 completion 4-rule**: idempotent + headObject byte 일치 검증 + retry 3회 + pending 24h soft-delete.
- **UX D 안**: 글로벌 사이드바 parent `"PDF 작업공간"` + 과목 hero CTA `"PDF 작업공간 열기"` + 신규 글로벌 route `#/pdf-workspaces` (4 과목 카드 index). 기존 `#/subjects/<id>/pdf-workspace` BC 유지.
- **prisma CLI 설치**: runner stage `npm install -g prisma@6.19.3` (pnpm symlink dangling 회피).
- **seed 정책**: dev 기본 `STUDY_NOTE_RUN_SEED=true` (compose 기본값), prod 명시적 false.

## 4. 검증

- 명령/체크:
  - `pnpm --filter @study-note/api build` ✅ / `pnpm --filter @study-note/web build` ✅
  - `docker compose down -v && docker compose up -d --build` ✅ (4 컨테이너 healthy)
  - `curl http://localhost:3001/api/health` → `{"ok":true,"storageProvider":"s3"}` ✅
  - `curl -X POST .../api/v1/auth/sign-in` → 200 (host 수동 migrate 없이, AC5) ✅
  - `docker exec s3-service awslocal s3 ls s3://study-note-dev/ --recursive` → object 1건 확인 (2865203 byte PDF)
  - `git ls-files | xargs grep -l AKIA` → empty (AC6) ✅
- 결과: AC1~AC8 모두 통과.
- 수동 확인: home → sidebar "PDF 작업공간" → 4 과목 index → 1 click 진입 (AC4), home → 과목 → hero CTA → 작업공간 (AC4), 10MB PDF 업로드 → S3 object + DB `uploadStatus=uploaded` + 미리보기 (AC1).

## 5. 위험 / 후속

- 위험:
  - 실 AWS S3 전환 시 bucket CORS rule 누락 가능성 (localstack init script 와 동일하게 적용되어 있는지 사용자 확인 필요).
  - access key 평문 (`.env.local`) — prod 는 EC2 instance role 로 전환 검토.
  - `pending` 상태 orphan row 자동 정리 없음 — 디스크/DB row 누적 가능.
- 후속:
  - 실 AWS S3 prod 전환 (인프라 준비 완료, env 5개 교체 + 1회 검증).
  - orphan cleanup cron job.
  - multipart upload / 청크 + 진행률 UX.
  - annotation server-side persistence.
  - GPT-5.3-Codex-Spark bridge 호스트 구성 (worker tiering 완성).

## 6. 남긴 것 / 접은 것

- 남김: 실 AWS S3 prod 전환 task, orphan cleanup cron, multipart upload, annotation persistence, codex-spark bridge.
- private archive: (해당 없음 — 모든 결정/검증 evidence 가 plan/implement/log/review/retro 에 공개됨).

## 7. 다음

- 사용자: 현재 branch `feature/sprint-10-s3-direct-upload-ux` push (Solon §1.5 — push 는 사용자 터미널). PR 생성 또는 main merge 결정.
- 다음 sprint 진입 시 `infra` division activate (light) 검토 — deploy/observability/rollback checklist 도입 적기.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (283 tracked files), domains=0, last_review=unknown, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-18T11:25:54+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
