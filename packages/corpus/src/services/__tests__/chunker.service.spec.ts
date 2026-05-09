import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  CHUNK_OVERLAP_TOKENS,
  CHUNK_SIZE_TOKENS,
  CHUNK_STRIDE_TOKENS,
  MODEL_MAX_TOKENS,
  SPECIAL_TOKEN_RESERVE,
  effectiveChunkBodySize,
  windowTokenIds
} from "../chunker.service";

describe("windowTokenIds", () => {
  it("returns an empty list for an empty input", () => {
    assert.deepEqual(windowTokenIds([]), []);
  });

  it("returns one full-size window when input fits exactly", () => {
    const ids = Array.from({ length: CHUNK_SIZE_TOKENS }, (_, i) => i);
    const windows = windowTokenIds(ids);
    assert.equal(windows.length, 1);
    assert.deepEqual(windows[0], { ord: 0, start: 0, end: 512, tokenCount: 512 });
  });

  it("splits 1500 tokens into 4 windows with stride 462 + final remainder (default 512/50)", () => {
    const ids = Array.from({ length: 1500 }, (_, i) => i);
    const windows = windowTokenIds(ids);

    assert.equal(windows.length, 4, "1500 tokens at stride 462 → 4 windows");
    assert.deepEqual(
      windows.map((w) => w.start),
      [0, 462, 924, 1386],
      "window starts must equal {0, 462, 924, 1386}"
    );
    assert.deepEqual(
      windows.map((w) => w.tokenCount),
      [512, 512, 512, 114],
      "first three windows are full 512, final window holds the 114-token remainder"
    );

    for (const w of windows) {
      assert.ok(w.tokenCount <= CHUNK_SIZE_TOKENS, `window ${w.ord} exceeds size`);
    }

    for (let i = 1; i < windows.length - 1; i++) {
      const prev = windows[i - 1];
      const current = windows[i];
      if (!prev || !current) {
        throw new Error("window overlap assertion index out of bounds");
      }
      const overlap = prev.end - current.start;
      assert.equal(
        overlap,
        CHUNK_OVERLAP_TOKENS,
        `window ${current.ord} must overlap previous by exactly ${CHUNK_OVERLAP_TOKENS} tokens`
      );
    }
  });

  it("respects a parametrized smaller chunk size (effective body after overhead reserve)", () => {
    // simulate body=506 (= 512 - 2 specials - 4 prefix), overlap=50, stride=456
    const ids = Array.from({ length: 1500 }, (_, i) => i);
    const windows = windowTokenIds(ids, 506, 50);

    assert.deepEqual(
      windows.map((w) => w.start),
      [0, 456, 912, 1368],
      "smaller body shifts starts to {0, 456, 912, 1368}"
    );
    for (const w of windows) {
      assert.ok(w.tokenCount <= 506, `window ${w.ord} exceeds parametrized size`);
    }
  });

  it("uses stride = size − overlap", () => {
    assert.equal(CHUNK_STRIDE_TOKENS, CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS);
  });

  it("rejects chunkSize <= overlap", () => {
    assert.throws(() => windowTokenIds([1, 2, 3], 50, 50), /must be > overlap/);
    assert.throws(() => windowTokenIds([1, 2, 3], 40, 50), /must be > overlap/);
  });
});

describe("effectiveChunkBodySize", () => {
  it("subtracts specials + prefix from MODEL_MAX_TOKENS", () => {
    // typical sentencepiece tokenization of "passage: " ≈ 4 tokens
    const body = effectiveChunkBodySize(4);
    assert.equal(body, MODEL_MAX_TOKENS - SPECIAL_TOKEN_RESERVE - 4);
    assert.ok(body < MODEL_MAX_TOKENS, "effective body must reserve overhead");
    assert.ok(body > CHUNK_OVERLAP_TOKENS, "effective body must exceed overlap");
  });

  it("rejects prefixes that leave the body smaller than the overlap window", () => {
    // overlap=50, MODEL_MAX=512, specials=2 → max prefix that still works = 459
    assert.throws(
      () => effectiveChunkBodySize(MODEL_MAX_TOKENS - SPECIAL_TOKEN_RESERVE - CHUNK_OVERLAP_TOKENS),
      /must exceed overlap/
    );
  });
});
