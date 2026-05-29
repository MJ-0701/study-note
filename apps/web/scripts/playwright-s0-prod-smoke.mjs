/**
 * playwright-s0-prod-smoke.mjs — React 마이그레이션 S0 PROD smoke (익명 경로).
 *
 * 대상 = https://study-note.910701.xyz (fe-v0.1.66, S0). 인증 없이 검증 가능한
 * S0 회귀 면만 확인: React mount / LegacyView(display:contents) bridge / 익명
 * boot=login 렌더 / ACA cold-start gate(/auth/me 미호출) / hashchange 라우팅 +
 * LegacyView 무remount / console error 0.
 *
 * 인증·PDF·iPad(INV-1/2) 는 operator 수동 QA (체크리스트 §A~F).
 *
 * exit 0 = PASS, 1 = FAIL.
 */
import { statSync } from "node:fs";
import { chromium } from "@playwright/test";

const PROD_URL = process.env.S0_SMOKE_URL ?? "https://study-note.910701.xyz/";

function resolveChromePath() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {
      /* next */
    }
  }
  return undefined;
}

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`${cond ? "✅" : "❌"} ${msg}`);
};

const execPath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ?? resolveChromePath();
const browser = await chromium.launch(
  execPath ? { executablePath: execPath } : {}
);
const context = await browser.newContext(); // clean = first-visit anonymous
const page = await context.newPage();

// favicon.ico 404 는 pre-existing (index.html 에 favicon link 없음, S0 무관) →
// 무시. JS pageerror + favicon 외 resource 오류만 회귀로 카운트.
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (/Failed to load resource.*\b404\b/i.test(t)) return; // 대부분 favicon (아래 4xx 리스너가 실 자원 404 별도 포착)
  consoleErrors.push(t);
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

// favicon 외 4xx/5xx 네트워크 응답 = 실 회귀(누락 chunk/asset/api).
const badResponses = [];
page.on("response", (r) => {
  if (r.status() >= 400 && !/\/favicon\.ico(\?|$)/.test(r.url())) {
    badResponses.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  }
});

const authMeCalls = [];
page.on("request", (r) => {
  if (/\/v1\/auth\/me|\/auth\/me/.test(r.url())) authMeCalls.push(r.url());
});

try {
  await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("#legacy-app-root", { timeout: 10000 });

  const mount = await page.evaluate(() => {
    const app = document.querySelector("#app");
    const legacy = document.querySelector("#legacy-app-root");
    return {
      appChildCount: app ? app.children.length : -1,
      legacyExists: !!legacy,
      legacyDisplay: legacy ? getComputedStyle(legacy).display : null,
      legacyChildCount: legacy ? legacy.children.length : -1,
      hasForm: !!document.querySelector("form"),
      body: (document.body.innerText || "").slice(0, 120)
    };
  });

  check(mount.appChildCount === 1, `#app 단일 child(React mount) — got ${mount.appChildCount}`);
  check(mount.legacyExists, "#legacy-app-root 존재(LegacyView)");
  check(mount.legacyDisplay === "contents", `컨테이너 display:contents — got ${mount.legacyDisplay}`);
  check(mount.legacyChildCount >= 1, `legacy 렌더 콘텐츠 존재 — got ${mount.legacyChildCount} child`);
  check(mount.hasForm, "익명 boot = 로그인 폼 렌더");
  check(/스터디|study|로그인|STUDY|WORKSPACE/i.test(mount.body), `로그인 페이지 텍스트 — "${mount.body.slice(0, 40)}"`);

  // ACA cold-start gate: 익명 첫 방문은 /auth/me 미호출
  check(authMeCalls.length === 0, `익명 boot /auth/me 미호출(ACA gate) — got ${authMeCalls.length}`);

  // hashchange 라우팅 — LegacyView 무remount + 렌더 유지
  await page.evaluate(() => { location.hash = "#/intake"; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = "#/pdf-workspaces"; });
  await page.waitForTimeout(400);
  const afterNav = await page.evaluate(() => {
    const legacy = document.querySelector("#legacy-app-root");
    return {
      legacyChildCount: legacy ? legacy.children.length : -1,
      appChildCount: document.querySelector("#app")?.children.length ?? -1,
      rendered: !!document.querySelector("form") || !!document.querySelector(".app-shell")
    };
  });
  check(afterNav.appChildCount === 1, `hashchange 후 #app 단일 child(무remount) — got ${afterNav.appChildCount}`);
  check(afterNav.legacyChildCount >= 1, `hashchange 후 legacy 콘텐츠 유지 — got ${afterNav.legacyChildCount}`);
  check(afterNav.rendered, "hashchange 후 렌더 유지");

  check(badResponses.length === 0, `favicon 외 4xx/5xx 0 — got ${badResponses.length}${badResponses.length ? ": " + badResponses.slice(0, 3).join(" | ") : ""}`);
  check(consoleErrors.length === 0, `JS console error 0 (favicon 404 제외) — got ${consoleErrors.length}${consoleErrors.length ? ": " + consoleErrors.slice(0, 3).join(" | ") : ""}`);
} catch (err) {
  failures.push(`예외: ${err?.message ?? err}`);
  console.log(`❌ 예외: ${err?.message ?? err}`);
} finally {
  await browser.close();
}

console.log(`\n=== S0 PROD smoke: ${failures.length === 0 ? "PASS ✅" : "FAIL ❌"} (${failures.length} 실패) ===`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
