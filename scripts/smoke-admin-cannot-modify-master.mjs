/**
 * smoke-admin-cannot-modify-master.mjs — AC2: CANNOT_MODIFY_MASTER regression guard
 *
 * Cases:
 *   admin (Reviewer / 20260002) PUT /users/user-dev-1/role {role:"NORMAL"}
 *   → HTTP 403 + errorCode "CANNOT_MODIFY_MASTER"
 *
 * user-dev-1 is the master seed user (seeded by prepareSmokeDatabase).
 * Exit 0 = master target role change blocked with correct errorCode. Exit 1 = fail.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    // codex PR #5 P2 fix — 둘 중 하나라도 missing 이면 self-bootstrap.
    // 이전 && 는 partial env (DATABASE_URL 만 있고 PEPPER 없음) 환경에서
    // prepareSmokeDatabase 건너뛰고 missing-value error 로 false-negative.
    if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("admin-cannot-modify-master");
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

    const port = 4200 + Math.floor(Math.random() * 1000);
    baseUrl = `http://127.0.0.1:${port}/api`;
    server = startBackend(port, db);
    await waitForHealthy(baseUrl);
  }

  // admin sign-in (Reviewer — role=admin seed user)
  const adminCookie = await signIn(baseUrl, "Reviewer", "20260002");
  console.log("  ✓ admin sign-in OK");

  // admin attempts to change role of master target (user-dev-1) → must be 403
  const resp = await fetch(`${baseUrl}/v1/admin/users/user-dev-1/role`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ role: "NORMAL" })
  });
  assert(resp.status === 403, `AC2: admin PUT master role → 403 (got ${resp.status})`);
  const body = await resp.json();
  assert(
    body.errorCode === "CANNOT_MODIFY_MASTER",
    `AC2: errorCode is CANNOT_MODIFY_MASTER (got ${JSON.stringify(body.errorCode)})`
  );

  console.log("\nsmoke-admin-cannot-modify-master: PASS");
} catch (error) {
  process.stderr.write(`smoke-admin-cannot-modify-master: FAIL — ${error.message}\n`);
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
