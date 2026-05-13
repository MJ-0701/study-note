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
import type { RetrievalService, RetrievedChunk } from "@study-note/persona-engine";

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
  if (typeof input.query !== "string") {
    throw new McpError(ErrorCode.InvalidParams, "query: must be a string", {
      errorCode: "INVALID_INPUT",
      field: "query"
    });
  }
  const query = input.query.trim();
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
    // sprint-2 Gate 6 round 1 F1 — DO NOT leak err.message over MCP wire (DB/config/path leak risk).
    // round 2 F2 — stderr 도 opt-in only. default = generic, env `STUDY_NOTE_MCP_VERBOSE_ERRORS=1` 일 때만 detail.
    if (process.env.STUDY_NOTE_MCP_VERBOSE_ERRORS === "1") {
      process.stderr.write(
        `[get_chunks] retrieval failure (verbose opt-in): ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`
      );
    } else {
      process.stderr.write("[get_chunks] retrieval failure (set STUDY_NOTE_MCP_VERBOSE_ERRORS=1 for detail)\n");
    }
    throw new McpError(
      ErrorCode.InternalError,
      "retrieval failure",
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

/** Strict basename-only policy: scheme strip + posix/windows separator 둘 다, 절대 경로 0 leak.
 *  Gate 6 round 1 F2 — `smoke:///abs/path/file.pdf` 같은 input.
 *  Gate 6 round 2 F3 — Windows `C:\\Users\\mj\\private\\file.pdf` 같은 input. */
function safeBasename(p: string): string {
  if (!p) return "<unknown>";
  // strip any URL-like scheme (smoke://, file://, http://, etc.)
  const noScheme = p.replace(/^[a-z][a-z0-9+.-]*:\/+/i, "");
  // strip Windows drive letter prefix (C:, D:)
  const noDrive = noScheme.replace(/^[a-z]:[\\/]+/i, "");
  // last component after either / or \
  const parts = noDrive.split(/[\\/]+/);
  const last = parts[parts.length - 1] ?? noDrive;
  return last.length > 0 ? last : "<unknown>";
}

/** MCP tool registration handler — McpServer.registerTool 의 callback.
 *  ownerId: resolved at start-time by resolveOwnerOrExit. Defensive guard for runtime null. */
export function makeGetChunksHandler(
  retrieval: Pick<RetrievalService, "retrieveTopK">,
  ownerId: string
) {
  return async (args: GetChunksInput) => {
    // Defensive runtime fail-closed (ownerId should always be non-empty after start-time validate)
    if (!ownerId) {
      throw new McpError(ErrorCode.InternalError, "owner not resolved", { errorCode: "OWNER_UNRESOLVED" });
    }
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
