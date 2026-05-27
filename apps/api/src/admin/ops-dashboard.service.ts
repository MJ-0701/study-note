import { Injectable, Logger } from "@nestjs/common";

type OpsDashboardStatus = "ready" | "partial" | "not_configured" | "error";
type OpsCardStatus = "ok" | "warn" | "error" | "unknown";
type OpsCardSource = "apm" | "logs" | "rum";
type OpsCardUnit = "count" | "ms" | "percent";
type MetricAggregation = "sum" | "latest";

export interface OpsDashboardCard {
  id: string;
  label: string;
  value: number | null;
  unit: OpsCardUnit;
  status: OpsCardStatus;
  source: OpsCardSource;
  query: string;
  errorMessage?: string;
}

export interface OpsDashboardResponse {
  source: "datadog";
  status: OpsDashboardStatus;
  message?: string;
  generatedAt: string;
  window: {
    from: string;
    to: string;
    minutes: number;
  };
  services: {
    api: string;
    web: string;
    env: string;
    site: string;
  };
  cards: OpsDashboardCard[];
}

interface DatadogConfig {
  apiKey: string;
  appKey: string;
  site: string;
  env: string;
  apiService: string;
  webService: string;
  apiBaseUrl: string;
}

interface SnapshotWindow {
  fromDate: Date;
  toDate: Date;
  fromSeconds: number;
  toSeconds: number;
  minutes: number;
}

interface MetricCardSpec {
  id: string;
  label: string;
  source: "apm";
  unit: OpsCardUnit;
  query: string;
  aggregation: MetricAggregation;
  normalize?: (value: number) => number;
  statusForValue?: (value: number) => OpsCardStatus;
}

interface AggregateCardSpec {
  id: string;
  label: string;
  source: "logs" | "rum";
  unit: OpsCardUnit;
  query: string;
  statusForValue?: (value: number) => OpsCardStatus;
}

type CardSpec = MetricCardSpec | AggregateCardSpec;

interface MetricQueryResponse {
  series?: Array<{
    pointlist?: unknown;
  }>;
}

