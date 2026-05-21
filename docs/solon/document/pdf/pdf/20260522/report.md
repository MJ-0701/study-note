---
phase: report
status: final
sprint_id: "2026-W21-sprint-1"
workspace: "pdf"
handoff_dir: "docs/solon/document/pdf/pdf/20260522"
goal: "PDF 전체화면 + 필기도구 단축키 (라벨에 단축키 노출)"
created_at: "2026-05-22T00:18:19+09:00"
last_touched_at: "2026-05-22T00:18:19+09:00"
closed_at: "2026-05-22T00:18:19+09:00"
domain: "document"
subdomain: "pdf"
feature: "pdf"
---

# 보고서

## 1. 결과

- 목표: PDF 학습 화면에서 키보드 단축키로 도구 8 개를 즉시 전환하고, 단축키를
  버튼 라벨에 항상 노출해 학습 부담 없이 사용할 수 있게 한다. PDF 작업공간을
  브라우저 Fullscreen 으로 띄울 수 있게 한다.
- 상태: **done**
- 판정: self-CPO PASS, Codex cross-review PASS (S1/S2/S3 모두 "Didn't find any
  major issues").
- 한 줄 결과: R/S/P/E/T/C/B/G 도구 단축키 + Cmd/Ctrl+[/] 페이지 이동 + F
  풀스크린 + ? 도움말 모달. 모두 `<kbd>` 배지로 노출, 입력 포커스 가드, 비-QWERTY
  레이아웃 호환. 3 슬라이스 stacked PR (#17 / #21 / #22) 머지 완료.

## 2. 완료한 것

- 단축키 dispatch 코어 (S1, PR #17 `c2a360d`):
  - `handleDocumentKeyDown` document 레벨 listener.
  - 매핑: KeyR=read / KeyS=sticky / KeyP=pen / KeyE=eraser / KeyT=text /
    KeyC=checklist / KeyB=table / KeyG=chart.
  - 페이지 이동: `Cmd/Ctrl + [` / `Cmd/Ctrl + ]`. `event.code` + `event.key`
    이중 매칭 (AltGr 레이아웃 호환).
  - `isEditableTarget` 가드 (INPUT/TEXTAREA/SELECT/contentEditable) — bracket
    포함 모든 dispatch 에 적용.
  - `event.code` + `event.key` 이중 매칭 + IME 가드 (`event.isComposing`).
- 단축키 배지 + 도움말 모달 (S2, PR #21 `d876ac9`):
  - `renderToolButton` 가 `<kbd class="tool-button__key" aria-hidden="true">`
    배지 + `aria-keyshortcuts` 속성 출력.
  - `?` 키 (event.key === "?" 우선, Shift+Slash code fallback) 토글.
  - `renderHotkeyHelpModal` 12 행 표 (도구 8 + 페이지 ±1 + F + ? + Esc) + role=
    "dialog" + aria-modal + autofocus 닫기 버튼 + Esc/backdrop/같은 키 모두 close.
  - 모달 열린 동안 app-shell `inert` 속성 (modal-real-modal). 라우트 가드 (PDF
    workspace 외에서 모달 미렌더). hashchange / `clearAuthSession` 시 자동 close.
  - 모바일 (`(pointer: coarse)` / `<= 480px`) 툴바 배지 hide, 모달 안 배지는 유지.
  - 도구 dispatch priority 반전: `event.key` 우선 (Dvorak/AZERTY 라벨 일치) +
    `event.code` fallback (한국어 IME 보호).
- 전체화면 (S3, PR #22 `1165646`):
  - `togglePdfFullscreen()` Fullscreen API wrapper + capability check (iOS
    Safari 대응) + `try/catch` 동기 throw 가드 + Promise reject `.catch`.
  - `#pdf-workspace-root:fullscreen` CSS (흰 배경 + 100vw/100vh + 패딩).
  - `F` 키 (event.key 우선 + event.code fallback, auto-repeat 가드) + 툴바
    "전체화면" 버튼 (활성 시 라벨 "전체화면 종료").
  - `fullscreenchange` 리스너로 버튼 라벨/aria-pressed 즉시 반영.
  - 도움말 모달 표에 F / Esc 행 업데이트.

## 3. 결정

- 풀스크린은 Browser Fullscreen API 사용 (in-app focus mode 대신). 강의 집중
  환경 = 표시 영역 극대화 우선.
- 도구 단축키 = 도구 이니셜 기반 + 표=B (taBle), 텍스트박스=T. 사용자 §6 답변.
- 페이지 이동 = `Cmd/Ctrl + [` / `Cmd/Ctrl + ]` (modifier 필수, 텍스트 입력 충돌
  완전 회피). 화살표는 채택하지 않음.
- 단축키 배지 = `<kbd>` + 디자인 토큰 chip. 모바일에서는 툴바 배지만 hide,
  모달은 유지.
- vitest 인프라 도입은 sprint 범위 외로 deferral. AC2/AC3/AC8 evidence 는 수동
  + codex review 로 대체.
- 정책 전환 (2026-05-21~): Claude 직접 코딩, Codex = CPO cross-review 만.
  worker tiering 폐기.
- 리뷰 플로우: push → self-review (8 영역) → codex cross-review. self 단계
  스킵 금지.

## 4. 검증

- 명령/체크:
  - `pnpm --filter @study-note/web build` (매 commit 마다 통과)
  - `sfs review --gate G1 --executor codex` (Gate 3 plan PASS)
  - PR #17 / #21 / #22 codex cross-review 모두 "Didn't find any major issues"
- 결과:
  - main HEAD `1165646` (S3) 까지 머지 완료
  - main checks: Vercel SUCCESS, Vercel Preview Comments SUCCESS
- 수동 확인:
  - 운영 검증은 FE 태그 push 후 사용자 진행 예정 (단축키 / 모달 / 전체화면 /
    국제 키보드 호환).

## 5. 위험 / 후속

- 위험:
  - vitest 인프라 부재 — 회귀 자동 감지 불가. 다음 sprint 우선 후보.
  - PDF iframe 포커스 시 keydown 이 메인 윈도우까지 bubble 안 되는 케이스
    (same-origin blob 이므로 현재는 OK, cross-origin 도입 시 회귀).
- 후속:
  - FE 태그 `fe-v0.1.12` push → SWA 배포 (사용자 터미널).
  - 운영에서 R/S/P/E/T/C/B/G + Cmd+[ / Cmd+] + F + ? 동작 + 도움말 모달 + 모바일
    배지 hide 확인.
  - S4 (vitest + hotkeys.test.ts) 다음 sprint.
  - PDF zoom 단축키 / 펜 sub-action 단축키 후속 사이클.

## 6. 남긴 것 / 접은 것

- 남김: vitest 인프라 + hotkeys.test.ts (AC2/AC3/AC8 자동 evidence) — 다음
  사이클.
- private archive: `.sfs-local/sprints/2026-W21-sprint-1/`,
  `.sfs-local/tmp/review-runs/2026-W21-sprint-1-gate3-*`.

## 7. 다음

- 사용자 터미널에서 `git tag fe-v0.1.12 && git push origin fe-v0.1.12` → 운영
  배포.
- 운영 검증 (도구 단축키 / 페이지 이동 / 풀스크린 / 도움말 모달 / 모바일 hide).
- 검증 완료 시 sprint 완전 종료. 다음 후보:
  1. **vitest 인프라 + hotkeys.test.ts** (S4 deferral 회수).
  2. **PDF zoom 단축키** (+/-/0).
  3. **펜/지우개 sub-action 단축키** (색/굵기/모양).
  4. **사용자 정의 단축키 (rebinding)**.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (329 tracked files), domains=0, last_review=unknown, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-22T00:18:19+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
