import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { prepareSmokeDatabase } from "./smoke-db.mjs";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const backendPort = 3001 + Math.floor(Math.random() * 1000);
const backendBaseUrl = `http://127.0.0.1:${backendPort}/api`;
const vitePort = 5173 + Math.floor(Math.random() * 1000);
const viteBaseUrl = `http://127.0.0.1:${vitePort}`;
const appUrl = `${viteBaseUrl}/#/subjects/digital-engineering/pdf-workspace`;
const remotePort = 9223 + Math.floor(Math.random() * 1000);
const subjectId = "digital-engineering";
const storageKey = "study-note.pdf-workspaces.v1";
const authStorageKey = "study-note.auth-session.v1";

const SEED_USER_NAME = process.env.STUDY_NOTE_DEV_USER_NAME ?? "Dev User";
const SEED_USER_STUDENT_NUMBER = process.env.STUDY_NOTE_DEV_STUDENT_NUMBER ?? "20260001";

const tempRoot = await mkdtemp(join(tmpdir(), "study-note-pdf-smoke-"));
const userDataDir = join(tempRoot, "chrome");
const samplePdfPath = join(tempRoot, "sample-lecture.pdf");

await writeFile(samplePdfPath, createSamplePdf());

const backendLogs = [];
let smokeDb;
let backendServer;

const viteLogs = [];
const viteServer = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "dev", "--", "--port", String(vitePort), "--strictPort"],
  {
    env: {
      ...process.env,
      BROWSER: "none",
      VITE_API_BASE_URL: backendBaseUrl
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);
viteServer.stdout.on("data", (chunk) => viteLogs.push(String(chunk)));
viteServer.stderr.on("data", (chunk) => viteLogs.push(String(chunk)));

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  `--user-data-dir=${userDataDir}`,
  `--remote-debugging-port=${remotePort}`,
  "about:blank"
], {
  stdio: ["ignore", "ignore", "pipe"]
});

let cdp;

