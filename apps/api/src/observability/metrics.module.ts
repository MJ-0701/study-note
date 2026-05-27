// sprint-W22-be-sync/B-1 — MetricsModule wires service + controller + http middleware.

import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { HttpMetricsMiddleware } from "./http-metrics.middleware";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, HttpMetricsMiddleware],
  exports: [MetricsService]
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpMetricsMiddleware).forRoutes("*");
  }
}
