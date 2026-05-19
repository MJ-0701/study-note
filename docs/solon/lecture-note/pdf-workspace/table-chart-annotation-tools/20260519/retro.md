---
title: "표/그래프 + PDF workspace retro"
date: "2026-05-19"
sprint_id: "2026-W21-sprint-3"
domain: "lecture-note"
phase: retro
workspace: "legacy-cleanup-ux"
subdomain: "pdf-workspace"
feature: "table-chart-annotation-tools"
handoff_dir: "docs/solon/lecture-note/pdf-workspace/table-chart-annotation-tools/20260519"
last_touched_at: "2026-05-19T19:10:17+09:00"
goal: "표/그래프 실 기능 분리 + legacy cleanup + 모바일 UX"
closed_at: 2026-05-19T19:10:17+09:00
---

# Retro

## 유지할 것

- dogfood 피드백을 AC처럼 취급해서 실제 사용감 기준으로 바로 수정한 흐름은 유지한다.
- 표/그래프는 학습자가 생각하는 도구 모델을 기준으로 UX를 맞춘다.
- PDF annotation은 "해당 페이지에 붙어 있는 필기"라는 domain language를 계속 기준으로 둔다.

## 바꿀 것

- PDF viewer 교체는 즉시성, 로딩 피드백, 캐시 전략을 먼저 세우고 진행한다.
- 깜빡임을 없애는 것만 AC로 잡지 않는다. 로딩 체감이 나빠지면 실패로 본다.
- plan의 범위를 dogfood 중 크게 넘으면 sprint 내부 revision 또는 후속 sprint 분리를 먼저 기록한다.

## 후속 입력

- PDF viewer 개선:
  - native iframe 한계 정리
  - PDF.js 재시도 시 loading indicator와 page cache 설계
  - 다음/이전 이동의 체감 latency 측정
- 표/그래프 polish:
  - 축 tick, scale, 범례
  - 표 크기 조절과 모바일 터치 편집
  - 좌표 입력 UX copy 정돈


## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (297 tracked files), domains=0, last_review=unknown, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-19T19:10:17+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