try {
  smokeDb = await prepareSmokeDatabase("pdf-workspace");
  backendServer = spawn("node", ["apps/api/dist/main.js"], {
    env: {
      ...process.env,
      PORT: String(backendPort),
      DATABASE_URL: smokeDb.databaseUrl,
      SESSION_TOKEN_PEPPER: smokeDb.sessionTokenPepper
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  backendServer.stdout.on("data", (chunk) => backendLogs.push(String(chunk)));
  backendServer.stderr.on("data", (chunk) => backendLogs.push(String(chunk)));

  await waitFor(async () => {
    try {
      const response = await fetch(`${backendBaseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }).catch((error) => {
    throw new Error(
      `Backend smoke server did not start: ${error instanceof Error ? error.message : String(error)}\n${backendLogs.join("")}`
    );
  });

  await waitFor(async () => {
    try {
      const response = await fetch(viteBaseUrl);
      return response.ok;
    } catch {
      return false;
    }
  }).catch((error) => {
    throw new Error(
      `Vite smoke server did not start: ${error instanceof Error ? error.message : String(error)}\n${viteLogs.join("")}`
    );
  });

  cdp = await connectToChrome();
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: appUrl });
  await waitFor(() => evaluate("Boolean(document.querySelector('[data-login-screen]'))"));
  await assertEval(
    "document.body.innerText.includes('study-note 로그인')",
    "login-first gate renders"
  );

  await submitLogin(SEED_USER_NAME, "00000000");
  await waitFor(() => evaluate(`{
    return Boolean(document.querySelector('[data-login-screen]')) &&
      document.body.innerText.includes('로그인하지 못했습니다') &&
      !localStorage.getItem('${authStorageKey}');
  }`));

  await submitLogin(SEED_USER_NAME, SEED_USER_STUDENT_NUMBER);
  await waitFor(() => evaluate("Boolean(document.querySelector('[data-pdf-annotation-surface]'))"));
  await assertEval(`{
    const raw = localStorage.getItem('${authStorageKey}');
    const session = raw ? JSON.parse(raw) : {};
    return Boolean(
      session.token &&
      session.user?.displayName === ${JSON.stringify(SEED_USER_NAME)} &&
      session.user?.studentNumber === ${JSON.stringify(SEED_USER_STUDENT_NUMBER)}
    );
  }`, "frontend login form stores backend auth session");

  await assertEval(`{
    return document.body.innerText.includes('디지털공학개론 PDF 필기');
  }`, "valid backend login enters PDF workspace");

  const validSession = await evaluate(`localStorage.getItem('${authStorageKey}')`);
  await evaluate(`{
    localStorage.setItem('${authStorageKey}', JSON.stringify({
      token: 'invalid-smoke-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'user-dev-1',
        displayName: ${JSON.stringify(SEED_USER_NAME)},
        studentNumber: ${JSON.stringify(SEED_USER_STUDENT_NUMBER)}
      }
    }));
    return true;
  }`);
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(() => evaluate(`{
    return Boolean(document.querySelector('[data-login-screen]')) &&
      document.body.innerText.includes('세션을 다시 확인하지 못했습니다') &&
      !localStorage.getItem('${authStorageKey}');
  }`));

  await evaluate(`{
    const session = JSON.parse(${JSON.stringify(validSession)});
    localStorage.setItem('${authStorageKey}', JSON.stringify({
      ...session,
      user: {
        id: 'stale-user-id',
        displayName: 'Stale Stored User',
        studentNumber: '00000000'
      }
    }));
    return true;
  }`);
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(() => evaluate("Boolean(document.querySelector('[data-pdf-annotation-surface]'))"));
  await assertEval(`{
    const raw = localStorage.getItem('${authStorageKey}');
    const session = raw ? JSON.parse(raw) : {};
    return Boolean(
      session.token &&
      session.user?.displayName === ${JSON.stringify(SEED_USER_NAME)} &&
      session.user?.studentNumber === ${JSON.stringify(SEED_USER_STUDENT_NUMBER)}
    );
  }`, "stored valid session revalidates through /api/me before workspace render");

  await assertEval(
    "document.body.innerText.includes('디지털공학개론 PDF 필기')",
    "PDF workspace route renders"
  );

  const revalidatedSession = JSON.parse(
    await evaluate(`localStorage.getItem('${authStorageKey}')`)
  );
  await setFileInput(samplePdfPath);
  await waitFor(() => evaluate(`{
    const raw = localStorage.getItem('${storageKey}');
    const data = raw ? JSON.parse(raw) : {};
    const material = data.workspaces?.['${subjectId}']?.material;
    return Boolean(
      material?.fileName === 'sample-lecture.pdf' &&
      material?.backendMaterialId &&
      material?.uploadStatus === 'uploaded'
    );
  }`), 10000);
  await assertEval(
    "document.querySelector('.pdf-frame')?.src.startsWith('blob:')",
    "backend PDF iframe preview renders from authenticated Blob URL"
  );

  const uploadedMaterial = await evaluate(`{
    const raw = localStorage.getItem('${storageKey}');
    const data = raw ? JSON.parse(raw) : {};
    return data.workspaces?.['${subjectId}']?.material;
  }`);
  const materials = await requestBackendJson("/materials", revalidatedSession.token);
  if (
    !materials.materials?.some(
      (material) =>
        material.id === uploadedMaterial.backendMaterialId &&
        material.subjectId === subjectId &&
        material.uploadStatus === "uploaded"
    )
  ) {
    throw new Error(
      `Smoke assertion failed: backend material list contains uploaded PDF ${JSON.stringify(materials)}`
    );
  }
  await assertBackendStatus(
    "unauthenticated PDF file download is rejected",
    () =>
      fetch(
        `${backendBaseUrl}/materials/${encodeURIComponent(uploadedMaterial.backendMaterialId)}/file`
      ),
    401
  );

  await evaluate(`{
    const raw = localStorage.getItem('${storageKey}');
    const data = raw ? JSON.parse(raw) : {};
    delete data.workspaces['${subjectId}'].material;
    localStorage.setItem('${storageKey}', JSON.stringify(data));
    return true;
  }`);
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(() => evaluate(`{
    const raw = localStorage.getItem('${storageKey}');
    const data = raw ? JSON.parse(raw) : {};
    const material = data.workspaces?.['${subjectId}']?.material;
    return Boolean(
      material?.backendMaterialId === ${JSON.stringify(uploadedMaterial.backendMaterialId)} &&
      material?.uploadStatus === 'uploaded' &&
      document.querySelector('.pdf-frame')?.src.startsWith('blob:')
    );
  }`), 10000);
  await waitFor(() => evaluate("document.querySelector('[data-pdf-annotation-surface]')?.classList.contains('is-read-mode')"));
  await assertEval(
    `{
      const surface = document.querySelector('[data-pdf-annotation-surface]');
      const stage = document.querySelector('.pdf-stage').getBoundingClientRect();
      const target = document.elementFromPoint(stage.left + stage.width * 0.5, stage.top + stage.height * 0.5);
      return window.getComputedStyle(surface).pointerEvents === 'none' &&
        !target?.closest('[data-pdf-annotation-surface]');
    }`,
    "read mode passes pointer interaction through to PDF iframe"
  );

  await click(`[data-action="add-sticky-note"][data-block-kind="text"]`);
  await waitFor(() => evaluate("document.querySelectorAll('.sticky-note').length === 1"));
  await evaluate(`{
    const textarea = document.querySelector('.sticky-note textarea');
    textarea.value = 'reload persistence smoke';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }`);
  await waitFor(() => evaluate(`{
    const raw = localStorage.getItem('${storageKey}');
    const data = raw ? JSON.parse(raw) : {};
    const note = data.workspaces?.['${subjectId}']?.stickyNotes?.[0];
    return note?.blocks?.[0]?.content === 'reload persistence smoke';
  }`));

  await click(`[data-action="set-pdf-tool"][data-tool="pen"]`);
  await drawStroke();
  await waitFor(() => evaluate(`{
    const raw = localStorage.getItem('${storageKey}');
    const data = raw ? JSON.parse(raw) : {};
    return (data.workspaces?.['${subjectId}']?.inkStrokes ?? []).length > 0;
  }`));

  await cdp.send("Page.reload", { ignoreCache: true });
  await delay(500);
  await waitFor(() => evaluate("document.querySelectorAll('.sticky-note').length === 1"));
  const stickyReload = await evaluate(`{
    const raw = localStorage.getItem('${storageKey}');
    const data = raw ? JSON.parse(raw) : {};
    const notes = data.workspaces?.['${subjectId}']?.stickyNotes ?? [];
    const textareas = Array.from(document.querySelectorAll('.sticky-note textarea')).map((item) => item.value);
    return {
      ok: document.querySelectorAll('.sticky-note').length === 1 &&
        notes.some((note) => note?.blocks?.[0]?.content === 'reload persistence smoke'),
      noteCount: notes.length,
      blockContents: notes.map((note) => note?.blocks?.[0]?.content),
      textareas
    };
  }`);
  if (!stickyReload.ok) {
    throw new Error(
      `Smoke assertion failed: sticky note persists after reload ${JSON.stringify(stickyReload)}`
    );
  }
  await assertEval(
    "document.querySelectorAll('.ink-stroke').length > 0",
    "pen stroke persists after reload"
  );

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await cdp.send("Page.reload", { ignoreCache: true });
  await delay(500);
  let mobileLayout;
  try {
    await waitFor(async () => {
      mobileLayout = await evaluate(`{
        const toolbarElement = document.querySelector('.pdf-toolbar');
        const stageElement = document.querySelector('.pdf-stage');
        if (!toolbarElement || !stageElement) {
          return { ok: false, reason: 'missing-elements' };
        }
        const toolbar = toolbarElement.getBoundingClientRect();
        const stage = stageElement.getBoundingClientRect();
        const toolbarStyle = window.getComputedStyle(toolbarElement);
        const ok =
          toolbar.bottom <= stage.top ||
          toolbar.right <= stage.left ||
          toolbar.left >= stage.right ||
          toolbar.top >= stage.bottom;

        return {
          ok,
          toolbar: {
            top: toolbar.top,
            right: toolbar.right,
            bottom: toolbar.bottom,
            left: toolbar.left
          },
          stage: {
            top: stage.top,
            right: stage.right,
            bottom: stage.bottom,
            left: stage.left
          },
          toolbarPosition: toolbarStyle.position
        };
      }`);

      return mobileLayout.ok;
    });
  } catch {
    throw new Error(
      `Smoke assertion failed: mobile toolbar does not overlap PDF stage ${JSON.stringify(mobileLayout)}`
    );
  }

  console.log("PDF workspace smoke passed");
  console.log("- login-first gate renders before workspace access");
  console.log("- frontend login form rejects invalid name/student number and enters workspace with backend auth");
  console.log("- invalid stored session is cleared before workspace access");
  console.log("- valid stored session revalidates through /api/me before workspace access");
  console.log("- route renders");
  console.log("- backend PDF upload/download renders Blob iframe preview");
  console.log("- backend material list restores latest uploaded PDF after reload");
  console.log("- unauthenticated PDF file download is rejected");
  console.log("- sticky note persists after reload");
  console.log("- pen stroke persists after reload");
  console.log("- read mode passes pointer interaction through to PDF iframe");
  console.log("- mobile toolbar does not overlap PDF stage");
} finally {
  cdp?.close();
  chrome.kill("SIGTERM");
  viteServer.kill("SIGTERM");
  backendServer?.kill("SIGTERM");
  await smokeDb?.stop();
  await removeTempRoot();
}

function createSamplePdf() {
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 70 >>
stream
BT /F1 24 Tf 72 720 Td (Study Note PDF Smoke Page) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000361 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
431
%%EOF
`;
}

async function connectToChrome() {
  await waitFor(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${remotePort}/json/version`);
      return response.ok;
    } catch {
      return false;
    }
  });

  const response = await fetch(`http://127.0.0.1:${remotePort}/json/list`);
  const targets = await response.json();
  const target = targets.find((item) => item.type === "page") ?? targets[0];

  if (!target?.webSocketDebuggerUrl) {
    throw new Error("Chrome DevTools target not found");
  }

  return createCdpClient(target.webSocketDebuggerUrl);
}

function createCdpClient(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (!payload.id || !pending.has(payload.id)) {
      return;
    }

    const { resolve, reject } = pending.get(payload.id);
    pending.delete(payload.id);

    if (payload.error) {
      reject(new Error(payload.error.message));
      return;
    }

    resolve(payload.result);
  });

  return {
    close() {
      socket.close();
    },
    async send(method, params = {}) {
      await new Promise((resolve) => {
        if (socket.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }
        socket.addEventListener("open", resolve, { once: true });
      });

      const messageId = ++id;
      const response = new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
      });

      socket.send(JSON.stringify({ id: messageId, method, params }));
      return response;
    }
  };
}

async function evaluate(expression) {
  const source = expression.trim();
  const wrappedExpression = source.startsWith("{")
    ? `(() => ${source})()`
    : `(() => (${source}))()`;
  const result = await cdp.send("Runtime.evaluate", {
    expression: wrappedExpression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "Runtime.evaluate failed"
    );
  }

  return result.result.value;
}

async function assertEval(expression, label) {
  const ok = await evaluate(expression);
  if (!ok) {
    throw new Error(`Smoke assertion failed: ${label}`);
  }
}

async function assertBackendStatus(label, request, expectedStatus) {
  const response = await request();

  if (response.status !== expectedStatus) {
    throw new Error(
      `Smoke assertion failed: ${label}; expected ${expectedStatus}, got ${response.status}`
    );
  }
}

async function requestBackendJson(path, token) {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(
      `Backend request failed ${path}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

async function click(selector) {
  await evaluate(`{
    const element = document.querySelector(${JSON.stringify(selector)});
    element?.click();
    return Boolean(element);
  }`);
}

async function submitLogin(name, studentNumber) {
  await evaluate(`{
    const nameInput = document.querySelector('input[name="name"]');
    const studentNumberInput = document.querySelector('input[name="studentNumber"]');
    const form = document.querySelector('form[data-action="login"]');
    if (!nameInput || !studentNumberInput || !form) {
      return false;
    }
    nameInput.value = ${JSON.stringify(name)};
    studentNumberInput.value = ${JSON.stringify(studentNumber)};
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    studentNumberInput.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
    return true;
  }`);
}

async function setFileInput(filePath) {
  const documentNode = await cdp.send("DOM.getDocument", { depth: -1 });
  const input = await cdp.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: "#pdf-file-digital-engineering"
  });

  if (!input.nodeId) {
    throw new Error("PDF file input not found");
  }

  await cdp.send("DOM.setFileInputFiles", {
    nodeId: input.nodeId,
    files: [filePath]
  });
  await evaluate(`{
    const input = document.querySelector('#pdf-file-digital-engineering');
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }`);
}

async function drawStroke() {
  await evaluate(`{
    const surface = document.querySelector('[data-pdf-annotation-surface]');
    const rect = surface.getBoundingClientRect();
    const base = {
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      pointerType: 'pen',
      pressure: 0.5
    };
    const points = [
      { clientX: rect.left + rect.width * 0.22, clientY: rect.top + rect.height * 0.2 },
      { clientX: rect.left + rect.width * 0.34, clientY: rect.top + rect.height * 0.28 },
      { clientX: rect.left + rect.width * 0.48, clientY: rect.top + rect.height * 0.22 }
    ];

    surface.dispatchEvent(new PointerEvent('pointerdown', { ...base, ...points[0] }));
    surface.dispatchEvent(new PointerEvent('pointermove', { ...base, ...points[1] }));
    surface.dispatchEvent(new PointerEvent('pointerup', { ...base, ...points[2], pressure: 0 }));
    return true;
  }`);
}

async function waitFor(check, timeoutMs = 5000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await check()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(100);
  }

  const detail = lastError instanceof Error ? `: ${lastError.message}` : "";
  throw new Error(`Timed out while waiting for smoke condition${detail}`);
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeTempRoot() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(tempRoot, { recursive: true, force: true });
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (attempt === 2) {
        console.warn(
          `Smoke cleanup skipped: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
}
