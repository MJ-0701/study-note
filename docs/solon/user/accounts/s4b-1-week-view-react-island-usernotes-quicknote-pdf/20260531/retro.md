---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-26"
workspace: "s4b-1-week-view-react-island-usernotes-quicknote-pdf"
handoff_dir: "docs/solon/user/accounts/s4b-1-week-view-react-island-usernotes-quicknote-pdf/20260531"
goal: "S4b-1 week view React island (정적+userNotes+quickNote+PDF섹션)"
created_at: ""
last_touched_at: "2026-05-31T23:18:56+09:00"
closed_at: 2026-05-31T23:18:56+09:00
domain: "user"
subdomain: "accounts"
feature: "s4b-1-week-view-react-island-usernotes-quicknote-pdf"
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **handoff premise 를 코드 body 실독으로 재검증**. 이전 세션 handoff 가 "PDF 카드 = PDF-workspace
  pointer 결합 → island 불가" 로 단정했으나 pdf-library.ts:279 body 실독 결과 presentational(촉수 0).
  scope-coupling 판정 = import 출처 아닌 body 기준. premise 정정으로 S4b-1 unblock.
- **main/Opus 독립 검증(self-report 불신)**. worker 의 build/spec/loop-gate 주장 전부 직접 재실행 +
  worktree main baseline 으로 "6 fail = pre-existing" 확정. S3/S3b 교훈 적용.
- **회귀 방향 loop-gate assertion**. 기존 gate 가 hydrate 방향만 검증 → 회귀(focus 손실) 방향 무방비.
  FOCUS-PRES assertion(node identity teeth) 추가로 가드.

## 2. 문제

- worker 초안의 `key={userNotesValue}` 가 legacy 의 의도적 invariant("typing focus loss 방지")를
  회귀. uncontrolled+key 패턴의 함정 — value 를 key 로 쓰면 키스트로크마다 store 갱신 → 무관 renderApp
  시 remount. advisor 압박 + sync 모듈 invariant 주석 실독으로 발견. fix 1 round.
- @codex GitHub bot 240s 무응답(미구독/down). cross 는 SFS codex executor bridge 로 충족 → waiver.

## 3. 시도할 것

- uncontrolled controlled-input island 패턴 = token 을 **hydration version**(외부 갱신원)에만 반응시키는
  것을 표준화. S4b-2 의 class-date control(attach 재렌더 중 controlled-input)에 동일 적용.
- worker 위임 시 "controlled-input/effect 경계" 를 capsule 에 명시 — 회귀 사전 차단.

## 4. 이어갈 것

- **S4b-2(subject-class)**: 공유 leaf(PdfMaterialCard/QuickNotePanel) 재사용 + 폼 3개 + class-date
  control(controlled-input-under-re-render) + intakeFeedback.href 미escape(기존).
- operator 시각 QA(week 페이지 실렌더, auth-gated 자동화 불가) = user 후속.
- 잔여 로드맵: S1b(widget/pen) · S1c(물리 cross-device) · S5(cleanup).

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다(Gate3/6 self+cross PASS, docs-hygiene fix, @codex waiver)
- [x] workbench 가 접혔다(worktree 제거, branch 삭제)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (716 tracked files), domains=3, last_review=pass, infra_signals=12, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- recommend: `taxonomy` activate (light) — glossary + naming/aggregation rules; triggers: multi-domain or large codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-31T23:18:56+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
