/**
 * playwright-s4c-pdf-workspaces-loop.mjs — S4c pdf-workspaces React island 무한루프 면역 prod-build 게이트.
 *
 * session-stub(addInitScript localStorage hint seed + page.route /v1/auth/me mock +
 * study_note_session_hint cookie + /v1/terms + /v1/subjects + /api/materials mock) 으로
 * renderApp auth early-return 통과 후 pdf-workspaces island mount 를 검증한다.
 * sampleLectureNote fallback(localStorage 빈 키) 으로 digital-engineering RICH subjects.
 * /api/materials mock 으로 digital-engineering(2개) + information-communication(1개) 에
 * 실제 자료 시드 — c-language/computer-introduction = 0개 자료.
 * → totalMaterials=3, activeSubjects=2, totalSubjects=4 (non-trivial).
 *
 * 직렬 실행:
 *   1. build(GREEN) → preview → session-stub →
 *      GREEN: pdf-workspaces island 긍정 단언
 *             (h1='수업자료 찾기' 존재, .pdf-subject-section ≥1, .pdf-material-card ≥1)
 *             + summary metric 비공허 단언(totalMaterials=3, activeSubjects=2/4)
 *             + round-trip(pdf-workspaces→home→pdf-workspaces) + DIST delta > 0
 *   2. FOCUS-PRES: N/A — 이 뷰에는 포커스 보존 대상 stateful input 이 없다.
 *      (file input 의 value 는 프로그래밍으로 설정 불가 → uncontrolled-across-rerender 함정 없음)
 *   3. build(RED A: S4C_LOOP_NEG_CTRL_A=1) → preview → pdf-workspaces route → mount-time loopErrors > 0
 *   4. build(RED B: S4C_LOOP_NEG_CTRL_B=1) → preview → pdf-workspaces route →
 *      mount 시 GREEN(loopErrors 0) + open-pdf-material 버튼 클릭 후 loopErrors > 0 (§5-C)
 *   5. build(GREEN) 복원
 *
 * exit 0 = PASS (GREEN + DIST delta > 0 + A RED + B RED)
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
const PORT = 4180; // S4c — S3=4320, S3b=4321, S4a=4322, S4b-1=4323, S4b-2=4179 → S4c=4180
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
 * pnpm build 실행. dist/assets 를 먼저 삭제해 이전 빌드 파일 오염 방지.
 * negA=true → S4C_LOOP_NEG_CTRL_A=1 (mount-time loop RED).
 * negB=true → S4C_LOOP_NEG_CTRL_B=1 (click-time loop RED).
 * 메인 entry JS 크기 반환(bytes).
 */
function build(negA, negB) {
  const label = negA ? "RED/A(mount-loop)" : negB ? "RED/B(click-loop)" : "GREEN";
  console.log(`\n--- build(${label}) ---`);
  spawnSync("rm", ["-rf", resolve(WEB_ROOT, "dist", "assets")], { stdio: "ignore" });
  const result = spawnSync("pnpm", ["build"], {
    cwd: WEB_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      AUTH_LOOP_NEG_CTRL: "0",
      S3_LOOP_NEG_CTRL: "0",
      S3B_LOOP_NEG_CTRL_A: "0",
      S3B_LOOP_NEG_CTRL_B: "0",
      S4A_LOOP_NEG_CTRL_A: "0",
      S4A_LOOP_NEG_CTRL_B: "0",
      S4B_LOOP_NEG_CTRL_A: "0",
      S4B_LOOP_NEG_CTRL_B: "0",
      S4B2_LOOP_NEG_CTRL_A: "0",
      S4B2_LOOP_NEG_CTRL_B: "0",
      S4C_LOOP_NEG_CTRL_A: negA ? "1" : "0",
      S4C_LOOP_NEG_CTRL_B: negB ? "1" : "0"
    }
  });
  if (result.status !== 0) {
    throw new Error(`pnpm build failed (exit ${result.status})`);
  }
  const assetsDir = resolve(WEB_ROOT, "dist", "assets");
  try {
    const files = readdirSync(assetsDir).filter((f) => /^main-.+\.js$/.test(f));
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

// RICH stub data — sampleLectureNote 의 실제 subject IDs 에 맞춘 자료 시드.
// digital-engineering 2개 + information-communication 1개 = totalMaterials=3
// c-language / computer-introduction = 0개 → activeSubjects=2, totalSubjects=4
const STUB_MATERIALS = [
  {
    id: "mat-001",
    ownerId: "admin-user",
    uploaderId: "admin-user",
    subjectId: "digital-engineering",
    classDate: "2025-04-30",
    fileName: "digital-engineering-week1.pdf",
    fileSize: 1200000,
    pageCount: 20,
    contentType: "application/pdf",
    uploadStatus: "uploaded",
    createdAt: "2025-04-30T10:00:00Z",
    updatedAt: "2025-04-30T10:00:00Z"
  },
  {
    id: "mat-002",
    ownerId: "admin-user",
    uploaderId: "admin-user",
    subjectId: "digital-engineering",
    classDate: "2025-05-07",
    fileName: "digital-engineering-week2.pdf",
    fileSize: 980000,
    pageCount: 18,
    contentType: "application/pdf",
    uploadStatus: "uploaded",
    createdAt: "2025-05-07T10:00:00Z",
    updatedAt: "2025-05-07T10:00:00Z"
  },
  {
    id: "mat-003",
    ownerId: "admin-user",
    uploaderId: "admin-user",
    subjectId: "information-communication",
    classDate: "2025-05-01",
    fileName: "info-comm-week1.pdf",
    fileSize: 1500000,
    pageCount: 25,
    contentType: "application/pdf",
    uploadStatus: "uploaded",
    createdAt: "2025-05-01T10:00:00Z",
    updatedAt: "2025-05-01T10:00:00Z"
  }
];

/**
 * context 에 공통 session-stub + RICH data mock 적용.
 * sampleLectureNote fallback 의존 — localStorage 를 비워
 * loadStoredNotebook(userId) 가 sampleLectureNote 를 반환하게 한다.
 * /api/materials mock 으로 2개 subject 에 자료 시드.
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

  // session-stub 2: localStorage auth hint
  await page.addInitScript(() => {
    try {
      localStorage.setItem("study-note.auth-session-hint.v1", "1");
    } catch {
      /* storage 불가 환경 */
    }
  });

  // session-stub 3: /v1/auth/me mock → AuthMeResponse 200
  await page.route("**/v1/auth/me", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userId: "test-user-s4c-gate",
        studentNumber: "20240002",
        name: "S4c 게이트 테스트",
        role: "student"
      })
    });
  });

  // RICH stub 4: /api/materials mock → RICH multi-subject materials
  // digitalEngineering(2) + informationCommunication(1) + others(0)
  await page.route("**/materials", (route) => {
    // 업로드 intent POST /materials/upload-intent 는 해당 안 함 (GET /materials 만)
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ materials: STUB_MATERIALS })
    });
  });

  // stub 5: /v1/terms mock (필요 시)
  await page.route("**/v1/terms", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "t1", grade: 1, semester: 1, title: "1학기", startDate: "2025-03-01", endDate: "2025-08-31" }
      ])
    });
  });

  // stub 6: /v1/subjects mock
  await page.route("**/v1/subjects", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "digital-engineering", title: "디지털공학개론", termId: "t1" },
        { id: "information-communication", title: "정보통신공학", termId: "t1" }
      ])
    });
  });
}

