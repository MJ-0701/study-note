/**
 * smoke-mcp-fail-closed.mjs — AC2-F: MCP server must exit(1) on bad owner env.
 *
 * 4 cases — all share the same seeded DB:
 *   1. STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER not set → exit 1, stderr "missing"
 *   2. Format invalid (abc1234) → exit 1, stderr "format invalid"
 *   3. Non-existent student number (20269999) → exit 1, stderr "not authorized"
 *   4. devUserFlag=false user (20269998 = user-dev-3) → exit 1, stderr "not authorized"
 *
 * Each case also asserts that the student number value itself is NOT echoed to stderr (PII guard).
 *
 * Exit 0 = pass. Exit 1 = fail.
 */
import { prepareSmokeDatabase } from "./smoke-db.mjs";
import { spawnMcpServer, waitForExit } from "./smoke-mcp-client.mjs";

let smokeDb;

try {
  smokeDb = await prepareSmokeDatabase("mcp-fail-closed");
  const baseEnv = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper,
    STUDY_NOTE_AUTH_DEV_ENABLED: "true"
  };

  // Case 1: STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER not set
  {
    const env = { ...baseEnv };
    delete env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER;

    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);

    if (exitCode !== 1) {
      throw new Error(`case1 (missing env): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER missing")) {
      throw new Error(`case1 (missing env): expected 'missing' in stderr, got: ${stderr}`);
    }
    console.log("  [ok] case 1: missing env → exit 1, stderr 'STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER missing'");
  }

  // Case 2: format invalid (abc1234 — not 8 digits)
  {
    const studentNumberValue = "abc1234";
    const env = { ...baseEnv, STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: studentNumberValue };

    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);

    if (exitCode !== 1) {
      throw new Error(`case2 (format invalid): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER format invalid")) {
      throw new Error(`case2 (format invalid): expected 'format invalid' in stderr, got: ${stderr}`);
    }
    // PII guard: raw value must NOT appear in stderr
    if (stderr.includes(studentNumberValue)) {
      throw new Error(`case2 (format invalid): PII LEAK — student number '${studentNumberValue}' found in stderr`);
    }
    console.log("  [ok] case 2: format invalid → exit 1, student number not echoed");
  }

  // Case 3: non-existent student number (20269999)
  {
    const studentNumberValue = "20269999";
    const env = { ...baseEnv, STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: studentNumberValue };

    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);

    if (exitCode !== 1) {
      throw new Error(`case3 (non-existent): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("owner student number not authorized")) {
      throw new Error(`case3 (non-existent): expected 'not authorized' in stderr, got: ${stderr}`);
    }
    // PII guard
    if (stderr.includes(studentNumberValue)) {
      throw new Error(`case3 (non-existent): PII LEAK — student number found in stderr`);
    }
    console.log("  [ok] case 3: non-existent student number → exit 1, 'not authorized', number not echoed");
  }

  // Case 4: devUserFlag=false user (20269998 = user-dev-3 seeded in slice-2 backport)
  {
    const studentNumberValue = "20269998";
    const env = { ...baseEnv, STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: studentNumberValue };

    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);

    if (exitCode !== 1) {
      throw new Error(`case4 (devUserFlag=false): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("owner student number not authorized")) {
      throw new Error(`case4 (devUserFlag=false): expected 'not authorized' in stderr, got: ${stderr}`);
    }
    // PII guard: same message as case3 — no info leak between not-found and flag-false
    if (stderr.includes(studentNumberValue)) {
      throw new Error(`case4 (devUserFlag=false): PII LEAK — student number found in stderr`);
    }
    console.log("  [ok] case 4: devUserFlag=false → exit 1, same 'not authorized' message (no info leak)");
  }

  console.log("smoke-mcp-fail-closed: PASS");
} catch (err) {
  process.stderr.write(`smoke-mcp-fail-closed: FAIL — ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(1);
} finally {
  await smokeDb?.stop();
}
