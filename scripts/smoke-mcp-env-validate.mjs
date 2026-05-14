/**
 * smoke-mcp-env-validate.mjs — AC2-O narrow: valid env → server starts, resolvedOwnerId injected.
 *
 * Spawns MCP server with valid env (user-dev-1, devUserFlag=true) and asserts:
 *   - stderr contains "owner resolved (userId=...)"
 *   - tools/list responds correctly
 *   - get_chunks tool call succeeds (empty chunks or non-error) with resolvedOwnerId injected
 *   - server child process is alive throughout
 *
 * Exit 0 = pass. Exit 1 = fail.
 */
import { prepareSmokeDatabase } from "./smoke-db.mjs";
import { spawnMcpServer, waitForMcpReady, McpSmokeClient } from "./smoke-mcp-client.mjs";

const VALID_STUDENT_NUMBER = "20260001"; // user-dev-1 (devUserFlag=true)

let smokeDb;
let child;

try {
  smokeDb = await prepareSmokeDatabase("mcp-env-validate");

  const env = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper,
    STUDY_NOTE_AUTH_DEV_ENABLED: "true",
    STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: VALID_STUDENT_NUMBER
  };

  let stderrCapture = "";
  child = spawnMcpServer(env);
  child.stderr.on("data", (chunk) => { stderrCapture += String(chunk); });

  await waitForMcpReady(child);
  console.log("[smoke] MCP server ready");

  // Assert "owner resolved" in stderr
  if (!stderrCapture.includes("owner resolved (userId=")) {
    throw new Error(`Expected 'owner resolved (userId=...)' in stderr, got: ${stderrCapture}`);
  }
  // PII guard: student number must not appear in stderr
  if (stderrCapture.includes(VALID_STUDENT_NUMBER)) {
    throw new Error(`PII LEAK: student number '${VALID_STUDENT_NUMBER}' found in stderr`);
  }
  console.log("  [ok] stderr contains 'owner resolved (userId=...)' — student number not echoed");

  // Assert server is still alive
  if (child.exitCode !== null) {
    throw new Error(`Server exited unexpectedly with code ${child.exitCode}`);
  }
  console.log("  [ok] server child process is alive");

  const client = new McpSmokeClient(child);
  await client.initialize();

  // tools/list works
  const toolsResult = await client.listTools();
  const names = (toolsResult.tools ?? []).map(t => t.name);
  if (names.length !== 2) {
    throw new Error(`tools/list: expected 2 tools, got ${names.length}: ${names.join(", ")}`);
  }
  console.log(`  [ok] tools/list works: ${names.join(", ")}`);

  // get_chunks call succeeds (may return empty chunks — corpus may not be seeded for this subject)
  const chunksResp = await client.callTool("get_chunks", {
    subject: "digital-engineering",
    query: "test query"
  });

  if (chunksResp.error) {
    // Only OWNER_UNRESOLVED would indicate a fail-closed failure — other errors are acceptable
    const errData = chunksResp.error?.data;
    if (errData?.errorCode === "OWNER_UNRESOLVED") {
      throw new Error(`get_chunks returned OWNER_UNRESOLVED — resolvedOwnerId not injected correctly`);
    }
    // Other MCP errors (e.g. RETRIEVAL_FAILED on empty DB) are acceptable
    console.log(`  [ok] get_chunks: MCP error acceptable (not OWNER_UNRESOLVED): ${JSON.stringify(chunksResp.error)}`);
  } else {
    const text = chunksResp.result?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.chunks)) {
      throw new Error(`get_chunks: expected chunks array, got: ${text}`);
    }
    console.log(`  [ok] get_chunks: success, chunks=${parsed.retrievedCount}`);
  }

  console.log("smoke-mcp-env-validate: PASS");
} catch (err) {
  process.stderr.write(`smoke-mcp-env-validate: FAIL — ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(1);
} finally {
  child?.kill("SIGTERM");
  await smokeDb?.stop();
}
