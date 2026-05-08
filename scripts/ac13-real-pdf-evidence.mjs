import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const require = createRequire(import.meta.url);
const { NestFactory } = require("@nestjs/core");
const { CorpusModule } = require("../backend/dist/corpus/corpus.module.js");
const { IngestService } = require("../backend/dist/corpus/services/ingest.service.js");

/**
 * Sprint-4 AC4 + AC5 — real-PDF evidence harness.
 *
 * Pipeline:
 *   1. ephemeral docker MySQL (prepareSmokeDatabase)
 *   2. IngestService.execute({pdfPath: real PDF, subject}) — sprint-2 full pipeline
 *   3. for each anchor query (3 locked strings): persona-turn CLI subprocess in
 *      REAL mode → consent banner / response / JSON capture + assert
 *   4. summary + smokeDb.stop()
 *
 * Locked anchor queries (plan §3 AC4):
 *   Q-A: "반가산기 진리표/식 핵심"
 *   Q-B: "4-to-1 MUX 동작"
 *   Q-C: "디코더와 인코더 차이"
 *
 * AC5 anchor regex (plan §3 AC5): /반가산기|진리표|XOR|AND|MUX|선택|디코더|인코더|2:4|3:8/
 */

const SUBJECT = "digital-engineering";
const K = 3;
const PDF_PATH_REL = "asset/digital_logical_engine/제07장 조합논리회로_2ndE_GT.pdf";
const PDF_PATH_ABS = resolve(PDF_PATH_REL);

const ANCHOR_QUERIES = [
  { label: "Q-A", query: "반가산기 진리표/식 핵심" },
  { label: "Q-B", query: "4-to-1 MUX 동작" },
  { label: "Q-C", query: "디코더와 인코더 차이" }
];

const ANCHOR_REGEX = /반가산기|진리표|XOR|AND|MUX|선택|디코더|인코더|2:4|3:8/;
const PLACEHOLDER_MARKER = /단어 테스트 문장/;

let smokeDb;
let app;
const banner = "==========================================================";

