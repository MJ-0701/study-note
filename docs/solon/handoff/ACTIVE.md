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
| **B/slice-2c. ink stroke + pen RAF batch** | TBD | ⏳ 다음 sprint (위험도 매우 높음, 단독 sprint 필수) |
| B/slice-2d. drill highlight | TBD | ⏳ backlog (위험도 중) |
| B/slice-2e. star mark + renderer | TBD | ⏳ backlog (위험도 중-높음, renderer ~1200 line) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → **9,581** (-1,468, -13.29%). 9k target (layer A~D
누적) 까지 -581 line 더 필요.

## 활성 작업 = layer B/slice-2c sprint (ink stroke + pen RAF batch — **단독 sprint, 위험도 매우 높음**)

**전 sprint retro** = `docs/solon/main-ts-layer-b-slice-2b-classdate-touch-swipe-nav-fullscreen/20260525/retro.md`

**slice-2c 후보 함수** (~?00 line, 실측 필요):
- pen / ink stroke 입력 path: `pointer*` 이벤트 + RAF batch + getCoalescedEvents
- 좌표 normalization (0~1 ratio model, surface relative)
- morphdom 호환 canvas preservation
- pdfjs polyfill saga (iPad Safari 18.5 `Map.prototype.getOrInsertComputed` TC39 upsert)

**invariant 5종 (fragile)**:
1. 좌표 0~1 ratio (surface resize 대응).
2. RAF batch (pointermove 발사 빈도 압축).
3. getCoalescedEvents (sub-frame 좌표 보존).
4. morphdom canvas preservation (rerender 중 canvas 유지).
5. pdfjs polyfill (Safari 18.5 누락 prototype 회복).

**mobile QA 부담**: iPad pen 입력 = primary use case. retro 마감 시
user 직접 실측 의무.

**다음 명령**:
```bash
sfs status                  # 빈 sprint 확인
sfs start "main.ts layer B/slice-2c — ink stroke + pen RAF batch + 좌표 0~1 ratio + morphdom + pdfjs polyfill 분리"
sfs brainstorm "..."        # Q1 = stroke buffer ownership (factory vs domain helper)
sfs plan → review --gate 3 self → cross → implement → Gate 6 self → cross → PR → @codex → merge → retro
```

**slice-2b 학습** (적용):
- review.md §2 manual update routine: Gate 3 / Gate 6 self PASS 직후
  바로 review.md §2 + §4 + §7 fill → cross 진입. SFS 0.6.120 frontmatter
  reset 시에도 §2-§7 sticky preserve 확인됨.
- plan §9 waiver 사전 표명: retro-defer AC 또는 cross-sprint 계약은 plan
  §3 + plan §9 두 곳 모두에 명시. 본 sprint AC7 round 4 까지 거부된
  사례 회피.
- advisor() Gate 6 진입 전 1회 표준 step.
- AC1 line target wording = `target ≤ N (wrapper overhead +80~+120 baseline)`.

## Layer B/slice-2b 결과 (참고)

- main.ts -373 line (9,954 → 9,581).
- 신규 5 module: constants 29 + class-date 307 + view-state 226 + touch-swipe
  245 + document-change 234 = 1,041 line.
- 신규 spec 61 case (class-date 15 / view-state 17 / touch-swipe 18 /
  document-change 11) + 기존 회귀 0 (annotation-sync 20 + canvas-mount +
  workspace-store 35 = 55 case). 전체 116/116 PASS.
- Gate 3 self+cross PASS (round 3+2). Gate 6 self+cross PASS (round 5+2).
- @codex bot = "No major issues".
- Waiver 1건: AC7 retro-defer (capture 20260525T050330Z-17077). user
  답변 A.
- Backlog 2건: R-F (document-change.ts 4/7 PDF 비율 mismatch, slice-2d/2e
  재배치 검토), R-G (chartPointDebounceMap main.ts 잔류 + ctx 주입 — 현
  합리).
- 패턴 = layer A/B-slice-1/slice-2a 의 Context + Callbacks + module-private
  state + characterization spec + domain helper ctx 주입 일관.

## SFS 0.6.119 정책 ambient (CLAUDE.md 참조)

- Division sub-agent council (strategy-pm/dev/QA/design/infra/taxonomy) always-on
- Bridge profile evidence (Codex `gpt-5.5` xhigh from probe banner)
- Handoff-only stop contract (interrupt active loops)
- Executable Action Ownership (auth+runtime+approval 있으면 직접 실행)
- Monitor checkpoint classification (long-running watch 의무)
- Review autopilot rework loop (deterministic finding 직접 patch + rerun)
- Findings label = Critical/Required/Important/Optional/FYI
- Session Continuation Guard ambient (autopilot fresh-session transfer)
- 자세히 = `CLAUDE.md` 의 "SFS 0.6.114 → 0.6.117 추가 정책" 섹션 + CHANGELOG 0.6.118 + 0.6.119
