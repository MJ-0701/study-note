# S4a Gate 6 review state (main/Opus, 2026-05-31 12:30)

> worker(Sonnet) 산출 = branch `react-migration/s4a-subject-views` commit `7b541a9`
> (base = main `5474fe9`, codex-fix `dae76af` 와 별 branch). worktree =
> `.claude/worktrees/agent-a11f2de82b2414abe`.

## 범위 변경 (worker 발견, accept)

S4a = **4 views** (subject-summaries, subject-summary-detail, subject-mcp, subject-memorize).
**subject-class 연기** — worker 가 renderPdfMaterialCard/renderPdfLibraryUploadCard 가
excluded PDF-workspace scope(pointer/pen/sync)에 wired 됨을 발견 → island 화 시 INV-8
위반 또는 scope breach 불가피. **week 와 동일 사유로 S4b(또는 별 slice)로 격리.** 타당.

## 독립 검증 (self-report 불신 — S3/S3b 교훈)

- ✅ `pnpm --filter @study-note/web build` exit0 (tsc --noEmit + vite), worktree 에서 직접.
- ✅ 신규 spec 70 pass / 0 fail (직접 실행): SummariesView 14 · SummaryDetailView 18 ·
  McpView 13 · MemorizeView 15 · uiStore-s4a-loop-immunity 10.

## 구조 acceptance (PASS)

- ✅ **dispatch-half ↔ render-half 타입 강제**: main.ts 의 producer 가 `const x:
  SubjectXxxViewProps = {...}` 로 leaf export 인터페이스 타입 annotation + tsc pass →
  field 名/shape mismatch = compile error. **S3b "wrong descriptor" class 구조적 차단.**
- ✅ **seam 패턴 = S3/S3b 동일**: postMount `[data-react-island="subject-xxx"]` slot signal
  → setXxxSlot. route branch = props 계산 → setXxxProps + 나머지 3 island props null
  (cross-null, stale 차단) → mountRender(composeShell(..., renderXxxSlot(), ...)).
- ✅ **loop-immunity guard** = 4 setter 모두 value-equal JSON 비교 skip 보유.
- ✅ **legacy render fn 보존** (renderSubjectSummariesPage:60 등) = parity oracle 유지.
- ✅ **pure-props/INV-8/data-action**: spec 가 useState/useEffect/useStore/zustand/
  dangerouslySetInnerHTML/escapeHtml/onClick **부재** + data-action 존재 assert.

## value-parity (부분 — 1뷰 deep, 나머지 spec+tsc)

- ✅ **summaries deep source-diff (대표)**: leaf SubjectSummariesView.tsx ↔ legacy
  renderSubjectSummariesPage **구조 1:1 동일** (hero meta=examLabel·weekRange / metric-grid
  3 card / day-card grid / summary-grid 3 block). `examLabelShort`=examLabel = "시험 범위"
  metric sub 와 legacy 일치(이름만 오해소지, 값 정확).
- ⚠️ **나머지 3 (summary-detail/mcp/memorize)** = spec(구조/class regex) + tsc field 강제만.
  full leaf↔legacy source-diff 미수행. risk LOW(summaries 충실 port + tsc) 이나 0 아님.

## AC4 loop-gate A/B — ✅ 완료 + main/Opus 독립 재실행 검증 (2026-05-31)

worker(Sonnet) 산출 = `negativeControlSubject.tsx`(A mount-unstable / B click-armed
generate-subject-note) + vite define `__S4A_LOOP_NEG_CTRL_A__/B__` + router.tsx
SummariesPortal swap + `apps/web/scripts/playwright-s4a-subject-loop.mjs`(PORT 4322,
s3b 미러). 설계 = **GREEN×4 + A×1 + B×1** (advisor 합의: A/B = detector validation
view-agnostic, per-view GREEN = per-view loop 증명). neg-ctrl = summaries portal 에만
배선(generate-subject-note 버튼 보유 view).

