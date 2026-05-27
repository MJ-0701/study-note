// 운영지표 MetricsModule — Prom exposition + HTTP middleware + product gauge cron.
// sprint-W22-sprint-24 / S1: ScheduleModule.forRoot() + ProductMetricsCronService +
// MetricsScrapeGuard 추가. MetricsService 는 factory provider 로 생성 (생성자가
// optional dogstatsd override 를 받아 테스트가 mock 주입 가능하게 한다).

import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { HttpMetricsMiddleware } from "./http-metrics.middleware";
import { MetricsController } from "./metrics.controller";
import { MetricsScrapeGuard } from "./metrics-scrape.guard";
import { MetricsService } from "./metrics.service";
import { CostMetricsCronService } from "./cost-metrics-cron.service";
import { ProductMetricsCronService } from "./product-metrics-cron.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MetricsController],
  providers: [
    {
      provide: MetricsService,
      useFactory: () => new MetricsService()
    },
    MetricsScrapeGuard,
    HttpMetricsMiddleware,
    ProductMetricsCronService,
    CostMetricsCronService
  ],
  exports: [MetricsService]
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpMetricsMiddleware).forRoutes("*");
  }
}
