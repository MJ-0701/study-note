import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3StorageService } from "../backend/dist/storage/s3-storage.service.js";

if (process.env.RUN_REAL_S3_SMOKE !== "1") {
  console.log("Real S3 smoke skipped: set RUN_REAL_S3_SMOKE=1 to opt in");
  process.exit(0);
}

const bucket = requireEnv("S3_BUCKET");
const region = requireEnv("S3_REGION");
const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
const forcePathStyle = ["1", "true", "yes", "on"].includes(
  (process.env.S3_FORCE_PATH_STYLE || "").trim().toLowerCase()
);
const client = new S3Client({
  region,
  ...(endpoint ? { endpoint } : {}),
  ...(process.env.S3_FORCE_PATH_STYLE ? { forcePathStyle } : {})
});
const storage = new S3StorageService(client, {
  bucket,
  region,
  ...(endpoint ? { endpoint } : {}),
  ...(process.env.S3_FORCE_PATH_STYLE ? { forcePathStyle } : {})
});
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
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: material.storageKey
      })
    );
  }
}

function requireEnv(key) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required when RUN_REAL_S3_SMOKE=1`);
  }

  return value;
}

async function readToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
