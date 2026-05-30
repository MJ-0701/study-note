---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-6"
workspace: "3-ia-ux"
handoff_dir: "docs/solon/3-ia-ux/20260521"
goal: "과목 학습 3뎁스 IA 및 자료실 직접 업로드 UX 재설계"
created_at: ""
last_touched_at: "2026-05-21T15:00:04+09:00"
closed_at: 2026-05-21T15:00:04+09:00
---

# 회고

## 1. 계속할 것

- 사용자가 “기획의도”를 지적하면 layout polish가 아니라 flow/행동 단위로 다시 쪼갠다.
- AC에 사용자 문장을 그대로 넣는다. 이번에는 `수업 / 요약본 / MCP 호출`을 직접 test에 박은 것이 효과적이었다.
- runtime smoke에는 실제 사용자가 본 화면의 질문을 넣는다. 예: “여기서 업로드 가능한가?”

## 2. 문제

- 이전 WU는 upload affordance를 PDF 작업공간 안에만 두고 자료실 화면에 직접 업로드 행동을 만들지 못했다.
- `전체 요약 / 강의별 자료 / 현재 요약`은 사용자가 말한 학습 flow가 아니었다.
- persona/MCP 호출을 sidebar 부가 링크로만 취급해 학습의 세 번째 단계로 표현하지 못했다.

## 3. 시도할 것

- 과목 상세의 top-level IA는 앞으로 “학습자가 다음에 무엇을 하는가” 기준으로 설계한다.
- persona/MCP는 단순 링크가 아니라 학습 flow의 질문 단계로 다룬다.
- upload는 목록 화면에서도 직접 가능한지 먼저 확인한다.

## 4. 이어갈 것

- MCP 호출 inline embed UX.
- normal-user runtime smoke.
- backend upload 권한 정책.
- material metadata editing.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (322 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T15:00:04+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
