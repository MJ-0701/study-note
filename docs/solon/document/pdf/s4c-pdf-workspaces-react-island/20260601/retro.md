---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W23-sprint-1"
workspace: "s4c-pdf-workspaces-react-island"
handoff_dir: "docs/solon/document/pdf/s4c-pdf-workspaces-react-island/20260601"
goal: "S4c pdf-workspaces 자료실 인덱스 React island"
created_at: ""
last_touched_at: "2026-06-01T09:59:44+09:00"
closed_at: 2026-06-01T09:59:44+09:00
domain: "document"
subdomain: "pdf"
feature: "s4c-pdf-workspaces-react-island"
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **parity oracle 고정 + render/dispatch 양면 실독**. leaf=old renderPdfWorkspaceIndex 1:1, producer math=source-diff. descriptor mismatch=spec 못잡는 parity break 라 양면 실독 필수.
- **worker 자가보고 불신 → main 독립 재실행**. build -r + test:run + loop-gate 직접 돌려 verdict 독립 확보.
- **clean island 빠른 진행**. 게이트 없는 presentational 라우트는 검증된 패턴(S4a/S4b) 미러로 1 cycle 완주.

## 2. 문제

- **worker 가 신규 spec 을 `test:run` 에 미등록(orphan)**. node:test 는 명시 파일 enumerate 라 spec 파일만 만들면 canonical gate 에서 안 돌아감. main 이 발견·등록(+loopgate:s4c alias). → 교훈: worker capsule 에 "test:run 등록"을 명시 항목으로.
- **`gh pr merge --squash --admin --delete-branch` 의 로컬 fast-forward 실패**. 원격 squash 는 성공했으나 로컬 main 이 unpushed doc commit 2개로 diverge → 로컬 checkout abort. squash 가 그 doc 내용까지 folded → `git reset --hard origin/main` 으로 안전 동기화(내용 손실 0 확인 후).

## 3. 시도할 것

- worker handoff capsule 표준 항목에 "신규 spec → package.json test:run 등록" 추가.
- 로컬 main 에 unpushed commit 이 있으면 PR merge 전 정리 또는 reset 예고.

## 4. 이어갈 것

- **PdfMaterialCard 공유 leaf 추출** = deferred follow-up (SubjectClassView ↔ PdfWorkspacesView DRY).
- **old `renderPdfWorkspaceIndex` 제거** = S5 (잔여 string renderer 정리).
- 잔여 마이그레이션 슬라이스: S1b(pen, 게이트)·S1c(물리기기, 게이트)·S5(S1 후행).

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (Gate 3/6 self+cross PASS 0 blocking, @codex post-merge no findings)
- [x] workbench 가 접혔다 (sprint closed)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (733 tracked files), domains=3, last_review=pass, infra_signals=12, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- recommend: `taxonomy` activate (light) — glossary + naming/aggregation rules; triggers: multi-domain or large codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-06-01T09:59:44+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
