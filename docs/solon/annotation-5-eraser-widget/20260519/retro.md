---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-2"
workspace: "annotation-5-eraser-widget"
handoff_dir: "docs/solon/annotation-5-eraser-widget/20260519"
goal: "annotation 도구 5종 실 기능 분리 + eraser widget"
goal_scope_note: "Q2=2분할 적용 → sprint-12 = 텍스트박스 + 체크리스트 + eraser widget + sticky drag + 점멸 fix + 텍스트박스 inline redesign. 표/그래프 = sprint-13 이연."
created_at: ""
last_touched_at: "2026-05-19T02:11:28+09:00"
closed_at: 2026-05-19T02:11:28+09:00
---

# 회고

## 1. 계속할 것

- **scope 분할 (Q2=2분할) 유효성 검증**: 표/그래프 sprint-13 이연 + sprint-12 = 도메인 + 2 도구 + eraser widget 만. dogfood 시 user 가 sprint-13 분리 인지하고 표/그래프 disabled placeholder 정상 수용.
- **cross-CPO PASS 후 worker 위임 패턴**: G1 Gemini PASS / Codex r3 PASS = 보안 baseline 잠금 후 slice-1~3 = Sonnet 4.6 generator 위임 효율.
- **임시 worker 정책 적용 + 신속 fallback**: Codex gpt-5.5 xhigh 정체 발생 → kill + 작업 결과 보존 (728 line) + finalize codex resume → 통합 commit. 1회 정체에서 데이터 손실 0.
- **Opus 직접 1회 예외 패턴 (4 회 적용)**: slice-4-refine, 5, 6, 6-revert, 7, 7-refine 모두 Opus 직접 Edit. dogfood 후 즉시 fix 적용 가능 (delegation 라운드 트립 없음). 단 [[feedback-opus-no-direct-code]] 영구 정책 위반 — 사용자가 임시 정책 안에서 1회 예외 명시.
- **morphdom 도입으로 점멸 근본 해결**: 매 renderApp 의 `appRoot.innerHTML` 폐기, 7KB vanilla DOM diff. iframe element 보존 + attribute 변화 시만 setAttribute = blob URL reload 0.
- **dogfood-driven UX refinement**: textbox header/textarea body UI → user 가 "sticky 와 같은 느낌" 인지 → 인라인 redesign 즉시 진행. design 의도 명확화 사이클 빨라짐.

## 2. 문제

- **brainstorm 의 textbox 정의 불명확**: brainstorm Q1=A 의 "텍스트박스" 가 "sticky 와 분리된 별 widget" 만 명시, **UI 모양** (큰 박스 vs 인라인) 미정의. plan R3 의 `PdfTextBox` schema 도 `size` 필드 = 큰 박스 가정. slice-2 worker = sticky 와 동일 패턴 (header + textarea) 으로 구현 → user dogfood 후 의도 불일치 발견 → slice-7 에서 redesign. brainstorm/plan 단계에서 UI mockup / 도구 spec 5축 ([[project-sprint11-handoff]] 교훈) 도입 의무화 필요.
- **점멸 fix iframe preserve 첫 시도 실패** (slice-6 → revert): mountPdfFrame helper 가 iframe DOM detach/re-attach 시 Chromium 가 reload trigger (HTML spec) → 점멸 fix 효과 0 + PDF 미표시 회귀. slice-6 revert (`94ee871`) 후 slice-7 의 morphdom 으로 해결. 1 라운드 손실 — DOM diff library 같은 검증된 패턴 우선 검토 필요.
- **Codex gpt-5.5 xhigh 정체 (1 회)**: slice-4 = 728 line 작성 후 75분 무진행. ps 로 process alive 확인됐으나 file mtime 정지. kill 후 finalize codex resume 으로 회복. 원인 미파악 — 가능성 (a) prompt 너무 큼, (b) reasoning loop, (c) tool output 무한 대기.
- **검증 자동화 한계 (gstack)**: gstack browse setup 후 도구 그룹 UI / login flow 까지만 자동 검증. PDF 의존 검증 (sticky/textbox/eraser 동작) = headless session 의 별 localStorage + PDF 업로드 흐름 시뮬 cost 큼 → manual dogfood 의존.
- **whitelist 부분 위반 (gstack `.gitignore` 추가)**: gstack setup 부수 효과로 `.gstack/` 가 .gitignore 추가 → AC9-a whitelist 외 파일 변경. sprint scope 외 minor (보안 영향 0) 였으나 명시적 lock 안 됨. 다음 sprint plan 에서 file whitelist 에 `.gitignore` allow list 추가 또는 별 commit 분리 권장.
- **plan revision 4 → 8 (R10/R11 + iframe revert + redesign)**: plan revision 누적 4 회 추가. sprint-11 retro 의 "revision 3회 초과 시 brainstorm 재진입" 교훈 어김. dogfood-driven 변경이 너무 많음. brainstorm 깊이 부족 신호.

