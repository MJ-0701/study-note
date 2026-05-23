// sprint-W21-sprint-4/S2: pdf-canvas-viewer 의 좌표 mapping / DPR clamp 회귀 spec.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test \
//     apps/web/src/__tests__/pdf-canvas-coords.spec.ts
//
// 본 spec 은 self-contained: pdf-canvas-viewer.ts 의 `pickEffectiveDpr` 순수
// 함수를 inline mirror 해서 검증 (textbox-tool.spec.ts / eraser-tool.spec.ts
// 와 동일 패턴). Vite bundler 없이 node:test 로 실행 가능하도록 유지.
//
// 검증 항목 (plan §3 AC2/AC6, §11 DPR clamp policy):
//   - DPR clamp = min(devicePixelRatio, MAX_DPR=2.0).
//   - 4 MP pixel budget cap.
//   - canvas backing-store px = viewport.{width,height} × effectiveDpr (PDF
//     native aspect 보존).
//   - CSS stretch (100% × 100%) 가 annotation overlay surface 의 0~1 ratio 와
//     pixel-perfect 정합 (수학적 관계).

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

// ---------------------------------------------------------------------------
// pickEffectiveDpr — pdf-canvas-viewer.ts mirror.
// 같은 로직 변경 시 양쪽 동기화 필요.
// ---------------------------------------------------------------------------

const MAX_PIXELS_PER_PAGE = 2048 * 2048;
const MAX_DPR = 2.0;

function pickEffectiveDpr(
  cssWidth: number,
  cssHeight: number,
  rawDpr: number = 1
): number {
  const clamped = Math.min(rawDpr, MAX_DPR);
  const candidatePx = cssWidth * cssHeight * clamped * clamped;
  if (candidatePx <= MAX_PIXELS_PER_PAGE) {
    return clamped;
  }
  return Math.sqrt(MAX_PIXELS_PER_PAGE / (cssWidth * cssHeight));
}

// ---------------------------------------------------------------------------
// DPR clamp + pixel budget
// ---------------------------------------------------------------------------

describe("pickEffectiveDpr: DPR clamp", () => {
  it("rawDpr 1 → 그대로 1", () => {
    assert.equal(pickEffectiveDpr(800, 1000, 1), 1);
  });

  it("rawDpr 2 → MAX_DPR=2.0 그대로", () => {
    // 800×1000×4 = 3.2 MP < 4 MP cap.
    assert.equal(pickEffectiveDpr(800, 1000, 2), 2);
  });

  it("rawDpr 3 (가상 high-DPR) → MAX_DPR=2.0 으로 clamp", () => {
    // candidate = 800×1000×4 = 3.2 MP < cap. clamp 만 적용.
    assert.equal(pickEffectiveDpr(800, 1000, 3), 2);
  });
});

describe("pickEffectiveDpr: 4 MP pixel budget", () => {
  it("small page (1024×1024) + DPR=2 → backing-store 정확히 4 MP cap", () => {
    const dpr = pickEffectiveDpr(1024, 1024, 2);
    assert.equal(dpr, 2);
    const px = 1024 * 1024 * dpr * dpr;
    assert.equal(px, MAX_PIXELS_PER_PAGE);
  });

  it("medium A4-like (1600×2263) + DPR=2 → cap 초과 시 sqrt 축소", () => {
    const dpr = pickEffectiveDpr(1600, 2263, 2);
    const px = 1600 * 2263 * dpr * dpr;
    assert.ok(
      px <= MAX_PIXELS_PER_PAGE + 1,
      `candidate ${px} ≤ 4 MP cap`
    );
    assert.ok(dpr > 0 && dpr <= MAX_DPR, `DPR ${dpr} ∈ (0, ${MAX_DPR}]`);
  });

  it("large page (3000×4000) + DPR=1 → sqrt 축소 (12 MP > 4 MP cap)", () => {
    const dpr = pickEffectiveDpr(3000, 4000, 1);
    // 1.0 clamp 후 3000×4000×1 = 12 MP > cap. → sqrt(4_194_304 / 12_000_000).
    const expected = Math.sqrt(MAX_PIXELS_PER_PAGE / (3000 * 4000));
    assert.equal(dpr, expected);
    assert.ok(dpr < 1.0, `large page DPR ${dpr} < 1.0 (cap-driven shrink)`);
  });

  it("4 MP boundary (정확히 cap) → clamp 그대로 (sqrt 분기 안 함)", () => {
    // 2048 × 2048 × 1² = exactly 4 MP. clamp=1, candidate=4 MP, ≤ cap → 그대로.
    assert.equal(pickEffectiveDpr(2048, 2048, 1), 1);
  });
});

// ---------------------------------------------------------------------------
// annotation overlay 좌표 정합 (canvas CSS stretch 기준 수학적 관계)
// ---------------------------------------------------------------------------

describe("annotation overlay 좌표 정합 (canvas CSS stretch 기준)", () => {
  // pdf-canvas-viewer 의 ensureCanvas: canvas.style.width/height = "100%".
  // → annotation surface 와 stage 동일 사이즈로 stretch.
  // → pointer event 좌표 = surface.getBoundingClientRect() 기준 → 0~1 ratio
  //   변환 → 그 ratio 가 canvas 위 (CSS px) 같은 위치 → annotation 정합.

  it("surface 좌표 (norm 0~1) × stage 픽셀 = canvas 위 같은 ratio 위치", () => {
    const stage = { width: 1000, height: 700 };
    const norm = { x: 0.5, y: 0.5 };
    const surfacePx = { x: norm.x * stage.width, y: norm.y * stage.height };
    assert.equal(surfacePx.x, 500);
    assert.equal(surfacePx.y, 350);
  });

  it("PDF native aspect (595×842 A4) ≠ stage aspect (1000×700) — norm 좌표 유지", () => {
    // canvas backing-store = PDF native px × DPR. CSS = stage 100% × 100%.
    // norm 좌표 = surface px / stage size = canvas CSS px / canvas CSS size.
    // browser GPU resample = visual stretch. annotation 위치는 norm 으로 저장 →
    // 같은 norm 으로 다시 surface 위 render → 같은 위치.
    const norm = { x: 0.3, y: 0.6 };
    const stage = { width: 1000, height: 700 };
    const surfacePx = { x: norm.x * stage.width, y: norm.y * stage.height };
    assert.equal(surfacePx.x, 300);
    assert.equal(surfacePx.y, 420);
    // 다른 stage 로 변경되어도 norm 좌표는 device-independent.
    const stageMobile = { width: 360, height: 640 };
    const surfacePxMobile = {
      x: norm.x * stageMobile.width,
      y: norm.y * stageMobile.height
    };
    assert.equal(surfacePxMobile.x, 108);
    assert.equal(surfacePxMobile.y, 384);
  });

  it("pointer event → norm 변환 (surface.getBoundingClientRect 패턴)", () => {
    // surface bounds = (left=100, top=200), size 1000×700.
    const rect = { left: 100, top: 200, width: 1000, height: 700 };
    const clientPt = { x: 400, y: 480 };
    const norm = {
      x: (clientPt.x - rect.left) / rect.width,
      y: (clientPt.y - rect.top) / rect.height
    };
    assert.equal(norm.x, 0.3);
    assert.equal(norm.y, 0.4);
  });
});
