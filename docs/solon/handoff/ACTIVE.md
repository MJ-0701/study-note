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
| **B/slice-2d. drill highlight** | TBD | ⏳ 다음 sprint 후보 (위험도 중) |
| B/slice-2e. star mark + renderer | TBD | ⏳ backlog (위험도 중-높음, renderer ~1200 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **9,417** (-1,632, -14.77%). 9k target (layer A~D
누적) 까지 -417 line 더 필요.

## 활성 작업 = layer B/slice-2d sprint (drill highlight — **단독 sprint, 위험도 중**)

**전 sprint retro** = `docs/solon/document/pdf/main-ts-layer-b-slice-2c-ink-stroke-pen-raf-batch-0-1-ratio-morphdom-pdfjs-polyfill/20260525/retro.md`

**slice-2d 후보 함수** (~?00 line, 실측 필요):
- drill highlight state (drillHighlightStartedAt 등 main.ts 잔류)
- inspector drill renderer 결합부 (drill type normalize + 페이지 이동 + 1.5s pulse)
- highlight UI 분기 (sprint-14 의 tan 검사기 / 페이지 이동 / 1.5s pulse 동작)

**invariant 추정 (fragile)**:
1. drill type normalize (sprint-14 R1 R2 fix 의 discontinuous gating + sin/cos blank 회기).
2. 1.5s pulse timing (renderApp 호출 + setTimeout 정합).
3. page nav timing (drill 후 페이지 이동 + 잔류 highlight clear).
4. inspector-drill.spec.ts 의 source-text characterization (8 → 10 case, AC 정합).

**slice-2c 학습 우선 적용**:
- handoff 의 invariant 수와 실측 mismatch 가 다시 발생할 가능성 → brainstorm 단계
  orient + measurement-first 필수. silent narrow 금지.
- review.md §2 manual update routine 의 **SFS 0.6.121 events.jsonl compaction 한계**:
  review_stage 가 compaction key 미포함 → self+cross 동시 보존 불가. 다음 sprint
  부터 cross 직후 self 재실행 (events 마지막이 self 가 되도록) OR commit apply
  `--no-push` + git push manual + `gh api -X PUT ...pulls/N/merge` (gh pr merge
  의 JSON parse error 우회).
- AC2 / AC3 estimate ±50% / ±100% 범위 wording.
- advisor() Gate 6 진입 전 1회 표준 step.

**mobile QA / Datadog readout 정정**: 본 sprint = DDD refactor (행위 등가).
slice-2c 의 AC7 retro-defer (mobile pen smoke + Datadog `pen-stroke.next-paint`
p50/p95) capture (20260525T070319Z-91020 + 20260525T074710Z-21895) 는 별도
평가 trip 의무 아님. 일상 사용 중 회기 발견 시 hotfix sprint. capture =
"행위 등가 가정 보존" evidence 일 뿐, "user 가 직접 검증" 의무 아님.
slice-2b 의 codex round 4 거부 회피 wording 을 가져오면서 "의무" 까지
격상한 mismatch — slice-2d plan §3 AC 작성 시 "회기 시 hotfix" 수준으로
명시.

**다음 명령**:
```bash
sfs status                  # 빈 sprint 확인
sfs start "main.ts layer B/slice-2d — drill highlight 분리"
sfs brainstorm "..."        # orient = drill highlight 잔여 line 측정 우선
sfs plan → review --gate 3 self → cross → implement → Gate 6 self → cross → PR → @codex → merge → retro
```

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
