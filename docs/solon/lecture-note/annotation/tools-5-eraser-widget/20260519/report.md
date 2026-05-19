---
phase: report
status: final
sprint_id: "2026-W21-sprint-2"
workspace: "annotation-5-eraser-widget"
handoff_dir: "docs/solon/lecture-note/annotation/tools-5-eraser-widget/20260519"
goal: "annotation 도구 5종 실 기능 분리 + eraser widget"
goal_scope_note: "Q2=2분할 = sprint-12 부분만 (텍스트박스 + 체크리스트 + eraser widget). 표/그래프 = sprint-13."
created_at: "2026-05-19T02:11:28+09:00"
last_touched_at: "2026-05-19T02:11:28+09:00"
closed_at: "2026-05-19T02:11:28+09:00"
---

# 보고서

## 1. 결과

- 목표: A 안 (전부 실기능화) 의 sprint-12 부분 = 텍스트박스 + 체크리스트 + eraser widget + sticky drag + 점멸 fix. 표/그래프 = sprint-13.
- 상태: **done**
- 판정: AC1~AC11 + AC9-a~h 보안 baseline 모두 충족.
- 한 줄 결과: PDF 점멸 근본 해결 (morphdom) + 텍스트박스/체크리스트 실 widget + eraser 4 shape + sticky drag + 텍스트박스 macOS Preview 스타일 인라인 redesign.

## 2. 완료한 것

- **slice-1** (`5575d1b`) — packages/domain 확장: `PdfWorkspaceTool` union (+text/checklist/eraser) + `PdfTextBox` / `PdfChecklist` type + reducer signature + hydration fail-closed. 51 단위 테스트.
- **slice-2** (`0f6c4b2`) — 텍스트박스 도구 통합 (1차) + slice-1 cascade TS 오류 해소 + hydration helper integration.
- **slice-3** (`529061b` + `3ad0bcc`) — 체크리스트 도구 통합 + handleDocumentInput 가드 확장.
- **slice-3-refine** (`0efad90`) — R10 mode-agnostic widget action (CSS pointer-events: auto override) + R11 체크리스트 collapse/expand (`PdfChecklist.collapsed` field + toggle reducer).
- **slice-4** (`a1f425a`) — eraser widget: shape 4 (circle/square/triangle/line) + size slider + jank 방어 (segment cap 50 + bbox prefilter). Codex gpt-5.5 xhigh 정체 후 finalize codex resume.
- **slice-4-refine** (`fbfc25e`) — eraser drag RAF throttle + dual-erase 정돈 (Opus 직접).
- **slice-5** (`9f0da88`) — 도구 그룹 L2 정돈: legacy sticky add 그룹 제거 + annotation 도구 그룹 4 버튼 (텍스트/체크 + 표/그래프 disabled placeholder) + 접근성 (aria-pressed, focus-visible).
- **slice-6** (`ac5be86`) — 점멸 fix 1차 (iframe preserve mount) + sticky drag handler 신설 + sticky/textbox/checklist add-then-reset.
- **slice-6 revert** (`94ee871`) — iframe preserve mount 폐기 (Chromium HTML spec 으로 iframe detach/re-attach reload trigger → PDF 미표시 회귀).
- **slice-7** (`66e87c9`) — morphdom 도입 (점멸 근본 fix) + 텍스트박스 macOS Preview 스타일 인라인 redesign (header/textarea body 폐기 → inline textarea + ✕ hover only).
- **slice-7-refine** (`80deeb8`) — 텍스트박스 drag grip handle 도입 (⋮⋮ 좌측 hover/focus 시만 표시).
- **sprint close** (sfs retro adapter) — sprint dir → handoff_dir 이동.

## 3. 결정

