// slice-3 — start-time env validation + owner resolution.
//
// resolveOwnerOrExit() is called once in main() after NestApplicationContext boot.
// It validates env, looks up the Prisma User row, and returns the resolved ownerId (cuid).
// Any validation failure writes to stderr and calls exit(1).
//
// Injectable exit + stderr params make the helper testable without monkey-patching globals.

/** Minimal Prisma-like interface needed for user lookup. */
export interface UserLookupClient {
  user: {
    findFirst: (args: { where: { studentNumber: string } }) => Promise<{ id: string; devUserFlag: boolean } | null>;
  };
}

export interface OwnerEnvDeps {
  exit?: (code: number) => never;
  stderrWrite?: (msg: string) => void;
}

const STUDENT_NUMBER_RE = /^\d{8}$/;

/** Validates env + looks up Prisma User. Returns { ownerId } on success; calls exit(1) on failure. */
export async function resolveOwnerOrExit(
  prisma: UserLookupClient,
  deps: OwnerEnvDeps = {}
): Promise<{ ownerId: string }> {
  const exit = deps.exit ?? ((code: number): never => process.exit(code));
  const stderr = deps.stderrWrite ?? ((msg: string) => process.stderr.write(msg));

  // Check 1: STUDY_NOTE_AUTH_DEV_ENABLED === "false" → MCP also blocked
  if (process.env.STUDY_NOTE_AUTH_DEV_ENABLED === "false") {
    stderr("[mcp-server] AUTH_DEV_DISABLED: sign-in disabled — MCP also blocked\n");
    return exit(1);
  }

  // Check 2: STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER missing / empty
  const raw = process.env.STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER ?? "";
  if (!raw || raw.trim() === "") {
    stderr("[mcp-server] STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER missing\n");
    return exit(1);
  }

  // Check 3: format ^\d{8}$
  if (!STUDENT_NUMBER_RE.test(raw)) {
    stderr("[mcp-server] STUDY_NOTE_MCP_OWNER_STUDENT_NUMBER format invalid\n");
    // PII guard: do NOT echo raw value
    return exit(1);
  }

  // Check 4+5: Prisma lookup — missing user or devUserFlag=false → same generic message (no info leak)
  let user: { id: string; devUserFlag: boolean } | null;
  try {
    user = await prisma.user.findFirst({ where: { studentNumber: raw } });
  } catch {
    // DB error — treat as owner not authorized (no detail leak)
    stderr("[mcp-server] owner student number not authorized\n");
    return exit(1);
  }

  if (!user || !user.devUserFlag) {
    // DO NOT differentiate "not found" vs "flag false" (info leak prevention)
    stderr("[mcp-server] owner student number not authorized\n");
    return exit(1);
  }

  const ownerId = user.id;
  // ownerId (cuid) is not PII — log it
  stderr(`[mcp-server] owner resolved (userId=${ownerId})\n`);
  return { ownerId };
}
