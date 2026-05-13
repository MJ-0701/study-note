import { strict as assert } from "node:assert";
import { describe, it, beforeEach, afterEach } from "node:test";
import { resolveOwnerOrExit, type UserLookupClient } from "../owner.env";

// slice-3 spec §4.1 — resolveOwnerOrExit unit test.
// process.exit mock: injectable deps pattern (exit + stderrWrite functions passed in test).
// This avoids monkey-patching globals and keeps tests isolated.

function makePrismaStub(result: { id: string; devUserFlag: boolean } | null | "throw"): UserLookupClient {
  return {
    user: {
      async findFirst() {
        if (result === "throw") throw new Error("DB down");
        return result;
      }
    }
  };
}

interface ExitCapture {
  calledWith: number | null;
  stderrMessages: string[];
  exit: (code: number) => never;
  stderrWrite: (msg: string) => void;
}

function makeExitCapture(): ExitCapture {
  const capture: ExitCapture = {
    calledWith: null,
    stderrMessages: [],
    exit: (code: number): never => {
      capture.calledWith = code;
      // Throw to stop execution (instead of actually exiting)
      throw new ExitCalled(code);
    },
    stderrWrite: (msg: string) => {
      capture.stderrMessages.push(msg);
    }
  };
  return capture;
}

class ExitCalled extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
  }
}

// Save + restore env between tests
let savedEnv: NodeJS.ProcessEnv;
beforeEach(() => {
  savedEnv = { ...process.env };
});
afterEach(() => {
  // Restore original env
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, val] of Object.entries(savedEnv)) {
    process.env[key] = val;
  }
});

describe("resolveOwnerOrExit — env missing (case 2)", () => {
  it("exits 1 with 'missing' message when STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER not set", async () => {
    delete process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER;
    delete process.env.STUDY_NOTE_AUTH_DEV_ENABLED;

    const capture = makeExitCapture();
    const prisma = makePrismaStub(null);

    await assert.rejects(
      () => resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite }),
      ExitCalled
    );

    assert.equal(capture.calledWith, 1);
    assert.ok(
      capture.stderrMessages.some(m => m.includes("STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER missing")),
      `expected missing message, got: ${capture.stderrMessages.join("|")}`
    );
    // PII guard: student number must NOT appear in stderr
    assert.ok(!capture.stderrMessages.some(m => m.includes("20260001")));
  });
});

describe("resolveOwnerOrExit — format invalid (case 3)", () => {
  it("exits 1 with 'format invalid' message for non-8-digit value", async () => {
    process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER = "abc1234";
    delete process.env.STUDY_NOTE_AUTH_DEV_ENABLED;

    const capture = makeExitCapture();
    const prisma = makePrismaStub(null);

    await assert.rejects(
      () => resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite }),
      ExitCalled
    );

    assert.equal(capture.calledWith, 1);
    assert.ok(
      capture.stderrMessages.some(m => m.includes("STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER format invalid")),
      `expected format invalid message, got: ${capture.stderrMessages.join("|")}`
    );
    // PII: raw value must not echo
    assert.ok(!capture.stderrMessages.some(m => m.includes("abc1234")));
  });
});

describe("resolveOwnerOrExit — user not found (case 4)", () => {
  it("exits 1 with 'owner student number not authorized' for missing user", async () => {
    process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER = "20269999";
    delete process.env.STUDY_NOTE_AUTH_DEV_ENABLED;

    const capture = makeExitCapture();
    const prisma = makePrismaStub(null); // findFirst returns null

    await assert.rejects(
      () => resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite }),
      ExitCalled
    );

    assert.equal(capture.calledWith, 1);
    assert.ok(
      capture.stderrMessages.some(m => m.includes("owner student number not authorized")),
      `expected not authorized message, got: ${capture.stderrMessages.join("|")}`
    );
    // PII: student number must not echo
    assert.ok(!capture.stderrMessages.some(m => m.includes("20269999")));
  });
});

