---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-1"
workspace: "annotation-pdf-viewer-wide-layout"
handoff_dir: "docs/solon/annotation-pdf-viewer-wide-layout/20260518"
goal: "PDF viewer wide layout (inspector L2 collapse) + 도구 라벨 정직화 (sprint-12 실기능 기반)"
goal_supersedes: "annotation 도구 실기능화 + PDF viewer wide layout 확장 (split → sprint-11 + sprint-12)"
created_at: ""
last_touched_at: "2026-05-18T17:33:45+09:00"
closed_at: 2026-05-18T17:33:45+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **scope 분할 (brainstorm Q5)**: A 안 (전부 실기능화) 을 sprint-11 (layout + 지우개) + sprint-12 (5 도구 실기능 + eraser widget) 로 분리. 한 sprint 안에 5 신규 도구 + 데이터 모델 + reducer 가 들어가지 않게 한 결정이 dogfood 변동성 대응에 도움.
- **cross-CPO review (Gemini + Codex) 병렬**: Gemini PASS (security lens) + Codex 4 round (partial→partial→partial→PASS) 를 통해 plan-contract 의 보안 AC (AC9-a~f) 가 enforceable 한 6항 으로 정착. Gemini = 빠른 큰 그림 verdict, Codex = 점진적 wording sharpening 역할 분담.
- **slice 단위 worker 위임 + 한국어 commit**: Sonnet 4.6 generator 5 회 (slice-1, slice-2 modal, slice-2 eraser 기본, slice-2-refine, slice-3) 위임. Opus 직접 코딩 0. 한국어 commit message 100%.
- **file whitelist + AC9-a/f 자가 검증**: worker prompt 에 화이트리스트 명시 + git diff 기반 path check 의무 → backend/api/storage 변경 0 일관 유지.
- **dogfood-driven scope refinement**: slice-2 (modal) dogfood 후 user 의도 불일치 발견 → revert + scope 재조정. dogfood 가 plan 결정 보정에 빠르게 작동.

## 2. 문제

- **brainstorm Q1=A 해석 오류**: brainstorm 에서 "전부 실기능화" 를 sprint 단위 분할로 받아들여 sprint-11 = 라벨 정직화 (R4-c modal) 로 잠깐 우회. dogfood 시 user 가 "결국 다 포스트잇 안의 형식" 으로 modal 의도 인식 → slice-2 (b789615) revert (e8a5a0d). 의사 결정 1 round 낭비. **교훈**: brainstorm 의 "전부 실기능화" 같은 강한 의도는 plan 단계에서 즉시 sprint-12 로 분리 + sprint-11 에서 임시 정직화 도입 X.
- **R10 (지우개) 1차 구현 미흡**: 첫 slice-2 (fb24cdd) = stroke 통째 삭제 + cell cursor. dogfood 후 즉시 "동그란 cursor + px 단위 + drag" 요구 → slice-2-refine (0418d89) 필요. plan revision 시점에 R10 의 "px 단위 / 모양 / cursor" UX 명세를 더 깊게 정의해야 첫 worker 위임에서 적정 결과 가능. brainstorm + plan 단계에서 도구 동작 spec 의 깊이 부족.
- **SFS adapter bundle truncation**: Codex r3 review 에서 plan.md 의 AC9-d/e/f + §9.5 가 bundle 에 미포함 → "AC9-d~f 없음" 으로 partial 판정. plan §9 재배치 + 12 line 트림 (revision 4) 후 PASS. [[project-sprint10-handoff]] §6 의 truncation 패턴 재현. **교훈**: 보안 AC 같은 핵심 항목은 plan.md 의 앞쪽 (line 250 이내) 에 배치 필요. 긴 helper code block 은 AC 뒤로.
- **R4-c modal scope 폐기 cost**: modal worker 위임 (1회) + revert (1 commit) + plan revision 2회 = 3~4시간 정도 낭비. brainstorm 단계에서 R4-c 의 "결국 sticky kind variant 안" 임을 더 명확히 짚었어야 함.
- **plan revision 7회**: G1 PASS 후에도 sprint-11 안에서 revision 4 → 7 (slice-1 worker 보고 .section→.content + slice-2 revert 후 R10 신설 + dogfood 후 R10 정밀화). plan 이 "잠금된 contract" 보다 "살아있는 doc" 으로 작용. CPO 입장에서 G1 PASS 후 revision 누적 = scope drift signal. **교훈**: plan revision 누적 = brainstorm 단계로 돌아갈 trigger.

