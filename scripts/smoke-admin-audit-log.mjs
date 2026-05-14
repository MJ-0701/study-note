/**
 * smoke-admin-audit-log.mjs — AC1: audit log emit verification
 *
 * Asserts that master-role mutations emit the 3 required audit log lines,
 * each containing actor= (regression guard against actor field being dropped).
 *
 * Cases:
 *   master sign-in → sign-up new dev user → master PUT role/dev-user-flag/review
 *   → stdout+stderr captured → 3 audit log lines with actor= asserted
 *
 * NOTE: STUDY_NOTE_API_BASE env is intentionally NOT respected here — this test
 * MUST spawn its own API child to capture NestJS Logger stdout for audit line
 * assertion. Targeting a prestarted (외부 hosted) API would lose the stdout
 * pipe and prevent log capture. Same pattern as smoke-auth-pii-redaction and
 * smoke-auth-dev-disable. Codex PR #5 P2 finding documented here.
 *
 * Prerequisites:
 *   DATABASE_URL and SESSION_TOKEN_PEPPER must be set, OR self-bootstrap via
 *   prepareSmokeDatabase when either env is missing.
 *
 * Exit 0 = all 3 lines emitted with actor=. Exit 1 = any missing.
 */
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

let server;
let smokeDb;
const logLines = [];

try {
  if (!process.env.DATABASE_URL || !process.env.SESSION_TOKEN_PEPPER) {
    smokeDb = await prepareSmokeDatabase("admin-audit-log");
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

  const port = 4100 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}/api`;
  server = startBackend(port, db, logLines);
  await waitForHealthy(baseUrl);

  // master sign-in
  const masterCookie = await signIn(baseUrl, "Dev User", "20260001");
  console.log("  ✓ master sign-in OK");

  // sign-up a fresh dev user to be the mutation target
  const signUpResp = await fetch(`${baseUrl}/v1/auth/sign-up`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Audit Target", studentNumber: "20269990" })
  });
  if (signUpResp.status !== 200) {
    const body = await signUpResp.json().catch(() => ({}));
    throw new Error(`sign-up failed: HTTP ${signUpResp.status} ${JSON.stringify(body)}`);
  }
  const signUpBody = await signUpResp.json();
  const newUserId = signUpBody.userId;
  if (!newUserId) throw new Error("sign-up response missing userId");
  console.log(`  ✓ new dev user signed up — userId=${newUserId}`);

  // mutation 1: PUT role → ADMIN
  const roleResp = await fetch(`${baseUrl}/v1/admin/users/${newUserId}/role`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie },
    body: JSON.stringify({ role: "ADMIN" })
  });
  if (roleResp.status !== 200) {
    const body = await roleResp.json().catch(() => ({}));
    throw new Error(`role update failed: HTTP ${roleResp.status} ${JSON.stringify(body)}`);
  }
  console.log("  ✓ PUT role ADMIN → 200");

  // mutation 2: PUT dev-user-flag → false
  const flagResp = await fetch(`${baseUrl}/v1/admin/users/${newUserId}/dev-user-flag`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie },
    body: JSON.stringify({ devUserFlag: false })
  });
  if (flagResp.status !== 200) {
    const body = await flagResp.json().catch(() => ({}));
    throw new Error(`devUserFlag update failed: HTTP ${flagResp.status} ${JSON.stringify(body)}`);
  }
  console.log("  ✓ PUT devUserFlag false → 200");

  // mutation 3: PUT review
  const reviewResp = await fetch(`${baseUrl}/v1/admin/users/${newUserId}/review`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: masterCookie }
  });
  if (reviewResp.status !== 200) {
    const body = await reviewResp.json().catch(() => ({}));
    throw new Error(`review mark failed: HTTP ${reviewResp.status} ${JSON.stringify(body)}`);
  }
  console.log("  ✓ PUT review → 200");

  // wait for log flush
  await new Promise((r) => setTimeout(r, 300));

  const allLog = logLines.join("\n");

  // AC1: assert 3 audit log lines present, each containing actor=
  const roleLine = logLines.find((l) => l.includes("[Admin] role update userId="));
  const flagLine = logLines.find((l) => l.includes("[Admin] devUserFlag update userId="));
  const reviewLine = logLines.find((l) => l.includes("[Admin] review marked userId="));

  const missing = [];
  if (!roleLine) missing.push("[Admin] role update userId=");
  if (!flagLine) missing.push("[Admin] devUserFlag update userId=");
  if (!reviewLine) missing.push("[Admin] review marked userId=");

  if (missing.length > 0) {
    throw new Error(
      `FAIL: audit log lines missing:\n  ${missing.join("\n  ")}\n\nCaptured log (last 30 lines):\n${logLines.slice(-30).join("\n")}`
    );
  }

  console.log(`  ✓ [Admin] role update line: ${roleLine.trim()}`);
  console.log(`  ✓ [Admin] devUserFlag update line: ${flagLine.trim()}`);
  console.log(`  ✓ [Admin] review marked line: ${reviewLine.trim()}`);

  // per-line actor= check — regression guard against actor field being dropped
  if (!roleLine.includes("actor=")) {
    throw new Error(`FAIL: role update audit line missing actor=\n  Line: ${roleLine}`);
  }
  if (!flagLine.includes("actor=")) {
    throw new Error(`FAIL: devUserFlag update audit line missing actor=\n  Line: ${flagLine}`);
  }
  if (!reviewLine.includes("actor=")) {
    throw new Error(`FAIL: review marked audit line missing actor=\n  Line: ${reviewLine}`);
  }
  console.log("  ✓ all 3 audit lines contain actor=");

  console.log("\nsmoke-admin-audit-log: PASS");
} catch (error) {
  process.stderr.write(`smoke-admin-audit-log: FAIL — ${error.message}\n`);
  process.exit(1);
} finally {
  server?.kill("SIGTERM");
  await smokeDb?.stop();
}

function startBackend(port, db, logCollector) {
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

  // codex P1 fix — chunk boundary 가 arbitrary 라 partial line 누락 위험.
  // stdout / stderr 별 buffer 유지하고 "\n" 만나면 complete line 만 push.
  let stdoutBuf = "";
  let stderrBuf = "";
  function makeCollector(getBuf, setBuf) {
    return (chunk) => {
      const next = getBuf() + chunk.toString();
      const parts = next.split("\n");
      // 마지막 partial 은 buffer 에 retain
      setBuf(parts.pop() ?? "");
      for (const line of parts) {
        logCollector.push(line);
      }
    };
  }
  function flushBuf(getBuf, setBuf) {
    const tail = getBuf();
    if (tail) {
      logCollector.push(tail);
      setBuf("");
    }
  }

  child.stdout.on("data", makeCollector(() => stdoutBuf, (v) => { stdoutBuf = v; }));
  child.stderr.on("data", makeCollector(() => stderrBuf, (v) => { stderrBuf = v; }));
  child.on("close", () => {
    flushBuf(() => stdoutBuf, (v) => { stdoutBuf = v; });
    flushBuf(() => stderrBuf, (v) => { stderrBuf = v; });
  });
  return child;
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
