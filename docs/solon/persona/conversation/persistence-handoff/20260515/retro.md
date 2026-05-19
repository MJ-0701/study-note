---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W20-sprint-8"
workspace: "conversation-persistence-handoff"
handoff_dir: "docs/solon/persona/conversation/persistence-handoff/20260515"
goal: "conversation persistence handoff β"
created_at: ""
last_touched_at: "2026-05-15T15:31:26+09:00"
closed_at: 2026-05-15T15:31:26+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **AC 별 pure 함수 추출 + node:test 분리 패턴 (sprint-7 slice-1 → sprint-8 일관 재사용)**.
  `deriveTitleFromQuery` (slice-1) / `buildRecentConversationItems` (slice-2) /
  `parseConversationRoute` (slice-3) 모두 React 의존 0. vitest 부재 환경에서도 회귀
  가드 단단. spec 묶음 = service 15/15 + recent 7/7 + route 9/9 = 31 case, sprint
  전체에서 1건도 깨지지 않았다.
- **PII guard double-check pattern**. backend `deriveTitleFromQuery` 의 `\d{8}` +
  `[a-f0-9]{32,}` redact + smoke (g) 의 `assert(!/\d{8}/.test(derivedTitle))` +
  `assert(!/[a-f0-9]{32,}/i.test(...))` 양쪽 모두 명시. 한쪽 약화돼도 다른쪽이
  catch 보장. sprint-7 retro §1 의 동일 패턴 재현.
- **slice-2 의 optional props 전략으로 commit-by-commit 컴파일 안전 보장**.
  `PersonaSidebar` 의 `conversations?` / `activeConversationId?` 가 default `[]` /
  `undefined` 라서 slice-2 단독 commit (App.tsx 미수정) 도 빌드 통과. slice-3 가
  실제 wire — 점진적 통합 안전.
- **URL fragment + localStorage dual-channel + 무한 루프 가드**. `if (window.
  location.hash !== expectedHash)` 한 줄로 hashchange 의 ping-pong race 차단.
  `history.replaceState` 사용으로 back stack 폭발 회피.
- **Prisma 직접 insert 로 LLM/corpus 우회한 smoke**. `smoke-conversation-list` 가
  Turn row 를 Prisma 로 만들어 LIST contract 만 검증 — `smoke-persona-turn` 의
  LLM/corpus 통합과 lane 분리. 빠른 회귀 가드 + 의존성 폭주 회피.

## 2. 문제

- **G6 cross-CPO partial — 1차 만에 evidence packaging 한계 도달**. reviewer 가
  `implement.md` §6~17 (slice-2/3/4 본문) 을 못 보고 "stops at slice-2 header"
  라고 오인. sprint-7 retro §2 와 동일 — bundle 의 file truncation 가 design lens
  evidence requirement 와 충돌. 본 sprint 도 partial-accepted 로 advance, marginal
  value 0 추가 round 회피.
- **`POST /v1/conversations` 가 archetypeFor 거부로 `c-language` 막음**. smoke (d)
  의 subject filter 검증을 위해 다른 subject 의 Conversation 필요 → Prisma 직접
  insert 로 우회. backend create endpoint 의 archetype 검증과 LIST endpoint 의
  subject 무차별 row 허용 사이 inconsistency 노출 (LIST 는 어떤 subject 도 보여줌).
  의도된 trade-off 인지 정책 결정 필요 — 후속 sprint 의 decision item.
- **vitest infra 부재의 누적 영향**. slice-2 (sidebar React DOM) / slice-3 (App.tsx
  useEffect race) 둘 다 React 렌더 자동 검증 미포함 → manual UAT 의존. sprint-7
  retro §4 chore 그대로 carry-over.
- **persona-engine `_count` query 의 Prisma type 추론 한계**. service 의
  `rows: any[]` cast 가 본 sprint 의 type safety 약점. Prisma generated types 가
  `_count` include 시 narrower type 제공하는데 사용 안 함. 후속 cleanup 후보.
- **listConversations port 의 silent error handling**. catch block 이 빈 list 로
  fallback — 사용자가 backend 장애 시 sidebar 의 "아직 대화 없음" placeholder 만
  보고 정상 비어있다고 오인 가능. 명시 error toast 미노출 trade-off (UX 단순화 우선).

## 3. 시도할 것

- **`docs/solon/<workspace>/implement.md` 의 슬라이스별 file split 검토**. 현 단일
  파일 §1~§17 누적 패턴이 reviewer bundle 의 truncation 트리거. `implement-slice-1.md`
  / `-slice-2.md` 등으로 분리하면 각 파일이 짧아져 truncation 회피 + reviewer 가
  파일 단위 인지. sprint-9 시작 시 적용 검토.
- **backend create endpoint 의 archetype 검증 정책 lock**. (a) LIST 도 archetype
  외 row 미노출 (strict) / (b) 현 상태 유지 (LIST 무차별, create 만 strict).
  decision ADR 작성 후 sprint scope 추가.
