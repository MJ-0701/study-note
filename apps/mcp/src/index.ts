// sprint-2 plan §3 AC5 — MCP server entry (stdio transport).
//
// Architecture:
//   stdin ──┬─> StdioServerTransport ──> Server (low-level) ──> tool handlers
//   stdout ─┘                                                    │
//                                                                ↓
//                                              NestApplicationContext (CorpusModule)
//                                              ├─> RetrievalService (corpus retrieval logic 재사용)
//                                              └─> PrismaService (DB)
//
// Stdio invariant: log/error 는 *stderr* 로만 (stdout 은 MCP wire 전용 — corruption 0).

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { NestFactory } from "@nestjs/core";
import {
  PersonaModule,
  RetrievalService,
  type RetrievalService as RetrievalContract
} from "@study-note/persona-engine";
import {
  GET_CHUNKS_INPUT_SCHEMA,
  GET_CHUNKS_TOOL_NAME,
  makeGetChunksHandler
} from "./get-chunks.tool";

export { GET_CHUNKS_TOOL_NAME } from "./get-chunks.tool";

export const MCP_SERVER_NAME = "study-note-mcp";
export const MCP_SERVER_VERSION = "0.1.0"; // sprint-2 first slice

export interface McpServerHarness {
  server: Server;
  shutdown: () => Promise<void>;
}

/** Build MCP Server with retrieval handler injected. NestJS context optional (테스트 inject 가능). */
export function buildMcpServer(retrieval: Pick<RetrievalContract, "retrieveTopK">): Server {
  const server = new Server(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: GET_CHUNKS_TOOL_NAME,
        description: "Top-K chunk retrieval for a subject + free-text query (sprint-2 first slice).",
        inputSchema: GET_CHUNKS_INPUT_SCHEMA
      }
    ]
  }));

  const handler = makeGetChunksHandler(retrieval);
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== GET_CHUNKS_TOOL_NAME) {
      throw new McpError(ErrorCode.MethodNotFound, `unknown tool: ${request.params.name}`);
    }
    const args = (request.params.arguments ?? {}) as unknown as Parameters<typeof handler>[0];
    return handler(args);
  });

  return server;
}

/** Bootstrap NestJS context + connect stdio transport. Production entry. */
async function main(): Promise<void> {
  // stderr only (stdout = MCP wire)
  process.stderr.write(`[mcp-server] starting ${MCP_SERVER_NAME}@${MCP_SERVER_VERSION} (sprint-2)\n`);
  const app = await NestFactory.createApplicationContext(PersonaModule, { logger: false });
  const retrieval = app.get(RetrievalService) as Pick<RetrievalContract, "retrieveTopK">;

  const server = buildMcpServer(retrieval);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[mcp-server] stdio transport connected. tools/list + tools/call ready.\n");

  const shutdown = async () => {
    process.stderr.write("[mcp-server] shutting down\n");
    await server.close().catch(() => undefined);
    await app.close().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// CLI entry (직접 실행 시만 main 호출 — test import 는 export 만 사용)
if (require.main === module) {
  void main().catch((err) => {
    process.stderr.write(`[mcp-server] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
}
