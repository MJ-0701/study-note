/**
 * smoke-auth-deny.mjs — AC1-N: devUserFlag=false / nonexistent user → 403
 *
 * Prerequisites: same as smoke-auth-signin.mjs
 *   seed.mjs must have user-dev-3 (studentNumber=20269998, devUserFlag=false)
 *
 * Exit 0 = all assertions pass. Exit 1 = any assertion fails.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const SEED_USER_NAME =
  process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User";
const PLAIN_USER_STUDENT_NUMBER = "20269998"; // user-dev-3 (devUserFlag=false)
const PLAIN_USER_NAME = "Plain User";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    if (!process.env.DATABASE_URL && !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("auth-deny");
    }
    const db = smokeDb ?? {
      databaseUrl: process.env.DATABASE_URL,
      sessionTokenPepper: process.env.SESSION_TOKEN_PEPPER
    };
    if (!db.databaseUrl || !db.sessionTokenPepper) {
      process.stderr.write(
        "ERROR: DATABASE_URL and SESSION_TOKEN_PEPPER are required (or set STUDY_NOTE_API_BASE)\n"
      );
      process.exit(1);
    }

    const port = 3700 + Math.floor(Math.random() * 1000);
    baseUrl = `http://127.0.0.1:${port}/api`;
    server = startBackend(port, db);
    await waitForHealthy(baseUrl);
  }

  // Case 1: non-existent student number → 403
  const nonexistentResponse = await fetch(`${baseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: SEED_USER_NAME, studentNumber: "20269999" })
  });

  assert(nonexistentResponse.status === 403, "nonexistent user: HTTP 403");

  const nonexistentCookie = nonexistentResponse.headers.get("set-cookie");
  assert(!nonexistentCookie, "nonexistent user: Set-Cookie absent");

  const nonexistentBody = await nonexistentResponse.json();
  assert(
    !JSON.stringify(nonexistentBody).includes("20269999"),
    "nonexistent user: studentNumber not echoed in body"
  );
  assert(
    typeof nonexistentBody.errorCode === "string",
    "nonexistent user: errorCode present"
  );

  // Case 2: devUserFlag=false user → 403
  const deniedResponse = await fetch(`${baseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: PLAIN_USER_NAME, studentNumber: PLAIN_USER_STUDENT_NUMBER })
  });

  assert(deniedResponse.status === 403, "devUserFlag=false user: HTTP 403");

  const deniedCookie = deniedResponse.headers.get("set-cookie");
  assert(!deniedCookie, "devUserFlag=false user: Set-Cookie absent");

  const deniedBody = await deniedResponse.json();
  assert(
    !JSON.stringify(deniedBody).includes(PLAIN_USER_STUDENT_NUMBER),
    "devUserFlag=false user: studentNumber not echoed in body"
  );
  assert(deniedBody.errorCode === "AUTH_DENIED", "devUserFlag=false user: errorCode=AUTH_DENIED");

  console.log("smoke-auth-deny: PASS");
} catch (error) {
  process.stderr.write(`smoke-auth-deny: FAIL — ${error.message}\n`);
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
