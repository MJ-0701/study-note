import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const require = createRequire(import.meta.url);
const { NestFactory } = require("@nestjs/core");
const { CorpusModule } = require("../backend/dist/corpus/corpus.module.js");
const { IngestService } = require("../backend/dist/corpus/services/ingest.service.js");

const SUBJECT = "digital-engineering";
const QUERY = process.env.AC13_QUERY ?? "반가산기 핵심만 간단히";
const K = 3;
const TEXT = "단어 테스트 문장 ".repeat(800);
const CONTENT_HASH = createHash("sha256").update(TEXT).digest("hex");

let smokeDb;
let app;

try {
  smokeDb = await prepareSmokeDatabase("ac13-real");

  const baseEnv = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper
  };
  process.env.DATABASE_URL = smokeDb.databaseUrl;
  process.env.SESSION_TOKEN_PEPPER = smokeDb.sessionTokenPepper;

  console.log("[ac13] ingesting synthetic corpus into smoke DB...");
  app = await NestFactory.createApplicationContext(CorpusModule, { logger: false });
  const ingest = app.get(IngestService);
  const ingestResult = await ingest.ingestExtracted({
    subject: SUBJECT,
    text: TEXT,
    sourceLabel: "ac13://real-evidence-fixture.txt",
    contentHash: CONTENT_HASH
  });
  console.log(
    `[ac13] corpus ingested chunkCount=${ingestResult.chunkCount} corpusId=${ingestResult.corpusId}`
  );
  await app.close();
  app = undefined;

  if (ingestResult.chunkCount < K) {
    throw new Error(
      `expected corpus chunkCount >= k (${K}), got ${ingestResult.chunkCount}`
    );
  }

  console.log(`[ac13] running persona-turn CLI in REAL mode (query="${QUERY}")...`);
  const cliEnv = {
    ...baseEnv,
    STUDY_NOTE_LLM_REAL_OPT_IN: "1"
  };
  delete cliEnv.STUDY_NOTE_LLM_FIXTURE;

  const cli = await runCli(cliEnv, [
    "--subject",
    SUBJECT,
    "--query",
    QUERY,
    "--k",
    String(K)
  ]);

  const banner = "==========================================================";
  process.stdout.write(`\n${banner}\n[AC13 EVIDENCE — STDERR (consent banner + diagnostics)]\n${banner}\n`);
  process.stdout.write(cli.stderr);
  process.stdout.write(`${banner}\n[AC13 EVIDENCE — STDOUT (human-readable response)]\n${banner}\n`);
  process.stdout.write(cli.stdout);
  process.stdout.write(`${banner}\n[AC13 EVIDENCE — exit_code=${cli.exitCode}]\n${banner}\n`);

  if (cli.exitCode !== 0) {
    throw new Error(`CLI exited ${cli.exitCode}`);
  }

  const lines = cli.stdout.split("\n").filter((l) => l.length > 0);
  const lastLine = lines[lines.length - 1];
  const parsed = JSON.parse(lastLine);
  if (parsed.provider !== "claude-cli") {
    throw new Error(`expected provider=claude-cli (real mode), got ${parsed.provider}`);
  }
  if (parsed.modelName === "claude-cli@stub-fixture") {
    throw new Error("modelName indicates fixture, not real");
  }
  console.log(
    `[ac13] PASS — persona=${parsed.personaName} provider=${parsed.provider} model=${parsed.modelName} response_chars=${parsed.response.length} sources=${parsed.sources.length} retrievalCount=${parsed.retrievalCount} isFallback=${parsed.isFallback}`
  );
} finally {
  await app?.close().catch(() => undefined);
  await smokeDb?.stop();
}

async function runCli(env, args) {
  const child = spawn(
    "node",
    ["backend/dist/cli/persona-turn.js", ...args],
    { env, stdio: ["ignore", "pipe", "pipe"] }
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const exitCode = await new Promise((resolve) => child.on("close", resolve));
  return { stdout, stderr, exitCode };
}
