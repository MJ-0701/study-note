/**
 * playwright-s4a-subject-loop.mjs — S4a subject-views React island 무한루프 면역 prod-build 게이트.
 *
 * session-stub(addInitScript localStorage hint seed + page.route /v1/auth/me mock +
 * study_note_session_hint cookie + /v1/terms + /v1/subjects RICH 데이터) 으로
 * renderApp auth early-return 통과 후 4개 subject island mount 를 검증한다.
 * sampleLectureNote fallback(localStorage 빈 키) 으로 digital-engineering 4 rich subjects.
 *
 * 직렬 실행:
 *   1. build(GREEN) → preview → session-stub →
 *      GREEN ×4: summaries/summary-detail/mcp/memorize island 긍정 단언 + loopErrors 0
 *      + summaries round-trip (summaries→mcp→summaries, re-fires setSubjectSummariesProps)
 *      + DIST delta > 0
 *   2. build(RED A: S4A_LOOP_NEG_CTRL_A=1) → preview → summaries route → mount-time loopErrors > 0
 *   3. build(RED B: S4A_LOOP_NEG_CTRL_B=1) → preview → summaries route →
 *      mount 시 GREEN(loopErrors 0) + generate-subject-note 클릭 후 loopErrors > 0 (§5-C)
 *   4. build(GREEN) 복원
 *
 * exit 0 = PASS (GREEN ×4 + DIST delta > 0 + A RED + B RED)
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
const PORT = 4322; // S3=4320, S3b=4321 — 포트 충돌 방지
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
 * negA=true → S4A_LOOP_NEG_CTRL_A=1 (mount-time loop RED).
 * negB=true → S4A_LOOP_NEG_CTRL_B=1 (click-time loop RED).
 * 메인 entry JS 크기 반환(bytes).
 */
function build(negA, negB) {
  const label = negA ? "RED/A(mount-loop)" : negB ? "RED/B(click-loop)" : "GREEN";
  console.log(`\n--- build(${label}) ---`);
  // 이전 빌드 파일이 dist/assets 에 남아 크기 집계를 오염시키지 않게 clean.
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
      S4A_LOOP_NEG_CTRL_A: negA ? "1" : "0",
      S4A_LOOP_NEG_CTRL_B: negB ? "1" : "0"
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
 * digital-engineering sampleLectureNote fallback 의존 — localStorage 를 비워
 * loadStoredNotebook(userId) 가 sampleLectureNote 를 반환하게 한다.
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

  // session-stub 2: localStorage auth hint (notebook key 는 설정 안 함 → sampleLectureNote fallback)
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
        userId: "test-user-s4a-gate",
        studentNumber: "20240001",
        name: "S4a 게이트 테스트",
        role: "student"
      })
    });
  });

  // session-stub 4: /api/materials mock → { materials: [] }
  // listPdfMaterials 가 payload.materials 를 반환하므로 raw [] 가 아닌 envelope 필요.
  // raw [] 면 payload.materials===undefined → restore .filter() TypeError(catch 되지만
  // 게이트가 caught error 경로를 타게 됨, codex Gate6 cross finding).
  await page.route("**/materials", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ materials: [] })
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
 * island 내부 텍스트에 기대 문자열이 포함되는지 확인.
 * island-scoped 검사 — page-wide textContent 는 shell chrome 에서 vacuous pass 가능.
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

