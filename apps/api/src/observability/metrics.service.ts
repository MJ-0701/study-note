// 운영지표 metric 노출 + dual-emit (Prom registry + Datadog dogstatsd).
// sprint-W22-be-sync/B-1 = HTTP/sync counter. sprint-W22-sprint-24 = Product/Org
// gauge 13 신규 (AC1 + AC8). label = {env, version, app} default + {source} per
// emit. PII (userId/studentNumber/email) 0 invariant.

import { Injectable, Logger } from "@nestjs/common";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry
} from "prom-client";

/** Minimal dogstatsd surface used by emitGauge — keeps dd-trace optional in tests. */
export interface DogStatsDLike {
  gauge(name: string, value: number, tags?: string[]): void;
}

interface GaugeSpec {
  name: string;
  help: string;
}

/** AC1 Product gauges (7) — MySQL row-based, 30min cron. */
const PRODUCT_GAUGES: readonly GaugeSpec[] = [
  { name: "study_note.product.users.total", help: "Total registered users." },
  {
    name: "study_note.product.users.daily_active",
    help: "Distinct users with a Session created in the last 24h (DAU)."
  },
  { name: "study_note.product.users.new_today", help: "Users created since CURDATE()." },
  { name: "study_note.product.users.new_7d", help: "Users created in the last 7 days." },
  { name: "study_note.product.content.pdf_total", help: "Total PdfMaterial rows." },
  {
    name: "study_note.product.content.annotation_total",
    help: "Total AnnotationSnapshot rows."
  },
  {
    name: "study_note.product.content.pdf_upload_24h",
    help: "PdfMaterial rows created in the last 24h."
  }
] as const;

/** AC8 Org gauges (7) — role distribution + Term/Subject/Material averages. */
const ORG_GAUGES: readonly GaugeSpec[] = [
  { name: "study_note.product.users.role_master", help: "Users with role=MASTER." },
  { name: "study_note.product.users.role_admin", help: "Users with role=ADMIN." },
  { name: "study_note.product.users.role_reviewer", help: "Users with role=REVIEWER." },
  { name: "study_note.product.users.role_normal", help: "Users with role=NORMAL." },
  { name: "study_note.product.org.term_active_count", help: "Total Term rows." },
  {
    name: "study_note.product.org.subject_avg_per_term",
    help: "Mean Subject count per Term (overall avg)."
  },
  {
    name: "study_note.product.org.material_avg_per_subject",
    help: "Mean PdfMaterial count per Subject (overall avg)."
  }
] as const;

/** AC2 Cost gauges (4) — 6h cron, R2 + DD + MySQL information_schema. */
const COST_GAUGES: readonly GaugeSpec[] = [
  {
    name: "study_note.cost.mysql_row_total",
    help: "Sum of TABLE_ROWS across the application schema (information_schema)."
  },
  {
    name: "study_note.cost.r2_storage_gb",
    help: "R2 bucket payloadSize in GiB-equivalent (Cloudflare GraphQL Analytics)."
  },
  {
    name: "study_note.cost.r2_object_count",
    help: "R2 bucket object count (Cloudflare GraphQL Analytics)."
  },
  {
    name: "study_note.cost.dd_ingestion_gb",
    help: "Datadog hourly ingestion in GiB-equivalent (Usage API, last full hour)."
  }
] as const;

const KNOWN_GAUGES: readonly GaugeSpec[] = [
  ...PRODUCT_GAUGES,
  ...ORG_GAUGES,
  ...COST_GAUGES
];

