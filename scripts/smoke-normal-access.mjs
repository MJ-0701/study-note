/**
 * smoke-normal-access.mjs — AC6: NORMAL role full protected-route access
 *
 * Cases:
 *   AC6-me       normal cookie → GET /v1/auth/me → 200 + own user info
 *   AC6-conv     normal cookie → POST /v1/conversations {subject:"digital-engineering"} → 200/201 + id
 *   AC6-admin    normal cookie → GET /v1/admin/users → 403 FORBIDDEN_ROLE (role gate correct)
 *
 * The fresh normal user is created via sign-up (user-dev-3 has devUserFlag=false,
 * blocking sign-in). This matches the pattern in smoke-admin-users-list.mjs.
 *
 * Prerequisites:
 *   DATABASE_URL             — MySQL connection string
 *   SESSION_TOKEN_PEPPER     — HMAC pepper for session tokens
 *   STORAGE_PROVIDER         — "local" (default)
 *   STUDY_NOTE_API_BASE      — optional, defaults to spawning the API server
 *
 * Exit 0 = all assertions pass. Exit 1 = any assertion fails.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const NORMAL_NAME = "테스트노멀";
const NORMAL_STUDENT_NUMBER = "20269050";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("normal-access");
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

    const port = 3700 + Math.floor(Math.random() * 1000);
    baseUrl = `http://127.0.0.1:${port}/api`;
    server = startBackend(port, db);
    await waitForHealthy(baseUrl);
  }

  // ── Create a fresh NORMAL user via sign-up ────────────────────────────────
  const signUpResp = await fetch(`${baseUrl}/v1/auth/sign-up`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: NORMAL_NAME, studentNumber: NORMAL_STUDENT_NUMBER })
  });

  if (signUpResp.status !== 200) {
    const body = await signUpResp.json().catch(() => ({}));
    throw new Error(`sign-up failed: HTTP ${signUpResp.status} ${JSON.stringify(body)}`);
  }

  const signUpCookieHeader = signUpResp.headers.get("set-cookie");
  if (!signUpCookieHeader) throw new Error("No Set-Cookie after sign-up");
  const normalCookie = signUpCookieHeader.split(";")[0].trim();

  const signUpBody = await signUpResp.json().catch(() => ({}));
  const normalUserId = signUpBody.userId;

  console.log(`[smoke] normal user created userId=${normalUserId}`);

  // ── AC6-me: GET /v1/auth/me → 200 + own user info ────────────────────────
  const meResp = await fetch(`${baseUrl}/v1/auth/me`, {
    headers: { cookie: normalCookie }
  });

  assert(meResp.status === 200, "AC6-me: GET /v1/auth/me returns 200");
  const meBody = await meResp.json();
  assert(meBody.userId === normalUserId, "AC6-me: /me userId matches sign-up userId");
  assert(meBody.studentNumber === NORMAL_STUDENT_NUMBER, "AC6-me: /me studentNumber matches");
  assert(meBody.name === NORMAL_NAME, "AC6-me: /me name matches");
  assert(meBody.role === "normal", "AC6-me: /me role is 'normal'");

  console.log("smoke-normal-access AC6-me: PASS");

  // ── AC6-conv: POST /v1/conversations → 200/201 + conversation id ──────────
  const convResp = await fetch(`${baseUrl}/v1/conversations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: normalCookie
    },
    body: JSON.stringify({ subject: "digital-engineering" })
  });

  assert(
    convResp.status === 200 || convResp.status === 201,
    `AC6-conv: POST /v1/conversations returns 200 or 201 (got ${convResp.status})`
  );
  const convBody = await convResp.json();
  assert(typeof convBody.id === "string" && convBody.id.length > 0, "AC6-conv: response has conversation id string");
  assert(convBody.subject === "digital-engineering", "AC6-conv: response subject matches");

  console.log(`smoke-normal-access AC6-conv: PASS (conversationId=${convBody.id})`);

  // ── AC6-admin: GET /v1/admin/users → 403 FORBIDDEN_ROLE ──────────────────
  const adminResp = await fetch(`${baseUrl}/v1/admin/users`, {
    headers: { cookie: normalCookie }
  });

  assert(adminResp.status === 403, "AC6-admin: GET /v1/admin/users returns 403 for normal");
  const adminBody = await adminResp.json();
  assert(adminBody.errorCode === "FORBIDDEN_ROLE", "AC6-admin: errorCode is FORBIDDEN_ROLE");

  console.log("smoke-normal-access AC6-admin: PASS");

  console.log("\nsmoke-normal-access: ALL PASS");
} catch (error) {
  process.stderr.write(`smoke-normal-access: FAIL — ${error.message}\n`);
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