describe("resolveOwnerOrExit — devUserFlag=false (case 5)", () => {
  it("exits 1 with same 'owner student number not authorized' (no info leak between case 4 and 5)", async () => {
    process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER = "20269998";
    delete process.env.STUDY_NOTE_AUTH_DEV_ENABLED;

    const capture = makeExitCapture();
    const prisma = makePrismaStub({ id: "cuserdev3000000000000000000", devUserFlag: false });

    await assert.rejects(
      () => resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite }),
      ExitCalled
    );

    assert.equal(capture.calledWith, 1);
    assert.ok(
      capture.stderrMessages.some(m => m.includes("owner student number not authorized")),
      `expected not authorized message, got: ${capture.stderrMessages.join("|")}`
    );
    // PII: student number must not echo
    assert.ok(!capture.stderrMessages.some(m => m.includes("20269998")));
  });
});

describe("resolveOwnerOrExit — AUTH_DEV_ENABLED=false blocks MCP (case 1)", () => {
  it("exits 1 with AUTH_DEV_DISABLED message when STUDY_NOTE_AUTH_DEV_ENABLED=false", async () => {
    process.env.STUDY_NOTE_AUTH_DEV_ENABLED = "false";
    process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER = "20260001";

    const capture = makeExitCapture();
    const prisma = makePrismaStub({ id: "cuserdev1000000000000000000", devUserFlag: true });

    await assert.rejects(
      () => resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite }),
      ExitCalled
    );

    assert.equal(capture.calledWith, 1);
    assert.ok(
      capture.stderrMessages.some(m => m.includes("AUTH_DEV_DISABLED")),
      `expected AUTH_DEV_DISABLED message, got: ${capture.stderrMessages.join("|")}`
    );
  });
});

describe("resolveOwnerOrExit — happy path", () => {
  it("returns { ownerId } when all checks pass (devUserFlag=true, format valid)", async () => {
    process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER = "20260001";
    delete process.env.STUDY_NOTE_AUTH_DEV_ENABLED;

    const capture = makeExitCapture();
    const prisma = makePrismaStub({ id: "cuserdev1000000000000000000", devUserFlag: true });

    const result = await resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite });

    assert.equal(capture.calledWith, null, "exit should not have been called");
    assert.equal(result.ownerId, "cuserdev1000000000000000000");
    // Log: userId is OK in stderr; studentNumber must NOT appear
    assert.ok(!capture.stderrMessages.some(m => m.includes("20260001")));
    assert.ok(
      capture.stderrMessages.some(m => m.includes("owner resolved")),
      `expected 'owner resolved' log, got: ${capture.stderrMessages.join("|")}`
    );
  });

  it("treats STUDY_NOTE_AUTH_DEV_ENABLED=true (not 'false') as enabled", async () => {
    process.env.STUDY_NOTE_AUTH_DEV_ENABLED = "true";
    process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER = "20260001";

    const capture = makeExitCapture();
    const prisma = makePrismaStub({ id: "cuserdev1000000000000000000", devUserFlag: true });

    const result = await resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite });

    assert.equal(capture.calledWith, null, "exit should not have been called");
    assert.equal(result.ownerId, "cuserdev1000000000000000000");
  });
});

describe("resolveOwnerOrExit — DB error", () => {
  it("exits 1 with not-authorized message when Prisma throws", async () => {
    process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER = "20260001";
    delete process.env.STUDY_NOTE_AUTH_DEV_ENABLED;

    const capture = makeExitCapture();
    const prisma = makePrismaStub("throw");

    await assert.rejects(
      () => resolveOwnerOrExit(prisma, { exit: capture.exit, stderrWrite: capture.stderrWrite }),
      ExitCalled
    );

    assert.equal(capture.calledWith, 1);
    assert.ok(
      capture.stderrMessages.some(m => m.includes("owner student number not authorized")),
      `expected not authorized message, got: ${capture.stderrMessages.join("|")}`
    );
  });
});
