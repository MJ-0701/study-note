// 운영지표 v2 / S2 / AC2 — Datadog Usage API (`/api/v2/usage/hourly_usage`) 클라이언트.
// product_family = infra_host / logs_indexed_logs 등 다중 family 합산.
// AC16: token (DD_API_KEY + DD_APP_KEY) 누락 시 `not_configured`. log/throw 에 token 미노출.

import { Logger } from "@nestjs/common";

const DEFAULT_SITE = "datadoghq.com";

export interface DdUsageResult {
  status: "ok" | "not_configured";
  ingestionGb: number | null;
}

export interface DdUsageConfig {
  apiKey?: string;
  appKey?: string;
  site?: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const logger = new Logger("DdUsageClient");

export function maskKey(value: string | undefined): string {
  if (!value || value.length === 0) return "(empty)";
  return `${value.slice(0, 4)}…(${value.length} chars)`;
}

export function readDdUsageConfig(env: NodeJS.ProcessEnv = process.env): DdUsageConfig {
  return {
    apiKey: env.DD_API_KEY ?? env.DATADOG_API_KEY,
    appKey: env.DD_APP_KEY ?? env.DATADOG_APP_KEY,
    site: env.DD_SITE
  };
}

const PRODUCT_FAMILIES = ["logs_indexed_logs", "infra_host"];

export async function fetchDdIngestionGb(
  config: DdUsageConfig,
  fetcher: FetchLike = fetch,
  now: Date = new Date()
): Promise<DdUsageResult> {
  if (!config.apiKey || !config.appKey) {
    return { status: "not_configured", ingestionGb: null };
  }

  const site = config.site && config.site.length > 0 ? config.site : DEFAULT_SITE;
  const baseUrl = `https://api.${site}`;

  // Window: most recent full hour.
  const end = new Date(now);
  end.setUTCMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const query = new URLSearchParams({
    "filter[product_families]": PRODUCT_FAMILIES.join(","),
    "filter[timestamp][start]": startIso,
    "filter[timestamp][end]": endIso
  });
  const url = `${baseUrl}/api/v2/usage/hourly_usage?${query.toString()}`;

  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: {
        "DD-API-KEY": config.apiKey,
        "DD-APPLICATION-KEY": config.appKey,
        Accept: "application/json"
      }
    });
  } catch (err) {
    const message = (err as Error).message;
    logger.warn(
      `DD usage fetch failed (network) apiKey=${maskKey(config.apiKey)} appKey=${maskKey(config.appKey)} err=${message}`
    );
    throw new Error(`DD usage fetch failed: ${message}`);
  }

  if (!response.ok) {
    logger.warn(
      `DD usage rejected status=${response.status} apiKey=${maskKey(config.apiKey)} appKey=${maskKey(config.appKey)}`
    );
    throw new Error(`DD usage rejected status=${response.status}`);
  }

  const json = (await response.json().catch(() => ({}))) as {
    data?: Array<{
      attributes?: {
        measurements?: Array<{ usage_type?: string; value?: number }>;
      };
    }>;
  };

  const totalGb = sumIngestionGb(json);
  return { status: "ok", ingestionGb: totalGb };
}

function sumIngestionGb(json: {
  data?: Array<{
    attributes?: {
      measurements?: Array<{ usage_type?: string; value?: number }>;
    };
  }>;
}): number {
  let total = 0;
  const rows = json.data ?? [];
  for (const row of rows) {
    const measurements = row.attributes?.measurements ?? [];
    for (const m of measurements) {
      if (typeof m.value === "number" && Number.isFinite(m.value)) {
        total += m.value;
      }
    }
  }
  // Usage API returns bytes for ingestion measurements (per product family);
  // converted to GiB-equivalent for symmetry with R2 payloadGb.
  return total > 0 ? total / 1_000_000_000 : 0;
}
