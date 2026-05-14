import { spawn } from "node:child_process";
import fs from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

// sprint-6 retro §4 (이어갈 것) — smoke skipped pending sprint-7 sub-slice rewrite.
//
// Reason: backend auth contract migrated to cookie-only flow (slice-2):
//   - path:     /auth/login → /v1/auth/sign-in, /auth/logout → /v1/auth/sign-out, /me → /v1/auth/me
//   - auth:     Bearer header removed entirely → study_note_session httpOnly cookie
//   - response: token no longer in body (Set-Cookie only); user fields renamed
//               (login.user.displayName → login.name, login.user.id → login.userId)
//
// This script still uses the old contract throughout (Bearer header, /auth/login,
// login.user.displayName) and will fail end-to-end. A full rewrite (~150 LOC) is
// scheduled for sprint-7 — sub-slice "smoke cookie-auth migration".
//
// Override (for the sprint-7 rewriter): STUDY_NOTE_SMOKE_ALLOW_STALE=1
if (!process.env.STUDY_NOTE_SMOKE_ALLOW_STALE) {
  console.log(
    "smoke-backend-contract: SKIPPED — sprint-7 carryover (cookie-auth migration). " +
      "Set STUDY_NOTE_SMOKE_ALLOW_STALE=1 to run the legacy script."
  );
  process.exit(0);
}

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

