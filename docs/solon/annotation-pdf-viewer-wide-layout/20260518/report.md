---
phase: report
status: final
sprint_id: "2026-W21-sprint-1"
workspace: "annotation-pdf-viewer-wide-layout"
handoff_dir: "docs/solon/annotation-pdf-viewer-wide-layout/20260518"
goal: "PDF viewer wide layout (inspector L2 collapse) + 도구 라벨 정직화 (sprint-12 실기능 기반)"
goal_supersedes: "annotation 도구 실기능화 + PDF viewer wide layout 확장 (split → sprint-11 + sprint-12)"
created_at: "2026-05-18T17:33:45+09:00"
last_touched_at: "2026-05-18T17:33:45+09:00"
closed_at: "2026-05-18T17:33:45+09:00"
---

# 보고서

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 결과

- **목표**: PDF 작업공간 본문 가독성 회복 (inspector L2 collapse + main max-width 완화) + 도구 라벨 정직화 (sprint-12 의 신규 도구 5종 실 기능 분리 기반 마련). brainstorm 의 Q1=A (전부 실기능화) 는 sprint-11 + sprint-12 로 분할 (Q5=분할 결정).
- **상태**: **done** (단, brainstorm Q1=A 의 라벨 정직화 부분은 dogfood 후 의도 재해석으로 R4-c modal 폐기 → sprint-11 = layout + 지우개 도구로 scope 재조정).
- **판정**: AC1~AC4 + AC7/AC8 + AC10 + AC9-a~f (보안 9 AC) 충족. AC5 (R4-c modal) = 폐기 (revert). AC6 = comment 2줄 보강.
- **한 줄 결과**: PDF stage 전체 폭 확보 + 지우개 도구 (drag + px 단위 + 동그란 cursor) 추가. 5 도구 실 기능 분리 + eraser widget = sprint-12 로 분리.

## 2. 완료한 것

- **slice-1** (`287423b`) — Layout L2 inspector collapse + `.content` max-width PDF workspace 라우트 한정 완화 + localStorage persistence (`studyNote.pdfWorkspace.inspectorOpen`) + 접근성 (aria-expanded/controls).
- **slice-2 (modal)** (`b789615`) — R4-c sticky kind 선택 modal — **dogfood 후 revert** (`e8a5a0d`). 사용자 의도와 불일치 (modal 도 결국 포스트잇 안의 형식).
- **slice-2 (지우개 기본)** (`fb24cdd`) — `PdfWorkspaceTool` union `"eraser"` 추가 + 도구 그룹 4 버튼 (읽기/포스트잇/펜/지우개) + closest-hit stroke 통째 삭제 + cell cursor.
- **slice-2-refine** (`0418d89`) — 지우개 정밀화 (R10-a/b/c): 동그란 SVG cursor (radius=16px) + `eraseStrokePointsInRadius` reducer (영역 안 point 만 제거 + stroke split) + drag (pointerdown/move/up + pointer capture).
- **slice-3** (`103344d`) — sprint-12 reserved comment 보강 (`LocalPdfTool` 위 2줄) + 모바일 (max-width: 820px) inspector toggle `display: none` + 접근성/responsive 마감.
- **sprint close** (`436b8e8`) — sfs retro adapter 자동 생성. brainstorm/plan/implement/log/review = `handoff_dir` 으로 이동, self-cpo.md 만 `.sfs-local/sprints/2026-W21-sprint-1/` 잔존.

## 3. 결정

- **D-R4 → 폐기**: revision 2 plan = R4-c (modal) 채택 → slice-2 구현 후 dogfood = "modal 안 4 option 도 결국 포스트잇 안의 형식" 으로 user 의도 불일치 → revert. revision 6 = R10 신설로 대체.
- **R10 (지우개) 신설** (revision 6): `PdfWorkspaceTool` union `"eraser"` 추가, 4 도구 (읽기/포스트잇/펜/지우개), closest-hit stroke 통째 삭제.
- **R10 정밀화** (revision 7): dogfood 후 "동그란 cursor + px 단위 + drag" 요구 → stroke split + custom cursor + pointer capture drag.
- **모양 위젯 (지우개)** = sprint-12 통합 ("좀 더 구체화된 지우개 모양 등이 포함돼야 하니까" 사용자 결정).
- **모바일 toggle** = 옵션 A (`display: none` at ≤820px). 821-1100px tablet = toggle 유지 (`.is-inspector-open` modifier 의존).
- **cursor 구현** = 옵션 A (SVG circle data URL, percent-encoded Firefox 호환). 옵션 B (overlay) = 후속 성능/시각 부족 시.
- **stroke split id 규칙** = `${origId}-s${segmentIndex}` 결정적, prefix 유지.
- **stroke 거리 tie-break** = id 큰 (최신) stroke 우선 삭제.

