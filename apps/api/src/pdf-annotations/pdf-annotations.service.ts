import { Inject, Injectable, Logger, PayloadTooLargeException } from "@nestjs/common";
import { StoragePort } from "@study-note/storage";

const MAX_PAYLOAD_BYTES = 256 * 1024; // 256KB hard cap — plan §8b.4

export interface PdfAnnotationRecord {
  payload: unknown;
  updatedAt: string;
}

export interface PdfAnnotationListItem {
  materialId: string;
  payload: unknown;
  updatedAt: string;
}

export interface PdfAnnotationsListPage {
  items: PdfAnnotationListItem[];
  nextCursor: string | null;
}

@Injectable()
export class PdfAnnotationsService {
  private readonly logger = new Logger("pdf-annotations");

  constructor(@Inject(StoragePort) private readonly storage: StoragePort) {}

  /** R2 key — `annotations/{userId}/material-{materialId}.json`. */
  private key(userId: string, materialId: string): string {
    return `annotations/${encodeURIComponent(userId)}/material-${encodeURIComponent(materialId)}.json`;
  }

  private prefix(userId: string): string {
    return `annotations/${encodeURIComponent(userId)}/`;
  }

  async getAnnotation(
    userId: string,
    materialId: string
  ): Promise<PdfAnnotationRecord | null> {
    return this.storage.getJsonObject<PdfAnnotationRecord>(
      this.key(userId, materialId)
    );
  }

  async putAnnotation(
    userId: string,
    materialId: string,
    payload: unknown
  ): Promise<PdfAnnotationRecord> {
    // Serialize first for size check (and reuse later via storage.putJsonObject).
    const record: PdfAnnotationRecord = {
      payload,
      updatedAt: new Date().toISOString()
    };
    const json = JSON.stringify(record);
    const byteLength = Buffer.byteLength(json, "utf-8");
    if (byteLength > MAX_PAYLOAD_BYTES) {
      throw new PayloadTooLargeException({
        errorCode: "PAYLOAD_TOO_LARGE",
        errorMessage: `pdf-annotations payload exceeds ${MAX_PAYLOAD_BYTES} bytes`
      });
    }
    await this.storage.putJsonObject(this.key(userId, materialId), record);
    this.logger.log(
      `pdf-annotations.put userId=${userId} materialId=${materialId} bytes=${byteLength}`
    );
    return record;
  }

  async listAnnotations(
    userId: string,
    cursor?: string
  ): Promise<PdfAnnotationsListPage> {
    const listing = await this.storage.listJsonObjects(this.prefix(userId), {
      cursor,
      maxKeys: 50
    });
    const items: PdfAnnotationListItem[] = [];
    for (const key of listing.keys) {
      const record = await this.storage.getJsonObject<PdfAnnotationRecord>(key);
      if (record) {
        const materialId = extractMaterialIdFromKey(key);
        if (materialId) {
          items.push({ materialId, ...record });
        }
      }
    }
    return { items, nextCursor: listing.nextCursor };
  }
}

function extractMaterialIdFromKey(key: string): string | null {
  // key format: annotations/{userIdEncoded}/material-{materialIdEncoded}.json
  const match = /\/material-([^/]+)\.json$/.exec(key);
  const raw = match?.[1];
  if (!raw) {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
