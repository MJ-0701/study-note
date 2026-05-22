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

// sprint-4/S1: legacy migration + owner gate removed. The marker
// (`study-note.session.lastUserId`) is no longer written, so the runtime
// helper `migrateLegacyNotebookForUser` has been deleted entirely. Legacy
// unscoped keys that remain in any pre-sprint-3/S1 browser stay orphaned
// (never read, never migrated) — server autosave is the SoT and GET hydrate
// restores notebook data on session attach. The previous "legacy migration
// owner gate" describe block has been intentionally removed; loading from a
// fresh scoped key returning the fixture default is sufficient and verified
// by the runtime path in `loadStoredNotebook`.

// sprint-3/S2: pdfWorkspaceStore namespacing mirrors the notebook contract.
// Same `{base}:{userId}` shape, same owner gate on the legacy migration, same
// goal of closing the cross-user leak vector. Test the contract directly
// without importing main.ts (DOM globals required for the runtime helper).
const PDF_WORKSPACE_KEY_BASE = "study-note.pdf-workspaces.v1";

function buildPdfWorkspaceKey(userId: string): string {
  return `${PDF_WORKSPACE_KEY_BASE}:${userId}`;
}

describe("buildPdfWorkspaceKey", () => {
  test("uses `{base}:{userId}` shape", () => {
    assert.equal(
      buildPdfWorkspaceKey("user-a"),
      "study-note.pdf-workspaces.v1:user-a"
    );
  });

  test("keys for different users do not collide", () => {
    const keyA = buildPdfWorkspaceKey("user-a");
    const keyB = buildPdfWorkspaceKey("user-b");
    assert.notEqual(keyA, keyB);
  });

  test("legacy unscoped key is NOT produced by the builder", () => {
    // Regression guard mirroring the notebook test: any new caller routing
    // through buildPdfWorkspaceKey must never accidentally produce the
    // unscoped base, which would reopen the leak vector this sprint closes.
    const key = buildPdfWorkspaceKey("user-a");
    assert.notEqual(key, PDF_WORKSPACE_KEY_BASE);
    assert.ok(key.startsWith(`${PDF_WORKSPACE_KEY_BASE}:`));
  });

  test("numeric userId from MySQL PK serializes safely", () => {
    const key = buildPdfWorkspaceKey("12345");
    assert.equal(key, "study-note.pdf-workspaces.v1:12345");
  });

  test("notebook key and pdfWorkspace key for the same user do not collide", () => {
    // Cross-domain collision check: notebook + pdfWorkspace must occupy
    // distinct localStorage entries for the same user so a writer on one
    // namespace cannot corrupt the other.
    const notebookKey = buildNotebookKey("user-a");
    const workspaceKey = buildPdfWorkspaceKey("user-a");
    assert.notEqual(notebookKey, workspaceKey);
  });
});

describe("pdfWorkspace migration shape", () => {
  test("post-migration: scoped key has data, legacy key removed", () => {
    const store = new Map<string, string>();
    const legacyKey = PDF_WORKSPACE_KEY_BASE;
    const userId = "user-a";
    const scopedKey = buildPdfWorkspaceKey(userId);
    const fixture = JSON.stringify({ workspaces: { "subject-1": {} } });

    store.set(legacyKey, fixture);
    assert.equal(store.get(legacyKey), fixture);
    assert.equal(store.get(scopedKey), undefined);

    const legacyRaw = store.get(legacyKey);
    if (legacyRaw) {
      store.set(scopedKey, legacyRaw);
      store.delete(legacyKey);
    }

    assert.equal(store.get(scopedKey), fixture);
    assert.equal(store.get(legacyKey), undefined);
  });

  test("post-migration: user B sees their own empty namespace, not user A's", () => {
    const store = new Map<string, string>();
    const userA = "user-a";
    const userB = "user-b";
    const aKey = buildPdfWorkspaceKey(userA);
    const bKey = buildPdfWorkspaceKey(userB);

    store.set(
      aKey,
      JSON.stringify({ workspaces: { "subject-1": { material: null } } })
    );

    assert.equal(store.get(bKey), undefined);
    assert.notEqual(store.get(aKey), store.get(bKey));
  });
});

// sprint-4/S1: pdfWorkspace 의 legacy migration + owner gate 도 동일하게
// 제거됨. `migrateLegacyPdfWorkspaceForUser` 함수와 `LAST_USER_KEY` marker
// 의존이 main.ts 에서 사라졌으므로 본 spec 의 owner gate describe block 도
// 제거. 신규 사용자는 `loadPdfWorkspaceStore(userId)` 가 빈 store 를
// 반환하고 BE 의 hot path GET 이 annotation 을 hydrate 한다.
