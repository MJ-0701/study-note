/**
 * smoke-auth-signin.mjs — AC1: sign-in 200 response contract
 *
 * Prerequisites:
 *   DATABASE_URL             — MySQL connection string
 *   SESSION_TOKEN_PEPPER     — HMAC pepper for session tokens
 *   STORAGE_PROVIDER         — "local" (default)
 *   STUDY_NOTE_API_BASE      — optional, defaults to http://127.0.0.1:3000
 *                              If not set, this script spawns the API server.
 *
 * Exit 0 = all assertions pass. Exit 1 = any assertion fails.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const SEED_USER_NAME =
  process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User";
const SEED_USER_STUDENT_NUMBER =
  process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    // Check required env when we need to spawn
    if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("auth-signin");
    }
    const db = smokeDb ?? {
      databaseUrl: process.env.DATABASE_URL,
      sessionTokenPepper: process.env.SESSION_TOKEN_PEPPER
    };
    if (!db.databaseUrl || !db.sessionTokenPepper) {
      process.stderr.write(
        "ERROR: DATABASE_URL and SESSION_TOKEN_PEPPER are required (or set STUDY_NOTE_API_BASE to target a running server)\n"
      );
      process.exit(1);
    }

    const port = 3600 + Math.floor(Math.random() * 1000);
    baseUrl = `http://127.0.0.1:${port}/api`;
    server = startBackend(port, db);
    await waitForHealthy(baseUrl);
  }

  // AC1: successful sign-in returns 200 with correct shape, no sessionToken
  const response = await fetch(`${baseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: SEED_USER_NAME, studentNumber: SEED_USER_STUDENT_NUMBER })
  });

  if (response.status !== 200) {
    throw new Error(`sign-in: expected 200, got ${response.status}`);
  }

  const body = await response.json();

  assert(typeof body.userId === "string", "body.userId is a string");
  assert(typeof body.studentNumber === "string", "body.studentNumber is a string");
  assert(typeof body.name === "string", "body.name is a string");
  assert(typeof body.role === "string", "body.role is a string");
  assert(!("sessionToken" in body), "body does not contain sessionToken");
  assert(!("token" in body), "body does not contain token");
  assert(!("expiresAt" in body), "body does not contain expiresAt");
  assert(body.studentNumber === SEED_USER_STUDENT_NUMBER, "studentNumber matches seed");
  assert(body.name === SEED_USER_NAME, "name matches seed");

  console.log("smoke-auth-signin: PASS");
  console.log(`  userId=${body.userId} sn=${body.studentNumber} role=${body.role}`);
} catch (error) {
  process.stderr.write(`smoke-auth-signin: FAIL — ${error.message}\n`);
  process.exit(1);
} finally {
  server?.kill("SIGTERM");
  await smokeDb?.stop();
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Assertion failed: ${label}`);
  }
  console.log(`  ✓ ${label}`);
}

function startBackend(port, db) {
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
  child.stdout.on("data", (c) => process.stderr.write(`[api] ${c}`));
  child.stderr.on("data", (c) => process.stderr.write(`[api] ${c}`));
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
