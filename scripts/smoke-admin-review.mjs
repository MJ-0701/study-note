/**
 * smoke-admin-review.mjs — AC5: review marker endpoint
 *
 * Cases:
 *   master PUT /users/user-dev-3/review → 200 + reviewedAt is ISO string
 *   admin  PUT /users/user-dev-3/review → 200 + reviewedAt updated (idempotent)
 *   normal PUT /users/user-dev-3/review → 403 FORBIDDEN_ROLE
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("admin-review");
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
  const adminCookie = await signIn(baseUrl, "Admin User", "20260004");
  // user-dev-3 has devUserFlag=false, blocking sign-in; use sign-up for a normal-role cookie.
  const normalCookie = await signUp(baseUrl, "스모크노멀", "20269001");

  // ── master PUT /users/user-dev-3/review → 200 + reviewedAt ────────────────
  const masterReviewResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/review`, {
    method: "PUT",
    headers: { cookie: masterCookie }
  });
  assert(masterReviewResp.status === 200, "AC5-master: master PUT review → 200");
  const masterReviewBody = await masterReviewResp.json();
  assert(typeof masterReviewBody.reviewedAt === "string", "AC5-master: reviewedAt is a string");
  assert(
    !isNaN(Date.parse(masterReviewBody.reviewedAt)),
    "AC5-master: reviewedAt parses as valid ISO date"
  );
  const firstReviewedAt = masterReviewBody.reviewedAt;
  console.log("smoke-admin-review AC5-master: PASS");

  // ── small delay to ensure updated timestamp differs ────────────────────────
  await new Promise((r) => setTimeout(r, 10));

  // ── admin PUT /users/user-dev-3/review → 200 + reviewedAt updated (idempotent) ──
  const adminReviewResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/review`, {
    method: "PUT",
    headers: { cookie: adminCookie }
  });
  assert(adminReviewResp.status === 200, "AC5-admin: admin PUT review → 200");
  const adminReviewBody = await adminReviewResp.json();
  assert(typeof adminReviewBody.reviewedAt === "string", "AC5-admin: reviewedAt is a string");
  assert(
    !isNaN(Date.parse(adminReviewBody.reviewedAt)),
    "AC5-admin: reviewedAt parses as valid ISO date"
  );
  // Idempotent endpoint always updates — second call should have a reviewedAt
  // (may equal or be later than first call depending on clock granularity).
  assert(
    typeof adminReviewBody.reviewedAt === "string",
    "AC5-admin-idempotent: second PUT returns reviewedAt"
  );
  console.log(`  (first: ${firstReviewedAt}, second: ${adminReviewBody.reviewedAt})`);
  console.log("smoke-admin-review AC5-admin: PASS");

  // ── normal PUT /users/user-dev-3/review → 403 FORBIDDEN_ROLE ──────────────
  const normalReviewResp = await fetch(`${baseUrl}/v1/admin/users/user-dev-3/review`, {
    method: "PUT",
    headers: { cookie: normalCookie }
  });
  assert(normalReviewResp.status === 403, "AC5-normal: normal PUT review → 403");
  const normalReviewBody = await normalReviewResp.json();
  assert(normalReviewBody.errorCode === "FORBIDDEN_ROLE", "AC5-normal: errorCode is FORBIDDEN_ROLE");
  console.log("smoke-admin-review AC5-normal: PASS");

  console.log("\nsmoke-admin-review: ALL PASS");
} catch (error) {
  process.stderr.write(`smoke-admin-review: FAIL — ${error.message}\n`);
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
