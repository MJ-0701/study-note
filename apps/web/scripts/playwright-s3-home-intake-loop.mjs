/**
 * playwright-s3-home-intake-loop.mjs — S3 home+intake React island 무한루프 면역 prod-build 게이트.
 *
 * session-stub(addInitScript localStorage hint seed + page.route /v1/auth/me mock +
 * study_note_session_hint cookie) 으로 renderApp auth early-return 통과 후
 * home(#/) + intake(#/intake) + subject-intake 실 island mount 를 검증한다.
 *
 * 직렬 실행:
 *   1. build(GREEN) → preview → session-stub → home/intake island 긍정 단언 +
 *      loopErrors 0 + 노드 identity 불변
 *   2. DIST delta 측정 (RED 빌드 후 delta > 0 증명)
 *   3. build(RED S3_LOOP_NEG_CTRL=1) → preview → loopErrors > 0 확인
 *   4. build(GREEN) 복원
 *
 * exit 0 = PASS (GREEN assertions + DIST delta > 0 + RED loop detected)
 * exit 1 = FAIL (항목 나열)
 */
import { spawnSync, spawn } from "node:child_process";
import { statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { chromium } from "@playwright/test";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4320;
const BASE = `http://127.0.0.1:${PORT}`;

// ────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────

function resolveChromePath() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {
      /* next */
    }
  }
  return undefined;
}

/** pnpm build 실행. neg=true → S3_LOOP_NEG_CTRL=1 (RED 빌드). 메인 entry JS 크기 반환(bytes). */
function build(neg) {
  console.log(`\n--- build(${neg ? "RED/s3-neg-ctrl" : "GREEN"}) ---`);
  const result = spawnSync("pnpm", ["build"], {
    cwd: WEB_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      AUTH_LOOP_NEG_CTRL: "0",
      S3_LOOP_NEG_CTRL: neg ? "1" : "0"
    }
  });
  if (result.status !== 0) {
    throw new Error(`pnpm build failed (exit ${result.status})`);
  }
  const assetsDir = resolve(WEB_ROOT, "dist", "assets");
  try {
    const files = readdirSync(assetsDir).filter((f) => /^main-[^-]+\.js$/.test(f));
    if (files.length === 0) return 0;
    return files.reduce((sum, f) => sum + statSync(resolve(assetsDir, f)).size, 0);
  } catch {
    return 0;
  }
}

