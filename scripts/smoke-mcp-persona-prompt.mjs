/**
 * smoke-mcp-persona-prompt.mjs — get_persona_prompt tool end-to-end validation.
 *
 * Spawns MCP server with valid env and asserts:
 *   - get_persona_prompt({ subject: "digital-engineering" }) → 200
 *     - content[0].text is JSON with {subject, personaName, tonePolicy, systemPrompt}
 *     - subject === "digital-engineering"
 *     - personaName === "디공이"
 *     - systemPrompt starts with "당신은 digital-engineering 강의의"
 *   - get_persona_prompt({ subject: "nonexistent-subject" }) → MCP error UNSUPPORTED_SUBJECT
 *   - get_persona_prompt({ subject: "Bad Subject!" }) → MCP error INVALID_INPUT
 *
 * Exit 0 = pass. Exit 1 = fail.
 */
import { prepareSmokeDatabase } from "./smoke-db.mjs";
import { spawnMcpServer, waitForMcpReady, McpSmokeClient } from "./smoke-mcp-client.mjs";

const VALID_STUDENT_NUMBER = "20260001"; // user-dev-1 (devUserFlag=true)

let smokeDb;
let child;

try {
  smokeDb = await prepareSmokeDatabase("mcp-persona-prompt");

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

  // Case 1: happy path — digital-engineering
  {
    const resp = await client.callTool("get_persona_prompt", { subject: "digital-engineering" });

    if (resp.error) {
      throw new Error(`get_persona_prompt(digital-engineering): unexpected error: ${JSON.stringify(resp.error)}`);
    }

    const text = resp.result?.content?.[0]?.text;
    if (!text) {
      throw new Error(`get_persona_prompt: no content text in response: ${JSON.stringify(resp)}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`get_persona_prompt: content text is not valid JSON: ${text}`);
    }

    if (parsed.subject !== "digital-engineering") {
      throw new Error(`get_persona_prompt: expected subject='digital-engineering', got '${parsed.subject}'`);
    }
    if (parsed.personaName !== "디공이") {
      throw new Error(`get_persona_prompt: expected personaName='디공이', got '${parsed.personaName}'`);
    }
    if (!parsed.systemPrompt?.startsWith("당신은 digital-engineering 강의의")) {
      throw new Error(`get_persona_prompt: systemPrompt must start with '당신은 digital-engineering 강의의', got: ${parsed.systemPrompt?.slice(0, 60)}`);
    }
    if (!parsed.tonePolicy || parsed.tonePolicy.length === 0) {
      throw new Error(`get_persona_prompt: tonePolicy must be non-empty`);
    }
    console.log(`  [ok] digital-engineering → personaName='${parsed.personaName}', systemPrompt starts correctly`);
  }

  // Case 2: unsupported subject (valid format, not in SUPPORTED_PERSONAS)
  {
    const resp = await client.callTool("get_persona_prompt", { subject: "nonexistent-subject" });

    if (!resp.error) {
      throw new Error(`get_persona_prompt(nonexistent-subject): expected MCP error, got success: ${JSON.stringify(resp)}`);
    }
    const errData = resp.error?.data;
    if (errData?.errorCode !== "UNSUPPORTED_SUBJECT") {
      throw new Error(`get_persona_prompt(nonexistent-subject): expected UNSUPPORTED_SUBJECT, got errorCode='${errData?.errorCode}', error=${JSON.stringify(resp.error)}`);
    }
    console.log(`  [ok] nonexistent-subject → UNSUPPORTED_SUBJECT error (code=${resp.error.code})`);
  }

  // Case 3: invalid subject format ("Bad Subject!" has uppercase + space + special char)
  {
    const resp = await client.callTool("get_persona_prompt", { subject: "Bad Subject!" });

    if (!resp.error) {
      throw new Error(`get_persona_prompt('Bad Subject!'): expected MCP error, got success: ${JSON.stringify(resp)}`);
    }
    const errData = resp.error?.data;
    if (errData?.errorCode !== "INVALID_INPUT") {
      throw new Error(`get_persona_prompt('Bad Subject!'): expected INVALID_INPUT, got errorCode='${errData?.errorCode}', error=${JSON.stringify(resp.error)}`);
    }
    console.log(`  [ok] 'Bad Subject!' → INVALID_INPUT error (code=${resp.error.code})`);
  }

  console.log("smoke-mcp-persona-prompt: PASS");
} catch (err) {
  process.stderr.write(`smoke-mcp-persona-prompt: FAIL — ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(1);
} finally {
  child?.kill("SIGTERM");
  await smokeDb?.stop();
}
