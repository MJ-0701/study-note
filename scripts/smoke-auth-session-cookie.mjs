/**
 * smoke-auth-session-cookie.mjs — AC1-S: cookie attributes contract
 *
 * Asserts that sign-in response:
 *   - Sets study_note_session cookie with HttpOnly, Secure, SameSite=Lax
 *   - Does NOT set Max-Age or Expires (browser-close expiry, D-plan-3)
 *   - Response body contains no sessionToken / token fields
 *
 * Prerequisites: same as smoke-auth-signin.mjs
 * Exit 0 = pass. Exit 1 = fail.
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
    if (!process.env.DATABASE_URL && !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("auth-session-cookie");
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

    const port = 3800 + Math.floor(Math.random() * 1000);
    baseUrl = `http://127.0.0.1:${port}/api`;
    server = startBackend(port, db);
    await waitForHealthy(baseUrl);
  }

  const response = await fetch(`${baseUrl}/v1/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: SEED_USER_NAME, studentNumber: SEED_USER_STUDENT_NUMBER })
  });

  assert(response.status === 200, "sign-in returns HTTP 200");

  const setCookie = response.headers.get("set-cookie");
  assert(!!setCookie, "Set-Cookie header is present");

  const cookieLower = setCookie.toLowerCase();

  assert(setCookie.startsWith("study_note_session="), "cookie name is study_note_session");
  assert(cookieLower.includes("httponly"), "cookie has HttpOnly");
  assert(cookieLower.includes("secure"), "cookie has Secure");
  assert(cookieLower.includes("samesite=lax"), "cookie has SameSite=Lax");
  assert(!cookieLower.includes("max-age"), "cookie has NO Max-Age (session cookie)");
  assert(!cookieLower.includes("expires"), "cookie has NO Expires (session cookie)");

  // Verify cookie value is non-empty
  const cookieValue = setCookie.split(";")[0].split("=").slice(1).join("=");
  assert(!!cookieValue && cookieValue.length > 8, "cookie value is non-trivially long");

  // Response body must not expose the token
  const body = await response.json();
  const bodyStr = JSON.stringify(body);
  assert(!bodyStr.toLowerCase().includes("sessiontoken"), "body has no sessionToken field");
  assert(!("token" in body), "body has no token field");
  assert(!("expiresAt" in body), "body has no expiresAt field");

  // Verify token value is not echoed anywhere in the body
  const rawToken = decodeURIComponent(cookieValue);
  assert(!bodyStr.includes(rawToken), "cookie token value is not in response body");

  console.log("smoke-auth-session-cookie: PASS");
} catch (error) {
  process.stderr.write(`smoke-auth-session-cookie: FAIL — ${error.message}\n`);
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
