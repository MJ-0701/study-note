import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { Readable } from "node:stream";
import type { AnnotationSnapshotRecord, PdfMaterialRecord } from "../domain/workspace.types";
import type {
  DownloadIntent,
  ExportBundle,
  StorageObjectInput,
  StorageObjectOutput,
  UploadIntent
} from "./storage.port";
import { StoragePort } from "./storage.port";

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export interface S3ClientLike {
  send(command: PutObjectCommand | GetObjectCommand): Promise<unknown>;
}

@Injectable()
export class S3StorageService extends StoragePort {
  constructor(
    private readonly client: S3ClientLike,
    private readonly config: S3StorageConfig
  ) {
    super();
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): S3StorageService {
    const bucket = requireEnv(env, "S3_BUCKET");
    const region = requireEnv(env, "S3_REGION");
    const endpoint = env.S3_ENDPOINT?.trim() || undefined;
    const forcePathStyle = readBoolean(env.S3_FORCE_PATH_STYLE);

    return new S3StorageService(
      new S3Client({
        region,
        ...(endpoint ? { endpoint } : {}),
        ...(forcePathStyle === undefined ? {} : { forcePathStyle })
      }),
      {
        bucket,
        region,
        ...(endpoint ? { endpoint } : {}),
        ...(forcePathStyle === undefined ? {} : { forcePathStyle })
      }
    );
  }

  createUploadIntent(material: PdfMaterialRecord): UploadIntent {
    return {
      method: "PUT",
      uploadUrl: `/api/materials/${encodeURIComponent(material.id)}/file`,
      storageKey: material.storageKey,
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
      storageKey: material.storageKey,
      expiresAt: getExpiry()
    };
  }

  async putObject(
    material: PdfMaterialRecord,
    input: StorageObjectInput
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: material.storageKey,
        Body: input.body,
        ContentLength: input.contentLength,
        ContentType: input.contentType
      })
    );
  }

  async getObject(material: PdfMaterialRecord): Promise<StorageObjectOutput> {
    const result = (await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: material.storageKey
      })
    )) as {
      Body?: unknown;
      ContentLength?: number;
      ContentType?: string;
    };

    return {
      body: await toReadable(result.Body),
      contentType: result.ContentType || material.contentType,
      ...(typeof result.ContentLength === "number"
        ? { contentLength: result.ContentLength }
        : {})
    };
  }

  createExportBundle(
    material: PdfMaterialRecord,
    annotation: AnnotationSnapshotRecord
  ): ExportBundle {
    return {
      kind: "original-pdf-plus-annotation-json",
      generatedAt: new Date().toISOString(),
      material,
      originalPdf: this.createDownloadIntent(material),
      annotation
    };
  }
}

function getExpiry() {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required when STORAGE_PROVIDER=s3`);
  }

  return value;
}

function readBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

async function toReadable(body: unknown): Promise<Readable> {
  if (body instanceof Readable) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Readable.from(body);
  }

  if (
    body &&
    typeof body === "object" &&
    typeof (body as { transformToByteArray?: unknown }).transformToByteArray ===
      "function"
  ) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> })
      .transformToByteArray();
    return Readable.from(bytes);
  }

  if (body && typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function") {
    return Readable.from(body as AsyncIterable<Uint8Array>);
  }

  throw new Error("S3 object body is missing or unsupported");
}
