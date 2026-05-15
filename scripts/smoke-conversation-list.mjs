/**
 * smoke-conversation-list.mjs — sprint-8 slice-4 (AC4).
 *
 * GET /v1/conversations 의 contract end-to-end 검증.
 *
 * AC4 시나리오:
 *   (a) cookie 부재 → 401
 *   (b) sign-in 후 빈 list → []
 *   (c) Conversation 1개 + Turn 1개 → 1 item, derivedTitle / turnCount 정상
 *   (d) subject query param filter — 다른 subject 의 row 만 반환
 *   (e) cross-owner — second user 의 LIST 는 본인 row 만
 *   (f) PII guard — Turn query 에 학번 + hex token 포함 → derivedTitle [redacted]
 *   (g) subject query 비정상 (특수문자 / 긴 string) → 400 또는 200 empty (cross-owner row leak X)
 *
 * 본 smoke 는 LLM/corpus 우회 — Turn 을 Prisma 로 직접 insert 해 backend 의
 * derivedTitle / turnCount / cross-owner / PII redact 만 검증한다.
 */
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";
import { createCookieJar } from "./smoke-cookie-jar.mjs";

const SEED_USER_NAME = process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User";
const SEED_USER_STUDENT_NUMBER = process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001";
const SECOND_USER_NAME = "Conv List Second User";
const SECOND_USER_STUDENT_NUMBER = "20269801";
const SECOND_USER_EMAIL = "smoke-conv-list-second@example.com";

let baseUrl;
let server;
let smokeDb;
let prisma;

