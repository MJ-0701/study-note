---
phase: retro
gate_number: 7
gate_label: "Gate 7 (Retro)"
gate_id: G5
sprint_id: "2026-W19-sprint-1"
workspace: "real-claude-3-turn-ux-evidence"
handoff_dir: "docs/solon/persona/llm-agent/real-agent-3-turn-evidence/20260509"
goal: "디공이 real LLM Agent 3-turn UX evidence 수집"
created_at: ""
last_touched_at: "2026-05-09T15:24:36+09:00"
closed_at: 2026-05-09T15:24:36+09:00
---

# 회고 — 디공이 real LLM Agent 3-turn evidence

## 1. 계속할 것

- 사용자가 말한 provider/agent intent를 구현체 이름으로 좁혀 해석하지 않는다. Claude 구현체가 현재 코드에 있어도 요구사항은 `LLM Agent`로 다시 확인한다.
- Gate 3 review PASS 후에는 `implement`, Gate 6 review PASS 후에는 `retro`처럼 SFS next action rail을 명시한다.
- real provider evidence는 raw transcript dump 대신 provider/model/source ord/response length/fallback 같은 safe metadata로 남긴다.
- concrete provider는 adapter edge에 두고 persona invariant, retrieval, source wrapper는 provider-independent core에 둔다.

## 2. 문제

- sprint start workspace slug가 `real-claude-...`로 생성되어 실제 scope(`real LLM Agent`)와 어긋났다. SFS close path는 유지하되 report/retro 내부에서 scope를 정정했다.
- Codex가 처음에 Claude provider 구현체를 사용자 의도처럼 과해석했다. user correction 후 brainstorm/plan/implementation은 multi-agent 방향으로 수정됐다.
- Gate 6 optional findings 중 provider id enum/fixture provider id behavior는 아직 정리하지 않았다.
- Gemini real evidence는 3개 independent CLI turns로 수집됐다. HTTP persisted conversation 기반의 3-turn history-recognition UX evidence는 아직 별도 확인이 필요하다.

## 3. 시도할 것

- 다음 small slice에서 `mcp-agent-bridge.md`에 public provider id values를 명시한다.
- fixture provider id를 `agent-fixture` 같은 neutral id로 migration할지, `claude-cli-fixture`를 compatibility legacy로 문서화할지 결정한다.
- Gemini provider spec에도 `User question:` label single-occurrence guard를 추가한다.
- SFS start goal에 특정 구현체가 들어가면 brainstorm에서 즉시 "현 구현체 vs 실제 product intent"를 분리하는 guardrail을 둔다.

## 4. 이어갈 것

- MCP agent bridge first slice: `persona_turn.run`, `conversation.history`, source metadata를 tool/resource 후보로 설계한다.
- Agent adapter registry 확장 후보: Codex CLI, Ollama, Grok, Cursor. 다만 concrete adapter 추가 전 provider id contract cleanup을 먼저 한다.
- UI에서는 real agent selector가 생겼으므로 provider별 auth/readiness feedback을 붙일 수 있다.
- Infra light activation 추천은 유지하되, 이번 sprint의 직접 후속은 provider/API contract cleanup이 더 작다.

## 5. 종료 체크

- [x] report 가 최신이다
- [x] review 조치가 완료 또는 이월됐다
- [x] workbench 가 접혔다

## §6. 다음 cycle 본부 활성 추천 (auto)

<!-- solon:division-recommendations:start -->
- detected: project_size=small (125 tracked files), domains=0, last_review=pass, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T15:24:36+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
