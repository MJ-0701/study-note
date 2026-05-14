import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  EmbeddingService,
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  __setPipelineForTests
} from "../embedding.service";

/**
 * Sprint-3 Gate 6 round 2 finding 2 — focused evidence that EmbeddingService
 * exposes two prefix-distinct entry points (`embed` for passages, `embedQuery`
 * for retrieval queries). We avoid invoking the real model: cachedPipeline is
 * a module-level singleton so a runtime mock would leak into other specs.
 * Instead we (a) verify the public API surface and (b) confirm the source
 * contract via a string-level check on the compiled source. This is light
 * but precise — the only thing being asserted is "the two prefixes are
 * distinct + used by the right method".
 */

describe("EmbeddingService prefix contract", () => {
  const SOURCE_PATH = resolve(__dirname, "../embedding.service.js");
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("exposes embed() and embedQuery() with distinct passage/query prefixes", () => {
    const svc = new EmbeddingService();
    assert.equal(typeof svc.embed, "function");
    assert.equal(typeof svc.embedQuery, "function");
    assert.notEqual(svc.embed, svc.embedQuery, "embed and embedQuery must be distinct methods");
  });

  it("compiled source contains exactly one passage-prefix template and one query-prefix template", () => {
    const passageHits = (source.match(/`passage:\s*\$\{[^}]+\}`/g) ?? []).length;
    const queryHits = (source.match(/`query:\s*\$\{[^}]+\}`/g) ?? []).length;
    assert.equal(passageHits, 1, `expected 1 passage: template, found ${passageHits}`);
    assert.equal(queryHits, 1, `expected 1 query: template, found ${queryHits}`);
  });

  it("model + dimension constants match e5-base contract", () => {
    const svc = new EmbeddingService();
    assert.equal(svc.modelName(), EMBEDDING_MODEL);
    assert.equal(svc.modelName(), "Xenova/multilingual-e5-base");
    assert.equal(svc.dimension(), EMBEDDING_DIMENSION);
    assert.equal(svc.dimension(), 768);
  });

  it("embedQuery() passes a runtime `query: ` prefix to the pipeline (AC7)", async () => {
    const captured: string[] = [];
    const fakePipeline = async (text: string | string[]) => {
      captured.push(typeof text === "string" ? text : text.join("|"));
      return { data: new Float32Array(EMBEDDING_DIMENSION) };
    };
    __setPipelineForTests(fakePipeline as never);
    try {
      const svc = new EmbeddingService();
      await svc.embedQuery("반가산기 진리표");
      assert.equal(captured.length, 1);
      const value = captured[0];
      assert.ok(value);
      assert.match(value, /^query: /, `expected runtime input to start with "query: ", got: ${value}`);
      assert.equal(value, "query: 반가산기 진리표");
    } finally {
      __setPipelineForTests(null);
    }
  });

  it("embed() passes a runtime `passage: ` prefix to the pipeline (regression complement)", async () => {
    const captured: string[] = [];
    const fakePipeline = async (text: string | string[]) => {
      captured.push(typeof text === "string" ? text : text.join("|"));
      return { data: new Float32Array(EMBEDDING_DIMENSION) };
    };
    __setPipelineForTests(fakePipeline as never);
    try {
      const svc = new EmbeddingService();
      await svc.embed("반가산기 본문 chunk");
      assert.equal(captured.length, 1);
      const value = captured[0];
      assert.ok(value);
      assert.match(value, /^passage: /);
      assert.equal(value, "passage: 반가산기 본문 chunk");
    } finally {
      __setPipelineForTests(null);
    }
  });
});
