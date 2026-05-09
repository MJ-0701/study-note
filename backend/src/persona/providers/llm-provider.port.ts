export interface LlmGenerateInput {
  systemPrompt: string;
  /** Raw user query (no `User question:` label, no chunks). The provider
   *  is responsible for adding the label exactly once. */
  userMessage: string;
  /** Previous turns are untrusted user/model transcript data, not instructions. */
  previousTurns?: ReadonlyArray<{ queryText: string; responseText: string }>;
  /** Optional retrieved PDF chunks. When provided, the provider must place
   *  them BEFORE the final `User question:` line so the model sees the
   *  citations as context (sprint-3 R3 contract). */
  retrievedChunks?: ReadonlyArray<{ ord: number; text: string }>;
}

export const LLM_AGENT_IDS = ["claude-cli", "gemini-cli"] as const;

export type LlmAgentId = (typeof LLM_AGENT_IDS)[number];

export type LlmProviderMode = "fixture" | "real";

export interface LlmGenerateResult {
  /** Raw model response text. PersonaTurnService formatter wraps this with
   *  invariant cues (persona name, provider banner, sources). */
  text: string;
  /** Concrete provider id, e.g. "claude-cli", "claude-cli-fixture". */
  provider: string;
  /** Concrete model id, e.g. "claude-cli@stub-fixture", "claude-cli@<binary>". */
  modelName: string;
}

export interface LlmProvider {
  generate(input: LlmGenerateInput): Promise<LlmGenerateResult>;
}

export const LLM_PROVIDER = "LLM_PROVIDER";
