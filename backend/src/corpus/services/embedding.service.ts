import { Injectable } from "@nestjs/common";
import { MODEL_MAX_TOKENS } from "./chunker.service";
import { configureTransformersEnv } from "./transformers-env";

export const EMBEDDING_MODEL = "Xenova/multilingual-e5-base";
export const EMBEDDING_DIMENSION = 768;

type FeatureExtractionPipeline = (
  text: string | string[],
  opts?: Record<string, unknown>
) => Promise<{ data: Float32Array }>;

let cachedPipeline: FeatureExtractionPipeline | null = null;

async function loadPipeline(): Promise<FeatureExtractionPipeline> {
  if (cachedPipeline) {
    return cachedPipeline;
  }
  await configureTransformersEnv();
  const transformers = await import("@xenova/transformers");
  const built = await transformers.pipeline("feature-extraction", EMBEDDING_MODEL);
  cachedPipeline = built as unknown as FeatureExtractionPipeline;
  return cachedPipeline;
}

@Injectable()
export class EmbeddingService {
  /**
   * Embed a passage chunk. multilingual-e5-base expects "passage: " prefix
   * for document chunks. Returns a 768-dim Float32 vector that is mean-pooled
   * and L2-normalized. truncation belt clips at MODEL_MAX_TOKENS so a
   * mis-sized chunk never silently exceeds the e5 context window.
   */
  async embed(text: string): Promise<Float32Array> {
    const pipeline = await loadPipeline();
    const output = await pipeline(`passage: ${text}`, {
      pooling: "mean",
      normalize: true,
      truncation: true,
      max_length: MODEL_MAX_TOKENS
    });
    return output.data;
  }

  /**
   * Embed a retrieval query. multilingual-e5-base contract: passages get
   * `passage: ` prefix, queries get `query: `. Sprint-3 retrieval uses this;
   * embed() (above) stays passage-only so the sprint-2 corpus pipeline is
   * untouched. Same 768-dim L2-normalized output.
   */
  async embedQuery(text: string): Promise<Float32Array> {
    const pipeline = await loadPipeline();
    const output = await pipeline(`query: ${text}`, {
      pooling: "mean",
      normalize: true,
      truncation: true,
      max_length: MODEL_MAX_TOKENS
    });
    return output.data;
  }

  modelName(): string {
    return EMBEDDING_MODEL;
  }

  dimension(): number {
    return EMBEDDING_DIMENSION;
  }
}
