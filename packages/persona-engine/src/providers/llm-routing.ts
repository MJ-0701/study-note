// LLM provider mode와 real agent 선택 규칙의 SSoT.
import {
  LLM_AGENT_IDS,
  type LlmAgentId,
  type LlmProviderMode
} from "./llm-provider.port";

const AGENT_SET = new Set<string>(LLM_AGENT_IDS);

export function isLlmAgentId(value: string | undefined): value is LlmAgentId {
  return Boolean(value && AGENT_SET.has(value));
}

/**
 * Provider routing rule (plan §1.5.4 / R7 SSoT + sprint-5 D-S5-3 b additive):
 *   1) requestMode (HTTP body/CLI field)       → 명시 lock (top precedence)
 *   2) STUDY_NOTE_LLM_FIXTURE=1                → fixture
 *   3) STUDY_NOTE_LLM_REAL_OPT_IN=1            → real LLM Agent subprocess
 *   4) neither                                 → fixture (default — external send 0)
 */
export function resolveProviderMode(
  env: NodeJS.ProcessEnv = process.env,
  requestMode?: LlmProviderMode
): LlmProviderMode {
  if (requestMode === "fixture" || requestMode === "real") return requestMode;
  if (env.STUDY_NOTE_LLM_FIXTURE === "1") return "fixture";
  if (env.STUDY_NOTE_LLM_REAL_OPT_IN === "1") return "real";
  return "fixture";
}

export function resolveLlmAgent(
  env: NodeJS.ProcessEnv = process.env,
  requestAgent?: LlmAgentId
): LlmAgentId {
  if (requestAgent) return requestAgent;
  const envAgent = env.STUDY_NOTE_LLM_AGENT ?? env.STUDY_NOTE_LLM_PROVIDER;
  if (!envAgent) return "claude-cli";
  if (isLlmAgentId(envAgent)) return envAgent;
  throw new Error(`unsupported LLM agent: ${envAgent}`);
}

export function llmAgentLabel(agent: LlmAgentId): string {
  return agent === "gemini-cli" ? "Gemini CLI" : "Claude CLI";
}
