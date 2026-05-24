/**
 * pen-stroke-latency.spec.ts — sprint-W21-sprint-1 / S4 / AC16-AC20 spec.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/__tests__/pen-stroke-latency.spec.ts
 *
 * 검증 (jsdom 한계 회피 — source guard + 패턴 회기):
 *  - AC16: handleDocumentPointerMove 가 getCoalescedEvents() 호출
 *  - AC17: scheduleLiveStrokeRender RAF batch (1 frame = 1 setAttribute)
 *  - AC18: pointerup renderApp 이 requestAnimationFrame 안으로 defer + reattach
 *  - AC19: trackRumAction("pen-stroke.next-paint", { durationMs }) emit
 *  - AC20: desktop pointer 회기 — coalesced=[] 면 single event point 사용
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = resolve(__dirname, "../main.ts");

async function read(): Promise<string> {
  return readFile(SRC, "utf-8");
}

describe("AC16 — getCoalescedEvents 사용", () => {
  it("handleDocumentPointerMove 가 getCoalescedEvents 호출", async () => {
    const src = await read();
    assert.match(src, /event\.getCoalescedEvents\(\)/);
  });

  it("AC20 desktop fallback — coalesced.length === 0 면 단일 event point push", async () => {
    const src = await read();
    assert.match(src, /coalesced\.length\s*>\s*0/);
    assert.match(src, /else\s*\{[\s\S]*activeInkStroke\.points\.push\(toInkPoint\(getSurfacePoint\(event/);
  });
});

describe("AC17 — RAF batch live stroke paint", () => {
  it("scheduleLiveStrokeRender 함수 + liveStrokeRafId 가드", async () => {
    const src = await read();
    assert.match(src, /function scheduleLiveStrokeRender\(\)/);
    assert.match(src, /let liveStrokeRafId/);
    assert.match(src, /liveStrokeRafId\s*!==\s*undefined/);
    assert.match(src, /requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*updateLiveStroke\(\)/);
  });

  it("pointermove 가 setAttribute 직접 호출 X — scheduleLiveStrokeRender 만 호출", async () => {
    const src = await read();
    const moveMatch = src.match(/event\.preventDefault\(\);\s*\/\/ sprint-W21-sprint-1\/S4\/AC16[\s\S]*?scheduleLiveStrokeRender\(\);\s*\}\s*\n\s*function handleDocumentPointerUp/);
    assert.ok(moveMatch, "ink pointermove branch must end with scheduleLiveStrokeRender, not updateLiveStroke");
  });
});

describe("AC18 — pointerup RAF defer + render always + livePolyline reattach (R1/R2/R3)", () => {
  it("handleDocumentPointerUp ink branch RAF 안 항상 renderApp + carriedStroke reattach", async () => {
    const src = await read();
    assert.match(src, /activeInkStroke = undefined;\s*[\s\S]*?requestAnimationFrame\(/);
    // R3 P2: 항상 renderApp + livePolyline 재생성 (committed stroke 즉시 visible).
    assert.match(src, /const carriedStroke = activeInkStroke;\s*renderApp\(\);/);
    assert.match(src, /reattachLiveInkPolyline\(/);
    assert.match(src, /function reattachLiveInkPolyline\(stroke: ActiveInkStroke\)/);
  });

  it("R2 P2 — tap/aborted stroke (points <= 1) 면 metric emit skip", async () => {
    const src = await read();
    assert.match(src, /const committed = points\.length > 1;/);
    assert.match(src, /if\s*\(!committed\)\s*\{\s*return;\s*\}/);
  });

  it("R3 P1 — measure 가 next RAF (paint 완료 후) 로 defer", async () => {
    const src = await read();
    // 패턴: requestAnimationFrame(() => { ... requestAnimationFrame(() => { measure... });
    assert.match(src, /requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?renderApp\(\);[\s\S]*?requestAnimationFrame\(\(\)\s*=>\s*\{\s*measurePenStrokeNextPaintFromMark/);
  });
});

describe("AC19 — Datadog RUM next-paint emit (codex R1 P2 — per-stroke closure)", () => {
  it("performance.mark + measure + trackRumAction call site", async () => {
    const src = await read();
    assert.match(src, /performance\.mark\(/);
    assert.match(src, /performance\.measure\(/);
    assert.match(src, /trackRumAction\("pen-stroke\.next-paint",\s*\{\s*durationMs/);
  });

  it("measurePenStrokeNextPaintFromMark helper takes markId arg (shared global 폐기)", async () => {
    const src = await read();
    assert.match(src, /function measurePenStrokeNextPaintFromMark\(markId: string\)/);
    assert.equal(/let inkStrokeCommitMarkId/.test(src), false);
  });
});
