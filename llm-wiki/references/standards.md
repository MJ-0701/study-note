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
  - README
  - 문서 최신화
  - scope creep
  - agent handoff
summary: 컨벤션 / 표준 문서 색인. **repo-local** 만. user-home (~/.claude/...) 파일은 by-reference 정책 위반이라 wiki SoT 로 인용하지 않는다.
---

# Standards / Conventions Index

본 wiki 는 by-reference 정책 (`llm-wiki/README.md` §원칙) 에 따라 **repo 안에
존재하는 파일만** SoT 로 인용한다. host-local 사용자 environment (`~/.claude/CLAUDE.md`,
`~/.claude/projects/<encoded>/memory/`, 그 외 사용자 개인 도구 설정 등) 는 wiki
context 로 끌어오지 않는다.

## Repo-local 표준 문서

| 파일 | 내용 |
|---|---|
| `CLAUDE.md` (project root) | Solon SFS bash adapter dispatch table, SFS 0.6.102 추가 정책, 인프라 현황 (R2 + Azure + Porkbun), `/sfs loop` multi-adaptor convention, 운영 규율 |
| `SFS.md` | 프로젝트의 SFS 진입점 — sprint 흐름의 SoT |
| `.sfs-local/VERSION` | 현재 SFS 버전 + upgrade history |
| `.sfs-local/divisions.yaml` | division (engineering / design 등) 활성 상태 |
| `.sfs-local/decisions/`, `docs/solon/decisions/` | ADR — [references/decisions](decisions.md) 참조 |
| `.sfs-local/sprints/`, `docs/solon/handoff/`, `docs/solon/work-slice/` | sprint history — [references/sprints](sprints.md) 참조 |
| `docs/solon/domain-map.md` | 도메인 용어 일부 — 현 study-note 용어는 [ddd/ubiquitous-language](../ddd/ubiquitous-language.md) 가 갱신본 |
| `llm-wiki/references/sfs-harness-gaps.md` | 사용자 지적 기반 SFS harness 결함 register — 구현 Gate, user escalation, cross-layer DDD/TDD, QA/QC evidence ledger, parallel sub-agent 관련 수정 요구 |

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

- commit message 는 사용자/저장소의 native 언어 (`CLAUDE.md` SFS 0.6.102 §Commit policy).
- self-review (diff + 7 영역) → codex `@codex review` 순. push 직후 codex 자동 트리거 금지.
- Agent 문서 변경 규율 (2026-05-27 회고): `README.md` / `ACTIVE.md` 같은 공용 문서는
  사용자가 명시적으로 rewrite 를 요구하지 않는 한 **최소 diff** 로만 갱신한다.
  기존 언어와 톤을 보존한다. 본 repo 는 KO-first 문서가 있으면 한국어를 기본으로
  유지하고, 영어 전면 rewrite 로 바꾸지 않는다.
- `README 최신화` 는 형식 재작성이나 랜딩 페이지화가 아니다. 새 코드/운영 기능이
  실제 구현됐으면 그 사실을 반영하는 짧은 섹션/링크/명령만 추가한다. 구현 없이
  문서만 대체 산출물로 만들지 않는다.
- 문서 self-review 필수 체크: scope creep, 기존 invariant/도메인 설명 삭제,
  언어 drift, Claude/Codex 병렬 작업 파일과의 충돌 가능성. 하나라도 보이면 먼저
  해당 파일을 원상 보존한 뒤 원래 작업 범위만 다시 적용한다.
- 관측/운영 대시보드 요구는 실제 endpoint/UI/query/권한/secret boundary 를 우선한다.
  Markdown 은 구현 결과의 색인과 운영 runbook 이며, 대시보드 기능의 대체물이 아니다.
- 구현 단계에서는 Gate 3 plan PASS 만으로 충분하지 않다. AC/ADR 별 implementation
  ledger + spec/evidence mapping 이 없으면 Gate 6 PASS 로 보지 않는다
  ([sfs-harness-gaps](sfs-harness-gaps.md)).
- PASS 는 범위를 명시한다. 테스트만 돌린 것은 `local PASS`, 실제 프로젝트 적용
  후 QA/QC 까지 확인한 것은 `project-applied PASS`, 운영/배포/DB apply 까지
  확인한 것은 `prod-applied PASS` 로 기록한다.
- `@codex review` 트리거 후 30~60초 후 inline + reaction 재확인.
- SFS push 정책: `sfs commit apply` 는 current branch push 가 default; `--no-push` 는 local sandbox 한정.
- host-local `/commit` skill 은 SFS workflow 가 아니므로 SFS 작업에 쓰지 않는다.

## 갱신 의무

- repo-local `CLAUDE.md` / `SFS.md` 가 바뀌면 본 wiki 갱신.
- 새 `docs/standards/*.md` 또는 ADR 추가 시 위 표 갱신.
- host-local 사용자 environment (`~/.claude/` 등) 는 wiki 가 인용하지 않는다.
  필요한 규칙은 repo-local 문서 (`CLAUDE.md`, `SFS.md`, `docs/standards/` 등) 로
  옮긴 뒤 인용한다.
