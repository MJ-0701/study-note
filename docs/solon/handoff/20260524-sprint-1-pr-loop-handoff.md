---
handoff_type: "claude-continuation"
created_at: "2026-05-24T13:35:00+09:00"
source_session: "Claude main (autonomous /goal run)"
target_session: "Claude next session"
topic: "sprint-W21-sprint-1 S2~S7 + iPad media + AC7 step3 + Datadog — 8 PR codex loop"
status: "8 PR open, 4 PASS, 4 pending R5+ verdict"
---

# Sprint-1 PR Loop Handoff (2026-05-24)

## 1. 사용자 의도

sprint-W21-sprint-1 의 모든 미완 AC 를 100% 누락 없이 구현 + push. 역할 분리:

- **Claude Code**: study-note 앱 구현 담당.
- **Codex (별도 thread)**: QA/QC monitor only — study-note 앱 코드 수정 X.
- **Codex monitor durable evidence home**: `/Users/mj/agent_architect/llm-wiki/external-observations/study-note/` (study-note 가 아님).

사용자 권한 위임: 현 세션 동안 GitHub push / 사용자권한 다 허용. 막힘 없이 진행. 누락 절대 X. 세션 클리어도 자체 판단.

## 2. 이번 세션 완료 범위

### Merged to main

- PR #47 (S1 — Term/Subject hierarchy + admin CRUD + backfill) — codex 6 round PASS, squash merge `7796168`.
- PR #48 (S5 — ESC tool reset) — codex 3 round PASS, squash merge `0c3102c`.

### Backfill local (DEV)

- `MASTER_USER_ID=user-dev-1` (local DB Dev User, studentNumber=20260001)
- `scripts/backfill-default-term.ts --apply` 실행 — 4 subjects 모두 termId 채움.
- 기본 Term cuid = `cmpil2eef0000s9hx4qqng7fk` (local DB).
- **prod backfill 은 미실행** — MASTER_USER_ID 는 prod DB 의 master role user.id 확인 필요.

### Pushed PR (8 open, all mergeable, Vercel preview SUCCESS)

| PR | Branch | HEAD | Codex Verdict | Rounds | Status |
|----|--------|------|---------------|--------|--------|
| #49 | feature/sprint-1-s2-sidebar-term-nav | `6d816ea` | pending R4+ | 3 | inline=5, 1 R3+ finding 추가 (localStorage guard) fix 후 push 완료 |
| #50 | feature/sprint-1-s7-subject-move | `db26297` | **PASS** 👍 | 2 | done |
| #51 | feature/sprint-1-s3-classdate-date-migration | `f426f05` | pending R5+ | 4 | epoch sentinel '1970-01-01' 통일 fix 후 push (stale finding 1건 있음) |
| #52 | feature/sprint-1-s6-starmark-widget | `b1704d8` | **PASS** 👍 | 2 | done |
| #53 | feature/sprint-1-s4-ipad-pen-rt-paint | `82b2a9b` | pending R3+ | 2 | nested RAF measure-after-paint + reattach helper fix 후 push |
| #54 | feature/sprint-1-ipad-media-breakpoint | `dd9d24f` | **PASS** 👍 | 1 | done |
| #55 | feature/sprint-1-ac7-termid-notnull | `f80e7a1` | **PASS** 👍 | 2 | done |
| #56 | feature/sprint-1-datadog-metric-emit | `5772276` | **PASS** 👍 | 1 | done |

## 3. 즉시 처리 가능 (codex round 잔여 verdict 대기)

### PR #49 (S2 sidebar) — R3+ pending

마지막 push: `6d816ea` (toggleSidebarTermOpen localStorage try/catch).
이전 R2 finding (NaN guard + null cache fallback) 처리됨.
R3+ codex 응답 대기. 추가 finding 나오면 같은 패턴 fix.

### PR #51 (S3 classDate Date migration) — R5+ pending

마지막 push: `f426f05` (force-pushed after amend).
R4 fix = epoch sentinel `1970-01-01` 통일. FE 의 `PDF_MATERIAL_UNASSIGNED_WIRE_DATE = "1970-01-01"` + migration 의 `UPDATE classDate = '1970-01-01' WHERE ...`.

**Stale finding 1건 있음** (codex R4 P1 "Define unassigned wire-date constant before checking it") — codex 가 amend 직전 (`875df1c`, broken build) 의 코드 봤음. 현 `f426f05` 에는 const 가 main.ts:126 에 있음. codex 재평가 필요 — `gh pr comment 51 --body "@codex review"` 재트리거.

### PR #53 (S4 iPad pen) — R3+ pending

마지막 push: `82b2a9b` (nested RAF measure-after-paint + reattachLiveInkPolyline).
R2 finding 처리됨 (committed flag + render skip + per-stroke markId). R3 finding 도 fix (measure timing + always render + reattach).
R3+ codex 응답 대기.

## 4. PR 처리 순서 권장

1. **첫 단계**: 모든 pending PR 에 `@codex review` 재트리거 + 대기 (각 5-10분).
2. PASS 받은 PR squash merge:
   ```bash
   gh pr merge <number> --squash --delete-branch
   ```
