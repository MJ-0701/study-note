---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-5"
workspace: "pdf-ia"
handoff_dir: "docs/solon/document/pdf/upload/20260521"
goal: "PDF 자료실 업로드/슬라이더/과목 상세 IA 조정"
created_at: ""
last_touched_at: "2026-05-21T14:26:31+09:00"
closed_at: 2026-05-21T14:26:31+09:00
domain: "document"
subdomain: "pdf"
feature: "upload"
---

# 회고

## 1. 계속할 것

- API contract가 걸린 UI 변경은 Gate 3에서 먼저 sentinel/임시 상태를 명확히 정의한다.
- 10개 이상 boundary처럼 사용자가 직접 말한 수량은 runtime smoke에 반영한다.
- UI copy, source regression, 모바일 runtime JSON을 함께 남기는 방식은 review 통과에 효과적이었다.

## 2. 문제

- 처음 plan review에서 `classDate` sentinel 의미가 덜 명확해 partial이 반복됐다.
- `classDate`라는 이름은 날짜처럼 보이지만 현재 backend는 단순 string으로만 검증한다. 이름/의미 debt가 있다.
- 과목 상세 IA는 additive로 개선했지만, 강의별 PDF와 수업 노트의 실제 데이터 연결은 아직 없다.

## 3. 시도할 것

- 다음 metadata WU에서는 `classDate`, `lectureTitle`, `lectureOrder` 같은 material metadata를 명시적으로 분리한다.
- backend contract를 바꾸는 경우에는 Decision과 API test를 먼저 만든다.
- 과목 상세 navigation은 실제 데이터 연결이 생기면 tab/segmented control로 한 번 더 다듬는다.

## 4. 이어갈 것

- admin/master upload 권한 제한과 normal read-only 정책.
- material metadata editing 저장.
- materialId 기준 annotation isolation 여부 결정.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (320 tracked files), domains=0, last_review=pass, infra_signals=7, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-21T14:26:31+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
