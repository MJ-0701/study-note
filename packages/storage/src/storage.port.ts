import type { AnnotationSnapshotRecord, PdfMaterialRecord } from "@study-note/domain";
import type { Readable } from "node:stream";

export interface UploadIntent {
  method: "PUT";
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

export interface DownloadIntent {
  method: "GET";
  downloadUrl: string;
  storageKey: string;
  expiresAt: string;
}

export interface StorageObjectInput {
  body: Readable;
  contentType: string;
  contentLength: number;
  maxBytes: number;
}

export interface StorageObjectOutput {
  body: Readable;
  contentType: string;
  contentLength?: number;
}

export interface ExportBundle {
  kind: "original-pdf-plus-annotation-json";
  generatedAt: string;
  material: PdfMaterialRecord;
  originalPdf: DownloadIntent;
  annotation: AnnotationSnapshotRecord;
}

export interface HeadObjectResult {
  contentLength: number;
  contentType?: string;
}

export abstract class StoragePort {
  abstract createUploadIntent(material: PdfMaterialRecord): Promise<UploadIntent>;
  abstract createDownloadIntent(material: PdfMaterialRecord): DownloadIntent;
  abstract putObject(
    material: PdfMaterialRecord,
    input: StorageObjectInput
  ): Promise<void>;
  abstract getObject(material: PdfMaterialRecord): Promise<StorageObjectOutput>;
  abstract createExportBundle(
    material: PdfMaterialRecord,
    annotation: AnnotationSnapshotRecord
  ): ExportBundle;
  // slice-1: exposed for completion endpoint (slice-2) — headObject verifies actual S3 object size
  abstract headObject(storageKey: string): Promise<HeadObjectResult>;
  // slice-1: exposed for orphan cleanup (slice-2+)
  abstract deleteObject(storageKey: string): Promise<void>;
}
