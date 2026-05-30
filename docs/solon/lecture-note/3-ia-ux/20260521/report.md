---
phase: report
status: final
sprint_id: "2026-W21-sprint-6"
workspace: "3-ia-ux"
handoff_dir: "docs/solon/3-ia-ux/20260521"
goal: "과목 학습 3뎁스 IA 및 자료실 직접 업로드 UX 재설계"
created_at: "2026-05-21T15:00:04+09:00"
last_touched_at: "2026-05-21T15:00:04+09:00"
closed_at: "2026-05-21T15:00:04+09:00"
---

# 보고서

## 1. 결과

- 목표: PDF 자료실에서 직접 신규 PDF를 업로드할 수 있게 하고, 과목 상세를 `수업 → 요약본 → MCP 호출` 학습 흐름으로 재구성한다.
- 상태: done
- 판정: Gate 3 (Plan) PASS, Gate 6 (Review) self CPO PASS, Claude cross review PASS
- 한 줄 결과: 자료실 첫 카드가 실제 업로드 input이 되었고, 과목 상세 상단은 `수업 / 요약본 / MCP 호출` 3뎁스 실행 카드로 바뀌었다.

## 2. 완료한 것

- PDF 자료실의 과목별 slider 첫 카드에 `새 PDF 업로드` card를 추가했다.
- upload card는 `data-action="import-pdf-material"`와 `data-subject-id`가 있는 file input에 직접 연결된다.
- normal user에게는 업로드 input 대신 `PDF 업로드는 관리자만 가능합니다` 안내 card를 보여준다.
- 과목 상세에 `수업 → 요약본 → MCP 호출` flow section을 추가했다.
- 수업 card: `수업 PDF 열기` + admin/master `새 PDF 업로드`.
- 요약본 card: `요약본 만들기` + `요약본 보기`.
- MCP 호출 card/panel: active persona는 실제 `/persona-turn.html?subject=<id>` 링크, inactive persona는 준비 중 + 질문거리 정리.

## 3. 결정

- route/backend/API는 바꾸지 않는다.
- upload는 기존 `importPdfMaterialFile` event path를 재사용한다.
- MCP 호출은 이번 WU에서 embed하지 않고 기존 persona page link를 사용한다.

## 4. 검증

- 명령/체크:
  - `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-material-library.spec.ts`
  - `pnpm test:domain-pdf-workspace`
  - `pnpm --filter @study-note/web build`
  - 430x932 admin runtime smoke with 12 mocked PDF materials
  - `sfs review --gate 3 --executor codex`
  - `sfs review --gate 6 --executor codex`
  - `sfs review --gate 6 --executor claude`
- 결과:
  - PDF material UI regression: 10/10 PASS.
  - domain PDF workspace: 90/90 PASS.
  - web build PASS.
  - runtime smoke: upload card text present, `uploadInputAction=import-pdf-material`, flow cards `[수업, 요약본, MCP 호출]`, `bodyOverflow=false`, `consoleErrors=[]`.
  - Gate 3 PASS, Gate 6 self PASS, Gate 6 Claude PASS.
- 수동 확인:
  - 사용자가 지적한 “여기서 어떻게 업로드함?” 화면에 `새 PDF 업로드` 카드가 직접 생겼다.
  - 과목 상세가 콘텐츠 나열이 아니라 수업 듣기, 요약하기, 질문하기 순서로 읽힌다.

## 5. 위험 / 후속

- 위험:
  - inactive persona 과목은 아직 실제 MCP 호출이 아니라 준비 중 상태다.
  - normal-user runtime smoke는 source test로만 대체했다.
  - 과목 상세 안에서 MCP를 inline panel로 호출하는 UX는 아직 아니다.
- 후속:
  - normal user runtime smoke 추가.
  - MCP 호출을 과목 상세 내부 panel로 embed할지 결정.
  - material metadata editing / backend upload policy WU 진행.

## 6. 남긴 것 / 접은 것

- 남김: `.sfs-local/sprints/2026-W21-sprint-6/` workbench.
- private archive: 없음.

## 7. 다음

- 변경분만 stage/commit한다. 현재 untracked `.DS_Store`, `docs/portfolio/`는 이번 sprint 범위가 아니므로 건드리지 않는다.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (322 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T15:00:04+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
