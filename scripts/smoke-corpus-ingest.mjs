import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const require = createRequire(import.meta.url);
const { NestFactory } = require("@nestjs/core");
const { CorpusModule } = require("../packages/corpus/dist/corpus.module.js");
const { IngestService } = require("../packages/corpus/dist/services/ingest.service.js");
const { EMBEDDING_DIMENSION, EMBEDDING_MODEL } = require(
  "../packages/corpus/dist/services/embedding.service.js"
);

const SUBJECT = "digital-engineering";
const SOURCE_LABEL = "smoke://synthetic-corpus.txt";

// Synthetic Korean text long enough to produce multiple chunks via the e5
// tokenizer (each "단어 " repeats add ≥1 token). Skipping pdf-parse keeps the
// smoke deterministic; AC2 (PDF extraction quality) is a manual user check.
const TEXT = "단어 테스트 문장 ".repeat(800);
const CONTENT_HASH = createHash("sha256").update(TEXT).digest("hex");

let smokeDb;
let app;
let prisma;

try {
  smokeDb = await prepareSmokeDatabase("corpus-ingest");
  process.env.DATABASE_URL = smokeDb.databaseUrl;
  process.env.SESSION_TOKEN_PEPPER = smokeDb.sessionTokenPepper;

  app = await NestFactory.createApplicationContext(CorpusModule, { bufferLogs: false });
  const ingest = app.get(IngestService);

  console.log("[smoke] first ingest...");
  const first = await ingest.ingestExtracted({
    subject: SUBJECT,
    text: TEXT,
    sourceLabel: SOURCE_LABEL,
    contentHash: CONTENT_HASH
  });
  console.log(
    `[smoke] first result corpusId=${first.corpusId} chunkCount=${first.chunkCount} alreadyIngested=${first.alreadyIngested} model=${first.modelName}`
  );

  if (first.alreadyIngested !== false) {
    throw new Error(`first ingest must report alreadyIngested=false, got ${first.alreadyIngested}`);
  }
  if (typeof first.chunkCount !== "number" || first.chunkCount < 1) {
    throw new Error(`first ingest must produce chunkCount>=1, got ${first.chunkCount}`);
  }
  if (first.contentHash !== CONTENT_HASH) {
    throw new Error(
      `first ingest must echo contentHash (expected ${CONTENT_HASH}, got ${first.contentHash})`
    );
  }
  if (first.modelName !== EMBEDDING_MODEL) {
    throw new Error(`expected modelName=${EMBEDDING_MODEL}, got ${first.modelName}`);
  }

  console.log("[smoke] second ingest (idempotency)...");
  const second = await ingest.ingestExtracted({
    subject: SUBJECT,
    text: TEXT,
    sourceLabel: SOURCE_LABEL,
    contentHash: CONTENT_HASH
  });
  console.log(
    `[smoke] second result corpusId=${second.corpusId} chunkCount=${second.chunkCount} alreadyIngested=${second.alreadyIngested}`
  );

  if (second.alreadyIngested !== true) {
    throw new Error(
      `second ingest must report alreadyIngested=true, got ${second.alreadyIngested}`
    );
  }
  if (second.corpusId !== first.corpusId) {
    throw new Error(
      `idempotent ingest must reuse same corpus row (first=${first.corpusId}, second=${second.corpusId})`
    );
  }
  if (second.chunkCount !== first.chunkCount) {
    throw new Error(
      `idempotent ingest must report same chunkCount (first=${first.chunkCount}, second=${second.chunkCount})`
    );
  }

  prisma = new PrismaClient({ datasourceUrl: smokeDb.databaseUrl });

  const corpusCount = await prisma.corpus.count({ where: { contentHash: CONTENT_HASH } });
  if (corpusCount !== 1) {
    throw new Error(`expected exactly 1 corpus row for contentHash, got ${corpusCount}`);
  }

  const dbChunkCount = await prisma.chunk.count({ where: { corpusId: first.corpusId } });
  if (dbChunkCount !== first.chunkCount) {
    throw new Error(`expected ${first.chunkCount} chunks in DB, got ${dbChunkCount}`);
  }

  const sample = await prisma.chunk.findFirst({
    where: { corpusId: first.corpusId },
    orderBy: { ord: "asc" }
  });
  if (!sample) {
    throw new Error("expected at least one chunk row");
  }
  if (sample.modelName !== EMBEDDING_MODEL) {
    throw new Error(`expected modelName=${EMBEDDING_MODEL}, got ${sample.modelName}`);
  }
  if (!sample.embedding || !(sample.embedding instanceof Uint8Array)) {
    throw new Error(
      `chunk.embedding must be a Uint8Array (Prisma 6 Bytes shape), got ${sample.embedding?.constructor?.name ?? typeof sample.embedding}`
    );
  }
  const floats = new Float32Array(
    sample.embedding.buffer.slice(
      sample.embedding.byteOffset,
      sample.embedding.byteOffset + sample.embedding.byteLength
    )
  );
  if (floats.length !== EMBEDDING_DIMENSION) {
    throw new Error(`expected ${EMBEDDING_DIMENSION}-dim embedding, got ${floats.length}`);
  }

  console.log(
    `[smoke] DB OK — corpus.count=${corpusCount}, chunk.count=${dbChunkCount}, dimension=${floats.length}, modelName=${sample.modelName}`
  );

  console.log(
    `[smoke] PASS — chunk_count=${first.chunkCount} dimension=${floats.length} idempotency=true`
  );
} finally {
  await prisma?.$disconnect().catch(() => undefined);
  await app?.close().catch(() => undefined);
  await smokeDb?.stop();
}