/**
 * GREEN 긍정 단언 ×4 + summaries round-trip.
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

    // ── GREEN 1: subject-summaries route ──────────────────────────────────────
    console.log("\n  [GREEN 1] subject-summaries route");
    await page.goto(`${BASE}/#/subjects/digital-engineering/summaries`, {
      waitUntil: "networkidle",
      timeout: 25_000
    });
    await page.waitForTimeout(2000);

    const hasSummariesIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-summaries']")
    );
    check(hasSummariesIsland, "[data-react-island='subject-summaries'] 존재 (summaries route)");

    // island 내부 콘텐츠 확인 — "진법과 코드" 는 de-week-08.title (sampleLectureNote)
    const summariesHasTitle = await islandContains(
      page,
      "[data-react-island='subject-summaries']",
      "진법과 코드"
    );
    check(summariesHasTitle, "subject-summaries island 내부에 '진법과 코드' 포함 (sampleLectureNote RICH data)");

    // loopErrors 0
    check(
      loopErrors.length === 0,
      `GREEN 1 loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // 노드 identity 안정 — 마운트 직후 저장, 2초 후 동일 노드 확인
    await page.evaluate(() => {
      window.__summariesIslandNode =
        document.querySelector("[data-react-island='subject-summaries']");
    });
    await page.waitForTimeout(500);
    const summariesNodeStable = await page.evaluate(() => {
      const current = document.querySelector("[data-react-island='subject-summaries']");
      return current === window.__summariesIslandNode;
    });
    check(summariesNodeStable, "subject-summaries island 노드 identity 안정 (마운트 후 동일 node)");

    // ── summaries round-trip: summaries → mcp → summaries ────────────────────
    // in-page hash 변경 = hashchange 발화. goto 는 동일 origin fragment nav 에서 신뢰 불가.
    console.log("\n  [GREEN 1b] summaries → mcp → back round-trip (value-eq guard re-fire)");
    await page.evaluate(() => { window.location.hash = "#/subjects/digital-engineering/mcp"; });
    await page.waitForTimeout(2000);
    await page.evaluate(() => { window.location.hash = "#/subjects/digital-engineering/summaries"; });
    await page.waitForTimeout(2000);

    const summariesBackIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-summaries']")
    );
    check(summariesBackIsland, "round-trip 후 subject-summaries island 재존재");
    check(
      loopErrors.length === 0,
      `round-trip 후 loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // ── GREEN 2: subject-summary-detail route ─────────────────────────────────
    console.log("\n  [GREEN 2] subject-summary-detail route (de-week-08)");
    await page.evaluate(() => {
      window.location.hash = "#/subjects/digital-engineering/summaries/de-week-08";
    });
    await page.waitForTimeout(2000);

    const hasSummaryDetailIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-summary-detail']")
    );
    check(hasSummaryDetailIsland, "[data-react-island='subject-summary-detail'] 존재 (summary-detail route)");

    // "진법과 코드 요약" — SubjectSummaryDetailView h1={weekTitle} 요약 (weekTitle="진법과 코드")
    const detailHasTitle = await islandContains(
      page,
      "[data-react-island='subject-summary-detail']",
      "진법과 코드"
    );
    check(detailHasTitle, "subject-summary-detail island 내부에 '진법과 코드' 포함 (de-week-08.title)");

    // NOTE: quickNote panel is null here (runtime-only, default undefined) — 정상.
    check(
      loopErrors.length === 0,
      `GREEN 2 loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // ── GREEN 3: subject-mcp route ────────────────────────────────────────────
    console.log("\n  [GREEN 3] subject-mcp route");
    await page.evaluate(() => {
      window.location.hash = "#/subjects/digital-engineering/mcp";
    });
    await page.waitForTimeout(2000);

    const hasMcpIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-mcp']")
    );
    check(hasMcpIsland, "[data-react-island='subject-mcp'] 존재 (mcp route)");

    // "디지털공학개론 MCP 호출" — SubjectMcpView h1
    const mcpHasTitle = await islandContains(
      page,
      "[data-react-island='subject-mcp']",
      "디지털공학개론 MCP 호출"
    );
    check(mcpHasTitle, "subject-mcp island 내부에 '디지털공학개론 MCP 호출' 포함");

    check(
      loopErrors.length === 0,
      `GREEN 3 loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // ── GREEN 4: subject-memorize route ───────────────────────────────────────
    console.log("\n  [GREEN 4] subject-memorize route");
    await page.evaluate(() => {
      window.location.hash = "#/subjects/digital-engineering/memorize";
    });
    await page.waitForTimeout(2000);

    const hasMemorizeIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-memorize']")
    );
    check(hasMemorizeIsland, "[data-react-island='subject-memorize'] 존재 (memorize route)");

    // "진법 변환" — digitalEngineering.concepts[0].title (mustKnowConcepts 에 포함, ConceptRow 렌더)
    const memorizeHasConcept = await islandContains(
      page,
      "[data-react-island='subject-memorize']",
      "진법 변환"
    );
    check(memorizeHasConcept, "subject-memorize island 내부에 '진법 변환' 포함 (mustKnowConcepts)");

    check(
      loopErrors.length === 0,
      `GREEN 4 loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    await page.close();
  } finally {
    await browser.close();
  }

  return failures;
}

/**
 * RED A: mount-time loop 단언.
 * summaries route 에서 마운트 시 loopErrors > 0.
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

    // summaries route 에서 마운트 — neg-A 는 summaries portal 에 연결됨.
    await page.goto(`${BASE}/#/subjects/digital-engineering/summaries`, {
      waitUntil: "networkidle",
      timeout: 25_000
    });
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
 * Phase 1: summaries route 마운트 후 loopErrors === 0 (GREEN at mount).
 * Phase 2: generate-subject-note 클릭 후 loopErrors > 0 (RED post-click).
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

    // summaries route 에서 마운트 — neg-B 는 summaries portal 에 연결됨.
    await page.goto(`${BASE}/#/subjects/digital-engineering/summaries`, {
      waitUntil: "networkidle",
      timeout: 25_000
    });
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

      // ── Phase 2: generate-subject-note 클릭 → loopErrors > 0 확인 ──
      const genNoteBtn = await page.locator("[data-action='generate-subject-note']").first();
      const hasGenNote = await genNoteBtn.count() > 0;

      if (!hasGenNote) {
        check(false, "RED B: [data-action='generate-subject-note'] 없음 → summaries island 미마운트");
      } else {
        // 실 클릭
        await genNoteBtn.click();
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
    console.log("\n--- GREEN checks (session-stub + sampleLectureNote fallback + 4 island + round-trip) ---");
    greenFailures = await runGreenChecks();
  } finally {
    preview.kill("SIGTERM");
  }
  const greenPass = greenFailures.length === 0;
  summary.push({
    label: "GREEN (4 island 긍정 단언 + summaries round-trip + loopErrors 0)",
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
    console.log("\n--- RED A checks (mount-time unstable-snapshot loop at summaries route) ---");
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
    console.log("\n--- RED B checks (click-time generate-subject-note loop, §5-C) ---");
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
console.log("\n=== S4a loop-gate 결과 ===");
for (const s of summary) {
  console.log(`  ${s.pass ? "✅" : "❌"} ${s.label}`);
  if (!s.pass && s.detail?.length) {
    s.detail.forEach((d) => console.log(`      - ${d}`));
  }
}

const allPass = summary.length > 0 && summary.every((s) => s.pass);
if (allPass) {
  console.log("\n✅ PASS: S4a loop-gate GREEN(4 island round-trip) + DIST delta > 0 + neg-A RED + neg-B RED (§5-C close)");
  process.exit(0);
} else {
  const failed = summary.filter((s) => !s.pass).map((s) => s.label);
  console.log(`\n❌ FAIL: ${failed.join(", ")}`);
  process.exit(1);
}
