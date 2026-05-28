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

## SFS commands — bash adapter SSoT (sfs 0.6.138)

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

## SFS 0.6.100~0.6.102 추가 정책

> 0.6.101 / 0.6.102 추가분은 §**Obsidian wiki 경계** 섹션 (아래 마지막) 에 모은다.

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

## SFS 0.6.114 → 0.6.117 추가 정책

- **Executable Action Ownership (ambient)**: auth + runtime + approval 갖춰지면
  runnable shell/tool step 은 직접 실행한다. user 에게 copy-paste 명령 넘기지
  않는다 (명시 요청 또는 true blocker 만 예외).
- **True blockers vs approval gates**: true blocker = missing auth /
  unavailable tooling/runtime / sandbox or permission denial / 미 capture 된
  destructive·data-loss·public-contract approval / 넓어진 scope. session-
  scoped authorization (`알아서 해`) = scope 바뀌거나 새 true blocker 전까지
  same-scope gated work 계속.
- **Shell state 는 user 문제 아님**: one-shot command + 명시 working dir + 
  inline env. secret mask. user 에게 export/터미널 전환/재실행 요구 X.
- **Monitor checkpoint classification 의무 (long-running watch)**: 매 checkpoint
  분류 = `progressing` / `slow` / `stalled` / `dead` / `auth_blocked`. 기록 =
  commit delta + PR/head delta + local dirty state + test/check delta +
  review status delta + worker liveness probe (request-response, 정적 benign
  payload) + lane-utilization evidence/waiver + next action `wait`/`probe`/
  `revive`/`close`. raw stdout/stderr/token/env/prompt body/model response/
  user content/PII 는 durable evidence 아님.
- **Handoff-only scope = stop contract**: user 가 handoff / 인계문서 만 요청
  하면 artifact 작성 + 현재 상태/blocker/first next command 기록 후 즉시
  stop. PR polling / review retrigger / merge / implement / deploy / monitor
  loop 시작/지속 X. 진행 중 batch 도 interrupt. 이미 진행된 PR/review/merge
  는 scope breach 로 보고.
- **User-facing docs HTML-first**: agent-facing docs/logs/SSoT = Markdown 유지.
  real-user 용 guide / report / handbook / onboarding / landing = HTML default.
- **Korean: 문장 끝 colon 금지**.
- **Korean-first project 의 새 source file**: 첫 줄 (shebang/directive 뒤) =
  한 줄 한국어 role 주석. config / generated / lock file 제외.
- **Token/harness hygiene (ambient)**: adapter 메모리 thin 유지, routed
  context + symbol/semantic search 가 broad read 우선. AI 반복 실수 = review/
  retro 단계의 guardrail/check 로 변환.
- **Runtime Token Firewall (ambient)**: worker/review/executor handoff =
  capsule-only. full conversation history 를 worker/plugin wrapper/rescue
  subagent/external reviewer 에 전달 X. goal + AC + files_scope + command +
  expected output path + compact evidence 만.
- **Context Pollution Guard (ambient)**: core product doc 과 routed context
  에는 durable conclusion 만. prompt body / 전체 transcript / bridge·run
  scratch / `.sfs-local/tmp/...` path / 옛 workbench bulk = 임시 파일 / cold
  archive / compact capture·report pointer 에 둠. 잔류 = release 전 review
  finding.
- **Approved sprint state ≠ override**: newer handoff 또는 user intent 가
  approved sprint state 를 override 한다. mismatch = mis-scoped work 분류 +
  re-plan 또는 handoff. user 에게 "이미 record 가 보여주는 사실 재진술" 요청 X.
- **Broad entrypoint = product policy 의 default home 아님**: UI bootstrap /
  router / hook/store/effect / controller / job / repository / DTO mapper /
  CLI flag / script / migration / docs wording / observability glue /
  external adapter 에 product rule 변경 시 named boundary 또는 waiver 필요.
  broad-entrypoint 성장 = Gate 6 finding (boundary extraction 또는 approved
  deferral 기록 없으면).
- **Gate 6 = implementation acceptance ledger 필수**: 모든 planned AC/ADR/
  decision = implemented / missing / deferred / waived. implemented row =
  file/evidence pointer. gap = approval 또는 follow-up owner.
