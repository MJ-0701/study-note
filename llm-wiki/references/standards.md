---
id: study-note-ref-standards
title: Standards / Conventions Index
language: ko
load_when:
  - 표준
  - convention
  - 컨벤션
  - CLAUDE.md
  - SFS.md
  - DTO 규칙
summary: 컨벤션 / 표준 문서 색인. **repo-local** 만. user-home (~/.claude/...) 파일은 by-reference 정책 위반이라 wiki SoT 로 인용하지 않는다.
---

# Standards / Conventions Index

본 wiki 는 by-reference 정책 (`llm-wiki/README.md` §원칙) 에 따라 **repo 안에
존재하는 파일만** SoT 로 인용한다. user-home 의 `~/.claude/CLAUDE.md`, `~/.claude/.../MEMORY.md`,
`~/.gstack/` 류는 사용자 개인 environment 라 wiki context 로 끌어오지 않는다.

## Repo-local 표준 문서

| 파일 | 내용 |
|---|---|
| `CLAUDE.md` (project root) | Solon SFS bash adapter dispatch table, SFS 0.6.100 추가 정책, 인프라 현황 (R2 + Azure + Porkbun), `/sfs loop` multi-adaptor convention, 운영 규율 |
| `SFS.md` | 프로젝트의 SFS 진입점 — sprint 흐름의 SoT |
| `.sfs-local/VERSION` | 현재 SFS 버전 + upgrade history |
| `.sfs-local/divisions.yaml` | division (engineering / design 등) 활성 상태 |
| `.sfs-local/decisions/`, `docs/solon/decisions/` | ADR — [references/decisions](decisions.md) 참조 |
| `.sfs-local/sprints/`, `docs/solon/handoff/`, `docs/solon/work-slice/` | sprint history — [references/sprints](sprints.md) 참조 |
| `docs/solon/domain-map.md` | 도메인 용어 일부 — 현 study-note 용어는 [domain/ubiquitous-language](../domain/ubiquitous-language.md) 가 갱신본 |

## SFS 슬래시 명령 (dispatch table — `CLAUDE.md` SSoT)

요약:

```
/sfs status            sfs status
/sfs start             sfs start
/sfs guide             sfs guide
/sfs auth              sfs auth
/sfs profile           sfs profile + Claude 가 SFS.md 편집
/sfs division          sfs division
/sfs adopt             sfs adopt
/sfs brainstorm        hybrid — raw capture + Solon CEO §1~§7 정리
/sfs plan              hybrid — brainstorm 기반 G1 plan + CTO/CPO contract
/sfs implement         hybrid — Gate 3 PASS 후 worker 구현
/sfs review --gate N --stage self|cross    adapter
/sfs decision          hybrid — ADR 본문
/sfs capture           bash — evidence (user-approval 등)
/sfs note, report, tidy   bash 보조
/sfs commit plan / apply  bash — commit grouping
/sfs retro --close     hybrid
/sfs loop              bash — Ralph Loop + mutex
/sfs bootstrap         bash
/sfs measure --alive   bash — long-running heartbeat
```

자세한 분기 / 옵션은 repo-local `CLAUDE.md` 의 SFS 섹션 원문.

## Repo-local 부재 표준 (gap)

다음 표준 문서가 repo 안에 **없다** — wiki 는 이 fact 만 기록하고, 필요 시 별도
sprint 에서 작성한다:

- `docs/standards/backend-rules.md` (아키텍처, 트랜잭션, 예외 처리, 테스트 기준)
- `docs/standards/api-rules.md` (URL / 응답 / 에러 / DTO 규약)
- `docs/standards/db-rules.md` (스키마 / 마이그레이션 / 인덱스)
- `docs/standards/security-rules.md` (인증/인가, PII, 보안 로깅)
- `docs/standards/observability-rules.md` (metric+log+trace, 알림)
- `docs/standards/git-rules.md` (브랜치 / commit 컨벤션)

이 gap 을 메우는 작업이 들어오면 본 wiki 의 위 표에 한 줄씩 추가하고 각 page 의
"갱신 의무" 도 wire 한다.

## Repo-local 회의 / 운영 메모

repo 안에 안착된 운영 규칙만 정리. 개인 environment 의 working memory 는 인용 X.

- commit message 는 사용자/저장소의 native 언어 (`CLAUDE.md` SFS 0.6.100 §Commit policy).
- self-review (diff + 7 영역) → codex `@codex review` 순. push 직후 codex 자동 트리거 금지.
- `@codex review` 트리거 후 30~60초 후 inline + reaction 재확인.
- SFS push 정책: `sfs commit apply` 는 current branch push 가 default; `--no-push` 는 local sandbox 한정.
- host-local `/commit` skill 은 SFS workflow 가 아니므로 SFS 작업에 쓰지 않는다.

## 갱신 의무

- repo-local `CLAUDE.md` / `SFS.md` 가 바뀌면 본 wiki 갱신.
- 새 `docs/standards/*.md` 또는 ADR 추가 시 위 표 갱신.
- user-home 파일 (`~/.claude/`, `~/.gstack/`) 은 wiki 가 인용하지 않는다. 필요한
  규칙은 repo-local 문서로 옮긴 뒤 인용한다.
