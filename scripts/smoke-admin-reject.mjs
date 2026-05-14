/**
 * smoke-admin-reject.mjs — AC4: devUserFlag update master-only + self-protect
 *
 * Seed state: user-dev-3 devUserFlag=false (normal user on deny-list).
 * To make the test discriminating we first set devUserFlag=true (reset), then false.
 *
 * Cases:
 *   master PUT /users/user-dev-3/dev-user-flag {devUserFlag:true}  → 200 (reset)
 *   master PUT /users/user-dev-3/dev-user-flag {devUserFlag:false} → 200 + devUserFlag=false
 *   admin  PUT /users/user-dev-3/dev-user-flag {devUserFlag:false} → 403 FORBIDDEN_ROLE
 *   master PUT /users/user-dev-1/dev-user-flag {devUserFlag:false} → 403 CANNOT_MODIFY_SELF
 *   normal PUT /users/user-dev-3/dev-user-flag {devUserFlag:false} → 403 FORBIDDEN_ROLE
 *   reset: master PUT /users/user-dev-3/dev-user-flag {devUserFlag:true} for clean state
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("admin-reject");
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
  // user-dev-3 has devUserFlag=false, blocking sign-in; use sign-up for a normal-role cookie.
  const normalCookie = await signUp(baseUrl, "스모크노멀", "20269001");

  // ── Reset: master sets user-dev-3 devUserFlag=true (makes test discriminating) ──
  const resetResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/dev-user-flag`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie },
    body: JSON.stringify({ devUserFlag: true })
  });
  assert(resetResp.status === 200, "AC4-reset: master PUT devUserFlag=true → 200");
  const resetBody = await resetResp.json();
  assert(resetBody.devUserFlag === true, "AC4-reset: returned devUserFlag is true");
  console.log("smoke-admin-reject AC4-reset: PASS");

  // ── master PUT user-dev-3 devUserFlag=false → 200 ─────────────────────────
  const masterRejectResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/dev-user-flag`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie },
    body: JSON.stringify({ devUserFlag: false })
  });
  assert(masterRejectResp.status === 200, "AC4-master: master PUT devUserFlag=false → 200");
  const masterRejectBody = await masterRejectResp.json();
  assert(masterRejectBody.devUserFlag === false, "AC4-master: returned devUserFlag is false");
  console.log("smoke-admin-reject AC4-master: PASS");

  // ── admin PUT user-dev-3 devUserFlag → 403 FORBIDDEN_ROLE ─────────────────
  const adminResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/dev-user-flag`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ devUserFlag: false })
  });
  assert(adminResp.status === 403, "AC4-admin: admin PUT devUserFlag → 403");
  const adminBody = await adminResp.json();
  assert(adminBody.errorCode === "FORBIDDEN_ROLE", "AC4-admin: errorCode is FORBIDDEN_ROLE");
  console.log("smoke-admin-reject AC4-admin: PASS");

  // ── master PUT own row (user-dev-1) → 403 CANNOT_MODIFY_SELF ─────────────
  const selfResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-1/dev-user-flag`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie },
    body: JSON.stringify({ devUserFlag: false })
  });
  assert(selfResp.status === 403, "AC4-master-self: master self PUT devUserFlag → 403");
  const selfBody = await selfResp.json();
  assert(selfBody.errorCode === "CANNOT_MODIFY_SELF", "AC4-master-self: errorCode is CANNOT_MODIFY_SELF");
  console.log("smoke-admin-reject AC4-master-self: PASS");

  // ── normal PUT → 403 FORBIDDEN_ROLE ───────────────────────────────────────
  const normalResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/dev-user-flag`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: normalCookie },
    body: JSON.stringify({ devUserFlag: false })
  });
  assert(normalResp.status === 403, "AC4-normal: normal PUT devUserFlag → 403");
  const normalBody = await normalResp.json();
  assert(normalBody.errorCode === "FORBIDDEN_ROLE", "AC4-normal: errorCode is FORBIDDEN_ROLE");
  console.log("smoke-admin-reject AC4-normal: PASS");

  // ── Cleanup: restore user-dev-3 devUserFlag=true ───────────────────────────
  const cleanupResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/dev-user-flag`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie },
    body: JSON.stringify({ devUserFlag: true })
  });
  assert(cleanupResp.status === 200, "AC4-cleanup: master restores devUserFlag=true → 200");
  console.log("smoke-admin-reject AC4-cleanup: PASS");

  console.log("\nsmoke-admin-reject: ALL PASS");
} catch (error) {
  process.stderr.write(`smoke-admin-reject: FAIL — ${error.message}\n`);
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
