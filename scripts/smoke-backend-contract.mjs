/**
 * smoke-backend-contract.mjs — AC4: cookie-auth contract end-to-end.
 *
 * slice-4 rewrite (sprint-7 carryover): legacy Bearer + /auth/login/logout/me 가 사라지고
 * cookie-only (`study_note_session`) + `/v1/auth/sign-in|sign-out|me` 로 이전됨.
 *
 * AC4 verifies:
 *   - 경로 /v1/auth/sign-in, /v1/auth/sign-out, /v1/auth/me 정상 동작
 *   - sign-in 응답 body shape = { userId, studentNumber, name, role } (token 없음)
 *   - 인증은 `Cookie:` 헤더 only — 다른 모든 API 가 cookie 기반 SessionAuthGuard 통과
 *
 * AC4-amend (security):
 *   - sign-in body 에 token 류 필드 없음
 *   - Set-Cookie HttpOnly + SameSite=Lax (+ NODE_ENV=production 시 Secure)
 *   - Bearer 헤더 단독 요청 → 401 (cookie-only enforcement regression guard)
 *   - backend stdout/stderr 에 raw cookie 토큰 미포함
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";
import { createCookieJar } from "./smoke-cookie-jar.mjs";

const SESSION_COOKIE_NAME = "study_note_session";

const SEED_USER_NAME = process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User";
const SEED_USER_STUDENT_NUMBER = process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001";
const SECOND_USER_NAME = process.env.STUDY_NOTE_SECOND_USER_NAME ?? "Reviewer";
const SECOND_USER_STUDENT_NUMBER = process.env.STUDY_NOTE_SECOND_STUDENT_NUMBER ?? "20260002";
const NORMAL_USER_NAME = "Smoke Normal User";
const NORMAL_USER_STUDENT_NUMBER = "20260003";
const NORMAL_USER_EMAIL = "smoke-normal-user@example.com";

let baseUrl;
let server;
let restartServer;
let smokeDb;
let prisma;
const backendLogs = [];

try {
  smokeDb = await prepareSmokeDatabase("backend");
  prisma = new PrismaClient({
    datasources: { db: { url: smokeDb.databaseUrl } }
  });
  server = startBackend(3200 + Math.floor(Math.random() * 1000), smokeDb);

  await waitFor(async () => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  });

  await assertStatus("invalid login is rejected (AuthService 403, not controller 400)", () =>
    request("/v1/auth/sign-in", {
      method: "POST",
      body: { name: SEED_USER_NAME, studentNumber: "00000000" }
    }),
    403
  );

  await assertStatus("unauthenticated materials are rejected", () =>
    request("/materials"),
    401
  );
  await assertStatus("unauthenticated /v1/auth/me is rejected", () =>
    request("/v1/auth/me"),
    401
  );

  const masterJar = createCookieJar();
  const signInResponse = await request("/v1/auth/sign-in", {
    method: "POST",
    jar: masterJar,
    body: { name: SEED_USER_NAME, studentNumber: SEED_USER_STUDENT_NUMBER }
  });
  if (signInResponse.status !== 200) {
    throw new Error(`sign-in expected 200, got ${signInResponse.status}`);
  }
  const login = await signInResponse.json();

  // AC4 body shape — UserProfileResponse only (no token / expiresAt / user nesting)
  if (
    login.name !== SEED_USER_NAME ||
    login.studentNumber !== SEED_USER_STUDENT_NUMBER ||
    typeof login.userId !== "string" ||
    typeof login.role !== "string"
  ) {
    throw new Error(`sign-in body shape unexpected: ${JSON.stringify(login)}`);
  }
  // AC4-amend F2 — body must not leak any token
  const loginBodyStr = JSON.stringify(login).toLowerCase();
  if (
    "token" in login ||
    "sessiontoken" in login ||
    "expiresat" in login ||
    loginBodyStr.includes("\"token\"") ||
    loginBodyStr.includes("sessiontoken")
  ) {
    throw new Error(`sign-in body leaked token-like field: ${JSON.stringify(login)}`);
  }

  // AC4-amend — Set-Cookie attribute checks
  const setCookieHeaders = signInResponse.headers.getSetCookie?.() ?? [];
  const sessionCookieHeader = setCookieHeaders.find((c) =>
    c.startsWith(`${SESSION_COOKIE_NAME}=`)
  );
  if (!sessionCookieHeader) {
    throw new Error(`Set-Cookie ${SESSION_COOKIE_NAME} missing`);
  }
  const cookieLower = sessionCookieHeader.toLowerCase();
  if (!cookieLower.includes("httponly")) {
    throw new Error(`session cookie missing HttpOnly: ${sessionCookieHeader}`);
  }
  if (!cookieLower.includes("samesite=lax")) {
    throw new Error(`session cookie missing SameSite=Lax: ${sessionCookieHeader}`);
  }
  if (process.env.NODE_ENV === "production" && !cookieLower.includes("secure")) {
    throw new Error(`session cookie missing Secure under NODE_ENV=production`);
  }

  const rawToken = masterJar.getValue(SESSION_COOKIE_NAME);
  if (!rawToken) {
    throw new Error("master jar did not capture session cookie after sign-in");
  }

  await assertRawTokenIsNotPersisted(prisma, rawToken, smokeDb.sessionTokenPepper);

  // AC4-amend — Bearer-only request rejected (cookie-only enforcement)
  await assertStatus("Bearer-only request to /v1/auth/me is rejected (cookie-only enforcement)", () =>
    request("/v1/auth/me", { bearerToken: rawToken }),
    401
  );

  const me = await requestJson("/v1/auth/me", { jar: masterJar });
  if (me.userId !== login.userId) {
    throw new Error("/v1/auth/me did not return the current user");
  }

  await assertStatus("admin route rejects unauthenticated", () =>
    request("/v1/admin/users"),
    401
  );
  console.log("admin route rejects unauthenticated");

  await prisma.user.upsert({
    where: { studentNumber: NORMAL_USER_STUDENT_NUMBER },
    update: {
      displayName: NORMAL_USER_NAME,
      email: NORMAL_USER_EMAIL,
      role: "NORMAL",
      devUserFlag: true
    },
    create: {
      id: "user-smoke-normal-1",
      displayName: NORMAL_USER_NAME,
      studentNumber: NORMAL_USER_STUDENT_NUMBER,
      email: NORMAL_USER_EMAIL,
      role: "NORMAL",
      devUserFlag: true
    }
  });

  const normalJar = createCookieJar();
  const normalLogin = await requestJson("/v1/auth/sign-in", {
    method: "POST",
    jar: normalJar,
    body: { name: NORMAL_USER_NAME, studentNumber: NORMAL_USER_STUDENT_NUMBER }
  });
  await assertStatus("admin route rejects normal user", () =>
    request("/v1/admin/users", { jar: normalJar }),
    403
  );
  console.log("admin route rejects normal user");
  await assertStatus("normal upload intent is role-denied", () =>
    request("/materials/upload-intent", {
      method: "POST",
      jar: normalJar,
      body: {
        subjectId: "digital-engineering",
        classDate: "2026-05-02",
        fileName: "normal-upload.pdf",
        fileSize: 32,
        pageCount: 1,
        contentType: "application/pdf"
      }
    }),
    403
  );
  await assertStatus("normal file upload is role-denied before lookup", () =>
    requestBinary("/materials/nonexistent/file", {
      method: "PUT",
      jar: normalJar,
      body: Buffer.from("%PDF- normal upload"),
      contentType: "application/pdf"
    }),
    403
  );
  await assertStatus("normal complete upload is role-denied before lookup", () =>
    request("/materials/nonexistent/complete", {
      method: "POST",
      jar: normalJar
    }),
    403
  );
  console.log("- normal user upload endpoints are role-denied");

  const unknownSubjectId = `unknown-subject-${randomUUID()}`;
  const unknownSubjectCountBefore = await prisma.pdfMaterial.count({
    where: { subjectId: unknownSubjectId }
  });
  const unknownSubjectResponse = await request("/materials/upload-intent", {
    method: "POST",
    jar: masterJar,
    body: {
      subjectId: unknownSubjectId,
      classDate: "2026-05-02",
      fileName: "unknown-subject.pdf",
      fileSize: 32,
      pageCount: 1,
      contentType: "application/pdf"
    }
  });
  const unknownSubjectBody = await unknownSubjectResponse.json();
  if (
    unknownSubjectResponse.status !== 400 ||
    !JSON.stringify(unknownSubjectBody).includes("INVALID_SUBJECT")
  ) {
    throw new Error(
      `unknown subject should return 400 INVALID_SUBJECT, got ${unknownSubjectResponse.status}: ${JSON.stringify(unknownSubjectBody)}`
    );
  }
  const unknownSubjectCountAfter = await prisma.pdfMaterial.count({
    where: { subjectId: unknownSubjectId }
  });
  if (unknownSubjectCountAfter !== unknownSubjectCountBefore) {
    throw new Error("unknown subject upload intent created a PdfMaterial row");
  }
  console.log("- upload intent rejects unknown subject without creating material row");

  const samplePdf = Buffer.from("%PDF-1.4\n% smoke PDF\n%%EOF\n");
  const uploadIntent = await requestJson("/materials/upload-intent", {
    method: "POST",
    jar: masterJar,
    body: {
      subjectId: "digital-engineering",
      classDate: "2026-05-02",
      fileName: "sample-lecture.pdf",
      fileSize: samplePdf.length,
      pageCount: 3,
      contentType: "application/pdf"
    }
  });

  const materialId = uploadIntent.material?.id;
  if (
    !materialId ||
    uploadIntent.material?.uploadStatus !== "pending" ||
    uploadIntent.upload?.uploadUrl !== `/api/materials/${materialId}/file`
  ) {
    throw new Error("upload intent did not return a pending backend upload target");
  }

  const intentFileSizeRejectSamples = [0, 1, 4];
  for (const rejectedFileSize of intentFileSizeRejectSamples) {
    const rejectedCountBefore = await prisma.pdfMaterial.count({
      where: { ownerId: login.userId, fileSize: rejectedFileSize }
    });

    await assertStatus(`intent rejects fileSize=${rejectedFileSize}`, () =>
      request("/materials/upload-intent", {
        method: "POST",
        jar: masterJar,
        body: {
          subjectId: "digital-engineering",
          classDate: "2026-05-02",
          fileName: "sample-lecture.pdf",
          fileSize: rejectedFileSize,
          pageCount: 3,
          contentType: "application/pdf"
        }
      }),
      400
    );

    const rejectedCountAfter = await prisma.pdfMaterial.count({
      where: { ownerId: login.userId, fileSize: rejectedFileSize }
    });

    if (rejectedCountAfter !== rejectedCountBefore) {
      throw new Error(`intent with fileSize=${rejectedFileSize} created a PdfMaterial row`);
    }

    console.log(`- intent rejects fileSize=${rejectedFileSize}`);
  }

  await assertStatus("pending materials cannot be downloaded", () =>
    request(`/materials/${materialId}/download`, { jar: masterJar }),
    409
  );
  await assertStatus("non-PDF uploads are rejected", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      jar: masterJar,
      body: Buffer.from("not a pdf"),
      contentType: "text/plain"
    }),
    400
  );
  await assertStatus("oversized uploads are rejected", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      jar: masterJar,
      body: Buffer.alloc(4097, 0x25),
      contentType: "application/pdf"
    }),
    400
  );

  await assertStatus("corrupted PDF magic (%PDFx) rejected", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      jar: masterJar,
      body: Buffer.from("%PDFx fake content"),
      contentType: "application/pdf"
    }),
    400
  );
  console.log("- corrupted PDF magic (%PDFx) rejected");

  const storagePath = join(process.cwd(), "local-materials", login.userId, materialId);
  if (fs.existsSync(storagePath)) {
    throw new Error("rejected put wrote to storage path in local mock");
  }
  console.log("- rejected PUT does not write to storage");

  const stillPendingMaterial = await prisma.pdfMaterial.findUnique({
    where: { id: materialId },
    select: { uploadStatus: true }
  });

  if (stillPendingMaterial?.uploadStatus !== "pending") {
    throw new Error("rejected put changed uploadStatus away from pending");
  }
  console.log("- rejected PUT preserves pending status");

  const uploadResponse = await requestBinary(`/materials/${materialId}/file`, {
    method: "PUT",
    jar: masterJar,
    body: samplePdf,
    contentType: "application/pdf"
  });
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok) {
    throw new Error(
      `file upload failed with ${uploadResponse.status}: ${JSON.stringify(uploaded)}`
    );
  }
  if (uploaded.material?.uploadStatus !== "uploaded") {
    throw new Error("file upload did not mark the material as uploaded");
  }

  const materials = await requestJson("/materials", { jar: masterJar });
  if (
    materials.materials?.length !== 1 ||
    materials.materials[0]?.uploadStatus !== "uploaded"
  ) {
    throw new Error("owned material list did not include the created material");
  }
  if (materials.materials[0]?.uploaderId !== login.userId) {
    throw new Error("material list did not expose uploaderId alias");
  }

  const annotationPayload = {
    schemaVersion: 1,
    stickyNotes: [
      {
        id: "note-smoke",
        pageNumber: 1,
        anchor: { x: 0.25, y: 0.2 },
        blocks: [{ id: "block-smoke", kind: "text", content: "backend smoke" }],
        updatedAt: new Date().toISOString()
      }
    ],
    inkStrokes: [
      {
        id: "stroke-smoke",
        pageNumber: 1,
        color: "#1a1a1a",
        width: 3,
        points: [{ x: 0.2, y: 0.2, t: Date.now() }],
        createdAt: new Date().toISOString()
      }
    ]
  };
  await requestJson(`/v1/pdf-annotations/${materialId}`, {
    method: "PUT",
    jar: masterJar,
    body: { payload: annotationPayload }
  });
  const annotationRes = await requestJson(`/v1/pdf-annotations/${materialId}`, { jar: masterJar });
  const annotationGot = annotationRes.annotations?.[materialId]?.payload;
  if (annotationGot?.stickyNotes?.[0]?.blocks?.[0]?.content !== "backend smoke") {
    throw new Error("annotation snapshot did not persist");
  }

  const normalMaterials = await requestJson("/materials", { jar: normalJar });
  if (
    !normalMaterials.materials?.some(
      (material) =>
        material.id === materialId &&
        material.uploadStatus === "uploaded" &&
        material.uploaderId === login.userId
    )
  ) {
    throw new Error("normal user material list did not include shared uploaded master material");
  }
  const normalDetail = await requestJson(`/materials/${materialId}`, { jar: normalJar });
  if (normalDetail.material?.id !== materialId || normalDetail.material?.uploaderId !== login.userId) {
    throw new Error("normal user could not read shared material detail");
  }
  const normalDownload = await requestJson(`/materials/${materialId}/download`, { jar: normalJar });
  if (normalDownload.download?.downloadUrl !== `/api/materials/${materialId}/file`) {
    throw new Error("normal user shared download did not return a backend download target");
  }
  const normalDownloadedPdf = await requestBinary(`/materials/${materialId}/file`, { jar: normalJar });
  if (!normalDownloadedPdf.ok) {
    throw new Error(`normal shared file download failed with ${normalDownloadedPdf.status}`);
  }
  const normalDownloadedBody = Buffer.from(await normalDownloadedPdf.arrayBuffer());
  if (!normalDownloadedBody.equals(samplePdf)) {
    throw new Error("normal shared PDF bytes did not match uploaded bytes");
  }
  const emptyNormalAnnotationRes = await requestJson(`/v1/pdf-annotations/${materialId}`, { jar: normalJar });
  if (emptyNormalAnnotationRes.annotations?.[materialId] !== undefined) {
    throw new Error("normal user annotation was not an empty current-user snapshot");
  }
  await requestJson(`/v1/pdf-annotations/${materialId}`, {
    method: "PUT",
    jar: normalJar,
    body: {
      payload: {
        schemaVersion: 1,
        stickyNotes: [
          {
            id: "note-normal-smoke",
            pageNumber: 1,
            anchor: { x: 0.45, y: 0.2 },
            blocks: [{ id: "block-normal-smoke", kind: "text", content: "normal smoke" }],
            updatedAt: new Date().toISOString()
          }
        ],
        inkStrokes: []
      }
    }
  });
  const normalAnnotationRes = await requestJson(`/v1/pdf-annotations/${materialId}`, { jar: normalJar });
  const masterAnnotationAfterNormalSaveRes = await requestJson(`/v1/pdf-annotations/${materialId}`, { jar: masterJar });
  const normalAnnotationGot = normalAnnotationRes.annotations?.[materialId]?.payload;
  const masterAnnotationAfterNormalSaveGot = masterAnnotationAfterNormalSaveRes.annotations?.[materialId]?.payload;
  if (normalAnnotationGot?.stickyNotes?.[0]?.blocks?.[0]?.content !== "normal smoke") {
    throw new Error("normal user annotation snapshot did not persist independently");
  }
  if (masterAnnotationAfterNormalSaveGot?.stickyNotes?.[0]?.blocks?.[0]?.content !== "backend smoke") {
    throw new Error("normal user annotation overwrote master annotation");
  }
  console.log("- normal user reads shared master PDF and keeps independent annotation");

  const download = await requestJson(`/materials/${materialId}/download`, { jar: masterJar });
  if (download.download?.downloadUrl !== `/api/materials/${materialId}/file`) {
    throw new Error("download did not return a backend download target");
  }
  const downloadedPdf = await requestBinary(`/materials/${materialId}/file`, { jar: masterJar });
  if (!downloadedPdf.ok) {
    throw new Error(`file download failed with ${downloadedPdf.status}`);
  }
  const downloadedBody = Buffer.from(await downloadedPdf.arrayBuffer());
  if (!downloadedBody.equals(samplePdf)) {
    throw new Error("downloaded PDF bytes did not match uploaded bytes");
  }

  const exportBundle = await requestJson(`/materials/${materialId}/export-bundle`, { jar: masterJar });
  if (
    exportBundle.kind !== "original-pdf-plus-annotation-json" ||
    exportBundle.annotation?.stickyNotes?.length !== 1
  ) {
    throw new Error("export bundle did not include original PDF and annotation JSON");
  }

  // Backend restart — cookie persists in jar, same DB+pepper → session row reusable.
  restartServer = startBackend(4200 + Math.floor(Math.random() * 1000), smokeDb);
  await waitFor(async () => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  });
  const restartedMe = await requestJson("/v1/auth/me", { jar: masterJar });
  if (restartedMe.userId !== login.userId) {
    throw new Error("persisted session did not survive backend process restart");
  }
  const restartedMaterials = await requestJson("/materials", { jar: masterJar });
  if (restartedMaterials.materials?.[0]?.id !== materialId) {
    throw new Error("material metadata did not survive backend process restart");
  }
  const restartedAnnotationRes = await requestJson(`/v1/pdf-annotations/${materialId}`, { jar: masterJar });
  const restartedAnnotationGot = restartedAnnotationRes.annotations?.[materialId]?.payload;
  if (restartedAnnotationGot?.stickyNotes?.[0]?.blocks?.[0]?.content !== "backend smoke") {
    throw new Error("annotation snapshot did not survive backend process restart");
  }

  // Expired session — manually inject expired session row + cookie value
  const expiredRawToken = "expired-smoke-token";
  await prisma.session.create({
    data: {
      id: randomUUID(),
      tokenHash: hashToken(expiredRawToken, smokeDb.sessionTokenPepper),
      userId: login.userId,
      expiresAt: new Date(Date.now() - 1000)
    }
  });
  const expiredJar = createCookieJar();
  expiredJar.setValue(SESSION_COOKIE_NAME, expiredRawToken);
  await assertStatus("expired sessions are rejected", () =>
    request("/v1/auth/me", { jar: expiredJar }),
    401
  );
  const expiredRow = await prisma.session.findUnique({
    where: { tokenHash: hashToken(expiredRawToken, smokeDb.sessionTokenPepper) }
  });
  if (expiredRow) {
    throw new Error("expired session row was not cleaned up after failed lookup");
  }

  // Sign-out + revoked cookie rejection — save raw token first, then assert it can't be reused.
  const revokedRawToken = masterJar.getValue(SESSION_COOKIE_NAME);
  await requestJson("/v1/auth/sign-out", { method: "POST", jar: masterJar });
  if (masterJar.header()) {
    throw new Error("masterJar should be cleared after sign-out (Max-Age=0)");
  }
  const revokedJar = createCookieJar();
  revokedJar.setValue(SESSION_COOKIE_NAME, revokedRawToken);
  await assertStatus("revoked sessions are rejected", () =>
    request("/v1/auth/me", { jar: revokedJar }),
    401
  );

  // Second user sign-in (ADMIN role) — admin route and cross-user upload denial tests.
  const secondJar = createCookieJar();
  await requestJson("/v1/auth/sign-in", {
    method: "POST",
    jar: secondJar,
    body: { name: SECOND_USER_NAME, studentNumber: SECOND_USER_STUDENT_NUMBER }
  });

  // Master cookie was revoked above — re-sign-in for the admin route check.
  const masterAdminJar = createCookieJar();
  await requestJson("/v1/auth/sign-in", {
    method: "POST",
    jar: masterAdminJar,
    body: { name: SEED_USER_NAME, studentNumber: SEED_USER_STUDENT_NUMBER }
  });
  const masterAdminUsers = await requestJson("/v1/admin/users", { jar: masterAdminJar });
  if (!Array.isArray(masterAdminUsers)) {
    throw new Error("master role did not receive users list array");
  }
  console.log("admin route accepts master user");
  const adminUsers = await requestJson("/v1/admin/users", { jar: secondJar });
  if (!Array.isArray(adminUsers)) {
    throw new Error("admin role did not receive users list array");
  }
  console.log("admin route accepts admin user");

  await assertStatus("cross-user file upload access is denied", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      jar: secondJar,
      body: samplePdf,
      contentType: "application/pdf"
    }),
    404
  );
  console.log("- non-owner admin cannot overwrite another uploader's PDF object");

  // AC4-amend — backend logs free of raw cookie token
  const backendLogText = backendLogs.join("");
  for (const tokenSample of [rawToken, revokedRawToken]) {
    if (tokenSample && backendLogText.includes(tokenSample)) {
      throw new Error(`raw session token leaked into backend stdout/stderr`);
    }
  }

  console.log("Backend contract smoke passed");
  console.log("- health route responds");
  console.log("- cookie sign-in accepts valid credentials and rejects invalid credentials (403)");
  console.log("- protected APIs reject missing sessions (401) and Bearer-only requests");
  console.log("- sign-in body has no token; Set-Cookie has HttpOnly + SameSite=Lax");
  console.log("- persisted sessions store tokenHash only, reject expired sessions, and revoke on sign-out");
  console.log("- local mock backend-proxy upload/download stores and returns PDF bytes");
  console.log("- material upload status transitions from pending to uploaded");
  console.log("- normal user reads shared master/admin PDF materials");
  console.log("- upload endpoints are limited to master/admin and still owner-scoped for object writes");
  console.log("- annotation snapshots are isolated per current user");
  console.log("- material metadata and annotation snapshot persist across backend process restart");
  console.log("- export bundle returns original PDF reference plus annotation JSON");
  console.log("- backend stdout/stderr free of raw session tokens");
} finally {
  await prisma?.$disconnect();
  restartServer?.kill("SIGTERM");
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
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "local",
      PDF_UPLOAD_MAX_BYTES: "4096"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (c) => {
    const text = String(c);
    backendLogs.push(text);
    process.stderr.write(`[backend stdout] ${text}`);
  });
  child.stderr.on("data", (c) => {
    const text = String(c);
    backendLogs.push(text);
    process.stderr.write(`[backend stderr] ${text}`);
  });
  return child;
}

async function request(path, options = {}) {
  const cookieHeader = options.jar?.header();
  const headers = {
    "content-type": "application/json",
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(options.bearerToken ? { authorization: `Bearer ${options.bearerToken}` } : {}),
    ...(options.extraHeaders ?? {})
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

async function requestBinary(path, options = {}) {
  const cookieHeader = options.jar?.header();
  const headers = {
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(options.bearerToken ? { authorization: `Bearer ${options.bearerToken}` } : {}),
    ...(options.contentType ? { "content-type": options.contentType } : {}),
    ...(options.extraHeaders ?? {})
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.binaryBody ?? options.body
  });
  options.jar?.captureFrom(response);
  return response;
}

async function assertStatus(label, run, expectedStatus) {
  const response = await run();
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus}, got ${response.status}`);
  }
}

async function waitFor(check, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Timed out while waiting for backend smoke condition");
}

async function assertRawTokenIsNotPersisted(client, token, pepper) {
  const sessions = await client.session.findMany({
    select: { tokenHash: true }
  });
  const expectedHash = hashToken(token, pepper);

  if (!sessions.some((session) => session.tokenHash === expectedHash)) {
    throw new Error("session tokenHash was not persisted");
  }

  if (sessions.some((session) => session.tokenHash === token)) {
    throw new Error("raw session token was persisted in the session table");
  }
}

function hashToken(token, pepper) {
  return createHmac("sha256", pepper).update(token).digest("hex");
}
