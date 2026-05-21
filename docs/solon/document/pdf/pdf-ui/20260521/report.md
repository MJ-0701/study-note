---
phase: report
status: final
sprint_id: "2026-W21-sprint-4"
workspace: "pdf-ui"
handoff_dir: "docs/solon/document/pdf/pdf-ui/20260521"
goal: "PDF 자료 목록/카드형 탐색 UI 개선"
created_at: "2026-05-21T13:41:53+09:00"
last_touched_at: "2026-05-21T13:41:53+09:00"
closed_at: "2026-05-21T13:41:53+09:00"
domain: "document"
subdomain: "pdf"
feature: "pdf-ui"
---

# 보고서

## 1. 결과

- 목표: PDF 업로드/필기 화면을 한 과목 중심에서 “과목별 수업자료를 찾아 여는” 자료실 UI로 바꾼다.
- 상태: done
- 판정: Gate 6 (Review) self CPO PASS, Claude cross review PASS
- 한 줄 결과: 관리자가 올린 공유 PDF를 학생이 과목별 카드/리스트에서 열고, 개인 필기는 기존 workspace에 남기는 구조로 전환했다.

## 2. 완료한 것

- `SubjectPdfWorkspace.materials`를 추가해 과목별 PDF 자료 목록을 보존하고, 기존 `material`은 현재 열린 자료로 유지했다.
- `#/pdf-workspaces`를 `PDF 자료실 / 수업자료 찾기 / 과목별 PDF` 화면으로 개편했다.
- 각 과목 workspace 안에 `이 과목의 PDF 자료` selector를 추가하고, `열기/다시 열기/현재 열림` 상태를 표시했다.
- normal user 화면에서는 업로드 UI 대신 `공유 자료` 안내와 `업로드는 관리자만 가능합니다.` 정책 문구를 보여준다.
- master/admin upload flow는 유지하되, 업로드된 material을 과목별 목록에 upsert하도록 바꿨다.
- 430px 모바일 폭에서 카드/요약/액션 버튼이 1열로 접히도록 반응형 스타일을 추가했다.

## 3. 결정

- 새 PDF별 route는 만들지 않고 기존 `#/subjects/:id/pdf-workspace` route를 유지했다.
- `material`은 현재 열린 PDF, `materials`는 과목별 전체 PDF 목록으로 의미를 분리했다.
- PDF 원문은 공유 자료로 취급하고, 개인 필기/메모는 다음 backend WU 전까지 기존 subject workspace 저장 구조를 유지한다.
- 학생-facing role copy는 `master/admin` 대신 `관리자`로 노출한다.

## 4. 검증

- 명령/체크:
  - `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/pdf-material-library.spec.ts`
  - `pnpm test:domain-pdf-workspace`
  - `pnpm --filter @study-note/api build`
  - `pnpm --filter @study-note/web build`
  - `sfs review --gate 6 --executor codex`
  - `sfs review --gate 6 --executor claude`
- 결과:
  - PDF material library regression 6 tests PASS.
  - domain PDF workspace 90 tests PASS.
  - API build PASS.
  - Web build PASS.
  - Gate 6 self CPO PASS.
  - Gate 6 Claude cross review PASS.
- 수동 확인:
  - Browser 430x932 read verification에서 `PDF 자료실`, 3개 material card, 4개 subject section, overflow 없음 확인.
  - 과목 workspace에서 material browser 2개, current marker 1개, overflow 없음 확인.
  - Browser click은 테스트 페이지 보안 정책으로 차단되어, `open-pdf-material` handler는 소스 회귀 테스트로 대체 검증했다.

## 5. 위험 / 후속

- 위험:
  - material별 annotation 저장 격리는 아직 구현하지 않았다. 지금은 과목 workspace 안에서 공유 PDF와 개인 필기 모델을 표현하는 UI 단계다.
  - route noun `#/pdf-workspaces`와 화면 noun `PDF 자료실`이 완전히 같지는 않다.
  - frontend `uploaderId`, backend `ownerId`, annotation `ownerUserId` 용어군은 다음 PDF-domain WU에서 glossary로 정리하면 좋다.
- 후속:
  - 다음 SFS 작업: PDF 업로드 권한을 admin/master 이상으로 제한하고, 학생은 공유 PDF 열람 + 개인 필기 저장만 가능하게 backend policy를 확정한다.
  - PDF별 annotation 격리/route가 필요하면 별도 WU로 `materialId` 기준 저장 경계를 설계한다.

## 6. 남긴 것 / 접은 것

- 남김: `.sfs-local/sprints/2026-W21-sprint-4/`에 brainstorm/plan/implement/review/log workbench 기록.
- private archive: 없음.

## 7. 다음

- staged 변경분을 커밋하고 배포하면 frontend 자료실 UI가 반영된다.
- backend upload policy WU로 넘어간다.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (318 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T13:41:53+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
