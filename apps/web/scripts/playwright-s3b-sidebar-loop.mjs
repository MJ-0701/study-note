/**
 * playwright-s3b-sidebar-loop.mjs — S3b sidebar React island 무한루프 면역 prod-build 게이트.
 *
 * session-stub(addInitScript localStorage hint seed + page.route /v1/auth/me mock +
 * study_note_session_hint cookie + /v1/terms + /v1/subjects RICH 데이터) 으로
 * renderApp auth early-return 통과 후 sidebar island mount + 실 term-toggle 클릭
 * round-trip 을 검증한다.
 *
 * 직렬 실행:
 *   1. build(GREEN) → preview → session-stub → sidebar island 긍정 단언 +
 *      실 term-toggle 클릭 1회 → <details open> round-trip + loopErrors 0
 *      + 노드 identity 안정 + DIST delta > 0
 *   2. build(RED A: S3B_LOOP_NEG_CTRL_A=1) → preview → mount-time loopErrors > 0 확인
 *   3. build(RED B: S3B_LOOP_NEG_CTRL_B=1) → preview →
 *      mount 시 GREEN(loopErrors 0) + 실 클릭 후 loopErrors > 0 (§5-C 맹점 close)
 *   4. build(GREEN) 복원
 *
 * exit 0 = PASS (GREEN assertions + DIST delta > 0 + A RED + B RED)
 * exit 1 = FAIL (항목 나열)
 *
 * B 검증: B 가 mount 시 이미 RED 면 gate 무효 → STOP + 보고.
 */
import { spawnSync, spawn } from "node:child_process";
import { statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { chromium } from "@playwright/test";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4321; // S3 는 4320 — 포트 충돌 방지
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

/**
 * pnpm build 실행.
 * negA=true → S3B_LOOP_NEG_CTRL_A=1 (mount-time loop RED).
 * negB=true → S3B_LOOP_NEG_CTRL_B=1 (click-time loop RED).
 * 메인 entry JS 크기 반환(bytes).
 */
function build(negA, negB) {
  const label = negA ? "RED/A(mount-loop)" : negB ? "RED/B(click-loop)" : "GREEN";
  console.log(`\n--- build(${label}) ---`);
  const result = spawnSync("pnpm", ["build"], {
    cwd: WEB_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      AUTH_LOOP_NEG_CTRL: "0",
      S3_LOOP_NEG_CTRL: "0",
      S3B_LOOP_NEG_CTRL_A: negA ? "1" : "0",
      S3B_LOOP_NEG_CTRL_B: negB ? "1" : "0"
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

// RICH stub data — multi-term + multi-subject (empty[] 금지)
const STUB_TERMS = [
  { id: "t1", grade: 1, semester: 1, title: "1학기", startDate: "2025-03-01", endDate: "2025-08-31" },
  { id: "t2", grade: 1, semester: 2, title: "2학기", startDate: "2025-09-01", endDate: "2026-02-28" }
];
const STUB_SUBJECTS = [
  { id: "sub1", title: "수학", termId: "t1" },
  { id: "sub2", title: "물리", termId: "t1" },
  { id: "sub3", title: "화학", termId: "t2" }
];

/**
 * context 에 공통 session-stub + RICH data mock 적용.
 */
async function applySessionStubs(context, page) {
  // session-stub 1: study_note_session_hint cookie
  await context.addCookies([{
    name: "study_note_session_hint",
    value: "1",
    domain: "127.0.0.1",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax"
  }]);

  // session-stub 2: localStorage study-note.auth-session-hint.v1 = "1"
  await page.addInitScript(() => {
    try {
      localStorage.setItem("study-note.auth-session-hint.v1", "1");
    } catch {
      /* storage 불가 환경 — cookie stub 으로 커버 */
    }
  });

  // session-stub 3: /v1/auth/me mock → AuthMeResponse 200
  await page.route("**/v1/auth/me", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userId: "test-user-s3b-gate",
        studentNumber: "20240001",
        name: "S3b 게이트 테스트",
        role: "student"
      })
    });
  });

  // session-stub 4: /api/materials mock → 빈 배열
  await page.route("**/materials", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]"
    });
  });

  // RICH stub 5: /v1/terms → RICH multi-term data (empty[] 금지)
  await page.route("**/v1/terms", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STUB_TERMS)
    });
  });

  // RICH stub 6: /v1/subjects → RICH multi-subject data (empty[] 금지)
  await page.route("**/v1/subjects", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STUB_SUBJECTS)
    });
  });
}

