/**
 * ipad-breakpoint.spec.ts — sprint-W21-sprint-1 / iPad media breakpoint fix.
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/__tests__/ipad-breakpoint.spec.ts
 *
 * 근거: llm-wiki/references/sfs-harness-gaps.md "iPad media root cause candidate"
 * — 768px iPad 가 compact/mobile breakpoint 로 들어가던 문제. 820px → 767px.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STYLES = resolve(__dirname, "../styles.css");

describe("iPad media breakpoint (768px) regression guard", () => {
  it("styles.css 에서 @media (max-width: 820px) 가 없어야 한다 (iPad portrait 가 mobile compact 로 잘못 들어감)", async () => {
    const src = await readFile(STYLES, "utf-8");
    const matches = src.match(/@media \(max-width: 820px\)/g);
    assert.equal(matches, null, "820px breakpoint must not exist — 767px or 768px boundary instead");
  });

  it("styles.css 가 max-width: 767px 사용 (768px iPad 는 tablet layout 유지)", async () => {
    const src = await readFile(STYLES, "utf-8");
    assert.match(src, /@media \(max-width: 767px\)/, "iPad portrait (768px) 가 compact 회피하도록 767px boundary 필요");
  });
});
