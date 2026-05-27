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

// Datadog v2 hourly_usage 는 family 별로 단위가 다름 (`indexed_logs` = bytes/event
// count, `infra_hosts` = host count). 본 gauge 의미 = ingestion volume in GB →
// `indexed_logs` family + `usage_type` 이 bytes 인 measurement 만 합산.
// host count 같은 비-bytes value 를 /1e9 GB 변환 시 가짜 수치 발생 (Codex PR #85
// round-3 P2). family / usage_type 추가 시 본 filter 확장.
const PRODUCT_FAMILIES = ["indexed_logs"];

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
  let totalBytes = 0;
  const rows = json.data ?? [];
  for (const row of rows) {
    const measurements = row.attributes?.measurements ?? [];
    for (const m of measurements) {
      if (
        typeof m.value !== "number" ||
        !Number.isFinite(m.value) ||
        typeof m.usage_type !== "string"
      ) {
        continue;
      }
      // bytes 단위 usage_type 만 합산 — host_count / event_count 등은 skip.
      // family 가 indexed_logs 만이라 일반적으로 `ingested_logs_bytes` 등이 도착.
      if (m.usage_type.toLowerCase().includes("bytes")) {
        totalBytes += m.value;
      }
    }
  }
  return totalBytes > 0 ? totalBytes / 1_000_000_000 : 0;
}
