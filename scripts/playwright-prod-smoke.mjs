// 운영지표 v2 sprint-W22-sprint-24 — prod FE smoke. tags=fe-v0.1.52 deploy 후
// 브라우저 console error 0 + login form render 검증. main bundle JS crash 차단.

import { statSync } from "node:fs";
import { chromium } from "@playwright/test";

const PROD_URL = process.env.PROD_URL ?? "https://study-note.910701.xyz/";
const TIMEOUT_MS = 30_000;

function resolveChromePath() {
  const cands = [
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium"
  ].filter(Boolean);
  for (const c of cands) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {}
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: resolveChromePath() });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
const failedRequests = [];
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(`console.error: ${msg.text()}`);
  }
});
page.on("requestfailed", (req) =>
  failedRequests.push(`${req.failure()?.errorText ?? "?"} ${req.url()}`)
);
page.on("response", (res) => {
  if (res.status() >= 400) {
    failedRequests.push(`HTTP ${res.status()} ${res.url()}`);
  }
});

console.log(`navigating to ${PROD_URL}`);
const response = await page.goto(PROD_URL, { waitUntil: "load", timeout: TIMEOUT_MS });
const status = response?.status() ?? 0;
console.log(`http status = ${status}`);

if (status >= 400) {
  console.error("FAIL: non-2xx response");
  await browser.close();
  process.exit(1);
}

// Wait for either login form OR app-shell to render (cookie-rehydrated session).
await page
  .waitForFunction(
    () => {
      const login = document.querySelector('input[name="studentNumber"], button[type="submit"]');
      const app = document.querySelector('[data-app-shell], main');
      return Boolean(login || app);
    },
    { timeout: 10_000 }
  )
  .catch(() => null);

const title = await page.title();
console.log(`title = ${title}`);

const loginVisible = await page.locator('text=로그인').first().isVisible().catch(() => false);
const signupVisible = await page.locator('text=회원가입').first().isVisible().catch(() => false);
console.log(`login button visible = ${loginVisible}, signup tab visible = ${signupVisible}`);

await page.waitForTimeout(3000);

console.log(`console error count = ${consoleErrors.length}`);
for (const err of consoleErrors) console.log(`  ${err}`);
console.log(`failed request count = ${failedRequests.length}`);
for (const req of failedRequests) console.log(`  ${req}`);

await browser.close();

// 404 on favicon, /api/v1/auth/me (when not logged in) = expected. Filter:
const benign404 = /\/(favicon\.|apple-touch-icon)|\/api\/v1\/auth\/me$/;
const realFailures = failedRequests.filter((r) => !benign404.test(r));
const fail =
  status >= 400 ||
  consoleErrors.some((e) => !/404 \(\)/.test(e)) ||
  realFailures.length > 0 ||
  (!loginVisible && !signupVisible);
if (fail) {
  console.error("FAIL");
  process.exit(1);
}
console.log("PASS");
process.exit(0);