## 3. 시도할 것

- **brainstorm Q1=A 같은 결정은 plan 단계에서 "이 sprint scope 외 / sprint-N+1 scope" 명시**: 미루는 결정도 명시적으로 적어 dogfood 단계에서 재논의 없게.
- **신규 도구 도입 plan R 안에 "도구 동작 spec 5축" 의무 명시**: (1) cursor / (2) hit-test 단위 (점 vs stroke vs 영역) / (3) interaction (click vs drag) / (4) feedback (시각 hint) / (5) edge case (빈 영역 / 다중 hit). 5 축이 모두 plan 단계에서 정해지면 worker 위임 1회로 dogfood-pass 가능.
- **plan.md 길이 cap 200 lines**: SFS bundle truncation 우회. 보안 AC + R/AC matrix 를 앞에, helper code / 위험 / self-CPO 는 뒤로. 길어지면 별 doc (`design.md`) 으로 분리.
- **dogfood "spec 충족 여부" 1-2분 prompt 도 plan 에 포함**: 사용자가 dogfood 직후 "spec 과 실 동작 일치하는가?" 짧은 체크리스트 따라가게. revert 비용 감소.
- **brainstorm Q5=분할 결정 시 "다음 sprint 의 brainstorm" 도 즉시 seed**: sprint-12 가 "예약" 만 되고 brainstorm topic 이 모호하면 sprint-11 마감 후 brainstorm 부터 처음 시작. seed 미리 두기.

## 4. 이어갈 것

- **sprint-12 = A 안 5 도구 실 기능 분리** ([[brainstorm Q1=A]] 의 진짜 목표):
  - 텍스트박스 (포스트잇 wrapper X)
  - 체크리스트 (실제 checkbox UI)
  - 표 (HTML grid + cell 입력)
  - 그래프 (실제 차트 widget + data point)
  - **eraser widget** = 모양 (동그라미/네모/세모/선) + 사이즈 slider 통합. sprint-12 brainstorm 에서 Q4 (간단 vs 전문 UX 수준) 결정 필요.
- **annotation server-side persistence**: 별 sprint, sprint-12 의 5 도구 데이터 모델 정착 후 진입.
- **모양 위젯 (지우개)**: sprint-12 통합 (eraser widget 의 일부).
- **모바일 inspector UX**: sprint-11 = desktop 우선, 모바일 = 자동 접힘 + toggle 숨김. 별 sprint 또는 mobile 전용 UX 검토.
- **펜 도구 보강**: sprint-11 = 기존 ink stroke 동작 유지. 색상/굵기 변경 등은 후속 sprint 또는 별 task.
- **Codex CPO `gpt-5.5 xhigh` profile 활성화**: sprint-10 retro 에서도 동일 issue. SFS executor profile metadata 가 reviewer bundle 에 노출되지 않음. infra task = SFS bridge metadata 노출.
- **GPT-5.3-Codex-Spark bridge 구성**: bounded mechanical 작업 (slice-3 같은) 용 spark routing 1순위. 현재 sonnet 4.6 fallback 사용 중. 별 infra task.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (G1 Gemini PASS + Codex r4 PASS, AC9-a~f enforceable. r1~r3 partial findings 전부 plan revision 으로 해소)
- [x] workbench 가 접혔다 (sfs retro adapter 가 sprint close commit `436b8e8` 자동 생성, status sprint=-)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (287 tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-18T17:33:45+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
