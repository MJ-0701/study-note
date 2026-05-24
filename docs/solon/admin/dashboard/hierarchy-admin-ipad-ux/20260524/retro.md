---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W21-sprint-1"
workspace: "hierarchy-admin-ipad-ux"
handoff_dir: "docs/solon/admin/dashboard/hierarchy-admin-ipad-ux/20260524"
goal: "학기/과목 hierarchy + admin 학기·과목·수업일 관리 + iPad 펜 실시간 UX"
created_at: ""
last_touched_at: "2026-05-24T23:41:39+09:00"
closed_at: 2026-05-24T23:41:39+09:00
domain: "admin"
subdomain: "dashboard"
feature: "hierarchy-admin-ipad-ux"
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **Gate 3 self-CPO 9 round + cross codex 7 round 의 hardening cycle** — Term/Subject
  hierarchy + Subject move + starMark widget + classDate Date migration 등 도메인
  변경 폭이 큰 sprint 에서 finding 누락 방지. round 별 verdict + 패치 evidence 를
  plan.md frontmatter 에 명시한 패턴 유지.
- **Codex bot review 의 다단계 (R1 → R2 → ... → PASS) 신뢰 검증** — `@codex review`
  단일 호출 만으로 PASS 단정 X. 30~60s 대기 + bot 👍 reaction 확인 + 지연 finding
  catch. PR #51 (epoch sentinel) 의 8 round flip-flop 사례가 baseline.
- **이동 commit / behavior commit 분리** — sprint-W21-sprint-1 의 S5 ESC 분리는
  `esc-action.ts` pure module + main.ts integration 으로 잘게 쪼개 review 부담 낮춤.
  다음 main.ts DDD sprint 에서도 그대로.

## 2. 문제

- **sprint scope 선정 미스 — main.ts DDD 분해 인계 (`20260523-auth-boot-main-ddd-handoff.md`)
  가 본 작업이었는데, sprint-W21-sprint-1 plan/brainstorm 이 이미 approved 상태로
  남아 있어서 그쪽 따라감.** 결과: main.ts 가 ~8000 → 11049 line 으로 증가. 분해
  부담을 키운 채 다음 sprint 로 넘김. 다음부터는 fresh session 시작 시 handoff
  doc 우선순위 확인 후 sprint 진입 결정.
- **PR loop 8 round (PR #51 epoch sentinel)** — codex 가 R2 "preserve flat fallback"
  vs R5 "clear stale cache" 왔다갔다. plan 단계에서 sentinel semantic (null vs
  string vs date) 을 ADR 로 못 박지 않아 round-trip 늘어남. 다음 sprint 에선
  sentinel/null/optional/error 정책을 plan AC 옆에 부속 ADR 로 동시 결정.
- **`gh pr merge` "invalid character '{' after object key:value pair" 버그** — REST API
  fallback (`gh api .../merge --method PUT`) 우회. gh CLI 버전 업그레이드 + 해당 issue
  추적 필요.
- **인계문서 작성이 PR loop 끝 무렵에 뒤섞임** — handoff doc 자체는 5 분 분량인데
  PR 머지/review/race fix 와 병행해서 늦게 도착하는 인상. 다음 sprint 부턴 PR 머지
  완전 종료 → handoff doc 한 번에.

## 3. 시도할 것

- **sprint 진입 전 fresh session 체크리스트**: (a) `docs/solon/handoff/*.md` 최신순
  3 개 읽기, (b) `.sfs-local/sprints/` 미닫힘 sprint 확인, (c) user 와 "이 sprint
  가 맞는 본 작업?" 1회 confirm. 본 sprint 에서 누락된 단계.
- **plan AC 옆에 부속 ADR slot**: sentinel/null 정책, race window 정책, FK on-delete
  정책 등 cross-cutting 결정은 AC text 안이 아니라 인접 ADR 로 기록. round-trip 감소.
- **자동 close 체크**: `sfs retro --close` 직전 (a) 모든 PR state=MERGED, (b) working
  tree clean, (c) main.ts line delta 기록, (d) handoff doc 존재 — 4 항목 1줄 확인.

## 4. 이어갈 것

- **다음 sprint = main.ts DDD 분해 (A: routing/shell → B: PDF workspace → C: subject
  views → D: state/sync)**. 인계: `docs/solon/handoff/20260524-main-ts-ddd-split-handoff.md`.
- **user manual 잔여 (prod-applied PASS 전제)**:
  - prod backfill `MASTER_USER_ID=<prod-master-cuid> ... --apply`
  - AC7 step 3 NOT NULL 마이그레이션 prod apply (backfill 검증 후)
  - iPad 실기기 QA (펜 + ESC + starMark + 768px + DatePicker)
- **Datadog dashboard/monitor UI sprint** (별도 ops backlog): `sync.put.success/failure`,
  `annotation.cas.stale`, `annotation.batch.size`, RUM funnel + APM/Logs 상관관계.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다 (10 PR 머지, finding 전부 패치)
- [x] workbench 가 접혔다 (working tree clean, main FF)

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=medium (412 tracked files), domains=0, last_review=unknown, infra_signals=8, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-24T23:41:39+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
