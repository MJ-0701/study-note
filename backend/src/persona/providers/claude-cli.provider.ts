import { Injectable } from "@nestjs/common";
import { spawn as nodeSpawn, ChildProcessWithoutNullStreams } from "node:child_process";
import {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider
} from "./llm-provider.port";

export const CLAUDE_CLI_DEFAULT_TIMEOUT_MS = 30_000;
const CLAUDE_CLI_COMMAND = "claude";
const CLAUDE_CLI_ARGS = ["-p", "--dangerously-skip-permissions"];

export type SpawnFn = typeof nodeSpawn;

export interface FixtureContext {
  retrievalCount: number;
  queryText: string;
  k: number;
}

/**
 * Provider routing rule (plan §1.5.4 / R7 SSoT):
 *   1) STUDY_NOTE_LLM_FIXTURE=1            → fixture (top precedence).
 *   2) STUDY_NOTE_LLM_REAL_OPT_IN=1 (and !1) → real Claude CLI subprocess.
 *   3) neither set                          → fixture (default — Anthropic 송신 0).
 */
export function resolveProviderMode(env = process.env): "fixture" | "real" {
  if (env.STUDY_NOTE_LLM_FIXTURE === "1") return "fixture";
  if (env.STUDY_NOTE_LLM_REAL_OPT_IN === "1") return "real";
  return "fixture";
}

export function buildFixtureRawResponse(ctx: FixtureContext): string {
  if (ctx.retrievalCount === 0) {
    return `FIXTURE: 출처가 없어 임의 teaching 거부. 사용자에게 npm run ingest:pdf 안내. (queryText=${ctx.queryText})`;
  }
  return `FIXTURE: 답변 내용 placeholder. 시험 핵심 우선순위로 짚어줘. 사용자 수준 모를 때 먼저 쉬운 질문 던지기. (queryText=${ctx.queryText}, k=${ctx.k})`;
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
  generateFixture(input: LlmGenerateInput, ctx: FixtureContext): LlmGenerateResult {
    return {
      text: buildFixtureRawResponse(ctx),
      provider: "claude-cli-fixture",
      modelName: "claude-cli@stub-fixture"
    };
  }

  private generateReal(input: LlmGenerateInput): Promise<LlmGenerateResult> {
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
            `claude CLI timed out after ${this.timeoutMs}ms. last stderr: ${stderr.split("\n")[0] ?? ""}`
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
          const firstStderrLine = stderr.split("\n")[0] ?? "";
          reject(
            new Error(`claude CLI exited ${code}. stderr: ${firstStderrLine}`)
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

      const stdinPayload = `${input.systemPrompt}\n\nUser question: ${input.userMessage}\n`;
      child.stdin.write(stdinPayload);
      child.stdin.end();
    });
  }
}
