// One-shot adapter for sprint-2 AC2/AC8 evidence: bring up the smoke MySQL,
// run the production ingest CLI subprocess against a real PDF, capture exit
// code + JSON stdout, sample chunk text + embedding length for sanity check,
// then tear down. Not part of the regular smoke; invoked manually with the
// PDF path passed via STUDY_NOTE_REAL_PDF_PATH.
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const pdfPath = process.env.STUDY_NOTE_REAL_PDF_PATH;
const subject = process.env.STUDY_NOTE_REAL_PDF_SUBJECT ?? "digital-engineering";
if (!pdfPath) {
  throw new Error(
    "STUDY_NOTE_REAL_PDF_PATH is required (absolute path to the PDF being verified)"
  );
}

let smokeDb;
let prisma;

try {
  smokeDb = await prepareSmokeDatabase("real-pdf-evidence");
  const cliEnv = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper
  };

  console.log("[evidence] running ingest CLI subprocess…");
  const result = await runIngest(cliEnv);
  console.log(
    `[evidence] exitCode=${result.exitCode} jsonLine=${result.jsonLine ?? "<none>"}`
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `CLI exited non-zero (${result.exitCode})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
  if (!result.parsed) {
    throw new Error(`CLI produced no JSON result line\nstdout:\n${result.stdout}`);
  }
  if (typeof result.parsed.chunkCount !== "number" || result.parsed.chunkCount < 1) {
    throw new Error(`expected chunkCount>=1, got ${result.parsed.chunkCount}`);
  }

  prisma = new PrismaClient({ datasourceUrl: smokeDb.databaseUrl });
  const sample = await prisma.chunk.findFirst({
    where: { corpusId: result.parsed.corpusId },
    orderBy: { ord: "asc" }
  });
  if (!sample) {
    throw new Error("no chunk persisted");
  }
  const floats = new Float32Array(
    sample.embedding.buffer.slice(
      sample.embedding.byteOffset,
      sample.embedding.byteOffset + sample.embedding.byteLength
    )
  );

  const evidence = {
    pdfPath,
    subject,
    cliExitCode: result.exitCode,
    cliJsonStdout: result.parsed,
    firstChunkSample: {
      ord: sample.ord,
      tokenCharCount: sample.charCount,
      textHead100: sample.text.slice(0, 100),
      textTail100: sample.text.slice(-100),
      embeddingDimension: floats.length,
      modelName: sample.modelName
    },
    db: {
      corpusCountForHash: await prisma.corpus.count({
        where: { contentHash: result.parsed.contentHash }
      }),
      totalChunks: await prisma.chunk.count({
        where: { corpusId: result.parsed.corpusId }
      })
    }
  };

  console.log("[evidence] === BEGIN EVIDENCE JSON ===");
  console.log(JSON.stringify(evidence, null, 2));
  console.log("[evidence] === END EVIDENCE JSON ===");
} finally {
  await prisma?.$disconnect().catch(() => undefined);
  await smokeDb?.stop();
}

async function runIngest(env) {
  const child = spawn(
    "node",
    ["apps/cli/dist/ingest-pdf.js", "--path", pdfPath, "--subject", subject],
    { env, stdio: ["ignore", "pipe", "pipe"] }
  );

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    const s = String(chunk);
    stdout += s;
    process.stdout.write(s);
  });
  child.stderr.on("data", (chunk) => {
    const s = String(chunk);
    stderr += s;
    process.stderr.write(s);
  });

  const exitCode = await new Promise((resolve) => child.on("close", resolve));

  let parsed = null;
  let jsonLine = null;
  const lines = stdout.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        parsed = JSON.parse(line);
        jsonLine = line;
        break;
      } catch {
        // try previous lines
      }
    }
  }
  return { exitCode, stdout, stderr, parsed, jsonLine };
}
