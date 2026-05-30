---
phase: report
status: final
sprint_id: "2026-W21-sprint-2"
workspace: "cold-start-ux"
handoff_dir: "docs/solon/cold-start-ux/20260521"
goal: "세션 확인 cold start UX 개선 + PDF 업로드 운영 500 재발 방지"
created_at: "2026-05-21T13:06:06+09:00"
last_touched_at: "2026-05-21T13:06:06+09:00"
closed_at: "2026-05-21T13:06:06+09:00"
---

# 보고서

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 결과

- 목표: 무료 운영 상태에서 `/v1/auth/me` cold start UX를 복구 가능하게 만들고, 운영 PDF upload-intent 500을 재발 방지한다.
- 상태: done
- 판정: self CPO pass, Claude cross-review pass
- 한 줄 결과: 세션 확인 화면은 bounded retry + manual retry로 바뀌었고, PDF 업로드의 Subject FK 500은 `400 INVALID_SUBJECT`와 prod-safe subject seed로 닫았다.

## 2. 완료한 것

- 운영 즉시 복구:
  - Azure Container App R2/S3 env 적용.
  - 운영 Subject 기준 데이터 4개 upsert.
  - `/api/health`에서 `storageProvider:"s3"` 확인.
- Backend:
  - `createUploadIntent`에서 `subjectId` 존재 여부를 사전 검증.
  - unknown subject는 `400 INVALID_SUBJECT`, `PdfMaterial` row 생성 없음.
  - dev user seed와 Subject seed 분리.
  - entrypoint에 `STUDY_NOTE_RUN_SUBJECT_SEED` 추가. 기본 true, dev user seed는 기존 `STUDY_NOTE_RUN_SEED`로 분리.
- Frontend:
  - session check 상태를 `checking/waking/retryable`로 세분화.
  - 5xx/network/timeout은 “서버를 깨우는 중” 안내와 bounded auto retry.
  - retry limit 이후 “서버 응답이 늦어지고 있어요” + “다시 확인” 버튼.
  - 401/403은 cold-start 화면에 머물지 않고 로그인 화면으로 빠르게 전환.

## 3. 결정

- 서버 재시작 후 자동 로그인은 정상 동작으로 유지한다. HttpOnly cookie + DB Session row + pepper가 유지되기 때문이다.
- 비용을 쓰는 Azure min replica 1은 하지 않는다.
- 운영 기준 데이터인 Subject seed는 prod-safe upsert로 분리하고, dev user seed는 계속 prod에서 꺼둔다.

## 4. 검증

- 명령/체크:
  - `pnpm --filter @study-note/api build`
  - `pnpm --filter @study-note/web build`
  - `pnpm test:backend`
  - `pnpm smoke:backend`
  - Browser Playwright mock: `/v1/auth/me` 500/401/200 cases at 430 x 932 viewport
  - `curl -fsS https://study-note.910701.xyz/api/health`
- 결과:
  - backend build pass
  - web build pass
  - backend unit: 29 tests, 29 pass
  - backend smoke pass, including `INVALID_SUBJECT` row-count regression
  - prod health: `{"ok":true,"service":"study-note-backend","storageProvider":"s3"}`
- 수동 확인:
  - 500 mock: retryable copy + `다시 확인` button visible, no horizontal overflow.
  - retry click: “서버를 깨우는 중” state로 복귀.
  - 401 mock: login page visible, session checking dismissed.
  - 200 mock: signed-in home visible, logout button present.

## 5. 위험 / 후속

- 위험:
  - Subject seed failure는 entrypoint에서 non-fatal이다. 지금은 user-visible 400으로 degrade되지만, 향후 모니터링이 있으면 warning alert를 붙이는 게 좋다.
  - Subject 목록은 code seed에 고정되어 있다. 과목 추가/변경은 코드 변경 + 배포가 필요하다.
- 후속:
  - 다음 ops/infra 작업에서 subject seed warning 로그를 배포 체크리스트나 monitoring 대상으로 올린다.
  - PDF 업로드는 이제 master/admin만 가능하므로, 운영 계정 role을 실제로 확인하고 필요한 사용자를 master/admin으로 승격한다.

## 6. 남긴 것 / 접은 것

- 남김: upload recovery 후 실제 사용자 브라우저에서 master/admin 계정으로 PDF 업로드 재시도.
- private archive: `.sfs-local/sprints/2026-W21-sprint-2`, review run outputs under `.sfs-local/tmp/review-runs`.

## 7. 다음

- 사용자 터미널에서 commit/push 후 FE/BE release workflow 확인.
- 운영에서 PDF 업로드를 다시 시도한다. 403이면 role 문제, 400이면 subjectId 문제, 5xx이면 Azure logs 확인.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (315 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T13:06:06+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
