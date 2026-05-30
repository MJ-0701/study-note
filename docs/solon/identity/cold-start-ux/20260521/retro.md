---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-2"
workspace: "cold-start-ux"
handoff_dir: "docs/solon/cold-start-ux/20260521"
goal: "세션 확인 cold start UX 개선 + PDF 업로드 운영 500 재발 방지"
created_at: ""
last_touched_at: "2026-05-21T13:06:06+09:00"
closed_at: 2026-05-21T13:06:06+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- 운영 장애가 보이면 먼저 prod logs와 health를 확인하고, 코드 변경과 운영 env 복구를 분리해서 처리한다.
- 무료 운영 제약은 제품 UX로 흡수한다. 이번 cold-start copy/retry처럼 비용을 쓰기 전 사용자 불안을 낮춘다.
- SFS review에서 지적된 evidence gap은 바로 `implement.md`/`log.md`에 묶는다.

## 2. 문제

- prod seed를 dev user와 묶어 꺼두면서 Subject 기준 데이터까지 빠졌다. dev-only seed와 prod-safe seed는 처음부터 분리해야 했다.
- 첫 self CPO review는 새 파일 untracked + evidence 부족으로 partial이 났다.
- `sfs retro`가 report/retro를 템플릿으로 만든 뒤 바로 sprint를 닫아, 닫힌 뒤 수동 보강이 필요했다.

## 3. 시도할 것

- 다음 infra/ops 작업에서는 배포 전 checklist에 `git status --short`, prod health, essential seed/env 확인을 넣는다.
- Subject seed warning을 향후 observability scope에서 alert 후보로 올린다.
- SFS close 전에 report/retro 본문을 먼저 채우는 루틴을 더 엄격히 지킨다.

## 4. 이어갈 것

- 실제 운영 계정의 role 확인 및 master/admin 업로드 재시도.
- 다음 SFS WU: PDF는 master/admin만 업로드하고 학생은 공유 PDF 위에 개인 필기만 저장하는 정책을 프론트 UX까지 자연스럽게 다듬기.
- QA division light 활성화 검토. 이번 sprint처럼 backend smoke + browser evidence가 자주 필요해지고 있다.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (315 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T13:06:06+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