## 4. 검증

- **명령/체크**:
  - `pnpm --filter @study-note/web build` ✅ (62 modules, ~430ms)
  - `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/inspector-open.spec.ts apps/web/src/__tests__/eraser-tool.spec.ts` ✅ 22/22 pass
  - `git diff --name-only origin/main..HEAD` = whitelist 4 파일 (main.ts + styles.css + inspector-open.spec.ts + eraser-tool.spec.ts) ✅
  - `git diff origin/main..HEAD | grep -nE '\+.*\.(innerHTML\s*=|insertAdjacentHTML)'` = 0 line ✅
  - 신규 추가 `console.*` 식별정보 노출 0 ✅
  - 신규 localStorage key = `studyNote.pdfWorkspace.inspectorOpen` 단독 ✅
- **결과**: 핵심 AC + 보안 AC 모두 통과.
- **수동 확인** (사용자 dogfood 2026-05-18):
  - PDF 영역 확장 ✓ (slice-1)
  - 지우개 동작 ✓ (slice-2-refine, "지우개는 정상임" 확인)

## 5. 위험 / 후속

- **위험**:
  - eraser drag 매 pointermove 마다 `renderApp()` 1회 = stroke 다수일 시 jank. 후속 throttle/RAF 검토.
  - sprint-12 의 eraser widget 도입 시 sprint-11 의 16px 고정 radius → slider/state 추가 = `applyEraserAtPoint` 호출부 조정 필요. BC plan 필요.
  - 모바일 inspector UX = 자동 접힘 + toggle 숨김 만으로 충분한지 추가 dogfood 미정.
  - sprint-11 plan revision 7회 누적 = scope drift signal. 다음 sprint 부터 brainstorm 단계 결정 깊이 강화 필요.
- **후속**:
  - **sprint-12 = A 안 5 도구 실 기능 분리 + eraser widget**: 텍스트박스 / 체크리스트 / 표 / 그래프 + eraser 모양 (동그라미/네모/세모/선) + 사이즈 slider. brainstorm Q4 (간단 vs 전문 UX 수준) 결정 필요.
  - annotation server-side persistence (sprint-12 데이터 모델 정착 후).
  - SFS Codex `gpt-5.5 xhigh` profile 활성화 검증 (sprint-10 retro 와 동일 이연).
  - GPT-5.3-Codex-Spark bridge 구성 (slice-3 같은 bounded 작업 routing).
  - 펜 도구 색상/굵기 보강.

## 6. 남긴 것 / 접은 것

- **남김**: 5 도구 실 기능 분리 (sprint-12), eraser 모양 + 사이즈 widget (sprint-12), annotation server-side persistence, 모바일 inspector UX, 펜 보강, Codex bridge metadata 활성화, Spark bridge 구성.
- **private archive**: 해당 없음 — 모든 결정 (R4-c modal revert 포함) 이 plan/retro/report 에 공개.

## 7. 다음

- **사용자**: 현 branch `feature/sprint-11-pdf-wide-layout-tool-honesty` (local HEAD `436b8e8`, remote 까지 push 후 PR codex review). 6 commit 누적. PR 생성/머지는 사용자 결정.
- **다음 sprint-12 brainstorm**: A 안 5 도구 실 기능 + eraser widget. Q4 (간단 vs 전문 UX 수준) + 데이터 모델 + reducer + persistence + UI = 큰 작업. 별 brainstorm 시작.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (287 tracked files), domains=0, last_review=pass, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-18T17:33:45+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
