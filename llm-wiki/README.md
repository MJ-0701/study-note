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
- **Source truth = code + docs/solon + .sfs-local.** wiki 가 원문과 충돌하면
  원문이 이긴다. wiki 는 그 충돌을 빠르게 찾는 색인이지 자기 SSoT 가 아니다.
- **DDD lens.** 모든 페이지는 bounded context / aggregate / invariant /
  ubiquitous language 중 하나로 정렬되어야 한다. "그냥 잡문" 는 만들지 않는다.
- **Sprint 갱신 의무.** sprint 가 domain language, aggregate boundary,
  invariant, release flow 를 바꾸면 retro 또는 다음 sprint 진입 전에 관련 wiki
  page 를 갱신하거나 follow-up gap 으로 기록한다.

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
