import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { RetrievalService } from "@study-note/persona-engine";
import { buildMcpServer, GET_CHUNKS_TOOL_NAME } from "../index";

// sprint-2 plan §3 AC5 — MCP server handshake (in-memory transport pair).
//   3 단계 검증: (a) initialize handshake (b) tools/list 응답에 get_chunks (c) tools/call 으로 dummy input.

function makeRetrievalStub(): Pick<RetrievalService, "retrieveTopK"> {
  return {
    async retrieveTopK() {
      return [
        { ord: 0, corpusId: "cmovexample0001", sourcePdfPath: "stub.pdf", text: "stub chunk", score: 0.5 }
      ];
    }
  };
}

describe("MCP server stdio-equivalent handshake (AC5 in-memory transport)", () => {
  it("(a) initialize handshake + (b) tools/list contains get_chunks + (c) tools/call returns CallToolResult", async () => {
    const server = buildMcpServer(makeRetrievalStub());
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client(
      { name: "study-note-test-client", version: "0.1.0" },
      { capabilities: {} }
    );

    // (a) handshake — server.connect + client.connect 가 initialize 핸드셰이크
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // (b) tools/list
    const toolsResult = await client.listTools();
    const names = toolsResult.tools.map((t) => t.name);
    assert.ok(names.includes(GET_CHUNKS_TOOL_NAME), `tools/list must include get_chunks, got: ${names.join(",")}`);

    // (c) tools/call
    const callResult = await client.callTool({
      name: GET_CHUNKS_TOOL_NAME,
      arguments: { subject: "digital-engineering", query: "반가산기", k: 1 }
    });
    const content = (callResult as { content?: Array<{ type?: string; text?: string }> }).content;
    assert.ok(Array.isArray(content) && content.length > 0, "callTool returned no content");
    const text = content[0]?.text ?? "";
    assert.match(text, /"chunks":/);
    assert.match(text, /"retrievedCount":1/);

    await client.close();
    await server.close();
  });
});
