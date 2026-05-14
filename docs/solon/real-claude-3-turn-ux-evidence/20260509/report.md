---
phase: report
status: final
sprint_id: "2026-W19-sprint-1"
workspace: "real-claude-3-turn-ux-evidence"
handoff_dir: "docs/solon/real-claude-3-turn-ux-evidence/20260509"
goal: "디공이 real LLM Agent 3-turn UX evidence 수집"
created_at: "2026-05-09T15:24:36+09:00"
last_touched_at: "2026-05-09T15:24:36+09:00"
closed_at: "2026-05-09T15:24:36+09:00"
---

# 보고서 — 디공이 real LLM Agent 3-turn evidence

## 1. 결과

- 목표: Claude 전용이 아니라 사용자가 보유한 LLM Agent(CLAUDE/Gemini/Codex/Ollama/Grok/Cursor 등)로 확장 가능한 real-mode 경계를 만들고, 현재 사용 가능한 Gemini CLI로 디공이 3-turn evidence를 수집한다.
- 상태: done
- 판정: Gate 3 (Plan) PASS, Gate 6 (Review) PASS, Gate 7 (Retro) closed
- 한 줄 결과: `PersonaTurnService`를 concrete Claude provider에서 분리해 `LlmAgentRegistry` + `gemini-cli` adapter를 붙였고, Gemini real PDF 3-turn evidence를 PASS로 남겼다.

## 2. 완료한 것

- `LlmAgentRegistry`, `GeminiCliProvider`, `llm-routing`, 공통 CLI prompt/redaction helper를 추가했다.
- `PersonaTurnService`가 `ClaudeCliProvider` 직접 의존 대신 registry를 호출하도록 바꿨다.
- `agent?` 필드를 persona-turn/conversation-turn DTO, CLI, frontend API에 additive로 통과시켰다.
- UI real mode에서 `Gemini CLI` / `Claude CLI` agent selector와 provider-neutral consent banner를 추가했다.
- `scripts/ac13-real-pdf-evidence.mjs`를 `STUDY_NOTE_LLM_AGENT`/`--agent` 기반으로 확장하고 `npm run evidence:real-agent` entrypoint를 추가했다.
- MCP 방향 문서 [mcp-agent-bridge.md](/Users/mj/IdeaProjects/study-note/docs/solon/mcp-agent-bridge.md)를 추가했다.
- domain language에 `LLM Agent`, `Agent adapter registry`, `MCP agent bridge`, `Evidence transcript`를 추가했다.

## 3. 결정

- real provider 경계는 Claude CLI 고정이 아니라 user-owned LLM Agent adapter registry로 둔다.
- Gemini CLI를 이번 sprint의 첫 non-Claude real adapter와 evidence executor로 사용한다.
- fixture branch는 기존 호환성을 위해 `claude-cli-fixture` provider id를 유지한다.
- MCP server 구현은 이번 sprint 범위 밖으로 두고, bridge 방향과 adapter contract만 문서화한다.
- real evidence docs에는 raw prompt, full chunk text, absolute path, email, raw stderr를 남기지 않고 safe metadata만 남긴다.

## 4. 검증

- 명령/체크:
  - `npm run build:backend`
  - `npm run test:backend`
  - `npm run build:frontend`
  - `npm run smoke:persona-turn`
  - `npm run evidence:real-agent`
  - `npm run build`
  - `git diff --check`
- 결과:
  - backend build PASS
  - backend tests PASS, 65 tests
  - frontend build PASS
  - fixture smoke PASS
  - Gemini real-agent evidence PASS, 3/3 anchor turns
  - full build PASS
  - diff whitespace check PASS
- 수동 확인:
  - real-mode consent banner가 `agent=gemini-cli`와 외부 destination `Google Gemini`를 표시했다.
  - each response preserved `[디공이] (provider: gemini-cli)` wrapper, source basename, follow-up/level-check cue.

### Gemini real-agent evidence safe metadata

- Q-A `반가산기 진리표/식 핵심`: provider `gemini-cli`, model `gemini-cli@unspecified`, sources.ord `[1,0,4]`, response_chars `1423`, fallback `false`
- Q-B `4-to-1 MUX 동작`: provider `gemini-cli`, model `gemini-cli@unspecified`, sources.ord `[13,18,12]`, response_chars `1372`, fallback `false`
- Q-C `디코더와 인코더 차이`: provider `gemini-cli`, model `gemini-cli@unspecified`, sources.ord `[15,11,9]`, response_chars `1331`, fallback `false`

## 5. 위험 / 후속

- 위험:
  - handoff directory slug는 sprint start 당시의 `real-claude-...`를 유지하지만, 실제 scope는 `real LLM Agent`로 correction 됐다.
  - 현재 concrete real adapters는 `claude-cli`, `gemini-cli`만 구현됐다. Codex/Ollama/Grok/Cursor는 contract 방향만 남겼다.
  - fixture branch는 호환성 때문에 `claude-cli-fixture` id를 유지한다. `mode=fixture + agent=gemini-cli` UX에서 provider id가 혼동될 수 있다.
- 후속:
  - `mcp-agent-bridge.md`에 public provider id values subsection 추가.
  - fixture provider id를 neutral id로 migration할지, 기존 id를 문서화할지 결정.
  - DTO validator evidence를 다음 review bundle에 source excerpt로 포함.
  - Gemini spec에 `User question:` single-occurrence assertion parity 추가.

## 6. 남긴 것 / 접은 것

- 남김:
  - [mcp-agent-bridge.md](/Users/mj/IdeaProjects/study-note/docs/solon/mcp-agent-bridge.md): MCP/agent adapter 방향의 shared contract.
  - [domain-map.md](/Users/mj/IdeaProjects/study-note/docs/solon/domain-map.md): 이번 sprint에서 확정한 domain language.
  - 이 보고서와 [retro.md](/Users/mj/IdeaProjects/study-note/docs/solon/real-claude-3-turn-ux-evidence/20260509/retro.md): sprint close handoff.
- 접은 것:
  - 별도 `docs/solon/real-llm-agent-3-turn-ux-evidence/20260509/report.md` 중복 파일은 본 보고서로 흡수했다.
- private archive:
  - `.sfs-local/sprints/2026-W19-sprint-1/` workbench는 SFS close state로 유지된다.

## 7. 다음

- `$sfs commit plan`
- 다음 sprint 후보: provider id contract cleanup + MCP agent bridge first tool/resource slice.

## §8. Next Cycle — Division Activation Recommendations

<!-- solon:division-recommendations:start -->
- detected: project_size=small (125 tracked files), domains=0, last_review=pass, infra_signals=3, ui_signals=2
- recommended action format: update `.sfs-local/divisions.yaml` + record why in `.sfs-local/decisions/<NNNN>-activate-<division>.md`
- consider: `infra` activate (light) — deploy/observability/rollback checklist; triggers: infra files present or large codebase
- generated_at: 2026-05-09T15:24:36+09:00 (auto) — edit outside the marker block to preserve manual notes
<!-- solon:division-recommendations:end -->
