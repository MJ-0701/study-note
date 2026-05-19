---
phase: report
status: final
sprint_id: "2026-W20-sprint-1"
workspace: "user-owned-llm-agent-claude-gpt-codex-gemini-claude-cli-ai-agent-bedrock"
handoff_dir: "docs/solon/persona/llm-agent/user-owned-agent-infra/20260513"
goal: "user-owned LLM agent 연동 인프라 — 사용자 본인 인증 + 본인 Claude/GPT(Codex)/Gemini 연결 (로컬: 본인 claude CLI / 웹·앱 배포 시: 본인 AI agent 자격증명, bedrock 잠정 보류)"
created_at: "2026-05-13T11:16:10+09:00"
last_touched_at: "2026-05-13T11:16:10+09:00"
closed_at: "2026-05-13T11:16:10+09:00"
---

# 보고서

## 1. 결과

- 목표: user-owned LLM agent 연동 인프라 — 본인 인증 + MCP server 보강 + onboarding 가이드 + bedrock/API key 미지원 명시
- 상태: **done** (5 slice 모두 완료, Gate 6 CTO push-back evidence 첨부 후 close)
- 판정: codex automated verdict = partial; CTO push-back 후 sprint close (F4 fix, F1/F2/F3 push-back evidence)
- 한 줄 결과: 학번+이름 sign-in (httpOnly cookie + PII redactor) + MCP `get_persona_prompt` + env fail-closed + Claude Desktop/Cursor onboarding 가이드 + footer 미지원 카피 + handoff 9건 cleanup item 인계

## 2. 완료한 것

- **slice-1 schema**: `Conversation.ownerId` NOT NULL FK + `User.devUserFlag` + 3 dev user seed (user-dev-1 active, user-dev-2 active, user-dev-3 inactive)
- **slice-2 auth**: route migration `/v1/auth/{sign-in,sign-out,me}`, httpOnly cookie (HttpOnly+Secure+SameSite=Lax, no Max-Age), `STUDY_NOTE_AUTH_DEV_ENABLED` guard, PII redactor (`****1234`/`김**`), 5 smoke (AC1/N/S/D/P), `ApiExceptionFilter` 글로벌 등록
- **slice-3 MCP**: `get_persona_prompt` tool, `resolveOwnerOrExit` (5 fail-closed cases: AUTH_DEV_DISABLED / env missing / format invalid / not-found / devUserFlag=false), runtime null guard, MCP tool 표면 = 2 entries lock (F4 history 도달 불가), 4 smoke (tool-list / fail-closed / env-validate / persona-prompt) + 27 unit tests
- **slice-4 onboarding UX**: `MCPOnboardingGate` first-time modal + `🧩 MCP 연동` sidebar group + `/onboarding-mcp.html` (Claude Desktop + Cursor 단계 + JSON snippet + 트러블슈팅 + 미지원 카피) + `docs/onboarding/mcp-{claude-desktop,cursor}.md` 1차 draft (스크린샷 placeholder)
- **slice-5 footer + regression**: persona-turn 페이지 footer 1줄 (Bedrock + API key 미지원), `smoke:persona-turn` + `smoke:corpus-ingest` exit 0, ConversationService.create() 의 ownerId surgical fix (`"user-dev-1"` hardcoded per ADR 0003), sprint handoff doc (9 cleanup items + retro)

## 3. 결정

