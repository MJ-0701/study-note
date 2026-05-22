# CLAUDE.md — Claude Code adapter for Solon Product SFS

This project uses Solon Product SFS (multi-adaptor by design — Claude Code / Codex / Gemini CLI 동등 1급).

Solon owns the `/sfs` workflow in this project. Do not render bkit-style
`Feature Usage`, `Used`, `Not Used`, or `Recommended` footers after Solon
commands. If runtime usage facts are useful, fold them into the existing Solon
Session Status Report shape as evidence/health/next information. `/sfs` output
must remain Solon-first and bash-adapter anchored.

Before planning or editing, read:

- `SFS.md`
- `.sfs-local/VERSION`
- `.sfs-local/divisions.yaml`
- recent files under `.sfs-local/sprints/`
- recent files under `.sfs-local/decisions/`

## SFS commands — bash adapter SSoT (sfs 0.6.100)

Solon Product SFS 슬래시 명령은 모두 `sfs <command>` global runtime 이
deterministic bash adapter 로 내려보낸다. `.sfs-local/scripts/` 는 vendored
layout 의 fallback 이고, 기본 방향은 project-local state + packaged runtime
이다. Claude Code 의 native slash 진입점은 `.claude/commands/sfs.md` 가 자동
install 되며, 동일한 dispatch table 을 따른다 (paraphrase 금지, 결정성 유지):

| 슬래시 | 실행 |
|:--|:--|
| `/sfs status [--color=auto/always/never]` | `sfs status ...` |
| `/sfs start <goal> [--id <sprint-id>] [--force]` | `sfs start ...` |
| `/sfs guide [--path|--print]` | `sfs guide ...` |
| `/sfs auth status\|check\|login\|probe [--executor <tool>]` | `sfs auth ...` |
| `/sfs profile` | `sfs profile`; Claude 는 `SFS.md` project overview section 만 편집 |
| `/sfs division [...]` | `sfs division ...`; division 활성/비활성 |
| `/sfs adopt [...]` | `sfs adopt ...`; legacy/surface adopt 워크플로우 |
| `/sfs brainstorm [text\|--stdin]` | hybrid — raw capture 후 Claude 가 Solon CEO 로 §1~§7 정리 |
| `/sfs plan` | hybrid — `brainstorm.md` 기반 G1 plan + CTO/CPO contract |
| `/sfs implement` | hybrid — Gate 3 review PASS 후에만 진입. worker/generator 가 fixed slice 구현. Gate 3 미통과면 `sfs review --gate 3` 먼저 |
| `/sfs review --gate <id> [--stage self\|cross] [--executor <tool>] [--prompt-only]` / `/sfs review --show-last` | adapter-run — Gate 6 는 `--stage self` → `--stage cross` 순. Gate 3 self-review 가 PASS 될 때까지 cross 진입 X. round count = PASS 아님 |
| `/sfs decision <title> [--id <id>]` | hybrid — ADR 본문 작성 |
| `/sfs capture --kind <kind> --gate <id> "..."` | bash-only — evidence 기록 (user-approval 등) |
| `/sfs note`, `/sfs report`, `/sfs tidy` | bash-only — 보조 기록/정리 명령 |
| `/sfs commit plan` / `/sfs commit apply --group <name> [--no-push]` | bash-only — Solon commit grouping. `apply` 는 current branch push 기본; `--no-push` 는 local sandbox/release 테스트 한정 |
| `/sfs retro [--close]` | hybrid — `--close` 는 `retro.md` 채운 뒤 close adapter 1회 |
| `/sfs loop [OPTIONS]` | bash-only — Ralph Loop + Solon mutex |
| `/sfs bootstrap [<idea>]` | bash-only — agent-facing initial setup handoff |
| `/sfs measure --alive -- <command>` | bash-only — long-running command heartbeat |
| `/sfs`, `/sfs help` | usage 출력 (`.claude/commands/sfs.md` self-help) |

`sfs` runtime 이 PATH 에 없으면 1줄로 알리고 install/upgrade 안내. stdout /
stderr / exit code 는 verbatim 보고 (paraphrase 금지). Empty output 은 visible
SFS command 의 success 가 아니다 — `start`, `brainstorm`, `plan`, `implement`,
`review`, `retro`, `adopt`, `profile`, `upgrade`, `agent install` 은 stdout 출력
또는 산출물 변경 필수.

부족한 정보가 있으면 1~3개 질문만 남기고, 다음 gate 자동 실행 X.
1개 인자 누락 시 multi-choice prompt 대신 plain-language 질문 1개로 받는다.

## SFS 0.6.100 추가 정책

- **Gate 3 self-review PASS 필수**: cross-review / `sfs implement` 진입 전 self
  review 가 PASS 될 때까지 같은 gate self review 반복. round count 는 PASS
  아님. 결정적/저위험 finding (grep scope, 정정 가능한 wording) 은 직접 patch
  후 same-gate review 재실행.
- **Gate 6 review 순서**: `sfs review --gate 6 --stage self` → `--stage cross`
  → GitHub `@codex` (외부 evidence, post-implementation only). brainstorm /
  Gate 3 단계에서는 `@codex` 호출 X.