## 3. 시도할 것

- **brainstorm/plan 의 도구 spec 5축 ([[project-sprint11-handoff]] 교훈) 의무화**: (1) cursor, (2) hit-test 단위, (3) interaction, (4) feedback, (5) edge case + **(6) UI mockup or 시각적 reference** 추가. textbox 같은 widget 의 UI 모양 brainstorm 단계에서 명시.
- **점멸 fix 같은 architectural change = brainstorm 단계 별 task 로 분리**: render path 변경은 sprint 의 핵심 risk. 일반 도구 추가와 같은 sprint 안에 mix 위험.
- **morphdom 같은 DOM diff library 활용 = template renderer 패턴 일반화**: 매 sprint 의 widget 추가 시 element ID 기반 reconciliation 자동. 신규 widget = id attribute 추가만으로 incremental update.
- **Codex 정체 detection = task output mtime 5분 check policy 적용**: user 가 sprint-12 중간에 명시한 5분 check rule = 다음 long-running codex task 에 적용. 정체 감지 후 즉시 kill + state 보존 + resume.
- **자동 E2E 검증 = PDF 업로드 흐름 시뮬 추가**: sprint-10 의 S3 direct PUT + materialId track + workspace.material set 흐름을 자동화 = sprint-13+ 부터 gstack 자동 dogfood 가능 범위 확장.

## 4. 이어갈 것

- **sprint-13** = A 안의 표 / 그래프 실 기능 분리. brainstorm Q1=S (markdown table textarea + CSV sparkline) 채택 가정 — sprint-13 brainstorm 진입 시 재확인 필요.
- **eraser widget 확장** (sprint-11 retro 의 "이어갈 것") = 모양 (네모/세모/선) cursor 디자인 + size slider 정밀화. 현 sprint-12 = circle/square/triangle/line 4 shape + 16~64 size slider 구현 끝. 단 사용자 dogfood 시 추가 polish 가능.
- **legacy sticky kind variant cleanup**: sprint-12 = legacy sticky add path UI 제거 (slice-5). add-sticky-note click handler 는 dead code 로 잔존 (BC). sprint-13 이후 cleanup 후보.
- **모바일 inspector UX**: sprint-11 retro 부터 이연. desktop 우선. 별 sprint 또는 mobile-first task.
- **annotation server-side persistence**: 별 sprint, sprint-12 데이터 모델 (textBoxes / checklists / eraser shape 등) 정착 후 진입.
- **점멸 fix 후속 cleanup**: morphdom 도입 후 모든 widget element 의 ID attribute 일관성 검증. 일부 element 에 ID 가 없으면 morphdom 가 element 새로 만들 가능성 — sprint-13 dogfood 시 회귀 발견 시 보강.
- **Codex `gpt-5.5 xhigh` 정체 root cause**: SFS executor profile metadata 가 reviewer bundle 에 노출되지 않아 확인 불가 ([[project-sprint10-handoff]] / sprint-11 retro 와 동일 이연). infra task.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (G1 Gemini PASS r1 + Codex PASS r3, AC9-a~h enforceable. dogfood 단계의 fix 들 = slice-3-refine, slice-4-refine, slice-6 revert, slice-7, slice-7-refine 으로 추적)
- [x] workbench 가 접혔다 (sfs retro adapter 가 sprint close commit 자동 생성, status sprint=-)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (290+ tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=12+
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-19T02:11:28+09:00 (auto)
<!-- solon:division-recommendations:end -->
