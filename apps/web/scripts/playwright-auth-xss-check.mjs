/**
 * playwright-auth-xss-check.mjs — S2 WU3 AC7(INV-8) XSS escape 확인.
 *
 * authApiErrorFromResponse 가 body.errorMessage → error.message → loginFeedback.detail
 * → AuthGate <p>{detail}</p> 경로로 XSS payload 를 React JSX 자동 escape 하는지 검증.
 *
 * prod-build(dist) 를 vite preview 로 서빙, page.route 로 API 스텁.
 * 기존 dist 사용 (사전에 pnpm build 완료된 상태).
 *
 * exit 0 = PASS, exit 1 = FAIL.
 */
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { chromium } from "@playwright/test";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4320;
const BASE = `http://127.0.0.1:${PORT}`;
const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

function resolveChromePath() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium"
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (statSync(c).isFile()) return c; } catch { /* next */ }
  }
  return undefined;
}

function startPreview() {
  return spawn(
    "pnpm",
    ["exec", "vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    { cwd: WEB_ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE);
      if (res.status < 600) return;
    } catch { /* 미가동 */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`preview not ready after 20s at ${BASE}`);
}

const failures = [];
const check = (cond, msg) => {
  console.log(`  ${cond ? "✅" : "❌"} ${msg}`);
  if (!cond) failures.push(msg);
};

const executablePath = resolveChromePath();
const preview = startPreview();

try {
  await waitForServer();

  const browser = await chromium.launch(
    executablePath ? { executablePath, headless: true } : { headless: true }
  );
  const consoleErrors = [];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on("console", m => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", e => consoleErrors.push(`pageerror: ${e.message}`));

    // 1. API stub: sign-up 400 with XSS payload in errorMessage
    await page.route("**/v1/auth/sign-up", async route => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          errorCode: "TEST_XSS",
          // errorMessage 가 authApiErrorFromResponse(L98) → error.message →
          // loginFeedback.detail → AuthGate <p>{detail}</p> 경유
          errorMessage: XSS_PAYLOAD
        })
      });
    });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20_000 });
    await page.waitForTimeout(800);

    // 2. 로그인 화면 렌더 확인
    const hasLoginScreen = await page.evaluate(() => !!document.querySelector("[data-login-screen]"));
    check(hasLoginScreen, "[data-login-screen] 렌더됨 (사전 확인)");

    // 3. 회원가입 탭으로 전환
    await page.getByRole("tab", { name: "회원가입" }).click();
    await page.waitForTimeout(200);

    // 4. non-XSS 유효 입력 + 제출 (API stub 이 XSS errorMessage 반환)
    await page.locator('input[name="name"]').fill("테스트유저");
    await page.locator('input[name="studentNumber"]').fill("20240001");
    await page.locator("form.login-form button[type=submit]").click();
    await page.waitForTimeout(500);

    // 5. .login-feedback.is-error 존재 확인 (API error 가 피드백으로 렌더됨)
    const feedbackEl = await page.evaluate(() => {
      const el = document.querySelector(".login-feedback.is-error");
      return el ? { text: el.textContent ?? "", innerHTML: el.innerHTML } : null;
    });
    check(feedbackEl !== null, ".login-feedback.is-error 존재 (API 에러 피드백 렌더됨)");

    // 6. XSS payload 가 텍스트로 포함됨 확인 (React 가 escape 했으면 textContent 에 남아야 함)
    //    실제 <img> 태그가 DOM 에 주입됐다면 이 텍스트는 없음
    const payloadAsText = feedbackEl?.text?.includes("<img");
    // textContent 에 "<img" 문자열이 있거나, 혹은 img 태그가 DOM 에 없어야 함
    // 둘 다 체크: img[onerror] 없음 = 주입 안 됨
    const imgInjected = await page.evaluate(
      () => !!document.querySelector("img[onerror]") || !!document.querySelector("img[src='x']")
    );
    check(!imgInjected, `XSS img 태그 DOM 주입 없음 — img[onerror] ${imgInjected ? "발견(FAIL)" : "미발견(PASS)"}`);

    // 7. innerHTML 에 raw <img 태그 없음 + &lt;img escape 존재 (React JSX escape 확인)
    // onerror= 문자열 자체는 escape된 텍스트 안에 존재하는 것이 정상
    // (예: "&lt;img src=x onerror=alert(1)&gt;" — 텍스트이지 HTML attribute 아님)
    const hasRawImgTag = feedbackEl?.innerHTML?.includes("<img ") ?? false;
    const hasEscapedImg = feedbackEl?.innerHTML?.includes("&lt;img") ?? false;
    check(!hasRawImgTag, `innerHTML 에 raw <img> 태그 없음 (XSS 미주입) — ${hasRawImgTag ? "발견(FAIL)" : "미발견(PASS)"}`);
    check(hasEscapedImg, `innerHTML 에 &lt;img escape 확인 (React JSX escape 동작) — ${hasEscapedImg ? "확인(PASS)" : "미확인"}`);

    // 8. console error 0 (XSS 실행 안 됨 확인)
    const xssExecuted = consoleErrors.some(e => /onerror|alert|XSS/i.test(e));
    check(!xssExecuted, `onerror 실행 흔적 없음 — console error: ${consoleErrors.length}`);

    if (feedbackEl) {
      console.log(`  ℹ️  feedback textContent: "${feedbackEl.text.slice(0, 80)}"`);
      console.log(`  ℹ️  feedback innerHTML:   "${feedbackEl.innerHTML.slice(0, 120)}"`);
    }

    await page.close();
  } finally {
    await browser.close();
  }
} catch (err) {
  failures.push(`예외: ${err?.message ?? err}`);
  console.log(`❌ 예외: ${err?.message ?? err}`);
} finally {
  preview.kill("SIGTERM");
}

console.log(`\n=== XSS escape check: ${failures.length === 0 ? "PASS ✅" : "FAIL ❌"} ===`);
if (failures.length) failures.forEach(f => console.log(`  - ${f}`));
process.exit(failures.length === 0 ? 0 : 1);
