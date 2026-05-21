export type PdfMaterialUploadStatus = "pending" | "uploaded";

export interface PdfMaterialRecord {
  id: string;
  /** @deprecated Use uploaderId. ownerId remains an uploader/audit alias. */
  ownerId: string;
  uploaderId: string;
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: string;
  storageKey: string;
  uploadStatus: PdfMaterialUploadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialUploadIntentInput {
  subjectId: string;
  classDate: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  contentType: "application/pdf";
}

export interface MaterialUploadIntent {
  material: PdfMaterialRecord;
  upload: {
    method: "PUT";
    uploadUrl: string;
    storageKey: string;
    expiresAt: string;
    requiredHeaders: Record<string, string>;
  };
}

export class MaterialApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly statusText: string
  ) {
    super(message);
    this.name = "MaterialApiError";
  }
}

// slice-2: token parameter removed — auth is now via httpOnly cookie (F2).
// All fetch calls use credentials: "include" so the browser sends the cookie.

export async function createMaterialUploadIntent(
  apiBaseUrl: string,
  input: MaterialUploadIntentInput
): Promise<MaterialUploadIntent> {
  return fetchJson<MaterialUploadIntent>(apiBaseUrl, "/materials/upload-intent", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
}

/**
 * Upload a PDF file using the S3 direct-PUT flow (intent → S3 PUT → completion).
 *
 * Flow:
 *   (a) POST /api/materials/upload-intent → intent (materialId + uploadUrl)
 *   (b) Browser → S3 direct PUT (omit credentials — cross-origin S3 call; no cookie needed)
 *       Exception: if uploadUrl is relative (local-mock provider) → use credentials:include
 *       so the existing Nest PUT handler's SessionAuthGuard passes.
 *   (c) POST /api/materials/:id/complete → confirms upload to BE
 *
 * Retry (exponential backoff): S3 PUT 5xx/network errors → 1s/2s/4s, max 3 attempts.
 * 4xx = immediate throw (no retry).
 */
export async function uploadMaterialFile(
  apiBaseUrl: string,
  intent: MaterialUploadIntent,
  file: File
): Promise<PdfMaterialRecord> {
  const { material, upload } = intent;
  const materialId = material.id;
  const isS3Direct = /^https?:\/\//i.test(upload.uploadUrl);

  // Exponential backoff retry: 1s, 2s, 4s
  const delays = [1000, 2000, 4000];
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let response: Response;

      if (isS3Direct) {
        // Cross-origin S3 PUT — omit cookies (no session required for pre-signed URL)
        response = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: upload.requiredHeaders,
          body: file
          // Note: no credentials option → defaults to "same-origin", effectively omits cookie for cross-origin
        });
      } else {
        // Local-mock: relative URL hitting Nest PUT handler (requires session cookie)
        response = await fetch(resolveApiUrl(apiBaseUrl, upload.uploadUrl), {
          method: "PUT",
          headers: {
            "content-type": "application/pdf",
            "content-length": String(file.size),
            ...upload.requiredHeaders
          },
          credentials: "include",
          body: file
        });
      }

      if (response.ok) {
        console.info(`materials.s3-put.ok materialId=${materialId} bytes=${file.size}`);
        lastError = undefined; // 이전 attempt 의 stale error 초기화 (post-loop check 방어)
        break; // S3 PUT succeeded, proceed to completion
      }

      // 4xx — do not retry
      if (response.status >= 400 && response.status < 500) {
        throw new MaterialApiError(
          `S3 PUT failed with status ${response.status}`,
          response.status,
          response.statusText
        );
      }

      // 5xx — retry
      const msg = `HTTP ${response.status} ${response.statusText}`;
      lastError = new Error(msg);
      if (attempt < 3) {
        console.warn(`materials.s3-put.retry attempt=${attempt}/3 reason=${msg}`);
        await sleep(delays[attempt - 1] ?? 4000);
      } else {
        console.warn(`materials.s3-put.retry attempt=${attempt}/3 reason=${msg}`);
      }
    } catch (error) {
      if (error instanceof MaterialApiError) throw error;

      // Network / CORS failure — retry
      const msg = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(msg);
      if (attempt < 3) {
        console.warn(`materials.s3-put.retry attempt=${attempt}/3 reason=${msg}`);
        await sleep(delays[attempt - 1] ?? 4000);
      } else {
        console.warn(`materials.s3-put.retry attempt=${attempt}/3 reason=${msg}`);
      }
    }
  }

  if (lastError) {
    // All retries exhausted
    throw lastError;
  }

  // (c) Notify BE that upload is complete
  return completeMaterialUpload(apiBaseUrl, materialId);
}

/**
 * Notify backend that S3 upload is complete.
 * Returns PdfMaterialRecord with uploadStatus=uploaded.
 * Exported for callers that need bare completion (e.g. retry after S3 PUT success).
 */
export async function completeMaterialUpload(
  apiBaseUrl: string,
  materialId: string
): Promise<PdfMaterialRecord> {
  return fetchJson<PdfMaterialRecord>(
    apiBaseUrl,
    `/materials/${encodeURIComponent(materialId)}/complete`,
    { method: "POST" }
  );
}

export async function updatePdfMaterialMetadata(
  apiBaseUrl: string,
  materialId: string,
  input: { classDate: string }
): Promise<PdfMaterialRecord> {
  return fetchJson<PdfMaterialRecord>(
    apiBaseUrl,
    `/materials/${encodeURIComponent(materialId)}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listPdfMaterials(
  apiBaseUrl: string
): Promise<PdfMaterialRecord[]> {
  const payload = await fetchJson<{ materials: PdfMaterialRecord[] }>(
    apiBaseUrl,
    "/materials"
  );

  return payload.materials;
}

export async function fetchPdfMaterialFile(
  apiBaseUrl: string,
  materialId: string
): Promise<Blob> {
  const response = await fetch(
    resolveApiUrl(apiBaseUrl, `/materials/${encodeURIComponent(materialId)}/file`),
    {
      credentials: "include"
    }
  );

  if (!response.ok) {
    throw await createMaterialApiError(response);
  }

  return response.blob();
}

async function fetchJson<T>(
  apiBaseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(resolveApiUrl(apiBaseUrl, path), {
    ...init,
    credentials: "include"
  });

  if (!response.ok) {
    throw await createMaterialApiError(response);
  }

  return response.json() as Promise<T>;
}

function resolveApiUrl(apiBaseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const absoluteBase = /^https?:\/\//i.test(apiBaseUrl)
    ? apiBaseUrl
    : `${window.location.origin}${apiBaseUrl.startsWith("/") ? apiBaseUrl : `/${apiBaseUrl}`}`;
  const normalizedBase = absoluteBase.endsWith("/") ? absoluteBase : `${absoluteBase}/`;
  const normalizedPath = path.startsWith("/api/")
    ? path
    : path.replace(/^\/+/, "");

  return new URL(normalizedPath, normalizedBase).toString();
}

async function createMaterialApiError(response: Response): Promise<MaterialApiError> {
  let message = response.statusText || `HTTP ${response.status}`;

  try {
    const payload = (await response.clone().json()) as {
      message?: string | string[];
      error?: string;
    };
    const payloadMessage = Array.isArray(payload.message)
      ? payload.message.join(" / ")
      : payload.message;

    message = payloadMessage ?? payload.error ?? message;
  } catch {
    try {
      const text = await response.text();
      message = text || message;
    } catch {
      // Keep the status text fallback.
    }
  }

  return new MaterialApiError(message, response.status, response.statusText);
}
