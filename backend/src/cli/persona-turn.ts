import { NestFactory } from "@nestjs/core";
import { PersonaModule } from "../persona/persona.module";
import { resolveProviderMode } from "../persona/providers/claude-cli.provider";
import { PersonaTurnService } from "../persona/services/persona-turn.service";

interface CliArgs {
  subject: string;
  query: string;
  k: number;
}

const SUBJECT_DEFAULT = "digital-engineering";
const K_DEFAULT = 5;

function parseArgs(argv: string[]): CliArgs {
  let subject = SUBJECT_DEFAULT;
  let query: string | undefined;
  let k = K_DEFAULT;

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
    }
  }

  if (!query) {
    throw new Error(
      "usage: node backend/dist/cli/persona-turn.js --subject <slug> --query <text> [--k <int>]"
    );
  }
  if (!Number.isFinite(k) || k < 1) {
    throw new Error(`--k must be a positive integer, got ${k}`);
  }
  return { subject, query, k };
}

function emitConsentBannerIfRealMode(): void {
  if (resolveProviderMode() !== "real") return;
  const banner =
    "[디공이] real-mode (provider=claude-cli) — 본 turn 의 system prompt + retrieved PDF chunks 가 Claude CLI 를 통해 Anthropic API 로 송신됩니다. 송신 안 함이면 Ctrl+C 후 STUDY_NOTE_LLM_FIXTURE=1 로 재실행.";
  process.stderr.write(`${banner}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  emitConsentBannerIfRealMode();

  const app = await NestFactory.createApplicationContext(PersonaModule, {
    logger: false,
    abortOnError: false
  });
  try {
    const turn = app.get(PersonaTurnService);
    const result = await turn.execute({
      subject: args.subject,
      queryText: args.query,
      k: args.k
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