- **ADR 0002** — Opus 4.7 = CTO/CPO (strategic_high + review_high), Sonnet 4.6 = worker (execution_standard). ADR 0001 의 "판단=Sonnet" attribution supersede. SSoT = `.sfs-local/model-profiles.yaml`.
- **ADR 0003** — AC2-O narrow: Corpus 모델에 ownerId 추가 X. 본 sprint 의 owner 격리 3 layer = (a) MCP tool 표면 제한 (2 entries), (b) MCP env validate fail-closed, (c) Conversation.ownerId. Corpus.ownerId = 다인 host 활성화 sprint 시점에 도입.
- **F4 fix (Gate 6)** — `SESSION_TOKEN_PEPPER` env 를 MCP client config 3 파일에서 제거. MCP server (PersonaModule context) 가 pepper 의존 X (auth 모듈 미import).
- **MCP architecture = single-user-host (handoff #9 lock)** — designer 본인 (mj) = 사용자, server = local host, MCP = local stdio. public release = separate ADR (사용자 의향 표명 trigger 까지 inactive).

## 4. 검증

- **자동**:
  - `pnpm --filter @study-note/auth build`: exit 0
  - `pnpm --filter @study-note/api build`: exit 0
  - `pnpm --filter @study-note/web build`: exit 0 (3 dist entries: index / persona-turn / onboarding-mcp)
  - `pnpm --filter @study-note/persona-engine build`: exit 0
  - `pnpm --filter @study-note/mcp build`: exit 0
  - `pnpm smoke:persona-turn`: exit 0 (PASS persona=디공이 response_chars=386 sources=3)
  - `pnpm smoke:corpus-ingest`: exit 0 (PASS chunk_count=7 dimension=768 idempotency=true)
  - apps/mcp 27 unit tests pass
- **수동 확인 (사용자 UAT 필요)**:
  - persona-turn 페이지 첫 방문 → MCPOnboardingGate modal 표시 + localStorage `study-note.mcp.onboarding-shown` set
  - 사이드바 `🧩 MCP 연동` link → `/onboarding-mcp.html` 도착
  - onboarding 페이지의 JSON snippet 복사 버튼 동작 + 본인 Claude Desktop config 에 적용 → corpus 호출 정상
  - persona-turn 페이지 footer 의 미지원 카피 노출 + link 동작

## 5. 위험 / 후속

- **위험 (수용)**:
  - 학번+이름 sign-in = weak auth surface — Q5 본인 only + local-only 위험 수용. 운영 deploy 시 OAuth/SSO/MFA 의무 (handoff γ).
  - smoke:persona-turn 가 ConversationService.create() 경로 미커버 — schema NOT NULL FK 의 새 제약을 실제 exercise 안 함. surgical fix 적용 + build pass 만 verify (handoff #7).
- **후속** (handoff.md 9건):
  1. smoke-backend-contract.mjs Bearer → cookie migration (567 lines)
  2. Corpus.ownerId 도입 (ADR 0003 supersede 시점)
  3. MCPOnboardingGate 의 redundant /me fetch
  4. onboarding 페이지 스크린샷 첨부 (사용자 UAT 후)
  5. footer sticky vs natural flow (UAT 결과 follow-up)
  6. Conversation routes 인증 + ownerId 본인 user 라우팅
  7. smoke ConversationService.create() coverage
  8. 운영 deploy STUDY_NOTE_AUTH_DEV_ENABLED mechanism (Gate 6 F2)
  9. MCP architecture = single-user-host design lock (public release 의향 trigger 까지 inactive)

## 6. 남긴 것 / 접은 것

- **남김 (durable docs)**: `docs/onboarding/mcp-claude-desktop.md`, `docs/onboarding/mcp-cursor.md`, `docs/solon/.../20260513/{retro,report}.md`
- **private archive (`.sfs-local/`)**: `sprints/2026-W20-sprint-1/{brainstorm,plan,slice-2-spec,slice-3-spec,slice-4-spec,slice-5-spec,review,handoff}.md` + decisions/0001-0003 + tmp/review-{prompts,runs}

## 7. 다음

- 사용자 UAT (Claude Desktop / Cursor 실제 호출) 후 후속 sprint 우선순위 결정:
  - **handoff cleanup PR** (smoke-backend-contract 567 line refactor) — 별 sprint 권장
  - **handoff #6 Conversation routes 인증** — 작은 sprint (controller @UseGuards + req.user.id 주입 + ConversationService 시그니처 확장)
  - **handoff #8 운영 deploy ADR γ** — operational fail-closed mechanism 결정
  - **페르소나 4 종 확장** (현재 디공이 1명만) — 사용자 brainstorm Q6 의 후속
- 사용자가 distribute 의향 표명 시 handoff #9 의 architecture sprint 진입

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (189 tracked files), domains=0, last_review=partial, infra_signals=5, ui_signals=12
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- recommend: `qa` activate (light) — regression smoke + AC checks; triggers: review!=pass or medium+ codebase
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-13T11:16:10+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
