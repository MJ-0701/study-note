# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. layer 진행
> 시 매 sprint close 후 다음 sprint handoff 로 갱신.

## 진행 상황 (2026-05-25)

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57, main=25f3cb9) |
| **B/slice-1. annotation sync** | 2026-W22-sprint-1 | ✅ merged (PR #58, main=2fd4a0d) |
| **B/slice-2. PDF workspace 나머지** | TBD | ⏳ 다음 sprint (ink stroke / drag / canvas mount / nav / drill / star / fullscreen / classDate) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual (user-notes) | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

main.ts line: 11,049 → 10,253 (-796, -7.20%). 9k target (layer A~D 누적)
까지 -1,253 line 더 필요.

## 활성 작업 = layer B/slice-2 sprint (PDF workspace 나머지)

**다음 명령**:
```bash
sfs status                  # 빈 sprint 확인
sfs start "main.ts layer B/slice-2 — PDF workspace 나머지 (ink/drag/canvas mount/nav/drill/star/fullscreen/classDate) 분리"
sfs brainstorm "..."        # Q1 = invariant 별 sub-slice multi-sprint vs 한 번에 결정
sfs plan
sfs review --gate 3 --stage self     # self → cross → implement → Gate 6 → PR → retro
```

**상세 인계** = `docs/solon/handoff/20260525-layer-b-pdf-workspace-handoff.md` §2-B 의 ink stroke / drag / canvas mount / nav / drill / star / fullscreen / classDate 함수 목록.

**위험도 매우 높음**: 좌표 0~1 ratio + RAF batch + getCoalescedEvents +
morphdom canvas preservation + pdfjs polyfill saga = 5 fragile invariant
동시 검증. sub-slice multi-sprint 권장.

## SFS 0.6.117 정책 ambient (CLAUDE.md 참조)

- Executable Action Ownership (auth+runtime 갖춰지면 직접 실행)
- Monitor checkpoint classification (long-running watch 의무)
- Handoff-only stop contract (인계문서 요청만이면 즉시 stop)
- Review autopilot rework loop (deterministic finding 직접 patch + rerun)
- Findings label = Critical/Required/Important/Optional/FYI
- Session Continuation Guard ambient (본 file 자체가 그 결과)
- 자세히 = `CLAUDE.md` 의 "SFS 0.6.114 → 0.6.117 추가 정책" 섹션
