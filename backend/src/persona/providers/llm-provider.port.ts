export interface LlmGenerateInput {
  systemPrompt: string;
  userMessage: string;
}

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