try {
  smokeDb = await prepareSmokeDatabase("conversation-list");
  prisma = new PrismaClient({
    datasources: { db: { url: smokeDb.databaseUrl } }
  });
  server = startBackend(3300 + Math.floor(Math.random() * 1000), smokeDb);

  await waitFor(async () => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  });

  // ───────────── (a) cookie 부재 → 401 ─────────────
  await assertStatus(
    "(a) GET /v1/conversations without cookie → 401",
    () => request("/v1/conversations"),
    401
  );

  // ───────────── master sign-in ─────────────
  const masterJar = createCookieJar();
  const signInResponse = await request("/v1/auth/sign-in", {
    method: "POST",
    jar: masterJar,
    body: { name: SEED_USER_NAME, studentNumber: SEED_USER_STUDENT_NUMBER }
  });
  if (signInResponse.status !== 200) {
    throw new Error(`master sign-in expected 200, got ${signInResponse.status}`);
  }
  const masterProfile = await signInResponse.json();
  const masterUserId = masterProfile.userId;
  if (!masterUserId) throw new Error("master sign-in did not return userId");

  // ───────────── (b) sign-in 후 빈 list ─────────────
  let list = await requestJson("/v1/conversations", { jar: masterJar });
  if (!Array.isArray(list) || list.length !== 0) {
    throw new Error(`(b) expected empty array, got ${JSON.stringify(list)}`);
  }
  console.log("(b) empty list after sign-in OK");

  // ───────────── Conversation 1 + Turn 1 (디지털공학개론) ─────────────
  const conv1 = await requestJson("/v1/conversations", {
    method: "POST",
    jar: masterJar,
    body: { subject: "digital-engineering" }
  });
  if (!conv1.id) throw new Error("conversation 1 missing id");

  await insertSyntheticTurn({
    conversationId: conv1.id,
    subject: "digital-engineering",
    query: "회로 1주차 요약해줘"
  });

  // ───────────── (c) list 에 1 item ─────────────
  list = await requestJson("/v1/conversations", { jar: masterJar });
  if (list.length !== 1) {
    throw new Error(`(c) expected length 1, got ${list.length}`);
  }
  const item1 = list[0];
  if (item1.id !== conv1.id) throw new Error(`(c) id mismatch: ${item1.id}`);
  if (item1.derivedTitle !== "회로 1주차 요약해줘") {
    throw new Error(`(c) derivedTitle unexpected: ${item1.derivedTitle}`);
  }
  if (item1.derivedTitle.length > 40) {
    throw new Error(`(c) derivedTitle > 40 chars: ${item1.derivedTitle.length}`);
  }
  if (item1.turnCount !== 1) {
    throw new Error(`(c) turnCount expected 1, got ${item1.turnCount}`);
  }
  if (!item1.subject || !item1.personaName || !item1.createdAt || !item1.updatedAt) {
    throw new Error(`(c) shape incomplete: ${JSON.stringify(item1)}`);
  }
  console.log("(c) 1 conversation + 1 turn → derivedTitle / turnCount OK");

  // ───────────── Conversation 2 + Turn 1 (다른 subject — Prisma 직접 insert) ─────────────
  // 현 sprint persona-engine 은 `digital-engineering` 만 archetypeFor 허용 →
  // `POST /v1/conversations` 가 다른 subject 를 거부. LIST endpoint 의 subject
  // filter 검증을 위해 Prisma 직접 insert 로 다른 subject row 생성.
  const conv2 = await prisma.conversation.create({
    data: {
      ownerId: masterUserId,
      subject: "c-language",
      personaName: "씨랭이"
    }
  });
  await insertSyntheticTurn({
    conversationId: conv2.id,
    subject: "c-language",
    query: "포인터 이해"
  });

  // ───────────── (d) subject query param filter ─────────────
  list = await requestJson("/v1/conversations", { jar: masterJar });
  if (list.length !== 2) {
    throw new Error(`(d-base) expected 2 conversations, got ${list.length}`);
  }

  const deOnly = await requestJson(
    "/v1/conversations?subject=digital-engineering",
    { jar: masterJar }
  );
  if (deOnly.length !== 1 || deOnly[0]?.subject !== "digital-engineering") {
    throw new Error(`(d) subject filter de unexpected: ${JSON.stringify(deOnly)}`);
  }

  const cOnly = await requestJson("/v1/conversations?subject=c-language", {
    jar: masterJar
  });
  if (cOnly.length !== 1 || cOnly[0]?.subject !== "c-language") {
    throw new Error(`(d) subject filter c-language unexpected: ${JSON.stringify(cOnly)}`);
  }
  console.log("(d) subject query param filter OK");

  // ───────────── second user upsert + sign-in ─────────────
  await prisma.user.upsert({
    where: { studentNumber: SECOND_USER_STUDENT_NUMBER },
    update: {
      displayName: SECOND_USER_NAME,
      email: SECOND_USER_EMAIL,
      role: "NORMAL",
      devUserFlag: true
    },
    create: {
      id: "user-smoke-conv-list-second-1",
      displayName: SECOND_USER_NAME,
      studentNumber: SECOND_USER_STUDENT_NUMBER,
      email: SECOND_USER_EMAIL,
      role: "NORMAL",
      devUserFlag: true
    }
  });

  const secondJar = createCookieJar();
  await requestJson("/v1/auth/sign-in", {
    method: "POST",
    jar: secondJar,
    body: { name: SECOND_USER_NAME, studentNumber: SECOND_USER_STUDENT_NUMBER }
  });

  // ───────────── (e) cross-owner — second user 의 LIST 는 빈 array ─────────────
  const secondList = await requestJson("/v1/conversations", { jar: secondJar });
  if (!Array.isArray(secondList) || secondList.length !== 0) {
    throw new Error(
      `(e) second user LIST should be empty (cross-owner leak X), got ${JSON.stringify(secondList)}`
    );
  }
  // master 의 conversation id 를 second user 가 subject query 로도 못 찾아야.
  const secondDe = await requestJson(
    "/v1/conversations?subject=digital-engineering",
    { jar: secondJar }
  );
  if (secondDe.length !== 0) {
    throw new Error(`(e) second user subject filter leaked: ${JSON.stringify(secondDe)}`);
  }
  console.log("(e) cross-owner leak guard OK");

  // ───────────── (f) PII guard — 학번 + hex token Turn ─────────────
  const conv3 = await requestJson("/v1/conversations", {
    method: "POST",
    jar: masterJar,
    body: { subject: "digital-engineering" }
  });
  // PII conversation 이 (c) 의 conv1 다음으로 활성 conversation 이 되도록 후순위 보장.
  const PII_QUERY =
    "내 학번 20269999 와 token deadbeefcafef00d1234567890abcdef 봐줘";
  await insertSyntheticTurn({
    conversationId: conv3.id,
    subject: "digital-engineering",
    query: PII_QUERY
  });

  const piiList = await requestJson("/v1/conversations", { jar: masterJar });
  const piiItem = piiList.find((c) => c.id === conv3.id);
  if (!piiItem) throw new Error("(f) PII conversation row missing");
  if (/\d{8}/.test(piiItem.derivedTitle)) {
    throw new Error(`(f) 학번 8자리 누설: ${piiItem.derivedTitle}`);
  }
  if (/[a-f0-9]{32,}/i.test(piiItem.derivedTitle)) {
    throw new Error(`(f) hex 토큰 누설: ${piiItem.derivedTitle}`);
  }
  if (!piiItem.derivedTitle.includes("[redacted]")) {
    throw new Error(
      `(f) [redacted] placeholder 누락: ${piiItem.derivedTitle}`
    );
  }
  console.log("(f) derivedTitle PII redact OK");

  // ───────────── (g) subject query 비정상 입력 ─────────────
  // backend 가 400 (Shield Pattern) 또는 200 empty 를 emit 해야 한다. 절대
  // cross-owner row 노출 안 됨.
  for (const badSubject of [
    "<script>",
    "UPPERCASE",
    "with space",
    "with/slash",
    "a".repeat(80)
  ]) {
    const response = await request(
      `/v1/conversations?subject=${encodeURIComponent(badSubject)}`,
      { jar: secondJar }
    );
    if (response.status !== 400 && response.status !== 200) {
      throw new Error(
        `(g) bad subject "${badSubject}" expected 400 or 200, got ${response.status}`
      );
    }
    if (response.status === 200) {
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length !== 0) {
        throw new Error(
          `(g) bad subject "${badSubject}" returned non-empty list — possible cross-owner leak`
        );
      }
    }
  }
  console.log("(g) subject query param validation guard OK");

  console.log("Conversation list smoke passed");
} finally {
  await prisma?.$disconnect();
  server?.kill("SIGTERM");
  await smokeDb?.stop();
}

