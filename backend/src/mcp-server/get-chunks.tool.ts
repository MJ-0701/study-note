// sprint-2 plan §3 AC5+AC6 — get_chunks MCP tool.
//
// API contract (plan AC6 lock):
//   input  = { subject: string (regex ^[a-z][a-z0-9-]{0,63}$), query: string (1..2000), k?: number (1..20, default 5) }
//   output = MCP CallToolResult { content: [{ type: "text", text: JSON.stringify({chunks, retrievedCount}) }] }
//   chunks = [{ ord, corpusId, text, sourcePdfPath (basename only), score }] (score desc, k 만큼)
//   empty result = { chunks: [], retrievedCount: 0 } (success, error 아님)
//   error semantics:
//     invalid input → throw McpError(InvalidParams=-32602) + { errorCode: "INVALID_INPUT", field, errorMessage }
//     retrieval throw → throw McpError(InternalError=-32603) + { errorCode: "RETRIEVAL_FAILED", errorMessage }
//   safe path: sourcePdfPath = basename(corpus.sourcePdfPath) — 절대 경로 노출 0

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { basename } from "node:path";
import type { RetrievalService, RetrievedChunk } from "../persona/services/retrieval.service";

export const GET_CHUNKS_TOOL_NAME = "get_chunks";

export const GET_CHUNKS_INPUT_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      pattern: "^[a-z][a-z0-9-]{0,63}$",
      description: "Subject slug. Lowercase letters/digits/hyphen, 1..64 chars, leading letter."
    },
    query: {
      type: "string",
      minLength: 1,
      maxLength: 2000,
      description: "Free-text query for cosine retrieval."
    },
    k: {
      type: "integer",
      minimum: 1,
      maximum: 20,
      default: 5,
      description: "Top-K chunks to return (1..20)."
    }
  },
  required: ["subject", "query"],
  additionalProperties: false
} as const;

const SUBJECT_RE = /^[a-z][a-z0-9-]{0,63}$/;

export interface GetChunksInput {
  subject: string;
  query: string;
  k?: number;
}

export interface GetChunksOutputChunk {
  ord: number;
  corpusId: string;
  text: string;
  sourcePdfPath: string;
  score: number;
}

export interface GetChunksOutput {
  chunks: GetChunksOutputChunk[];
  retrievedCount: number;
}

/** Internal = pure validation + retrieval call + safe-path mapping. throws McpError. */
export async function executeGetChunks(
  retrieval: Pick<RetrievalService, "retrieveTopK">,
  input: GetChunksInput
): Promise<GetChunksOutput> {
  // input validation (AC6 lock)
  if (typeof input.subject !== "string" || !SUBJECT_RE.test(input.subject)) {
    throw new McpError(ErrorCode.InvalidParams, "subject: must match ^[a-z][a-z0-9-]{0,63}$", {
      errorCode: "INVALID_INPUT",
      field: "subject"
    });
  }
  const query = (input.query ?? "").trim();
  if (query.length < 1 || query.length > 2000) {
    throw new McpError(ErrorCode.InvalidParams, "query: must be 1..2000 chars after trim", {
      errorCode: "INVALID_INPUT",
      field: "query"
    });
  }
  const k = input.k ?? 5;
  if (!Number.isInteger(k) || k < 1 || k > 20) {
    throw new McpError(ErrorCode.InvalidParams, "k: must be integer 1..20", {
      errorCode: "INVALID_INPUT",
      field: "k"
    });
  }

  let retrieved: RetrievedChunk[];
  try {
    retrieved = await retrieval.retrieveTopK({ subject: input.subject, queryText: query, k });
  } catch (err) {
    throw new McpError(
      ErrorCode.InternalError,
      err instanceof Error ? err.message : "retrieval failure",
      { errorCode: "RETRIEVAL_FAILED" }
    );
  }

  const chunks: GetChunksOutputChunk[] = retrieved.map((c) => ({
    ord: c.ord,
    corpusId: c.corpusId,
    text: c.text,
    sourcePdfPath: safeBasename(c.sourcePdfPath),
    score: c.score
  }));
  return { chunks, retrievedCount: chunks.length };
}

/** sprint-1 conversation.service 와 동일 safe-path policy: basename only, 절대 경로 0. */
function safeBasename(p: string): string {
  if (!p) return "<unknown>";
  if (p.startsWith("smoke://")) return p.replace("smoke://", "");
  return basename(p);
}

/** MCP tool registration handler — McpServer.registerTool 의 callback. */
export function makeGetChunksHandler(retrieval: Pick<RetrievalService, "retrieveTopK">) {
  return async (args: GetChunksInput) => {
    const out = await executeGetChunks(retrieval, args);
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
