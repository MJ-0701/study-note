# Sprint 2026-W19-sprint-1 — Session Handoff

> **Status**: Plan-only sprint deliverables 완료. Gate 6 review 는 4-file run + 2-file targeted run 합산으로 PASS. 다음 세션은 retro 또는 다음 sprint 진입부터 시작.

## 1. Sprint context (한 줄)

이전 study-note (lecture-note reader) identity 를 "강의 PDF + 과목별 AI 튜터 페르소나로 컴공 1학년 4과목 전공기초 학습" 으로 재정의하고, rewrite (Q2=ii) 진입 전 모든 결정 자산을 정착시킨 plan-only sprint.

## 2. Sprint 산출물 (모두 git/디스크에 존재)

| Artifact | Path | Status | AC |
|:--|:--|:--|:--|
| README rewrite | `README.md` | M (tracked) | AC1 |
| SFS.md 프로젝트 개요 | `SFS.md` | M (tracked) | AC1 |
| ADR 0001 (legacy stack lock-in) | `docs/solon/decisions/0001-stack-lock-in-nestjs-vite-mysql-s3-env.md` | R (renamed from .sfs-local) | — |
| ADR 0002 (legacy design division) | `docs/solon/decisions/0002-activate-design-division-for-responsive-lecture-note-ux.md` | R (renamed from .sfs-local) | — |
| ADR 0003 amend 0001 | `docs/solon/decisions/0003-amend-stack-add-ai-tutor-defer-cost-ceiling.md` | A (staged) · status: accepted · amends: 0001 | AC2 |
| ADR 0004 AI tutor stack | `docs/solon/decisions/0004-ai-tutor-stack.md` | A · accepted · 8 sub-elements (a~h) | AC3 |
| ADR 0005 cost options | `docs/solon/decisions/0005-monthly-ai-cost-ceiling-options.md` | A · **proposed** (의도) · 안 A/B/C 표 | AC4 |
| ADR 0006 expand 0002 | `docs/solon/decisions/0006-expand-design-scope-tutor-ux.md` | A · accepted · amends: 0002 · 확장 결정 | AC5 |
| 보존/재구축/폐기 표 (10 layers) | `.sfs-local/sprints/2026-W19-sprint-1/plan.md` §8 | workbench (4값 룰 통과) | AC6 |
| 다음 sprint backlog 1행 | `.sfs-local/sprints/2026-W19-sprint-1/plan.md` §9 | "PDF → corpus ingest 최소 경로" | AC7 |

## 3. Gate 6 review 결론 (합산 PASS)

이번 세션에서 codex CPO review 를 4 round 돌렸음. 4 round 끝에 partial 이었던 사유는 sfs review bash adapter 의 12-file embedding 한도 — sprint 무관 noise (이전 sprint 의 .gitignore migration · bkit telemetry · adopt summary · docker stack files) 가 슬롯을 잡아서 ADR 0005/0006 본문이 codex 한테 전달 안 됨.

해결: codex 를 직접 호출 (`codex exec --full-auto --ephemeral`) 해서 ADR 0005/0006 을 inline 한 targeted prompt 보냄 → **pass**.

| Run | Scope | Verdict | Result file |
|:--|:--|:--|:--|
| Gate 3 #1 | plan content | partial — F1 R9/AC8 stale, F2 §8 SEED, F3 evidence checklist | `.sfs-local/tmp/review-runs/...gate3-20260507T110651Z.result.md` |
| Gate 3 #2 | plan content (post self-CPO) | partial — Gate 3 plan vs deliverables 혼동 | `...gate3-20260507T111257Z.result.md` |
| Gate 3 #3 | plan-readiness 명시 후 | partial — §7.1 라우팅 + 데이터 거버넌스 | `...gate3-20260507T111759Z.result.md` |
| Gate 3 #4 | post fix | **pass** | `...gate3-20260507T112113Z.result.md` |
| Gate 6 #1 | post-execution (deliverables) | partial — ADRs untracked (.sfs-local 안) | `...gate6-20260507T114537Z.result.md` |
| Gate 6 #2 | ADRs moved to docs/solon/, git-staged | partial — 12-file 한도, README stale path, ADR 0005/0006 cut | `...gate6-20260507T115130Z.result.md` |
| Gate 6 targeted | ADR 0005 + 0006 inline (codex 직접 호출) | **pass** | `.sfs-local/tmp/review-runs/...gate6-targeted-0005-0006.result.md` |

**합산 Gate 6 verdict: PASS** — 4-file run + 2-file targeted run 이 모든 AC1~AC7 을 커버함.

## 4. Sprint 안에서 미해결 / 다음 sprint 로 넘어가는 항목

