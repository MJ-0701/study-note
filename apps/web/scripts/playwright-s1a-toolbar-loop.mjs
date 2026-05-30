/**
 * playwright-s1a-toolbar-loop.mjs — S1a fix-forward 검증.
 *
 * PdfToolbarPortal 무한 렌더 루프(Maximum update depth / getSnapshot should be
 * cached) 회귀 검증. prod-build(dist) 를 vite preview 로 서빙한 URL 대상.
 * unit/jsdom 으로는 못 잡는 런타임 effect 루프라 prod-build playwright 필수.
 *
 * 통과 기준: home(/#/) + pdf-workspace 라우트 양쪽 pageError 0, #app non-empty.
 * exit 0 = PASS, 1 = FAIL.
 */
import { statSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.PREVIEW_URL ?? "http://127.0.0.1:4317";

function resolveChromePath() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium"
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

const routes = [
  { name: "home", hash: "#/" },
  { name: "pdf-workspace", hash: "#/subjects/loop-test-subject/pdf-workspace" }
];

const failures = [];

const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
try {
  for (const r of routes) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));
    page.on("console", (msg) => {
      const t = msg.text();
      if (/Maximum update depth|getSnapshot should be cached|Minified React error #185/.test(t)) {
        pageErrors.push(`console: ${t}`);
      }
    });

    await page.goto(`${BASE}/${r.hash}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1500); // effect 루프가 있으면 이 시간 안에 터짐

    const appHtml = await page.evaluate(() => document.getElementById("app")?.innerHTML ?? "");
    const nonEmpty = appHtml.trim().length > 0;

    const ok = pageErrors.length === 0 && nonEmpty;
    console.log(`${ok ? "✅" : "❌"} [${r.name}] pageErrors=${pageErrors.length} #app.nonEmpty=${nonEmpty} (len=${appHtml.length})`);
    if (pageErrors.length) console.log(`   errors:\n   - ${pageErrors.slice(0, 5).join("\n   - ")}`);
    if (!ok) failures.push(r.name);

    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.log(`\n❌ FAIL: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\n✅ PASS: 양 라우트 pageError 0 + #app non-empty (무한루프 회귀 없음)");
