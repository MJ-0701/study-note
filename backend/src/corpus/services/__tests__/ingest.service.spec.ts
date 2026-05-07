import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { ChunkerService } from "../chunker.service";
import type { EmbeddingService } from "../embedding.service";
import { IngestService } from "../ingest.service";
import type { PdfTextExtractorService } from "../pdf-text-extractor.service";

type PrismaStub = {
  corpus: { findUnique: () => Promise<unknown>; create: () => Promise<unknown> };
  chunk: { count: () => Promise<number>; create: () => Promise<unknown> };
  $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
};

function buildService(opts: {
  chunkerOutput: { ord: number; text: string; charCount: number; tokenCount: number }[];
  prismaCalls?: { create?: number; transaction?: number };
}): {
  service: IngestService;
  prismaCalls: { create: number; transaction: number };
} {
  const prismaCalls = { create: 0, transaction: 0 };

  const prisma: PrismaStub = {
    corpus: {
      findUnique: async () => null,
      create: async () => {
        prismaCalls.create++;
        return { id: "should-not-be-created" };
      }
    },
    chunk: {
      count: async () => 0,
      create: async () => ({})
    },
    $transaction: async (_fn) => {
      prismaCalls.transaction++;
      return { id: "should-not-be-created" };
    }
  };

  const chunker: Pick<ChunkerService, "chunk"> = {
    chunk: async () => opts.chunkerOutput
  };
  const embedder: Pick<EmbeddingService, "embed" | "modelName" | "dimension"> = {
    embed: async () => new Float32Array(768),
    modelName: () => "Xenova/multilingual-e5-base",
    dimension: () => 768
  };
  const extractor: Pick<PdfTextExtractorService, "extract"> = {
    extract: async () => ""
  };

  const service = new IngestService(
    prisma as never,
    extractor as PdfTextExtractorService,
    chunker as ChunkerService,
    embedder as EmbeddingService
  );

  return { service, prismaCalls };
}

describe("IngestService.ingestExtracted guards", () => {
  it("throws on empty text BEFORE any Prisma write", async () => {
    const { service, prismaCalls } = buildService({ chunkerOutput: [] });
    await assert.rejects(
      () =>
        service.ingestExtracted({
          subject: "digital-engineering",
          text: "",
          sourceLabel: "smoke://empty",
          contentHash: "deadbeef".repeat(8)
        }),
      /empty or whitespace/
    );
    assert.equal(prismaCalls.create, 0, "must not have created a corpus row");
    assert.equal(prismaCalls.transaction, 0, "must not have opened a transaction");
  });

  it("throws on whitespace-only text BEFORE any Prisma write", async () => {
    const { service, prismaCalls } = buildService({ chunkerOutput: [] });
    await assert.rejects(
      () =>
        service.ingestExtracted({
          subject: "digital-engineering",
          text: "   \n  \t  \n",
          sourceLabel: "smoke://whitespace",
          contentHash: "cafebabe".repeat(8)
        }),
      /empty or whitespace/
    );
    assert.equal(prismaCalls.create, 0);
    assert.equal(prismaCalls.transaction, 0);
  });

  it("throws when chunker yields zero chunks for non-empty text BEFORE persist", async () => {
    const { service, prismaCalls } = buildService({ chunkerOutput: [] });
    await assert.rejects(
      () =>
        service.ingestExtracted({
          subject: "digital-engineering",
          text: "real but unchunkable text",
          sourceLabel: "smoke://no-chunks",
          contentHash: "babecafe".repeat(8)
        }),
      /chunker produced 0 chunks/
    );
    assert.equal(prismaCalls.create, 0);
    assert.equal(prismaCalls.transaction, 0);
  });
});