3. merge 순서 권장 (의존성 + 영향 적은 것부터):
   - #54 (CSS only, 단독) — already PASS
   - #56 (BE logger metric + wiki doc) — already PASS
   - #55 (AC7 step 3 NOT NULL) — already PASS, **prod backfill --apply 후에 prod 적용**
   - #50 (S7 Subject move) — already PASS
   - #52 (S6 starMark widget) — already PASS
   - #49 / #51 / #53 — PASS 받으면 merge

## 5. 잔여 manual 작업 (user / next session)

### Prod backfill (S1 PR #47 merged 후, 아직 미실행)

```bash
# prod MASTER user.id 확인 (Azure MySQL Flex)
# 그 다음:
MASTER_USER_ID=<prod-master-cuid> node --experimental-strip-types --no-warnings scripts/backfill-default-term.ts          # dry-run
MASTER_USER_ID=<prod-master-cuid> node --experimental-strip-types --no-warnings scripts/backfill-default-term.ts --apply  # apply
```

이 단계가 끝나야 PR #55 (AC7 step 3 NOT NULL tighten) 의 prod migration 적용 가능. 그 전엔 ER_INVALID_USE_OF_NULL 으로 abort.

### Manual QA (project-applied PASS 전제)

- **iPad Safari** pen 그리는 중 ESC → stroke commit + tool=read 전환 (S5).
- **iPad Safari** pen 100ms 이내 next-paint Datadog RUM event 확인 (S4).
- **iPad portrait 768px** → sidebar tablet layout 유지 (PR #54).
- **admin UI** 학기/과목 CRUD + Subject 이관 + 별표 widget 추가/리사이즈/삭제.
- **PDF upload** date picker (S3) + 미지정 옵션 (epoch sentinel 1970-01-01 표시).

### Datadog dashboard / monitor (별도 sprint backlog)

`docs/solon/handoff/20260523-datadog-ops-monitoring.md` §2 의 2차 sprint. 본 sprint 의 PR #56 = 코드 측 metric emit + wiki flow doc 만. UI 셋팅은 user scope.

## 6. 현재 작업 트리 주의

- 현 branch: `feature/sprint-1-s2-sidebar-term-nav` (마지막 fix push 완료, working tree clean).
- 8 PR feature branch 별로 분리됨.
- uncommitted: `.gitignore`, `SFS.md` (SFS runtime auto-emit, 이전 sync commit 후 빈 trailing 변경 — 무시 가능).

## 7. SFS 0.6.112 acceptance ledger

study-note local: `.sfs-local/sprints/2026-W21-sprint-1/log.md` 의 `2026-05-24T01:18:00+09:00` gate6-implementation-ledger entry 가 S1 + S5 AC 매핑 보존. S2~S7 + iPad media + AC7 step 3 + Datadog 도 이번 세션에서 commit body / PR body 에 AC 매핑 명시. log.md 후속 entry 추가 권장.

Codex monitor durable evidence (agent_architect):
`/Users/mj/agent_architect/llm-wiki/external-observations/study-note/2026-05-23-sprint-w21-s1-s5.md` 가 S1+S5 까지 기록. 나머지 슬라이스 + R1~R4 codex loop pattern 도 별도 entry 권장.

## 8. Codex finding 패턴 학습 (SFS 0.6.113+ harness 후보)

이번 세션에서 반복 catch 된 pattern (self-CPO 가 매번 누락):

1. **DB FK vs service preflight 정합**: deletedAt 필터, RESTRICT vs SET NULL, count-then-action race window.
2. **Sentinel ↔ wire format 일관성**: FE in-memory marker vs BE strict format 의 boundary 변환 race + silent mislabel 위험.
3. **In-memory module state cleanup completeness**: `cancel*OnEsc` 류 helper 가 같은 family 의 모든 변수 비우는지 + side-effect (store mutation) revert 포함하는지.
4. **RAF timing**: same RAF (pre-paint) vs nested RAF (post-paint) 측정 차이.
5. **Network race guard**: async user-scoped fetch 가 resolve 시점 user 동일성 재확인.
6. **Migration cleanup 의 silent rewrite 위험**: legacy normalize target 이 valid-looking 값이면 silent mislabel — sentinel 사용 권장.

agent_architect 의 `sfs-harness-gaps` 등에 SFS 0.6.113 invariant 후보로 등록 권장.

## 9. Claude 시작 프롬프트 (다음 세션)

```text
docs/solon/handoff/20260524-sprint-1-pr-loop-handoff.md 읽고 이어서 작업해.
8 PR (#49-#56) 중 4 개 (#50/#52/#54/#55/#56) 는 codex PASS. 나머지 (#49/#51/#53)
는 마지막 R3-R4 fix push 후 codex 재평가 대기.

먼저 모든 pending PR codex 상태 확인:
  for pr in 49 50 51 52 53 54 55 56; do gh pr view $pr ...; done

PASS 받은 PR squash merge (handoff §4 순서). pending PR 은 codex 재트리거 +
finding 처리. PR #51 의 stale finding (wire-date constant) 은 amend 직전
commit 봤기 때문 — 재트리거 하면 PASS 가능.

prod backfill (handoff §5) 은 prod MASTER user.id 확인 후 user 가 직접 실행.
```
