---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W19-sprint-2"
workspace: "provider-id-contract-cleanup-mcp-agent-bridge-first-tool-resource-slice"
handoff_dir: "docs/solon/provider-id-contract-cleanup-mcp-agent-bridge-first-tool-resource-slice/20260509"
goal: "provider id contract cleanup + MCP agent bridge first tool/resource slice"
created_at: ""
last_touched_at: "2026-05-09T17:26:14+09:00"
closed_at: 2026-05-09T17:26:14+09:00
---

# 회고

> 이 문서는 사용자의 native/workspace 언어로 작성한다.

## 1. 계속할 것

- **agent_owner 모델 등급 명시 정책 lock**: design (brainstorm/plan/retro) + review (self/cross) = strategic_high (Claude Opus 4.7 / codex 5.5 xhigh / gemini 3.1-pro-preview chain). implement worker = codex normal. mechanical helper = codex spark. **review 에 normal/spark 사용 금지**. 사용자 corrective ("리뷰는 5.5 xhigh, 5.3 codex 는 helper") 후 plan §0 / §8 / §9 frontmatter 에 명시 — 향후 sprint 의 표준.
- **3-layer type cleanup (Lane A, Q1=B 채택)**: AgentId enum + ProviderId branded + ModelTag branded + mapping helpers + isProviderId/isModelTag type guards. *runtime string compatible* 라 sprint-1 stored history (`provider: "claude-cli"`) 그대로 호환 (Q5=A backward compat). 이게 *additive* refactor 의 표준 패턴 — sprint-3+ 의 4 페르소나 / Bedrock provider 추가 시 type system 깨끗 유지.
- **MCP first slice = stdio + 1 tool (Q2/Q3/Q4 모두 A 권장 default)**: smallest useful slice 정신. `get_chunks(subject, query, k)` 1건 + low-level Server + setRequestHandler. handshake/list/call 3 단계 in-memory transport spec. 향후 multi-tool 확장 또는 HTTP/SSE transport 도입 시 base.
- **API contract lock (plan AC6 round 2~3 patch 후)**: input regex `^[a-z][a-z0-9-]{0,63}$` + k 1..20 + non-string query type guard / output empty result `{chunks:[],retrievedCount:0}` (success path) / error `InvalidParams|InternalError + errorCode enum (INVALID_INPUT|RETRIEVAL_FAILED)` / safe path basename + scheme strip + Windows drive letter + backslash separator. codex security lens 가 4 round 동안 finding 7건 짚어냄, 모두 patch — *security-first MCP wire contract* 로 정착.
- **Self-CPO + cross-review 시퀀싱 강화**: Gate 3 self-CPO PASS → codex round 1 partial (api-contract) → round 2 partial → round 3 PASS. Gate 6 self-CPO PASS → codex round 1 partial (security) → round 2 partial → round 3 partial (AC7) → round 4 PASS. 각 round 가 정확히 reviewer finding 만 surgical patch (CLAUDE.md "smallest useful slice").
- **Plan §0 압축 self-CPO summary frontmatter 패턴 강화**: sprint-3/5 round trauma 의 packaging 이슈 회피. brainstorm.md 본문 inline (Q1~Q5 표) + frontmatter agent_owner / owner_decisions — codex review prompt 에 first-class 노출. round 1~3 모두 frontmatter 정보 유효.

## 2. 문제