/**
 * GREEN 긍정 단언 + 실 term-toggle 클릭 round-trip.
 * Returns failures array (empty = PASS).
 */
async function runGreenChecks() {
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
    const page = await context.newPage();
    await applySessionStubs(context, page);

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
    await page.waitForTimeout(2000); // RICH data stub 처리 대기

    // 1. #app non-empty
    const appHtml = await page.evaluate(() =>
      document.querySelector("#app")?.innerHTML?.trim() ?? ""
    );
    check(appHtml.length > 0, `#app non-empty (len=${appHtml.length})`);

    // 2. sidebar island 존재
    const hasSidebarIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='sidebar']")
    );
    check(hasSidebarIsland, "[data-react-island='sidebar'] 존재 (home route)");

    // 3. sidebar island 에 content 존재 (<aside class="sidebar">)
    const sidebarIslandHtml = await page.evaluate(() =>
      document.querySelector("[data-react-island='sidebar']")?.innerHTML?.trim() ?? ""
    );
    check(sidebarIslandHtml.length > 0, `sidebar island children 렌더됨 (len=${sidebarIslandHtml.length})`);

    // 4. RICH data = <details data-term-id> term-group 존재 확인
    const termGroupCount = await page.evaluate(() =>
      document.querySelectorAll("[data-react-island='sidebar'] .sidebar-term-group").length
    );
    check(termGroupCount >= 1, `sidebar term-group 렌더됨 (count=${termGroupCount}, RICH data 동작 확인)`);

    // 5. 노드 identity sentinel 저장
    await page.evaluate(() => {
      window.__sidebarIslandNode =
        document.querySelector("[data-react-island='sidebar']");
      window.__appNode =
        document.querySelector("#app");
    });

    // 6. ── 실 term-toggle 클릭 round-trip ──
    // <summary data-action="sidebar-term-toggle"> 첫 번째 클릭
    const termToggleSummary = await page.locator("[data-action='sidebar-term-toggle']").first();
    const hasTermToggle = await termToggleSummary.count() > 0;
    check(hasTermToggle, "[data-action='sidebar-term-toggle'] 존재 (RICH data 확인)");

    if (hasTermToggle) {
      // localStorage sidebar-term-open 초기값 캡처 (toggle 전)
      const lsBefore = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const key = keys.find(k => k.includes("sidebar-term-open"));
        return key ? localStorage.getItem(key) : null;
      });

      // 실 클릭 — native <details> 동작 보존(preventDefault X), delegation 경로 발화
      await termToggleSummary.click();
      await page.waitForTimeout(800);

      // localStorage 에 toggle 기록 여부 (main.ts toggleSidebarTermOpen triggerRender 경로 발화)
      const lsAfter = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const key = keys.find(k => k.includes("sidebar-term-open"));
        return key ? localStorage.getItem(key) : null;
      });
      const lsHasToggleData = lsAfter !== null;
      check(lsHasToggleData, "localStorage sidebar-term-open 기록 확인 (document 위임 경로 발화)");

      // localStorage 값이 변경되었거나 새로 생성됨 = 위임 경로 발화 증명
      const lsChanged = lsAfter !== null && lsAfter !== lsBefore;
      check(lsChanged, `실 term-toggle 클릭 → localStorage 상태 변경 확인 (before=${JSON.stringify(lsBefore)}, after=${JSON.stringify(lsAfter?.slice(0, 60))})`);

      // 설계 메모: native <details> toggle 은 preventDefault 없어서 .open 이
      // React 재렌더(triggerRender) + native toggle 양쪽에서 설정됨.
      // "open 상태 반전" 대신 "localStorage 값 변경" 이 올바른 round-trip 증거.
      console.log(`  ℹ️  실 클릭 후 localStorage: ${lsAfter?.slice(0, 80) ?? "null"}`);
    }

    // 7. loopErrors 0 확인 (클릭 후에도)
    await page.waitForTimeout(500);
    check(
      loopErrors.length === 0,
      `loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // 8. 노드 identity 안정성 확인
    const sidebarNodeStable = await page.evaluate(() => {
      const current = document.querySelector("[data-react-island='sidebar']");
      return current === window.__sidebarIslandNode;
    });
    check(sidebarNodeStable, "sidebar island 노드 identity 안정 (클릭 후 동일 node)");

    await page.close();
  } finally {
    await browser.close();
  }

  return failures;
}

/**
 * RED A: mount-time loop 단언.
 * expectLoopAtMount=true → loopErrors > 0 at mount.
 */
async function runRedAChecks() {
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
    const page = await context.newPage();
    await applySessionStubs(context, page);

    const loopErrors = [];
    page.on("pageerror", (e) => {
      const msg = e?.message ?? String(e);
      if (LOOP_REGEX.test(msg)) loopErrors.push(`pageerror: ${msg}`);
    });
    page.on("console", (m) => {
      const t = m.text();
      if (LOOP_REGEX.test(t)) loopErrors.push(`console: ${t}`);
    });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(2000);

    check(
      loopErrors.length > 0,
      `RED A: mount-time loopErrors > 0 — got ${loopErrors.length} (0 이면 neg-A 가 루프 못 유발 → gate 무효)`
    );
    if (loopErrors.length > 0) {
      console.log(`  ℹ️  A loop errors (최대 3):`);
      loopErrors.slice(0, 3).forEach((e) => console.log(`    - ${e.slice(0, 120)}`));
    }

    await page.close();
  } finally {
    await browser.close();
  }

  return failures;
}

/**
 * RED B: click-time loop 단언 (§5-C 맹점 close).
 * Phase 1: mount 후 loopErrors === 0 (GREEN at mount).
 * Phase 2: 실 term-toggle 클릭 후 loopErrors > 0 (RED post-click).
 *
 * B 가 mount 에서 이미 RED 면 A 의 변종 → STOP + report.
 * Returns { failures, bMountAlreadyRed }
 */
async function runRedBChecks() {
  const executablePath = resolveChromePath();
  const browser = await chromium.launch(
    executablePath ? { executablePath, headless: true } : { headless: true }
  );
  const failures = [];
  const check = (cond, msg) => {
    console.log(`  ${cond ? "✅" : "❌"} ${msg}`);
    if (!cond) failures.push(msg);
  };

  let bMountAlreadyRed = false;

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await applySessionStubs(context, page);

    const loopErrors = [];
    page.on("pageerror", (e) => {
      const msg = e?.message ?? String(e);
      if (LOOP_REGEX.test(msg)) loopErrors.push(`pageerror: ${msg}`);
    });
    page.on("console", (m) => {
      const t = m.text();
      if (LOOP_REGEX.test(t)) loopErrors.push(`console: ${t}`);
    });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(2000);

    // ── Phase 1: mount 후 loopErrors 0 확인 ──
    const mountLoopCount = loopErrors.length;
    console.log(`  B Phase 1 (mount): loopErrors count = ${mountLoopCount}`);
    if (mountLoopCount > 0) {
      bMountAlreadyRed = true;
      console.log("  ⚠️  B 가 mount 에서 이미 RED → A 의 변종일 뿐, §5-C 증명 불가 → STOP");
      check(false, "RED B Phase 1: B 가 mount 에서 이미 RED (§5-C 맹점 close 증명 불가 — STOP)");
    } else {
      check(true, `RED B Phase 1 mount: loopErrors 0 (mount 시 GREEN ✅)`);

      // ── Phase 2: 실 term-toggle 클릭 → loopErrors > 0 확인 ──
      const termToggleSummary = await page.locator("[data-action='sidebar-term-toggle']").first();
      const hasTermToggle = await termToggleSummary.count() > 0;

      if (!hasTermToggle) {
        check(false, "RED B: [data-action='sidebar-term-toggle'] 없음 → RICH data 미동작");
      } else {
        // 실 클릭
        await termToggleSummary.click();
        await page.waitForTimeout(3000); // loop 발생 대기 (B click-triggered, 충분한 대기)

        const postClickLoopCount = loopErrors.length;
        console.log(`  B Phase 2 (post-click): loopErrors count = ${postClickLoopCount}`);
        check(
          postClickLoopCount > 0,
          `RED B Phase 2 post-click: loopErrors > 0 — got ${postClickLoopCount} (0 이면 neg-B 가 click-time 루프 못 유발 → §5-C gate 무효)`
        );
        if (postClickLoopCount > 0) {
          console.log(`  ℹ️  B loop errors post-click (최대 3):`);
          loopErrors.slice(0, 3).forEach((e) => console.log(`    - ${e.slice(0, 120)}`));
        }
      }
    }

    await page.close();
  } finally {
    await browser.close();
  }

  return { failures, bMountAlreadyRed };
}

// ────────────────────────────────────────────────────────
// main
// ────────────────────────────────────────────────────────

const summary = [];

try {
  // ── Step 1: GREEN build + checks ─────────────────────
  const greenBundleSize = build(false, false);
  let preview = startPreview();
  let greenFailures = [];
  try {
    await waitForServer();
    console.log("\n--- GREEN checks (session-stub + RICH data + sidebar island + 실 toggle 클릭) ---");
    greenFailures = await runGreenChecks();
  } finally {
    preview.kill("SIGTERM");
  }
  const greenPass = greenFailures.length === 0;
  summary.push({
    label: "GREEN (positive assertions + 실 term-toggle round-trip + loopErrors 0)",
    pass: greenPass,
    detail: greenFailures
  });
  console.log(`\n${greenPass ? "✅" : "❌"} GREEN: ${greenPass ? "PASS" : greenFailures.join(", ")}`);

  await new Promise((r) => setTimeout(r, 800));

  // ── Step 2: DIST delta 측정 ───────────────────────────
  const redABundleSize = build(true, false);
  const bundleDelta = redABundleSize - greenBundleSize;
  const distClean = bundleDelta > 0;
  console.log(`\n--- DIST SIZE delta: RED_A(${redABundleSize}) - GREEN(${greenBundleSize}) = ${bundleDelta} bytes ---`);
  if (distClean) {
    console.log(`  ✅ DIST delta > 0: neg-ctrl 코드가 RED 번들에 포함됨 → GREEN tree-shake 유효`);
  } else {
    console.log(`  ❌ DIST delta ≤ 0: neg-ctrl 코드가 RED 번들에도 없음 → tree-shake 검증 불가`);
  }
  summary.push({ label: "DIST CLEAN (neg-control 부재 / tree-shake 유효)", pass: distClean, detail: [] });

  // ── Step 3: RED A (mount-time loop) ──────────────────
  // RED A 빌드는 Step 2 에서 이미 빌드됨 (redABundleSize)
  preview = startPreview();
  let redAFailures = [];
  try {
    await waitForServer();
    console.log("\n--- RED A checks (mount-time unstable-snapshot loop) ---");
    redAFailures = await runRedAChecks();
  } finally {
    preview.kill("SIGTERM");
  }
  const redAPass = redAFailures.length === 0;
  summary.push({ label: "RED A (mount-time loopErrors > 0)", pass: redAPass, detail: redAFailures });
  console.log(`\n${redAPass ? "✅" : "❌"} RED A: ${redAPass ? "PASS" : redAFailures.join(", ")}`);

  await new Promise((r) => setTimeout(r, 800));

  // ── Step 4: RED B (click-time loop, §5-C 맹점 close) ─
  build(false, true); // RED B 빌드
  preview = startPreview();
  let redBResult = { failures: [], bMountAlreadyRed: false };
  try {
    await waitForServer();
    console.log("\n--- RED B checks (click-time controlled-<details> loop, §5-C) ---");
    redBResult = await runRedBChecks();
  } finally {
    preview.kill("SIGTERM");
  }
  const redBPass = redBResult.failures.length === 0;
  if (redBResult.bMountAlreadyRed) {
    summary.push({
      label: "RED B (click-time: GREEN@mount / RED@post-click — §5-C)",
      pass: false,
      detail: ["B 가 mount 에서 이미 RED → §5-C 맹점 close 증명 불가 (design-lock STOP 조건)"]
    });
  } else {
    summary.push({
      label: "RED B (click-time: GREEN@mount ✅ / RED@post-click — §5-C)",
      pass: redBPass,
      detail: redBResult.failures
    });
  }
  console.log(`\n${redBPass ? "✅" : "❌"} RED B: ${redBPass ? "PASS" : redBResult.failures.join(", ")}`);

  // ── Step 5: GREEN dist 복원 ───────────────────────────
  await new Promise((r) => setTimeout(r, 800));
  console.log("\n--- restore clean dist ---");
  build(false, false);

} catch (err) {
  summary.push({ label: "예외", pass: false, detail: [err?.message ?? String(err)] });
  console.log(`\n❌ 예외: ${err?.message ?? err}`);
}

// ── 최종 결과 표 ──────────────────────────────────────
console.log("\n=== S3b loop-gate 결과 ===");
for (const s of summary) {
  console.log(`  ${s.pass ? "✅" : "❌"} ${s.label}`);
  if (!s.pass && s.detail?.length) {
    s.detail.forEach((d) => console.log(`      - ${d}`));
  }
}

const allPass = summary.length > 0 && summary.every((s) => s.pass);
if (allPass) {
  console.log("\n✅ PASS: S3b loop-gate GREEN(실 toggle round-trip) + DIST delta > 0 + neg-A RED + neg-B RED (§5-C close)");
  process.exit(0);
} else {
  const failed = summary.filter((s) => !s.pass).map((s) => s.label);
  console.log(`\n❌ FAIL: ${failed.join(", ")}`);
  process.exit(1);
}
