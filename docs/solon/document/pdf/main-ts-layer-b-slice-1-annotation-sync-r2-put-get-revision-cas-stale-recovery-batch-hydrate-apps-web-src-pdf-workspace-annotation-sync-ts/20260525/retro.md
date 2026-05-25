---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W22-sprint-1"
workspace: "main-ts-layer-b-slice-1-annotation-sync-r2-put-get-revision-cas-stale-recovery-batch-hydrate-apps-web-src-pdf-workspace-annotation-sync-ts"
handoff_dir: "docs/solon/document/pdf/main-ts-layer-b-slice-1-annotation-sync-r2-put-get-revision-cas-stale-recovery-batch-hydrate-apps-web-src-pdf-workspace-annotation-sync-ts/20260525"
goal: "main.ts layer B/slice-1 — annotation sync (R2 PUT/GET + revision/CAS + stale recovery + batch hydrate) 를 apps/web/src/pdf-workspace/annotation-sync.ts 로 분리"
created_at: ""
last_touched_at: "2026-05-25T10:57:44+09:00"
closed_at: 2026-05-25T10:57:44+09:00
domain: "document"
subdomain: "pdf"
feature: "main-ts-layer-b-slice-1-annotation-sync-r2-put-get-revision-cas-stale-recovery-batch-hydrate-apps-web-src-pdf-workspace-annotation-sync-ts"
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **Context (least-privilege read) + Callbacks (least-privilege write) 패턴
  재사용 성공**: layer A 의 AppShellContext+RenderSink 패턴을 layer B 의
  AnnotationSyncContext+AnnotationSyncCallbacks 로 그대로 적용. broad
  `PdfWorkspaceStore` / `authSession` 노출 회피. layer B/slice-2 (PDF
  canvas / ink / drag) 도 같은 패턴.
- **module-private state + clearXxxCaches() API**: annotation-sync 가 8
  Map/Set + tracker 를 자체 보유, main.ts 의 reset block 2곳을
  `clearAnnotationSyncCaches()` 한 줄로 통합. 코드 응집 + main.ts 인지
  부담 큰 폭 감소.
- **characterization spec 의 fetch mock + DOM-free assertion**: 20 case
  PASS. revision/CAS / STALE / batch / dedup / chain / auth-expired /
  silent 4xx / malformed / scrub / fail-closed / encoding 모두 lock.
  layer A 의 routes.spec / appShell.spec 패턴 확장.
- **사전 source excerpt + waiver capture**: Gate 6 self round-1/2/3 의
  반복 finding (source excerpt, AC1 grep 불일치, R5.1 value-level scrub)
  을 실제 자체 fix 가능 → round-4 self PASS + round-1 cross PASS 도달.
  layer A 의 11 round vs 본 sprint = self 4 + cross 1 = 5 round (큰 절감).
- **자동화 하네스 시도** (SessionStart hook + ACTIVE.md 자동 inject):
  fresh session 마다 layer goal + handoff 자동 inject. 다음 layer 진입
  부담 감소.

## 2. 문제

- **codex bot review verdict 부재** (post-implementation): @codex review
  trigger 2회 했지만 bot 가 follow-up note 만 emit, "Codex Review:" 정확
  verdict 또는 👍 reaction 안 옴. PR #57 (layer A) = 4분 후 정상 verdict,
  PR #58 = 30+ 분 경과해도 부재. codex bot service 의 sporadic 거동.
  ✦ 학습 = [[feedback-codex-bot-review-timing]] 정책 의 30~60초 wait 보다
  훨씬 긴 wait 필요할 수 있음. Gate 6 self+cross PASS + CI clean = 충분
  evidence 로 merge 진행 (autopilot).
- **Hook stop block 와 Session Continuation Guard 충돌**: SFS 0.6.117 의
  Session Continuation Guard 가 같은 session 여러 WU 진행 시 fresh session
  handoff 권장하지만, `/goal` stop hook 가 layer A~D 완료까지 stop block.
  같은 session 에서 layer A + B/slice-1 연속 진행 → token 부담 큼.
  ✦ 학습 = 자동화 SessionStart hook + ACTIVE.md 가 부분 해법. user 가
  layer 사이 명시 /clear 시 fresh session 자동 이어 진행 가능. 단 `/goal`
  자체는 session-scoped 라 매번 user 재설정 필요.
