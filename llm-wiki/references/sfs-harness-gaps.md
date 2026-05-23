---
id: study-note-ref-sfs-harness-gaps
title: SFS Harness Gaps — User-Observed Failure Modes
language: ko
visibility: raw-internal
load_when:
  - SFS harness
  - 구현 gate
  - self-CPO
  - cross review
  - user escalation
  - cross-layer DDD
  - TDD
  - parallel sub-agent
summary: 2026-05-23 사용자 지적 기반 SFS 하네스 결함 목록. 계층과 무관하게 DDD/TDD/QA/QC 계약이 구현 단계에서 증발하는 문제를 고치기 위한 by-reference issue register.
---

# SFS Harness Gaps — User-Observed Failure Modes

본 문서는 2026-05-23 study-note audit 중 사용자가 직접 지적한 SFS 제품/하네스
결함을 잃어버리지 않기 위한 issue register 다. 원문 SoT 는 대화 + repo-local
SFS 산출물이며, 본 페이지는 향후 solon-product 수정 때 참조할 요약이다.

## 핵심 판정

현재 문제는 "계획/리뷰를 더 많이 돌리면 해결" 이 아니라, **구현자가 Gate 3
계약을 지키도록 강제하는 구현 Gate harness 가 약한 것**이다. Gate 3 self-CPO /
cross review / GitHub `@codex review` 를 빡세게 돌려도, 구현 단계가 AC/ADR 을
실행 체크리스트로 삼지 않으면 계획은 계약서로만 남는다.

## 사용자 지적 사항

| ID | 사용자 지적 | SFS 가 보장해야 하는 것 |
|---|---|---|
| U1 | "내가 아무리 계획을 빡빡하게 짜고 리뷰를 빡빡하게 돌리면 뭐해 구현단계에서 그게 안지켜지는데" | Gate 6 이 diff 를 AC/ADR 별로 대조하고, 미구현 AC / 미작성 spec / 미검증 evidence 를 자동 fail 해야 한다. |
| U2 | "구현리뷰도 빡세게 크로스리뷰랑 gh 코덱스까지 돌리는데도 구멍이 생긴건 설계 문제" | 리뷰 횟수가 아니라 리뷰 입력/출력 구조가 문제다. cross/GitHub review 는 PASS 대체가 아니라 evidence 이며, SFS 가 최종 PASS 조건을 구조적으로 판정해야 한다. |
| U3 | "사용자 호출은 최소로 진짜 필요한 결정만" | User-escalation premise guard 가 구현 단계에도 적용되어야 한다. 실행 가능한 shell/tool 작업은 agent 가 직접 실행하고 evidence 로 남긴다. |
| U4 | "스스로 작업을 돌릴 수 있는것도 계속 나한테 맡김" | Executable Action Ownership: auth/runtime/approval 이 있으면 agent 가 실행한다. copy-paste 명령 전달은 true blocker 일 때만 허용한다. |
| U5 | "막힐때만도 진짜 막힌건지, 내가 명시적으로 막은건지 판단해야 함. 내가 알아서 하라고 하면 세션동안 진행" | blocker taxonomy + session-scoped authorization 이 필요하다. 단 scope 변경, destructive/data-loss/public contract 변경, 권한 없음은 다시 gate 해야 한다. |
| U6 | "SFS 최신 패치 핵심은 sub agent 병렬처리인데 자꾸 예전 invariant 얘기만 함" | 최신 version / project adapter / active session policy 가 일치해야 한다. parallel sub-agent lane contract 를 implementation default candidate 로 노출해야 한다. |
| U7 | "BE는 DDD인데 FE는 안돼있다는게 말이 됨?" | 이 사례는 FE 에서 드러났지만, 본질은 계층 무관한 DDD/TDD 계약 미강제다. BE/API/DB/infra/FE 어느 곳이든 설계 boundary, test-first/spec-first, QA/QC evidence 가 빠지면 fail 이어야 한다. |
| U8 | "설계를 사용자가 꼼꼼하게 같이하고 brainstorm + plan 리뷰까지 진행하는 이유" | 설계 단계의 사용자 판단은 구현 단계 질문을 줄이기 위한 것이다. 구현자가 plan 에 이미 답이 있는 질문을 user 에게 재호출하면 harness failure 다. |

