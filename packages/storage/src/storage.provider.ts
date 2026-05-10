import { LocalMockStorageService } from "./local-mock-storage.service";
import { S3StorageService } from "./s3-storage.service";
import { StoragePort } from "./storage.port";

export function createStorageProvider(env: NodeJS.ProcessEnv = process.env): StoragePort {
  // sprint-2 plan §3 AC10(d) — fail-closed: STORAGE_PROVIDER 미정 시 throw (silent default 금지).
  // dev 환경은 db-persistent.mjs 의 envContent 또는 .env.example 가 명시한 값을 inject.
  const raw = env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (!raw) {
    throw new Error(
      "STORAGE_PROVIDER missing — fail-closed (set STORAGE_PROVIDER=local or s3 in .env / .env.example)."
    );
  }

  if (raw === "local" || raw === "mock") {
    return new LocalMockStorageService();
  }

  if (raw === "s3") {
    return S3StorageService.fromEnv(env);
  }

  throw new Error("STORAGE_PROVIDER must be one of: local, s3");
}
