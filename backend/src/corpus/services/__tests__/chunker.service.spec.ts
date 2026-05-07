import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  CHUNK_OVERLAP_TOKENS,
  CHUNK_SIZE_TOKENS,
  CHUNK_STRIDE_TOKENS,
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

  it("splits 1500 tokens into 4 windows with stride 462 + final remainder", () => {
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

    for (let i = 1; i < windows.length; i++) {
      const prev = windows[i - 1];
      const curr = windows[i];
      const overlap = prev.end - curr.start;
      if (i < windows.length - 1) {
        assert.equal(
          overlap,
          CHUNK_OVERLAP_TOKENS,
          `window ${curr.ord} must overlap previous by exactly ${CHUNK_OVERLAP_TOKENS} tokens`
        );
      } else {
        assert.ok(overlap >= 0, "final window may have shorter overlap when input ends");
      }
    }
  });

  it("uses stride = size − overlap", () => {
    assert.equal(CHUNK_STRIDE_TOKENS, CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS);
  });
});
