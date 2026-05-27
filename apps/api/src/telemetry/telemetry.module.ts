// 운영지표 v2 / S5 — TelemetryModule. session-guarded widget-create endpoint.
// AuthModule import 필수 — SessionAuthGuard 가 AuthService 를 constructor inject
// (Codex PR #85 P1 fix). PrismaModule 은 global 이라 별도 import 불요.

import { Module } from "@nestjs/common";
import { AuthModule } from "@study-note/auth";
import { TelemetryController } from "./telemetry.controller";

@Module({
  imports: [AuthModule],
  controllers: [TelemetryController]
})
export class TelemetryModule {}
