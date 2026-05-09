import { spawn } from "node:child_process";
import { resolve } from "node:path";

const composeFile = resolve("apps/api/prisma/docker-compose.smoke.yml");
const sessionTokenPepper = "study-note-smoke-session-pepper";

export async function prepareSmokeDatabase(label) {
  const env = {
    ...process.env,
    SESSION_TOKEN_PEPPER: process.env.SESSION_TOKEN_PEPPER ?? sessionTokenPepper
  };

  if (process.env.STUDY_NOTE_USE_EXISTING_DB === "1") {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required when STUDY_NOTE_USE_EXISTING_DB=1");
    }

    await migrateAndSeed({ ...env, DATABASE_URL: process.env.DATABASE_URL });

    return {
      databaseUrl: process.env.DATABASE_URL,
      sessionTokenPepper: env.SESSION_TOKEN_PEPPER,
      composeProject: null,
      async stop() {}
    };
  }

  const port = 33306 + Math.floor(Math.random() * 2000);
  const project = `study-note-${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const composeEnv = {
    ...env,
    STUDY_NOTE_SMOKE_DB_PORT: String(port)
  };

  await run("docker", [
    "compose",
    "-p",
    project,
    "-f",
    composeFile,
    "up",
    "-d",
    "--wait"
  ], {
    env: composeEnv
  });

  const databaseUrl = `mysql://study_note:study_note@127.0.0.1:${port}/study_note`;

  try {
    await migrateAndSeed({ ...env, DATABASE_URL: databaseUrl });
  } catch (error) {
    await stopCompose(project, composeEnv);
    throw error;
  }

  return {
    databaseUrl,
    sessionTokenPepper: env.SESSION_TOKEN_PEPPER,
    composeProject: project,
    async stop() {
      await stopCompose(project, composeEnv);
    }
  };
}

async function migrateAndSeed(env) {
  const migrate = await run(npmCommand(), ["run", "prisma:migrate:deploy"], { env });
  writeCommandOutput(migrate);
  const firstSeed = await run(npmCommand(), ["run", "prisma:seed"], { env });
  writeCommandOutput(firstSeed);
  const secondSeed = await run(npmCommand(), ["run", "prisma:seed"], { env });
  writeCommandOutput(secondSeed);
}

async function stopCompose(project, env) {
  await run("docker", [
    "compose",
    "-p",
    project,
    "-f",
    composeFile,
    "down",
    "-v",
    "--remove-orphans"
  ], {
    env,
    allowFailure: true
  });
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      ...options.env
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  if (exitCode !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed with ${exitCode}\n${stdout}\n${stderr}`
    );
  }

  return { stdout, stderr };
}

function writeCommandOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}
