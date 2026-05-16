export type PdfMaterialUploadStatus = "pending" | "uploaded";

export interface PdfMaterialRecord {
  id: string;
  ownerId: string;
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

export async function uploadMaterialFile(
  apiBaseUrl: string,
  uploadUrl: string,
  file: File
): Promise<PdfMaterialRecord> {
  const payload = await fetchJson<{ material: PdfMaterialRecord }>(
    apiBaseUrl,
    uploadUrl,
    {
      method: "PUT",
      headers: {
        "content-type": "application/pdf"
      },
      body: file
    }
  );

  return payload.material;
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
