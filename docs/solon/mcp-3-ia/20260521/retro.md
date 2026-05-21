---
phase: retro
sprint_id: "2026-W21-sprint-7"
goal: "과목 사이드바를 수업 요약본 MCP 호출 3뎁스 화면 IA로 재구성"
status: closed
workspace: "mcp-3-ia"
handoff_dir: "docs/solon/mcp-3-ia/20260521"
last_touched_at: "2026-05-21T15:44:07+09:00"
closed_at: 2026-05-21T15:44:07+09:00
---

# Retro

## What Changed

- 사용자 피드백의 핵심은 “본문 안 안내 카드”가 아니라 “sidebar depth로 화면 관리”였다.
- plan 단계에서 legacy subject route 기본값을 `수업`으로 고정했고, 구현도 그 계약을 따랐다.

## What Worked

- Gate 3에서 Claude review PASS를 먼저 받아 route/sidebar IA contract를 고정했다.
- Source test, build, Playwright smoke를 모두 최신 코드 기준으로 실행했다.

## What To Improve

- Gate 6 첫 리뷰에서 검증 결과가 workbench artifact에 없어서 partial이 났다. 앞으로 UI 구현 직후 `implement.md`에 test/build/browser evidence를 먼저 붙인 뒤 review를 돌린다.
- 이전 sprint report/retro가 review bundle에 섞여 혼선을 만들었다. sprint별 evidence file을 명확히 유지한다.

## Close Condition

- Gate 6 PASS 기록 후 sprint close 완료.

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (324 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T15:44:07+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
