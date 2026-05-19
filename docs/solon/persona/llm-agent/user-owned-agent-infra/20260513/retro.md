---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W20-sprint-1"
workspace: "user-owned-llm-agent-claude-gpt-codex-gemini-claude-cli-ai-agent-bedrock"
handoff_dir: "docs/solon/persona/llm-agent/user-owned-agent-infra/20260513"
goal: "user-owned LLM agent 연동 인프라 — 사용자 본인 인증 + 본인 Claude/GPT(Codex)/Gemini 연결 (로컬: 본인 claude CLI / 웹·앱 배포 시: 본인 AI agent 자격증명, bedrock 잠정 보류)"
created_at: ""
last_touched_at: "2026-05-13T11:16:10+09:00"
closed_at: 2026-05-13T11:16:10+09:00
---

# 회고

> 본 sprint = 2026-W20-sprint-1 / user-owned LLM agent 연동 인프라.
> Gate 6 codex verdict = partial (CTO push-back 4건 — F1/F2/F3 push-back, F4 fix). Sprint closed with explicit push-back evidence in review.md.

## 1. 계속할 것

- **Decision 0002 worker routing** — Opus 4.7 = CTO/CPO, Sonnet 4.6 + Codex Spark = worker. tier 매핑은 `.sfs-local/model-profiles.yaml` SSoT.
- **slice 별 dual CPO 의무** — self-CPO (Opus 4.7) + cross-CPO (다른 도구, implementer ≠ reviewer tool). slice-2 의 codex cross-CPO 가 2건 의 blocking 발견 = 실질 가치 입증.
- **spec lock 단계 (CTO Opus 4.7)** — implementation 전에 §1~§5 의 의도/파일/AC/error code 까지 lock. 본 sprint 의 4 slice spec (slice-2~5) 이 worker rework 누적 비용을 ↓.
- **ADR-based scope narrowing** — ADR 0003 (AC2-O narrow) 이 schema 영역 재오픈 회피 + Gate 6 review burden ↓. 후속 sprint 에 deferred 항목 명시 carry.

## 2. 문제

- **Sonnet 4.6 worker 의 permissive default 패턴 3회 발생**:
  - slice-2: alias leak (`displayName||studentNo`) — spec §1 lock 위반, cross-CPO codex 발견.
  - slice-3: fragile `dist/cjs` import in smoke script — public API 우회, advisor 발견.
  - slice-4: 모달 × 버튼 aria-label 누락 가능성 — advisor 가 self-CPO 후 검증 요청 후 확인.
- **codex 의 thrashing 패턴 (slice-1 review 40+분)** — large context loading (sfs context cat kernel/index/commands) 후 reasoning 멈춤. constraint 명시 부족 시 발생. slice-2 부터 hard constraint (read cap + time budget + output format) 명시 후 5분 내 verdict.
- **Gate 6 codex review 의 factual error (F3)** — `apps/api/src/auth/auth.controller.ts` 만 보고 guard 파일 미read. prompt 가 222KB / 5599 lines 임에도 evaluator 가 본 영역 scope down 못함. push-back 의무 발생 = 본 sprint 의 cross-CPO 결정성 ↓.
- **plan §5 의 미존재 path 인용** (slice-3 진입 직전 발견) — `apps/api/src/corpus/corpus.repository.ts` 파일 자체 없음. 실제 retrieval = `packages/persona-engine/src/services/retrieval.service.ts`. plan 작성 시 코드 verification 누락 → ADR 0003 narrow 로 흡수.
- **smoke-persona-turn 의 ConversationService.create() 경로 미커버** — AC5 의 회귀 smoke 가 schema NOT NULL FK 의 새 제약 (Conversation.ownerId) 실제 exercise 안 함. slice-5 surgical fix 적용 후 build pass 만 verify.

## 3. 시도할 것

- **worker prompt template 갱신**: 후속 sprint 의 모든 worker dispatch prompt 에 "no permissive defaults — fail tight, name attributes explicit; alias fallback X; internal package path import X (public API only)." 명시. spec lock + worker prompt 두 곳 모두.
- **plan 단계 (Gate 3) 의 file verification 의무화**: spec 안 file path 가 `grep -l` 또는 `find` 로 verify 못 되면 spec lock 거부. 본 sprint 의 ADR 0003 같은 mid-sprint rework 회피.
- **Gate 6 codex review prompt builder 개선**: ADR 인용 + slice-level rework evidence 명시 인용 (sfs runtime side improvement). Solon SFS feedback issue 로 carry.
- **CTO 의 worker prompt 가 operational constraints 까지 명시**: code surface 외 + runtime env (Bash permission, env var prep, test DB up) 까지 spec. slice-5 worker 의 Bash permission gate 사고 회피.
- **slice 별 cross-CPO tool 선택 의식적**: mechanic mod → codex 강함. UI/copy → advisor 적합. 1 line fix → advisor 충분. 본 sprint 의 slice-4 advisor + slice-5 advisor 사용 = 적절한 routing.

## 4. 이어갈 것

본 sprint 의 handoff cleanup 9건 (`/.sfs-local/sprints/2026-W20-sprint-1/handoff.md`):
1. `scripts/smoke-backend-contract.mjs` (567 lines) Bearer → cookie migration
2. Corpus.ownerId 도입 — ADR 0003 의 deferred (다인 host 활성화 시점)
3. MCPOnboardingGate 의 redundant /me fetch
4. onboarding 페이지 스크린샷 첨부
5. page footer sticky vs natural flow (UAT 결과 follow-up)
6. Conversation routes 인증 + ownerId 본인 user 라우팅
7. smoke 가 ConversationService.create() 경로 커버
8. 운영 deploy `STUDY_NOTE_AUTH_DEV_ENABLED` mechanism (Gate 6 F2 push-back 의 후속)
9. public release 시 MCP architecture 재설계 (stdio + local DB → remote HTTP/SSE 또는 API proxy)

본 sprint 의 ADR 흐름:
- 0001 (worker routing) → superseded by 0002
- 0002 (Opus = CTO/CPO, Sonnet = worker) → accepted
- 0003 (AC2-O narrow — Corpus.ownerId deferred) → accepted

## 5. 종료 체크

- [x] report 가 최신이다 — `docs/solon/.../20260513/report.md` 작성
- [x] review 조치가 완료 또는 이월됐다 — F4 즉시 fix, F1/F2/F3 push-back evidence + handoff item 등록
- [x] workbench 가 접혔다 — sprint closed via `sfs retro`

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (189 tracked files), domains=0, last_review=partial, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-13T11:16:10+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
