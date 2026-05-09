import * as path from "node:path";

export const TRANSFORMERS_CACHE_DIR = path.resolve(
  process.cwd(),
  "local-materials/.xenova-cache"
);

let configured = false;

/**
 * Route every @xenova/transformers asset (tokenizer + model weights) through
 * the repo-local cache. Both ChunkerService.loadTokenizer and
 * EmbeddingService.loadPipeline must call this before dynamic-importing
 * transformers, otherwise whichever loads first writes its assets to the
 * default cache (~/.cache/huggingface/...) and breaks the gitignored cache
 * contract from sprint-2 plan §K8.
 */
export async function configureTransformersEnv(): Promise<void> {
  const transformers = await import("@xenova/transformers");
  if (!configured) {
    (transformers.env as { cacheDir?: string }).cacheDir = TRANSFORMERS_CACHE_DIR;
    configured = true;
  }
  return;
}