## study-note 현장 증거

2026-05-23 audit 중 확인한 예시는 아래와 같다. 이 목록은 SFS 제품 수정용
재현 증거이며, 개별 구현의 최종 판정은 별도 Gate 6 에서 한다.

| Evidence | 관찰 |
|---|---|
| `sfs --version` | global runtime 은 `sfs 0.6.111`. |
| `.sfs-local/VERSION` | project-local 은 `0.6.110`. active project context 가 최신 runtime 과 drift 가능. |
| `CLAUDE.md` | SFS section 이 `sfs 0.6.102` 표기를 유지. `SFS.md` 에는 최신 Executable Action Ownership 문구가 있으나 adapter 표면 간 drift 존재. |
| `sfs status` | `sed: RE error: illegal byte sequence` 를 출력하면서 상태를 냄. SFS 산출물/locale/binary hygiene 문제 후보. |
| `.sfs-local/sprints/2026-W21-sprint-1/plan.md` | NUL byte 포함으로 `rg` 가 binary file 취급. review/search/capsule 생성 안정성 저하. |
| `sfs review --show-last` | 현재 dirty implementation 이 아니라 Gate 3 (Plan) PASS 만 보여줌. 구현 WIP 에 대한 Gate 6 PASS 증거 없음. |
| `apps/api/src/subjects/subjects.controller.ts` | plan AC32 의 `PUT /v1/subjects/:id/move` endpoint 미구현. 현 controller 는 rename-only `PUT /v1/subjects/:id`. |
| `apps/api/src/subjects/__tests__/subjects-move.spec.ts` | plan AC34 에 요구됐지만 파일 없음. terms/subjects controller spec 은 존재하나 direct 실행 주석의 명령은 CJS/ESM 경계 때문에 실패했고, 공식 `pnpm test:backend` dist runner 는 통과. |
| `apps/web/src/main.ts` | 관측 사례: 10k+ lines. auth 일부는 분리됐지만 route/state/PDF/session/user-note/application policy 가 여전히 큰 entrypoint 에 집중. 이것은 FE 전용 문제가 아니라 broad entrypoint 에 정책이 누적되는 cross-layer smell 의 FE 사례다. |
| `apps/web/src/styles.css` | 관측 사례: `@media (max-width: 820px)` 가 768px iPad 를 mobile/tablet-compact 영역으로 보냄. 실제 evidence 에서 `tablet-768` 이 top sidebar layout. CSS/UX QA 도 AC evidence 에 묶여야 한다. |
| `docs/solon/handoff/20260523-auth-boot-main-ddd-handoff.md` | auth boot UX fix + auth boundary 분리는 사용자 지적 후 사후 보정. harness 가 최초 구현 전에 잡았다는 증거는 아님. |

## 2026-05-23 Audit Evidence Ledger

이 섹션은 위 H10 형식에 맞춘 실제 조사 evidence 다. 현재 판정은
`local PASS` / `local FAIL` / `missing` 범위까지만 주장한다. Gate 6
`project-applied PASS` 는 아직 없다.

