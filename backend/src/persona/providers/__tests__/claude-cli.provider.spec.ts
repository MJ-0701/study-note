import { strict as assert } from "node:assert";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  ClaudeCliProvider,
  buildFixtureRawResponse,
  resolveProviderMode
} from "../claude-cli.provider";

interface MockChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: { write: (s: string) => void; end: () => void; written: string };
  kill: (signal: string) => void;
  killed: boolean;
}

function makeMockChild(): MockChild {
  const child = new EventEmitter() as MockChild;
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  let written = "";
  child.stdout = stdout;
  child.stderr = stderr;
  child.stdin = {
    write: (s: string) => {
      written += s;
    },
    end: () => undefined,
    get written() {
      return written;
    }
  } as MockChild["stdin"];
  child.killed = false;
  child.kill = (_sig: string) => {
    child.killed = true;
  };
  return child;
}

const ENV_KEYS = ["STUDY_NOTE_LLM_FIXTURE", "STUDY_NOTE_LLM_REAL_OPT_IN"] as const;
let savedEnv: Record<string, string | undefined> = {};
beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("resolveProviderMode (routing rule)", () => {
  it("STUDY_NOTE_LLM_FIXTURE=1 → fixture (top precedence)", () => {
    assert.equal(
      resolveProviderMode({ STUDY_NOTE_LLM_FIXTURE: "1" } as NodeJS.ProcessEnv),
      "fixture"
    );
  });
  it("FIXTURE=1 wins over REAL_OPT_IN=1", () => {
    assert.equal(
      resolveProviderMode({
        STUDY_NOTE_LLM_FIXTURE: "1",
        STUDY_NOTE_LLM_REAL_OPT_IN: "1"
      } as NodeJS.ProcessEnv),
      "fixture"
    );
  });
  it("REAL_OPT_IN=1 alone → real", () => {
    assert.equal(
      resolveProviderMode({
        STUDY_NOTE_LLM_REAL_OPT_IN: "1"
      } as NodeJS.ProcessEnv),
      "real"
    );
  });
  it("neither set → fixture (default, no Anthropic send)", () => {
    assert.equal(resolveProviderMode({} as NodeJS.ProcessEnv), "fixture");
  });
});

describe("buildFixtureRawResponse", () => {
  it("Case A (retrievalCount > 0) — echoes queryText + k + invariant cue", () => {
    const out = buildFixtureRawResponse({ retrievalCount: 3, queryText: "반가산기", k: 3 });
    assert.match(out, /^FIXTURE:/);
    assert.match(out, /반가산기/);
    assert.match(out, /k=3/);
    assert.match(out, /시험 핵심 우선순위/);
    assert.match(out, /사용자 수준/);
  });
  it("Case B (retrievalCount === 0) — refuses teaching + ingest 안내", () => {
    const out = buildFixtureRawResponse({ retrievalCount: 0, queryText: "포인터", k: 5 });
    assert.match(out, /^FIXTURE:/);
    assert.match(out, /임의 teaching 거부/);
    assert.match(out, /npm run ingest:pdf/);
    assert.match(out, /포인터/);
  });
});

describe("ClaudeCliProvider real-mode (mocked spawn)", () => {
  it("spawns claude with the locked args + writes stdin payload + returns stdout", async () => {
    const captured: { command?: string; args?: string[]; stdinPayload?: string } = {};
    const mockChild = makeMockChild();
    const spawnFn = ((command: string, args: string[]) => {
      captured.command = command;
      captured.args = args;
      // simulate the child responding asynchronously
      setImmediate(() => {
        mockChild.stdout.emit("data", "안녕! 반가산기는 ");
        mockChild.stdout.emit("data", "디지털논리회로 의 첫 단원이야.");
        mockChild.emit("close", 0);
      });
      return mockChild as unknown as ReturnType<typeof import("node:child_process").spawn>;
    }) as unknown as typeof import("node:child_process").spawn;

    const provider = new ClaudeCliProvider(spawnFn, 5_000);
    const result = await provider.generate({
      systemPrompt: "system prompt body",
      userMessage: "반가산기"
    });

    assert.equal(captured.command, "claude");
    assert.deepEqual(captured.args, ["-p", "--dangerously-skip-permissions"]);
    assert.match(mockChild.stdin.written, /system prompt body/);
    assert.match(mockChild.stdin.written, /User question: 반가산기/);
    assert.equal(result.text, "안녕! 반가산기는 디지털논리회로 의 첫 단원이야.");
    assert.equal(result.provider, "claude-cli");
  });

  it("throws when child exits non-zero, embedding first stderr line", async () => {
    const mockChild = makeMockChild();
    const spawnFn = (() => {
      setImmediate(() => {
        mockChild.stderr.emit("data", "Error: rate limit\nadditional detail");
        mockChild.emit("close", 7);
      });
      return mockChild as unknown as ReturnType<typeof import("node:child_process").spawn>;
    }) as unknown as typeof import("node:child_process").spawn;

    const provider = new ClaudeCliProvider(spawnFn, 5_000);
    await assert.rejects(
      () => provider.generate({ systemPrompt: "s", userMessage: "u" }),
      /claude CLI exited 7\. stderr: Error: rate limit/
    );
  });

  it("throws on timeout and SIGKILL the child", async () => {
    const mockChild = makeMockChild();
    const spawnFn = (() => mockChild as unknown as ReturnType<typeof import("node:child_process").spawn>) as unknown as typeof import("node:child_process").spawn;
    const provider = new ClaudeCliProvider(spawnFn, 50);
    await assert.rejects(
      () => provider.generate({ systemPrompt: "s", userMessage: "u" }),
      /claude CLI timed out after 50ms/
    );
    assert.equal(mockChild.killed, true);
  });
});
