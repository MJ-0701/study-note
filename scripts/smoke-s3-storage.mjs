import { Readable } from "node:stream";
import { createStorageProvider } from "../apps/api/dist/storage/storage.provider.js";
import { S3StorageService } from "../apps/api/dist/storage/s3-storage.service.js";

const samplePdf = Buffer.from("%PDF-1.4\n% mocked s3 smoke\n%%EOF\n");
const material = {
  id: "material-s3-smoke",
  ownerId: "user-dev-1",
  subjectId: "digital-engineering",
  classDate: "2026-05-02",
  fileName: "mocked-s3.pdf",
  fileSize: samplePdf.length,
  pageCount: 1,
  contentType: "application/pdf",
  storageKey: "users/user-dev-1/materials/material-s3-smoke/mocked-s3.pdf",
  uploadStatus: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

class MockS3Client {
  commands = [];
  objects = new Map();

  async send(command) {
    this.commands.push(command);

    if (command.constructor.name === "PutObjectCommand") {
      const body = await readToBuffer(command.input.Body);
      this.objects.set(command.input.Key, {
        body,
        contentType: command.input.ContentType
      });
      return {};
    }

    if (command.constructor.name === "GetObjectCommand") {
      const object = this.objects.get(command.input.Key);

      if (!object) {
        throw new Error(`mock object missing: ${command.input.Key}`);
      }

      return {
        Body: Readable.from(object.body),
        ContentLength: object.body.length,
        ContentType: object.contentType
      };
    }

    throw new Error(`unexpected S3 command: ${command.constructor.name}`);
  }
}

const mockClient = new MockS3Client();
const storage = new S3StorageService(mockClient, {
  bucket: "study-note-smoke-bucket",
  region: "ap-northeast-2"
});

await storage.putObject(material, {
  body: Readable.from(samplePdf),
  contentType: "application/pdf",
  contentLength: samplePdf.length,
  maxBytes: 4096
});

const object = await storage.getObject(material);
const downloaded = await readToBuffer(object.body);

if (!downloaded.equals(samplePdf)) {
  throw new Error("mocked S3 getObject did not return uploaded bytes");
}

if (object.contentType !== "application/pdf") {
  throw new Error("mocked S3 getObject did not preserve content type");
}

const putCommand = mockClient.commands.find(
  (command) => command.constructor.name === "PutObjectCommand"
);
const getCommand = mockClient.commands.find(
  (command) => command.constructor.name === "GetObjectCommand"
);

if (!putCommand || !getCommand) {
  throw new Error("S3 provider did not issue PutObjectCommand and GetObjectCommand");
}

if (
  putCommand.input.Bucket !== "study-note-smoke-bucket" ||
  putCommand.input.Key !== material.storageKey ||
  putCommand.input.ContentType !== "application/pdf"
) {
  throw new Error("S3 put command did not use bucket, key, and content type contract");
}

const localProvider = createStorageProvider({
  STORAGE_PROVIDER: "local"
});
if (localProvider.constructor.name !== "LocalMockStorageService") {
  throw new Error("local storage provider selection did not return LocalMockStorageService");
}

assertThrows(
  () =>
    createStorageProvider({
      STORAGE_PROVIDER: "s3",
      S3_REGION: "ap-northeast-2"
    }),
  "S3_BUCKET"
);

console.log("S3 storage smoke passed");
console.log("- mocked S3 provider writes and reads owner-scoped PDF objects");
console.log("- provider selection keeps local/mock as explicit local mode");
console.log("- missing S3 config fails clearly without printing credentials");

async function readToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function assertThrows(run, expectedMessage) {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes(expectedMessage)) {
      throw new Error(`expected error to include ${expectedMessage}, got ${message}`);
    }

    return;
  }

  throw new Error("expected function to throw");
}
