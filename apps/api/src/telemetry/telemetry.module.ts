// 운영지표 v2 / S5 — TelemetryModule. session-guarded widget-create endpoint.
// AuthModule (PrismaModule via global) 가 SessionAuthGuard 의존 cover.

import { Module } from "@nestjs/common";
import { TelemetryController } from "./telemetry.controller";

@Module({
  controllers: [TelemetryController]
})
export class TelemetryModule {}