interface AggregateResponse {
  data?: {
    buckets?: Array<{
      computes?: Record<string, unknown>;
    }>;
  };
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const DEFAULT_WINDOW_MINUTES = 15;
const DATADOG_TIMEOUT_MS = 5_000;

function envValue(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function readDatadogConfig(): DatadogConfig | null {
  const apiKey = envValue("DD_API_KEY") ?? envValue("DATADOG_API_KEY");
  const appKey = envValue("DD_APP_KEY") ?? envValue("DATADOG_APP_KEY");

  if (!apiKey || !appKey) {
    return null;
  }

  const site = envValue("DD_SITE") ?? "us5.datadoghq.com";
  const env = envValue("DD_ENV") ?? "production";
  const apiService = envValue("DD_SERVICE") ?? "study-note-api";
  const webService = envValue("DD_RUM_SERVICE") ?? "study-note-web";

  return {
    apiKey,
    appKey,
    site,
    env,
    apiService,
    webService,
    apiBaseUrl: toDatadogApiBaseUrl(site)
  };
}

function toDatadogApiBaseUrl(site: string): string {
  const normalized = site
    .replace(/^https?:\/\//u, "")
    .replace(/\/+$/u, "");

  if (normalized.startsWith("api.")) {
    return `https://${normalized}`;
  }

  return `https://api.${normalized}`;
}

function createWindow(minutes = DEFAULT_WINDOW_MINUTES): SnapshotWindow {
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - minutes * 60_000);

  return {
    fromDate,
    toDate,
    fromSeconds: Math.floor(fromDate.getTime() / 1_000),
    toSeconds: Math.floor(toDate.getTime() / 1_000),
    minutes
  };
}

function tagQuery(env: string, service: string): string {
  return `env:${env},service:${service}`;
}

function eventQuery(env: string, service: string, suffix: string): string {
  return `env:${env} service:${service} ${suffix}`;
}

function buildCardSpecs(config: Pick<DatadogConfig, "env" | "apiService" | "webService">): CardSpec[] {
  const apiTags = tagQuery(config.env, config.apiService);

  return [
    {
      id: "api_requests",
      label: "API requests",
      source: "apm",
      unit: "count",
      query: `sum:trace.web.request.hits{${apiTags}}.as_count()`,
      aggregation: "sum"
    },
    {
      id: "api_errors",
      label: "API errors",
      source: "apm",
      unit: "count",
      query: `sum:trace.web.request.errors{${apiTags}}.as_count()`,
      aggregation: "sum",
      statusForValue: warnOnPositive
    },
    {
      id: "api_p95_latency",
      label: "API p95 latency",
      source: "apm",
      unit: "ms",
      query: `p95:trace.web.request{${apiTags}}`,
      aggregation: "latest",
      normalize: normalizeTraceDurationMs,
      statusForValue: latencyStatus
    },
    {
      id: "sync_put_success",
      label: "Annotation sync success",
      source: "logs",
      unit: "count",
      query: eventQuery(config.env, config.apiService, "\"metric=sync.put.success\"")
    },
    {
      id: "sync_put_failure",
      label: "Annotation sync failures",
      source: "logs",
      unit: "count",
      query: eventQuery(config.env, config.apiService, "\"metric=sync.put.failure\""),
      statusForValue: warnOnPositive
    },
    {
      id: "sync_conflicts",
      label: "Revision conflicts",
      source: "logs",
      unit: "count",
      query: eventQuery(config.env, config.apiService, "\"metric=annotation.cas.stale\""),
      statusForValue: warnOnPositive
    },
    {
      id: "rum_sessions",
      label: "RUM sessions",
      source: "rum",
      unit: "count",
      query: eventQuery(config.env, config.webService, "@type:session")
    },
    {
      id: "rum_errors",
      label: "RUM errors",
      source: "rum",
      unit: "count",
      query: eventQuery(config.env, config.webService, "@type:error"),
      statusForValue: warnOnPositive
    },
    {
      id: "rum_actions",
      label: "RUM actions",
      source: "rum",
      unit: "count",
      query: eventQuery(config.env, config.webService, "@type:action")
    }
  ];
}

function warnOnPositive(value: number): OpsCardStatus {
  return value > 0 ? "warn" : "ok";
}

function latencyStatus(value: number): OpsCardStatus {
  if (value >= 2_000) return "error";
  if (value >= 800) return "warn";
  return "ok";
}

export function normalizeTraceDurationMs(value: number): number {
  if (value > 1_000_000) {
    return value / 1_000_000;
  }
  if (value < 100) {
    return value * 1_000;
  }
  return value;
}

export function parseMetricValue(response: MetricQueryResponse, aggregation: MetricAggregation): number {
  const values: number[] = [];

  for (const series of response.series ?? []) {
    if (!Array.isArray(series.pointlist)) continue;

    for (const point of series.pointlist) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const value = point[1];
      if (typeof value === "number" && Number.isFinite(value)) {
        values.push(value);
      }
    }
  }

  if (values.length === 0) return 0;

  if (aggregation === "sum") {
    return values.reduce((sum, value) => sum + value, 0);
  }

  return values[values.length - 1] ?? 0;
}

export function parseAggregateCount(response: AggregateResponse): number {
  const buckets = response.data?.buckets ?? [];
  const firstBucket = buckets[0];
  const computes = firstBucket?.computes;

  if (!computes) return 0;

  for (const value of Object.values(computes)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

@Injectable()
export class OpsDashboardService {
  private readonly logger = new Logger(OpsDashboardService.name);

  async getSnapshot(fetcher: FetchLike = globalThis.fetch): Promise<OpsDashboardResponse> {
    const config = readDatadogConfig();
    const window = createWindow();
    const generatedAt = window.toDate.toISOString();

    if (!config) {
      const fallbackConfig = {
        env: envValue("DD_ENV") ?? "production",
        apiService: envValue("DD_SERVICE") ?? "study-note-api",
        webService: envValue("DD_RUM_SERVICE") ?? "study-note-web",
        site: envValue("DD_SITE") ?? "us5.datadoghq.com"
      };
      const cards = buildCardSpecs(fallbackConfig).map((spec) => ({
        id: spec.id,
        label: spec.label,
        value: null,
        unit: spec.unit,
        status: "unknown" as const,
        source: spec.source,
        query: spec.query,
        errorMessage: "DD_API_KEY/DD_APP_KEY is not configured"
      }));

      return this.toResponse("not_configured", generatedAt, window, fallbackConfig, cards, "Datadog API credentials are not configured");
    }

    const specs = buildCardSpecs(config);
    const cards = await Promise.all(specs.map((spec) => this.resolveCard(config, window, spec, fetcher)));
    const failedCards = cards.filter((card) => card.status === "error");
    const status = failedCards.length === 0
      ? "ready"
      : failedCards.length === cards.length
        ? "error"
        : "partial";

    return this.toResponse(status, generatedAt, window, config, cards);
  }

  private async resolveCard(
    config: DatadogConfig,
    window: SnapshotWindow,
    spec: CardSpec,
    fetcher: FetchLike
  ): Promise<OpsDashboardCard> {
    try {
      const rawValue = spec.source === "apm"
        ? await this.queryMetric(config, window, spec.query, spec.aggregation, fetcher)
        : await this.queryAggregate(config, window, spec.source, spec.query, fetcher);
      const value = "normalize" in spec && spec.normalize ? spec.normalize(rawValue) : rawValue;
      const rounded = roundOpsValue(value, spec.unit);
      const status = spec.statusForValue ? spec.statusForValue(rounded) : "ok";

      return {
        id: spec.id,
        label: spec.label,
        value: rounded,
        unit: spec.unit,
        status,
        source: spec.source,
        query: spec.query
      };
    } catch (error) {
      this.logger.warn(`Datadog ops card failed id=${spec.id}: ${errorMessage(error)}`);
      return {
        id: spec.id,
        label: spec.label,
        value: null,
        unit: spec.unit,
        status: "error",
        source: spec.source,
        query: spec.query,
        errorMessage: "Datadog query failed"
      };
    }
  }

  private async queryMetric(
    config: DatadogConfig,
    window: SnapshotWindow,
    query: string,
    aggregation: MetricAggregation,
    fetcher: FetchLike
  ): Promise<number> {
    const url = new URL(`${config.apiBaseUrl}/api/v1/query`);
    url.searchParams.set("from", String(window.fromSeconds));
    url.searchParams.set("to", String(window.toSeconds));
    url.searchParams.set("query", query);

    const response = await this.fetchJson<MetricQueryResponse>(config, url, { method: "GET" }, fetcher);
    return parseMetricValue(response, aggregation);
  }

  private async queryAggregate(
    config: DatadogConfig,
    window: SnapshotWindow,
    source: "logs" | "rum",
    query: string,
    fetcher: FetchLike
  ): Promise<number> {
    const path = source === "logs"
      ? "/api/v2/logs/analytics/aggregate"
      : "/api/v2/rum/analytics/aggregate";
    const url = new URL(`${config.apiBaseUrl}${path}`);
    const body = {
      compute: [
        {
          aggregation: "count",
          type: "total"
        }
      ],
      filter: {
        from: window.fromDate.toISOString(),
        query,
        to: window.toDate.toISOString()
      },
      options: {
        timezone: "Asia/Seoul"
      },
      page: {
        limit: 1
      }
    };

    const response = await this.fetchJson<AggregateResponse>(
      config,
      url,
      {
        method: "POST",
        body: JSON.stringify(body)
      },
      fetcher
    );

    return parseAggregateCount(response);
  }

  private async fetchJson<T>(
    config: DatadogConfig,
    url: URL,
    init: RequestInit,
    fetcher: FetchLike
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), DATADOG_TIMEOUT_MS);

    try {
      const response = await fetcher(url, {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "DD-API-KEY": config.apiKey,
          "DD-APPLICATION-KEY": config.appKey
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Datadog API returned ${response.status}`);
      }

      return await response.json() as T;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  private toResponse(
    status: OpsDashboardStatus,
    generatedAt: string,
    window: SnapshotWindow,
    services: Pick<DatadogConfig, "apiService" | "webService" | "env" | "site">,
    cards: OpsDashboardCard[],
    message?: string
  ): OpsDashboardResponse {
    return {
      source: "datadog",
      status,
      ...(message ? { message } : {}),
      generatedAt,
      window: {
        from: window.fromDate.toISOString(),
        to: window.toDate.toISOString(),
        minutes: window.minutes
      },
      services: {
        api: services.apiService,
        web: services.webService,
        env: services.env,
        site: services.site
      },
      cards
    };
  }
}

function roundOpsValue(value: number, unit: OpsCardUnit): number {
  if (unit === "count") {
    return Math.round(value);
  }
  return Math.round(value * 10) / 10;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
