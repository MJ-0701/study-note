---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-1"
workspace: "pdf"
handoff_dir: "docs/solon/document/pdf/pdf/20260522"
goal: "PDF 전체화면 + 필기도구 단축키 (라벨에 단축키 노출)"
created_at: ""
last_touched_at: "2026-05-22T00:18:19+09:00"
closed_at: 2026-05-22T00:18:19+09:00
domain: "document"
subdomain: "pdf"
feature: "pdf"
---

# 회고

## 1. 계속할 것

- **Slice 분해 + stack PR**: S1 dispatch 코어 → S2 배지/모달 → S3 전체화면 으로
  쪼개 stacked PR (#17 → #18 → #19) 으로 진행. 슬라이스별 리뷰 / 머지가 명확했다.
- **self-review → codex cross-review 분리**: 2026-05-21 정책 도입 (memory
  `feedback_review_flow`). push 마다 self-check 8 영역 (접근성/타입/데이터/영속화/
  보안/회귀/UX/caller-propagation) → self-fix → codex 트리거. self 가 잡지 못한
  cross-cutting 만 codex 가 발견 → 라운드 수 점진 감소.
- **AC ↔ R ↔ Slice ↔ file 매트릭스 (plan §9)**: G3 review partial 후 추가.
  CPO 가 evidence 명확성으로 PASS 판정. 다음 sprint 도 plan 단계에서 이 매트릭스
  필수.
- **국제 키보드 호환 패턴**: `event.key` 우선 매칭 + `event.code` fallback. AT
  안내 일관성. Cmd+[ / ? / F / R~G 모두 같은 패턴으로 정착.

## 2. 문제

- **codex 라운드 누적**: PR #18 (S2) 가 7 라운드까지 필요. 1차 = a11y label,
  2차 = type guard, 3차 = trim, 4차 = storage quota, 5차 = silent loss, 6차 =
  caller propagation, 7차 = layout/IME/AltGr 시리즈. self-review 도입 후에도
  cross-cutting (caller propagation / layout 호환) 은 직접 자료 검토 없이는
  발견하기 어려웠다.
- **Stacked PR 자동 close**: PR #17 머지 + `--delete-branch` 시 #18/#19 base
  사라져 GitHub 자동 close. reopen 불가 → 새 PR (#21, #22) 재생성 + rebase.
  앞으로 stacked PR 일 때는 (a) 사전 base 갱신 또는 (b) merge 시 base 자동
  rebase 옵션 검토.
- **사용자 인터넷 중단 인계**: 세션 도중 끊김 예고 → 핸드오프 문서 (
  `docs/solon/handoff/20260521-session.md`) 작성 후 main 머지. 다음 세션이
  바로 이어받을 수 있게 PR 상태 + 다음 명령 명확히 기록 → 효과적이었음.
  단점: 인계 문서 작성 자체가 시간 소비.
- **event.code 우선 가정**: 한국어 IME 대응을 명분으로 `event.code` 를 단축키
  dispatch 의 1차 키로 잡았으나, 비-QWERTY 레이아웃에서 라벨 ↔ 동작 불일치를
  유발 (codex 가 P1 으로 잡음). 처음부터 `event.key` 우선 + `event.code`
  fallback 이 올바른 패턴이었다.

## 3. 시도할 것

- **codex finding 라운드 예측**: push 직전 self-review 시 cross-cutting checklist
  추가 — caller propagation (반환 타입 변경 시 모든 호출처) / layout 호환
  (event.key vs event.code) / 영속화 fallback (try-catch + 사용자 알림). 다음
  sprint 부터 self-review 마다 명시.
- **Stacked PR 머지 절차 정형화**: 머지 직전 stack base 를 main 으로 미리 변경
  + 본 PR 머지 → 다음 PR rebase. `gh pr edit <next> --base main` 을 머지
  사이에 자동 실행. 다음 sprint 에서 stack 사용 시 적용.
- **vitest 인프라 도입**: AC2/AC3/AC8 evidence 가 manual 만. dispatch 함수
  unit test 가 있으면 codex 라운드 일부 (특히 layout/modifier 가드) 를 사전
  차단 가능. 별도 sprint 후보 (sprint-1/S4 deferral).

## 4. 이어갈 것

- **운영 검증**: FE 태그 push 후 study-note.910701.xyz 에서 단축키 + 모달 +
  전체화면 동작 확인. 사용자 검증.
- **S4 deferral 처리**: vitest 인프라 + hotkeys.test.ts 별도 슬라이스로
  brainstorm 다음 사이클에 포함.
- **추가 단축키 후보 (out-of-scope 였음)**:
  - PDF zoom (+/-/0 키).
  - 펜 sub-action (색/굵기).
  - 지우개 모양/크기 (지금은 마우스만).
  - 사용자 정의 단축키 (rebinding).
- **PDF 작업공간 외 단축키**: 현재 PDF workspace 라우트만. 다른 라우트 (수업일
  상세, 요약본) 의 키보드 네비게이션 필요성 평가.

## 5. 종료 체크

- [x] report 가 최신이다 (`docs/solon/document/pdf/pdf/20260522/report.md`)
- [x] review 조치가 완료 또는 이월됐다 (S4 vitest = 다음 사이클로 이월)
- [x] workbench 가 접혔다 (sprint 디렉토리 `.sfs-local/sprints/2026-W21-sprint-1/`
  → archives 로 이동 예정)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (329 tracked files), domains=0, last_review=unknown, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-22T00:18:19+09:00 (auto) — edit outside the manual block to preserve manual notes
<!-- solon:division-recommendations:end -->
