/**
 * playwright-auth-boot.mjs — frontend auth boot UX smoke.
 *
 * Verifies the two boot lanes that matter for production links opened from
 * Kakao/in-app browsers:
 * - first-time visitor: login/signup is visible immediately while /me is still pending
 * - returning visitor: prior sign-in hint keeps the blocking session-check lane
 */
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { chromium } from "@playwright/test";

const AUTH_SESSION_HINT_STORAGE_KEY = "study-note.auth-session-hint.v1";
const chromePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ?? resolveChromePath();
const vitePort = Number(process.env.AUTH_BOOT_SMOKE_PORT ?? 5190 + Math.floor(Math.random() * 300));
const viteBaseUrl = `http://127.0.0.1:${vitePort}`;
const appUrl = `${viteBaseUrl}/#/subjects/digital-engineering/pdf-workspace`;

const viteLogs = [];
const viteServer = spawn(
  "pnpm",
  [
    "--filter",
    "@study-note/web",
    "exec",
    "vite",
    "--host",
    "127.0.0.1",
    "--port",
    String(vitePort),
    "--strictPort"
  ],
  {
    env: {
      ...process.env,
      BROWSER: "none"
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);
viteServer.stdout.on("data", (chunk) => viteLogs.push(String(chunk)));
viteServer.stderr.on("data", (chunk) => viteLogs.push(String(chunk)));

let browser;

try {
  await waitFor(async () => {
    try {
      const response = await fetch(viteBaseUrl);
      return response.ok;
    } catch {
      return false;
    }
  }, 10000);

  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true
  });

  await assertFirstTimeVisitorBoot();
  await assertReturningVisitorBoot();

  console.log("playwright-auth-boot: PASS");
} catch (error) {
  process.stderr.write(
    `playwright-auth-boot: FAIL — ${error instanceof Error ? error.message : String(error)}\n`
  );
  if (viteLogs.length > 0) {
    process.stderr.write(viteLogs.join(""));
  }
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  stopProcess(viteServer);
}

async function assertFirstTimeVisitorBoot() {
  const context = await browser.newContext({
    locale: "ko-KR",
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  let authMeCalled = false;

  await page.route("**/api/v1/auth/me", async (route) => {
    authMeCalled = true;
    await delay(2500);
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ errorCode: "SESSION_REQUIRED" })
    });
  });

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.locator("[data-login-screen]").waitFor({ state: "visible", timeout: 1000 });

  const sessionCheckCount = await page.locator("[data-session-checking]").count();
  if (sessionCheckCount !== 0) {
    throw new Error("first-time visitor saw the blocking session-check screen");
  }

  const loginTitle = await page.locator("#login-title").textContent({ timeout: 1000 });
  if (loginTitle?.trim() !== "study-note") {
    throw new Error(`first-time visitor login title mismatch: ${loginTitle ?? "(missing)"}`);
  }

  const signupTabs = await page.getByRole("tab", { name: "회원가입" }).count();
  if (signupTabs !== 1) {
    throw new Error("first-time visitor cannot see the sign-up entry");
  }

  await delay(2700);
  const delayedSessionCheckCount = await page.locator("[data-session-checking]").count();
  if (delayedSessionCheckCount !== 0) {
    throw new Error("first-time visitor entered session-check after /me delay");
  }
  if (!authMeCalled) {
    throw new Error("first-time visitor did not run background /me revalidation");
  }

  await context.close();
  console.log("  ✓ first-time visitor sees login/signup immediately");
}

async function assertReturningVisitorBoot() {
  const context = await browser.newContext({
    locale: "ko-KR",
    viewport: { width: 390, height: 844 }
  });
  await context.addInitScript((key) => {
    localStorage.setItem(key, "1");
  }, AUTH_SESSION_HINT_STORAGE_KEY);
  const page = await context.newPage();
  let authMeCalled = false;

  await page.route("**/api/v1/auth/me", async (route) => {
    authMeCalled = true;
    await delay(300);
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ errorCode: "SESSION_REQUIRED" })
    });
  });

  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.locator("[data-session-checking]").waitFor({ state: "visible", timeout: 1000 });
  await page.locator("[data-login-screen]").waitFor({ state: "visible", timeout: 3000 });

  if (!authMeCalled) {
    throw new Error("returning visitor did not run blocking /me revalidation");
  }

  await page.waitForFunction(
    (key) => localStorage.getItem(key) === null,
    AUTH_SESSION_HINT_STORAGE_KEY,
    { timeout: 3000 }
  );

  await context.close();
  console.log("  ✓ returning visitor uses session-check then falls back to login on 401");
}

function resolveChromePath() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];

  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      /* try next */
    }
  }

  throw new Error("Chrome/Chromium executable not found; set PLAYWRIGHT_CHROME_EXECUTABLE_PATH");
}

async function waitFor(check, timeoutMs) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await check()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`timed out waiting for Vite (${lastError?.message ?? "no response"})`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  }, 1000).unref();
}