- **Review autopilot rework loop**: deterministic / narrow finding 은 user
  judgment 안 필요. 직접 patch + 최소 verification + self-CPO/cross 재실행.
  "진행?" / "proceed?" 묻지 않는다. user escalation = scope / architecture /
  public API/schema/CLI contract / security/privacy/data-loss / cost/latency/
  model policy / destructive behavior / AC 의미 변경 / 동일 micro-fix 반복
  fail 시에만.
- **User-escalation premise guard**: self/cross finding → user question 전환
  전 premise 명명. brainstorm + plan + domain SoT + schema + code + decision
  대조. 잘못 / stale / answered / over-modeled premise = artifact rework +
  same-gate review (user 호출 X).
- **Findings label**: `Critical` (security/data-loss/release blocker) /
  `Required` (must-fix acceptance gap) / `Important` (지금 처리 risk) /
  `Optional` (non-blocking) / `FYI`. 모든 finding 을 동일 의무처럼 표기 X.

### Obsidian wiki 경계 (0.6.101 + 0.6.102)

- **Active 감지** (0.6.101): repo 에 `.obsidian/` 또는 `llm-wiki/` 가 있으면 SFS
  가 본 프로젝트를 Obsidian-active 로 본다. 본 repo 는 `llm-wiki/` 보유 →
  active. broad scan 전 `llm-wiki/README.md` + `llm-wiki/ddd/README.md` 를
  진입점으로 먼저 읽는다.
- **DDD root 경로 컨벤션** (0.6.101): wiki DDD 운영 모델 root = `llm-wiki/ddd/`.
  본 repo 는 sprint-3 wiki round-3 fix 에서 `llm-wiki/domain/` → `llm-wiki/ddd/`
  rename 적용. 누락된 page 가 있으면 gap/waiver 기록.
- **Taxonomy = lens** (0.6.101): taxonomy 는 독립 wiki / 조직 본부가 아니라
  domain language / classification lens. `llm-wiki/ddd/` 와 관련 TopicHub 에
  연결.
- **Host-local 경계** (0.6.102): host-local tool/skill bundle 과 user-home
  folder 는 외부 실행 environment 이지 project SSoT / wiki root / install target /
  migration source 가 아니다. 사용자가 명시 요청하지 않는 한 wiki 구축 중 설치/
  scaffold/승격 X. 참조가 필요하면 external environment evidence 로만 기록.
  이미 SFS 에 흡수된 개념은 host-local tool 대신 SFS command/policy surface 를
  쓴다.

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
- 호스팅 (frontend) = **Vercel**. `fe-v*` tag push → `.github/workflows/fe-release.yml`
  ("FE Release Pipeline (Vercel)") 가 **유일한 prod 배포 경로**. Vercel git
  auto-deploy 는 Ignored Build Step ("Don't build anything") + `vercel.json`
  `git.deploymentEnabled=false` 로 차단. 과거 "Azure SWA (frontend)" 표기는
  stale — decision 0004 의 SWA 계획에서 Vercel 로 이관됨 (2026-05-28 확인). FE
  배포 = `git tag fe-v0.1.NN <commit> && git push origin fe-v0.1.NN` (최신 tag
  = `git tag -l 'fe-v*' | sort -V | tail`).
- 호스팅 (backend) = Azure Container Apps. `be-v*` tag → be-release.yml.
  min-replicas=0 → cold start 가능, sprint-15 의 keep-alive workflow 가 완화.
  infra = `infra-v*` → infra-release.yml.
- 도메인: Porkbun `910701.xyz` (운영 = `study-note.910701.xyz`, FE custom domain
  = Vercel).
- 신규 storage 작업은 새 R2 provider 도입 불필요. 기존 `StoragePort` /
  `S3StorageService` 의 `putObject`/`getObject` 재사용 + key prefix 분리
  (예: `materials/`, `notes/`, `annotations/`).

## 운영 규율

- 사용자 작업 보존 (Preserve user work). 결정으로 인해 동작이 바뀌거나 작업이 삭제될 수
  있을 때만 묻는다.
- `git push origin *` 자동 실행 금지 — push 는 사용자 터미널에서만 (Solon §1.5).
- Bash adapter 출력 paraphrase 금지 — 결정성 유지.
