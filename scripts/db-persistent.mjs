import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

/**
 * Persistent dev DB lane (sprint-4 Q1=c). prepareSmokeDatabase() spins up an
 * ephemeral docker MySQL with random port + project name, runs migrate + seed,
 * and normally returns a stop() function for teardown. This wrapper *skips*
 * stop() so the container survives across multiple persona:turn invocations
 * (학습 사용 흐름). Cleanup is the `down <project>` subcommand.
 *
 * stdout contract (locked by plan §5.1 S3):
 *   line N-1: `DATABASE_URL=mysql://study_note:study_note@127.0.0.1:<port>/study_note`
 *   line N:   `COMPOSE_PROJECT=study-note-dev-persistent-<ts>-<rand>`
 *
 * Usage:
 *   eval "$(node scripts/db-persistent.mjs up | tail -n 2)"
 *   export DATABASE_URL COMPOSE_PROJECT
 *   STUDY_NOTE_LLM_REAL_OPT_IN=1 npm run persona:turn -- --subject ... --query ...
 *   node scripts/db-persistent.mjs down "$COMPOSE_PROJECT"
 */

const composeFile = resolve("backend/prisma/docker-compose.smoke.yml");
const subcommand = process.argv[2] ?? "up";

if (subcommand === "up") {
  const db = await prepareSmokeDatabase("dev-persistent");
  process.stdout.write("[db-persistent] up — container is running, stop() intentionally skipped\n");
  process.stdout.write("[db-persistent] export the two lines below to use this DB:\n");
  process.stdout.write(`DATABASE_URL=${db.databaseUrl}\n`);
  process.stdout.write(`COMPOSE_PROJECT=${db.composeProject}\n`);
  // we deliberately do NOT call db.stop() — container persists.
} else if (subcommand === "down") {
  const projectArg = process.argv[3] ?? process.env.COMPOSE_PROJECT;
  if (!projectArg) {
    process.stderr.write(
      "[db-persistent] usage: node scripts/db-persistent.mjs down <COMPOSE_PROJECT>\n"
    );
    process.exit(1);
  }
  await spawnAndAwait("docker", [
    "compose",
    "-p",
    projectArg,
    "-f",
    composeFile,
    "down",
    "-v",
    "--remove-orphans"
  ]);
  process.stdout.write(`[db-persistent] down — project=${projectArg} torn down\n`);
} else {
  process.stderr.write(
    `[db-persistent] unknown subcommand: ${subcommand}. usage: up | down <COMPOSE_PROJECT>\n`
  );
  process.exit(1);
}

async function spawnAndAwait(cmd, args) {
  const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (c) => {
    stderr += String(c);
  });
  child.stdout.on("data", (c) => process.stdout.write(c));
  const exitCode = await new Promise((resolve) => child.on("close", resolve));
  if (exitCode !== 0) {
    process.stderr.write(stderr);
    throw new Error(`${cmd} ${args.join(" ")} exited ${exitCode}`);
  }
}