| Item | Problem / Root cause | Evidence | Result |
|---|---|---|---|
| Gate 6 evidence | Gate 3 계획 PASS 후 구현 WIP 를 AC/ADR 로 닫는 implementation ledger 가 없음. | `sfs review --show-last` 가 `.sfs-local/tmp/review-runs/2026-W21-sprint-1-gate3-20260523T132053Z-39585/result.md` 만 표시. `.sfs-local/sprints/2026-W21-sprint-1/` 에 `brainstorm.md`, `plan.md`, `review.md`, `log.md` 만 존재. | `missing`: current dirty implementation 에 대한 Gate 6 self-CPO/cross PASS 없음. |
| Version/context drift | 최신 SFS runtime, project-local context, adapter 문서가 불일치. | `sfs --version` = `sfs 0.6.111`; `.sfs-local/VERSION` = `0.6.110`; `CLAUDE.md` SFS section = `sfs 0.6.102`. | `local FAIL`: 새 gate 진입 전 upgrade/drift guard 필요. |
| Payload hygiene | review/search 대상 plan 이 binary 로 취급됨. | `sfs status` 출력 중 `sed: RE error: illegal byte sequence`; `rg` 가 `.sfs-local/sprints/2026-W21-sprint-1/plan.md` 를 NUL byte 포함 binary 로 감지. | `local FAIL`: prompt packaging/status/search 안정성 저하. |
| Backend official runner | API spec 은 공식 하네스에서 실행 가능. | `pnpm test:backend` 실행. build 후 `apps/api/dist/**/__tests__/*.spec.js` 7 files. | `local PASS`: 93 tests pass, 0 fail. |
| API src spec direct command | spec 파일 주석의 direct `node --experimental-strip-types --test apps/api/src/...` 명령은 현재 package boundary 와 충돌. | `apps/api/src/terms/__tests__/terms.controller.spec.ts`, `apps/api/src/subjects/__tests__/subjects.controller.spec.ts` 직접 실행. | `local FAIL`: `SyntaxError: Cannot use import statement outside a module`. 공식 runner 와 문서화된 direct runner 간 drift. |
| Web build | 웹 산출물 build 가능. | `pnpm --filter @study-note/web build`. | `local PASS`: `tsc --noEmit && vite build` 성공. |
| Focused web specs | auth boot, PDF material library, title XSS regression 은 로컬 통과. | `node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/auth-boot.spec.ts`; `pdf-material-library.spec.ts`; `title-xss.spec.ts`. | `local PASS`: 7/7, 11/11, 7/7 pass. |
| S7 Subject move | plan AC32-AC34 의 Subject move API/UI/spec 가 구현되지 않음. | plan: `PUT /v1/subjects/:id/move { targetTermId }`; code: `apps/api/src/subjects/subjects.controller.ts` has rename-only `PUT /subjects/:id`; `rg targetTermId` finds only plan/review; `subjects-move.spec.ts` absent. | `missing`: AC32-AC34 incomplete. |
| S3 classDate migration | plan AC12-AC15 의 `PdfMaterial.classDate DateTime @db.Date` / calendar input / label fallback 정리가 미완. | `packages/persistence/prisma/schema.prisma` still `classDate String`; `apps/web/src/main.ts` still has `addSubjectClassDate(formData)` and text input. | `missing`: AC12-AC15 incomplete. |
| S4/S5/S6 later slices | iPad pen real-time paint, ESC reset, starMark widget/spec 가 미완. | `rg getCoalescedEvents` no hit; `esc-tool-reset.spec.ts`, `star-mark.spec.ts`, `star-mark-payload.spec.ts` absent. | `missing`: AC16-AC31 incomplete. |
| iPad media root cause candidate | 768px iPad 가 compact/mobile breakpoint 로 들어감. | `apps/web/src/styles.css` has `@media (max-width: 820px)`; `.sfs-local/sprints/2026-W21-sprint-3/evidence/result.json` contains `tablet-768`; evidence README says compact nav at 768. | `local evidence`: root cause candidate confirmed; product acceptance needs viewport-specific AC. |
| Cross-layer DDD/TDD | FE 사례로 보였지만 본질은 broad entrypoint / boundary / evidence 강제 실패. | `apps/web/src/main.ts` = 10,456 lines. auth module 일부 분리됐으나 route/state/PDF/session/product policy remains. | `local FAIL`: FE-only patch 가 아니라 all-layer broad-entrypoint guard 필요. |
| Datadog RUM/APM | 1차 integration 은 존재하나 운영 dashboard/alerts/correlation 은 backlog. | `apps/web/src/observability/datadogRum.ts`; `trackRumAction` usage; `docs/solon/handoff/20260523-datadog-ops-monitoring.md` status = "1차 완료 / 2차 sprint 백로그". | `local evidence`: RUM/APM code/docs present; full monitoring QA/QC not closed. |

