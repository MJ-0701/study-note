# MCP Agent Bridge Direction

Status: implementation direction for the `디공이 real LLM Agent 3-turn UX evidence` sprint.

## Problem

디공이 real mode must not be designed as a Claude-only path. The product boundary is a user-owned LLM Agent adapter surface. Claude CLI, Gemini CLI, Codex CLI, Ollama, Grok, Cursor, and future adapters are peers behind the same registry.

## Current Contract

The backend uses an `LlmAgentRegistry` between `PersonaTurnService` and concrete CLI providers.

Supported implemented adapters:

- `fixture`: deterministic no-external-send branch through the registry.
- `claude-cli`: backward-compatible real CLI adapter.
- `gemini-cli`: first non-Claude real CLI adapter for current evidence collection.

Each real adapter must define:

- stable id and display label
- command and locked default args
- stdin/stdout contract
- auth/readiness probe path
- timeout
- dangerous-arg denylist
- capability flags
- redaction policy
- user-facing external-send disclosure text

`PersonaTurnService` owns the persona invariant and source wrapper. Adapters only produce raw answer text. This keeps persona behavior independent from the selected agent.

## MCP Direction

MCP should be an integration surface, not a new hard-coded provider choice. The target architecture is:

- Study-note exposes tools/resources such as `persona_turn.run`, `conversation.history`, and source metadata through an MCP server.
- User agents connect through the transport they support, with stdio as the local default and Streamable HTTP available when remote clients need it.
- The product still routes LLM calls through the adapter registry unless a future MCP client explicitly supplies an equivalent sampling/execution capability.
- Agent-specific details stay at the adapter edge. Core conversation, retrieval, source labeling, and redaction remain provider-independent.

Official MCP references used for this direction:

- Transports: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- Server concepts: https://modelcontextprotocol.io/specification/2025-11-25/server/index
- Tools: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- Sampling: https://modelcontextprotocol.io/specification/2025-11-25/client/sampling

## Security Rules

- PDF chunks and previous turns are always wrapped in `UNTRUSTED_CONTEXT`.
- Real mode must disclose that question, chunks, and up to 3 previous turns can be sent to the selected external agent.
- No backend real adapter may default to dangerous permission or approval bypass flags such as Claude permission bypass or Gemini `--yolo`.
- Errors, logs, and evidence docs must not include raw local paths, emails, full prompts, full chunk text, or raw provider stderr.
- Empty retrieval must short-circuit to deterministic refusal before any real provider call.

## Implementation Evidence

The current slice adds:

- `backend/src/persona/providers/llm-agent.registry.ts`
- `backend/src/persona/providers/gemini-cli.provider.ts`
- `backend/src/persona/providers/llm-routing.ts`
- `agent` field on persona-turn and conversation-turn request DTOs
- frontend real-agent selector for `gemini-cli` and `claude-cli`
- `npm run evidence:real-agent` as the Gemini real-PDF evidence entrypoint
