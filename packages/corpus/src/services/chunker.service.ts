import { Injectable } from "@nestjs/common";
import { configureTransformersEnv } from "./transformers-env";

// e5 model context = 512 tokens INCLUDING the 2 XLM-Roberta specials (<s>, </s>)
// AND the passage/query prefix the embedder prepends. The chunker reserves
// for both so chunk text + prefix + specials ≤ MODEL_MAX_TOKENS at embed time.
export const MODEL_MAX_TOKENS = 512;
export const SPECIAL_TOKEN_RESERVE = 2;
export const EMBEDDING_PASSAGE_PREFIX = "passage: ";
export const CHUNK_OVERLAP_TOKENS = 50;
export const TOKENIZER_MODEL = "Xenova/multilingual-e5-base";

// Logical contract from plan §AC3 — windowing math is exercised at this size.
// Production chunk() uses an effective size that subtracts overhead so the
// embedder's actual model input never exceeds MODEL_MAX_TOKENS.
export const CHUNK_SIZE_TOKENS = 512;
export const CHUNK_STRIDE_TOKENS = CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS;

export interface Chunk {
  ord: number;
  text: string;
  charCount: number;
  tokenCount: number;
}

export interface TokenWindow {
  ord: number;
  start: number;
  end: number;
  tokenCount: number;
}

/**
 * Pure windowing — given a flat array of token ids, return chunkSize/overlap
 * windows. Defaults to plan §AC3's logical 512/50; production callers pass
 * a smaller effective size to leave room for embedder prefix + specials.
 */
export function windowTokenIds(
  ids: number[],
  chunkSize: number = CHUNK_SIZE_TOKENS,
  overlap: number = CHUNK_OVERLAP_TOKENS
): TokenWindow[] {
  if (ids.length === 0) {
    return [];
  }
  if (chunkSize <= overlap) {
    throw new Error(`chunkSize (${chunkSize}) must be > overlap (${overlap})`);
  }
  const stride = chunkSize - overlap;
  const windows: TokenWindow[] = [];
  let ord = 0;
  for (let start = 0; start < ids.length; start += stride) {
    const end = Math.min(start + chunkSize, ids.length);
    windows.push({ ord: ord++, start, end, tokenCount: end - start });
    if (end >= ids.length) {
      break;
    }
  }
  return windows;
}

/**
 * Compute the chunk body size that leaves room for special tokens AND the
 * embedder's passage prefix at embed time. Exported so both production code
 * and tests can pin the budget calculation deterministically.
 */
export function effectiveChunkBodySize(prefixTokenCount: number): number {
  const body = MODEL_MAX_TOKENS - SPECIAL_TOKEN_RESERVE - prefixTokenCount;
  if (body <= CHUNK_OVERLAP_TOKENS) {
    throw new Error(
      `effective chunk body (${body}) must exceed overlap (${CHUNK_OVERLAP_TOKENS}); prefix too long`
    );
  }
  return body;
}

type Tokenizer = {
  encode: (text: string, text_pair?: string | null, opts?: Record<string, unknown>) => number[];
  decode: (ids: number[], opts?: Record<string, unknown>) => string;
};

let cachedTokenizer: Tokenizer | null = null;
let cachedPrefixTokenCount: number | null = null;

async function loadTokenizer(): Promise<Tokenizer> {
  if (cachedTokenizer) {
    return cachedTokenizer;
  }
  await configureTransformersEnv();
  const { AutoTokenizer } = await import("@xenova/transformers");
  cachedTokenizer = (await AutoTokenizer.from_pretrained(TOKENIZER_MODEL)) as unknown as Tokenizer;
  return cachedTokenizer;
}

@Injectable()
export class ChunkerService {
  /**
   * Split text into windows that fit the e5 model's 512-token context after
   * the embedder prepends "passage: " and the tokenizer adds <s>/</s>. Uses
   * the SAME tokenizer the embedder will use, so the contract is honored
   * end to end.
   */
  async chunk(text: string): Promise<Chunk[]> {
    const tokenizer = await loadTokenizer();
    const ids = tokenizer.encode(text, null, { add_special_tokens: false });

    if (cachedPrefixTokenCount === null) {
      cachedPrefixTokenCount = tokenizer.encode(EMBEDDING_PASSAGE_PREFIX, null, {
        add_special_tokens: false
      }).length;
    }
    const bodySize = effectiveChunkBodySize(cachedPrefixTokenCount);

    const windows = windowTokenIds(ids, bodySize, CHUNK_OVERLAP_TOKENS);
    return windows.map((w) => {
      const slice = ids.slice(w.start, w.end);
      const decoded = tokenizer.decode(slice, { skip_special_tokens: true });
      return {
        ord: w.ord,
        text: decoded,
        charCount: decoded.length,
        tokenCount: w.tokenCount
      };
    });
  }
}
