// sprint-W22-be-sync/B-1 — /metrics endpoint (Prometheus text format).
//
// 운영 ACA 의 별 Container App (study-note-prometheus) 가 scrape_interval 15s 로
// pull. /api prefix 안 (global prefix) 라 실제 url = /api/metrics. Datadog 의
// dd-trace v0 metric (push, agent ⨯) 와 별개로 self-host stack 의 source.
//
// Auth: 미적용. /metrics 는 internal scrape 용 — ACA ingress 가 internal 또는
// external 일 때 모두 노출되지만 metric 자체에 PII 없음 (label = method/route/
// status/outcome 만). 추후 ACA networking 으로 prometheus 만 접근 허용 가능.

import { Controller, Get, Header } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async exposition(): Promise<string> {
    return this.metrics.render();
  }
}
