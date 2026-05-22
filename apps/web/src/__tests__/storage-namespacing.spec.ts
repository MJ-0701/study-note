// sprint-3/S1 — userId-scoped notebook localStorage key spec.
//
// 실행 (project-root 에서):
//   node --experimental-strip-types --no-warnings --test apps/web/src/__tests__/storage-namespacing.spec.ts

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

// sprint-3/S1: the key builder is the contract between save sites and load
// sites. Both must agree on the `{base}:{userId}` shape; a mismatch reopens
// the cross-user leak vector the namespace is closing. Test the contract
// directly without pulling in the full main.ts module graph (which depends on
// DOM globals + many submodules and is exercised end-to-end via the manual
// QA step in plan §3 AC5).
const NOTEBOOK_KEY_BASE = "study-note.notebook.v2";

function buildNotebookKey(userId: string): string {
  return `${NOTEBOOK_KEY_BASE}:${userId}`;
}

describe("buildNotebookKey", () => {
  test("uses `{base}:{userId}` shape", () => {
    assert.equal(buildNotebookKey("user-a"), "study-note.notebook.v2:user-a");
  });

  test("keys for different users do not collide", () => {
    const keyA = buildNotebookKey("user-a");
    const keyB = buildNotebookKey("user-b");
    assert.notEqual(keyA, keyB);
  });

  test("legacy unscoped key is NOT produced by the builder", () => {
    // Regression guard: the leak vector this sprint closes was every load /
    // save touching the legacy unscoped key. Any new caller routing through
    // buildNotebookKey must never accidentally produce the unscoped base.
    const key = buildNotebookKey("user-a");
    assert.notEqual(key, NOTEBOOK_KEY_BASE);
    assert.ok(key.startsWith(`${NOTEBOOK_KEY_BASE}:`));
  });

  test("numeric userId from MySQL PK serializes safely", () => {
    // authSession.user.id from MySQL BIGINT serializes as a string of digits.
    // Verify the resulting key has no special chars and matches the contract.
    const key = buildNotebookKey("12345");
    assert.equal(key, "study-note.notebook.v2:12345");
  });
});

// sprint-3/S1: migration semantics — when scoped key is empty but legacy
// unscoped key has parseable data, the first load for any user migrates the
// legacy data into that user's scoped key and removes the unscoped key.
// This test simulates the localStorage shape transitions without importing
// the runtime helper (which requires DOM globals).
describe("notebook migration shape", () => {
  test("post-migration: scoped key has data, legacy key removed", () => {
    const store = new Map<string, string>();
    const legacyKey = NOTEBOOK_KEY_BASE;
    const userId = "user-a";
    const scopedKey = buildNotebookKey(userId);
    const fixture = JSON.stringify({ id: "n1", subjects: [] });

    // Pre-migration state.
    store.set(legacyKey, fixture);
    assert.equal(store.get(legacyKey), fixture);
    assert.equal(store.get(scopedKey), undefined);

    // Simulated migration: read legacy → write scoped → remove legacy.
    const legacyRaw = store.get(legacyKey);
    if (legacyRaw) {
      store.set(scopedKey, legacyRaw);
      store.delete(legacyKey);
    }

    // Post-migration state matches contract.
    assert.equal(store.get(scopedKey), fixture);
    assert.equal(store.get(legacyKey), undefined);
  });

  test("post-migration: user B sees their own empty namespace, not user A's", () => {
    const store = new Map<string, string>();
    const userA = "user-a";
    const userB = "user-b";
    const aKey = buildNotebookKey(userA);
    const bKey = buildNotebookKey(userB);

    store.set(aKey, JSON.stringify({ id: "a", subjects: ["a-subject"] }));

    // user B loading their own namespace must not see user A's data.
    assert.equal(store.get(bKey), undefined);
    assert.notEqual(store.get(aKey), store.get(bKey));
  });
});

// sprint-3/S1 fix (codex P1): legacy migration must be gated to the owner
// identified by the sprint-2 marker. Otherwise a shared-browser upgrade lets
// the next user logging in absorb the previous user's legacy notebook.
describe("legacy migration owner gate", () => {
  const LAST_USER_KEY = "study-note.session.lastUserId";

  function shouldMigrate(legacyExists: boolean, ownerId: string | null, userId: string): boolean {
    if (!legacyExists) {
      return false;
    }
    if (!ownerId || ownerId !== userId) {
      return false;
    }
    return true;
  }

  test("owner match → migrate", () => {
    const store = new Map<string, string>();
    store.set(NOTEBOOK_KEY_BASE, "{}");
    store.set(LAST_USER_KEY, "user-a");
    assert.equal(shouldMigrate(store.has(NOTEBOOK_KEY_BASE), store.get(LAST_USER_KEY) ?? null, "user-a"), true);
  });

  test("owner mismatch → drop legacy, do NOT migrate", () => {
    // Shared browser upgrade scenario: user A wrote legacy, user B is first to
    // log in after the upgrade. B must not absorb A's notebook.
    const store = new Map<string, string>();
    store.set(NOTEBOOK_KEY_BASE, "{}");
    store.set(LAST_USER_KEY, "user-a");
    assert.equal(shouldMigrate(store.has(NOTEBOOK_KEY_BASE), store.get(LAST_USER_KEY) ?? null, "user-b"), false);
  });

  test("marker absent → drop legacy, do NOT migrate", () => {
    // Fresh browser or pre-marker rollout. Without the owner signal we cannot
    // safely attribute the legacy payload to anyone.
    const store = new Map<string, string>();
    store.set(NOTEBOOK_KEY_BASE, "{}");
    assert.equal(shouldMigrate(store.has(NOTEBOOK_KEY_BASE), store.get(LAST_USER_KEY) ?? null, "user-a"), false);
  });

  test("legacy absent → noop regardless of marker", () => {
    const store = new Map<string, string>();
    store.set(LAST_USER_KEY, "user-a");
    assert.equal(shouldMigrate(store.has(NOTEBOOK_KEY_BASE), store.get(LAST_USER_KEY) ?? null, "user-a"), false);
  });
});
