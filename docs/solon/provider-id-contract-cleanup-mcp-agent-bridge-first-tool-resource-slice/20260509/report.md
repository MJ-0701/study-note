---
phase: report
status: final
sprint_id: "2026-W19-sprint-2"
workspace: "provider-id-contract-cleanup-mcp-agent-bridge-first-tool-resource-slice"
handoff_dir: "docs/solon/provider-id-contract-cleanup-mcp-agent-bridge-first-tool-resource-slice/20260509"
goal: "provider id contract cleanup + MCP agent bridge first tool/resource slice"
created_at: "2026-05-09T16:21:51+09:00"
last_touched_at: "2026-05-09T17:26:14+09:00"
closed_at: "2026-05-09T17:26:14+09:00"
---

# 보고서

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 결과

- 목표: provider id contract 의 3-layer (`AgentId`/`ProviderId`/`ModelTag`) 정식 분리 (Lane A) + MCP server first slice (stdio + `get_chunks` tool, backend repo entry) (Lane B). sprint-1 stored history backward compat (Q5=A) + sprint-3/4/5 invariant 보존.
- 상태: **done**
- 판정: **Gate 6 (Review) PASS** — codex CPO security lens, round 4 (2026-05-09T08:22:48Z), independence risk = warning (generator metadata `unknown` — sprint-3/4/5 systemic). Gate 3 round 3 (api-contract) PASS, Gate 6 round 4 (security) PASS.
- 한 줄 결과: AC1~AC9 모두 충족. Lane A 의 3-layer types 가 sprint-1 stored history 그대로 호환. Lane B 의 MCP first slice 가 사용자 Claude Desktop 등록 후 tool call 동작 확인 (empty result = success path, plan AC6 spec 그대로). codex security lens 7 finding 모두 patch.

## 2. 완료한 것

- **Lane A (3-layer types)**:
  - `backend/src/persona/providers/agent-id.ts` (A) — AgentId enum + ProviderId branded + ModelTag branded + mapping helpers (`providerIdFromAgent`, `modelTagFromProvider`) + type guards (`isProviderId`, `isModelTag`).
  - `backend/src/persona/providers/llm-provider.port.ts` (M) — `LlmGenerateResult.provider/modelName` 타입 강화 (`ProviderId|string` / `ModelTag|string`, runtime string compatible).
  - `backend/src/persona/providers/__tests__/agent-id.spec.ts` (A, 13 case) — mapping helper round-trip + invalid throw + sprint-1 stored string recognize.
  - `backend/src/persona/services/__tests__/conversation.service.spec.ts` (M, +1 case) — sprint-1 stored history `provider`/`modelName` 그대로 history() 응답에 포함.
  - `src/persona-turn/api/personaTurns.ts` (M, JSDoc) — frontend `Agent` type 의 single-source 명시.
- **Lane B (MCP first slice)**:
  - `backend/src/mcp-server/get-chunks.tool.ts` (A) — `executeGetChunks` (input validation + retrieval + safe-path) + `makeGetChunksHandler` (CallToolResult wrap) + `GET_CHUNKS_INPUT_SCHEMA`.
  - `backend/src/mcp-server/index.ts` (A) — `buildMcpServer(retrieval)` factory + low-level Server + setRequestHandler + StdioServerTransport + NestJS app context bootstrap.
  - `backend/src/mcp-server/__tests__/get-chunks.tool.spec.ts` (A, 11 case) — happy / 3 invalid / empty / throw redact / 3 path safe (smoke / file / Windows + drive + mixed-sep) / 2 non-string query.
  - `backend/src/mcp-server/__tests__/handshake.spec.ts` (A, 1 case) — InMemoryTransport pair + Client + 3 단계 handshake/list/call.
  - `package.json` (M, +2 dep + 1 script) — `@modelcontextprotocol/sdk@^1.29.0`, `zod@^4.4.3`, `mcp:server` script.
  - `README.md` (M, +35 lines) — MCP server 단락 + Claude Desktop config 예시 + security note (round 1 F3 carry).
- **Security 강화 (codex Gate 6 4 round 7 finding)**:
  - retrieval err redact (wire = "retrieval failure" generic, stderr opt-in `STUDY_NOTE_MCP_VERBOSE_ERRORS=1`).
  - safeBasename = scheme strip + Windows drive letter + backslash separator strict.
  - non-string query type guard.
  - npm audit triage (sprint-2 신규 dep 무관, base `@xenova/transformers` chain 5 vulns — accepted risk).
- 회귀: backend test **91/91 PASS** (sprint-1 base + sprint-2 신규 27 case). smoke fixture PASS. sprint-3/4/5 invariant grep diff 0.

## 3. 결정

- **Q1 = B** — 3-layer types (sprint-3+ 4 페르소나 / Bedrock / MCP 확장 시 type system 깨끗).
- **Q2 = A** — MCP first slice = tool `get_chunks` (corpus retrieval = mj 차별점).
- **Q3 = A** — stdio transport (Claude Desktop default, NAT 0).
- **Q4 = A** — backend repo entry (`npm run mcp:server`, corpus logic 재사용).
- **Q5 = A** — sprint-1 stored history `provider` 식별자 보존 (Migration 0).
- **Agent owner 정책 lock**: design + review = strategic_high (Claude Opus 4.7 / codex 5.5 xhigh / gemini 3.1-pro-preview chain). implement worker = codex normal. helper = codex spark (mechanical only). **review 에 normal/spark 사용 금지**.

