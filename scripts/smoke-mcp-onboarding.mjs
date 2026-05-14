/**
 * smoke-mcp-onboarding.mjs — AC3: end-to-end MCP onboarding handshake + fail-closed smoke.
 *
 * 7 sequential cases, single seeded DB:
 *   a0  DB-readiness + seeded master row (학번 20260001, devUserFlag=true) SELECT 확인
 *   a   happy path — MCP spawn + stdio JSON-RPC handshake (initialize)
 *   b   tools/list 응답이 [get_persona_prompt, get_chunks] 와 동일
 *   c   STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER 미설정 → exit 1, stderr 'missing'
 *   d   format invalid ('abc12345') → exit 1, stderr 'format invalid' + raw 미echo
 *   e   DB 미존재 학번 ('99999999') → exit 1, generic 'not authorized' + raw 미echo
 *   f   STUDY_NOTE_AUTH_DEV_ENABLED=false → exit 1, stderr 'AUTH_DEV_DISABLED'
 *
 * security: 모든 negative case 의 stderr 가 raw 학번 string 을 echo 하지 않음을 검증.
 *
 * Exit 0 + last line "MCP onboarding smoke passed" = pass.
 * Exit 1 = fail.
 */
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";
import {
  spawnMcpServer,
  waitForMcpReady,
  waitForExit,
  McpSmokeClient
} from "./smoke-mcp-client.mjs";

const SEEDED_MASTER_STUDENT_NUMBER = "20260001";
const NON_EXISTENT_STUDENT_NUMBER = "99999999";
const FORMAT_INVALID_VALUE = "abc12345";

function assertNoRawLeak(stderr, raw, caseLabel) {
  if (stderr.includes(raw)) {
    throw new Error(`${caseLabel}: PII LEAK — raw value '${raw}' echoed in stderr: ${stderr}`);
  }
}

let smokeDb;
let prisma;
let happyChild;

try {
  // ─── a0: DB-readiness + seeded master verification ───────────────
  smokeDb = await prepareSmokeDatabase("mcp-onboarding");

  prisma = new PrismaClient({ datasourceUrl: smokeDb.databaseUrl });
  const master = await prisma.user.findFirst({
    where: { studentNumber: SEEDED_MASTER_STUDENT_NUMBER }
  });
  if (!master) {
    throw new Error(
      `a0: seeded master row (학번 ${SEEDED_MASTER_STUDENT_NUMBER}) not found after prepareSmokeDatabase`
    );
  }
  if (master.devUserFlag !== true) {
    throw new Error(
      `a0: seeded master devUserFlag must be true, got ${master.devUserFlag}`
    );
  }
  console.log(`  [ok] a0: DB up, master row seeded (userId=${master.id}, devUserFlag=true)`);

  const baseEnv = {
    ...process.env,
    DATABASE_URL: smokeDb.databaseUrl,
    SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper,
    STUDY_NOTE_AUTH_DEV_ENABLED: "true"
  };

  // ─── a + b: happy path handshake + tools/list ────────────────────
  {
    const env = {
      ...baseEnv,
      STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: SEEDED_MASTER_STUDENT_NUMBER
    };
    happyChild = spawnMcpServer(env);
    await waitForMcpReady(happyChild);

    const client = new McpSmokeClient(happyChild);
    await client.initialize();
    console.log("  [ok] a: MCP server spawn + stdio JSON-RPC handshake");

    const toolsResult = await client.listTools();
    const names = (toolsResult.tools ?? []).map((t) => t.name);
    const nameSet = new Set(names);
    if (names.length !== 2 || !nameSet.has("get_chunks") || !nameSet.has("get_persona_prompt")) {
      throw new Error(
        `b: tools/list expected exactly [get_chunks, get_persona_prompt], got [${names.join(", ")}]`
      );
    }
    console.log(`  [ok] b: tools/list = [${names.join(", ")}]`);

    happyChild.kill("SIGTERM");
    happyChild = null;
  }

  // ─── c: STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER missing ──────────────
  {
    const env = { ...baseEnv };
    delete env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER;
    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);
    if (exitCode !== 1) {
      throw new Error(`c (missing env): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER missing")) {
      throw new Error(`c (missing env): expected 'missing' in stderr, got: ${stderr}`);
    }
    console.log("  [ok] c: missing env → exit 1, stderr 'missing'");
  }

  // ─── d: format invalid + PII guard ───────────────────────────────
  {
    const env = { ...baseEnv, STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: FORMAT_INVALID_VALUE };
    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);
    if (exitCode !== 1) {
      throw new Error(`d (format invalid): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER format invalid")) {
      throw new Error(`d (format invalid): expected 'format invalid' in stderr, got: ${stderr}`);
    }
    assertNoRawLeak(stderr, FORMAT_INVALID_VALUE, "d (format invalid)");
    console.log("  [ok] d: format invalid → exit 1, raw value not echoed");
  }

  // ─── e: DB 미존재 학번 + PII guard (generic 'not authorized') ─────
  {
    const env = { ...baseEnv, STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: NON_EXISTENT_STUDENT_NUMBER };
    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);
    if (exitCode !== 1) {
      throw new Error(`e (non-existent): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("owner student number not authorized")) {
      throw new Error(`e (non-existent): expected 'not authorized' in stderr, got: ${stderr}`);
    }
    assertNoRawLeak(stderr, NON_EXISTENT_STUDENT_NUMBER, "e (non-existent)");
    console.log("  [ok] e: non-existent 학번 → exit 1, generic 'not authorized', raw not echoed");
  }

  // ─── f: AUTH_DEV_DISABLED ────────────────────────────────────────
  {
    const env = {
      ...baseEnv,
      STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER: SEEDED_MASTER_STUDENT_NUMBER,
      STUDY_NOTE_AUTH_DEV_ENABLED: "false"
    };
    const child = spawnMcpServer(env);
    const { exitCode, stderr } = await waitForExit(child);
    if (exitCode !== 1) {
      throw new Error(`f (AUTH_DEV_DISABLED): expected exit 1, got ${exitCode}. stderr: ${stderr}`);
    }
    if (!stderr.includes("AUTH_DEV_DISABLED")) {
      throw new Error(`f (AUTH_DEV_DISABLED): expected 'AUTH_DEV_DISABLED' in stderr, got: ${stderr}`);
    }
    console.log("  [ok] f: AUTH_DEV_DISABLED → exit 1, stderr 'AUTH_DEV_DISABLED'");
  }

  console.log("MCP onboarding smoke passed");
} catch (err) {
  process.stderr.write(`MCP onboarding smoke FAIL — ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(1);
} finally {
  happyChild?.kill("SIGTERM");
  await prisma?.$disconnect();
  await smokeDb?.stop();
}
