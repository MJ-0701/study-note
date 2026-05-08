import { Injectable } from "@nestjs/common";
import { EmbeddingService } from "../../corpus/services/embedding.service";
import { PrismaService } from "../../prisma/prisma.service";

export interface RetrievedChunk {
  ord: number;
  corpusId: string;
  sourcePdfPath: string;
  text: string;
  score: number;
}

export interface RetrieveTopKInput {
  subject: string;
  queryText: string;
  k: number;
}

interface CosineCandidate {
  ord: number;
  corpusId: string;
  sourcePdfPath: string;
  text: string;
  vector: Float32Array;
}

/**
 * Pure cosine ranking over already-L2-normalized vectors. Sprint-2
 * EmbeddingService uses pipeline(..., { normalize: true }), so each stored
 * chunk embedding is a unit vector — cosine reduces to the dot product.
 * Exported for unit tests so windowing / scoring math is verifiable without
 * Prisma or the tokenizer.
 */
export function cosineRank(
  query: Float32Array,
  candidates: CosineCandidate[],
  k: number
): RetrievedChunk[] {
  const ranked = candidates
    .map((c) => ({ ...c, score: dot(query, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k));
  return ranked.map(({ ord, corpusId, sourcePdfPath, text, score }) => ({
    ord,
    corpusId,
    sourcePdfPath,
    text,
    score
  }));
}

function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedder: EmbeddingService
  ) {}

  /**
   * Stub retrieval: load every chunk for the subject's corpora into memory,
   * embed the query, cosine-rank. Acceptance for sprint-3 (ADR 0004 follow-up
   * retrieval_first_pick) — vector store migration is sprint-4+.
   */
  async retrieveTopK(input: RetrieveTopKInput): Promise<RetrievedChunk[]> {
    const { subject, queryText, k } = input;
    if (k < 0) {
      throw new Error(`k must be >= 0, got ${k}`);
    }
    const queryVec = await this.embedder.embedQuery(queryText);

    const chunks = await this.prisma.chunk.findMany({
      where: { corpus: { subject } },
      include: { corpus: true }
    });
    if (chunks.length === 0) {
      return [];
    }

    const candidates: CosineCandidate[] = [];
    for (const c of chunks) {
      if (!c.embedding || c.embedding.byteLength === 0) {
        continue;
      }
      const buf = c.embedding as unknown as Uint8Array;
      const vec = new Float32Array(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      );
      if (vec.length !== queryVec.length) {
        continue;
      }
      candidates.push({
        ord: c.ord,
        corpusId: c.corpusId,
        sourcePdfPath: c.corpus.sourcePdfPath,
        text: c.text,
        vector: vec
      });
    }

    return cosineRank(queryVec, candidates, k);
  }
}
