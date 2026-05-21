---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-4"
workspace: "pdf-ui"
handoff_dir: "docs/solon/document/pdf/pdf-ui/20260521"
goal: "PDF 자료 목록/카드형 탐색 UI 개선"
created_at: ""
last_touched_at: "2026-05-21T13:41:53+09:00"
closed_at: 2026-05-21T13:41:53+09:00
domain: "document"
subdomain: "pdf"
feature: "pdf-ui"
---

# 회고

## 1. 계속할 것

- UI 용어를 먼저 정하고 코드/테스트에 같은 용어를 박아두는 방식은 효과적이었다.
- Browser가 click을 막는 경우에도, 핵심 interaction handler를 소스 테스트로 고정해 review evidence를 만들 수 있었다.
- self CPO partial을 작은 증거 보강으로 닫은 뒤 Claude cross review까지 붙인 흐름은 유지한다.

## 2. 문제

- 처음 evidence bundle에 사용자 노출 copy와 card render excerpt가 부족해서 Gate 6 self CPO가 partial이 났다.
- `master/admin` 영어 role token이 학생-facing copy에 남아 있었다.
- Browser click verification은 temp test page 보안 정책에 막혀 live click evidence를 만들지 못했다.

## 3. 시도할 것

- UI sprint에서는 구현 직후 `render*` 함수의 실제 copy excerpt와 responsive proof를 report/implement에 먼저 붙인다.
- role copy는 사용자-facing 한국어와 내부 enum을 분리한다. 예: UI는 `관리자`, 내부 guard는 `master/admin`.
- PDF domain glossary에 `uploaderId`, backend material owner, annotation owner를 한 줄씩 정리한다.

## 4. 이어갈 것

- backend WU: admin/master만 PDF를 업로드하고 normal user는 공유 PDF 열람 + 개인 필기 저장만 가능하게 policy를 고정한다.
- material-level annotation isolation 여부를 결정한다. 필요하면 `materialId` 기준 route/storage 설계를 별도 WU로 연다.
- `#/pdf-workspaces` route noun과 `PDF 자료실` 화면 noun을 나중에 PDF route 정리 때 맞춘다.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (318 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T13:41:53+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
