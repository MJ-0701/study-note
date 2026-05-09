import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const require = createRequire(import.meta.url);
const { NestFactory } = require("@nestjs/core");
const { CorpusModule } = require("../packages/corpus/dist/corpus.module.js");
const { IngestService } = require("../packages/corpus/dist/services/ingest.service.js");

const SUBJECT = "digital-engineering";
const QUERY = "fixture query: 반가산기";
const K = 3;
const TEXT = "단어 테스트 문장 ".repeat(800);
const CONTENT_HASH = createHash("sha256").update(TEXT).digest("hex");

let smokeDb;
let app;

try {
  smokeDb = await prepareSmokeDatabase("persona-turn");

  // Phase 1: ingest synthetic corpus via sprint-2 pipeline (≥7 chunks expected).
  const corpusEnv = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper
  };
  process.env.DATABASE_URL = smokeDb.databaseUrl;
  process.env.SESSION_TOKEN_PEPPER = smokeDb.sessionTokenPepper;

  console.log("[smoke] ingesting synthetic corpus...");
  app = await NestFactory.createApplicationContext(CorpusModule, { logger: false });
  const ingest = app.get(IngestService);
  const ingestResult = await ingest.ingestExtracted({
    subject: SUBJECT,
    text: TEXT,
    sourceLabel: "smoke://persona-turn-fixture.txt",
    contentHash: CONTENT_HASH
  });
  console.log(
    `[smoke] corpus ingested chunkCount=${ingestResult.chunkCount} corpusId=${ingestResult.corpusId}`
  );
  await app.close();
  app = undefined;

  if (ingestResult.chunkCount < K) {
    throw new Error(
      `expected corpus chunkCount >= k (${K}), got ${ingestResult.chunkCount}`
    );
  }

  // Phase 2: persona-turn CLI subprocess in fixture mode.
  console.log("[smoke] running persona-turn CLI subprocess...");
  const cliEnv = {
    ...corpusEnv,
    STUDY_NOTE_LLM_FIXTURE: "1"
  };
  delete cliEnv.STUDY_NOTE_LLM_REAL_OPT_IN;

  const cli = await runCli(cliEnv, [
    "--subject",
    SUBJECT,
    "--query",
    QUERY,
    "--k",
    String(K)
  ]);

  if (cli.exitCode !== 0) {
    throw new Error(
      `CLI exited ${cli.exitCode}\nstdout:\n${cli.stdout}\nstderr:\n${cli.stderr}`
    );
  }

  const lines = cli.stdout.split("\n").filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error(`stdout has too few lines: ${cli.stdout}`);
  }
  if (!lines[0].startsWith("[디공이]")) {
    throw new Error(
      `expected first non-empty stdout line to start with [디공이], got: ${lines[0]}`
    );
  }
  if (cli.stdout.includes("[Nest]")) {
    throw new Error(
      "stdout contained [Nest] logger pattern — Nest logger leak; expected logger:false"
    );
  }
  const lastLine = lines[lines.length - 1];
  let parsed;
  try {
    parsed = JSON.parse(lastLine);
  } catch (err) {
    throw new Error(`last stdout line is not JSON: ${lastLine}\n${err}`);
  }

  const expectations = [
    [parsed.personaName === "디공이", `personaName must be 디공이, got ${parsed.personaName}`],
    [parsed.subject === SUBJECT, `subject mismatch: ${parsed.subject}`],
    [typeof parsed.response === "string" && parsed.response.length > 0, "response must be non-empty string"],
    [Array.isArray(parsed.sources), "sources must be array"],
    [parsed.sources.length === Math.min(K, parsed.retrievalCount), `sources.length must equal min(k, retrievalCount)`],
    [parsed.retrievalCount === parsed.sources.length, "retrievalCount must equal sources.length"],
    [parsed.isFallback === false, "isFallback must be false (Case A path)"],
    [parsed.provider === "claude-cli-fixture", `provider must be claude-cli-fixture, got ${parsed.provider}`],
    [parsed.modelName === "claude-cli@stub-fixture", `modelName must be claude-cli@stub-fixture, got ${parsed.modelName}`],
    [/FIXTURE:/.test(parsed.response), "response must contain FIXTURE: marker (provider raw text survived wrapping)"],
    [/^\[디공이\]/.test(parsed.response), "response must begin with [디공이] header"],
    [/provider:/.test(parsed.response), "response must include provider: banner"],
    [/chunk\[/.test(parsed.response), "response must reference chunk[<ord>] sources"]
  ];

  for (const [ok, msg] of expectations) {
    if (!ok) throw new Error(`assertion failed: ${msg}`);
  }

  // Optional Phase 3: also assert at the DB level that source ords align.
  const prisma = new PrismaClient({ datasourceUrl: smokeDb.databaseUrl });
  try {
    for (const src of parsed.sources) {
      const found = await prisma.chunk.findFirst({
        where: { corpusId: src.corpusId, ord: src.ord }
      });
      if (!found) {
        throw new Error(
          `source chunk not found: corpusId=${src.corpusId} ord=${src.ord}`
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    `[smoke] PASS — persona=디공이 response_chars=${parsed.response.length} sources=${parsed.sources.length} retrievalCount=${parsed.retrievalCount} marker=FIXTURE`
  );
} finally {
  await app?.close().catch(() => undefined);
  await smokeDb?.stop();
}

async function runCli(env, args) {
  const child = spawn(
    "node",
    ["apps/cli/dist/persona-turn.js", ...args],
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
