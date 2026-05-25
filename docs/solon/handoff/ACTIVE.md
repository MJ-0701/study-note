# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. layer 진행
> 시 매 sprint close 후 다음 sprint handoff 로 갱신.

## 진행 상황 (2026-05-25)

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57, main=25f3cb9) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 (prev) | ✅ merged (PR #58, main=2fd4a0d) |
| **B/slice-2a. canvas mount + workspace state** | 2026-W22-sprint-1 (this) | ✅ merged (PR #59, main=c84439e) |
| **B/slice-2b. classDate + touch/swipe + nav** | 2026-W22-sprint-2 | ✅ merged (PR #60, main=e8c1f87) |
| **B/slice-2c. ink stroke + pen RAF batch** | 2026-W22-sprint-3 | ✅ merged (PR #61, main=f24a20b) |
| **B/slice-2d. drill highlight** | 2026-W22-sprint-2 | ✅ merged (PR #62, main=d1bba31) |
| **B/slice-2e. star mark only** | TBD | ⏳ 다음 sprint 후보 (위험도 낮음, ~150 line) |
| B/slice-2f. renderer big | TBD | ⏳ backlog (위험도 중-높음, ~1,369 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **9,000** (-2,049, -18.55%). 9k target **달성**.
다음 호기심 target = 8k (slice-2f renderer big 분리 시 가능).

## 활성 작업 = layer B/slice-2e sprint (star mark only — **단독 sprint, 위험도 낮음**)

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2d-drill-highlight/20260525/retro.md`

**slice-2e 측정치 (실측)**:
- `renderStarMark` (main.ts L7201-7232, 31 line) + add/remove/resizeStarMark
  (~L4501-4550, ~50 line) + dispatch (L1660-1690, ~30 line) + Y key bind +
  tool integration ≈ **150 line scope**.
- 7 grep hit (`star|Star|starMark|StarMark`): L1660, L1671, L2516-2545
  (Y key bind), L3046-3047 (tool dispatch), L4501-4541 (state), L7201-7232
  (render), L8972 (tool label).
- 위험도 낮음 = 단일 UI widget + simple state + iPad tap binding 명확.

**slice-2e 후보 invariant**:
1. Y key bind (KeyY → "star" tool activation, L2516+2530+2545).
2. add/remove/resize state mutate (immutable workspace update via
   workspace-store patch).
3. star mark render (data-star-mark-id + ★ glyph + controls = resize + delete).
4. tool integration (selectedTool === "star" → addStarMark dispatch).

**slice-2c+2d 학습 우선 적용**:
- measurement-first orient brainstorm §1 의무 (handoff 추정 vs 실측 mismatch
  사전 차단).
- scope boundary 결정 brainstorm 단계 (option A=state only / B=state+render
  / C=state+render+key-bind+tool — default 추천).
- SFS 0.6.121/0.6.122 events.jsonl compaction workaround = capture
  `--kind evidence` + `--kind waiver` 패턴 미리 준비 (slice-2c R-D2 backlog).
- AC2/AC3 estimate ±100 wording.
- advisor() Gate 6 진입 전 1회 step.
- module init order self-check (slice-2d Gate 6 lesson — eager const 가
  후방 const 참조 시 TDZ ReferenceError).

**mobile QA / Datadog readout**: slice-2c/2d 동일 — DDD refactor (행위 등가).
slice-2c 의 capture (20260525T070319Z-91020 + 20260525T074710Z-21895) 는
"행위 등가 가정 보존" evidence. user 직접 검증 의무 아님. 회기 시 hotfix.

**다음 명령**:
```bash
sfs status                  # 빈 sprint 확인
sfs start "main.ts layer B/slice-2e — star mark 분리"
sfs brainstorm "..."        # orient = star mark 잔여 line 측정 우선 (이미 ~150 line 실측)
sfs plan → review --gate 3 self → cross → implement → Gate 6 self → cross → PR → @codex → merge → retro
```

## Layer B/slice-2d 결과 (참고)

- main.ts -417 line (9,417 → 9,000). 누적 layer A~B/slice-2d = -2,049 / -18.55%.
  9k target 달성.
- 신규 1 module + spec 이관: `pdf-workspace/drill-highlight.ts` 669 line / 36
  export (types 7 + const 7 + interface 4 + function 16 + test helper 2).
- spec = `apps/web/src/__tests__/inspector-drill.spec.ts` 795 line / 14 case
  (handoff 추정 8→10 vs 실측 13 + 1 dynamic security loop = 14). SRC = drill-highlight.ts.
- web 전체 spec 회귀 = 0 (오히려 -1 fail 개선 — inspector-drill 이 main.ts shim
  mismatch 우회로 PASS 전환). pre 408/5 → post 422/4.
- Gate 3 self+cross PASS (각각 round 3 — events.jsonl compaction workaround
  capture + waiver 2건).
- Gate 6 self R3 + cross R1 PASS — self R1 partial = TDZ bug (drillHighlightHelpers
  eager const 가 후방 CHART_TYPE_PREFIX 참조 ReferenceError) → lazy factory
  `getDrillHighlightHelpers()` fix. self R2 partial = untracked file + .gitignore
  미설명 + 4 fail 명세 누락 → git add staged + diff 명시 + 4 fail 명세.
- @codex bot = "Didn't find any major issues. :+1:" (autopilot merge).
- Waiver 2건 + Evidence 1건 (capture):
  - Gate 3 evidence (capture 20260525T084637Z-47536) = self R3 PASS 보존.
  - Gate 3 waiver (capture 20260525T084646Z-47665) = SFS 0.6.121/0.6.122
    events.jsonl compaction key 미포함 known bug.
  - Gate 6 evidence (capture 20260525T091344Z-1532) = self R3 PASS 보존.
- Backlog (slice-2c retro 의 R-A2/R-C/R-D2/R-D3 외 신규):
  - R-D2 escalate: SFS 0.6.122 events.jsonl compaction key 에 review_stage 추가
    issue/PR 제안 (slice-2c+2d 연속 재발).
  - R-H: implement 단계 module init order self-check 추가 (Gate 6 가 발견한
    TDZ lesson — eager const 가 후방 const 참조 시 lazy factory).
  - R-I: pre-existing 4 fail (`updatePdfMaterialMetadata` shim missing,
    chart-tool + pdf-material-library) — 별도 sprint backlog.
- 패턴 = layer A/B-slice-1/2a/2b/2c/2d Context + Callbacks + DomainHelpers
  + named export + module-private state + characterization spec 일관.

## Layer B/slice-2c 결과 (참고)

- main.ts -164 line (9,581 → 9,417). 누적 layer A~B/slice-2c = -1,632 / -14.77%.
- 신규 1 module + 1 spec: `pdf-workspace/ink-stroke.ts` 402 line (9 function +
  1 ActiveInkStroke interface + 3 helper interface + 3 test helper = 16
  symbol) + `pdf-workspace/__tests__/ink-stroke.spec.ts` 616 line (12 case).
- 신규 spec 12 case (ink-stroke) + 기존 회귀 0 (pdf-workspace 8 spec 128 case
  + pen-stroke-latency 9 case + 전 web spec 407/412 pre/post 동일).
- 수정: `pen-stroke-latency.spec.ts` SRC = ink-stroke.ts + 6 regex signature
  적응 (AC16-AC20 source-text characterization 유지).
- Gate 3 self+cross PASS (round 2+1 — codex cross PASS round 1).
- Gate 6 self+cross PASS (round 3 cross — codex round 1 partial + round 2
  partial → P1 waiver via capture 20260525T074710Z-21895 → round 3 PASS).
- @codex bot = "No major issues" (autopilot merge 사후 검증).
- Waiver 2건:
  - AC7 retro-defer (mobile pen smoke 6 시나리오) — capture 20260525T070319Z-91020.
  - Performance evidence (Datadog RUM p50/p95 numeric baseline) — capture
    20260525T074710Z-21895.
- Backlog 4건:
  - R-A2: retro window user manual smoke + Datadog readout (capture 양쪽 evidence).
  - R-C: ACTIVE.md 자동 update (SFS 0.6.122 backlog 제안).
  - R-D2: events.jsonl compaction key 에 review_stage 추가 (SFS 0.6.122 backlog 제안).
  - R-D3: eslint 도입 (별도 sprint, layer C 진입 전).
- 패턴 = layer A/B-slice-1/2a/2b 의 Context + Callbacks + DomainHelpers +
  named export + module-private state + characterization spec 일관.

## Layer B/slice-2b 결과 (참고, 이전 sprint)

- main.ts -373 line (9,954 → 9,581).
- 신규 5 module: constants 29 + class-date 307 + view-state 226 + touch-swipe
  245 + document-change 234 = 1,041 line.
- 신규 spec 61 case + 기존 회귀 0. Gate 3 self+cross PASS (round 3+2).
  Gate 6 self+cross PASS (round 5+2). @codex bot = "No major issues".
- Waiver 1건 (AC7 retro-defer). Backlog 2건 (R-F document-change.ts /
  R-G chartPointDebounceMap).

## SFS 0.6.121 정책 ambient (CLAUDE.md 참조)

- Division sub-agent council (strategy-pm/dev/QA/design/infra/taxonomy) always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh from probe banner)
- Handoff-only stop contract (interrupt active loops)
- Executable Action Ownership (auth+runtime+approval 있으면 직접 실행)
- Monitor checkpoint classification (long-running watch 의무)
- Review autopilot rework loop (deterministic finding 직접 patch + rerun)
- Findings label = Critical/Required/Important/Optional/FYI
- Session Continuation Guard ambient (autopilot fresh-session transfer)
- 자세히 = `CLAUDE.md` 의 "SFS 0.6.114 → 0.6.117 추가 정책" 섹션 + CHANGELOG 0.6.118~0.6.121
