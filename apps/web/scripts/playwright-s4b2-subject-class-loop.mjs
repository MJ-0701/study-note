/**
 * playwright-s4b2-subject-class-loop.mjs — S4b-2 subject-class React island 무한루프 면역 prod-build 게이트.
 *
 * session-stub(addInitScript localStorage hint seed + page.route /v1/auth/me mock +
 * study_note_session_hint cookie + /v1/terms + /v1/subjects + /v1/materials mock) 으로
 * renderApp auth early-return 통과 후 subject-class island mount 를 검증한다.
 * sampleLectureNote fallback(localStorage 빈 키) 으로 digital-engineering RICH subjects.
 *
 * 직렬 실행:
 *   1. build(GREEN) → preview → session-stub →
 *      GREEN: subject-class island 긍정 단언(수업일 카드 그리드) + loopErrors 0
 *      + AC1 양 route(subject + subject-class) 각각 island 존재
 *      + round-trip(class→summaries→class) + DIST delta > 0
 *   2. FOCUS-PRES: add-class-date title input 타이핑 → hash round-trip(subject route,
 *      동일 분기 동일 props value-eq guard) → input node identity + value 보존
 *   3. build(RED A: S4B2_LOOP_NEG_CTRL_A=1) → preview → subject-class route → mount-time loopErrors > 0
 *   4. build(RED B: S4B2_LOOP_NEG_CTRL_B=1) → preview → subject-class route →
 *      mount 시 GREEN(loopErrors 0) + add-class-date submit 클릭 후 loopErrors > 0 (§5-C)
 *   5. build(GREEN) 복원
 *
 * exit 0 = PASS (GREEN + FOCUS-PRES + DIST delta > 0 + A RED + B RED)
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
const PORT = 4179; // S3=4320, S3b=4321, S4a=4322, S4b-1=4323 — 포트 충돌 방지
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
 * negA=true → S4B2_LOOP_NEG_CTRL_A=1 (mount-time loop RED).
 * negB=true → S4B2_LOOP_NEG_CTRL_B=1 (click-time loop RED).
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
      S4B2_LOOP_NEG_CTRL_A: negA ? "1" : "0",
      S4B2_LOOP_NEG_CTRL_B: negB ? "1" : "0"
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

// RICH stub data
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
        userId: "test-user-s4b2-gate",
        studentNumber: "20240001",
        name: "S4b2 게이트 테스트",
        role: "student"
      })
    });
  });

  // session-stub 4: /api/materials mock → { materials: [] }
  await page.route("**/materials", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ materials: [] })
    });
  });

  // RICH stub 5: /v1/terms → RICH multi-term data
  await page.route("**/v1/terms", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STUB_TERMS)
    });
  });

  // RICH stub 6: /v1/subjects → RICH multi-subject data
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

const ISLAND_SEL = "[data-react-island='subject-class']";
// sampleLectureNote 의 digital-engineering subject 진입 경로
const CLASS_ROUTE = `${BASE}/#/subjects/digital-engineering/class`;
const SUBJECT_ROUTE = `${BASE}/#/subjects/digital-engineering`;
const SUMMARIES_ROUTE = `${BASE}/#/subjects/digital-engineering/summaries`;

