---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W20-sprint-10"
workspace: "pdf-s3-direct-ux"
handoff_dir: "docs/solon/pdf-s3-direct-ux/20260518"
goal: "PDF 업로드 S3 direct + 작업공간 UX 재배치"
created_at: ""
last_touched_at: "2026-05-18T11:25:54+09:00"
closed_at: 2026-05-18T11:25:54+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **slice 단위 commit + worker tiering**: 4 slice (S3 provider / FE direct PUT + completion / UX D 안 / prisma 자동화) 각각 독립 commit + Sonnet 4.6 vs `gpt-5.4` 배분으로 main context 보존. Opus 직접 코딩 금지 규율 준수.
- **AC ↔ file 매핑 + 검증 명령 plan 에 명시**: AC8 모두 plan §3 에서 파일 경로와 검증 수단 (smoke / unit / 수동) 동시에 기재 → 구현/검증 누락 방지에 효과적.
- **R8 4-rule contract (idempotent / headObject 검증 / retry / orphan cleanup)** 처럼 endpoint 행동 규약을 plan 단계에서 4 항목으로 못박는 패턴. 구현 시 빠질 수 있는 race / mismatch 케이스가 사전에 닫힘.
- **localstack endpoint 이중화 (내부 `s3-service:4566` vs 외부 `localhost:4566`)** 를 R7 로 명시 — pre-signed URL host 분리 (`S3_PUBLIC_ENDPOINT`) 가 dev/prod 동일 코드로 동작하는 핵심.

## 2. 문제

- **AC checkbox 갱신 누락**: plan.md AC1~AC8 전부 `[ ]` 상태로 마감. dogfood 후 marking 안 함. log.md 에는 evidence 적었지만 plan.md 와 동기화 안 됨.
- **smoke-auth-signin 회귀 미실행**: slice-2 후 업데이트 예정으로 적었으나 실제 재실행 기록 부재. 대신 수동 `curl /api/v1/auth/sign-in 200` 으로 대체 검증.
- **수동 dogfood 시점 지연**: 4 slice commit 완료 후 retro 진입 직전까지 사용자 검수 보류. dogfood 늦으면 retro 단계에서 회귀 발견 시 rollback 비용 큼. 이번엔 무사히 통과.
- **GPT-5.3-Codex-Spark bridge 호스트 미구성**: slice-4 worker tiering 에서 spark 대신 Sonnet 4.6 fallback. infra task = future spark bridge 구성.
- **localstack 검증 vs 실 S3 검증 경계**: 사용자가 "진짜 S3 들어갔는지" 의문 → sprint-10 scope 가 localstack 한정임을 plan §4 "안 할 것" 에 적었음에도 dogfood 단계에서 혼동 여지. 실 AWS 인프라는 사용자 측 이미 프로비저닝 완료 ([[project-aws-s3-provisioned]]).

## 3. 시도할 것

- **다음 sprint plan 의 §3 완료 기준 끝에 "체크박스 갱신 절차" 1줄 추가**: 예) "dogfood 통과 시점에 사용자 또는 Claude main 이 plan.md AC `[ ]` → `[x]` mark". retro 전에 sync.
- **smoke 명령은 plan §3 검증 줄에 절대 경로 + 1줄 실행 cmd 동봉**: 'smoke-X 갱신' 만 적지 말고 `node scripts/smoke-X.mjs` 같은 형태로 실제 명령까지 plan 에 박아두면 회귀 누락 줄어듦.
- **dogfood time-box**: 각 slice merge 직후 사용자 dogfood 의무 (24h 내). retro 직전 한꺼번에 몰아 검수하지 않기.
- **실 AWS S3 전환 task**: env 5개 교체 + bucket CORS rule 확인 → 별도 light sprint 또는 infra division activate 시 1 slice 로 처리.

## 4. 이어갈 것

- **실 AWS S3 prod 전환** (sprint-10 scope 외): bucket + IAM 이미 준비 완료 ([[project-aws-s3-provisioned]]). `.env.local` 5개 env 교체 + 실제 PUT/GET 1회 검증 + CORS rule 확인.
- **orphan cleanup cron job**: sprint-10 에선 `pending` row soft-delete 컬럼만 도입. 24h 경과 row 자동 정리 cron 또는 admin 명령은 future.
- **multipart upload / 청크 / 재시도 UX**: 50MB 초과 PDF 또는 모바일 unstable network 대응 — 현재 단일 PUT + retry 3회 한정.
- **annotation server-side persistence**: 작업공간 UX 만 재배치, annotation 저장 자체는 미수정.
- **prod EC2 실배포 + IAM role 기반 credentials**: access key 대신 EC2 instance role 사용 검토.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (G1 review F1~F4 → plan revision 2 반영 완료, slice 구현에 적용됨)
- [x] workbench 가 접혔다 (sfs retro adapter 가 sprint close 처리, status sprint=-)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (283 tracked files), domains=0, last_review=unknown, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-18T11:25:54+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
