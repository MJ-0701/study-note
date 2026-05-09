// LLM routing spec: real agent 선택이 Claude 고정이 아님을 고정한다.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { resolveLlmAgent } from "../llm-routing";

describe("resolveLlmAgent", () => {
  it("keeps claude-cli as backward-compatible default", () => {
    assert.equal(resolveLlmAgent({} as NodeJS.ProcessEnv), "claude-cli");
  });

  it("accepts explicit request agent over env", () => {
    assert.equal(
      resolveLlmAgent({ STUDY_NOTE_LLM_AGENT: "claude-cli" } as NodeJS.ProcessEnv, "gemini-cli"),
      "gemini-cli"
    );
  });

  it("accepts STUDY_NOTE_LLM_AGENT=gemini-cli", () => {
    assert.equal(
      resolveLlmAgent({ STUDY_NOTE_LLM_AGENT: "gemini-cli" } as NodeJS.ProcessEnv),
      "gemini-cli"
    );
  });

  it("rejects unsupported env agent ids", () => {
    assert.throws(
      () => resolveLlmAgent({ STUDY_NOTE_LLM_AGENT: "hardcoded-claude-only" } as NodeJS.ProcessEnv),
      /unsupported LLM agent/
    );
  });
});
