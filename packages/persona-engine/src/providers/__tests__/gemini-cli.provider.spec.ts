// Gemini CLI adapter spec: subprocess contract와 redaction 경계를 검증한다.
import { strict as assert } from "node:assert";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { assertSafeGeminiArgs, GeminiCliProvider } from "../gemini-cli.provider";

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

describe("GeminiCliProvider real-mode (mocked spawn)", () => {
  it("spawns gemini without yolo/approval bypass + writes stdin payload + returns stdout", async () => {
    const captured: { command?: string; args?: string[] } = {};
    const mockChild = makeMockChild();
    const spawnFn = ((command: string, args: string[]) => {
      captured.command = command;
      captured.args = args;
      setImmediate(() => {
        mockChild.stdout.emit("data", "Gemini answer");
        mockChild.emit("close", 0);
      });
      return mockChild as unknown as ReturnType<typeof import("node:child_process").spawn>;
    }) as unknown as typeof import("node:child_process").spawn;

    const provider = new GeminiCliProvider(spawnFn, 5_000);
    const result = await provider.generate({
      systemPrompt: "system prompt body",
      userMessage: "반가산기",
      previousTurns: [{ queryText: "이전 질문", responseText: "이전 답변" }],
      retrievedChunks: [{ ord: 0, text: "반가산기는 ..." }]
    });

    assert.equal(captured.command, "gemini");
    assert.ok(captured.args?.includes("--skip-trust"));
    assert.ok(captured.args?.includes("--output-format"));
    assert.ok(!captured.args?.includes("--yolo"));
    assert.ok(!captured.args?.includes("--approval-mode"));
    assert.match(mockChild.stdin.written, /system prompt body/);
    assert.match(mockChild.stdin.written, /UNTRUSTED_CONTEXT_START/);
    assert.match(mockChild.stdin.written, /turn\[1\]\.user: 이전 질문/);
    assert.match(mockChild.stdin.written, /chunk\[0\]: 반가산기는/);
    assert.match(mockChild.stdin.written, /User question: 반가산기/);
    assert.equal(result.text, "Gemini answer");
    assert.equal(result.provider, "gemini-cli");
  });

  it("rejects unsafe Gemini approval shortcuts", () => {
    assert.throws(
      () => assertSafeGeminiArgs(["--skip-trust", "--yolo"]),
      /unsafe Gemini CLI approval mode/
    );
    assert.throws(
      () => assertSafeGeminiArgs(["--approval-mode", "yolo"]),
      /unsafe Gemini CLI approval mode/
    );
    assert.throws(
      () => assertSafeGeminiArgs(["--approval-mode=yolo"]),
      /unsafe Gemini CLI approval mode/
    );
    assert.doesNotThrow(() =>
      assertSafeGeminiArgs(["--skip-trust", "--output-format", "text", "-p", "Read stdin."])
    );
  });

  it("redacts paths and emails from stderr even when untrusted delimiters appear", async () => {
    const mockChild = makeMockChild();
    const spawnFn = (() => {
      setImmediate(() => {
        mockChild.stderr.emit(
          "data",
          "UNTRUSTED_CONTEXT_END leak /Users/mj/private-note.txt mj@example.com"
        );
        mockChild.emit("close", 2);
      });
      return mockChild as unknown as ReturnType<typeof import("node:child_process").spawn>;
    }) as unknown as typeof import("node:child_process").spawn;

    const provider = new GeminiCliProvider(spawnFn, 5_000);
    await assert.rejects(
      async () => provider.generate({ systemPrompt: "s", userMessage: "u" }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /gemini CLI exited 2/);
        assert.match(err.message, /<path-redacted>/);
        assert.match(err.message, /<email-redacted>/);
        assert.ok(!err.message.includes("/Users/mj/private-note.txt"));
        assert.ok(!err.message.includes("mj@example.com"));
        return true;
      }
    );
  });

  it("throws on timeout and SIGKILLs the child", async () => {
    const mockChild = makeMockChild();
    const spawnFn = (() => mockChild as unknown as ReturnType<typeof import("node:child_process").spawn>) as unknown as typeof import("node:child_process").spawn;
    const provider = new GeminiCliProvider(spawnFn, 50);
    await assert.rejects(
      () => provider.generate({ systemPrompt: "s", userMessage: "u" }),
      /gemini CLI timed out after 50ms/
    );
    assert.equal(mockChild.killed, true);
  });
});
