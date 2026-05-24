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

describe("AC18 — pointerup renderApp RAF defer + race guard (codex R1 P1 + R2 P2)", () => {
  it("handleDocumentPointerUp ink branch 가 requestAnimationFrame 안에 새 stroke race guard 포함", async () => {
    const src = await read();
    // activeInkStroke clear 후 RAF defer
    assert.match(src, /activeInkStroke = undefined;\s*[\s\S]*?requestAnimationFrame\(/);
    // R1 P1 + R2 P2: race guard — 새 stroke 시작됐으면 render + measure 둘 다 skip.
    // 패턴: `if (activeInkStroke) { ...clearMarks... return; } renderApp(); measure...`
    assert.match(src, /if\s*\(activeInkStroke\)\s*\{[\s\S]*?return;\s*\}\s*renderApp\(\);[\s\S]*?measurePenStrokeNextPaintFromMark/);
    // measure 호출 site 가 1개만 (RAF 안에서) — render skip 시 measure 도 skip.
    const measureMatches = src.match(/measurePenStrokeNextPaintFromMark\(/g) ?? [];
    assert.ok(measureMatches.length >= 2, "expected at least 1 call site + 1 fn signature");
  });

  it("R2 P2 — tap/aborted stroke (points <= 1) 면 metric emit skip", async () => {
    const src = await read();
    // committed flag 보호 + early return.
    assert.match(src, /const committed = points\.length > 1;/);
    assert.match(src, /if\s*\(!committed\)\s*\{\s*return;\s*\}/);
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