- **sprint-1 작업 인계 시 모델 등급 분담 오해**: 이번 conversation (Claude Opus 4.7) 가 sprint-1 multi-turn 시점 사용자의 "다음 작업부터 codex" 신호를 sprint-2 전체 인계로 잘못 해석 → 사용자 corrective 2회 ("설계 codex 에서 진행한다니까 왜 너가 함" + "리뷰는 5.5 xhigh, 5.3 normal 은 helper"). plan §0 / §8 / §9 frontmatter agent_owner 정확화 후 해소. 향후 sprint 진입 시 *agent 등급 vs sprint owner* 의 분리를 명시 hand-off 단계 결정 점으로 lock 필요.
- **codex Gate 6 security lens 가 4 round 동안 finding 7건 누적**: 일부는 plan API contract 누락 (F1~F4 round 1~2), 일부는 security-specific (F1 raw error leak / F2 stderr 도 leak / F3 Windows path / F1 query type guard). 이건 plan API-contract lens 의 ambition 부족 — 첫 sprint 의 API 설계 시 security lens 의 input validation / wire-shape sanitization / log redaction 정책을 *plan §3.1.5* 에 design acceptance contract 처럼 미리 lock 안 함. sprint-3+ 의 plan template 에 *security acceptance subsection* 신규 후보.
- **Claude Desktop 의 Korean filename + npm 호환성 문제**: `claude_desktop_config.json` 의 `args` path 안 한글 폴더 (preferences 의 trustedFolders 만, mcpServers path 는 영문) — sprint-2 안 영향 0 이지만 동기 분배 시 한글 polson path 사용자가 같은 issue 직면 가능.
- **npm audit 5 critical vulns (sprint-2 base, transformers chain)**: 본 sprint scope 외이지만 codex security lens 가 명시. fix = `@xenova/transformers@2.0.1` downgrade (breaking — corpus embedding 동작 변경 risk). sprint-3+ embedding/vector store 교체와 함께 cleanup 필요.
- **AC7 사용자 evidence packaging 한계**: codex Gate 6 round 3 까지 partial 사유가 *plan AC7 본문에 명시한 사용자 paste* 였지만 실제 Claude Desktop tool-call 결과까지 받아야 했음. UX-first cadence 의 사용자 잔여가 review prompt 에 미반영. plan AC7 같은 사용자 paste lock 은 review 시점 explicit waiver 또는 retro 직전 capture 양쪽 정책 명문화 필요.
- **MCP first slice 의 *비개발자* 분배 한계**: 사용자 직접 발견 — "다른 사용자도 이 작업 해야됨?". local-stdio MCP 라 동기들이 (1) repo clone (2) docker compose (3) ingest:pdf (4) Claude Desktop config 직접 편집 (5) DATABASE_URL 본인 값 — 진입 장벽 큼. sprint-3+ 의 web-hosted MCP (HTTP/SSE) 또는 npx publish + auto-config script 가 필요.

## 3. 시도할 것 (sprint-3+ candidates, 우선순위 정렬)

1. **Multi-turn carry-over** (sprint-5 사용자 풀 신호 3차 + Gate 6 round 3 codex 명시) — sprint-1 post-adopt 에서 multi-turn 추가됐지만 web persona-turn page 는 single-turn 그대로. *web 도 multi-turn UI* 가 자연스러운 다음 step. priority 1.
2. **MCP HTTP/SSE transport + auth** — 동기들 분배 unblock. mj 가 host (deploy URL) + 동기들이 Claude Desktop config 의 `url` 1줄 등록. token-based auth + corpus subject filter (per-user view) 결정 필요. priority 2.
3. **MCP server npx publish** — 또는 (B) 의 self-host installer. `npx study-note-mcp@latest` 한 줄 + Claude Desktop config json patch script. docker compose 자동화 동반. priority 2.
4. **MCP 추가 tool/resource** — `personas/digiongi` resource (system prompt) + `start_conversation` tool (multi-turn) + `append_turn` tool. priority 3.
5. **Bedrock provider for mj + 4 페르소나 PersonaRegistry** — sprint-5 retro carry. priority 3.
6. **Plan template 의 security acceptance subsection** — §3.1.5 design acceptance contract 처럼 input validation / wire-shape sanitization / log redaction / dependency audit 정책을 plan 시점 lock. priority 4.
7. **PDF page metadata preservation** (sprint-4 retro carry) — chunker chunk 별 page anchor + persona 출처 표기. priority 4.
8. **npm audit cleanup** — `@xenova/transformers` chain 의 critical vulns 5건. embedding/vector store 교체와 동반. priority 4.
9. **Self-CPO checklist v3** — security lens / plan AC contract sufficiency / sprint-1 stored history backward compat / agent-owner cascade 자동 점검. priority 5.

## 4. 이어갈 것

- sprint-2 의 *3-layer types + MCP first slice + Claude Desktop 등록 동작 검증* 까지 완료. 사용자 명시 architecture (web hosting + user LLM 분기) 의 *MCP server lane* 이 first slice 부터 작동. 다음 sprint 가 *동기 분배* path 결정 (HTTP/SSE vs npx publish vs hybrid).
- sprint-1 (post-adopt) multi-turn + sprint-2 (post-adopt) MCP first slice 가 sprint-3+ 의 *학습 도구 production* 의 base. sprint-3+ 가 web multi-turn + MCP 추가 tool/resource + 4 페르소나 → *완성형* 학습 도구.
- sprint-1~2 (post-adopt) 모두 사용자 명시 strategic_high agent 정책 적용 (design = strategic_high, implement = codex normal). 이 분담 정책이 sprint-3+ 표준.

## 5. 종료 체크

- [x] report 가 최신이다 (`docs/solon/provider-id-contract-cleanup-mcp-agent-bridge-first-tool-resource-slice/20260509/report.md`)
- [x] review 조치가 완료 또는 이월됐다 (Gate 6 round 4 PASS, 모든 codex finding patch 완료. minor packaging 이슈 (generator metadata `unknown`) sprint-3+ SFS upstream 후보로 carry).
- [x] workbench 가 접혔다 (sprint closed via `sfs retro --close`).

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (141 tracked files), domains=0, last_review=pass, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T17:26:14+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
