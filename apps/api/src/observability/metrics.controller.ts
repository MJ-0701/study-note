// /metrics endpoint (Prometheus text format) — 별 ACA `study-note-prometheus`
// scraper 가 scrape_interval 15s 로 pull. /api prefix 안이라 실제 url =
// /api/metrics. sprint-W22-sprint-24 / AC14: MetricsScrapeGuard 로 token 게이트.
// product / cost / org / SLO gauge 가 추가되면서 unauth 노출이 business intel
// leak surface 가 되어 fail-closed 정책.

import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { MetricsScrapeGuard } from "./metrics-scrape.guard";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
@UseGuards(MetricsScrapeGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async exposition(): Promise<string> {
    return this.metrics.render();
  }
}
