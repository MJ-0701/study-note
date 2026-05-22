---
id: study-note-wiki-home
title: study-note LLM Wiki
language: ko
visibility: oss-public
load_when:
  - 위키
  - llm wiki
  - DDD
  - context map
  - bounded context
  - ubiquitous language
summary: study-note 프로젝트의 by-reference LLM retrieval layer. DDD context map, ubiquitous language, aggregate 정의, 모듈 지도, 흐름 문서를 링크로 모은다.
---

# study-note LLM Wiki

study-note 프로젝트의 LLM retrieval / DDD 지식 지도. **원문 SSoT 는 code,
`docs/solon/`, `.sfs-local/decisions/` 에 그대로 있고, 이 wiki 는 by-reference
인덱스 + DDD 맥락 + 흐름 요약만 제공한다.**

SFS 0.6.100 `policies/obsidian-llm-wiki.md` 권고에 따라 sprint 진입 전 / agent
handoff 시 broad repo scan 대신 wiki map 을 먼저 읽고, 필요한 원문으로만 jump.

## 진입 순서

1. 이 README — vault 개요 + 사용 약속
2. [retrieval-guide](retrieval-guide.md) — 무엇을 찾을 때 어디를 보는지
3. [domain/context-map](domain/context-map.md) — bounded contexts 와 관계
4. [domain/ubiquitous-language](domain/ubiquitous-language.md) — 도메인 용어집
5. 필요한 aggregate / flow / module 페이지로 점프

## 디렉터리

- `domain/` — DDD core: context map, glossary, aggregate 명세, invariants
- `modules/` — 코드 모듈 별 지도 (apps/web, apps/api, packages/domain)
- `flows/` — cross-aggregate 흐름 (autosave, session transition, storage namespacing)
- `references/` — sprint / decision / standards 색인

## 원칙

- **By reference, not by copy.** 큰 원문을 wiki 에 붙여 넣지 않는다. summary +
  파일 경로 / 줄 번호 / sprint id / decision id 링크만.
- **Source truth = repo-local code + docs/solon + .sfs-local.** repo 밖
  host-local 설정 (`~/.claude/` 등 개인 environment) 은 wiki 의 SoT 가 아니다.
  wiki 가 원문과 충돌하면 원문이 이긴다.
- **DDD lens.** 모든 페이지는 bounded context / aggregate / invariant /
  ubiquitous language 중 하나로 정렬되어야 한다. "그냥 잡문" 은 만들지 않는다.
- **Sprint 갱신 의무.** sprint 가 domain language, aggregate boundary,
  invariant, release flow 를 바꾸면 retro 또는 다음 sprint 진입 전에 관련 wiki
  page 를 갱신하거나 follow-up gap 으로 기록한다 (아래 routing table 참조).

## 갱신 routing table

변경 종류 → 갱신 의무 page. 미수 = wiki drift.

| 변경한 것 | 함께 갱신할 wiki page |
|---|---|
| domain 타입 추가/변경 (`packages/domain/src/*.ts`) | 해당 `domain/aggregates/<name>.md` + `domain/ubiquitous-language.md` + `modules/packages-domain.md` |
| controller path / endpoint 추가/변경 (`apps/api/src/*/controller.ts`) | `modules/apps-api.md` (endpoint 표) + 영향 받는 `flows/<flow>.md` |
| storage key 추가/변경 (localStorage, R2 prefix, MySQL 컬럼) | `flows/storage-namespacing.md` + `domain/invariants.md` (I1, I7) + 해당 aggregate page |
| sync flow (debounce/abort/chain/backoff) 변경 | `flows/autosave-sync.md` + `domain/invariants.md` (I2~I5) |
| auth/session 흐름 변경 | `flows/session-transition.md` + `domain/aggregates/auth-session.md` |
| 새 invariant / 기존 invariant 변경 | `domain/invariants.md` + 관련 aggregate page |
| 새 ADR 추가 | `references/decisions.md` (anchor + 표 추가) + 인용하는 aggregate page |
| sprint close | `references/sprints.md` + 닿은 aggregate / flow page (각 page 의 "변경 이력") |
| 새 표준 문서 (`docs/standards/*.md`) 추가 | `references/standards.md` (gap 섹션 → 표 섹션 이동) |
| user-facing 용어 / 카피 변경 | `domain/ubiquitous-language.md` + `docs/solon/domain-map.md` 양쪽 일관성 확인 |

## 워크스페이스 boundary

- `llm-wiki/` 본문은 커밋한다.
- `.obsidian/workspace.json`, `.obsidian/workspace-mobile.json`, `.obsidian/cache/`,
  `.obsidian/plugins/` 는 `.gitignore` 에 이미 제외돼 있다 (개인 workspace state).
- 공유할 만한 `.obsidian/` 설정 (예: graph view 색상) 이 있으면 별도로 opt-in
  track 가능. 본 wiki bootstrap 에서는 vault 설정을 따로 commit 하지 않는다.

## 진행 상태

- 2026-W21-sprint-3 (wiki bootstrap) — initial: README, retrieval guide, domain
  layer (context map / glossary / aggregates / invariants), 모듈 지도 3장,
  cross-cutting flow 3장, reference 색인 3장.
- 후속 sprint 가 새 aggregate / flow / decision 을 만들면 해당 sprint 의 retro
  에서 wiki 갱신을 evidence 로 기록.
