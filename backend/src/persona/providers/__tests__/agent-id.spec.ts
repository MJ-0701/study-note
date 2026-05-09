import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  isModelTag,
  isProviderId,
  modelTagFromProvider,
  providerIdFromAgent
} from "../agent-id";

// sprint-2 plan §3 AC1 — agent-id.ts mapping helper round-trip + invalid input throw.

describe("providerIdFromAgent", () => {
  it("real → base id (claude-cli)", () => {
    assert.equal(providerIdFromAgent("claude-cli", "real"), "claude-cli");
  });
  it("fixture → -fixture variant (claude-cli-fixture)", () => {
    assert.equal(providerIdFromAgent("claude-cli", "fixture"), "claude-cli-fixture");
  });
  it("real → base id (gemini-cli)", () => {
    assert.equal(providerIdFromAgent("gemini-cli", "real"), "gemini-cli");
  });
  it("fixture → -fixture variant (gemini-cli-fixture)", () => {
    assert.equal(providerIdFromAgent("gemini-cli", "fixture"), "gemini-cli-fixture");
  });
  it("throws on unknown agent", () => {
    assert.throws(
      () => providerIdFromAgent("openai-cli" as never, "real"),
      /unknown agent/
    );
  });
});

describe("modelTagFromProvider", () => {
  it("composes provider@binaryTag", () => {
    const provider = providerIdFromAgent("claude-cli", "fixture");
    assert.equal(modelTagFromProvider(provider, "stub-fixture"), "claude-cli-fixture@stub-fixture");
  });
  it("accepts real provider + binary tag", () => {
    const provider = providerIdFromAgent("claude-cli", "real");
    assert.equal(modelTagFromProvider(provider, "claude-3-5-sonnet"), "claude-cli@claude-3-5-sonnet");
  });
  it("throws on invalid provider id", () => {
    assert.throws(
      () => modelTagFromProvider("openai-cli" as never, "v1"),
      /invalid provider id/
    );
  });
  it("throws on empty binary tag", () => {
    const provider = providerIdFromAgent("claude-cli", "real");
    assert.throws(() => modelTagFromProvider(provider, ""), /non-empty/);
  });
});

describe("isProviderId / isModelTag (backward compat — R3)", () => {
  it("recognizes sprint-1 stored strings", () => {
    assert.equal(isProviderId("claude-cli"), true);
    assert.equal(isProviderId("claude-cli-fixture"), true);
    assert.equal(isProviderId("gemini-cli"), true);
    assert.equal(isProviderId("gemini-cli-fixture"), true);
  });
  it("rejects invalid strings", () => {
    assert.equal(isProviderId("openai-cli"), false);
    assert.equal(isProviderId(""), false);
    assert.equal(isProviderId(undefined), false);
    assert.equal(isProviderId(null), false);
  });
  it("recognizes sprint-1 stored model tags", () => {
    assert.equal(isModelTag("claude-cli@stub-fixture"), true);
    assert.equal(isModelTag("claude-cli@claude-3-5-sonnet"), true);
    assert.equal(isModelTag("gemini-cli-fixture@stub-fixture"), true);
  });
  it("rejects malformed model tags", () => {
    assert.equal(isModelTag("claude-cli"), false); // no @
    assert.equal(isModelTag("@stub"), false);
    assert.equal(isModelTag(""), false);
  });
});
