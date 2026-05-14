// slice-3 MCP server — 보강: get_persona_prompt tool + env fail-closed + tool list 제한
// (slice-2 plan §3 AC5 + slice-3 spec §1~§3)
//
// Architecture:
//   stdin ──┬─> StdioServerTransport ──> Server (low-level) ──> tool handlers
//   stdout ─┘                                                    │
//                                                                ↓
//                                              NestApplicationContext (PersonaModule)
//                                              ├─> RetrievalService (corpus retrieval logic 재사용)
//                                              ├─> PersonaService (persona prompt)
//                                              └─> PrismaService (DB — via @Global PrismaModule)
//
// Stdio invariant: log/error 는 *stderr* 로만 (stdout 은 MCP wire 전용 — corruption 0).
// Tool surface: get_chunks + get_persona_prompt (2 개만 — F4 tool 표면 제한).

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { NestFactory } from "@nestjs/core";
import {
  PersonaModule,
  RetrievalService,
  PersonaService,
  type RetrievalService as RetrievalContract,
  type PersonaService as PersonaContract
} from "@study-note/persona-engine";
import { PrismaService } from "@study-note/corpus";
import {
  GET_CHUNKS_INPUT_SCHEMA,
  GET_CHUNKS_TOOL_NAME,
  makeGetChunksHandler
} from "./get-chunks.tool";
import {
  GET_PERSONA_PROMPT_INPUT_SCHEMA,
  GET_PERSONA_PROMPT_TOOL_NAME,
  makeGetPersonaPromptHandler
} from "./get-persona-prompt.tool";
import { resolveOwnerOrExit } from "./owner.env";
import type { GetChunksInput } from "./get-chunks.tool";
import type { GetPersonaPromptInput } from "./get-persona-prompt.tool";

export { GET_CHUNKS_TOOL_NAME } from "./get-chunks.tool";
export { GET_PERSONA_PROMPT_TOOL_NAME } from "./get-persona-prompt.tool";

export const MCP_SERVER_NAME = "study-note-mcp";
export const MCP_SERVER_VERSION = "0.2.0"; // slice-3: persona + fail-closed

export interface McpServerHarness {
  server: Server;
  shutdown: () => Promise<void>;
}

export interface BuildMcpServerOptions {
  retrieval: Pick<RetrievalContract, "retrieveTopK">;
  persona: Pick<PersonaContract, "archetypeFor" | "systemPromptFor">;
  ownerId: string;
}

/** Build MCP Server with retrieval + persona handlers injected. NestJS context optional (테스트 inject 가능).
 *  Tool surface limited to 2 tools: get_chunks + get_persona_prompt (F4 slice-3 spec §1.1). */
export function buildMcpServer(options: BuildMcpServerOptions): Server {
  const { retrieval, persona, ownerId } = options;

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
      },
      {
        name: GET_PERSONA_PROMPT_TOOL_NAME,
        description: "Get persona system prompt for a subject slug (e.g. digital-engineering).",
        inputSchema: GET_PERSONA_PROMPT_INPUT_SCHEMA
      }
    ]
  }));

  const chunksHandler = makeGetChunksHandler(retrieval, ownerId);
  const personaHandler = makeGetPersonaPromptHandler(persona, ownerId);

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case GET_CHUNKS_TOOL_NAME: {
        const args = (request.params.arguments ?? {}) as unknown as GetChunksInput;
        return chunksHandler(args);
      }
      case GET_PERSONA_PROMPT_TOOL_NAME: {
        const args = (request.params.arguments ?? {}) as unknown as GetPersonaPromptInput;
        return personaHandler(args);
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `unknown tool: ${request.params.name}`);
    }
  });

  return server;
}

/** Bootstrap NestJS context + connect stdio transport. Production entry. */
async function main(): Promise<void> {
  // stderr only (stdout = MCP wire)
  process.stderr.write(`[mcp-server] starting ${MCP_SERVER_NAME}@${MCP_SERVER_VERSION} (slice-3)\n`);

  const app = await NestFactory.createApplicationContext(PersonaModule, { logger: false });
  // PrismaService is exposed via @Global() PrismaModule inside PersonaModule context.
  const prisma = app.get(PrismaService);

  // Env fail-closed: validate owner env before connecting stdio transport (spec §2.2)
  const { ownerId } = await resolveOwnerOrExit(prisma);

  const retrieval = app.get(RetrievalService) as Pick<RetrievalContract, "retrieveTopK">;
  const personaSvc = app.get(PersonaService) as Pick<PersonaContract, "archetypeFor" | "systemPromptFor">;

  const server = buildMcpServer({ retrieval, persona: personaSvc, ownerId });
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
