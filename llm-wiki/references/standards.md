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
summary: 컨벤션 / 표준 문서 색인. 본문은 CLAUDE.md / SFS.md / user-global CLAUDE.md 에.
---

# Standards / Conventions Index

## 프로젝트 표준 (project root)

| 파일 | 내용 |
|---|---|
| `CLAUDE.md` (project) | Solon SFS bash adapter dispatch table, SFS 0.6.100 추가 정책, 인프라 현황 (R2 + Azure + Porkbun), `/sfs loop` multi-adaptor convention, 운영 규율 |
| `SFS.md` | 프로젝트의 SFS 진입점 — sprint 흐름의 SoT |
| `.sfs-local/VERSION` | 현재 SFS 버전 (0.6.100) + upgrade history |
| `.sfs-local/divisions.yaml` | division (engineering / design 등) 활성 상태 |

## 사용자 글로벌 (user-level CLAUDE.md, 모든 프로젝트 공통)

`/Users/<user>/.claude/CLAUDE.md` — API conventions, DTO rules, migration naming, git conventions, code style, infrastructure (secret), standards 표.

핵심:
- API URL: `/v{n}/{dash-case-복수형}`
- 성공 응답: HTTP 200, 래핑 없이 데이터 직접 반환 (ApiResponse 래퍼 금지)
- ErrorResponse: `{ "errorCode": "...", "errorMessage": "..." }`
- DTO: `{Entity}{Client}Request/Response` (Web), `{Entity}Request/Response` (Service)
- Mapper 라이브러리 사용 금지, 빌더 패턴 사용 금지
- Migration: `V{yyyyMMddHHmmss}__{description}.sql`, Flyway 외부 관리
- Git: 브랜치 `{type}/{JIRA-KEY}` 또는 `{JIRA-KEY}`
- Solon/SFS: `sfs commit plan` → `sfs commit apply --group <name>` (host-local `/commit` 사용 X)
- Code style: Google Java Style + Lombok
- Secret: AWS Secrets Manager (dev/prod) / git-crypt (local)

## docs/standards/ (사용자 글로벌이 가리키는 표 — 본 프로젝트에는 부재)

사용자 CLAUDE.md 의 표는 `docs/standards/backend-rules.md` 등 5개 문서를 가리키지만, **본 프로젝트 (study-note) 에는 해당 디렉터리가 없다.** 본 프로젝트는 Spring 백엔드가 아닌 NestJS 백엔드 + Vite frontend 라 일부 표준은 부분 적용. 표준 문서가 필요해지면 별도 sprint 에서 작성.

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

자세한 분기 / 옵션은 `CLAUDE.md` SFS 섹션 원문.

## 코드 / 컨벤션 메모

- 한국어 commit message (memory `feedback_commit_language`).
- self-review (diff 읽기 + 7 영역) → codex `@codex review` (memory `feedback_review_flow`).
- codex bot review 30~60s 후 재확인 (memory `feedback_codex_bot_review_timing`).
- 메모리 (`~/.claude/projects/<encoded>/memory/`) 의 `MEMORY.md` 가 회화 간 SoT.

## 갱신 의무

- CLAUDE.md / SFS.md / 사용자 글로벌 CLAUDE.md 가 바뀌면 본 wiki 갱신 (요약 한 줄 + 핵심 변경 표시).
- 새 표준 문서 (예: `docs/standards/api-rules.md`) 추가 시 위 표 갱신.
