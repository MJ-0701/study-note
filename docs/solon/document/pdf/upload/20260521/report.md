---
phase: report
status: final
sprint_id: "2026-W21-sprint-5"
workspace: "pdf-ia"
handoff_dir: "docs/solon/document/pdf/upload/20260521"
goal: "PDF 자료실 업로드/슬라이더/과목 상세 IA 조정"
created_at: "2026-05-21T14:26:31+09:00"
last_touched_at: "2026-05-21T14:26:31+09:00"
closed_at: "2026-05-21T14:26:31+09:00"
domain: "document"
subdomain: "pdf"
feature: "upload"
---

# 보고서

## 1. 결과

- 목표: PDF 작업공간과 과목 상세 화면을 실제 다중 PDF 업로드 운영 흐름에 맞게 조정한다.
- 상태: done
- 판정: Gate 3 (Plan) PASS, Gate 6 (Review) self CPO PASS, Claude cross review PASS
- 한 줄 결과: 기존 PDF가 있어도 추가 업로드가 분명히 가능하고, 10개 이상 자료는 과목별 slider로 정리되며, 과목 상세에는 전체 요약/강의별 자료/현재 요약 하위뎁스가 생겼다.

## 2. 완료한 것

- PDF 작업공간 upload section을 `강의 PDF 추가 업로드` 상태로 바꿨다.
- 기존 자료가 있어도 file input/dropzone은 계속 노출된다.
- 업로드 기본 `classDate`를 subject 첫 수업일로 자동 맵핑하지 않고 `metadata-pending` sentinel로 보낸다.
- material card는 `metadata-pending`, 빈 값, `수업일 미지정`, legacy first-week 값 모두를 `수업일 미지정`으로 보여준다.
- 과목별 PDF material 목록은 `pdf-material-slider` horizontal scroll/snap으로 바꿨다.
- 과목 상세에 `요약과 강의 자료를 나눠 보기` 하위 navigation을 추가했다.
- source regression test를 9개로 확장했다.

## 3. 결정

- Decision 0006: `classDate`는 이번 sprint에서 API/schema를 바꾸지 않고, frontend-only sentinel `metadata-pending`으로 “수업일 미지정” 상태를 표현한다.
- metadata editing API/UI는 다음 WU로 넘긴다.
- route 구조는 유지하고, 과목 상세 IA는 additive UI로만 조정한다.

## 4. 검증

- 명령/체크:
  - `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-material-library.spec.ts`
  - `pnpm test:domain-pdf-workspace`
  - `pnpm --filter @study-note/web build`
  - Playwright/Chrome runtime check at 430x932 with 12 mocked PDF materials
  - `sfs review --gate 3 --executor codex`
  - `sfs review --gate 6 --executor codex`
  - `sfs review --gate 6 --executor claude`
- 결과:
  - PDF material UI regression: 9/9 PASS.
  - domain PDF workspace: 90/90 PASS.
  - web build PASS.
  - 12개 PDF material에서 `sliderOverflow: true`, `bodyOverflow: false`, `consoleErrors: []`.
  - Gate 3 PASS, Gate 6 self PASS, Gate 6 Claude PASS.
- 수동 확인:
  - 모바일 폭에서 자료실/과목 workspace/과목 상세 모두 body overflow 없음.
  - 과목 workspace upload title이 `강의 PDF 추가 업로드`로 표시됨.

## 5. 위험 / 후속

- 위험:
  - `metadata-pending`은 임시 상태다. 장기 domain model로 고정하면 안 된다.
  - 기존 DB의 first-week `classDate`는 명시 수정 여부를 알 수 없어 unconfirmed legacy value로 처리한다.
  - 과목 상세의 강의별 PDF와 수업 노트는 아직 데이터 모델로 직접 연결돼 있지 않다.
- 후속:
  - material metadata editing WU: 수업일/단원명 수정 저장.
  - backend upload policy WU: admin/master만 업로드, normal은 공유 PDF 열람 + 개인 필기 저장.
  - 필요하면 materialId 기준 annotation isolation WU.

## 6. 남긴 것 / 접은 것

- 남김: `.sfs-local/sprints/2026-W21-sprint-5/`에 brainstorm/plan/implement/log/review.
- private archive: 없음.

## 7. 다음

- 변경분을 stage/commit한다.
- 다음 작업은 backend upload 권한/metadata editing 중 우선순위를 정한다.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (320 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T14:26:31+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
