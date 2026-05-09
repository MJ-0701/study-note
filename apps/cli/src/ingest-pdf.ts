import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { CorpusModule, IngestService } from "@study-note/corpus";

interface CliArgs {
  path: string;
  subject: string;
}

const SUBJECT_DEFAULT = "digital-engineering";

function parseArgs(argv: string[]): CliArgs {
  let pdfPath: string | undefined;
  let subject = SUBJECT_DEFAULT;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token) continue;

    if (token === "--path") {
      const value = argv[++i];
      if (!value) {
        throw new Error("--path flag missing value");
      }
      pdfPath = value;
    } else if (token.startsWith("--path=")) {
      pdfPath = token.slice("--path=".length);
    } else if (token === "--subject") {
      const value = argv[++i];
      if (!value) {
        throw new Error("--subject flag missing value");
      }
      subject = value;
    } else if (token.startsWith("--subject=")) {
      subject = token.slice("--subject=".length);
    }
  }

  if (!pdfPath) {
    throw new Error(
      "usage: node apps/cli/dist/ingest-pdf.js --path <pdf-path> [--subject <subject-slug>]"
    );
  }
  return { path: pdfPath, subject };
}

async function main(): Promise<void> {
  const logger = new Logger("ingest-pdf");
  const args = parseArgs(process.argv.slice(2));
  logger.log(`starting ingest path=${args.path} subject=${args.subject}`);

  const app = await NestFactory.createApplicationContext(CorpusModule, { bufferLogs: false });
  try {
    const ingest = app.get(IngestService);
    const result = await ingest.execute({ pdfPath: args.path, subject: args.subject });
    logger.log(
      `done corpusId=${result.corpusId} contentHash=${result.contentHash} chunkCount=${result.chunkCount} alreadyIngested=${result.alreadyIngested} model=${result.modelName}`
    );
    // CLI machine-readable line for smoke / scripting
    process.stdout.write(
      `${JSON.stringify({
        corpusId: result.corpusId,
        contentHash: result.contentHash,
        chunkCount: result.chunkCount,
        alreadyIngested: result.alreadyIngested,
        modelName: result.modelName
      })}\n`
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