## SFS 제품 수정 요구

### H1. Implementation Acceptance Ledger

Gate 6 는 단순 diff review 가 아니라 `plan.md` 의 AC/ADR 을 ledger 로 변환해야
한다.

- 각 AC: `status = implemented | waived | deferred | missing`.
- `implemented` 는 최소 `files`, `tests`, `commands`, `evidence` 를 요구.
- `spec` 라고 적힌 AC 는 테스트 파일 또는 명시 waiver 없으면 fail.
- `deferred` 는 사용자가 승인한 scope 변경 evidence 없으면 fail.
- Gate 6 report 는 "전체 PASS" 전에 AC 별 missing 을 표로 보여야 한다.

### H2. TDD/Spec-First Guard

SFS 구현 진입 시 `spec required` AC 를 선별하고, 구현 후 다음을 자동 점검한다.

- plan 이 명시한 test path 존재 여부.
- negative case 가 plan 의 case 수와 맞는지.
- 테스트가 실행됐는지.
- 테스트 실패/미실행이면 bounded micro-rework loop 로 patch + verify + re-review.

### H3. Cross-Layer DDD/TDD Guard

DDD/TDD guard 는 FE 전용이 아니다. 관측 사례가 FE 였을 뿐, BE/API/DB/infra/CLI/
worker 어디서든 같은 원칙을 적용한다. 다음은 review finding 으로 승격한다.

- broad entrypoint 에 product policy / API DTO / session transition /
  persistence orchestration / rendering template / migration policy 가 계속 누적.
  예: FE `main.ts`, BE `app.module.ts`/fat controller/service, DB migration script,
  worker root file, CLI root command.
- 새 기능이 domain/application/adapter boundary 없이 "현재 큰 파일" 에 구현됨.
- plan 이 TDD/spec-first 를 요구했는데 test path, negative case, fixture,
  migration dry-run, browser/Playwright/contract smoke 중 필요한 검증이 없음.
- user-facing flow, data-loss/security/public contract, responsive/device behavior
  변경인데 QA/QC evidence 가 없음.
- reviewer 가 "이번에는 FE 라서 예외" 또는 "BE 만 DDD 대상" 같은 계층 예외를
  허용함.

권장 gate: broad entrypoint 를 touched 하면 reviewer prompt 가 자동으로
"왜 여기인가, 어느 boundary 로 뺄 것인가, test/evidence/QA 는 무엇인가" 를 요구.

### H4. Executable Action Ownership Guard

사용자에게 명령을 던지기 전에 agent 가 아래 premise check 를 실행해야 한다.

1. 내가 현재 shell/tool/auth 로 실행 가능한가?
2. sandbox/permission 문제가 있으면 approval request 를 직접 띄울 수 있는가?
3. destructive/data-loss/public contract/cost/security scope 인가?
4. user 가 이 세션에서 `알아서 해`, `배포해`, `진행` 같은 session-scoped
   authorization 을 줬는가?

true blocker 가 아니면 agent 가 실행하고 evidence 를 기록한다. shell state 는
agent 책임이다: one-shot inline env, secret masking, terminal export 요청 금지.

### H5. User-Escalation Premise Guard

review finding 을 사용자 질문으로 올리기 전, agent 는 다음을 확인해야 한다.

- brainstorm / plan / ADR 에 이미 답이 있는가?
- domain SoT / schema / code 가 finding premise 를 반박하는가?
- stale review frame 을 그대로 전달하는가?
- 제품 판단이 아니라 artifact rework 로 해결 가능한가?

잘못된 premise 는 user escalation 이 아니라 patch/review loop 로 처리한다.

### H6. Review Payload Hygiene

SFS 산출물은 도구가 안정적으로 검색/요약할 수 있어야 한다.

- `plan.md`, `review.md`, `log.md` 에 NUL/control byte 금지.
- `sfs status`, `sfs review`, prompt packager 는 binary/locale 오류를 fail로
  승격하거나 repair 안내를 내야 한다.
