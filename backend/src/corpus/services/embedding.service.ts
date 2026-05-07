import { Injectable } from "@nestjs/common";
import * as path from "node:path";

export const EMBEDDING_MODEL = "Xenova/multilingual-e5-base";
export const EMBEDDING_DIMENSION = 768;
const CACHE_DIR = path.resolve(process.cwd(), "local-materials/.xenova-cache");

type FeatureExtractionPipeline = (
  text: string | string[],
  opts?: Record<string, unknown>
) => Promise<{ data: Float32Array }>;

let cachedPipeline: FeatureExtractionPipeline | null = null;

async function loadPipeline(): Promise<FeatureExtractionPipeline> {
  if (cachedPipeline) {
    return cachedPipeline;
  }
  const transformers = await import("@xenova/transformers");
  // route model cache under repo-local local-materials so dev runs are
  // reproducible and the cache is gitignored alongside lecture PDFs.
  (transformers.env as { cacheDir?: string }).cacheDir = CACHE_DIR;
  const built = await transformers.pipeline("feature-extraction", EMBEDDING_MODEL);
  cachedPipeline = built as unknown as FeatureExtractionPipeline;
  return cachedPipeline;
}

@Injectable()
export class EmbeddingService {
  /**
   * Embed a passage chunk. multilingual-e5-base expects "passage: " prefix
   * for document chunks (and "query: " for retrieval queries — that lands
   * in the next sprint when retrieval is wired). Returns a 768-dim Float32
   * vector that is mean-pooled and L2-normalized.
   */
  async embed(text: string): Promise<Float32Array> {
    const pipeline = await loadPipeline();
    const output = await pipeline(`passage: ${text}`, { pooling: "mean", normalize: true });
    return output.data;
  }

  modelName(): string {
    return EMBEDDING_MODEL;
  }

  dimension(): number {
    return EMBEDDING_DIMENSION;
  }
}
