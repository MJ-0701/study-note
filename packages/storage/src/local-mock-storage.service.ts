import { Injectable } from "@nestjs/common";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import type { PdfMaterialRecord } from "@study-note/domain";
import type {
  DownloadIntent,
  HeadObjectResult,
  ListJsonObjectsOptions,
  ListJsonObjectsResult,
  StorageObjectInput,
  StorageObjectOutput,
  UploadIntent
} from "./storage.port";
import { ObjectNotFoundError, StoragePort } from "./storage.port";

type ManifestEntry = { body: string; contentType: string };
type Manifest = Record<string, ManifestEntry>;

@Injectable()
export class LocalMockStorageService extends StoragePort {
  private readonly objects = new Map<
    string,
    {
      body: Buffer;
      contentType: string;
    }
  >();

  private readonly baseDir: string;
  private readonly manifestPath: string;

  constructor() {
    super();
    this.baseDir =
      process.env["STORAGE_LOCAL_DIR"]?.trim() ??
      path.join(os.tmpdir(), "study-note-local-mock");
    this.manifestPath = path.join(this.baseDir, "objects.json");
    mkdirSync(this.baseDir, { recursive: true });
    this.loadManifest();
  }

  private loadManifest(): void {
    try {
      const raw = readFileSync(this.manifestPath, "utf-8");
      const manifest = JSON.parse(raw) as Manifest;
      for (const [key, entry] of Object.entries(manifest)) {
        this.objects.set(key, {
          body: Buffer.from(entry.body, "base64"),
          contentType: entry.contentType
        });
      }
    } catch {
      // No manifest yet — start with empty map.
    }
  }

  private saveManifest(): void {
    const manifest: Manifest = {};
    for (const [key, entry] of this.objects.entries()) {
      manifest[key] = {
        body: entry.body.toString("base64"),
        contentType: entry.contentType
      };
    }
    writeFileSync(this.manifestPath, JSON.stringify(manifest), "utf-8");
  }

  async createUploadIntent(material: PdfMaterialRecord): Promise<UploadIntent> {
    return {
      method: "PUT",
      uploadUrl: `/api/materials/${encodeURIComponent(material.id)}/file`,
      expiresAt: getExpiry(),
      requiredHeaders: {
        "content-type": material.contentType
      }
    };
  }

  createDownloadIntent(material: PdfMaterialRecord): DownloadIntent {
    return {
      method: "GET",
      downloadUrl: `/api/materials/${encodeURIComponent(material.id)}/file`,
      expiresAt: getExpiry()
    };
  }

  async putObject(
    material: PdfMaterialRecord,
    input: StorageObjectInput
  ): Promise<void> {
    const body = await readToBuffer(input.body, input.maxBytes);
    this.objects.set(material.storageKey, {
      body,
      contentType: input.contentType
    });
    this.saveManifest();
  }

  async getObject(material: PdfMaterialRecord): Promise<StorageObjectOutput> {
    const object = this.objects.get(material.storageKey);

    if (!object) {
      throw new Error(`Local mock object not found for ${material.storageKey}`);
    }

    return {
      body: Readable.from(object.body),
      contentType: object.contentType,
      contentLength: object.body.length
    };
  }

  async headObject(storageKey: string): Promise<HeadObjectResult> {
    const object = this.objects.get(storageKey);

    if (!object) {
      throw new ObjectNotFoundError(storageKey);
    }

    return {
      contentLength: object.body.length,
      contentType: object.contentType
    };
  }

  async deleteObject(storageKey: string): Promise<void> {
    this.objects.delete(storageKey);
    this.saveManifest();
  }

  async readObjectPrefix(storageKey: string, length: number): Promise<Buffer> {
    const object = this.objects.get(storageKey);
    if (!object) {
      throw new ObjectNotFoundError(storageKey);
    }
    return object.body.subarray(0, length);
  }

  async putJsonObject<T>(key: string, body: T): Promise<void> {
    const json = JSON.stringify(body);
    this.objects.set(key, {
      body: Buffer.from(json, "utf-8"),
      contentType: "application/json; charset=utf-8"
    });
    this.saveManifest();
  }

  async getJsonObject<T>(key: string): Promise<T | null> {
    const object = this.objects.get(key);
    if (!object) {
      return null;
    }
    return JSON.parse(object.body.toString("utf-8")) as T;
  }

  async listJsonObjects(
    prefix: string,
    options: ListJsonObjectsOptions = {}
  ): Promise<ListJsonObjectsResult> {
    const maxKeys = Math.min(options.maxKeys ?? 50, 100);
    const allKeys = Array.from(this.objects.keys())
      .filter((key) => key.startsWith(prefix))
      .sort();
    const startIdx = options.cursor
      ? Math.max(0, allKeys.indexOf(options.cursor) + 1)
      : 0;
    const slice = allKeys.slice(startIdx, startIdx + maxKeys);
    const nextCursor =
      startIdx + maxKeys < allKeys.length && slice.length > 0
        ? slice[slice.length - 1] ?? null
        : null;
    return { keys: slice, nextCursor };
  }
}

function getExpiry() {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

async function readToBuffer(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;

    if (total > maxBytes) {
      throw new Error("Local mock upload exceeded maxBytes");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}
