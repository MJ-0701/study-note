// smoke-persona-design: persona-turn 핵심 UI 상태를 Chrome CDP로 검증하고 시각 evidence를 남긴다.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const SESSION_COOKIE_NAME = "study_note_session";
const SEED_USER_NAME = process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User";
const SEED_USER_STUDENT_NUMBER = process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001";
const EVIDENCE_DIR =
  "docs/solon/cdp-design-smoke-mcp-gate-secret-notice-recent-conversations-404-card-visual-evidence/20260516/evidence";
const MISSING_CONVERSATION_ID = "c000000000000000000000000";
const RECENT_TITLE = "회로 1주차 요약해줘";
const CONSOLE_LINES = [];
const outputCapture = [];

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stdout.write = function writeStdout(chunk, encoding, callback) {
  outputCapture.push(String(chunk));
  return originalStdoutWrite(chunk, encoding, callback);
};
process.stderr.write = function writeStderr(chunk, encoding, callback) {
  outputCapture.push(String(chunk));
  return originalStderrWrite(chunk, encoding, callback);
};

const chromePath = resolveChromePath();
const backendPort = 3400 + Math.floor(Math.random() * 1000);
const backendBaseUrl = `http://127.0.0.1:${backendPort}/api`;
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const vitePort = 5173 + Math.floor(Math.random() * 1000);
const viteBaseUrl = `http://127.0.0.1:${vitePort}`;
const remotePort = 9223 + Math.floor(Math.random() * 1000);
const tempRoot = await mkdtemp(join(tmpdir(), "study-note-persona-design-"));
const userDataDir = join(tempRoot, "chrome");

let smokeDb;
let prisma;
let backendServer;
let viteServer;
let chrome;
let cdp;
let seededConversation;
const backendLogs = [];
const viteLogs = [];
const domSnapshots = [];
const generatedFiles = [];