try {
  smokeDb = await prepareSmokeDatabase("ac13-real-pdf");

  process.env.DATABASE_URL = smokeDb.databaseUrl;
  process.env.SESSION_TOKEN_PEPPER = smokeDb.sessionTokenPepper;

  // Phase 1: ingest real PDF.
  console.log(`[ac13-real-pdf] ingesting real PDF: ${PDF_PATH_REL}`);
  app = await NestFactory.createApplicationContext(CorpusModule, { logger: false });
  const ingest = app.get(IngestService);
  const ingestResult = await ingest.execute({ pdfPath: PDF_PATH_ABS, subject: SUBJECT });
  console.log(
    `[ac13-real-pdf] PDF ingested chunkCount=${ingestResult.chunkCount} corpusId=${ingestResult.corpusId} contentHash=${ingestResult.contentHash} alreadyIngested=${ingestResult.alreadyIngested}`
  );
  await app.close();
  app = undefined;

  if (ingestResult.chunkCount < K) {
    throw new Error(
      `expected corpus chunkCount >= k (${K}), got ${ingestResult.chunkCount}`
    );
  }

  // Phase 2: chunk text probe (AC3 supplement).
  const prisma = new PrismaClient({ datasourceUrl: smokeDb.databaseUrl });
  let chunkProbeRows;
  try {
    const chunkCount = ingestResult.chunkCount;
    const midOrd = Math.floor(chunkCount / 2);
    chunkProbeRows = await prisma.chunk.findMany({
      where: {
        corpusId: ingestResult.corpusId,
        ord: { in: [0, midOrd, chunkCount - 1] }
      },
      orderBy: { ord: "asc" },
      select: { ord: true, text: true }
    });
  } finally {
    await prisma.$disconnect();
  }

  process.stdout.write(`\n${banner}\n[AC3 EVIDENCE — chunk text probe (first / mid / last)]\n${banner}\n`);
  for (const row of chunkProbeRows) {
    const head = row.text.slice(0, 200).replace(/\s+/g, " ");
    const placeholderHit = PLACEHOLDER_MARKER.test(row.text);
    const anchorHit = ANCHOR_REGEX.test(row.text);
    process.stdout.write(
      `chunk[ord=${row.ord}] placeholder=${placeholderHit} anchorHit=${anchorHit} head="${head}"\n`
    );
    if (placeholderHit) {
      throw new Error(`AC3 fail: chunk ord=${row.ord} contains placeholder marker — corpus is synthetic, not real PDF`);
    }
  }
  const anyAnchorHit = chunkProbeRows.some((r) => ANCHOR_REGEX.test(r.text));
  if (!anyAnchorHit) {
    process.stdout.write(
      "[AC3 WARN] none of the 3 probed chunks matched the anchor regex — retrieval may still hit anchor-bearing chunks. continuing.\n"
    );
  }

  // Phase 3: real-mode persona turn × 3 anchor queries.
  // K5 (plan §6) — Claude CLI default 30s 는 한글 응답 + 25 chunk system prompt 에 부족. plan 의
  // "default 90s 권장" 을 따라 harness 에서 120s 로 lock (사용자 override 시 inherit).
  const cliEnvBase = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper,
    STUDY_NOTE_LLM_REAL_OPT_IN: "1",
    STUDY_NOTE_LLM_TIMEOUT_MS: process.env.STUDY_NOTE_LLM_TIMEOUT_MS ?? "120000"
  };
  delete cliEnvBase.STUDY_NOTE_LLM_FIXTURE;

  const perQueryResults = [];

  for (const a of ANCHOR_QUERIES) {
    process.stdout.write(`\n${banner}\n[AC4 EVIDENCE — ${a.label}: "${a.query}"]\n${banner}\n`);
    console.log(`[ac13-real-pdf] running persona-turn CLI (REAL mode) for ${a.label}...`);
    const cli = await runCli(cliEnvBase, [
      "--subject",
      SUBJECT,
      "--query",
      a.query,
      "--k",
      String(K)
    ]);

    process.stdout.write(`--- ${a.label} STDERR (consent banner + diagnostics) ---\n`);
    process.stdout.write(cli.stderr);
    process.stdout.write(`--- ${a.label} STDOUT (human-readable response) ---\n`);
    process.stdout.write(cli.stdout);
    process.stdout.write(`--- ${a.label} exit_code=${cli.exitCode} ---\n`);

    if (cli.exitCode !== 0) {
      throw new Error(`${a.label}: CLI exited ${cli.exitCode}`);
    }

    const lines = cli.stdout.split("\n").filter((l) => l.length > 0);
    const lastLine = lines[lines.length - 1];
    const parsed = JSON.parse(lastLine);

    const expectations = [
      [parsed.personaName === "디공이", `personaName must be 디공이, got ${parsed.personaName}`],
      [parsed.subject === SUBJECT, `subject mismatch: ${parsed.subject}`],
      [parsed.query === a.query, `query mismatch: ${parsed.query} != ${a.query}`],
      [parsed.provider === "claude-cli", `provider must be claude-cli (real), got ${parsed.provider}`],
      [parsed.modelName !== "claude-cli@stub-fixture", `modelName indicates fixture, got ${parsed.modelName}`],
      [parsed.isFallback === false, `isFallback must be false (real chunk path), got ${parsed.isFallback}`],
      [Array.isArray(parsed.sources) && parsed.sources.length === K, `sources.length must be ${K}, got ${parsed.sources?.length}`],
      [parsed.retrievalCount === parsed.sources.length, `retrievalCount mismatch: ${parsed.retrievalCount} != ${parsed.sources.length}`]
    ];
    for (const [ok, msg] of expectations) {
      if (!ok) throw new Error(`${a.label} AC4 fail: ${msg}`);
    }

    // sources sourcePdfPath checks
    for (const src of parsed.sources) {
      if (typeof src.sourcePdfPath !== "string" || src.sourcePdfPath.length === 0) {
        throw new Error(`${a.label} AC4 fail: source.sourcePdfPath empty: ${JSON.stringify(src)}`);
      }
      const norm = src.sourcePdfPath;
      const matchesAbs = norm === PDF_PATH_ABS;
      const matchesRel = norm.endsWith(PDF_PATH_REL) || norm.endsWith("제07장 조합논리회로_2ndE_GT.pdf");
      if (!matchesAbs && !matchesRel) {
        throw new Error(
          `${a.label} AC4 fail: sourcePdfPath does not match real PDF: got "${norm}"`
        );
      }
    }

    // AC5 anchor word loose assertion on response body.
    if (!ANCHOR_REGEX.test(parsed.response)) {
      throw new Error(
        `${a.label} AC5 fail: response body does not contain any of /반가산기|진리표|XOR|AND|MUX|선택|디코더|인코더|2:4|3:8/`
      );
    }
    if (PLACEHOLDER_MARKER.test(parsed.response)) {
      throw new Error(
        `${a.label} AC4 fail: response references placeholder corpus marker — DB seems to contain synthetic text`
      );
    }

    perQueryResults.push({
      label: a.label,
      query: a.query,
      provider: parsed.provider,
      modelName: parsed.modelName,
      responseChars: parsed.response.length,
      sourcesOrds: parsed.sources.map((s) => s.ord),
      isFallback: parsed.isFallback
    });

    console.log(
      `[ac13-real-pdf] ${a.label} PASS — provider=${parsed.provider} model=${parsed.modelName} response_chars=${parsed.response.length} sources.ord=[${parsed.sources.map((s) => s.ord).join(",")}]`
    );
  }

  process.stdout.write(`\n${banner}\n[ac13-real-pdf] ALL PASS — queries=${perQueryResults.length}\n${banner}\n`);
  for (const r of perQueryResults) {
    process.stdout.write(
      `  ${r.label}: provider=${r.provider} model=${r.modelName} sources.ord=[${r.sourcesOrds.join(",")}] response_chars=${r.responseChars} isFallback=${r.isFallback}\n`
    );
  }
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