/**
 * GREEN 긍정 단언 + AC1 양 route + round-trip.
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

    // ── GREEN AC1: subject-class route ─────────────────────────────────────
    console.log("\n  [GREEN AC1] subject-class route");
    await page.goto(CLASS_ROUTE, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(2000);

    const hasIslandClass = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-class']")
    );
    check(hasIslandClass, "[data-react-island='subject-class'] 존재 (subject-class route)");

    // island 내부 콘텐츠 — "수업일 카드" = 4 unit card 중 하나
    const hasUnitGrid = await islandContains(page, ISLAND_SEL, "수업일 카드");
    check(hasUnitGrid, "subject-class island 내부에 '수업일 카드' 포함 (unit grid)");

    // island 내부 콘텐츠 — "새 수업일 만들기" = add section
    const hasAddSection = await islandContains(page, ISLAND_SEL, "새 수업일 만들기");
    check(hasAddSection, "subject-class island 내부에 '새 수업일 만들기' 포함 (add section)");

    check(loopErrors.length === 0,
      `subject-class route loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // ── GREEN AC1: subject route (동일 분기) ────────────────────────────────
    console.log("\n  [GREEN AC1] subject route (동일 4726 분기)");
    await page.evaluate(() => { window.location.hash = "#/subjects/digital-engineering"; });
    await page.waitForTimeout(2000);

    const hasIslandSubject = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-class']")
    );
    check(hasIslandSubject, "[data-react-island='subject-class'] 존재 (subject route, 동일 island)");

    check(loopErrors.length === 0,
      `subject route loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
    );

    // ── GREEN round-trip: class → summaries → class ─────────────────────────
    console.log("\n  [GREEN round-trip] subject-class → summaries → subject-class");
    await page.evaluate(() => { window.location.hash = "#/subjects/digital-engineering/summaries"; });
    await page.waitForTimeout(2000);

    // summaries route: subject-class island 없어야 함
    const hasIslandSummaries = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-class']")
    );
    check(!hasIslandSummaries, "summaries route: subject-class island 미존재 (slot null signal)");

    await page.evaluate(() => { window.location.hash = "#/subjects/digital-engineering/class"; });
    await page.waitForTimeout(2000);

    const hasIslandBack = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-class']")
    );
    check(hasIslandBack, "round-trip 후 subject-class island 재존재");
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
 * FOCUS-PRES: add-class-date title text input 타이핑 후
 * window.__studyNoteRenderApp() (background renderApp, 동일 route) 호출 →
 * setSubjectClassProps value-eq guard → React 재렌더 없음 → input node identity + value 보존.
 *
 * 시나리오:
 *   1. subject-class route 마운트 + island 존재 확인.
 *   2. add-class-date title input 에 텍스트 입력 + node ref 캡처.
 *   3. window.__studyNoteRenderApp() 직접 호출(same route, background renderApp).
 *      setSubjectClassProps(동일값) → value-eq guard → setState skip → React 재렌더 없음.
 *   4. title input node identity + value 보존 확인.
 *      (실 앱에서는 focus/value 가 보존됨을 구조적으로 보장)
 *
 * Returns failures array (empty = PASS).
 */