## 4. 검증

- 명령/체크 (자동):
  - `npm run build:backend` exit 0 (tsc strict clean).
  - `npm run test:backend` **91/91 PASS** (26 suites).
  - `npm run smoke:persona-turn` (fixture) PASS — sprint-5 lane 회귀 0.
  - `echo '{...initialize...}' | npm run mcp:server --silent` → stdio handshake 정상 응답 (사용자 직접 실행).
  - cross-file invariant: ADR 0004 본문 + persona invariant 텍스트 + locked stdout schema 9 필드 + sprint-1 multi-turn stored history shape — 변경 0.
- 결과: Gate 3 verdict = pass (round 3, api-contract). Gate 6 verdict = pass (round 4, security). blocking finding 0건.
- 수동 확인 (AC7): 사용자 Claude Desktop `~/Library/Application Support/Claude/claude_desktop_config.json` 의 mcpServers 등록 + DATABASE_URL 본인 값 (mysql://study_note:study_note@127.0.0.1:34284/study_note) → 재시작 → 새 chat → `@study-note chunks 로 subject="digital-engineering", query="반가산기" k=5 가져와줘` → MCP wire response `{"chunks":[],"retrievedCount":0}` (사용자 환경 corpus 비어있어 plan AC6 의 success empty result path 발동) + Claude 자체 분석 ("subject 슬러그 다른지 / 영문 쿼리 시도?"). MCP server spawn + tool call wire shape + safe path + error path 모두 정상 동작 검증.

## 5. 위험 / 후속

- 위험:
  - **MCP first slice 의 비개발자 분배 한계** (사용자 직접 발견 — "다른 사용자도 이 작업 해야됨?"). local-stdio 라 동기들이 repo clone + docker + ingest:pdf + Claude Desktop config + DATABASE_URL 본인 — 진입 장벽 큼. sprint-3+ HTTP/SSE transport 또는 npx publish 가 필요.
  - **npm audit 5 critical vulns** = sprint-2 base `@xenova/transformers` transitive chain. 본 sprint scope 외, sprint-3+ embedding/vector store 교체와 함께 cleanup.
  - **Agent owner 모델 등급 분담 오해**: 이번 conversation 의 sprint-2 진입 시 사용자 corrective 2회 발생 — 향후 sprint hand-off 단계의 정책 재확인이 SFS adapter 또는 plan template 수준에서 lock 필요.
  - **Generator metadata `unknown`** (sprint-3/4/5/sprint-1/sprint-2 systemic) — independence risk warning 영구. SFS upstream 개선 필요.
- 후속 (retro §3 / §4 동기): multi-turn web UI / MCP HTTP-SSE + auth / npx publish / 4 페르소나 PersonaRegistry / Bedrock provider / PDF page metadata / Self-CPO checklist v3 / Plan template security subsection / npm audit cleanup. 모두 §3 우선순위 정렬.

## 6. 남긴 것 / 접은 것

- 남김 (durable, repo 에 commit):
  - `backend/src/persona/providers/agent-id.ts` + spec (3-layer types + mapping + guards).
  - `backend/src/persona/providers/llm-provider.port.ts` (M, type 강화).
  - `backend/src/persona/services/__tests__/conversation.service.spec.ts` (M, +1 backward compat).
  - `backend/src/mcp-server/{index.ts, get-chunks.tool.ts, __tests__/*}` (Lane B 전체).
  - `package.json` + `package-lock.json` (+2 dep, +1 script).
  - `README.md` MCP server 단락.
  - `src/persona-turn/api/personaTurns.ts` (JSDoc single-source 명시).
- 공개 archive (`docs/solon/.../20260509/`): retro.md + report.md (본 문서). 새 SFS layout (post-adopt baseline 후 인 `docs/solon/<slug>/<yyyyMMdd>/`).
- private archive (`.sfs-local/sprints/2026-W19-sprint-2/`): brainstorm.md / plan.md / implement.md / review.md / log.md — round-by-round detail 보존.
- 접은 것 (plan §4.2 비범위 + 사용자 명시): 4 페르소나 / Bedrock / docker compose 통합 / web hosting deploy / PDF page metadata / 인증 / streaming / MCP 추가 tool/resource (resource / multi-turn tool) / Migration 1건.

## 7. 다음

- **즉시**: 사용자 터미널에서 `git push origin feature/digiongi-multi-turn-conversation` (현재 branch). 또는 main 으로 PR/merge 흐름.
- **sprint-3 (post-adopt) candidate**:
  1. Multi-turn web UI (sprint-5 single-turn page → chat-style evolve).
  2. MCP HTTP/SSE transport + token auth (동기 분배 unblock).
  3. MCP server npx publish (대안 분배 path).
- **sprint-4+ candidate**: 4 페르소나 PersonaRegistry / Bedrock provider / docker compose 통합 / PDF page metadata / npm audit cleanup.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (141 tracked files), domains=0, last_review=pass, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T17:26:14+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
