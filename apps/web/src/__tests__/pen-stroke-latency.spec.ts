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
 *  - AC18: pointerup renderApp 이 requestAnimationFrame 안으로 defer
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
    // pattern: if (coalesced.length > 0) { for ... } else { activeInkStroke.points.push(toInkPoint(getSurfacePoint(event, surface), event)); }
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
    // updateLiveStroke 안에만 setAttribute 가 있어야 함 (pointermove 분기에서 직접 호출 X).
    const moveMatch = src.match(/event\.preventDefault\(\);\s*\/\/ sprint-W21-sprint-1\/S4\/AC16[\s\S]*?scheduleLiveStrokeRender\(\);\s*\}\s*\n\s*function handleDocumentPointerUp/);
    assert.ok(moveMatch, "ink pointermove branch must end with scheduleLiveStrokeRender, not updateLiveStroke");
  });
});

describe("AC18 — pointerup renderApp RAF defer + race guard (codex R1 P1)", () => {
  it("handleDocumentPointerUp ink branch 가 requestAnimationFrame 안에 새 stroke race guard 포함", async () => {
    const src = await read();
    // activeInkStroke clear 후 RAF defer
    assert.match(src, /activeInkStroke = undefined;\s*[\s\S]*?requestAnimationFrame\(/);
    // race guard: RAF 안에서 새 stroke 시작됐으면 render skip.
    assert.match(src, /if\s*\(!activeInkStroke\)\s*\{\s*renderApp\(\);/);
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
    // 회기 — shared global inkStrokeCommitMarkId 폐기.
    assert.equal(/let inkStrokeCommitMarkId/.test(src), false);
  });
});
