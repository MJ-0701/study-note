---
phase: report
status: final
sprint_id: "2026-W21-sprint-3"
workspace: "ui-ux"
handoff_dir: "docs/solon/ui-ux/20260521"
goal: "반응형 UI 적용 — 노트북/패드/핸드폰 홈 UX 정리"
created_at: "2026-05-21T03:23:28+09:00"
last_touched_at: "2026-05-21T03:23:28+09:00"
closed_at: "2026-05-21T03:23:28+09:00"
---

# 보고서

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 결과

- 목표: 홈/공통 shell을 노트북/패드/핸드폰 사용 비율에 맞게 반응형으로 정리한다.
- 상태: done
- 판정: Gate 6 self-CPO pass, Gemini cross review pass
- 한 줄 결과: 데스크톱 sidebar는 유지하고, 1100px 이하에서는 compact top navigation으로 접히도록 수정했다.

## 2. 완료한 것

- `apps/web/src/main.ts`: sidebar group hook class와 `persona-sub-link` class 추가.
- `apps/web/src/styles.css`: 1100/820/520/380px responsive override 추가.
- 380/430/520/768/820/1024/1100/1280 viewport에서 horizontal overflow와 첫 화면 핵심 콘텐츠 노출 확인.

## 3. 결정

- 이번 slice는 home/common shell에 한정했다.
- PDF workspace canvas/toolbar 모바일 UX는 다음 별도 slice로 분리한다.

## 4. 검증

- 명령/체크:
  - `pnpm --filter @study-note/web build`
  - Playwright one-off responsive checker
- 결과:
  - build pass
  - 모든 viewport에서 `scrollWidth <= clientWidth` pass
  - desktop 1280px에서 `.app-shell` grid 유지
- 수동 확인:
  - `.sfs-local/sprints/2026-W21-sprint-3/evidence/*.png`

## 5. 위험 / 후속

- 위험: 공통 shell 외 PDF workspace의 모바일 annotation UX는 아직 별도 검토가 필요하다.
- 후속: 공용 PDF 자료 모델과 학생별 필기 저장 모델을 분리하는 backend SFS WU로 이어간다.

## 6. 남긴 것 / 접은 것

- 남김: PDF workspace 모바일 canvas/toolbar 상세 UX.
- private archive: SFS sprint workbench/evidence.

## 7. 다음

- 새 WU: admin/master만 PDF 원본을 업로드하고, 학생은 공용 PDF를 열람하면서 개인 필기만 저장하도록 backend/domain 로직을 분리한다.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (308 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T03:23:28+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
