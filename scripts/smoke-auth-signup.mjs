/**
 * smoke-auth-signup.mjs — AC1 + AC1-D + AC1-S + AC1-A: sign-up contract
 *
 * Cases:
 *   AC1   new student sign-up → 200 + body {userId,studentNumber,name,role:"normal"} + Set-Cookie
 *   AC1-A auto-sign-in → cookie from AC1 allows GET /v1/auth/me → 200
 *   AC1-D duplicate studentNumber → 409 + errorCode AUTH_DUPLICATE_STUDENT + no Set-Cookie
 *   AC1-S invalid format → 400 + errorCode AUTH_INVALID_INPUT
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

const SIGNUP_NAME = "신규학생";
const SIGNUP_STUDENT_NUMBER = "20269000";

let server;
let smokeDb;
let baseUrl = process.env.STUDY_NOTE_API_BASE;

try {
  if (!baseUrl) {
    if (!process.env.DATABASE_URL && !process.env.SESSION_TOKEN_PEPPER) {
      smokeDb = await prepareSmokeDatabase("auth-signup");
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

  // ── AC1: new student sign-up returns 200 with correct shape ───────────────
  const signUpResponse = await fetch(`${baseUrl}/v1/auth/sign-up`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: SIGNUP_NAME, studentNumber: SIGNUP_STUDENT_NUMBER })
  });

  assert(signUpResponse.status === 200, "AC1: sign-up returns HTTP 200");

  const signUpBody = await signUpResponse.json();

  assert(typeof signUpBody.userId === "string", "AC1: body.userId is a string");
  assert(typeof signUpBody.studentNumber === "string", "AC1: body.studentNumber is a string");
  assert(typeof signUpBody.name === "string", "AC1: body.name is a string");
  assert(signUpBody.role === "normal", "AC1: body.role is 'normal'");
  assert(signUpBody.studentNumber === SIGNUP_STUDENT_NUMBER, "AC1: studentNumber matches input");
  assert(signUpBody.name === SIGNUP_NAME, "AC1: name matches input");
  assert(!("token" in signUpBody), "AC1: body does not contain token");
  assert(!("sessionToken" in signUpBody), "AC1: body does not contain sessionToken");
  assert(!("expiresAt" in signUpBody), "AC1: body does not contain expiresAt");

  const signUpCookieHeader = signUpResponse.headers.get("set-cookie");
  assert(!!signUpCookieHeader, "AC1: Set-Cookie header is present");

  const cookieLower = signUpCookieHeader.toLowerCase();
  assert(signUpCookieHeader.startsWith("study_note_session="), "AC1: cookie name is study_note_session");
  assert(cookieLower.includes("httponly"), "AC1: cookie has HttpOnly");
  assert(cookieLower.includes("secure"), "AC1: cookie has Secure");
  assert(cookieLower.includes("samesite=lax"), "AC1: cookie has SameSite=Lax");
  assert(!cookieLower.includes("max-age"), "AC1: cookie has NO Max-Age (session cookie)");

  console.log("smoke-auth-signup AC1: PASS");

  // ── AC1-A: auto-sign-in — use cookie from AC1 to call /me ─────────────────
  // Parse the raw cookie value from the Set-Cookie header
  const rawCookiePart = signUpCookieHeader.split(";")[0]; // "study_note_session=<value>"
  const sessionCookieForRequest = rawCookiePart.trim(); // already in "name=value" form

  const meResponse = await fetch(`${baseUrl}/v1/auth/me`, {
    method: "GET",
    headers: { cookie: sessionCookieForRequest }
  });

  assert(meResponse.status === 200, "AC1-A: /me returns HTTP 200 with sign-up cookie");

  const meBody = await meResponse.json();
  assert(meBody.userId === signUpBody.userId, "AC1-A: /me userId matches sign-up userId");
  assert(meBody.studentNumber === SIGNUP_STUDENT_NUMBER, "AC1-A: /me studentNumber matches");
  assert(meBody.name === SIGNUP_NAME, "AC1-A: /me name matches");
  assert(meBody.role === "normal", "AC1-A: /me role is 'normal'");

  console.log("smoke-auth-signup AC1-A: PASS");

  // ── AC1-D: duplicate studentNumber → 409 ──────────────────────────────────
  const dupResponse = await fetch(`${baseUrl}/v1/auth/sign-up`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: SIGNUP_NAME, studentNumber: SIGNUP_STUDENT_NUMBER })
  });

  assert(dupResponse.status === 409, "AC1-D: duplicate sign-up returns HTTP 409");

  const dupBody = await dupResponse.json();
  assert(dupBody.errorCode === "AUTH_DUPLICATE_STUDENT", "AC1-D: errorCode is AUTH_DUPLICATE_STUDENT");

  const dupCookieHeader = dupResponse.headers.get("set-cookie");
  assert(!dupCookieHeader, "AC1-D: no Set-Cookie on duplicate");

  console.log("smoke-auth-signup AC1-D: PASS");

  // ── AC1-S: invalid studentNumber format → 400 ─────────────────────────────
  const fmtResponse = await fetch(`${baseUrl}/v1/auth/sign-up`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "x", studentNumber: "abc12345" })
  });

  assert(fmtResponse.status === 400, "AC1-S: invalid format returns HTTP 400");

  const fmtBody = await fmtResponse.json();
  assert(fmtBody.errorCode === "AUTH_INVALID_INPUT", "AC1-S: errorCode is AUTH_INVALID_INPUT");

  console.log("smoke-auth-signup AC1-S: PASS");

  console.log("\nsmoke-auth-signup: ALL PASS");
} catch (error) {
  process.stderr.write(`smoke-auth-signup: FAIL — ${error.message}\n`);
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
