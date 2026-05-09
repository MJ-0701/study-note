import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { executeGetChunks, makeGetChunksHandler } from "../get-chunks.tool";
import type { RetrievalService, RetrievedChunk } from "../../persona/services/retrieval.service";

// sprint-2 plan §3 AC6 — get_chunks tool unit spec (4 case lock).

function makeRetrievalStub(chunks: RetrievedChunk[]): Pick<RetrievalService, "retrieveTopK"> {
  return { async retrieveTopK() { return chunks; } };
}

function makeRetrievalThrow(err: Error): Pick<RetrievalService, "retrieveTopK"> {
  return { async retrieveTopK() { throw err; } };
}

describe("get_chunks tool — happy path (AC6 success)", () => {
  it("returns top-k chunks with safe basename and JSON-text content", async () => {
    const retrieval = makeRetrievalStub([
      { ord: 1, corpusId: "cmovexample0001", sourcePdfPath: "/Users/mj/private/de.pdf", text: "본문1", score: 0.85 },
      { ord: 2, corpusId: "cmovexample0001", sourcePdfPath: "/Users/mj/private/de.pdf", text: "본문2", score: 0.7 }
    ]);

    const out = await executeGetChunks(retrieval, { subject: "digital-engineering", query: "반가산기", k: 2 });

    assert.equal(out.retrievedCount, 2);
    assert.equal(out.chunks.length, 2);
    // safe-path: 절대 경로 노출 0
    assert.equal(out.chunks[0]?.sourcePdfPath, "de.pdf");
    assert.ok(!JSON.stringify(out).includes("/Users/mj/private"));

    // handler wrapper → CallToolResult { content: [{ type: "text", text: JSON }] }
    const handler = makeGetChunksHandler(retrieval);
    const result = await handler({ subject: "digital-engineering", query: "반가산기", k: 2 });
    assert.equal(result.content[0]?.type, "text");
    assert.match(result.content[0]?.text ?? "", /"chunks":/);
  });
});

describe("get_chunks tool — invalid input (AC6 InvalidParams)", () => {
  it("rejects subject with uppercase letter", async () => {
    const retrieval = makeRetrievalStub([]);
    await assert.rejects(
      () => executeGetChunks(retrieval, { subject: "Digital-Engineering", query: "x" }),
      (err) => err instanceof McpError && err.code === -32602 && /subject/.test(err.message)
    );
  });

  it("rejects empty query (after trim)", async () => {
    const retrieval = makeRetrievalStub([]);
    await assert.rejects(
      () => executeGetChunks(retrieval, { subject: "digital-engineering", query: "   " }),
      (err) => err instanceof McpError && err.code === -32602 && /query/.test(err.message)
    );
  });

  it("rejects k out of range (k=21)", async () => {
    const retrieval = makeRetrievalStub([]);
    await assert.rejects(
      () => executeGetChunks(retrieval, { subject: "digital-engineering", query: "x", k: 21 }),
      (err) => err instanceof McpError && err.code === -32602 && /k/.test(err.message)
    );
  });
});

describe("get_chunks tool — empty corpus (AC6 success with empty chunks)", () => {
  it("returns {chunks: [], retrievedCount: 0} (success, NOT error)", async () => {
    const retrieval = makeRetrievalStub([]);
    const out = await executeGetChunks(retrieval, { subject: "digital-engineering", query: "x" });
    assert.deepEqual(out, { chunks: [], retrievedCount: 0 });
  });
});

describe("get_chunks tool — retrieval throw (AC6 InternalError + RETRIEVAL_FAILED)", () => {
  it("wraps retrieval error as McpError(InternalError) with errorCode", async () => {
    const retrieval = makeRetrievalThrow(new Error("DB down"));
    await assert.rejects(
      () => executeGetChunks(retrieval, { subject: "digital-engineering", query: "x" }),
      (err) => {
        if (!(err instanceof McpError)) return false;
        if (err.code !== -32603) return false;
        if (!/DB down/.test(err.message)) return false;
        const data = err.data as { errorCode?: string } | undefined;
        return data?.errorCode === "RETRIEVAL_FAILED";
      }
    );
  });
});