function startBackend(port, db) {
  baseUrl = `http://127.0.0.1:${port}/api`;
  const child = spawn("node", ["apps/api/dist/main.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: db.databaseUrl,
      SESSION_TOKEN_PEPPER: db.sessionTokenPepper,
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "local"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (c) => process.stderr.write(`[backend stdout] ${c}`));
  child.stderr.on("data", (c) => process.stderr.write(`[backend stderr] ${c}`));
  return child;
}

async function request(path, options = {}) {
  const cookieHeader = options.jar?.header();
  const headers = {
    "content-type": "application/json",
    ...(cookieHeader ? { cookie: cookieHeader } : {})
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  options.jar?.captureFrom(response);
  return response;
}

async function requestJson(path, options = {}) {
  const response = await request(path, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function assertStatus(label, run, expectedStatus) {
  const response = await run();
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus}, got ${response.status}`);
  }
  console.log(label);
}

async function insertSyntheticTurn({ conversationId, subject, query }) {
  await prisma.turn.create({
    data: {
      conversationId,
      subject,
      query,
      k: 1,
      response: "[smoke] synthetic response",
      sources: [],
      provider: "fixture-smoke",
      modelName: "fixture@smoke",
      retrievalCount: 0,
      isFallback: false
    }
  });
  // backend conversation.updatedAt 이 변경되도록 명시 touch.
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() }
  });
}

async function waitFor(check, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out while waiting for backend smoke condition");
}
