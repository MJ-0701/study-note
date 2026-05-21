---
phase: report
sprint_id: "2026-W21-sprint-7"
goal: "과목 사이드바를 수업 요약본 MCP 호출 3뎁스 화면 IA로 재구성"
status: final
workspace: "mcp-3-ia"
handoff_dir: "docs/solon/mcp-3-ia/20260521"
last_touched_at: "2026-05-21T15:44:07+09:00"
closed_at: "2026-05-21T15:44:07+09:00"
---

# Sprint Report

## Verdict Strip

- 상태: 구현 완료, Gate 6 PASS 후 sprint close.
- 핵심 변경: 과목 화면이 본문 flow 카드가 아니라 sidebar 하위 route `수업 / 요약본 / MCP 호출`로 관리된다.
- 범위: frontend IA/UI/test only.

## Delivered

- `#/subjects/:subjectId/class`: PDF 자료/추가 업로드/수업일별 노트 중심.
- `#/subjects/:subjectId/summary`: 정리노트/키워드/필수 개념 중심.
- `#/subjects/:subjectId/mcp`: 교수님 페르소나 호출/질문거리 점검 중심.
- `#/subjects/:subjectId`: 기존 링크 호환을 위해 수업 화면 렌더링.
- sidebar current subject 영역에 3뎁스 navigation과 active state 추가.
- 기존 본문 `subject-learning-flow`/`subject-flow-card` 패턴 제거.

## Evidence

- Source test: `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-material-library.spec.ts` → 10 pass, 0 fail.
- Build: `pnpm --filter @study-note/web build` → exit_code 0, `✓ built in 456ms`.
- Browser smoke: `/private/tmp/study-note-sidebar-ia-smoke.cjs` → `ok: true`, console/page errors empty, mobile horizontal overflow false.
- Screenshots:
  - `/private/tmp/study-note-sidebar-ia-desktop.png`
  - `/private/tmp/study-note-sidebar-ia-mobile.png`

## Residual Risk

- 실제 MCP backend 호출은 이번 sprint 범위가 아니므로 준비 중 과목은 disabled 상태로 남긴다.
- PDF metadata editing은 Decision 0006에 따라 다음 WU 범위다.
- Untracked `.DS_Store`, `docs/portfolio/`는 사용자/별도 작업 산출물로 보존한다.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (324 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T15:44:07+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
