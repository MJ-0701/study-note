# 🎯 ACTIVE SPRINT GOAL — FE DDD 리팩토링 (React 적용은 리팩토링 후)

> 본 file 은 SessionStart hook 가 fresh session 마다 자동 inject. layer 진행
> 시 매 sprint close 후 다음 sprint handoff 로 갱신.

## 진행 상황 (2026-05-25)

| Layer | Sprint | 상태 |
|---|---|---|
| **A. routing/shell** | 2026-W21-sprint-2 | ✅ merged (PR #57, main=25f3cb9) |
| **B. PDF workspace** | 2026-W22-sprint-1 | 🟡 in-progress (slice-1 = annotation sync) |
| C. subject views | TBD | ⏳ backlog |
| D. state/sync residual | TBD | ⏳ backlog |
| **React migration** | TBD | ⏳ 분해 A~D 완료 후 재검토 ([[project-react-migration-backlog]]) |

## 활성 작업 = sprint-W22-sprint-1 (annotation sync 분리)

**다음 명령**:
```bash
sfs status
sfs review --gate 3 --stage self      # plan.md 작성 완료, self review 부터 재개
```

**상세 인계** = `docs/solon/handoff/20260525-layer-b-pdf-workspace-handoff.md`

**현재 plan.md 위치** = `.sfs-local/sprints/2026-W22-sprint-1/plan.md`
(brainstorm + plan 작성 완료, Gate 3 self review 진행 직전 fresh session
handoff)

## SFS 0.6.117 정책 ambient (CLAUDE.md 참조)

- Executable Action Ownership (auth+runtime 갖춰지면 직접 실행)
- Monitor checkpoint classification (long-running watch 의무)
- Handoff-only stop contract (인계문서 요청만이면 즉시 stop)
- Review autopilot rework loop (deterministic finding 직접 patch + rerun)
- Findings label = Critical/Required/Important/Optional/FYI
- Session Continuation Guard ambient (본 file 자체가 그 결과)
- 자세히 = `CLAUDE.md` 의 "SFS 0.6.114 → 0.6.117 추가 정책" 섹션