- **`apps/web` 의 vitest + jsdom + react-testing-library 도입** (sprint-7 retro §4
  chore). slice-2/3 의 React DOM/useEffect 시나리오 자동 검증 가능. 별 chore
  sprint 또는 후속 sprint 의 sub-slice.
- **Prisma generated type 활용 — service `any[]` 제거**. `_count` include 패턴의
  타입 추론 활용. `packages/persona-engine` 의 type safety 향상.
- **listConversations 의 retry / refresh UI**. sidebar 의 "다시 불러오기" 버튼 +
  fetch 실패 시 toast 명시. 후속 sprint UX chore.

## 4. 이어갈 것

- **CDP design smoke** (sprint-7 retro §4 carry-over 동일) — slice-1 의 gate UX,
  slice-2 의 sidebar "최근 대화" group, slice-3 의 conversationNotFound 카드 시각
  evidence 회수. 별 chore sprint.
- **vitest infra 도입** (sprint-7 retro §4 + 본 retro §3 중복 항목). 누적 우선순위
  ↑.
- **handoff γ (운영 ADR / Azure / DigitalOcean)** — sprint-5-handoff §1 의 마지막
  남은 handoff. sprint-7 (α) + sprint-8 (β) close 후 다음 본부 후보.
- **conversation title 사용자 명시 입력 (D1=b)** — 본 sprint 는 D1=a auto-truncate.
  사용자 명시 입력은 후속 sprint.
- **conversation archive / soft delete (D4)** — 본 sprint 미포함. 후속 sprint.
- **pagination (D5)** — 무제한 lock 의 의도된 trade-off. conversation 수가 운영
  중 폭증 시 sprint-9+ 에서 cursor pagination 도입.
- **list item dots/메뉴 UI** — brainstorm §9 의 "완전히 빈" lock 해제 시점에 archive /
  rename / delete 메뉴 도입.

## 5. 종료 체크

- [x] report 가 최신이다 — `docs/solon/persona/conversation/persistence-handoff/20260515/report.md`
      (sfs retro close adapter 자동 생성).
- [x] review 조치가 완료 또는 이월됐다 — G6 **PASS (user waived)** — §6 참조.
- [x] workbench 가 접혔다 — sprint-8 closed_at = 2026-05-15T15:31:26+09:00
      (`sfs retro` close adapter 출력).

## 6. G6 PASS — user waiver (audit trail)

**근거**: 0.6.87 `cpo-evaluator.md` 의 명시 허용 — "PASS unless SFS review records
that verdict **or the user waives the gate**".

**시점**: 2026-05-15

**진행 요약**:
- G6 1차 cross-CPO (codex executor) verdict = partial. findings:
  - F1/F2 = evidence bundle truncation (단일 implement.md 360 lines → reviewer 가
    slice-2 header 이후를 못 봤다고 오인).
  - F3 = reviewer-runtime profile metadata (`gpt-5.5` xhigh) 부재 — artifact 무관.
- evidence rework (commit `237e5d1`):
  - implement.md → slice 별 file split (각 ≤ 140 lines, bundle truncation 회피).
  - `pnpm smoke:conversation-list` 실행 output 명시 embed (index §3.1, 7 시나리오
    모두 통과 + "Conversation list smoke passed").
  - PR #8 P1+P2 fix evidence 별 file (`implement-pr-p1-p2-fix.md`).
  - AC ↔ slice ↔ 산출물 + 검증 종합 표 (index §2 / §3.2 / §3.3).
- G6 재실행 시도 → sprint-8 close 된 상태라 `sfs review --gate 6` 가 "no active
  sprint" 거부. `sfs` 가 closed sprint reopen 명령 미제공.

**실제 product defect 평가**: 0건.
- backend LIST endpoint (`ConversationController.list` + `ConversationService.list`)
  spec 16/16 + smoke 7 시나리오 (a-g) 통과.
- frontend (sidebar / URL routing / 404 안내) — spec 7 + 9 통과 + tsc + vite 빌드.
- PR #8 Codex bot 발견 P1 (turn submit race) + P2 (derivedTitle redact 순서) fix
  push 완료 (`2591132`). spec 회귀 가드 1 case 추가, 16/16 통과.
- 전체 회귀 0: backend 11/11 + persona-engine 16/16 + web 4 spec 모두 통과.

**waiver 후 권한**: main merge 진행 가능 (사용자 명시 의향).

**후속 sprint 의 자동화 후보** (재발 방지):
- implement.md slice 별 file split 을 sprint-9 시작 시 plan §5.2 의 산출물 명세에
  처음부터 강제 (sprint-7 retro §3 의 "evidence 보일러플레이트 plan 단계 작성"
  연장선).
- `sfs review --gate 6` 의 closed-sprint reopen path 가능성 검토 (solon-product
  upstream feature 요청 후보).

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (262 tracked files), domains=0, last_review=partial, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-15T15:31:26+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
