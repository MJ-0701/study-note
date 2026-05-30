import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
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
    command:
      | PutObjectCommand
      | GetObjectCommand
      | HeadObjectCommand
      | DeleteObjectCommand
      | ListObjectsV2Command
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
    const forcePathStyle = parseBoolEnv(env["S3_FORCE_PATH_STYLE"]);

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
      // AWS SDK v3 HeadObjectCommand missing-key 식별 (narrowing):
      //   - err.name === "NotFound"  : HeadObject 전용 SDK v3 공식 missing-key 시그널
      //   - err.Code === "NoSuchKey" : 구 SDK / 일부 localstack 응답 호환
      //
      // 의도적으로 제외한 조건:
      //   - err.name === "NoSuchKey" : GetObject 시그널, HeadObject 에는 불필요
      //   - httpStatusCode === 404   : NoSuchBucket, 잘못된 endpoint, IAM 등
      //     인프라 장애도 404를 반환할 수 있어 ObjectNotFoundError 로 잘못 분류될 위험.
      //     인프라 장애는 원본 rethrow → 500 surface → 운영자 alert 유도.
      const e = err as Record<string, unknown>;
      const isMissingKey =
        e["name"] === "NotFound" ||
        e["Code"] === "NoSuchKey";

      if (isMissingKey) {
        throw new ObjectNotFoundError(storageKey);
      }

      // 인프라 장애(auth / network / NoSuchBucket / 5xx) — 원본 error 그대로 rethrow
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

  /**
   * S3 Range GET: first `length` bytes of object.
   * Used by completeUpload to verify %PDF- magic without fetching the full file.
   *
   * Missing-key narrowing (GetObject 기준):
   *   - name === "NoSuchKey": SDK v3 공식 GetObject missing-key 시그널
   *   - Code === "NoSuchKey": localstack / 구 SDK 호환
   * HeadObject (name === "NotFound") 은 GetObject 에 적용되지 않으므로 제외.
   *
   * O(1) data transfer — 5 byte Range GET. S3 cost: GET 1 회 (min billable unit 동일).
   */
  async readObjectPrefix(storageKey: string, length: number): Promise<Buffer> {
    let result: unknown;
    try {
      result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: storageKey,
          Range: `bytes=0-${length - 1}`
        })
      );
    } catch (err) {
      const e = err as Record<string, unknown>;
      const isMissingKey =
        e["name"] === "NoSuchKey" ||
        e["Code"] === "NoSuchKey";
      if (isMissingKey) {
        throw new ObjectNotFoundError(storageKey);
      }
      throw err;
    }

    const body = (result as { Body?: unknown }).Body;
    // SDK v3 SdkStream: transformToByteArray() is the canonical path.
    // Fall back to async-iterable aggregation for custom / test clients.
    let bytes: Uint8Array;
    if (body && typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
      bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    } else if (body && typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function") {
      const chunks: Uint8Array[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      bytes = Buffer.concat(chunks);
    } else if (body instanceof Uint8Array) {
      bytes = body;
    } else {
      throw new Error("S3 readObjectPrefix: unsupported body type");
    }

    // Cap to requested length defensively (S3 Range 206 may return up to length bytes)
    return Buffer.from(bytes).subarray(0, length);
  }

  // sprint-2/S1: small JSON object I/O for notes/annotations persistence.
  // Implementation uses the existing S3-compatible client (R2 endpoint in prod).
  async putJsonObject<T>(key: string, body: T): Promise<void> {
    const json = JSON.stringify(body);
    const bytes = Buffer.from(json, "utf-8");
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: bytes,
        ContentType: "application/json; charset=utf-8",
        ContentLength: bytes.length
      })
    );
  }

  async getJsonObject<T>(key: string): Promise<T | null> {
    try {
      const result = (await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        })
      )) as { Body?: unknown };
      const body = result.Body;
      let bytes: Uint8Array;
      if (body && typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
        bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      } else if (body instanceof Uint8Array) {
        bytes = body;
      } else if (body && typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function") {
        const chunks: Buffer[] = [];
        for await (const chunk of body as AsyncIterable<Uint8Array>) {
          chunks.push(Buffer.from(chunk));
        }
        bytes = Buffer.concat(chunks);
      } else {
        throw new Error("S3 getJsonObject: unsupported body type");
      }
      const text = Buffer.from(bytes).toString("utf-8");
      return JSON.parse(text) as T;
    } catch (err) {
      const e = err as Record<string, unknown>;
      const isMissingKey =
        e["name"] === "NoSuchKey" ||
        e["Code"] === "NoSuchKey";
      if (isMissingKey) {
        return null;
      }
      throw err;
    }
  }

  async listJsonObjects(
    prefix: string,
    options: ListJsonObjectsOptions = {}
  ): Promise<ListJsonObjectsResult> {
    const maxKeys = Math.min(options.maxKeys ?? 50, 100);
    const result = (await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: options.cursor
      })
    )) as {
      Contents?: Array<{ Key?: string }>;
      NextContinuationToken?: string;
      IsTruncated?: boolean;
    };
    const keys = (result.Contents ?? [])
      .map((entry) => entry.Key ?? "")
      .filter((key) => key.length > 0);
    const nextCursor = result.IsTruncated ? result.NextContinuationToken ?? null : null;
    return { keys, nextCursor };
  }
}

/**
 * Boolean env helper — accepts common truthy strings (case-insensitive):
 *   "1" | "true" | "yes" | "on" → true
 *   "" | undefined | "false" | "0" | "no" | "off" | anything else → false
 *
 * Sprint-10/slice-1 에서 readBoolean(env.S3_FORCE_PATH_STYLE) 를
 * env["S3_FORCE_PATH_STYLE"] === "true" 로 좁힌 게 회귀:
 *   기존 S3_FORCE_PATH_STYLE=1 이 silently false → localstack/custom endpoint 에서
 *   virtual-host 스타일 시도 → 호스트 미해결 → pre-signed PUT 실패.
 */
function parseBoolEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
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
