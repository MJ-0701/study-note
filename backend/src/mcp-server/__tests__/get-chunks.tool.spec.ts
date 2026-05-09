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
  it("wraps retrieval error as McpError(InternalError) with errorCode and REDACTS internal message (Gate 6 F1)", async () => {
    // Gate 6 round 1 F1 — internal exception text must NOT leak over MCP wire.
    const retrieval = makeRetrievalThrow(new Error("DB down: connection refused 127.0.0.1:33999 secret-creds"));
    await assert.rejects(
      () => executeGetChunks(retrieval, { subject: "digital-engineering", query: "x" }),
      (err) => {
        if (!(err instanceof McpError)) return false;
        if (err.code !== -32603) return false;
        // Wire message MUST be generic "retrieval failure" — no DB/config/path leak.
        // McpError 가 "MCP error -32603: <msg>" prefix 자동 추가 → endsWith check.
        if (!err.message.endsWith(": retrieval failure")) return false;
        if (/secret-creds|127\.0\.0\.1|connection refused/.test(err.message)) return false;
        const data = err.data as { errorCode?: string } | undefined;
        return data?.errorCode === "RETRIEVAL_FAILED";
      }
    );
  });
});

describe("get_chunks tool — safe path leak regression (Gate 6 F2)", () => {
  it("strips smoke:///abs/path/file.pdf scheme + returns basename only (no abs path leak)", async () => {
    const retrieval = makeRetrievalStub([
      { ord: 0, corpusId: "x", sourcePdfPath: "smoke:///Users/mj/private/leaked.pdf", text: "t", score: 1 }
    ]);
    const out = await executeGetChunks(retrieval, { subject: "digital-engineering", query: "x" });
    assert.equal(out.chunks[0]?.sourcePdfPath, "leaked.pdf");
    assert.ok(!JSON.stringify(out).includes("/Users/mj/private"));
    assert.ok(!JSON.stringify(out).includes("smoke://"));
  });

  it("strips file:// scheme similarly", async () => {
    const retrieval = makeRetrievalStub([
      { ord: 0, corpusId: "x", sourcePdfPath: "file:///etc/passwd-like.pdf", text: "t", score: 1 }
    ]);
    const out = await executeGetChunks(retrieval, { subject: "digital-engineering", query: "x" });
    assert.equal(out.chunks[0]?.sourcePdfPath, "passwd-like.pdf");
    assert.ok(!JSON.stringify(out).includes("/etc/"));
  });

  it("strips Windows backslash path + drive letter (Gate 6 round 2 F3)", async () => {
    const retrieval = makeRetrievalStub([
      { ord: 0, corpusId: "x", sourcePdfPath: "C:\\Users\\mj\\private\\windows-file.pdf", text: "t", score: 1 }
    ]);
    const out = await executeGetChunks(retrieval, { subject: "digital-engineering", query: "x" });
    assert.equal(out.chunks[0]?.sourcePdfPath, "windows-file.pdf");
    assert.ok(!JSON.stringify(out).includes("Users"));
    assert.ok(!JSON.stringify(out).includes("private"));
    assert.ok(!JSON.stringify(out).includes("C:"));
  });

  it("strips mixed-separator paths", async () => {
    const retrieval = makeRetrievalStub([
      { ord: 0, corpusId: "x", sourcePdfPath: "D:/data\\nested/leak.pdf", text: "t", score: 1 }
    ]);
    const out = await executeGetChunks(retrieval, { subject: "digital-engineering", query: "x" });
    assert.equal(out.chunks[0]?.sourcePdfPath, "leak.pdf");
  });
});

describe("get_chunks tool — non-string query (Gate 6 round 2 F1)", () => {
  it("rejects number/null query as InvalidParams (not TypeError)", async () => {
    const retrieval = makeRetrievalStub([]);
    await assert.rejects(
      () => executeGetChunks(retrieval, { subject: "digital-engineering", query: 42 as never }),
      (err) => err instanceof McpError && err.code === -32602 && /query.*string/.test(err.message)
    );
    await assert.rejects(
      () => executeGetChunks(retrieval, { subject: "digital-engineering", query: null as never }),
      (err) => err instanceof McpError && err.code === -32602 && /query.*string/.test(err.message)
    );
  });
});
