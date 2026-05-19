---
title: "표/그래프 실 기능 분리 + PDF workspace dogfood"
date: "2026-05-19"
sprint_id: "2026-W21-sprint-3"
domain: "lecture-note"
phase: report
status: final
workspace: "legacy-cleanup-ux"
subdomain: "pdf-workspace"
feature: "table-chart-annotation-tools"
handoff_dir: "docs/solon/lecture-note/pdf-workspace/table-chart-annotation-tools/20260519"
last_touched_at: "2026-05-19T19:10:17+09:00"
goal: "표/그래프 실 기능 분리 + legacy cleanup + 모바일 UX"
closed_at: "2026-05-19T19:10:17+09:00"
---

# Report

## 결론

표/그래프 도구는 실제 필기 도구로 사용할 수 있는 수준까지 확장했다.
PDF 페이지 이동 점멸은 native PDF viewer 한계로 현 시점 수용하고, 느린 PDF.js canvas 전환은 되돌렸다.

## 결과

- 표:
  - editable cell grid
  - 행/열 추가 및 삭제
  - 셀 단위 편집
  - collapse/expand, drag, delete 유지
- 그래프:
  - x,y 좌표 직접 입력
  - 막대 모드
  - sin/cos 삼각함수 모드
  - X/Y 좌표 라벨 표시
  - X축/Y축, grid/frame 좌표 뼈대 렌더링
  - 좌표선은 검은색으로 분리
- PDF workspace:
  - annotation surface가 read mode에서도 페이지에 붙도록 유지
  - page별 annotation filtering 정상화
  - iframe stack preload/load-gate 유지
  - PDF.js canvas 렌더링과 `pdfjs-dist` 의존성 제거

## 검증

- `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/chart-tool.spec.ts` -> 22 pass
- `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-annotation-layer.spec.ts` -> 4 pass
- `env CI=true pnpm --filter @study-note/web build` -> pass
- `docker compose -f infra/docker-compose.yml up -d --build fe-service` -> pass
- `docker compose -f infra/docker-compose.yml ps` -> all services healthy
- `curl -I http://127.0.0.1/` -> HTTP 200
- `curl -s http://127.0.0.1:3001/api/health` -> `{"ok":true,"service":"study-note-backend","storageProvider":"s3"}`

## 리뷰

- GitHub `@codex review` -> PASS (`Didn't find any major issues`)
- Gate 6 자체 CPO review (`codex`, security lens) -> PASS
- Gate 6 cross-review (`gemini`, security lens) -> PASS
- Gate 6 cross-review (`claude`, security lens) -> PASS
- 공통 warning: 일부 리뷰는 같은 도구 계열 evidence를 포함하므로 independence warning이 남았지만, production source excerpt와 PR diff grep evidence로 blocking 아님으로 판정됐다.

## 남은 리스크

- PDF 페이지 이동 점멸은 완전 해결되지 않았다.
- PDF.js는 현재 구현으로는 로딩 체감이 너무 크다.
- 표/그래프 전문 편집 기능은 후속 sprint 대상이다.


## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (297 tracked files), domains=0, last_review=unknown, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-19T19:10:17+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
