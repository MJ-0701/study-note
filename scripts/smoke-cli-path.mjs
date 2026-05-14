import { spawn } from "node:child_process";

async function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn("node", ["apps/cli/dist/ingest-pdf.js", ...args], {
      env: {
        ...process.env,
        STUDY_NOTE_LLM_FIXTURE: "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      resolve({ code, stderr });
    });
  });
}

const absoluteResult = await runCli([
  "--path",
  "/Users/test/secret.pdf",
  "--subject",
  "digital-engineering"
]);
if (absoluteResult.code === 0) {
  throw new Error("absolute path should be rejected");
}
if (absoluteResult.stderr.includes("/Users/test/secret.pdf")) {
  throw new Error("error message echoed full absolute path (privacy violation)");
}

const traversalResult = await runCli([
  "--path",
  "../../etc/passwd",
  "--subject",
  "digital-engineering"
]);
if (traversalResult.code === 0) {
  throw new Error("path traversal should be rejected");
}
if (traversalResult.stderr.includes("../../etc/passwd")) {
  throw new Error("error message echoed full traversal path");
}

console.log("[smoke:cli-path] PASS");
