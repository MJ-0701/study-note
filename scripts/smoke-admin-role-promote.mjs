/**
 * smoke-admin-role-promote.mjs — AC3: role update RBAC + constraint validation
 *
 * Cases:
 *   master PUT /users/user-dev-3/role {role:"ADMIN"} → 200 + role=admin in response
 *   admin  PUT /users/user-dev-3/role {role:"NORMAL"} → 200 (revert, admin can demote)
 *   admin  PUT /users/user-dev-3/role {role:"MASTER"} → 400 ADMIN_CANNOT_PROMOTE_TO_MASTER
 *   admin  PUT /users/user-dev-2/role {role:"NORMAL"} → 403 CANNOT_MODIFY_SELF
 *   normal PUT /users/user-dev-3/role {role:"ADMIN"} → 403 FORBIDDEN_ROLE
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    if (!process.env.DATABASE_URL && !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("admin-role-promote");
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

  // ── master promotes user-dev-3 to ADMIN ───────────────────────────────────
  const masterPromoteResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/role`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie },
    body: JSON.stringify({ role: "ADMIN" })
  });
  assert(masterPromoteResp.status === 200, "AC3-master-promote: master PUT role → 200");
  const masterPromoteBody = await masterPromoteResp.json();
  assert(masterPromoteBody.role === "admin", "AC3-master-promote: returned role is 'admin'");
  console.log("smoke-admin-role-promote AC3-master-promote: PASS");

  // ── admin demotes user-dev-3 back to NORMAL ────────────────────────────────
  const adminDemoteResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/role`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ role: "NORMAL" })
  });
  assert(adminDemoteResp.status === 200, "AC3-admin-demote: admin PUT role NORMAL → 200");
  const adminDemoteBody = await adminDemoteResp.json();
  assert(adminDemoteBody.role === "normal", "AC3-admin-demote: returned role is 'normal'");
  console.log("smoke-admin-role-promote AC3-admin-demote: PASS");

  // ── admin tries to promote to MASTER → 400 ────────────────────────────────
  const adminPromoteMasterResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/role`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ role: "MASTER" })
  });
  assert(adminPromoteMasterResp.status === 400, "AC3-admin-master: admin cannot promote to MASTER → 400");
  const adminPromoteMasterBody = await adminPromoteMasterResp.json();
  assert(
    adminPromoteMasterBody.errorCode === "ADMIN_CANNOT_PROMOTE_TO_MASTER",
    "AC3-admin-master: errorCode is ADMIN_CANNOT_PROMOTE_TO_MASTER"
  );
  console.log("smoke-admin-role-promote AC3-admin-master: PASS");

  // ── admin tries to modify own role → 403 CANNOT_MODIFY_SELF ──────────────
  const adminSelfResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-2/role`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ role: "NORMAL" })
  });
  assert(adminSelfResp.status === 403, "AC3-admin-self: admin self PUT role → 403");
  const adminSelfBody = await adminSelfResp.json();
  assert(adminSelfBody.errorCode === "CANNOT_MODIFY_SELF", "AC3-admin-self: errorCode is CANNOT_MODIFY_SELF");
  console.log("smoke-admin-role-promote AC3-admin-self: PASS");

  // ── normal tries PUT role → 403 FORBIDDEN_ROLE ────────────────────────────
  const normalResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/role`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: normalCookie },
    body: JSON.stringify({ role: "ADMIN" })
  });
  assert(normalResp.status === 403, "AC3-normal: normal PUT role → 403");
  const normalBody = await normalResp.json();
  assert(normalBody.errorCode === "FORBIDDEN_ROLE", "AC3-normal: errorCode is FORBIDDEN_ROLE");
  console.log("smoke-admin-role-promote AC3-normal: PASS");

  console.log("\nsmoke-admin-role-promote: ALL PASS");
} catch (error) {
  process.stderr.write(`smoke-admin-role-promote: FAIL — ${error.message}\n`);
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
