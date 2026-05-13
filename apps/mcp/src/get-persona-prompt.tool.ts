// slice-3 — get_persona_prompt MCP tool.
//
// API contract (slice-3 spec §1.2 lock):
//   input  = { subject: string (regex ^[a-z][a-z0-9-]{0,63}$) }
//   output = MCP CallToolResult { content: [{ type: "text", text: JSON.stringify({subject, personaName, tonePolicy, systemPrompt}) }] }
//   error semantics:
//     subject format violation  → McpError(InvalidParams=-32602) + { errorCode: "INVALID_INPUT", field: "subject" }
//     subject not in SUPPORTED_PERSONAS → McpError(InvalidParams=-32602) + { errorCode: "UNSUPPORTED_SUBJECT" }
//     resolvedOwnerId null (runtime fail-closed) → McpError(InternalError=-32603) + { errorCode: "OWNER_UNRESOLVED" }

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { PersonaService } from "@study-note/persona-engine";

export const GET_PERSONA_PROMPT_TOOL_NAME = "get_persona_prompt";

export const GET_PERSONA_PROMPT_INPUT_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      pattern: "^[a-z][a-z0-9-]{0,63}$",
      description: "Subject slug (digital-engineering 등). Lowercase letters/digits/hyphen."
    }
  },
  required: ["subject"],
  additionalProperties: false
} as const;

const SUBJECT_RE = /^[a-z][a-z0-9-]{0,63}$/;

export interface GetPersonaPromptInput {
  subject: string;
}

export interface GetPersonaPromptOutput {
  subject: string;
  personaName: string;
  tonePolicy: string;
  systemPrompt: string;
}

/** Internal = pure validation + persona lookup + output marshal. throws McpError. */
export function executeGetPersonaPrompt(
  persona: Pick<PersonaService, "archetypeFor" | "systemPromptFor">,
  input: GetPersonaPromptInput,
  ownerId: string
): GetPersonaPromptOutput {
  // Runtime fail-closed guard (defensive — ownerId should always be set after start-time validate)
  if (!ownerId) {
    throw new McpError(ErrorCode.InternalError, "owner not resolved", { errorCode: "OWNER_UNRESOLVED" });
  }

  // subject format validation
  if (typeof input.subject !== "string" || !SUBJECT_RE.test(input.subject)) {
    throw new McpError(ErrorCode.InvalidParams, "subject: must match ^[a-z][a-z0-9-]{0,63}$", {
      errorCode: "INVALID_INPUT",
      field: "subject"
    });
  }

  const archetype = persona.archetypeFor(input.subject);
  if (!archetype) {
    throw new McpError(ErrorCode.InvalidParams, `subject not supported: ${input.subject}`, {
      errorCode: "UNSUPPORTED_SUBJECT"
    });
  }

  const systemPrompt = persona.systemPromptFor(archetype);
  return {
    subject: archetype.subject,
    personaName: archetype.name,
    tonePolicy: archetype.tonePolicy,
    systemPrompt
  };
}

/** MCP tool registration handler — returns CallToolResult shape. */
export function makeGetPersonaPromptHandler(
  persona: Pick<PersonaService, "archetypeFor" | "systemPromptFor">,
  ownerId: string
) {
  return (args: GetPersonaPromptInput) => {
    const out = executeGetPersonaPrompt(persona, args, ownerId);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(out)
        }
      ]
    };
  };
}