**main/Opus 가 게이트 직접 재실행**(worker stdout 불신, S3b 교훈):
- GREEN×4 = island-scoped content 단언 PASS(`진법과 코드`/`디지털공학개론 MCP 호출`/
  `진법 변환`, vacuous 아님) + loopErrors 0 + summaries round-trip + node identity 안정.
- RED A = mount-time `#185`(got 1). RED B = GREEN@mount(0)→클릭 후 `#185`(got 1, §5-C).
- DIST delta 81 bytes(tree-shake 유효). exit 0. **blocker #1 CLOSED.**

## concept parity fix — ✅ 완료 (worker + main diff 검증)

producer(main.ts:4807/4941) `linkedQuestionCount` = `exampleQuestionIds.map(getQuestionById)
.filter(Boolean).length` (legacy renderConcept 동일 식). summary-detail leaf = 연결 문제
블록 신규(aside, 출처힌트 ul 뒤) / memorize leaf = `-`→`{count}개`. interface 2개 +
spec 2개 갱신(SummaryDetail 20/20, Memorize 17/17). main/Opus 가 diff 실독 — legacy 일치.
fix 후 loop-gate 재실행 PASS(회귀 없음).

## Gate 6 cross (codex) — ✅ 완료

executor=codex(`SFS_AUTH_PROBE_OK`), full-slice diff(5474fe9...HEAD, 2935줄) capsule review.
worktree 에 .sfs-local 부재 → sfs review 불가 → codex 직접 호출(executor=codex 동치,
Token Firewall capsule = goal+AC+files_scope+diff). **VERDICT: concerns** — 단일 finding:
- **Important** `playwright-s4a-subject-loop.mjs:155` — /materials mock = raw `[]` 인데
  `listPdfMaterials`(api/materials.ts:226) 가 `payload.materials` 반환 → undefined →
  restore `.filter()` TypeError(catch 됨) → 게이트가 caught error 경로 통과.
  **premise 검증 = 정확**(api/materials.ts:226 실독). islands 는 그래도 loop-free mount
  (GREEN 유효) 이나 session non-pristine → gate fidelity 보강 위해 fix.
  → mock = `{ materials: [] }` envelope 으로 수정 + 게이트 재실행 PASS. **finding 해소.**
- INV-8 / leaf loop-immunity / value-parity / seam wiring = codex "look sound" (추가 finding 0).

## Gate 6 구현 acceptance ledger (CLAUDE.md 의무)

| AC | 상태 | evidence |
|:--|:--|:--|
| AC1 pure-props leaf ×4 + data-action 보존 | implemented | 4 leaf spec(useState/useEffect/useStore/zustand/innerHTML 부재 assert) + data-action match |
| AC2 dispatch(seam)+render(leaf) 양반 정합 | implemented | producer 타입 annotation(main.ts) tsc pass + island cross-null(4748-4960) + main/Opus seam 실독 |
| AC3 INV-8 (no innerHTML, JSX escape) | implemented | leaf JSX only, escapeHtml 부재 spec + codex 확인 |
| AC4 loop-gate GREEN×4 + neg A/B | implemented | playwright-s4a-subject-loop.mjs exit0, main/Opus 3회 재실행(parity fix 후 + mock fix 후) PASS |
| AC5 value-parity vs legacy oracle | implemented | summaries deep-diff + mcp/memorize/summary-detail line-by-line(연결문제 fix) ; mcp persona-null = FYI latent(unreachable) |
| 범위: subject-class | deferred → S4b | PDF material card = excluded PDF scope(pointer/pen/sync) |
| 범위: week | deferred → S4b | update-week-user-notes PUT sync 보유 |

## 최종 판정

**Gate 6 = PASS** (self-CPO 구조 + value-parity + AC4 loop-gate independently verified +
codex cross concerns→single Important fixed). **deploy-eligible = YES (코드 기준)**.
branch `react-migration/s4a-subject-views` @ `dd8dea7` (= implement 7b541a9 + 후속
dd8dea7), base main `5474fe9`, local commit only(push 미실행).
**deploy = 사용자 명시 승인 대기**(standing grant 없음). 승인 시 release:
push → PR → 머지 → fe-v* tag → prod verify (별 batch). ⚠️ codex-fix branch
`fix/react-island-codex-polish` 와 uiStore merge 주의(둘 다 미머지).