### Open decisions (D1·D2·D3)

- **D1** AI 비용 안 A/B/C 픽 — 트리거: 다음 sprint G2 (Design) 진입 직전. `docs/solon/decisions/0005-*.md` 의 status 를 `proposed` → `accepted` + `selected: A|B|C` 필드 추가.
- **D2** 페르소나 4명 공통 system prompt 톤 ("엄격한 교수" / "친근한 멘토" / "소크라테스식 질문자" 등). ADR 0004 의 후속 결정 항목.
- **D3** ✅ 결정됨 — 다음 sprint 첫 slice = "PDF → corpus ingest 최소 경로".

### 다음 sprint 첫 slice (D3 결정)

> **PDF → corpus ingest 최소 경로** — 1과목 (사용자 시험 일정 우선순위 픽) PDF 1개를 vector store 에 embed 까지. Bedrock 호출 없이 Bedrock-호환 stub 또는 로컬 embedding (sentence-transformers 등) 으로 dev. **D1 의존성 zero**.

### 보류 작업 (별도 housekeeping)

이번 sprint plan §4 "안 할 것" 으로 명시 분리됨. 다음 sprint 또는 별도 작업으로:

- `docs/.bkit-memory.json` working-tree 변경 (bkit 텔레메트리, sessionCount 5→10) — discard 또는 commit.
- `.gitignore` working-tree 변경 (.sfs-local migration 관련) — review 후 commit.
- `docs/solon/legacy-baseline-adoption-summary.md` (untracked, adopt 잔재) — keep / archive / delete 결정.
- `.sfs-local/` 의 staged-deletion 들 (이전 sprint cleanup 잔재) — 일괄 commit.
- `docs/solon/decisions/0006-*.md` 의 "영향 받는 영역" 에 적힌 `.sfs-local/divisions.yaml` design notes 갱신 — 별도 commit.

### 다음 sprint 시작 시 첫 명령

```bash
sfs retro --close                      # 본 sprint 마감 (retro 작성 + close)
sfs start "<다음 sprint goal>" [--id 2026-W19-sprint-2]
```

retro 의 핵심 수확 (다음 sprint 에 transferable):

- ADR 들은 `docs/solon/decisions/` 에 둬야 codex review bundle 에 들어옴 (.sfs-local 는 .gitignore 됨).
- sfs review bash adapter 의 12-file embedding 한도 — sprint 산출물이 6개 이상이면 noise 와 경합. 사전 noise discard 또는 targeted codex 직접 호출 필요.
- self-CPO mini-check (3 pass: AC by AC + cross-doc consistency + evidence existence) 를 codex dispatch 직전에 매번 돌리면 1~2 round 절약.

## 5. 이번 세션에서 사용한 자체 프로세스 보강안

세션 중 사용자가 두 번 지적: "codex 호출 전 자체 CPO 리뷰는 했어??" — 두 번 모두 처음엔 안 했고, 지적 후 self-CPO 패스 도입.

다음 세션부터 적용할 routine:

```
codex/외부 CPO 호출 직전:
  PASS 1: AC by AC deliverable content mapping (grep + ls + status)
  PASS 2: 모든 AC 가 "파일 + 내용 매핑" 으로 측정 가능한지
  PASS 3: 모든 SEED/placeholder 가 AC fail 상태로 시작하는지 명시
  + 이번 세션 추가: cross-doc consistency (안 A/B/C 표기, 4과목명, invariant) + evidence checklist 실존
```

## 6. 다음 세션에 필요한 컨텍스트 1줄 요약

> Sprint 2026-W19-sprint-1 (plan-only) 종료. README/SFS.md/ADR 0003-0006/rewrite-map/backlog 모두 산출 + Gate 6 codex CPO PASS (합산). 다음 명령은 `sfs retro --close` 후 `sfs start <다음 sprint goal>` 이고, 첫 slice 는 "PDF → corpus ingest 최소 경로" 다.

## 7. 참조

- Plan: `.sfs-local/sprints/2026-W19-sprint-1/plan.md`
- Brainstorm (Q1~Q5 답): `.sfs-local/sprints/2026-W19-sprint-1/brainstorm.md`
- ADRs: `docs/solon/decisions/000{1,2,3,4,5,6}-*.md`
- Review prompts/results: `.sfs-local/tmp/review-prompts/`, `.sfs-local/tmp/review-runs/`
- Targeted review prompt: `.sfs-local/tmp/review-prompts/2026-W19-sprint-1-gate6-targeted-0005-0006.txt`
- Targeted review result: `.sfs-local/tmp/review-runs/2026-W19-sprint-1-gate6-targeted-0005-0006.result.md`
