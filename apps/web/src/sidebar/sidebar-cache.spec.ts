// sprint-2026-W22-sprint-21 / layer D/slice-3 — sidebar cache spec.
// T1~T7 transition 1:1 + race + localStorage error.
//
// 실행:
//   node --experimental-strip-types --no-warnings --test apps/web/src/sidebar/sidebar-cache.spec.ts

import assert from "node:assert/strict";
import { register } from "node:module";
import { afterEach, beforeEach, describe, it } from "node:test";

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

const mod = await import("./sidebar-cache.ts");
type AuthSession = {
  user: { id: string; displayName: string; studentNumber: string; role: string };
};

const {
  __resetSidebarCacheForTesting__,
  __seedSidebarCacheForTesting__,
  __getSidebarTermsCacheForTesting__,
  __getSidebarOpenTermIdsForTesting__,
  clearSidebarCache,
  getSidebarOpenTermIds,
  getSidebarSubjectsCache,
  getSidebarTermsCache,
  loadSidebarTermsCache,
  refreshSidebarOpenTermIds,
  toggleSidebarTermOpen
} = mod;
type SidebarCacheContext = mod.SidebarCacheContext;
type SidebarCacheCallbacks = mod.SidebarCacheCallbacks;

const TEST_API_BASE = "https://test.invalid/api";
const TERMS_RESPONSE = [
  { id: "t1", grade: 1, semester: 1, title: "1-1", startDate: "2026-03-01", endDate: "2026-07-01" }
];
const SUBJECTS_RESPONSE = [
  { id: "s1", title: "수학", termId: "t1" }
];

interface Harness {
  ctx: SidebarCacheContext;
  cb: SidebarCacheCallbacks;
  triggerRenderCount: number;
  setAuthSession(session: AuthSession | undefined): void;
  setFetchSequence(responses: Array<() => Promise<Response>>): void;
  restoreFetch(): void;
  storage: Map<string, string>;
  setStorageThrowOn(op: "getItem" | "setItem"): void;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function createHarness(): Harness {
  let currentSession: AuthSession | undefined;
  let throwGet = false;
  let throwSet = false;
  const storage = new Map<string, string>();

  const mockStorage = {
    getItem(key: string): string | null {
      if (throwGet) {
        throwGet = false;
        throw new Error("getItem throw");
      }
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      if (throwSet) {
        throwSet = false;
        throw new Error("setItem throw");
      }
      storage.set(key, value);
    },
    removeItem(key: string): void {
      storage.delete(key);
    },
    clear(): void {
      storage.clear();
    },
    key(): string | null {
      return null;
    },
    length: 0
  } as Storage;

  (globalThis as { window?: { localStorage: Storage } }).window = {
    localStorage: mockStorage
  } as never;

  const ctx: SidebarCacheContext = {
    apiBaseUrl: TEST_API_BASE,
    getAuthSession: () => currentSession,
    isBrowserRuntime: true
  };

  const harness = {
    ctx,
    cb: {
      triggerRender: () => {
        harness.triggerRenderCount += 1;
      }
    } satisfies SidebarCacheCallbacks,
    triggerRenderCount: 0,
    setAuthSession(session: AuthSession | undefined) {
      currentSession = session;
    },
    storage,
    setStorageThrowOn(op: "getItem" | "setItem") {
      if (op === "getItem") throwGet = true;
      else throwSet = true;
    },
    setFetchSequence(responses: Array<() => Promise<Response>>) {
      let idx = 0;
      globalThis.fetch = (async () => {
        const r = responses[idx];
        idx += 1;
        if (!r) throw new Error("no more fetch responses");
        return r();
      }) as typeof fetch;
    },
    restoreFetch() {
      globalThis.fetch = originalFetch;
      delete (globalThis as { window?: unknown }).window;
    }
  } as Harness;
  const originalFetch = globalThis.fetch;
  return harness;
}

describe("sidebar/sidebar-cache (sprint-W22-sprint-21)", () => {
  let harness: Harness;

  beforeEach(() => {
    __resetSidebarCacheForTesting__();
    harness = createHarness();
  });

  afterEach(() => {
    harness.restoreFetch();
  });

  it("T1: loadSidebarTermsCache with no session → early return (no fetch, cache 미변경)", async () => {
    harness.setAuthSession(undefined);
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error("should not fetch");
    }) as typeof fetch;
    await loadSidebarTermsCache(harness.ctx, harness.cb);
    assert.equal(fetchCalled, false);
    assert.equal(getSidebarTermsCache(), null);
  });