- **annotation 측 + user-notes 측 sync 공유 syncFailureTracker / 
  syncBackendError**: annotation-sync 분리 후 두 영역 tracker 가 분리됨
  (annotation-sync = self-tracker, user-notes = main.ts tracker). banner
  message 는 callback 으로 공유 변수 갱신 = 단일 UX 유지. user-visible
  동일. 단 paused state = 독립 (한 영역 fail = 그 영역만 pause). pre-
  existing 통합 tracker 와 minor behavior 차이 = 개선 (regression 아님).
  ✦ 학습 = 다음 layer D (user-notes sync) 분리 시 두 tracker 통합 또는
  완전 분리 결정. 별 sprint scope.
- **plan AC1 grep 8 함수 → 실 7 함수**: `recordSync*` /
  `recordFetch*` / `handleAuthExpiredFromSync` 5 함수 = user-notes 측 호출
  로 main.ts 잔류. Gate 6 round-3 P2 waiver 로 인정 (plan §R6 user-notes
  잔류 일관 확장).
  ✦ 학습 = plan AC 의 grep target 을 함수 list 로 명시할 때 user-notes
  공유 함수 사전 분류. layer D 가 user-notes 분리 시 자연스럽게 7-of-12
  → 12-of-12 진화.

## 3. 시도할 것

- **layer B/slice-2 = PDF workspace 의 나머지**: ink stroke / drag /
  canvas mount preservation / PDF nav / drill highlight / star mark /
  fullscreen / classDate dropdown. handoff §2-B 의 ~20+ 함수. **위험도
  여전히 매우 높음** (좌표 0~1 ratio + RAF batch + getCoalescedEvents +
  morphdom canvas preservation + pdfjs polyfill saga = invariant 5종).
  본 sprint 의 Context+Callbacks 패턴 그대로 적용.
- **backlog 항목 처리**:
  - `bl-annotation-render-xss-audit` — annotation render path 의 escape
    완전성 audit (layer B/slice-2 또는 별 sprint AC).
  - layer A 의 backlog 4 (`bl-subject-id-href-escape` /
    `bl-week-id-encode` / `bl-trusted-html-brand` /
    `bl-parseRoute-empty-segment`) 도 layer C/D 진입 시점 검토.
- **사용자 직접 manual QA**: PR #58 머지 후 dev URL → PDF workspace 진입
  → sticky note 추가 → BE PUT 응답 확인 + 다른 tab 같은 material → batch
  GET 확인 + iPad 실기기 검증 (annotation sync 동작).
- **codex bot trigger 사이클 개선** = post-implementation @codex review
  의 verdict 부재 case 의 처리 policy 명확화. self+cross + CI clean 만으로
  merge 가능한 조건 명시 (현재 = hot-path autopilot).

## 4. 이어갈 것

- **layer B/slice-2 sprint scope 결정** = 다음 sprint brainstorm Q1.
  20+ 함수 한 번에 vs invariant 별 sub-slice (canvas mount / pen latency /
  drag / nav 별) 결정. invariant 5종 분리가 위험 감소 효과 큼 — sub-slice
  multi-sprint 권장.
- **자동화 하네스 검증** = next fresh session 시 SessionStart hook 가
  ACTIVE.md content 정상 inject 하는지 user 직접 확인 필요. inject 실패
  시 ACTIVE.md path 또는 hook syntax 점검.
- **main.ts line count 누적 metric** = 11,049 → 10,253 (-796, -7.20%).
  9k target (layer A~D 누적) 까지 -1,253 line 더 필요. layer B/slice-2 +
  C + D 분배.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (Gate 3/6 self+cross PASS, codex
  bot post-trigger verdict 부재 = bot service 거동으로 분류, Gate 6
  evidence 만으로 merge 진행)
- [x] workbench 가 접혔다 (sprint 2026-W22-sprint-1 close, current-sprint
  pointer 해제)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (426 tracked files), domains=0, last_review=pass, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-25T10:57:44+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
