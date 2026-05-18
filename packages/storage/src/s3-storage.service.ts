import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import { Readable } from "node:stream";
import type { AnnotationSnapshotRecord, PdfMaterialRecord } from "@study-note/domain";
import type {
  DownloadIntent,
  ExportBundle,
  HeadObjectResult,
  StorageObjectInput,
  StorageObjectOutput,
  UploadIntent
} from "./storage.port";
import { ObjectNotFoundError, StoragePort } from "./storage.port";

const TTL_SECONDS = 900; // 15 minutes — plan §R6 TTL ≤ 900

export interface S3StorageConfig {
  bucket: string;
  region: string;
  /** Internal endpoint for server-side S3 ops (e.g. http://s3-service:4566 in docker compose) */
  endpoint?: string;
  /** Public endpoint used when signing PUT URLs for browser access (e.g. http://localhost:4566) */
  publicEndpoint?: string;
  forcePathStyle?: boolean;
}

export interface S3ClientLike {
  send(
    command: PutObjectCommand | GetObjectCommand | HeadObjectCommand | DeleteObjectCommand
  ): Promise<unknown>;
}

@Injectable()
export class S3StorageService extends StoragePort {
  private readonly logger = new Logger("materials");

  constructor(
    private readonly client: S3ClientLike,
    private readonly config: S3StorageConfig,
    /** Optional separate signer client with public endpoint — if omitted, presign falls back to client */
    private readonly signerClient?: S3Client
  ) {
    super();
  }

  /**
   * Factory from env. Two S3Client instances:
   * - `client`: uses S3_ENDPOINT (internal docker network) for server-side ops
   * - `signerClient`: uses S3_PUBLIC_ENDPOINT for presigning PUT URLs the browser will call
   *
   * O(1) construction cost — both clients are lazy-connecting.
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): S3StorageService {
    const bucket = requireEnv(env, "S3_BUCKET");
    const region = requireEnv(env, "S3_REGION");
    const endpoint = env["S3_ENDPOINT"]?.trim() || undefined;
    const publicEndpoint = env["S3_PUBLIC_ENDPOINT"]?.trim() || undefined;
    const forcePathStyle = env["S3_FORCE_PATH_STYLE"] === "true";

    // Explicit credentials — required for localstack. Prod uses IAM role → omit if unset.
    const accessKeyId = env["S3_ACCESS_KEY_ID"]?.trim() || undefined;
    const secretAccessKey = env["S3_SECRET_ACCESS_KEY"]?.trim() || undefined;
    const credentials =
      accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {};

    // Internal client for server-side ops (headObject, deleteObject, putObject)
    const internalClient = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
      ...credentials
    });

    // Signer client: uses publicEndpoint so presigned URLs are browser-reachable.
    // If S3_PUBLIC_ENDPOINT not set (prod AWS), signer uses same config as internal
    // (AWS default endpoint is already browser-reachable via virtual-host style).
    // requestChecksumCalculation: "WHEN_REQUIRED" — AWS SDK v3 ≥ 3.729 adds CRC32
    // checksum params to presigned URLs by default (x-amz-checksum-crc32=AAAAAA==).
    // This causes BadDigest/XAmzContentSHA256Mismatch when the browser PUTs actual
    // bytes whose CRC32 != the baked-in zero value. Disable auto-checksum injection.
    const signerClient = new S3Client({
      region,
      ...(publicEndpoint ? { endpoint: publicEndpoint } : endpoint ? { endpoint } : {}),
      forcePathStyle,
      requestChecksumCalculation: "WHEN_REQUIRED",
      ...credentials
    });

    return new S3StorageService(
      internalClient,
      {
        bucket,
        region,
        endpoint,
        publicEndpoint,
        forcePathStyle
      },
      signerClient
    );
  }

  /**
   * Returns a pre-signed PUT URL whose host is S3_PUBLIC_ENDPOINT (browser-reachable).
   * plan AC2: X-Amz-Algorithm=AWS4-HMAC-SHA256, X-Amz-Expires<=900.
   *
   * When signerClient is set (fromEnv path), presigns with the public endpoint.
   * Without signerClient (raw constructor path / tests), returns BE-proxy URL fallback.
   *
   * O(1) excluding SDK network: signs locally using credentials + date without I/O.
   */
  async createUploadIntent(material: PdfMaterialRecord): Promise<UploadIntent> {
    if (this.signerClient) {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: material.storageKey,
        ContentType: material.contentType,
        ContentLength: material.fileSize
      });

      // Type cast needed: getSignedUrl expects Client<any,...> from @smithy/types;
      // S3Client satisfies this at runtime but TypeScript may see duplicate private declarations
      // across pnpm-hoisted @smithy/types copies. Cast is safe — S3Client IS-A Client.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uploadUrl = await getSignedUrl(this.signerClient as any, command, {
        expiresIn: TTL_SECONDS
      });

      const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

      // plan §7.3 observability: INFO log on presigned URL issuance
      this.logger.log(
        `materials.upload-intent.issued materialId=${material.id} bucket=${this.config.bucket} ttlSec=${TTL_SECONDS}`
      );

      return {
        method: "PUT",
        uploadUrl,
        storageKey: material.storageKey,
        expiresAt,
        requiredHeaders: {
          "content-type": material.contentType
        }
      };
    }

    // Fallback for tests using raw constructor without signerClient
    return {
      method: "PUT",
      uploadUrl: `/api/materials/${encodeURIComponent(material.id)}/file`,
      storageKey: material.storageKey,
      expiresAt: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
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
      expiresAt: new Date(Date.now() + TTL_SECONDS * 1000).toISOString()
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

  async headObject(storageKey: string): Promise<HeadObjectResult> {
    try {
      const result = (await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: storageKey
        })
      )) as {
        ContentLength?: number;
        ContentType?: string;
      };

      return {
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType
      };
    } catch (err) {
      // AWS SDK v3 HeadObjectCommand 404 식별:
      //   - err.name === "NotFound"  (HeadObject 전용 — GetObject 는 "NoSuchKey")
      //   - err.Code === "NoSuchKey" (일부 localstack 응답 호환)
      //   - err.$metadata?.httpStatusCode === 404 (모든 경우 안전망)
      const e = err as Record<string, unknown>;
      const is404 =
        e["name"] === "NotFound" ||
        e["name"] === "NoSuchKey" ||
        e["Code"] === "NoSuchKey" ||
        (e["$metadata"] as Record<string, unknown> | undefined)?.["httpStatusCode"] === 404;

      if (is404) {
        throw new ObjectNotFoundError(storageKey);
      }

      // 인프라 장애(auth / network / 5xx) — 원본 error 그대로 rethrow
      throw err;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey
      })
    );
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

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required when STORAGE_PROVIDER=s3`);
  }

  return value;
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