function loadDogStatsD(): DogStatsDLike | null {
  // Best-effort: dd-trace serverless-init may not have started (local/test). When
  // absent, dual-emit silently degrades to Prom-only.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tracer = require("dd-trace");
    const dd = tracer?.dogstatsd ?? null;
    if (dd && typeof dd.gauge === "function") {
      return dd as DogStatsDLike;
    }
    return null;
  } catch {
    return null;
  }
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  readonly registry: Registry;
  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDurationSeconds: Histogram<string>;
  readonly syncPutTotal: Counter<string>;
  readonly annotationCasStaleTotal: Counter<string>;

  private readonly gauges = new Map<string, Gauge<string>>();
  private readonly dogstatsdOverride: DogStatsDLike | null | undefined;
  private dogstatsdResolved: DogStatsDLike | null = null;
  private dogstatsdMissingWarned = false;
  private readonly envLabel: string;
  private readonly versionLabel: string;

  constructor(dogstatsdOverride?: DogStatsDLike | null) {
    this.dogstatsdOverride = dogstatsdOverride;
    this.envLabel = process.env.DD_ENV ?? process.env.NODE_ENV ?? "unknown";
    this.versionLabel = process.env.DD_VERSION ?? process.env.APP_VERSION ?? "unknown";

    this.registry = new Registry();
    // Default label kept narrow ({app}) so existing HTTP/sync metrics keep their
    // historical label set — env/version are added only on the new Product/Org
    // gauges (AC3 scope: 신규 namespace only).
    this.registry.setDefaultLabels({ app: "study-note-api" });
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
      help: "Annotation CAS revision conflicts (409 stale).",
      registers: [this.registry]
    });

    for (const spec of KNOWN_GAUGES) {
      this.registerKnownGauge(spec);
    }
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

  /**
   * Set a known gauge to `value` and dual-emit to dogstatsd. Unknown names are
   * dropped with a warn log (callers must use pre-registered names so /metrics
   * exposition stays stable).
   *
   * @param name canonical dot.case (e.g. `study_note.product.users.total`)
   * @param value numeric finite (NaN / Infinity dropped)
   * @param tags `{ source: <cron name> }` — additional label keys ignored to
   *             preserve PII invariant (AC12).
   */
  emitGauge(name: string, value: number, tags: { source: string }): void {
    if (!Number.isFinite(value)) {
      this.logger.warn(`emitGauge dropped non-finite value name=${name}`);
      return;
    }
    const gauge = this.gauges.get(name);
    if (!gauge) {
      this.logger.warn(`emitGauge unknown gauge name=${name}`);
      return;
    }
    const labels = {
      source: tags.source,
      env: this.envLabel,
      version: this.versionLabel
    };
    gauge.set(labels, value);

    const dd = this.resolveDogStatsD();
    if (dd) {
      try {
        dd.gauge(name, value, [
          `source:${tags.source}`,
          `env:${this.envLabel}`,
          `version:${this.versionLabel}`
        ]);
      } catch (err) {
        this.logger.warn(
          `emitGauge dogstatsd dispatch failed name=${name} err=${(err as Error).message}`
        );
      }
    }
  }

  private resolveDogStatsD(): DogStatsDLike | null {
    if (this.dogstatsdOverride !== undefined) {
      return this.dogstatsdOverride;
    }
    // Lazy probe per emit until first hit — dd-trace serverless-init may finish
    // booting after MetricsModule construction.
    if (this.dogstatsdResolved) {
      return this.dogstatsdResolved;
    }
    const probed = loadDogStatsD();
    if (probed) {
      this.dogstatsdResolved = probed;
      return probed;
    }
    if (!this.dogstatsdMissingWarned) {
      this.dogstatsdMissingWarned = true;
      this.logger.warn(
        "dogstatsd not available — emitGauge dual-emit degraded to Prom-only"
      );
    }
    return null;
  }

  /** Test-only inspection — confirm a gauge is registered. */
  hasGauge(name: string): boolean {
    return this.gauges.has(name);
  }

  private registerKnownGauge(spec: GaugeSpec): void {
    const promName = spec.name.replace(/\./g, "_");
    const gauge = new Gauge({
      name: promName,
      help: spec.help,
      labelNames: ["source", "env", "version"],
      registers: [this.registry]
    });
    this.gauges.set(spec.name, gauge);
  }
}

export const PRODUCT_GAUGE_NAMES = PRODUCT_GAUGES.map((g) => g.name);
export const ORG_GAUGE_NAMES = ORG_GAUGES.map((g) => g.name);
export const COST_GAUGE_NAMES = COST_GAUGES.map((g) => g.name);
