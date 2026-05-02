import { LocalMockStorageService } from "./local-mock-storage.service";
import { S3StorageService } from "./s3-storage.service";
import { StoragePort } from "./storage.port";

export function createStorageProvider(env: NodeJS.ProcessEnv = process.env): StoragePort {
  const provider = (env.STORAGE_PROVIDER || "local").trim().toLowerCase();

  if (provider === "local" || provider === "mock") {
    return new LocalMockStorageService();
  }

  if (provider === "s3") {
    return S3StorageService.fromEnv(env);
  }

  throw new Error("STORAGE_PROVIDER must be one of: local, s3");
}
