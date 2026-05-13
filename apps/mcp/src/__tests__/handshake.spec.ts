import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { RetrievalService, PersonaService } from "@study-note/persona-engine";
import { buildMcpServer, GET_CHUNKS_TOOL_NAME, GET_PERSONA_PROMPT_TOOL_NAME } from "../index";

// slice-3 plan §3 AC5 — MCP server handshake (in-memory transport pair).
//   4 단계 검증: (a) initialize handshake (b) tools/list 응답에 get_chunks + get_persona_prompt (c) tools/call 으로 dummy input (d) unknown tool → error.

function makeRetrievalStub(): Pick<RetrievalService, "retrieveTopK"> {
  return {
    async retrieveTopK() {
      return [
        { ord: 0, corpusId: "cmovexample0001", sourcePdfPath: "stub.pdf", text: "stub chunk", score: 0.5 }
      ];
    }
  };
}

function makePersonaStub(): Pick<PersonaService, "archetypeFor" | "systemPromptFor"> {
  return {
    archetypeFor(subject: string) {
      if (subject === "digital-engineering") {
        return { subject: "digital-engineering", name: "디공이", tonePolicy: "친근한 멘토" };
      }
      return null;
    },
    systemPromptFor(archetype) {
      return `당신은 ${archetype.subject} 강의의 전용 AI 튜터 페르소나 "${archetype.name}" 입니다.`;
    }
  };
}

const STUB_OWNER_ID = "ctest000000000000000000000";

describe("MCP server stdio-equivalent handshake (AC5 in-memory transport)", () => {
  it("(a) initialize handshake + (b) tools/list contains 2 tools + (c) tools/call returns CallToolResult + (d) unknown tool → error", async () => {
    const server = buildMcpServer({
      retrieval: makeRetrievalStub(),
      persona: makePersonaStub(),
      ownerId: STUB_OWNER_ID
    });
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client(
      { name: "study-note-test-client", version: "0.1.0" },
      { capabilities: {} }
    );

    // (a) handshake — server.connect + client.connect 가 initialize 핸드셰이크
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // (b) tools/list — exactly 2 entries: get_chunks + get_persona_prompt
    const toolsResult = await client.listTools();
    const names = toolsResult.tools.map((t) => t.name);
    assert.equal(names.length, 2, `tools/list must have exactly 2 entries, got: ${names.join(",")}`);
    assert.ok(names.includes(GET_CHUNKS_TOOL_NAME), `tools/list must include get_chunks, got: ${names.join(",")}`);
    assert.ok(names.includes(GET_PERSONA_PROMPT_TOOL_NAME), `tools/list must include get_persona_prompt, got: ${names.join(",")}`);

    // (c) tools/call get_chunks
    const callResult = await client.callTool({
      name: GET_CHUNKS_TOOL_NAME,
      arguments: { subject: "digital-engineering", query: "반가산기", k: 1 }
    });
    const content = (callResult as { content?: Array<{ type?: string; text?: string }> }).content;
    assert.ok(Array.isArray(content) && content.length > 0, "callTool returned no content");
    const text = content[0]?.text ?? "";
    assert.match(text, /"chunks":/);
    assert.match(text, /"retrievedCount":1/);

    // (d) unknown tool → MethodNotFound error
    await assert.rejects(
      () => client.callTool({ name: "list_conversations", arguments: {} }),
      (err) => {
        const e = err as { code?: number };
        return typeof e.code === "number";
      }
    );

    await client.close();
    await server.close();
  });
});