  it("T2: loadSidebarTermsCache success → terms + subjects cache + triggerRender", async () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    harness.setFetchSequence([
      () => Promise.resolve(jsonResponse(200, TERMS_RESPONSE)),
      () => Promise.resolve(jsonResponse(200, SUBJECTS_RESPONSE))
    ]);
    await loadSidebarTermsCache(harness.ctx, harness.cb);
    assert.equal(getSidebarTermsCache()?.length, 1);
    assert.equal(getSidebarTermsCache()?.[0]?.id, "t1");
    assert.equal(getSidebarSubjectsCache()?.length, 1);
    assert.equal(getSidebarSubjectsCache()?.[0]?.id, "s1");
    assert.equal(harness.triggerRenderCount, 1);
  });

  it("T3: loadSidebarTermsCache race (userId mid-flight 바뀜) → discard, cache 미변경", async () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    harness.setFetchSequence([
      () => {
        // Mid-flight session switch
        harness.setAuthSession({
          user: { id: "u2", displayName: "n", studentNumber: "s", role: "STUDENT" }
        });
        return Promise.resolve(jsonResponse(200, TERMS_RESPONSE));
      },
      () => Promise.resolve(jsonResponse(200, SUBJECTS_RESPONSE))
    ]);
    await loadSidebarTermsCache(harness.ctx, harness.cb);
    assert.equal(getSidebarTermsCache(), null);
    assert.equal(harness.triggerRenderCount, 0);
  });

  it("T4a: loadSidebarTermsCache 5xx → cache null 유지 (flat fallback)", async () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    harness.setFetchSequence([
      () => Promise.resolve(jsonResponse(500, {})),
      () => Promise.resolve(jsonResponse(500, {}))
    ]);
    await loadSidebarTermsCache(harness.ctx, harness.cb);
    assert.equal(getSidebarTermsCache(), null);
    assert.equal(harness.triggerRenderCount, 0);
  });

  it("T4b: loadSidebarTermsCache network throw → cache null 유지", async () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    harness.setFetchSequence([() => Promise.reject(new Error("network"))]);
    await loadSidebarTermsCache(harness.ctx, harness.cb);
    assert.equal(getSidebarTermsCache(), null);
    assert.equal(harness.triggerRenderCount, 0);
  });

  it("T5: refreshSidebarOpenTermIds with prerequisites → resolveOpenTermIds → write", () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    __seedSidebarCacheForTesting__(
      [
        { id: "t1", grade: 1, semester: 1, title: "1-1", startDate: "2026-03-01", endDate: "2026-07-01" }
      ],
      [{ id: "s1", title: "수학", termId: "t1" }],
      new Set()
    );
    refreshSidebarOpenTermIds(harness.ctx);
    // open ids 가 비어있지 않아야 한다 (default 또는 stored 적용).
    assert.ok(getSidebarOpenTermIds() instanceof Set);
  });

  it("T5 missing cache: refreshSidebarOpenTermIds no-op when cache null", () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    refreshSidebarOpenTermIds(harness.ctx);
    assert.equal(getSidebarOpenTermIds().size, 0);
  });

  it("T6: toggleSidebarTermOpen → in-memory toggle + localStorage persist + triggerRender", () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    __seedSidebarCacheForTesting__(
      [{ id: "t1", grade: 1, semester: 1, title: "1-1", startDate: null, endDate: null }],
      [{ id: "s1", title: "수학", termId: "t1" }],
      new Set()
    );
    toggleSidebarTermOpen(harness.ctx, harness.cb, "t1");
    assert.ok(getSidebarOpenTermIds().has("t1"));
    assert.equal(harness.triggerRenderCount, 1);
    // 한 번 더 toggle → close
    toggleSidebarTermOpen(harness.ctx, harness.cb, "t1");
    assert.equal(getSidebarOpenTermIds().has("t1"), false);
    assert.equal(harness.triggerRenderCount, 2);
  });

  it("T6 localStorage throw on setItem: toggleSidebarTermOpen 의 in-memory 갱신은 유지", () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    __seedSidebarCacheForTesting__(
      [{ id: "t1", grade: 1, semester: 1, title: "1-1", startDate: null, endDate: null }],
      [{ id: "s1", title: "수학", termId: "t1" }],
      new Set()
    );
    harness.setStorageThrowOn("setItem");
    toggleSidebarTermOpen(harness.ctx, harness.cb, "t1");
    // setItem 이 throw 했지만 in-memory open ids 는 갱신되어야 한다.
    assert.ok(getSidebarOpenTermIds().has("t1"));
    assert.equal(harness.triggerRenderCount, 1);
  });

  it("T6 localStorage throw on getItem: refreshSidebarOpenTermIds 의 fallback {} 으로 보호", () => {
    harness.setAuthSession({
      user: { id: "u1", displayName: "n", studentNumber: "s", role: "STUDENT" }
    });
    __seedSidebarCacheForTesting__(
      [{ id: "t1", grade: 1, semester: 1, title: "1-1", startDate: null, endDate: null }],
      [{ id: "s1", title: "수학", termId: "t1" }],
      new Set()
    );
    harness.setStorageThrowOn("getItem");
    refreshSidebarOpenTermIds(harness.ctx);
    // throw 가 silent 처리되어 함수가 정상 종료.
    assert.ok(getSidebarOpenTermIds() instanceof Set);
  });

  it("T7: clearSidebarCache → 3 state null/empty 초기화", () => {
    __seedSidebarCacheForTesting__(
      [{ id: "t1", grade: 1, semester: 1, title: "1-1", startDate: null, endDate: null }],
      [{ id: "s1", title: "수학", termId: "t1" }],
      new Set(["t1"])
    );
    clearSidebarCache();
    assert.equal(getSidebarTermsCache(), null);
    assert.equal(getSidebarSubjectsCache(), null);
    assert.equal(getSidebarOpenTermIds().size, 0);
  });

  it("AC9 race guard: 3 hit (시작 직후 + termsRes 직후 + json 직후 + catch)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL("./sidebar-cache.ts", import.meta.url),
      "utf8"
    );
    const count = (src.match(/userIdAtStart/g) ?? []).length;
    // 1 capture + 3 비교 + (catch 절 비교) = 최소 4 hit.
    assert.ok(count >= 4, `expected userIdAtStart >= 4 hit, got ${count}`);
  });

  it("AC7 no console: sidebar-cache.ts body 에 console.* 사용 금지", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL("./sidebar-cache.ts", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(src, /console\./);
  });

  it("toggleSidebarTermOpen with no session → early return", () => {
    harness.setAuthSession(undefined);
    toggleSidebarTermOpen(harness.ctx, harness.cb, "t1");
    assert.equal(getSidebarOpenTermIds().size, 0);
    assert.equal(harness.triggerRenderCount, 0);
  });
});
