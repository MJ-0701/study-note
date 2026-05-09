import { NestFactory } from "@nestjs/core";
import { PersonaModule } from "../persona/persona.module";
import type { LlmAgentId } from "../persona/providers/llm-provider.port";
import {
  isLlmAgentId,
  llmAgentLabel,
  resolveLlmAgent,
  resolveProviderMode
} from "../persona/providers/llm-routing";
import { PersonaTurnService } from "../persona/services/persona-turn.service";

interface CliArgs {
  subject: string;
  query: string;
  k: number;
  agent?: LlmAgentId;
}

const SUBJECT_DEFAULT = "digital-engineering";
const K_DEFAULT = 5;

function parseArgs(argv: string[]): CliArgs {
  let subject = SUBJECT_DEFAULT;
  let query: string | undefined;
  let k = K_DEFAULT;
  let agent: LlmAgentId | undefined;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--subject" && i + 1 < argv.length) {
      subject = argv[++i];
    } else if (token.startsWith("--subject=")) {
      subject = token.slice("--subject=".length);
    } else if (token === "--query" && i + 1 < argv.length) {
      query = argv[++i];
    } else if (token.startsWith("--query=")) {
      query = token.slice("--query=".length);
    } else if (token === "--k" && i + 1 < argv.length) {
      k = Number.parseInt(argv[++i], 10);
    } else if (token.startsWith("--k=")) {
      k = Number.parseInt(token.slice("--k=".length), 10);
    } else if (token === "--agent" && i + 1 < argv.length) {
      const value = argv[++i];
      if (!isLlmAgentId(value)) throw new Error(`unsupported --agent: ${value}`);
      agent = value;
    } else if (token.startsWith("--agent=")) {
      const value = token.slice("--agent=".length);
      if (!isLlmAgentId(value)) throw new Error(`unsupported --agent: ${value}`);
      agent = value;
    }
  }

  if (!query) {
    throw new Error(
      "usage: node backend/dist/cli/persona-turn.js --subject <slug> --query <text> [--k <int>] [--agent claude-cli|gemini-cli]"
    );
  }
  if (!Number.isFinite(k) || k < 1) {
    throw new Error(`--k must be a positive integer, got ${k}`);
  }
  return { subject, query, k, agent };
}

function emitConsentBannerIfRealMode(agent: LlmAgentId | undefined): Promise<void> {
  if (resolveProviderMode() !== "real") return Promise.resolve();
  const selectedAgent = resolveLlmAgent(process.env, agent);
  const label = llmAgentLabel(selectedAgent);
  const operator =
    selectedAgent === "gemini-cli" ? "Google Gemini" : "Claude/Anthropic";
  const banner =
    `[디공이] real-mode (agent=${selectedAgent}) — 본 turn 의 질문 + retrieved PDF chunks 가 ${label} 를 통해 ${operator} 로 송신됩니다. multi-turn HTTP API 에서는 직전 최대 3개 대화 turn 도 함께 송신될 수 있습니다. 송신 안 함이면 Ctrl+C 후 STUDY_NOTE_LLM_FIXTURE=1 로 재실행. (1초 후 진행)`;
  process.stderr.write(`${banner}\n`);
  const delayMs = Number.parseInt(
    process.env.STUDY_NOTE_LLM_CONSENT_DELAY_MS ?? "1000",
    10
  );
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function preflightDatabaseUrl(): void {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0) return;
  process.stderr.write(
    "[persona-turn] DATABASE_URL is required. start a dev DB first (e.g., `npm run db:up-persistent`, then export DATABASE_URL=...) or run via the evidence harness `node scripts/ac13-real-pdf-evidence.mjs`.\n"
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  preflightDatabaseUrl();
  await emitConsentBannerIfRealMode(args.agent);

  const app = await NestFactory.createApplicationContext(PersonaModule, {
    logger: false,
    abortOnError: false
  });
  try {
    const turn = app.get(PersonaTurnService);
    const result = await turn.execute({
      subject: args.subject,
      queryText: args.query,
      k: args.k,
      requestAgent: args.agent
    });

    process.stdout.write(`${result.response}\n\n`);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
