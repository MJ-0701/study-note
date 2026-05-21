---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-1"
workspace: "pdf"
handoff_dir: "docs/solon/user/accounts/persistence/20260521"
goal: "공용 PDF 자료와 사용자별 필기 저장 분리"
created_at: ""
last_touched_at: "2026-05-21T04:00:17+09:00"
closed_at: 2026-05-21T04:00:17+09:00
domain: "user"
subdomain: "accounts"
feature: "persistence"
---

# 회고

## 1. 계속할 것

- Backend contract를 먼저 안정화하고 UI는 후속 WU로 분리한 판단은 좋았다. FE가 아직 업로드 버튼을 보여도 backend가 source-of-truth로 403을 보장한다.
- Claude review를 SFS bridge로 태운 방식은 토큰 방화벽에 잘 맞았다. prompt/result가 `.sfs-local/tmp`에 분리되어 본문 오염이 없었다.
- Real DB smoke를 통해 migration 순서 문제를 잡은 것이 핵심이었다. 단위 테스트만으로는 MySQL FK index 제약을 못 잡는다.

## 2. 문제

- `smoke-backend-contract`에 이전 "cross-user deny" 계약이 남아 있어서 새 shared-read 모델과 충돌할 뻔했다.
- Docker smoke는 sandbox에서 socket permission 문제로 한 번 실패했다. 이 프로젝트의 DB smoke는 Docker Desktop 상태와 sandbox 권한을 같이 봐야 한다.
- 첫 Gate 6 PASS 후 AC6 empty-list explicit test가 빠진 것을 Claude가 acceptable gap으로 남겼다. 바로 보강해서 29/29로 만들었다.

## 3. 시도할 것

- backend contract 변경 WU마다 기존 smoke 문구를 함께 검색한다: `cross-user`, `ownership`, `denied`, `annotation`.
- Prisma migration은 unit build 뒤에 반드시 Docker/MySQL smoke를 한 번 태운다.
- Gate PASS라도 "acceptable evidence gap"이 있으면 작은 테스트로 닫고 Gate를 다시 태운다.

## 4. 이어갈 것

- FE upload UI 후속 WU:
  - normal role이면 upload dropzone/CTA 숨김.
  - 공용 PDF가 없으면 관리자 요청 copy 표시.
  - old tab에서 upload 403을 받으면 inline alert로 복구 안내.
  - raw `ownerId`는 표시하지 않고 필요하면 "관리자 업로드" 또는 `uploaderDisplayName` 후속 DTO를 쓴다.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (308 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T04:00:17+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
