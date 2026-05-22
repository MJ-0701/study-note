---
id: study-note-wiki-retrieval
title: Retrieval Guide
language: ko
load_when:
  - 어디서 찾지
  - retrieval
  - 코드 위치
  - 어떻게 검색
summary: 무엇을 찾을 때 어떤 wiki page 와 어떤 원문 경로를 먼저 봐야 하는지의 routing table.
---

# Retrieval Guide

질문 유형 → wiki page → 원문 경로 순으로 routing. wiki 가 비어 있거나 stale 한
경우 직접 원문으로 가지만 retro 에서 wiki 보강 evidence 로 기록.

## 도메인 / DDD 질문

| 질문 | 1차 wiki | 2차 원문 |
|---|---|---|
| "이 용어 정확한 뜻이 뭐였지" | [domain/ubiquitous-language](domain/ubiquitous-language.md) | `docs/solon/domain-map.md`, `packages/domain/src/*.ts` |
| "이 도메인은 어느 bounded context 인가" | [domain/context-map](domain/context-map.md) | `packages/domain/src/index.ts` |
| "이 aggregate 의 invariant 는" | `domain/aggregates/<name>.md` | aggregate 정의 파일 (`packages/domain/src/<file>.ts`) |
| "여러 aggregate 가 같이 지켜야 하는 규칙" | [domain/invariants](domain/invariants.md) | 관련 sprint plan/retro |

## 코드 위치 질문

| 질문 | 1차 wiki | 2차 원문 |
|---|---|---|
| "프론트 어디서 시작" | [modules/apps-web](modules/apps-web.md) | `apps/web/src/main.ts` |
| "백엔드 모듈 구조" | [modules/apps-api](modules/apps-api.md) | `apps/api/src/<module>/` |
| "도메인 타입 정의" | [modules/packages-domain](modules/packages-domain.md) | `packages/domain/src/` |

## 흐름 / 동작 질문

| 질문 | 1차 wiki | 2차 원문 |
|---|---|---|
| "메모/필기 어떻게 저장되나" | [flows/autosave-sync](flows/autosave-sync.md) | `apps/web/src/main.ts` autosave 블록 |
| "로그인 → 로그아웃 시 무슨 일" | [flows/session-transition](flows/session-transition.md) | `applySessionTransitionForUser` |
| "localStorage userId 분리" | [flows/storage-namespacing](flows/storage-namespacing.md) | sprint-3 PR (#30, #31) |

## 결정 / 히스토리 질문

| 질문 | 1차 wiki | 2차 원문 |
|---|---|---|
| "이 결정 왜 이렇게 됐지" | [references/decisions](references/decisions.md) | `.sfs-local/decisions/`, `docs/solon/decisions/` |
| "지난 sprint 무엇을 했나" | [references/sprints](references/sprints.md) | `.sfs-local/sprints/`, git log |
| "표준 / 컨벤션" | [references/standards](references/standards.md) | `CLAUDE.md`, `SFS.md`, `docs/standards/` (없으면 user CLAUDE.md) |

## sprint 진입 시 권장 retrieval 순서

1. [references/sprints](references/sprints.md) 에서 직전 sprint retro / handoff
2. [domain/context-map](domain/context-map.md) — 건드릴 context 확인
3. 관련 aggregate page (`domain/aggregates/<name>.md`) — invariant 확인
4. 관련 flow page (`flows/<name>.md`) — 흐름 안에서 작업할 곳 파악
5. 필요한 원문으로 jump (file path / line range)