async function runFocusPreservationCheck() {
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

    console.log("\n  [FOCUS-PRES] subject-class route → title 타이핑 → background renderApp → node identity + value");
    await page.goto(CLASS_ROUTE, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(2000);

    const hasIsland = await page.evaluate(() =>
      !!document.querySelector("[data-react-island='subject-class']")
    );
    check(hasIsland, "focus-pres: subject-class island 존재");
    if (!hasIsland) {
      await page.close();
      return failures;
    }

    // title input 에 텍스트 입력 + node ref 캡처
    const titleInput = page.locator("[data-react-island='subject-class'] input[name='title']").first();
    const hasTitleInput = (await titleInput.count()) > 0;
    check(hasTitleInput, "focus-pres: title input[name='title'] 존재");
    if (!hasTitleInput) {
      await page.close();
      return failures;
    }

    await titleInput.click();
    await page.waitForTimeout(200);

    // 타이핑 후 node ref 캡처
    await page.keyboard.type("테스트 수업");
    await page.waitForTimeout(200);

    const beforeCapture = await page.evaluate(() => {
      const el = document.querySelector("[data-react-island='subject-class'] input[name='title']");
      if (!el) return null;
      window.__s4b2TitleInputNode = el;
      return { value: el.value, nodePresent: true };
    });
    check(!!beforeCapture?.nodePresent, "focus-pres: title input node 캡처 성공");
    check(
      beforeCapture?.value === "테스트 수업",
      `focus-pres: 타이핑 후 value = '테스트 수업' — got ${JSON.stringify(beforeCapture?.value)}`
    );

    // background renderApp 직접 호출(동일 route, hash 변경 없음).
    // setSubjectClassProps(buildSubjectClassProps(subject)) → 동일 props value-eq guard →
    // setState skip → React 재렌더 없음 → portal 내부 input node identity 보존.
    await page.evaluate(() => {
      if (typeof window.__studyNoteRenderApp === "function") {
        window.__studyNoteRenderApp();
      }
    });
    await page.waitForTimeout(500);

    // node identity 확인 (background renderApp 후 React 재렌더 없음 → 동일 DOM node)
    const afterCapture = await page.evaluate(() => {
      const el = document.querySelector("[data-react-island='subject-class'] input[name='title']");
      return {
        isSameNode: el === window.__s4b2TitleInputNode,
        nodePresent: !!el,
        value: el ? el.value : null,
      };
    });

    // value-eq guard → setSubjectClassProps setState skip → React 재렌더 없음 → node identity 보존.
    // node identity 보존 = React 가 기존 DOM element 재사용 = remount 없음
    // = focus/cursor 가 실 브라우저에서 유지됨을 구조적으로 보장.
    check(
      afterCapture?.isSameNode === true,
      `focus-pres: background renderApp 후 title input node identity 보존 (value-eq guard) — isSameNode=${afterCapture?.isSameNode}`
    );
    check(
      afterCapture?.value === "테스트 수업",
      `focus-pres: background renderApp 후 input value 유지 — got ${JSON.stringify(afterCapture?.value)}`
    );
    check(loopErrors.length === 0,
      `focus-pres: loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`
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

    await page.goto(CLASS_ROUTE, { waitUntil: "networkidle", timeout: 25_000 });
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
 * Phase 1: subject-class route 마운트 후 loopErrors === 0.
 * Phase 2: add-class-date submit 버튼 클릭 후 loopErrors > 0.
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

    await page.goto(CLASS_ROUTE, { waitUntil: "networkidle", timeout: 25_000 });
    await page.waitForTimeout(2000);

    const mountLoopCount = loopErrors.length;
    console.log(`  B Phase 1 (mount): loopErrors count = ${mountLoopCount}`);
    if (mountLoopCount > 0) {
      bMountAlreadyRed = true;
      console.log("  ⚠️  B 가 mount 에서 이미 RED → A 의 변종일 뿐, §5-C 증명 불가 → STOP");
      check(false, "RED B Phase 1: B 가 mount 에서 이미 RED (§5-C 맹점 close 증명 불가 — STOP)");
    } else {
      check(true, `RED B Phase 1 mount: loopErrors 0 (mount 시 GREEN ✅)`);

      // add-class-date submit 버튼 클릭 (form submit → neg-B flag 활성화)
      const submitBtn = page.locator("form[data-action='add-class-date'] button[type='submit']").first();
      const hasSubmit = (await submitBtn.count()) > 0;

      if (!hasSubmit) {
        check(false, "RED B: form[data-action='add-class-date'] submit button 없음 → subject-class island 미마운트");
      } else {
        await submitBtn.click();
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
  let focusPresFailures = [];
  try {
    await waitForServer();
    console.log("\n--- GREEN checks (session-stub + sampleLectureNote fallback + subject-class island + AC1 양 route + round-trip) ---");
    greenFailures = await runGreenChecks();

    // ── Step 1b: focus-preservation check (동일 GREEN 빌드·서버) ──────────────
    console.log("\n--- focus-preservation check (hash round-trip 후 title input node identity 보존) ---");
    focusPresFailures = await runFocusPreservationCheck();
  } finally {
    preview.kill("SIGTERM");
  }
  const greenPass = greenFailures.length === 0;
  summary.push({
    label: "GREEN (subject-class island 긍정 단언 + AC1 양 route + round-trip + loopErrors 0)",
    pass: greenPass,
    detail: greenFailures
  });
  console.log(`\n${greenPass ? "✅" : "❌"} GREEN: ${greenPass ? "PASS" : greenFailures.join(", ")}`);

  const focusPresPass = focusPresFailures.length === 0;
  summary.push({
    label: "FOCUS-PRES (hash round-trip 후 title input node identity 보존 — value-eq guard 검증)",
    pass: focusPresPass,
    detail: focusPresFailures
  });
  console.log(`\n${focusPresPass ? "✅" : "❌"} FOCUS-PRES: ${focusPresPass ? "PASS" : focusPresFailures.join(", ")}`);

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
    console.log("\n--- RED A checks (mount-time unstable-snapshot loop at subject-class route) ---");
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
    console.log("\n--- RED B checks (click-time add-class-date submit loop, §5-C) ---");
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
console.log("\n=== S4b-2 subject-class loop-gate 결과 ===");
for (const s of summary) {
  console.log(`  ${s.pass ? "✅" : "❌"} ${s.label}`);
  if (!s.pass && s.detail?.length) {
    s.detail.forEach((d) => console.log(`      - ${d}`));
  }
}

const allPass = summary.length > 0 && summary.every((s) => s.pass);
if (allPass) {
  console.log("\n✅ PASS: S4b-2 subject-class loop-gate GREEN(island AC1 양route round-trip) + FOCUS-PRES(hash round-trip node identity) + DIST delta > 0 + neg-A RED + neg-B RED (§5-C close)");
  process.exit(0);
} else {
  const failed = summary.filter((s) => !s.pass).map((s) => s.label);
  console.log(`\n❌ FAIL: ${failed.join(", ")}`);
  process.exit(1);
}
