// sprint-2 plan §3 AC1 — provider id contract 의 3-layer 정식 분리.
//   AgentId   = bridge identity (사용자 가시: "Claude CLI" / "Gemini CLI")
//   ProviderId = concrete adapter id (agent + variant: "claude-cli" / "claude-cli-fixture" / "gemini-cli" / "gemini-cli-fixture")
//   ModelTag  = model 식별자 (provider + binary: "claude-cli@stub-fixture" / "claude-cli@<binary>")
// Branded types — runtime 은 string compatible (sprint-1 stored history 보존, Q5=A).

import { LLM_AGENT_IDS, type LlmAgentId, type LlmProviderMode } from "./llm-provider.port";

type Brand<T, B extends string> = T & { readonly __brand: B };

export type AgentId = LlmAgentId; // re-export — single source 는 llm-provider.port 의 enum
export type ProviderId = Brand<string, "ProviderId">;
export type ModelTag = Brand<string, "ModelTag">;

const PROVIDER_ID_PATTERN = /^(claude-cli|gemini-cli)(-fixture)?$/;
const MODEL_TAG_PATTERN = /^(claude-cli|gemini-cli)(-fixture)?@[\w.@/-]+$/;

/**
 * Map (agent, mode) → ProviderId. real 은 base id, fixture 는 `-fixture` variant.
 * @throws Error invalid agent.
 */
export function providerIdFromAgent(agent: AgentId, mode: LlmProviderMode): ProviderId {
  if (!LLM_AGENT_IDS.includes(agent)) {
    throw new Error(`providerIdFromAgent: unknown agent ${String(agent)}`);
  }
  return (mode === "fixture" ? `${agent}-fixture` : agent) as ProviderId;
}

/**
 * Compose ModelTag from ProviderId + binary tag (e.g. "stub-fixture" / "claude-3-5-sonnet").
 * @throws Error invalid provider id or empty binary tag.
 */
export function modelTagFromProvider(provider: ProviderId, binaryTag: string): ModelTag {
  if (!PROVIDER_ID_PATTERN.test(provider)) {
    throw new Error(`modelTagFromProvider: invalid provider id ${String(provider)}`);
  }
  if (!binaryTag || binaryTag.trim().length === 0) {
    throw new Error("modelTagFromProvider: binaryTag must be non-empty");
  }
  return `${provider}@${binaryTag}` as ModelTag;
}

/**
 * Type guard for stored history string → ProviderId. Backward compat (R3) —
 * sprint-1 DB row 의 string `provider` 가 valid pattern 이면 ProviderId 로 narrow.
 */
export function isProviderId(value: string | undefined | null): value is ProviderId {
  return typeof value === "string" && PROVIDER_ID_PATTERN.test(value);
}

export function isModelTag(value: string | undefined | null): value is ModelTag {
  return typeof value === "string" && MODEL_TAG_PATTERN.test(value);
}
