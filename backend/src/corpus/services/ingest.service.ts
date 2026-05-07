import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { PrismaService } from "../../prisma/prisma.service";
import { ChunkerService } from "./chunker.service";
import { EmbeddingService } from "./embedding.service";
import { PdfTextExtractorService } from "./pdf-text-extractor.service";

export interface IngestInput {
  pdfPath: string;
  subject: string;
}

export interface IngestExtractedInput {
  subject: string;
  text: string;
  sourceLabel: string;
  contentHash: string;
}

export interface IngestResult {
  corpusId: string;
  contentHash: string;
  chunkCount: number;
  alreadyIngested: boolean;
  modelName: string;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractor: PdfTextExtractorService,
    private readonly chunker: ChunkerService,
    private readonly embedder: EmbeddingService
  ) {}

  /**
   * Ingest one PDF into the corpus. Reads the file, hashes it, extracts text
   * via pdf-parse, then delegates to ingestExtracted. Idempotency policy =
   * (a) 중복 무시: same content_hash → early return with alreadyIngested=true.
   */
  async execute(input: IngestInput): Promise<IngestResult> {
    const { pdfPath, subject } = input;

    const buffer = await fs.readFile(pdfPath);
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");

    const existing = await this.findExisting(contentHash);
    if (existing) {
      return existing;
    }

    this.logger.log(`extracting text from ${pdfPath}`);
    const text = await this.extractor.extract(pdfPath);

    return this.ingestExtracted({ subject, text, sourceLabel: pdfPath, contentHash });
  }

  /**
   * Ingest pre-extracted text. Used by smoke / future non-PDF sources
   * (raw notes, etc). Same idempotency policy as execute().
   */
  async ingestExtracted(input: IngestExtractedInput): Promise<IngestResult> {
    const { subject, text, sourceLabel, contentHash } = input;

    const existing = await this.findExisting(contentHash);
    if (existing) {
      return existing;
    }

    this.logger.log(`chunking text (${text.length} chars)`);
    const chunks = await this.chunker.chunk(text);
    this.logger.log(`got ${chunks.length} chunks`);

    const modelName = this.embedder.modelName();
    this.logger.log(`embedding ${chunks.length} chunks via ${modelName}`);
    const embeddings: Uint8Array<ArrayBuffer>[] = [];
    for (const chunk of chunks) {
      const vec = await this.embedder.embed(chunk.text);
      // copy into a fresh ArrayBuffer-backed view so Prisma's Bytes column accepts it
      const fresh = new ArrayBuffer(vec.byteLength);
      const copy = new Uint8Array(fresh);
      copy.set(new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength));
      embeddings.push(copy);
    }

    this.logger.log(`persisting corpus + ${chunks.length} chunks`);
    const corpus = await this.prisma.$transaction(async (tx) => {
      const created = await tx.corpus.create({
        data: { subject, sourcePdfPath: sourceLabel, contentHash }
      });
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await tx.chunk.create({
          data: {
            corpusId: created.id,
            ord: chunk.ord,
            text: chunk.text,
            charCount: chunk.charCount,
            embedding: embeddings[i],
            modelName
          }
        });
      }
      return created;
    });

    return {
      corpusId: corpus.id,
      contentHash,
      chunkCount: chunks.length,
      alreadyIngested: false,
      modelName
    };
  }

  private async findExisting(contentHash: string): Promise<IngestResult | null> {
    const existing = await this.prisma.corpus.findUnique({ where: { contentHash } });
    if (!existing) {
      return null;
    }
    const chunkCount = await this.prisma.chunk.count({ where: { corpusId: existing.id } });
    this.logger.log(
      `corpus already ingested: contentHash=${contentHash} corpusId=${existing.id} chunkCount=${chunkCount}`
    );
    return {
      corpusId: existing.id,
      contentHash,
      chunkCount,
      alreadyIngested: true,
      modelName: this.embedder.modelName()
    };
  }
}
