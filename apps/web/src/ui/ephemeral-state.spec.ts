// sprint-2026-W22-sprint-21 / layer D/slice-3 — UI ephemeral state spec.
// T1~T5 transition 1:1.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test apps/web/src/ui/ephemeral-state.spec.ts

import assert from "node:assert/strict";
import { register } from "node:module";
import { beforeEach, describe, it } from "node:test";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, nextResolve) {
        try { return await nextResolve(specifier, context); }
        catch (error) {
          const withoutQuery = specifier.split(/[?#]/, 1)[0] ?? specifier;
          if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.[A-Za-z0-9]+$/.test(withoutQuery)) {
            return nextResolve(specifier + ".ts", context);
          }
          throw error;
        }
      }
    `),
  import.meta.url
);

const mod = await import("./ephemeral-state.ts");
const {
  __resetEphemeralStateForTesting__,
  closeHotkeyHelpModal,
  getHotkeyHelpModalOpen,
  setHotkeyHelpModalOpen,
  toggleHotkeyHelpModal
} = mod;

describe("ui/ephemeral-state — hotkey help modal (sprint-W22-sprint-21)", () => {
  beforeEach(() => {
    __resetEphemeralStateForTesting__();
  });

  it("initial state = false", () => {
    assert.equal(getHotkeyHelpModalOpen(), false);
  });

  it("T1: setHotkeyHelpModalOpen(true) → state=true", () => {
    setHotkeyHelpModalOpen(true);
    assert.equal(getHotkeyHelpModalOpen(), true);
  });

  it("T2 setter: setHotkeyHelpModalOpen(false) → state=false", () => {
    setHotkeyHelpModalOpen(true);
    setHotkeyHelpModalOpen(false);
    assert.equal(getHotkeyHelpModalOpen(), false);
  });

  it("T2 close: closeHotkeyHelpModal() → state=false (idempotent)", () => {
    setHotkeyHelpModalOpen(true);
    closeHotkeyHelpModal();
    assert.equal(getHotkeyHelpModalOpen(), false);
    closeHotkeyHelpModal();
    assert.equal(getHotkeyHelpModalOpen(), false);
  });

  it("T3: toggleHotkeyHelpModal() invert + returns new value", () => {
    assert.equal(toggleHotkeyHelpModal(), true);
    assert.equal(getHotkeyHelpModalOpen(), true);
    assert.equal(toggleHotkeyHelpModal(), false);
    assert.equal(getHotkeyHelpModalOpen(), false);
  });

  it("T4/T5 indirect: closeHotkeyHelpModal 호출은 idempotent (route change + session reset 모두 동일 path)", () => {
    setHotkeyHelpModalOpen(true);
    closeHotkeyHelpModal(); // route change scenario
    closeHotkeyHelpModal(); // session reset scenario
    assert.equal(getHotkeyHelpModalOpen(), false);
  });

  it("AC7 no console: ephemeral-state.ts body 에 console.* 사용 금지", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL("./ephemeral-state.ts", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(src, /console\./);
  });

  it("__resetEphemeralStateForTesting__ → state=false", () => {
    setHotkeyHelpModalOpen(true);
    __resetEphemeralStateForTesting__();
    assert.equal(getHotkeyHelpModalOpen(), false);
  });
});
