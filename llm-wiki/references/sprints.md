---
id: study-note-ref-sprints
title: Sprint Index
language: ko
load_when:
  - sprint history
  - 지난 sprint
  - 무엇을 했나
  - retro
summary: 최근 sprint 색인. 본문은 `.sfs-local/sprints/`, PR, retro 원문 참조.
---

# Sprint Index

본문은 `.sfs-local/sprints/<id>/`, GitHub PR, retro 원문에. wiki 는 한 줄 + 닿은 aggregate / flow 만.

## 2026 W21 (현재 진행 / 직전)

| Sprint | 작업 | PR | 닿은 aggregate / flow |
|---|---|---|---|
| <a id="2026-w21-sprint-1-userid-namespacing"></a>**W21-sprint-1 (userId namespacing)** | S1: notebook localStorage userId namespacing + migration owner gate | [#30](https://github.com/MJ-0701/study-note/pull/30) | Notebook, AuthSession, [flows/storage-namespacing](../flows/storage-namespacing.md) |
| <a id="2026-w21-sprint-3-pdfworkspace-namespacing"></a>**W21-sprint-3 (pdfWorkspace namespacing)** | S2: pdfWorkspaceStore namespacing + S3: transition wipe 제거 | [#31](https://github.com/MJ-0701/study-note/pull/31) | PdfWorkspace, AuthSession, [flows/storage-namespacing](../flows/storage-namespacing.md), [flows/session-transition](../flows/session-transition.md) |
| <a id="2026-w21-sprint-2"></a>**W21-sprint-2 (메모/필기 BE persistence)** | userNotes / pdf-annotations BE persistence + examPhase + IA 통합 진입화면 | [#29](https://github.com/MJ-0701/study-note/pull/29) | Notebook (userNotes), PdfWorkspace (annotation PUT), Sync, [flows/autosave-sync](../flows/autosave-sync.md) |

## 2026 W20

| Sprint | 작업 | PR / 비고 | 닿은 영역 |
|---|---|---|---|
| **W20-sprint-1 (PDF hotkeys S1~S5)** | 전체화면 PDF + hotkeys + 안내문 + session 통합 | #25 #26 #27 외 | PdfWorkspace UX |
| **W20-sprint-2** | 세부 hotfix | (handoff) | PdfWorkspace |
| **W20-sprint-3** | 반응형 UI | (handoff, evidence) | 전역 UI |
| **W20-sprint-4** | hotfix / keep-alive | (handoff) | infra |
| **W20-sprint-6** | smoke sweep | log | 전역 검증 |
| **W20-sprint-10 (sprint-10 in memory)** | persona + PDF inspector 등 multi-feature | #10 squash | 다영역 |

## 2026 W19 이전

handoff 문서: `docs/2026-W19-sprint-5/`, sprint-11~15 등 memory MEMORY.md 참조:
- sprint-11: layout L2 + 지우개
- sprint-12: textbox/checklist/eraser widget + sticky drag + morphdom fix
- sprint-13: 표/그래프 도구
- sprint-14: tan 함수 + 검사기 drill-down + PDF 70vh UX
- sprint-15: 운영 배포 (Azure SWA + ACA + MySQL Flex + Porkbun)

## sprint dir convention

- `.sfs-local/sprints/<sprint-id>/brainstorm.md` — G1 brainstorm
- `.sfs-local/sprints/<sprint-id>/plan.md` — G3 plan (AC + slices + risks)
- `.sfs-local/sprints/<sprint-id>/log.md` — implementation log
- `.sfs-local/sprints/<sprint-id>/retro.md` — G7 retro
- `.sfs-local/sprints/<sprint-id>/evidence/` — screenshots / build output

## handoff 문서 (외부 공유 가능)

- `docs/solon/handoff/` — 세션 인계
- `docs/solon/work-slice/<date>/` — work-slice 별 handoff (e.g. sprint-15)
- `docs/2026-W19-sprint-5/` — 초기 sprint 산출물 (legacy 위치)

## 갱신 의무

- 새 sprint close 시 위 표에 한 줄 추가 + 관련 aggregate / flow page 갱신.
- 메모리 (`MEMORY.md`) 의 `project_*_handoff.md` 항목과 sync.