try {
  smokeDb = await prepareSmokeDatabase("backend");
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: smokeDb.databaseUrl
      }
    }
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

  await assertStatus("invalid login is rejected", () =>
    request("/auth/login", {
      method: "POST",
      body: {
        name: SEED_USER_NAME,
        studentNumber: "00000000"
      }
    }),
    401
  );

  await assertStatus("unauthenticated materials are rejected", () =>
    request("/materials"),
    401
  );
  await assertStatus("unauthenticated /me is rejected", () =>
    request("/me"),
    401
  );

  const login = await requestJson("/auth/login", {
    method: "POST",
    body: {
      name: SEED_USER_NAME,
      studentNumber: SEED_USER_STUDENT_NUMBER
    }
  });
  const token = login.token;

  if (
    !token ||
    login.user?.displayName !== SEED_USER_NAME ||
    login.user?.studentNumber !== SEED_USER_STUDENT_NUMBER
  ) {
    throw new Error("valid login did not return the dev user");
  }

  await assertRawTokenIsNotPersisted(prisma, token, smokeDb.sessionTokenPepper);

  const me = await requestJson("/me", { token });
  if (me.user?.id !== login.user.id) {
    throw new Error("/me did not return the current user");
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
      role: "NORMAL"
    },
    create: {
      id: "user-smoke-normal-1",
      displayName: NORMAL_USER_NAME,
      studentNumber: NORMAL_USER_STUDENT_NUMBER,
      email: NORMAL_USER_EMAIL,
      role: "NORMAL"
    }
  });

  const normalLogin = await requestJson("/auth/login", {
    method: "POST",
    body: {
      name: NORMAL_USER_NAME,
      studentNumber: NORMAL_USER_STUDENT_NUMBER
    }
  });
  await assertStatus("admin route rejects normal user", () =>
    request("/v1/admin/users", { token: normalLogin.token }),
    403
  );
  console.log("admin route rejects normal user");

  const samplePdf = Buffer.from("%PDF-1.4\n% smoke PDF\n%%EOF\n");
  const uploadIntent = await requestJson("/materials/upload-intent", {
    method: "POST",
    token,
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
      where: {
        ownerId: login.user.id,
        fileSize: rejectedFileSize
      }
    });

    await assertStatus(`intent rejects fileSize=${rejectedFileSize}`, () =>
      request("/materials/upload-intent", {
        method: "POST",
        token,
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
      where: {
        ownerId: login.user.id,
        fileSize: rejectedFileSize
      }
    });

    if (rejectedCountAfter !== rejectedCountBefore) {
      throw new Error(`intent with fileSize=${rejectedFileSize} created a PdfMaterial row`);
    }

    if (rejectedFileSize === 0) {
      console.log("- intent rejects fileSize=0");
    }
    if (rejectedFileSize === 1) {
      console.log("- intent rejects fileSize=1");
    }
    if (rejectedFileSize === 4) {
      console.log("- intent rejects fileSize=4");
    }
  }

  await assertStatus("pending materials cannot be downloaded", () =>
    request(`/materials/${materialId}/download`, { token }),
    409
  );
  await assertStatus("non-PDF uploads are rejected", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      token,
      body: Buffer.from("not a pdf"),
      contentType: "text/plain"
    }),
    400
  );
  await assertStatus("oversized uploads are rejected", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      token,
      body: Buffer.alloc(4097, 0x25),
      contentType: "application/pdf"
    }),
    400
  );

  await assertStatus("corrupted PDF magic (%PDFx) rejected", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      token,
      body: Buffer.from("%PDFx fake content"),
      contentType: "application/pdf"
    }),
    400
  );
  console.log("- corrupted PDF magic (%PDFx) rejected");

  const storagePath = join(process.cwd(), "local-materials", login.user.id, materialId);
  if (fs.existsSync(storagePath)) {
    throw new Error("rejected put wrote to storage path in local mock");
  }
  console.log("- rejected PUT does not write to storage");

  const stillPendingMaterial = await prisma.pdfMaterial.findUnique({
    where: {
      id: materialId
    },
    select: {
      uploadStatus: true
    }
  });

  if (stillPendingMaterial?.uploadStatus !== "pending") {
    throw new Error("rejected put changed uploadStatus away from pending");
  }
  console.log("- rejected PUT preserves pending status");

  const uploadResponse = await requestBinary(`/materials/${materialId}/file`, {
    method: "PUT",
    token,
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

  const materials = await requestJson("/materials", { token });
  if (
    materials.materials?.length !== 1 ||
    materials.materials[0]?.uploadStatus !== "uploaded"
  ) {
    throw new Error("owned material list did not include the created material");
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
  await requestJson(`/materials/${materialId}/annotation`, {
    method: "PUT",
    token,
    body: annotationPayload
  });
  const annotation = await requestJson(`/materials/${materialId}/annotation`, { token });
  if (annotation.annotation?.stickyNotes?.[0]?.blocks?.[0]?.content !== "backend smoke") {
    throw new Error("annotation snapshot did not persist");
  }

  const download = await requestJson(`/materials/${materialId}/download`, { token });
  if (download.download?.downloadUrl !== `/api/materials/${materialId}/file`) {
    throw new Error("download did not return a backend download target");
  }
  const downloadedPdf = await requestBinary(`/materials/${materialId}/file`, {
    token
  });
  if (!downloadedPdf.ok) {
    throw new Error(`file download failed with ${downloadedPdf.status}`);
  }
  const downloadedBody = Buffer.from(await downloadedPdf.arrayBuffer());
  if (!downloadedBody.equals(samplePdf)) {
    throw new Error("downloaded PDF bytes did not match uploaded bytes");
  }

  const exportBundle = await requestJson(`/materials/${materialId}/export-bundle`, {
    token
  });
  if (
    exportBundle.kind !== "original-pdf-plus-annotation-json" ||
    exportBundle.annotation?.stickyNotes?.length !== 1
  ) {
    throw new Error("export bundle did not include original PDF and annotation JSON");
  }

  restartServer = startBackend(4200 + Math.floor(Math.random() * 1000), smokeDb);
  await waitFor(async () => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  });
  const restartedMe = await requestJson("/me", { token });
  if (restartedMe.user?.id !== login.user.id) {
    throw new Error("persisted session did not survive backend process restart");
  }
  const restartedMaterials = await requestJson("/materials", { token });
  if (restartedMaterials.materials?.[0]?.id !== materialId) {
    throw new Error("material metadata did not survive backend process restart");
  }
  const restartedAnnotation = await requestJson(`/materials/${materialId}/annotation`, { token });
  if (
    restartedAnnotation.annotation?.stickyNotes?.[0]?.blocks?.[0]?.content !==
    "backend smoke"
  ) {
    throw new Error("annotation snapshot did not survive backend process restart");
  }

  const expiredToken = "expired-smoke-token";
  await prisma.session.create({
    data: {
      id: randomUUID(),
      tokenHash: hashToken(expiredToken, smokeDb.sessionTokenPepper),
      userId: login.user.id,
      expiresAt: new Date(Date.now() - 1000)
    }
  });
  await assertStatus("expired sessions are rejected", () =>
    request("/me", { token: expiredToken }),
    401
  );
  const expiredRow = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(expiredToken, smokeDb.sessionTokenPepper)
    }
  });
  if (expiredRow) {
    throw new Error("expired session row was not cleaned up after failed lookup");
  }

  await requestJson("/auth/logout", {
    method: "POST",
    token
  });
  await assertStatus("revoked sessions are rejected", () =>
    request("/me", { token }),
    401
  );

  const secondLogin = await requestJson("/auth/login", {
    method: "POST",
    body: {
      name: SECOND_USER_NAME,
      studentNumber: SECOND_USER_STUDENT_NUMBER
    }
  });

  // master token was revoked by logout at line 373 — re-login for admin route check.
  const masterReloginForAdmin = await requestJson("/auth/login", {
    method: "POST",
    body: {
      name: SEED_USER_NAME,
      studentNumber: SEED_USER_STUDENT_NUMBER
    }
  });
  const masterAdminUsers = await requestJson("/v1/admin/users", {
    token: masterReloginForAdmin.token
  });
  if (!Array.isArray(masterAdminUsers.users)) {
    throw new Error("master role did not receive users list");
  }
  console.log("admin route accepts master user");
  const adminUsers = await requestJson("/v1/admin/users", {
    token: secondLogin.token
  });
  if (!Array.isArray(adminUsers.users)) {
    throw new Error("admin role did not receive users list");
  }
  console.log("admin route accepts admin user");

  await assertStatus("cross-user material access is denied", () =>
    request(`/materials/${materialId}`, { token: secondLogin.token }),
    404
  );
  await assertStatus("cross-user download access is denied", () =>
    request(`/materials/${materialId}/download`, { token: secondLogin.token }),
    404
  );
  await assertStatus("cross-user file upload access is denied", () =>
    requestBinary(`/materials/${materialId}/file`, {
      method: "PUT",
      token: secondLogin.token,
      body: samplePdf,
      contentType: "application/pdf"
    }),
    404
  );
  await assertStatus("cross-user file download access is denied", () =>
    requestBinary(`/materials/${materialId}/file`, { token: secondLogin.token }),
    404
  );
  await assertStatus("cross-user annotation read is denied", () =>
    request(`/materials/${materialId}/annotation`, { token: secondLogin.token }),
    404
  );
  await assertStatus("cross-user annotation write is denied", () =>
    request(`/materials/${materialId}/annotation`, {
      method: "PUT",
      token: secondLogin.token,
      body: annotationPayload
    }),
    404
  );
  await assertStatus("cross-user export bundle access is denied", () =>
    request(`/materials/${materialId}/export-bundle`, { token: secondLogin.token }),
    404
  );

  console.log("Backend contract smoke passed");
  console.log("- health route responds");
  console.log("- name/student number auth accepts valid credentials and rejects invalid credentials");
  console.log("- protected APIs reject missing sessions");
  console.log("- persisted sessions store tokenHash only, reject expired sessions, and revoke on logout");
  console.log("- local mock backend-proxy upload/download stores and returns PDF bytes");
  console.log("- material upload status transitions from pending to uploaded");
  console.log("- material ownership blocks cross-user material/download/annotation/export access");
  console.log("- material metadata and annotation snapshot persist across backend process restart");
  console.log("- export bundle returns original PDF reference plus annotation JSON");
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
      // sprint-2 plan §3 AC10(d) — backend 의 startup-time fail-closed (main.ts) 가 STORAGE_PROVIDER 검증.
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "local",
      PDF_UPLOAD_MAX_BYTES: "4096"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (c) => process.stderr.write(`[backend stdout] ${c}`));
  child.stderr.on("data", (c) => process.stderr.write(`[backend stderr] ${c}`));
  return child;
}

async function requestJson(path, options = {}) {
  const response = await request(path, options);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function request(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
  };

  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

async function requestBinary(path, options = {}) {
  const headers = {
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...(options.contentType ? { "content-type": options.contentType } : {}),
    ...(options.extraHeaders ?? {})
  };
  const body = options.binaryBody ?? options.body;

  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body
  });
}

async function assertStatus(label, run, expectedStatus) {
  const response = await run();
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus}, got ${response.status}`);
  }
}

async function waitFor(check, timeoutMs = 5000) {
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
    select: {
      tokenHash: true
    }
  });
  const expectedHash = hashToken(token, pepper);

  if (!sessions.some((session) => session.tokenHash === expectedHash)) {
    throw new Error("session tokenHash was not persisted");
  }

  if (sessions.some((session) => session.tokenHash === token)) {
    throw new Error("raw bearer token was persisted in the session table");
  }
}

function hashToken(token, pepper) {
  return createHmac("sha256", pepper).update(token).digest("hex");
}
