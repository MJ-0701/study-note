import { Injectable } from "@nestjs/common";

export const CHUNK_SIZE_TOKENS = 512;
export const CHUNK_OVERLAP_TOKENS = 50;
export const CHUNK_STRIDE_TOKENS = CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS; // 462
export const TOKENIZER_MODEL = "Xenova/multilingual-e5-base";

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
 * Pure windowing — given a flat array of token ids, return the 512/50 windows.
 * Exported so unit tests can feed a synthetic id array (e.g. 1500 sequential
 * ints) and assert exact start indices + token counts without paying the
 * tokenizer download cost or depending on Korean text tokenization drift.
 */
export function windowTokenIds(ids: number[]): TokenWindow[] {
  if (ids.length === 0) {
    return [];
  }
  const windows: TokenWindow[] = [];
  let ord = 0;
  for (let start = 0; start < ids.length; start += CHUNK_STRIDE_TOKENS) {
    const end = Math.min(start + CHUNK_SIZE_TOKENS, ids.length);
    windows.push({ ord: ord++, start, end, tokenCount: end - start });
    if (end >= ids.length) {
      break;
    }
  }
  return windows;
}

type Tokenizer = {
  encode: (text: string, text_pair?: string | null, opts?: Record<string, unknown>) => number[];
  decode: (ids: number[], opts?: Record<string, unknown>) => string;
};

let cachedTokenizer: Tokenizer | null = null;

async function loadTokenizer(): Promise<Tokenizer> {
  if (cachedTokenizer) {
    return cachedTokenizer;
  }
  // dynamic import — @xenova/transformers is ESM
  const { AutoTokenizer } = await import("@xenova/transformers");
  cachedTokenizer = (await AutoTokenizer.from_pretrained(TOKENIZER_MODEL)) as unknown as Tokenizer;
  return cachedTokenizer;
}

@Injectable()
export class ChunkerService {
  /**
   * Split text into 512-token chunks with 50-token overlap (stride 462) using
   * the multilingual-e5-base XLM-Roberta tokenizer. Uses the SAME tokenizer
   * the embedder will use, so the 512-token contract is honored end to end.
   */
  async chunk(text: string): Promise<Chunk[]> {
    const tokenizer = await loadTokenizer();
    const ids = tokenizer.encode(text, null, { add_special_tokens: false });

    const windows = windowTokenIds(ids);
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
