// sprint-W22-be-sync/B-1 — Prometheus metric exposer for self-hosted Grafana
// stack (별 ACA Container App 의 Prometheus scraper 가 본 endpoint 를 pull).
// Datadog 도 동시 emit 중 (dd-trace + log scrape). Prometheus 는 보조 lane.

import { Injectable } from "@nestjs/common";
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry
} from "prom-client";

@Injectable()
export class MetricsService {
  readonly registry: Registry;
  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDurationSeconds: Histogram<string>;
  readonly syncPutTotal: Counter<string>;
  readonly annotationCasStaleTotal: Counter<string>;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ app: "study-note-api" });
    // process_cpu / mem / event loop lag / GC / heap 등 nodejs default metric.
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: "study_note_http_requests_total",
      help: "Total HTTP request count by method, route, status.",
      labelNames: ["method", "route", "status"],
      registers: [this.registry]
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: "study_note_http_request_duration_seconds",
      help: "HTTP request duration in seconds by method and route.",
      labelNames: ["method", "route"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry]
    });

    this.syncPutTotal = new Counter({
      name: "study_note_sync_put_total",
      help: "Annotation sync PUT outcomes (success / failure / stale).",
      labelNames: ["outcome"],
      registers: [this.registry]
    });

    this.annotationCasStaleTotal = new Counter({
      name: "study_note_annotation_cas_stale_total",
      help: "Annotation CAS revision conflicts (409 stale)."
    });
    this.registry.registerMetric(this.annotationCasStaleTotal);
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }

  observeHttp(method: string, route: string, status: number, durationSec: number): void {
    this.httpRequestsTotal.inc({ method, route, status: String(status) });
    this.httpRequestDurationSeconds.observe({ method, route }, durationSec);
  }

  observeSyncPut(outcome: "success" | "failure" | "stale"): void {
    this.syncPutTotal.inc({ outcome });
    if (outcome === "stale") {
      this.annotationCasStaleTotal.inc();
    }
  }
}
