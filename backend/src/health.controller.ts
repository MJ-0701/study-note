import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: "study-note-backend",
      storageProvider: "local-mock"
    };
  }
}