- **brainstorm Q1=S** = 표/그래프 입력 UX 간단 (markdown table / CSV sparkline, sprint-13 적용).
- **brainstorm Q2=2분할** = sprint-12 (텍스트/체크/eraser) + sprint-13 (표/그래프).
- **brainstorm Q3=A** = legacy sticky kind variant 데이터 잔존 (render/edit path 유지, add path UI 제거).
- **brainstorm Q4=L2** = 도구 그룹 2 그룹 (입력 4 + annotation 4).
- **brainstorm Q5=U1** = click-to-place + drag.
- **D-eraser cursor** = SVG circle/square/triangle data URL (shape 별 동적).
- **D-textbox UI redesign (slice-7)** = 인라인 텍스트 = 작은 폰트 + transparent bg + hover dashed outline + focus dotted outline + ⋮⋮ grip drag handle + ✕ delete hover only.
- **점멸 fix architectural** = `appRoot.innerHTML` 폐기 + morphdom DOM diff. 7KB vanilla, zero dep cost.
- **임시 worker 정책** = sprint-12 + 13 한정 Codex gpt-5.5 xhigh, Opus 직접 1회 예외 (sprint-12 에서 4 회 적용 — refine/revert/redesign 패턴).

## 4. 검증

- 명령/체크:
  - `pnpm --filter @study-note/web build` ✅ (62 modules, ~430ms)
  - `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/*.spec.ts packages/domain/__tests__/*.spec.ts` ✅ **153/153 pass**
  - whitelist `git diff --name-only origin/main..HEAD` = `packages/domain/{src,__tests__}/pdf-workspace.{ts,spec.ts}` + `apps/web/src/main.ts` + `apps/web/src/styles.css` + `apps/web/src/__tests__/{inspector-open,textbox-tool,checklist-tool,eraser-tool}.spec.ts` + `apps/web/package.json` + `pnpm-lock.yaml` + `.gitignore` + `package.json`
  - innerHTML grep = 0 신규 (renderShell 의 template literal escapeHtml 패턴)
  - 신규 console.* 식별정보 0
  - 신규 localStorage key 0 (textBoxes/checklists/eraserShape/eraserSize = SubjectPdfWorkspace field, 기존 store schema 통합)
- 결과: AC1~AC11 + AC9-a~h 모두 통과.
- 수동 확인 (사용자 dogfood 2026-05-19):
  - 텍스트박스 추가/이동(grip ⋮⋮)/편집/삭제 ✓
  - 체크리스트 추가/item 토글/label 편집/이동/접힘-펼침 ✓
  - 지우개 shape 4 + size + drag ✓
  - 포스트잇 추가/이동(slice-6 신설)/삭제 ✓
  - PDF 점멸 fix (morphdom) ✓
  - 도구 그룹 L2 (4+4 with 표/그래프 disabled) ✓
  - 텍스트박스 인라인 redesign ✓

## 5. 위험 / 후속

- 위험:
  - morphdom 도입 후 widget element id 일관성 = sprint-13+ 의 신규 widget 도입 시 ID 누락 시 reconciliation 실패 가능. 각 신규 widget = `data-*-id` attribute 의무.
  - eraser line mode drag path segment cap 50 + bbox prefilter 성능 = 100 stroke / 100 points / 500 segment 시뮬 = ~12ms. 실 stroke 다수 시 회귀 가능.
  - `field-sizing: content` Chrome 123+ 전용. Firefox 134+ / Safari 17.4+. fallback `rows="1"` 단 multi-line 시 정확 X.
  - 모바일 (≤820px) 도구 그룹 L2 = 8 버튼 한 줄 narrow. responsive 마감 별 sprint.

- 후속:
  - **sprint-13** = 표 / 그래프 실 기능 + legacy sticky add handler dead code cleanup + 모바일 inspector UX + eraser shape 확장 polish.
  - annotation server-side persistence.
  - 신규 widget ID 일관성 verification.
  - `field-sizing: content` browser fallback.
  - SFS Codex `gpt-5.5 xhigh` profile 활성화 verification.

## 6. 남긴 것 / 접은 것

- 남김: 표 / 그래프 도구 (sprint-13), annotation server persistence, 모바일 UX, eraser polish, codex bridge metadata.
- private archive: 해당 없음 — 모든 결정 (slice-6 revert 포함) 이 plan/retro/report 에 공개.

## 7. 다음

- 사용자: branch `feature/sprint-12-annotation-tools-eraser-widget` push (Solon §1.5 — push 는 사용자 터미널). 누적 commit ahead = 12 + retro/report 본문.
- PR #12 (예상) 생성/갱신 후 codex review.
- 다음 sprint-13 brainstorm = 표 / 그래프 + legacy cleanup + 모바일 UX 진입 시 확정.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (290+ tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=12+
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-19T02:11:28+09:00 (auto)
<!-- solon:division-recommendations:end -->