try {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  smokeDb = await prepareSmokeDatabase("persona-design");
  prisma = new PrismaClient({
    datasources: { db: { url: smokeDb.databaseUrl } }
  });
  seededConversation = await seedConversation();

  backendServer = startBackend(backendPort, smokeDb);
  await waitFor(async () => {
    try {
      const response = await fetch(`${backendBaseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }, 15000);

  viteServer = startVite();
  await waitFor(async () => {
    try {
      const response = await fetch(viteBaseUrl);
      return response.ok;
    } catch {
      return false;
    }
  }, 15000);

  chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-address=127.0.0.1`,
    `--remote-debugging-port=${remotePort}`,
    "about:blank"
  ], {
    stdio: ["ignore", "ignore", "pipe"]
  });
  chrome.stderr.on("data", (chunk) => outputCapture.push(String(chunk)));

  cdp = await connectToChrome();
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");

  log(`CDP localhost target ready: http://127.0.0.1:${remotePort}`);

  await assertSignedOutBoundary();
  await signInThroughPersonaPage();
  await assertMcpGateDesktop();
  await assertSecretNotice();
  await assertRecentConversationsDesktop();
  await assertConversationNotFound();
  await assertMobileGate();
  await assertMobileRecentConversations();

  await scanArtifactsForSecrets();

  log("Persona design smoke passed");
  log("- signed-out browser does not expose recent conversations");
  log("- MCP onboarding gate renders 4 stable actions");
  log("- onboarding secret-handling notice renders S1/S2/S3");
  log("- recent conversations sidebar renders seeded active row");
  log("- stale conversation URL renders 404 guidance card");
  log("- mobile gate/sidebar fit checks passed");
  log("- artifact secret scan passed");
} finally {
  cdp?.close();
  chrome?.kill("SIGTERM");
  viteServer?.kill("SIGTERM");
  backendServer?.kill("SIGTERM");
  await prisma?.$disconnect();
  await smokeDb?.stop();
  await removeTempRoot();
}

function log(line) {
  CONSOLE_LINES.push(line);
  console.log(line);
}

function startBackend(port, db) {
  const child = spawn("node", ["apps/api/dist/main.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: db.databaseUrl,
      SESSION_TOKEN_PEPPER: db.sessionTokenPepper,
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "local",
      CORS_ALLOWED_ORIGINS: viteBaseUrl
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => backendLogs.push(String(chunk)));
  child.stderr.on("data", (chunk) => backendLogs.push(String(chunk)));
  return child;
}

function startVite() {
  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev", "--", "--port", String(vitePort), "--strictPort"],
    {
      env: {
        ...process.env,
        BROWSER: "none",
        VITE_BACKEND_BASE: backendOrigin
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    }
  );
  child.stdout.on("data", (chunk) => viteLogs.push(String(chunk)));
  child.stderr.on("data", (chunk) => viteLogs.push(String(chunk)));
  return child;
}

async function seedConversation() {
  const user = await prisma.user.findUnique({
    where: { studentNumber: SEED_USER_STUDENT_NUMBER }
  });
  if (!user) {
    throw new Error(`seed user not found: ${SEED_USER_STUDENT_NUMBER}`);
  }

  const conversation = await prisma.conversation.create({
    data: {
      ownerId: user.id,
      subject: "digital-engineering",
      personaName: "디공이"
    }
  });
  await prisma.turn.create({
    data: {
      conversationId: conversation.id,
      subject: "digital-engineering",
      query: RECENT_TITLE,
      k: 1,
      response: "[smoke] synthetic response",
      sources: [],
      provider: "fixture-smoke",
      modelName: "fixture@smoke",
      retrievalCount: 0,
      isFallback: false
    }
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });
  return conversation;
}

async function assertSignedOutBoundary() {
  await setDesktopViewport();
  await navigate("/persona-turn.html");
  await waitFor(() => evaluate("Boolean(document.querySelector('.login-screen'))"));
  await assertEval("!document.querySelector('[data-recent-conversations]')", "signed-out browser does not render recent conversations");
  rememberDomSnapshot("signed-out", await bodyText());
}

async function signInThroughPersonaPage() {
  await submitPersonaLogin(SEED_USER_NAME, SEED_USER_STUDENT_NUMBER);
  await waitFor(() => evaluate("Boolean(document.querySelector('.app-shell'))"), 10000);
}

async function assertMcpGateDesktop() {
  await clearGateDismissStorage();
  await navigate("/persona-turn.html");
  await waitFor(() => evaluate("Boolean(document.querySelector('[data-mcp-onboarding-gate=\"true\"]'))"), 10000);
  await assertEval(
    `{
      const gate = document.querySelector('[data-mcp-onboarding-gate="true"]');
      const actions = ['guide', 'completed', 'deferred', 'external-close'];
      return Boolean(gate) &&
        gate.getAttribute('role') === 'dialog' &&
        actions.every((action) => gate.querySelector('[data-mcp-gate-action="' + action + '"]')) &&
        gate.contains(document.activeElement);
    }`,
    "MCP gate renders dialog with guide/completed/deferred/external-close actions"
  );
  rememberDomSnapshot("mcp-gate", await bodyText());
  await captureScreenshot("01-mcp-gate.png");
}

async function assertSecretNotice() {
  await setDesktopViewport();
  await navigate("/onboarding-mcp.html#trouble");
  await waitFor(() => evaluate("Boolean(document.getElementById('trouble'))"));
  await waitFor(() => evaluate("Boolean(document.querySelector('[data-secret-handling-notice=\"true\"]'))"));
  await evaluate(`{
    document.querySelector('[data-secret-handling-notice="true"]')?.scrollIntoView({ block: 'center' });
    return true;
  }`);
  await assertEval(
    `{
      const notice = document.querySelector('[data-secret-handling-notice="true"]');
      const ids = ['S1', 'S2', 'S3'];
      return Boolean(document.getElementById('trouble')) &&
        Boolean(notice) &&
        ids.every((id) => notice.querySelector('[data-secret-handling-id="' + id + '"]'));
    }`,
    "secret-handling notice renders #trouble anchor and S1/S2/S3"
  );
  rememberDomSnapshot("secret-notice", await bodyText());
  await captureScreenshot("02-secret-notice.png");
}

async function assertRecentConversationsDesktop() {
  await setDesktopViewport();
  await deferGateForScene();
  await navigate(`/persona-turn.html#/conversation/${seededConversation.id}`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[data-conversation-id="${seededConversation.id}"]'))`), 10000);
  await assertEval(
    `{
      const group = document.querySelector('[data-recent-conversations="true"]');
      const row = document.querySelector('[data-conversation-id="${seededConversation.id}"]');
      return Boolean(group) &&
        Boolean(row) &&
        row.classList.contains('active') &&
        row.getAttribute('href') === '#/conversation/${seededConversation.id}' &&
        row.textContent.trim() === ${JSON.stringify(RECENT_TITLE)};
    }`,
    "recent conversations sidebar renders seeded active row"
  );
  rememberDomSnapshot("recent-conversations", await bodyText());
  await captureScreenshot("03-recent-conversations.png");
}

async function assertConversationNotFound() {
  await setDesktopViewport();
  await deferGateForScene();
  await navigate(`/persona-turn.html#/conversation/${MISSING_CONVERSATION_ID}`);
  await waitFor(() => evaluate("Boolean(document.querySelector('[data-conversation-not-found=\"true\"]'))"), 10000);
  await assertEval(
    `{
      const notFound = document.querySelector('[data-conversation-not-found="true"]');
      const genericError = Array.from(document.querySelectorAll('section[role="alert"] strong'))
        .some((item) => item.textContent?.trim() === '오류');
      return Boolean(notFound) && !genericError && document.body.innerText.includes('대화를 찾지 못했어요');
    }`,
    "stale conversation URL renders dedicated 404 guidance card"
  );
  rememberDomSnapshot("conversation-404", await bodyText());
  await captureScreenshot("04-conversation-404.png");
}

async function assertMobileGate() {
  await setMobileViewport();
  await clearGateDismissStorage();
  await navigate("/persona-turn.html");
  await waitFor(() => evaluate("Boolean(document.querySelector('[data-mcp-onboarding-gate=\"true\"]'))"), 10000);
  await assertEval(
    `{
      const gate = document.querySelector('[data-mcp-onboarding-gate="true"]');
      if (!gate) return false;
      const rect = gate.getBoundingClientRect();
      const buttons = Array.from(gate.querySelectorAll('button'));
      return rect.left >= 0 &&
        rect.right <= window.innerWidth &&
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        buttons.every((button) => {
          const r = button.getBoundingClientRect();
          return r.left >= 0 && r.right <= window.innerWidth && r.width >= 32 && r.height >= 32;
        });
    }`,
    "mobile MCP gate fits viewport and keeps buttons reachable"
  );
  await captureScreenshot("05-mobile-gate.png");
}

async function assertMobileRecentConversations() {
  await setMobileViewport();
  await deferGateForScene();
  await navigate(`/persona-turn.html#/conversation/${seededConversation.id}`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[data-conversation-id="${seededConversation.id}"]'))`), 10000);
  await assertEval(
    `{
      const group = document.querySelector('[data-recent-conversations="true"]');
      const row = document.querySelector('[data-conversation-id="${seededConversation.id}"]');
      if (!group || !row) return false;
      const groupRect = group.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return groupRect.left >= 0 &&
        groupRect.right <= window.innerWidth &&
        rowRect.left >= 0 &&
        rowRect.right <= window.innerWidth &&
        rowRect.height > 12;
    }`,
    "mobile recent conversations row stays inside viewport"
  );
  await captureScreenshot("06-mobile-recent-conversations.png");
}

async function submitPersonaLogin(name, studentNumber) {
  const ok = await evaluate(`{
    const studentInput = document.querySelector('input[aria-label="학번"]');
    const nameInput = document.querySelector('input[aria-label="이름"]');
    const form = document.querySelector('form.login-form');
    if (!studentInput || !nameInput || !form) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(studentInput, ${JSON.stringify(studentNumber)});
    studentInput.dispatchEvent(new Event('input', { bubbles: true }));
    setter.call(nameInput, ${JSON.stringify(name)});
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
    return true;
  }`);
  if (!ok) throw new Error("persona login form not found");
}

async function deferGateForScene() {
  await evaluate(`{
    sessionStorage.setItem('study-note.mcp.onboarding-deferred.v1', 'true');
    document.querySelector('[data-mcp-gate-action="external-close"]')?.click();
    return true;
  }`);
  await waitFor(() => evaluate("!document.querySelector('[data-mcp-onboarding-gate=\"true\"]')"), 5000);
}

async function clearGateDismissStorage() {
  await evaluate(`{
    localStorage.removeItem('study-note.mcp.onboarding-completed.v1');
    sessionStorage.removeItem('study-note.mcp.onboarding-deferred.v1');
    return true;
  }`);
}

async function navigate(path) {
  await cdp.send("Page.navigate", { url: `${viteBaseUrl}${path}` });
}

async function setDesktopViewport() {
  await cdp.send("Emulation.clearDeviceMetricsOverride");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
}

async function setMobileViewport() {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
}

async function captureScreenshot(fileName) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true
  });
  const filePath = join(EVIDENCE_DIR, fileName);
  await writeFile(filePath, Buffer.from(result.data, "base64"));
  generatedFiles.push(filePath);
  log(`  ✓ screenshot: ${filePath}`);
}

async function bodyText() {
  return evaluate("document.body.innerText");
}

function rememberDomSnapshot(label, text) {
  domSnapshots.push({ label, text });
}

async function scanArtifactsForSecrets() {
  const cookies = await getCookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
  const capturedSessionValue = sessionCookie?.value;
  const generatedText = [
    ...CONSOLE_LINES,
    ...outputCapture,
    ...domSnapshots.map((snapshot) => `${snapshot.label}\n${snapshot.text}`)
  ].join("\n");

  const forbidden = [
    { label: "captured session cookie", value: capturedSessionValue },
    { label: "session cookie assignment", value: `${SESSION_COOKIE_NAME}=` },
    { label: "DATABASE_URL env key", value: "DATABASE_URL=" },
    { label: "smoke database url", value: smokeDb?.databaseUrl },
    { label: "session pepper key", value: "SESSION_TOKEN_PEPPER=" },
    { label: "session pepper value", value: smokeDb?.sessionTokenPepper },
    { label: "MCP owner env key", value: "STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER=" }
  ].filter((item) => item.value);

  for (const item of forbidden) {
    if (generatedText.includes(item.value)) {
      throw new Error(`artifact secret scan failed: ${item.label}`);
    }
  }

  const eightDigitValues = generatedText.match(/\b\d{8}\b/g) ?? [];
  const allowedEightDigitValues = new Set([
    SEED_USER_STUDENT_NUMBER,
    "20260516"
  ]);
  const unexpectedPii = eightDigitValues.filter((value) => !allowedEightDigitValues.has(value));
  if (unexpectedPii.length > 0) {
    throw new Error(`artifact secret scan failed: unexpected 8-digit value ${unexpectedPii[0]}`);
  }
}

async function getCookies() {
  const result = await cdp.send("Network.getCookies", {});
  return result.cookies ?? [];
}

async function evaluate(expression) {
  const source = expression.trim();
  const wrappedExpression = source.startsWith("{")
    ? `(() => ${source})()`
    : `(() => (${source}))()`;
  const result = await cdp.send("Runtime.evaluate", {
    expression: wrappedExpression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "Runtime.evaluate failed"
    );
  }

  return result.result.value;
}

async function assertEval(expression, label) {
  const ok = await evaluate(expression);
  if (!ok) throw new Error(`Smoke assertion failed: ${label}`);
  log(`  ✓ ${label}`);
}

async function waitFor(check, timeoutMs = 5000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  const detail = lastError instanceof Error ? `: ${lastError.message}` : "";
  throw new Error(`Timed out while waiting for smoke condition${detail}`);
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectToChrome() {
  await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${remotePort}/json/version`);
      return response.ok;
    } catch {
      return false;
    }
  }, 15000);

  const response = await fetch(`http://127.0.0.1:${remotePort}/json/list`);
  const targets = await response.json();
  const target = targets.find((item) => item.type === "page") ?? targets[0];
  if (!target?.webSocketDebuggerUrl) {
    throw new Error("Chrome DevTools target not found");
  }
  if (!target.webSocketDebuggerUrl.startsWith(`ws://127.0.0.1:${remotePort}/`)) {
    throw new Error(`CDP target is not localhost-scoped: ${target.webSocketDebuggerUrl}`);
  }
  return createCdpClient(target.webSocketDebuggerUrl);
}

function createCdpClient(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (!payload.id || !pending.has(payload.id)) return;
    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);
    if (payload.error) {
      reject(new Error(payload.error.message));
      return;
    }
    resolve(payload.result);
  });

  return {
    close() {
      socket.close();
    },
    async send(method, params = {}) {
      await new Promise((resolve) => {
        if (socket.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }
        socket.addEventListener("open", resolve, { once: true });
      });

      const messageId = ++id;
      const response = new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
      });
      socket.send(JSON.stringify({ id: messageId, method, params }));
      return response;
    }
  };
}

function resolveChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  if (process.platform === "win32") {
    const candidates = [
      `${process.env["ProgramFiles"] ?? "C:\\Program Files"}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)"}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["LOCALAPPDATA"] ?? ""}\\Google\\Chrome\\Application\\chrome.exe`
    ];
    for (const candidate of candidates) {
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // try next
      }
    }
  }
  if (process.platform === "linux") {
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
      "/opt/google/chrome/chrome"
    ];
    for (const candidate of candidates) {
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // try next
      }
    }
  }
  throw new Error("Chrome executable not found. Set CHROME_PATH env to override.");
}

async function removeTempRoot() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(tempRoot, { recursive: true, force: true });
      return;
    } catch (error) {
      await delay(250);
      if (attempt === 2) {
        console.warn(`Smoke cleanup skipped: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}
