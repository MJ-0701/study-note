import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import type { PersonaService } from "@study-note/persona-engine";
import { executeGetPersonaPrompt, makeGetPersonaPromptHandler } from "../get-persona-prompt.tool";

// slice-3 spec §1.2 — get_persona_prompt unit test (subject validation, persona lookup, error shapes).

const STUB_OWNER_ID = "ctest000000000000000000000";

function makePersonaStub(): Pick<PersonaService, "archetypeFor" | "systemPromptFor"> {
  return {
    archetypeFor(subject: string) {
      if (subject === "digital-engineering") {
        return {
          subject: "digital-engineering",
          name: "디공이",
          tonePolicy: "친근한 멘토 — 사용자가 모르는 가정, 먼저 쉬운 질문으로 수준 탐색 후 PDF 출처 명시하며 하나씩 짚어올림."
        };
      }
      return null;
    },
    systemPromptFor(archetype) {
      return `당신은 ${archetype.subject} 강의의 전용 AI 튜터 페르소나 "${archetype.name}" 입니다.`;
    }
  };
}

describe("get_persona_prompt tool — happy path", () => {
  it("returns {subject, personaName, tonePolicy, systemPrompt} for digital-engineering", () => {
    const persona = makePersonaStub();
    const out = executeGetPersonaPrompt(persona, { subject: "digital-engineering" }, STUB_OWNER_ID);

    assert.equal(out.subject, "digital-engineering");
    assert.equal(out.personaName, "디공이");
    assert.ok(out.tonePolicy.length > 0, "tonePolicy must be non-empty");
    assert.ok(out.systemPrompt.includes("digital-engineering"), "systemPrompt must reference subject");
    assert.ok(out.systemPrompt.includes("디공이"), "systemPrompt must reference personaName");
  });

  it("handler wrapper returns MCP CallToolResult with JSON text", () => {
    const persona = makePersonaStub();
    const handler = makeGetPersonaPromptHandler(persona, STUB_OWNER_ID);
    const result = handler({ subject: "digital-engineering" });

    assert.ok(Array.isArray(result.content) && result.content.length > 0);
    assert.equal(result.content[0]?.type, "text");
    const parsed = JSON.parse(result.content[0]?.text ?? "{}") as Record<string, string>;
    assert.equal(parsed["subject"], "digital-engineering");
    assert.equal(parsed["personaName"], "디공이");
    assert.ok("tonePolicy" in parsed, "output must have tonePolicy");
    assert.ok("systemPrompt" in parsed, "output must have systemPrompt");
  });
});

describe("get_persona_prompt tool — INVALID_INPUT (subject format violation)", () => {
  it("rejects subject with uppercase letter", () => {
    const persona = makePersonaStub();
    assert.throws(
      () => executeGetPersonaPrompt(persona, { subject: "Digital-Engineering" }, STUB_OWNER_ID),
      (err) => err instanceof McpError && err.code === -32602 && (err.data as { errorCode?: string })?.errorCode === "INVALID_INPUT"
    );
  });

  it("rejects subject with spaces", () => {
    const persona = makePersonaStub();
    assert.throws(
      () => executeGetPersonaPrompt(persona, { subject: "bad subject!" }, STUB_OWNER_ID),
      (err) => err instanceof McpError && err.code === -32602 && (err.data as { errorCode?: string })?.errorCode === "INVALID_INPUT"
    );
  });

  it("rejects subject starting with digit", () => {
    const persona = makePersonaStub();
    assert.throws(
      () => executeGetPersonaPrompt(persona, { subject: "1digital" }, STUB_OWNER_ID),
      (err) => err instanceof McpError && err.code === -32602 && (err.data as { errorCode?: string })?.errorCode === "INVALID_INPUT"
    );
  });
});

describe("get_persona_prompt tool — UNSUPPORTED_SUBJECT", () => {
  it("rejects a valid-format but unsupported subject", () => {
    const persona = makePersonaStub();
    assert.throws(
      () => executeGetPersonaPrompt(persona, { subject: "nonexistent-subject" }, STUB_OWNER_ID),
      (err) => err instanceof McpError && err.code === -32602 && (err.data as { errorCode?: string })?.errorCode === "UNSUPPORTED_SUBJECT"
    );
  });
});

describe("get_persona_prompt tool — OWNER_UNRESOLVED (defensive runtime guard)", () => {
  it("throws InternalError when ownerId is empty string (defensive null guard)", () => {
    const persona = makePersonaStub();
    assert.throws(
      () => executeGetPersonaPrompt(persona, { subject: "digital-engineering" }, ""),
      (err) => err instanceof McpError && err.code === -32603 && (err.data as { errorCode?: string })?.errorCode === "OWNER_UNRESOLVED"
    );
  });
});
