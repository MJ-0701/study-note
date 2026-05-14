import { Injectable } from "@nestjs/common";
import { spawn as nodeSpawn, ChildProcessWithoutNullStreams } from "node:child_process";
import {
  assertNoUnsafeCliArgs,
  buildAgentCliStdin,
  buildFixtureRawResponse,
  type FixtureContext,
  redactedProviderError,
  type SpawnFn
} from "./agent-cli.shared";
import {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider
} from "./llm-provider.port";
export { buildFixtureRawResponse, type FixtureContext, redactedProviderError } from "./agent-cli.shared";
export { resolveProviderMode } from "./llm-routing";

export const CLAUDE_CLI_DEFAULT_TIMEOUT_MS = 90_000;
const CLAUDE_CLI_COMMAND = "claude";
const CLAUDE_CLI_ARGS = ["-p"];
const DANGEROUS_CLAUDE_ARGS = new Set([
  "--dangerously-skip-permissions",
  "--permission-mode",
  "bypassPermissions"
]);

export function buildClaudeCliStdin(input: LlmGenerateInput): string {
  return buildAgentCliStdin(input);
}

export function assertSafeClaudeArgs(args: readonly string[]): void {
  assertNoUnsafeCliArgs(
    args,
    DANGEROUS_CLAUDE_ARGS,
    "unsafe Claude CLI permission mode is not allowed for backend real mode"
  );
}

@Injectable()
export class ClaudeCliProvider implements LlmProvider {
  private readonly spawnFn: SpawnFn;
  private readonly timeoutMs: number;

  constructor(spawnFn: SpawnFn = nodeSpawn, timeoutMs?: number) {
    this.spawnFn = spawnFn;
    const envTimeout = Number.parseInt(
      process.env.STUDY_NOTE_LLM_TIMEOUT_MS ?? "",
      10
    );
    this.timeoutMs =
      timeoutMs ?? (Number.isFinite(envTimeout) && envTimeout > 0
        ? envTimeout
        : CLAUDE_CLI_DEFAULT_TIMEOUT_MS);
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    return this.generateReal(input);
  }

  /**
   * Generate a fixture response. Caller is responsible for routing —
   * PersonaTurnService consults resolveProviderMode() and calls either
   * generateFixture or generate (real). FixtureContext supplies the
   * retrieval metadata that fixture body echoes deterministically.
   */
  generateFixture(_input: LlmGenerateInput, ctx: FixtureContext): LlmGenerateResult {
    return {
      text: buildFixtureRawResponse(ctx),
      provider: "claude-cli-fixture",
      modelName: "claude-cli@stub-fixture"
    };
  }

  private generateReal(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    assertSafeClaudeArgs(CLAUDE_CLI_ARGS);
    return new Promise<LlmGenerateResult>((resolve, reject) => {
      const child = this.spawnFn(CLAUDE_CLI_COMMAND, CLAUDE_CLI_ARGS, {
        stdio: ["pipe", "pipe", "pipe"]
      }) as ChildProcessWithoutNullStreams;

      let stdout = "";
      let stderr = "";
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore kill failures
        }
        reject(
          new Error(
            `claude CLI timed out after ${this.timeoutMs}ms. stderr: ${redactedProviderError(stderr)}`
          )
        );
      }, this.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new Error(`claude CLI exited ${code}. stderr: ${redactedProviderError(stderr)}`)
          );
          return;
        }
        resolve({
          text: stdout,
          provider: "claude-cli",
          modelName:
            process.env.STUDY_NOTE_LLM_MODEL_TAG ?? "claude-cli@unspecified"
        });
      });

      child.stdin.write(buildClaudeCliStdin(input));
      child.stdin.end();
    });
  }
}
