import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { S3StorageService } from "../packages/storage/dist/s3-storage.service.js";

if (process.env.RUN_REAL_S3_SMOKE !== "1") {
  console.log("Real S3 smoke skipped: set RUN_REAL_S3_SMOKE=1 to opt in");
  process.exit(0);
}

const storage = S3StorageService.fromEnv(process.env);
const samplePdf = Buffer.from("%PDF-1.4\n% real s3 smoke\n%%EOF\n");
const materialId = `real-s3-smoke-${randomUUID()}`;
const material = {
  id: materialId,
  ownerId: "real-s3-smoke-user",
  subjectId: "digital-engineering",
  classDate: "2026-05-02",
  fileName: "real-s3-smoke.pdf",
  fileSize: samplePdf.length,
  pageCount: 1,
  contentType: "application/pdf",
  storageKey: `smoke/${materialId}/real-s3-smoke.pdf`,
  uploadStatus: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

let uploaded = false;

try {
  await storage.putObject(material, {
    body: Readable.from(samplePdf),
    contentType: "application/pdf",
    contentLength: samplePdf.length,
    maxBytes: 4096
  });
  uploaded = true;
  const object = await storage.getObject(material);
  const downloaded = await readToBuffer(object.body);

  if (!downloaded.equals(samplePdf)) {
    throw new Error("real S3 smoke downloaded bytes did not match uploaded bytes");
  }

  console.log("Real S3 smoke passed");
  console.log("- uploaded and downloaded a private smoke object through S3StorageService");
} finally {
  if (uploaded) {
    await storage.deleteObject(material.storageKey);
  }
}

async function readToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
