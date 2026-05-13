/**
 * smoke-auth-pii-redaction.mjs — AC1-P: PII no-log / no-echo
 *
 * Asserts:
 *   1. Error responses (403/401) do not echo studentNumber, name, or cookie value.
 *   2. Server log output captured to stderr does NOT contain raw 8-digit student
 *      numbers or raw names in plain text (only masked forms ****NNNN / X**).
 *
 * Approach:
 *   - Spawn API server with stdout+stderr piped.
 *   - Collect all log output during the test.
 *   - After assertions, scan collected log for PII patterns.
 *
 * Prerequisites: same as smoke-auth-signin.mjs
 * Exit 0 = pass. Exit 1 = fail.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const SEED_USER_STUDENT_NUMBER =
  process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001";
const PLAIN_USER_STUDENT_NUMBER = "20269998";
const PLAIN_USER_NAME = "Plain User";

let server;
let smokeDb;
const logLines = [];

try {
  if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
    smokeDb = await prepareSmokeDatabase("auth-pii-redaction");
  }
  const db = smokeDb ?? {
    databaseUrl: process.env.DATABASE_URL,
    sessionTokenPepper: process.env.SESSION_TOKEN_PEPPER
  };
  if (!db.databaseUrl || !db.sessionTokenPepper) {
    process.stderr.write(
      "ERROR: DATABASE_URL and SESSION_TOKEN_PEPPER are required for this smoke test\n"
    );
    process.exit(1);
  }

  const port = 4000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}/api`;
  server = startBackend(port, db, logLines);
  await waitForHealthy(baseUrl);

  // Trigger a 403 for unknown user — response body must not echo studentNumber
  const unknownResp = await fetch(`${baseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Dev User", studentNumber: "20269999" })
  });
  if (unknownResp.status !== 403) {
    throw new Error(`nonexistent-user: expected 403, got ${unknownResp.status}`);
  }
  const unknownBody = await unknownResp.json();
  const unknownBodyStr = JSON.stringify(unknownBody);

  assertNoRawPii(unknownBodyStr, ["20269999"], "nonexistent-user 403 body");

  // Trigger a 403 for devUserFlag=false user
  const deniedResp = await fetch(`${baseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: PLAIN_USER_NAME, studentNumber: PLAIN_USER_STUDENT_NUMBER })
  });
  if (deniedResp.status !== 403) {
    throw new Error(`denied-user: expected 403, got ${deniedResp.status}`);
  }
  const deniedBody = await deniedResp.json();
  const deniedBodyStr = JSON.stringify(deniedBody);

  assertNoRawPii(deniedBodyStr, [PLAIN_USER_STUDENT_NUMBER, PLAIN_USER_NAME], "denied-user 403 body");

  // Trigger a successful sign-in and capture the cookie token
  const signinResp = await fetch(`${baseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Dev User", studentNumber: SEED_USER_STUDENT_NUMBER })
  });
  const setCookie = signinResp.headers.get("set-cookie") ?? "";
  const cookieToken = setCookie.split(";")[0].split("=").slice(1).join("=");
  const rawToken = cookieToken ? decodeURIComponent(cookieToken) : "";

  // Trigger a 401 on /me without cookie
  const meResp = await fetch(`${baseUrl}/v1/auth/me`);
  const meBody = await meResp.json();
  const meBodyStr = JSON.stringify(meBody);

  assertNoRawPii(meBodyStr, [rawToken].filter(Boolean), "401 /me body (no cookie token echo)");

  // Wait a moment for log lines to flush
  await new Promise((r) => setTimeout(r, 300));

  // Scan all captured log output for raw PII
  const allLog = logLines.join("\n");

  // Raw 8-digit student numbers must not appear in logs
  // Allow masked forms like ****0001 but not 20260001 plain
  const rawSnPatterns = [SEED_USER_STUDENT_NUMBER, PLAIN_USER_STUDENT_NUMBER, "20269999"];
  for (const sn of rawSnPatterns) {
    // Log lines should not contain the raw student number except masked (****NNNN)
    // We check: sn appears but NOT preceded by "****" (i.e., NOT in masked form)
    const unmaskedIndex = allLog.indexOf(sn);
    if (unmaskedIndex !== -1) {
      // Check if it's part of the masked form "****NNNN"
      const context = allLog.slice(Math.max(0, unmaskedIndex - 4), unmaskedIndex + sn.length);
      if (!context.startsWith("****")) {
        throw new Error(
          `FAIL: raw studentNumber ${sn} found in server logs (unmasked). Context: "${context}"`
        );
      }
    }
  }
  console.log(`  ✓ server logs: raw student numbers not in plain text`);

  // Raw session token must not appear in logs
  if (rawToken && rawToken.length > 8 && allLog.includes(rawToken)) {
    throw new Error("FAIL: raw session token found in server logs");
  }
  console.log(`  ✓ server logs: raw session cookie token not logged`);

  // Raw names must not appear in full — first char + ** mask is the only allowed form.
  // Check symmetrically for both names exercised in this test.
  const rawNames = ["Plain User", "Dev User"];
  for (const rawName of rawNames) {
    if (allLog.includes(rawName)) {
      throw new Error(`FAIL: raw name '${rawName}' found in server logs`);
    }
  }
  console.log(`  ✓ server logs: raw full names not logged`);

  console.log("smoke-auth-pii-redaction: PASS");
} catch (error) {
  process.stderr.write(`smoke-auth-pii-redaction: FAIL — ${error.message}\n`);
  process.exit(1);
} finally {
  server?.kill("SIGTERM");
  await smokeDb?.stop();
}

function assertNoRawPii(bodyStr, forbiddenValues, context) {
  for (const value of forbiddenValues) {
    if (value && bodyStr.includes(value)) {
      throw new Error(`${context}: raw PII value "${value}" found in response body`);
    }
  }
  console.log(`  ✓ ${context}: no raw PII in body`);
}

function startBackend(port, db, logCollector) {
  const child = spawn("node", ["apps/api/dist/main.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: db.databaseUrl,
      SESSION_TOKEN_PEPPER: db.sessionTokenPepper,
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "local"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  function collect(chunk) {
    const lines = chunk.toString().split("\n");
    logCollector.push(...lines);
  }

  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  return child;
}

async function waitForHealthy(base, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`API at ${base} did not become healthy within ${timeoutMs}ms`);
}
