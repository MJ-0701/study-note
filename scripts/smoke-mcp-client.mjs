/**
 * smoke-mcp-client.mjs — Shared helper for MCP stdio smoke tests.
 *
 * Provides:
 *   - spawnMcpServer(env): spawn MCP server child process
 *   - McpSmokeClient(child): simple newline-JSON-RPC client over stdio
 *     - initialize()
 *     - listTools()
 *     - callTool(name, arguments)
 *   - waitForMcpReady(child, timeoutMs): wait for stderr "owner resolved" or "stdio transport connected"
 *   - waitForExit(child, timeoutMs): wait for child process to exit
 *
 * MCP wire format: newline-delimited JSON (one JSON object per line, no Content-Length framing).
 */
import { spawn } from "node:child_process";

export function spawnMcpServer(env) {
  const child = spawn("node", ["apps/mcp/dist/index.js"], {
    env,
    stdio: ["pipe", "pipe", "pipe"]
  });
  child.on("error", (err) => {
    process.stderr.write(`[mcp-child] spawn error: ${err.message}\n`);
  });
  return child;
}

export async function waitForMcpReady(child, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(() => {
      reject(new Error(`MCP server did not become ready within ${timeoutMs}ms. stderr: ${stderr}`));
    }, timeoutMs);

    const onData = (chunk) => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(`[mcp-stderr] ${text}`);
      // Wait for "stdio transport connected" — this is emitted AFTER server.connect(transport)
      // returns, meaning the stdin reader is attached and ready to accept JSON-RPC.
      if (stderr.includes("stdio transport connected")) {
        clearTimeout(timer);
        resolve();
      }
    };

    const onClose = (code) => {
      clearTimeout(timer);
      reject(new Error(`MCP server exited (code=${code}) before ready. stderr: ${stderr}`));
    };

    child.stderr.on("data", onData);
    child.on("close", onClose);
  });
}

/** Wait for child to exit and capture stderr. Returns { exitCode, stderr }. */
export async function waitForExit(child, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    let stdout = "";

    child.stderr?.on("data", (c) => { stderr += String(c); });
    child.stdout?.on("data", (c) => { stdout += String(c); });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Child did not exit within ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stderr, stdout });
    });
  });
}

/** Simple MCP JSON-RPC client over child process stdio. */
export class McpSmokeClient {
  #child;
  #nextId = 1;
  #pending = new Map(); // id → { resolve, reject }
  #buffer = "";
  #initialized = false;

  constructor(child) {
    this.#child = child;
    child.stdout.on("data", (chunk) => this.#onData(chunk));
    child.on("close", () => {
      for (const { reject } of this.#pending.values()) {
        reject(new Error("MCP server closed"));
      }
      this.#pending.clear();
    });
  }

  #onData(chunk) {
    this.#buffer += String(chunk);
    const lines = this.#buffer.split("\n");
    this.#buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let msg;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        continue;
      }

      const id = msg.id;
      if (id !== undefined && this.#pending.has(id)) {
        const { resolve } = this.#pending.get(id);
        this.#pending.delete(id);
        resolve(msg);
      }
    }
  }

  #send(obj) {
    this.#child.stdin.write(JSON.stringify(obj) + "\n");
  }

  #request(method, params, timeoutMs = 10000) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#send({ jsonrpc: "2.0", id, method, params });
      setTimeout(() => {
        if (this.#pending.has(id)) {
          this.#pending.delete(id);
          reject(new Error(`Request '${method}' (id=${id}) timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });
  }

  async initialize() {
    if (this.#initialized) return;
    const resp = await this.#request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke-client", version: "0.1.0" }
    });
    if (resp.error) {
      throw new Error(`initialize failed: ${JSON.stringify(resp.error)}`);
    }
    // Send initialized notification (no response expected)
    this.#send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    this.#initialized = true;
    return resp.result;
  }

  async listTools() {
    if (!this.#initialized) await this.initialize();
    const resp = await this.#request("tools/list", {});
    if (resp.error) throw new Error(`tools/list error: ${JSON.stringify(resp.error)}`);
    return resp.result;
  }

  async callTool(name, args = {}) {
    if (!this.#initialized) await this.initialize();
    const resp = await this.#request("tools/call", { name, arguments: args });
    // Note: MCP errors come back as resp.error (JSON-RPC error) or as resp.result.isError (tool-level error)
    return resp;
  }
}