- **Model routing** (default, 사용자 설정 불필요):
  - Codex worker: `gpt-5.4`. Helper I/O: `gpt-5.4-mini`. Bounded repo-aware
    coding helper: `gpt-5.3-codex`. Locked judgment-free mechanical: `gpt-5.3-codex-spark`.
  - Claude worker/helper coding: Sonnet 4.6. Haiku = non-coding helper only.
  - Gemini: `gemini-3-pro-auto` 모든 역할.
  - Advisor (top-model) review 필요: 사용자 답변 해석 / 제품 정체성 / 아키텍처 /
    gate / AC / files_scope 영향 시 → Claude Opus 4.7, Codex `gpt-5.5` xhigh,
    Gemini `gemini-3-pro-auto`.
- **Self-CPO mini-check**: external cross review 전, requirements → AC →
  implementation slices → ADR id 매핑 + 모든 AC 가 file/artifact/evidence 매핑 +
  SEED/placeholder/mock/fallback 은 non-acceptance.
- **Commit policy**: commit message default = user 의 native/workspace 언어.
  English 는 user/repo 언어가 영어일 때만. `sfs commit apply` 는 current branch
  push 가 default; `--no-push` 는 local sandbox/release 테스트 한정. host-local
  `/commit` skill 은 SFS workflow 가 아니므로 SFS 작업 안내에 쓰지 않는다.
- **Session Continuation Guard**: `sfs upgrade` 가 runtime/project context 는
  갱신해도 이미 열린 LLM 대화의 토큰은 줄이지 못한다. host token meter 가
  새 WU/sprint action 전 30%+, 새 gate/loop/review handoff 전 50%+, 또는 같은
  대화가 여러 WU/sprint/loop wake 를 거쳤다면 fresh session 으로 handoff.
- **Multi-agent implement**: 옵션이며 default 아님. 사용자가 명시적으로 parallel
  agents 선택 시에만 + 각 lane 의 files_scope 분리 + native-language commit
  message + post-implement cross review 기록 → Gate 6.
- **Gate 표기**: Solon report 에서 `Gate N (Name)` 형식. Gate 1 (Intake) ~
  Gate 7 (Retro). naked id 사용 X.
- **Decision question 형식**: Q1/D1/option id 전에 plain language 로 무엇을
  결정하는지, 왜 중요한지, 권장 default, 각 옵션 영향을 설명. label 은
  cross-reference 일 뿐 explanation 아님. recommendation-only 표 / compact 옵션
  bundle (예: `A/A/A/C/C`) 금지.
- **`.sfs-local/`** = private workbench. 공유 handoff 는 `docs/solon/<domain>/
  <subdomain>/<feature>/<yyyyMMdd>/` 우선, domainless 는 `docs/solon/<english-workspace>/<yyyyMMdd>/`
  fallback. 팀이 opt-in 하지 않는 한 `.sfs-local` commit 요구 X.
- **Taxonomy**: 제품 함수. org division / copy polish 아님. user 의 native
  /workspace 언어 + project 용어 일치. SFS 명령/도메인 용어를 기계 번역 금지.
  `Other` / `Type something` 같은 placeholder 라벨 노출 X.

## `/sfs loop` — multi-adaptor LLM executor convention

`/sfs loop` 는 자율 진행 (Ralph Loop 패턴) 의 LLM 호출 site 다. Claude Code 환경에서 호출하든
다른 CLI 에서 호출하든 동일한 `--executor` flag (또는 `SFS_EXECUTOR` env) 로 LLM CLI 를 명시:

- `--executor claude` → `claude -p --dangerously-skip-permissions`
- `--executor gemini` → `gemini --skip-trust --yolo --output-format text -p "Read stdin and execute the requested task."`
- `--executor codex` → `codex exec --full-auto --ephemeral --output-last-message <result> -`
- `--executor "<custom command>"` → 그대로 passthrough

이 convention 은 Solon-wide invariant 다 — `loop` 만 multi-adaptor 가 아니라, Solon 의 모든
슬래시 명령이 어느 1급 CLI 에서든 동등한 deterministic bash adapter SSoT 로 동작한다. 본
CLAUDE.md (Claude Code adapter) 와 짝이 되는 AGENTS.md (Codex) / GEMINI.md (Gemini CLI) 도
동일 규약을 따른다.

## 인프라 현황 (운영)

- **Storage = Cloudflare R2** (S3-compatible API). 코드 베이스의 `S3StorageService`,
  `S3_*` 환경변수, `STORAGE_PROVIDER=s3` 는 모두 **R2 endpoint** 를 가리키는 legacy
  명칭이다. 실제 ACA env: `S3_ENDPOINT=https://...r2.cloudflarestorage.com`,
  `S3_REGION=auto`, `S3_BUCKET=study-note-prod`. AWS S3 를 사용하지 않는다.
- DB = Azure MySQL Flex (user / session). 새 영속화 시 우선 R2 object storage 검토,
  관계형이 필요한 경우만 MySQL 신규 테이블.
- 호스팅: Azure SWA (frontend) + Azure Container Apps (backend, min-replicas=0
  → cold start 가능, sprint-15 의 keep-alive workflow 가 완화).
- 도메인: Porkbun `910701.xyz` (운영 = `study-note.910701.xyz`).
- 신규 storage 작업은 새 R2 provider 도입 불필요. 기존 `StoragePort` /
  `S3StorageService` 의 `putObject`/`getObject` 재사용 + key prefix 분리
  (예: `materials/`, `notes/`, `annotations/`).

## 운영 규율

- 사용자 작업 보존 (Preserve user work). 결정으로 인해 동작이 바뀌거나 작업이 삭제될 수
  있을 때만 묻는다.
- `git push origin *` 자동 실행 금지 — push 는 사용자 터미널에서만 (Solon §1.5).
- Bash adapter 출력 paraphrase 금지 — 결정성 유지.
