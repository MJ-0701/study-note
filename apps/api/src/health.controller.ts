import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    // slice-2: storageProvider echoes STORAGE_PROVIDER env (no hardcoding).
    // "local" → local-mock in-memory, "s3" → localstack / AWS S3.
    const storageProvider = process.env.STORAGE_PROVIDER ?? "local";

    return {
      ok: true,
      service: "study-note-backend",
      storageProvider
    };
  }
}