/**
 * island 내부 텍스트에 기대 문자열이 포함되는지 확인.
 * island-scoped 검사 — vacuous pass 방지.
 */
async function islandContains(page, islandSelector, text) {
  return page.evaluate(
    ([selector, search]) => {
      const el = document.querySelector(selector);
      return el ? el.textContent?.includes(search) ?? false : false;
    },
    [islandSelector, text]
  );
}

const ISLAND_SEL = "[data-react-island='pdf-workspaces']";
const PDF_WORKSPACES_ROUTE = `${BASE}/#/pdf-workspaces`;
const HOME_ROUTE = `${BASE}/#/`;

/**
 * GREEN 긍정 단언 + summary metric 비공허 + round-trip.
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

    // ── GREEN AC1: pdf-workspaces route ────────────────────────────────────────
    console.log("\n  [GREEN AC1] pdf-workspaces route");
    await page.goto(PDF_WORKSPACES_ROUTE, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(2000);

    const hasIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='pdf-workspaces']")
    );
    check(hasIsland, "[data-react-island='pdf-workspaces'] 존재");

    // island 내부 콘텐츠 — h1 '수업자료 찾기'
    const hasH1 = await islandContains(page, ISLAND_SEL, "수업자료 찾기");
    check(hasH1, "island 내부에 '수업자료 찾기' h1 포함");

    // island 내부 콘텐츠 — .pdf-subject-section ≥1
    const sectionCount = await page.evaluate(() =>
      (document.querySelector("[data-react-island='pdf-workspaces']")
        ?.querySelectorAll(".pdf-subject-section").length) ?? 0
    );
    check(sectionCount >= 1, `island 내부에 .pdf-subject-section ≥1 — got ${sectionCount}`);

    // island 내부 콘텐츠 — .pdf-material-card ≥1 (NON-VACUOUS: materials seeded)
    const cardCount = await page.evaluate(() =>
      (document.querySelector("[data-react-island='pdf-workspaces']")
        ?.querySelectorAll(".pdf-material-card").length) ?? 0
    );
    check(cardCount >= 1, `island 내부에 .pdf-material-card ≥1 — got ${cardCount} (RICH stub 기대: 3장)`);

    // ── summary metric 비공허 단언 ──────────────────────────────────────────────
    // totalMaterials=3 → "3개" 포함, activeSubjects/totalSubjects → "2/4" 포함
    const hasTotal = await islandContains(page, ISLAND_SEL, "3개");
    check(hasTotal, "summary metric '3개' (totalMaterials=3) 존재 — RICH stub 검증");

    const hasRatio = await islandContains(page, ISLAND_SEL, "2/4");
    check(hasRatio, "summary metric '2/4' (activeSubjects/totalSubjects) 존재 — mixed fixture 검증");

    check(loopErrors.length === 0,
      `pdf-workspaces route loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // ── GREEN round-trip: pdf-workspaces → home → pdf-workspaces ───────────────
    console.log("\n  [GREEN round-trip] pdf-workspaces → home → pdf-workspaces");
    await page.evaluate(() => { window.location.hash = "#/"; });
    await page.waitForTimeout(2000);

    // home route: pdf-workspaces island 없어야 함
    const hasIslandHome = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='pdf-workspaces']")
    );
    check(!hasIslandHome, "home route: pdf-workspaces island 미존재 (slot null signal)");

    await page.evaluate(() => { window.location.hash = "#/pdf-workspaces"; });
    await page.waitForTimeout(2000);

    const hasIslandBack = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='pdf-workspaces']")
    );
    check(hasIslandBack, "round-trip 후 pdf-workspaces island 재존재");
    check(loopErrors.length === 0,
      `round-trip 후 loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    await page.close();
  } finally {
    await browser.close();
  }

  return failures;
}

/**
 * RED A: mount-time loop 단언.
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

    await page.goto(PDF_WORKSPACES_ROUTE, { waitUntil: "networkidle", timeout: 25_000 });
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
 * Phase 1: pdf-workspaces route 마운트 후 loopErrors === 0.
 * Phase 2: open-pdf-material 버튼 클릭 후 loopErrors > 0.
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

    await page.goto(PDF_WORKSPACES_ROUTE, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(2000);

    const mountLoopCount = loopErrors.length;
    console.log(`  B Phase 1 (mount): loopErrors count = ${mountLoopCount}`);
    if (mountLoopCount > 0) {
      bMountAlreadyRed = true;
      console.log("  ⚠️  B 가 mount 에서 이미 RED → A 의 변종일 뿐, §5-C 증명 불가 → STOP");
      check(false, "RED B Phase 1: B 가 mount 에서 이미 RED (§5-C 맹점 close 증명 불가 — STOP)");
    } else {
      check(true, `RED B Phase 1 mount: loopErrors 0 (mount 시 GREEN ✅)`);

      // open-pdf-material 버튼 클릭 (neg-B flag 활성화)
      const openBtn = page.locator("[data-action='open-pdf-material']").first();
      const hasBtn = (await openBtn.count()) > 0;

      if (!hasBtn) {
        check(false, "RED B: [data-action='open-pdf-material'] 버튼 없음 → RICH stub 자료 미마운트");
      } else {
        await openBtn.click();
        await page.waitForTimeout(3000);

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
    console.log("\n--- GREEN checks (session-stub + sampleLectureNote fallback + RICH materials + pdf-workspaces island + round-trip) ---");
    greenFailures = await runGreenChecks();
  } finally {
    preview.kill("SIGTERM");
  }
  const greenPass = greenFailures.length === 0;
  summary.push({
    label: "GREEN (pdf-workspaces island 긍정 단언 + summary metric 비공허 + round-trip + loopErrors 0)",
    pass: greenPass,
    detail: greenFailures
  });
  console.log(`\n${greenPass ? "✅" : "❌"} GREEN: ${greenPass ? "PASS" : greenFailures.join(", ")}`);

  // FOCUS-PRES: N/A — 이 뷰에는 포커스 보존 대상 stateful input 이 없다.
  // file input 의 value 는 프로그래밍으로 설정 불가 → uncontrolled-across-rerender 함정 없음.
  // 따라서 FOCUS-PRES assertion 은 구조적으로 불필요하며 의도적으로 생략한다.
  console.log("\n  [FOCUS-PRES] N/A — 이 뷰의 file input 은 value 설정 불가. FOCUS-PRES 테스트 생략 (구조적으로 불필요).");
  summary.push({
    label: "FOCUS-PRES (N/A — file input value 불가설정, uncontrolled-rerender 함정 구조적 불재)",
    pass: true,
    detail: []
  });

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
  preview = startPreview();
  let redAFailures = [];
  try {
    await waitForServer();
    console.log("\n--- RED A checks (mount-time unstable-snapshot loop at pdf-workspaces route) ---");
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
    console.log("\n--- RED B checks (click-time open-pdf-material 버튼 클릭 loop, §5-C) ---");
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
console.log("\n=== S4c pdf-workspaces loop-gate 결과 ===");
for (const s of summary) {
  console.log(`  ${s.pass ? "✅" : "❌"} ${s.label}`);
  if (!s.pass && s.detail?.length) {
    s.detail.forEach((d) => console.log(`      - ${d}`));
  }
}

const allPass = summary.length > 0 && summary.every((s) => s.pass);
if (allPass) {
  console.log("\n✅ PASS: S4c pdf-workspaces loop-gate GREEN(island round-trip + RICH metric) + FOCUS-PRES N/A + DIST delta > 0 + neg-A RED + neg-B RED (§5-C close)");
  process.exit(0);
} else {
  const failed = summary.filter((s) => !s.pass).map((s) => s.label);
  console.log(`\n❌ FAIL: ${failed.join(", ")}`);
  process.exit(1);
}
