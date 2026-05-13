/**
 * smoke-mcp-tool-list.mjs — AC2-N: tools/list response must have exactly 2 entries.
 *
 * Spawns MCP server with valid env, performs JSON-RPC handshake via stdio,
 * and asserts:
 *   - tools array length === 2
 *   - names set === { "get_chunks", "get_persona_prompt" }
 *   - calling unknown tool 'list_conversations' → MCP error
 *
 * Exit 0 = pass. Exit 1 = fail.
 */
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { prepareSmokeDatabase } from "./smoke-db.mjs";
import { spawnMcpServer, waitForMcpReady, McpSmokeClient } from "./smoke-mcp-client.mjs";

const VALID_STUDENT_NUMBER = "20260001"; // user-dev-1 (devUserFlag=true)

let smokeDb;
let child;

try {
  smokeDb = await prepareSmokeDatabase("mcp-tool-list");

  const env = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper,
    STUDY_NOTE_AUTH_DEV_ENABLED: "true",
    STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: VALID_STUDENT_NUMBER
  };

  child = spawnMcpServer(env);
  await waitForMcpReady(child);
  console.log("[smoke] MCP server ready");

  const client = new McpSmokeClient(child);
  await client.initialize();

  // Assert tools/list has exactly 2 tools
  const toolsResult = await client.listTools();
  const names = (toolsResult.tools ?? []).map(t => t.name);

  if (names.length !== 2) {
    throw new Error(`tools/list: expected 2 tools, got ${names.length}: ${names.join(", ")}`);
  }
  const nameSet = new Set(names);
  if (!nameSet.has("get_chunks")) {
    throw new Error(`tools/list: missing get_chunks, got: ${names.join(", ")}`);
  }
  if (!nameSet.has("get_persona_prompt")) {
    throw new Error(`tools/list: missing get_persona_prompt, got: ${names.join(", ")}`);
  }
  console.log(`  [ok] tools/list has exactly 2 tools: ${names.join(", ")}`);

  // Call unknown tool → expect MethodNotFound (-32601) per spec §1.1
  const unknownResp = await client.callTool("list_conversations", {});
  if (!unknownResp.error) {
    throw new Error(`unknown tool 'list_conversations': expected MCP error, got: ${JSON.stringify(unknownResp)}`);
  }
  if (unknownResp.error.code !== ErrorCode.MethodNotFound) {
    throw new Error(`unknown tool 'list_conversations': expected MethodNotFound (${ErrorCode.MethodNotFound}), got code=${unknownResp.error.code} msg=${unknownResp.error.message}`);
  }
  console.log(`  [ok] unknown tool 'list_conversations' → MethodNotFound (code=${unknownResp.error.code})`);

  console.log("smoke-mcp-tool-list: PASS");
} catch (err) {
  process.stderr.write(`smoke-mcp-tool-list: FAIL — ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(1);
} finally {
  child?.kill("SIGTERM");
  await smokeDb?.stop();
}