- capsule truncation 때문에 AC/S7 같은 중요한 contract 가 빠지면 PASS 금지.
  AC/ADR checksum 또는 mandatory appendix 로 보강한다.

### H7. Adapter/Version Drift Guard

프로젝트가 `SFS.md`, `CLAUDE.md`, `AGENTS.md`, `.sfs-local/VERSION`, global
runtime 사이 drift 를 가지면 새 gate 진입 전 warning 이 아니라 actionable
blocker 로 취급한다.

- project-local version < global version 이면 `sfs upgrade` 또는 explicit
  waiver 필요.
- open session 은 upgrade 후에도 자동으로 새 토큰을 갖지 않으므로 fresh
  handoff 필요 여부를 출력.
- adapter 별 문구가 서로 다른 정책을 갖고 있으면 user-facing 행동은 최신
  `SFS.md` / global context 를 우선하고 drift fix 를 backlog 로 남긴다.

### H8. Parallel Sub-Agent Lane Contract

SFS 0.6.106+ 의 핵심은 parallel sub-agent 실행 가능성이다. 구현 stage 는
다음을 lane 별로 요구해야 한다.

- lane goal, files_scope, forbidden files, dependency lane.
- AC/ADR subset.
- expected tests/evidence.
- lane output report path.
- merge conflict policy.

사용자가 병렬 작업을 기대한 sprint 에서 single-agent sequential 로 진행하려면
왜 충분한지 기록하거나, sub-agent lane 을 실제 실행해야 한다.

### H9. GitHub `@codex review` Positioning

GitHub `@codex review` 는 post-implementation external evidence 이며 SFS PASS 가
아니다. Gate 6 PASS 는 다음 순서가 필요하다.

1. self-CPO top-model PASS 기록.
2. SFS cross review PASS.
3. GitHub `@codex review` 는 외부 evidence 로 첨부.
4. finding 이 나오면 bounded micro-rework loop.

### H10. Wiki QA/QC Evidence Ledger

LLM Wiki 는 단순한 문제 목록이 아니라 **문제 → 수정 → 검증 → PASS 근거 →
실제 적용 QA/QC** 를 추적하는 장부여야 한다. SFS harness / project implementation
fix 는 아래 기록 없이는 close 하면 안 된다.

| 필드 | 필수 내용 |
|---|---|
| Problem | 어떤 문제가 있었는지. user report / review finding / incident id / 파일 경로. |
| Root cause | 왜 하네스가 못 잡았는지. plan 누락인지, implementation guard 누락인지, review payload 문제인지, adapter drift 인지. |
| Fix | 어떤 코드/문서/하네스 변경으로 고쳤는지. 파일 경로 + 요약. |
| Tests | 실제 실행한 명령. unit/contract/integration/smoke/browser/migration dry-run 등. |
| Result | 각 명령의 exit code / PASS count / 핵심 output. 실패 후 재시도면 실패도 기록. |
| QA/QC | 실제 프로젝트 적용 후 정상 동작 확인. UI면 screenshot/browser flow, BE면 endpoint/DB 상태, migration이면 dry-run/apply/rollback evidence. |
| PASS basis | self-CPO, SFS cross, GitHub external evidence 중 무엇으로 PASS 했는지. GitHub review 단독 PASS 금지. |
| Residual risk | 못 돌린 테스트, manual-only 영역, production apply 전 남은 approval. |

PASS label 은 범위를 명시한다.

- `local PASS`: 로컬 테스트/스모크 통과.
- `project-applied PASS`: 실제 프로젝트에 적용 후 QA/QC 정상.
- `prod-applied PASS`: 운영/배포/DB apply 까지 정상. destructive/data-loss/public
  contract 변경은 user approval evidence 필요.

`project-applied PASS` 이상을 주장하려면 "실제 프로젝트에서 정상 동작" evidence
가 있어야 한다. 테스트만 돌렸으면 `local PASS` 로만 기록한다.

## Solon Product Fix Evidence — SFS 0.6.112

