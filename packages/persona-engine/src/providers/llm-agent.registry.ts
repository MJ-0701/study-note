// LLM Agent registry: PersonaTurnService가 concrete CLI provider에 묶이지 않게 한다.
import { Injectable } from "@nestjs/common";
import { ClaudeCliProvider } from "./claude-cli.provider";
import { GeminiCliProvider } from "./gemini-cli.provider";
import type {
  FixtureContext
} from "./agent-cli.shared";
import type {
  LlmAgentId,
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider
} from "./llm-provider.port";

@Injectable()
export class LlmAgentRegistry {
  constructor(
    private readonly claude: ClaudeCliProvider,
    private readonly gemini: GeminiCliProvider
  ) {}

  generateFixture(input: LlmGenerateInput, ctx: FixtureContext): LlmGenerateResult {
    return this.claude.generateFixture(input, ctx);
  }

  generate(agent: LlmAgentId, input: LlmGenerateInput): Promise<LlmGenerateResult> {
    return this.providerFor(agent).generate(input);
  }

  private providerFor(agent: LlmAgentId): LlmProvider {
    if (agent === "gemini-cli") return this.gemini;
    return this.claude;
  }
}
