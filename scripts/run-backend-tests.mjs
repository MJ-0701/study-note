// Discover all *.spec.js under backend/dist/**/__tests__ and exec node --test.
// Plain glob via fs.readdir recursive — node 22+ has node:test runner CLI but
// its glob is platform-flaky on macOS, so we collect paths manually.
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawn } from "node:child_process";

const ROOT = "backend/dist";

async function findSpecs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findSpecs(full)));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".spec.js") &&
      full.includes(`__tests__`)
    ) {
      out.push(full);
    }
  }
  return out;
}

const specs = await findSpecs(ROOT);
if (specs.length === 0) {
  console.log("(no spec files found under backend/dist)");
  process.exit(0);
}

console.log(`running ${specs.length} spec file(s):`);
for (const s of specs) console.log(`  - ${relative(process.cwd(), s)}`);

const child = spawn("node", ["--test", ...specs], { stdio: "inherit" });
child.on("close", (code) => process.exit(code ?? 1));
