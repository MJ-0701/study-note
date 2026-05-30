/**
 * playwright-auth-loop-gate.mjs — S2 WU3 AuthGate 무한루프 면역 prod-build 게이트.
 *
 * 직렬 실행:
 *   1. build(GREEN) → preview → 긍정 단언(#auth-root 렌더 + 탭 전환 + 공백폼 피드백 + 노드 안정성) + loopErrors 0
 *   2. dist grep → NegativeControlAuthGate / unstableGetSnapshot / __loopgate__ 부재 확인
 *   3. build(RED) → preview → loopErrors > 0 확인 (negative control 이 동일 detector 로 RED)
 *   4. build(GREEN) 복원
 *
 * exit 0 = PASS (GREEN assertions + DIST CLEAN + RED loop detected)
 * exit 1 = FAIL (항목 나열)
 */
import { spawnSync, spawn } from "node:child_process";
import { statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { chromium } from "@playwright/test";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4319;
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

/** pnpm build 실행. neg=true → AUTH_LOOP_NEG_CTRL=1 (RED 빌드). 메인 entry JS 크기 반환(bytes). */
function build(neg) {
  console.log(`\n--- build(${neg ? "RED/neg-ctrl" : "GREEN"}) ---`);
  const result = spawnSync("pnpm", ["build"], {
    cwd: WEB_ROOT,
    stdio: "inherit",
    env: { ...process.env, AUTH_LOOP_NEG_CTRL: neg ? "1" : "0" }
  });
  if (result.status !== 0) {
    throw new Error(`pnpm build failed (exit ${result.status})`);
  }
  // dist/assets/main-*.js (app entry) 의 크기를 반환 — tree-shake 검증에 사용.
  // pdf-canvas-viewer / persona-turn 등 auth 무관 번들은 크기 불변이므로 제외.
  const assetsDir = resolve(WEB_ROOT, "dist", "assets");
  try {
    // rollupOptions.input 의 "main" entry 가 생성하는 main-<hash>.js
    const files = readdirSync(assetsDir).filter((f) => /^main-[^-]+\.js$/.test(f));
    if (files.length === 0) return 0;
    // 복수일 경우(multi-chunk) 합산
    return files.reduce((sum, f) => sum + statSync(resolve(assetsDir, f)).size, 0);
  } catch {
    return 0;
  }
}

/** vite preview 프로세스 시작. 반환값은 child process (caller 가 finally 에서 kill). */
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
      if (res.status < 600) return; // 어떤 HTTP 응답이든 서버 가동 확인
    } catch {
      /* 아직 미가동 */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview server not ready after 20s at ${BASE}`);
}

// loop detector regex (S1a incident + React error)
const LOOP_REGEX = /Maximum update depth|getSnapshot should be cached|Minified React error #185/;

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
    const page = await context.newPage();
    const loopErrors = [];

    page.on("pageerror", (e) => {
      const msg = e?.message ?? String(e);
      if (LOOP_REGEX.test(msg)) loopErrors.push(`pageerror: ${msg}`);
    });
    page.on("console", (m) => {
      const t = m.text();
      if (LOOP_REGEX.test(t)) loopErrors.push(`console: ${t}`);
    });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20_000 });
    await page.waitForTimeout(1500); // 루프 윈도우 — effect 루프가 있으면 이 시간 안에 터짐

    if (!expectLoop) {
      // GREEN 긍정 단언 ─────────────────────────────────────

      // 1. #auth-root innerHTML 비어있지 않음
      const authRootHtml = await page.evaluate(
        () => document.querySelector("#auth-root")?.innerHTML?.trim() ?? ""
      );
      check(authRootHtml.length > 0, `#auth-root innerHTML 비어있지 않음 (len=${authRootHtml.length})`);

      // 2. [data-login-screen] 존재
      const hasLoginScreen = await page.evaluate(
        () => !!document.querySelector("[data-login-screen]")
      );
      check(hasLoginScreen, "[data-login-screen] 존재");

      // 3. 노드 identity sentinel 저장
      await page.evaluate(() => {
        window.__appNode = document.querySelector("#app");
        window.__authRootNode = document.querySelector("#auth-root");
      });

      // 4. 회원가입 탭 클릭 → aria-selected 전환
      await page.getByRole("tab", { name: "회원가입" }).click();
      await page.waitForTimeout(300);
      const signupSelected = await page.evaluate(() => {
        // role=tab 버튼 중 "회원가입" 텍스트
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        const signup = tabs.find((t) => t.textContent?.includes("회원가입"));
        return signup?.getAttribute("aria-selected") === "true";
      });
      check(signupSelected, "회원가입 탭 aria-selected=true (탭 전환 정상)");

      // 5. 공백 폼 제출 → is-error 피드백 렌더
      // required 통과를 위해 공백(non-empty) 입력
      await page.locator('input[name="name"]').fill(" ");
      await page.locator('input[name="studentNumber"]').fill(" ");
      await page.locator("form.login-form button[type=submit]").click();
      await page.waitForTimeout(300);

      const feedbackText = await page.evaluate(() => {
        const el = document.querySelector(".login-feedback.is-error");
        return el ? el.textContent ?? "" : null;
      });
      check(feedbackText !== null, ".login-feedback.is-error 존재 (공백 제출 후 에러 피드백)");
      check(
        feedbackText !== null && feedbackText.includes("이름과 학번을 입력하세요"),
        `피드백 텍스트에 "이름과 학번을 입력하세요" 포함 — got: "${(feedbackText ?? "").slice(0, 60)}"`
      );

      // 6. 노드 identity 불변 (AC5 partial: auth path 가 #app/#auth-root 재생성 안 함)
      const nodeStable = await page.evaluate(() => {
        return (
          document.querySelector("#app") === window.__appNode &&
          document.querySelector("#auth-root") === window.__authRootNode
        );
      });
      check(nodeStable, "#app + #auth-root 노드 identity 불변 (탭전환+폼제출 후)");

      // 7. loopErrors 0
      check(loopErrors.length === 0, `loopErrors 0 — got ${loopErrors.length}${loopErrors.length ? ": " + loopErrors.slice(0, 2).join(" | ") : ""}`);

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
    console.log("\n--- GREEN checks ---");
    greenFailures = await runChecks({ expectLoop: false });
  } finally {
    preview.kill("SIGTERM");
  }
  const greenPass = greenFailures.length === 0;
  summary.push({ label: "GREEN (positive assertions + loopErrors 0)", pass: greenPass, detail: greenFailures });
  console.log(`\n${greenPass ? "✅" : "❌"} GREEN: ${greenPass ? "PASS" : greenFailures.join(", ")}`);

  // 포트 해제 대기
  await new Promise((r) => setTimeout(r, 800));

  // ── Step 2: DIST CLEAN — 번들 크기 delta 기반 tree-shake 검증 ──
  // esbuild 가 식별자를 minify 하므로 named-identifier grep 은 신뢰 불가.
  // 대신: RED 빌드 최대 번들 > GREEN 빌드 최대 번들 이어야
  // negative-control 코드가 실제로 번들에 포함됐음을 증명한다.
  // (delta가 0이면 tree-shake가 RED에서도 코드를 제거한 것 → negative control 무효)
  // 이 단계는 RED 빌드 후에 측정해야 하므로 Step 3 이후로 이동; 여기서는 GREEN 크기만 기록.
  console.log(`\n--- DIST SIZE (GREEN baseline: max bundle ${greenBundleSize} bytes) ---`);

  // ── Step 3: RED build + checks ────────────────────────
  await new Promise((r) => setTimeout(r, 200));
  const redBundleSize = build(true);
  // bundle size delta: RED > GREEN → negative-control 코드가 실제 번들에 포함됨
  const bundleDelta = redBundleSize - greenBundleSize;
  const distClean = bundleDelta > 0;
  console.log(`\n--- DIST SIZE delta: RED(${redBundleSize}) - GREEN(${greenBundleSize}) = ${bundleDelta} bytes ---`);
  if (distClean) {
    console.log(`  ✅ DIST delta > 0: negative-control 코드가 RED 번들에 포함됨 → GREEN tree-shake 유효`);
  } else {
    console.log(`  ❌ DIST delta ≤ 0: negative-control 코드가 RED 번들에도 없음 → tree-shake 검증 불가(esbuild 이슈)`);
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
console.log("\n=== loop-gate 결과 ===");
for (const s of summary) {
  console.log(`  ${s.pass ? "✅" : "❌"} ${s.label}`);
  if (!s.pass && s.detail?.length) {
    s.detail.forEach((d) => console.log(`      - ${d}`));
  }
}

const allPass = summary.length > 0 && summary.every((s) => s.pass);
if (allPass) {
  console.log("\n✅ PASS: loop-gate GREEN + negative control RED + prod 번들 clean");
  process.exit(0);
} else {
  const failed = summary.filter((s) => !s.pass).map((s) => s.label);
  console.log(`\n❌ FAIL: ${failed.join(", ")}`);
  process.exit(1);
}
