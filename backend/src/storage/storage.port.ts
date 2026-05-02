import type { AnnotationSnapshotRecord, PdfMaterialRecord } from "../domain/workspace.types";
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

export abstract class StoragePort {
  abstract createUploadIntent(material: PdfMaterialRecord): UploadIntent;
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
}
