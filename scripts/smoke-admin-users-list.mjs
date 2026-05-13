/**
 * smoke-admin-users-list.mjs — AC2: admin list endpoint RBAC
 *
 * Cases:
 *   master  GET /v1/admin/users → 200, array (seeded rows present)
 *   admin   GET /v1/admin/users → 200, array (same seed count)
 *   normal  GET /v1/admin/users → 403 FORBIDDEN_ROLE
 *   no-cookie GET /v1/admin/users → 401 AUTH_REQUIRED
 *
 * Seed: user-dev-1 (master/"Dev User"/20260001),
 *       user-dev-2 (admin/"Reviewer"/20260002),
 *       user-dev-3 (normal/"Plain User"/20269998)
 *
 * Note: user-dev-3 has devUserFlag=false so cannot sign-in. A fresh NORMAL
 * user is created via sign-up to obtain a normal-role session cookie.
 * Master/admin count assertions run before the sign-up to reflect the 3 seeded users.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    if (!process.env.DATABASE_URL && !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("admin-users-list");
    }
    const db = smokeDb ?? {
      databaseUrl: process.env.DATABASE_URL,
      sessionTokenPepper: process.env.SESSION_TOKEN_PEPPER
    };
    if (!db.databaseUrl || !db.sessionTokenPepper) {
      process.stderr.write(
        "ERROR: DATABASE_URL and SESSION_TOKEN_PEPPER are required\n"
      );
      process.exit(1);
    }

    const port = 3700 + Math.floor(Math.random() * 1000);
    baseUrl = `http://127.0.0.1:${port}/api`;
    server = startBackend(port, db);
    await waitForHealthy(baseUrl);
  }

  const masterCookie = await signIn(baseUrl, "Dev User", "20260001");
  const adminCookie = await signIn(baseUrl, "Reviewer", "20260002");

  // ── master GET /v1/admin/users → 200, array with seeded users ─────────────
  const masterResp = await fetch(`${baseUrl}/v1/admin/users`, {
    headers: { cookie: masterCookie }
  });
  assert(masterResp.status === 200, "AC2-master: GET /v1/admin/users returns 200");
  const masterBody = await masterResp.json();
  assert(Array.isArray(masterBody), "AC2-master: response is an array");
  assert(masterBody.length >= 3, `AC2-master: array has at least 3 seeded users (got ${masterBody.length})`);
  // Verify response shape on first element
  const firstUser = masterBody[0];
  assert(typeof firstUser.id === "string", "AC2-master: element has id string");
  assert(typeof firstUser.studentNumber === "string", "AC2-master: element has studentNumber string");
  assert(typeof firstUser.displayName === "string", "AC2-master: element has displayName string");
  assert(typeof firstUser.role === "string", "AC2-master: element has role string");
  assert(typeof firstUser.devUserFlag === "boolean", "AC2-master: element has devUserFlag boolean");
  assert(typeof firstUser.createdAt === "string", "AC2-master: element has createdAt string");
  // Verify seeded users are present
  const ids = masterBody.map((u) => u.id);
  assert(ids.includes("user-dev-1"), "AC2-master: user-dev-1 (master) is present");
  assert(ids.includes("user-dev-2"), "AC2-master: user-dev-2 (admin) is present");
  assert(ids.includes("user-dev-3"), "AC2-master: user-dev-3 (normal) is present");
  console.log("smoke-admin-users-list AC2-master: PASS");

  // ── admin GET /v1/admin/users → 200 ───────────────────────────────────────
  const adminResp = await fetch(`${baseUrl}/v1/admin/users`, {
    headers: { cookie: adminCookie }
  });
  assert(adminResp.status === 200, "AC2-admin: GET /v1/admin/users returns 200");
  const adminBody = await adminResp.json();
  assert(Array.isArray(adminBody), "AC2-admin: response is an array");
  assert(adminBody.length === masterBody.length, "AC2-admin: admin sees same count as master");
  console.log("smoke-admin-users-list AC2-admin: PASS");

  // ── Create a normal-role session via sign-up (user-dev-3 has devUserFlag=false, blocks sign-in) ──
  const normalCookie = await signUp(baseUrl, "스모크노멀", "20269001");

  // ── normal GET /v1/admin/users → 403 FORBIDDEN_ROLE ───────────────────────
  const normalResp = await fetch(`${baseUrl}/v1/admin/users`, {
    headers: { cookie: normalCookie }
  });
  assert(normalResp.status === 403, "AC2-normal: GET /v1/admin/users returns 403");
  const normalBody = await normalResp.json();
  assert(normalBody.errorCode === "FORBIDDEN_ROLE", "AC2-normal: errorCode is FORBIDDEN_ROLE");
  console.log("smoke-admin-users-list AC2-normal: PASS");

  // ── no-cookie GET /v1/admin/users → 401 AUTH_REQUIRED ─────────────────────
  const noCookieResp = await fetch(`${baseUrl}/v1/admin/users`);
  assert(noCookieResp.status === 401, "AC2-no-cookie: GET /v1/admin/users returns 401");
  const noCookieBody = await noCookieResp.json();
  assert(noCookieBody.errorCode === "AUTH_REQUIRED", "AC2-no-cookie: errorCode is AUTH_REQUIRED");
  console.log("smoke-admin-users-list AC2-no-cookie: PASS");

  console.log("\nsmoke-admin-users-list: ALL PASS");
} catch (error) {
  process.stderr.write(`smoke-admin-users-list: FAIL — ${error.message}\n`);
  process.exit(1);
} finally {
  server?.kill("SIGTERM");
  await smokeDb?.stop();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function assert(condition, label) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
  console.log(`  ✓ ${label}`);
}

async function signIn(base, name, studentNumber) {
  const resp = await fetch(`${base}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, studentNumber })
  });
  if (resp.status !== 200) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(`sign-in failed for ${name}: HTTP ${resp.status} ${JSON.stringify(body)}`);
  }
  const rawCookie = resp.headers.get("set-cookie");
  if (!rawCookie) throw new Error(`No Set-Cookie for ${name}`);
  return rawCookie.split(";")[0].trim();
}

async function signUp(base, name, studentNumber) {
  const resp = await fetch(`${base}/v1/auth/sign-up`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, studentNumber })
  });
  if (resp.status !== 200) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(`sign-up failed for ${name}: HTTP ${resp.status} ${JSON.stringify(body)}`);
  }
  const rawCookie = resp.headers.get("set-cookie");
  if (!rawCookie) throw new Error(`No Set-Cookie for ${name} after sign-up`);
  return rawCookie.split(";")[0].trim();
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