## value-parity 나머지 3뷰 — 완료 (main/Opus 2026-05-31, leaf↔legacy line-by-line)

leaf `.tsx` ↔ legacy oracle (`renderSubjectMcpPage`/`renderSubjectMemorizePage`/
`renderWeekSummaryPage`) field-by-field 실독. shared helper = `subject-cards.ts`
(`renderConcept`/`renderKeyword`/`renderQuestion`/`renderSummaryBlock`) 도 실독.

- ✅ **mcp** = 구조 1:1 일치. hero/panel/summary-grid/question-list 동일.
  - `sanitizeExternalUrl("/persona-turn.html?...")` = `/` 시작 → unchanged 반환
    (safe-url.ts:19) → active persona link **보존**, parity break 아님.
  - **FYI(latent)**: hero disabled 버튼 text = leaf `persona?.nick ?? subjectTitle`
    vs legacy `persona?.nick ?? "교수님"` (mcp.ts:63). persona===null 일 때만 갈림.
    PERSONA_BY_SUBJECT 가 4 sample subject 전부 보유 → 현재 dataset 으로 도달 불가.
    persona-less subject 추가 시에만 실현되는 latent divergence. 비차단.
- ⚠️ **REQUIRED parity break (2뷰 공통)** = **concept "연결 문제" 블록 누락**.
  legacy `renderConcept` (subject-cards.ts:139-140) =
  `<strong>연결 문제</strong><p>${resolvedQuestions.length}개</p>` (concept 의
  `exampleQuestionIds` → getQuestionById resolve 후 count). 그러나:
  - **summary-detail** leaf `ConceptRow` (SubjectSummaryDetailView.tsx:89-94) =
    `연결 문제` 블록 **전체 누락** (출처 힌트만).
  - **memorize** leaf `ConceptRow` (SubjectMemorizeView.tsx:112-113) =
    `<strong>연결 문제</strong><p>-</p>` (하드코딩 dash).
  - root = producer (main.ts:4800-4807 summary-detail / 4931-4938 memorize) 가
    concept prop 에서 `exampleQuestionIds` 를 drop → leaf 가 count 산출 불가.
  - sampleLectureNote 의 must-know/주차 concept 들은 linked question 보유 →
    실데이터에서 visible content 차이. migration parity gate 위반 → **fix 필요**
    (deterministic/narrow → autopilot rework, user judgment 불요).
  - fix scope (worker): `SummaryConceptItem`/`MemorizeConcept` 에
    `linkedQuestionCount: number` 추가 + producer 가 resolved count 계산
    (`c.exampleQuestionIds.map(getQuestionById).filter(Boolean).length`) +
    두 leaf ConceptRow 가 `<strong>연결 문제</strong><p>{count}개</p>` 렌더 +
    spec 갱신. files = 2 leaf + main.ts producer + 2 spec. **harness worker 와
    파일 비겹침** (harness=vite/router/negControl/script) 이나 same-worktree
    동시 build 오염 방지 위해 harness 완료 후 순차 실행.

## 판정 (갱신)

**구조 Gate 6 = PASS** (type-safe seam + guards + INV-8 + oracle + 독립 build/test).
**value-parity = mcp PASS / summary-detail·memorize = 1 REQUIRED fix (concept 연결 문제 count)**.
**deploy-eligible = NO** — (1) loop-gate A/B harness 진행 중(worker), (2) concept-count
parity fix 미적용, (3) Gate 6 cross(codex) 미실행. deploy 승인도 없음.
→ 순서: ① loop-gate harness GREEN(stdout 직접 검증) → ② concept-count parity fix +
재빌드/spec → ③ Gate 6 cross(codex) → ④ deploy 명시 승인.