본 study-note 현장 조사에서 나온 하네스 결함은 Solon/SFS 제품 쪽 0.6.112
릴리스로 먼저 조였다. 이 섹션은 "문제 등록" 에서 끝나지 않고 실제 제품
수정/배포/검증 evidence 를 남기기 위한 QA/QC ledger 다.

| Field | Evidence |
|---|---|
| Problem | Gate 3 brainstorm/plan 리뷰가 촘촘해도 Gate 6 구현자가 AC/ADR/TDD/DDD/QA evidence 를 누락하거나, 사용자가 이미 정한 결정을 다시 물어보거나, 실행 가능한 작업을 사용자에게 넘기는 문제가 관찰됐다. |
| Root cause | Gate 6 PASS 조건이 AC/ADR/decision ledger, cross-layer broad-entrypoint policy, wiki QA/QC evidence, parallel sub-agent lane contract 를 구조적으로 요구하지 않았다. 리뷰 횟수는 있었지만 acceptance 입력/출력 구조가 약했다. |
| Product fix | SFS 0.6.112: Implementation Acceptance Ledger, cross-layer DDD/TDD broad-entrypoint guard, llm-wiki QA/QC ledger, full parallel sub-agent lane contract, user-call minimalism, Executable Action Ownership continuity 를 runtime/template/review prompt/test harness 에 반영. |
| Local tests | Solon source: `bash tests/run-all.sh` PASS 92 / FAIL 0; targeted `test-ddd-tdd-guardrails.sh`, `test-review-implementation-sequence.sh`, `test-sfs-implement-agent-modes.sh`, `test-product-md-frontmatter-line-budget.sh`, `test-upgrade-freshness-summary.sh` PASS; `git diff --check` PASS. |
| PASS basis | Codex gpt-5.5 xhigh self-CPO PASS after bounded micro-rework loop; self-CPO partial findings were patched and reverified without user escalation. |
| Deployment | Solon source release handoff `097cbaa`; post-release wiki/PROGRESS evidence is recorded in subsequent Solon main docs commits; stable product commit/tag `2186454` / `v0.6.112`; Homebrew tap `1efe9e9`; Scoop bucket `4133465`; installed runtime `sfs 0.6.112`. |
| Release QA/QC | `sfs version --check` returned `latest 0.6.112` and `status up-to-date`; `bash scripts/verify-product-release.sh --version 0.6.112` PASS; product Actions `26337164036` SFS PR Check PASS and `26337164052` Windows Scoop Smoke PASS. |
| study-note applied status | `prod-applied PASS` applies to SFS runtime/product harness only. study-note application implementation remains audit-scoped: current ledger still records missing ACs and drift. Claiming `project-applied PASS` for study-note app requires a follow-up Gate 6 ledger plus actual app/API/browser QA evidence under SFS 0.6.112. |
| Residual risk | Existing open study-note implementation debt is not magically fixed by the SFS release; it is now easier to catch and close because the harness blocks ledger-less PASS and stale user escalation. |

## 적용 시 우선순위

1. H1 + H2 + H10: 구현 AC ledger / spec guard / QA-QC evidence 없이는 같은 문제가 반복된다.
2. H3: cross-layer DDD/TDD guard. `main.ts` 같은 관측 사례뿐 아니라 모든 broad entrypoint 를 stop condition 으로 만든다.
3. H4 + H5: user 호출 최소화와 실행 소유권.
4. H6 + H7: 산출물 hygiene / version drift. review 품질의 기반.
5. H8 + H9: parallel lane / GitHub review positioning 정렬.

## 관련 원문

- `.sfs-local/sprints/2026-W21-sprint-1/plan.md`
- `.sfs-local/sprints/2026-W21-sprint-1/review.md`
- `.sfs-local/sprints/2026-W21-sprint-1/log.md`
- `docs/solon/admin/dashboard/hierarchy-admin-ipad-ux/20260523/handoff.md`
- `docs/solon/handoff/20260523-auth-boot-main-ddd-handoff.md`
- `SFS.md`
- `CLAUDE.md`
- `.sfs-local/VERSION`
