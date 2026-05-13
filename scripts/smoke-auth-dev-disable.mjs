/**
 * smoke-auth-dev-disable.mjs — AC1-D: STUDY_NOTE_AUTH_DEV_ENABLED=false → 503
 *
 * Spawns the API server with STUDY_NOTE_AUTH_DEV_ENABLED=false and asserts that:
 *   - POST /v1/auth/sign-in → 503
 *   - POST /v1/auth/sign-out → 503
 *   - GET /v1/auth/me → 503
 *   - None of the 503 responses set a Set-Cookie header
 *
 * NOTE: STUDY_NOTE_API_BASE env is intentionally NOT respected here — this test
 * MUST spawn its own server with the disabled env. Targeting a running server
 * that was started without the flag would give false results.
 *
 * Prerequisites:
 *   DATABASE_URL and SESSION_TOKEN_PEPPER must be set, or the script spawns a
 *   temporary MySQL via prepareSmokeDatabase.
 *
 * Exit 0 = pass. Exit 1 = fail.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

let server;
let smokeDb;

try {
  if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
    smokeDb = await prepareSmokeDatabase("auth-dev-disable");
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

  const port = 3900 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}/api`;

  // Spawn API with auth explicitly disabled
  server = startBackend(port, db, { STUDY_NOTE_AUTH_DEV_ENABLED: "false" });
  await waitForHealthy(baseUrl);

  // POST /v1/auth/sign-in → 503, no cookie
  await assertDisabled(baseUrl, "/v1/auth/sign-in", "POST", "sign-in");

  // POST /v1/auth/sign-out → 503, no cookie
  await assertDisabled(baseUrl, "/v1/auth/sign-out", "POST", "sign-out");

  // GET /v1/auth/me → 503, no cookie
  await assertDisabled(baseUrl, "/v1/auth/me", "GET", "me");

  console.log("smoke-auth-dev-disable: PASS");
} catch (error) {
  process.stderr.write(`smoke-auth-dev-disable: FAIL — ${error.message}\n`);
  process.exit(1);
} finally {
  server?.kill("SIGTERM");
  await smokeDb?.stop();
}

async function assertDisabled(baseUrl, path, method, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify({ name: "Dev User", studentNumber: "20260001" }) : undefined
  });

  if (response.status !== 503) {
    throw new Error(`${label}: expected 503, got ${response.status}`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (setCookie && setCookie.includes("study_note_session=") &&
      !setCookie.includes("Max-Age=0")) {
    throw new Error(`${label}: Set-Cookie was issued despite auth being disabled`);
  }

  const body = await response.json().catch(() => null);
  if (body?.errorCode !== "AUTH_DEV_DISABLED") {
    throw new Error(`${label}: expected errorCode AUTH_DEV_DISABLED, got ${JSON.stringify(body)}`);
  }

  console.log(`  ✓ ${label} → 503 AUTH_DEV_DISABLED, no session cookie`);
}

function startBackend(port, db, extraEnv = {}) {
  const child = spawn("node", ["apps/api/dist/main.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: db.databaseUrl,
      SESSION_TOKEN_PEPPER: db.sessionTokenPepper,
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "local",
      ...extraEnv
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
