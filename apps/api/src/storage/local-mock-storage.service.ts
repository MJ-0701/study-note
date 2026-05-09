import { Injectable } from "@nestjs/common";
import { Readable } from "node:stream";
import type { AnnotationSnapshotRecord, PdfMaterialRecord } from "@study-note/domain";
import type {
  DownloadIntent,
  ExportBundle,
  StorageObjectInput,
  StorageObjectOutput,
  UploadIntent
} from "./storage.port";
import { StoragePort } from "./storage.port";

@Injectable()
export class LocalMockStorageService extends StoragePort {
  private readonly objects = new Map<
    string,
    {
      body: Buffer;
      contentType: string;
    }
  >();

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
    const body = await readToBuffer(input.body, input.maxBytes);
    this.objects.set(material.storageKey, {
      body,
      contentType: input.contentType
    });
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