/** vite preview 프로세스 시작. */
function startPreview() {
  return spawn(
    "pnpm",
    ["exec", "vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    { cwd: WEB_ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );
}

/** BASE 에 200 응답이 올 때까지 폴링(최대 ~20s). */
async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE);
      if (res.status < 600) return;
    } catch {
      /* 아직 미가동 */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server not ready after 20s at ${BASE}`);
}

// loop detector regex (S1a incident + React error)
const LOOP_REGEX = /Maximum update depth|getSnapshot should be cached|Minified React error #185/;

// auth-me mock 응답 (AuthMeResponse shape: {userId, studentNumber, name, role})
const MOCK_AUTH_ME = {
  userId: "test-user-s3-gate",
  studentNumber: "20240001",
  name: "게이트 테스트 사용자",
  role: "student"
};

/**
 * 브라우저 검사 실행.
 * expectLoop=false → GREEN 긍정 단언 + loopErrors 0
 * expectLoop=true  → loopErrors > 0 (negative control RED 확인)
 */
async function runChecks({ expectLoop }) {
  const executablePath = resolveChromePath();
  const browser = await chromium.launch(
    executablePath ? { executablePath, headless: true } : { headless: true }
  );
  const failures = [];
  const check = (cond, msg) => {
    console.log(`  ${cond ? "✅" : "❌"} ${msg}`);
    if (!cond) failures.push(msg);
  };

  try {
    const context = await browser.newContext();

    // session-stub 1: study_note_session_hint cookie → readAuthSessionHint() = true
    // → getInitialBootState() = "checking" → revalidateOnBoot 발동
    await context.addCookies([{
      name: "study_note_session_hint",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax"
    }]);

    const page = await context.newPage();

    // session-stub 2: addInitScript → localStorage study-note.auth-session-hint.v1 = "1"
    // (cookie 는 이미 설정됨. 이중 방어: 쿠키 미지원 환경 대비)
    await page.addInitScript(() => {
      try {
        localStorage.setItem("study-note.auth-session-hint.v1", "1");
      } catch {
        /* storage 불가 환경 — cookie stub 으로 커버 */
      }
    });

    // session-stub 3: /v1/auth/me mock → AuthMeResponse 200
    // glob "**/v1/auth/me" = apiBaseUrl 관계없이 매칭
    await page.route("**/v1/auth/me", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "test-user-s3-gate",
          studentNumber: "20240001",
          name: "게이트 테스트 사용자",
          role: "student"
        })
      });
    });

    // session-stub 4: /api/materials mock → 빈 배열 (restoreUploadedPdfMaterials)
    // revalidateStoredSession 성공 후 cb.restoreUploadedPdfMaterials 가 materials
    // endpoint 를 fetch. 미모킹 시 throw → scheduleAuthBootRetry → 홈 미렌더.
    await page.route("**/materials", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]"
      });
    });

    // session-stub 5: /v1/subjects mock → 빈 배열 (loadSidebarTermsCache)
    await page.route("**/v1/subjects", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]"
      });
    });

    const loopErrors = [];
    page.on("pageerror", (e) => {
      const msg = e?.message ?? String(e);
      if (LOOP_REGEX.test(msg)) loopErrors.push(`pageerror: ${msg}`);
    });
    page.on("console", (m) => {
      const t = m.text();
      if (LOOP_REGEX.test(t)) loopErrors.push(`console: ${t}`);
    });

    // ── home route (#/) ──
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(1500);

    if (!expectLoop) {
      // GREEN 긍정 단언 ─────────────────────────────────────

      // 1. #app non-empty
      const appHtml = await page.evaluate(
        () => document.querySelector("#app")?.innerHTML?.trim() ?? ""
      );
      check(appHtml.length > 0, `#app non-empty (len=${appHtml.length})`);

      // 2. home island present
      const hasHomeIsland = await page.evaluate(
        () => !!document.querySelector("[data-react-island='home']")
      );
      check(hasHomeIsland, "[data-react-island='home'] 존재 (home route)");

      // 3. home island has content (React portal 이 children 렌더)
      const homeIslandHtml = await page.evaluate(
        () => document.querySelector("[data-react-island='home']")?.innerHTML?.trim() ?? ""
      );
      check(homeIslandHtml.length > 0, `home island children 렌더됨 (len=${homeIslandHtml.length})`);

      // 4. home island 노드 identity sentinel 저장 + 컨텐츠 검증
      const homeHasExpectedContent = await page.evaluate(() => {
        const island = document.querySelector("[data-react-island='home']");
        if (!island) return false;
        return island.innerHTML.includes("home-hero") || island.innerHTML.includes("metric-grid") || island.innerHTML.includes("홈");
      });
      check(homeHasExpectedContent, "home island 에 home-hero/metric-grid 컨텐츠 존재");

      // home island DOM 노드 identity sentinel — 짧은 간격 내 안정성 확인
      // (동일 route 에서 연속 renderApp 이 있어도 morphdom preserve 로 같은 노드)
      await page.evaluate(() => {
        window.__homeIslandNode = document.querySelector("[data-react-island='home']");
        window.__appNode = document.querySelector("#app");
      });
      await page.waitForTimeout(500);
      const homeNodeStable = await page.evaluate(() => {
        // 동일 route 내 노드 identity 안정 — 루프가 있으면 새 노드 생성으로 바뀜
        return document.querySelector("[data-react-island='home']") === window.__homeIslandNode;
      });
      check(homeNodeStable, "home island 노드 identity 안정 (동일 route 내 loop 없음)");

      // 5. 해시 라우팅(hash change) 으로 intake 이동
      await page.evaluate(() => {
        window.location.hash = "#/intake";
      });
      await page.waitForTimeout(1500);

      const hasIntakeIslandOnIntakeRoute = await page.evaluate(
        () => !!document.querySelector("[data-react-island='intake']")
      );
      check(hasIntakeIslandOnIntakeRoute, "[data-react-island='intake'] 존재 (intake route)");

      const intakeHasContent = await page.evaluate(() => {
        const island = document.querySelector("[data-react-island='intake']");
        if (!island) return false;
        return island.innerHTML.includes("intake") || island.innerHTML.includes("자료 투입") || island.innerHTML.length > 0;
      });
      check(intakeHasContent, "intake island 에 컨텐츠 존재");

      // 6. #app 노드 identity — SPA root 는 hash 변경과 무관하게 불변
      const appNodeStable = await page.evaluate(() => {
        return document.querySelector("#app") === window.__appNode;
      });
      check(appNodeStable, "#app 노드 identity 불변 (hash 변경 후)");

      // 8. loopErrors 0
      check(
        loopErrors.length === 0,
        `loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
      );

    } else {
      // RED 단언: negative control 이 동일 detector 로 루프 유발 확인
      check(
        loopErrors.length > 0,
        `RED: loopErrors > 0 — got ${loopErrors.length} (0 이면 negative control 이 루프 못 유발 → 게이트 무효)`
      );
      if (loopErrors.length > 0) {
        console.log(`  ℹ️  감지된 loop errors (최대 3):`);
        loopErrors.slice(0, 3).forEach((e) => console.log(`    - ${e.slice(0, 120)}`));
      }
    }

    await page.close();
  } finally {
    await browser.close();
  }

  return failures;
}

// ────────────────────────────────────────────────────────
// main
// ────────────────────────────────────────────────────────

const summary = [];

try {
  // ── Step 1: GREEN build + checks ──────────────────────
  const greenBundleSize = build(false);
  let preview = startPreview();
  let greenFailures = [];
  try {
    await waitForServer();
    console.log("\n--- GREEN checks (session-stub + home/intake island 긍정 단언) ---");
    greenFailures = await runChecks({ expectLoop: false });
  } finally {
    preview.kill("SIGTERM");
  }
  const greenPass = greenFailures.length === 0;
  summary.push({ label: "GREEN (positive assertions + loopErrors 0)", pass: greenPass, detail: greenFailures });
  console.log(`\n${greenPass ? "✅" : "❌"} GREEN: ${greenPass ? "PASS" : greenFailures.join(", ")}`);

  await new Promise((r) => setTimeout(r, 800));

  // ── Step 2+3: RED build + DIST delta + checks ─────────
  await new Promise((r) => setTimeout(r, 200));
  const redBundleSize = build(true);
  const bundleDelta = redBundleSize - greenBundleSize;
  const distClean = bundleDelta > 0;
  console.log(`\n--- DIST SIZE delta: RED(${redBundleSize}) - GREEN(${greenBundleSize}) = ${bundleDelta} bytes ---`);
  if (distClean) {
    console.log(`  ✅ DIST delta > 0: negative-control 코드가 RED 번들에 포함됨 → GREEN tree-shake 유효`);
  } else {
    console.log(`  ❌ DIST delta ≤ 0: negative-control 코드가 RED 번들에도 없음 → tree-shake 검증 불가`);
  }
  summary.push({ label: "DIST CLEAN (neg-control 부재 / tree-shake 유효)", pass: distClean, detail: [] });

  preview = startPreview();
  let redFailures = [];
  try {
    await waitForServer();
    console.log("\n--- RED checks (negative control 루프 유발 확인) ---");
    redFailures = await runChecks({ expectLoop: true });
  } finally {
    preview.kill("SIGTERM");
  }
  const redPass = redFailures.length === 0;
  summary.push({ label: "RED (negative control loopErrors > 0)", pass: redPass, detail: redFailures });
  console.log(`\n${redPass ? "✅" : "❌"} RED: ${redPass ? "PASS" : redFailures.join(", ")}`);

  // ── Step 4: GREEN dist 복원 ───────────────────────────
  await new Promise((r) => setTimeout(r, 800));
  console.log("\n--- restore clean dist ---");
  build(false);

} catch (err) {
  summary.push({ label: "예외", pass: false, detail: [err?.message ?? String(err)] });
  console.log(`\n❌ 예외: ${err?.message ?? err}`);
}

// ── 최종 결과 표 ──────────────────────────────────────
console.log("\n=== S3 loop-gate 결과 ===");
for (const s of summary) {
  console.log(`  ${s.pass ? "✅" : "❌"} ${s.label}`);
  if (!s.pass && s.detail?.length) {
    s.detail.forEach((d) => console.log(`      - ${d}`));
  }
}

const allPass = summary.length > 0 && summary.every((s) => s.pass);
if (allPass) {
  console.log("\n✅ PASS: S3 loop-gate GREEN + negative control RED + prod 번들 clean");
  process.exit(0);
} else {
  const failed = summary.filter((s) => !s.pass).map((s) => s.label);
  console.log(`\n❌ FAIL: ${failed.join(", ")}`);
  process.exit(1);
}
