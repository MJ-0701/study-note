// 운영지표 v2 / S2 / AC2 — Cloudflare R2 GraphQL Analytics 클라이언트.
// `r2StorageAdaptiveGroups` 쿼리로 bucket 의 payloadSize / objectCount 를 조회한다.
// AC16: token 누락/오류 시 `not_configured` 또는 throw, 모든 log 경로에서 token mask.
// 필요한 권한 = Account 범위 `R2 Analytics:Read` (Bucket-scoped token 으론 접근 불가).

import { Logger } from "@nestjs/common";

const CF_GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

export interface R2UsageResult {
  status: "ok" | "not_configured";
  payloadGb: number | null;
  objectCount: number | null;
}

export interface R2UsageConfig {
  apiToken?: string;
  accountTag?: string;
  bucket?: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const logger = new Logger("R2UsageClient");

/** Mask a secret to "abcd…(N chars)" — never leak the full string in logs. */
export function maskToken(value: string | undefined): string {
  if (!value || value.length === 0) return "(empty)";
  const head = value.slice(0, 4);
  return `${head}…(${value.length} chars)`;
}

export function readR2UsageConfig(env: NodeJS.ProcessEnv = process.env): R2UsageConfig {
  return {
    apiToken: env.CLOUDFLARE_R2_API_TOKEN,
    accountTag: env.CLOUDFLARE_ACCOUNT_TAG,
    bucket: env.S3_BUCKET
  };
}

// Cloudflare R2 Analytics: r2StorageAdaptiveGroups 는 orderBy 가 group dimension
// 일 때만 허용. datetimeHour 는 filter argument 이지 dimension 이 아니어서 orderBy
// 사용 시 'cannot order by datetimeHour' 에러. filter 가 6h window 로 좁혀주므로
// limit 1 로 충분 (max aggregation 반환).
const R2_QUERY = `
  query R2Storage($accountTag: String!, $bucket: String!, $start: Time!, $end: Time!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        r2StorageAdaptiveGroups(
          limit: 1
          filter: { datetimeHour_geq: $start, datetimeHour_leq: $end, bucketName: $bucket }
        ) {
          max {
            payloadSize
            objectCount
          }
        }
      }
    }
  }
`;

export async function fetchR2Usage(
  config: R2UsageConfig,
  fetcher: FetchLike = fetch,
  now: Date = new Date()
): Promise<R2UsageResult> {
  if (!config.apiToken || !config.accountTag || !config.bucket) {
    return { status: "not_configured", payloadGb: null, objectCount: null };
  }

  const end = now.toISOString();
  // GraphQL Analytics window: query the most recent 6h hourly rollup.
  const start = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

  const body = JSON.stringify({
    query: R2_QUERY,
    variables: {
      accountTag: config.accountTag,
      bucket: config.bucket,
      start,
      end
    }
  });

  let response: Response;
  try {
    response = await fetcher(CF_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`
      },
      body
    });
  } catch (err) {
    const message = (err as Error).message;
    logger.warn(
      `R2 usage fetch failed (network) token=${maskToken(config.apiToken)} err=${message}`
    );
    throw new Error(`R2 usage fetch failed: ${message}`);
  }

  if (!response.ok) {
    logger.warn(
      `R2 usage rejected status=${response.status} token=${maskToken(config.apiToken)}`
    );
    throw new Error(`R2 usage rejected status=${response.status}`);
  }

  const json = (await response.json().catch(() => ({}))) as {
    data?: {
      viewer?: {
        accounts?: Array<{
          r2StorageAdaptiveGroups?: Array<{
            max?: { payloadSize?: number | string; objectCount?: number | string };
          }>;
        }>;
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (json.errors && json.errors.length > 0) {
    const firstMessage = json.errors[0]?.message ?? "unknown";
    logger.warn(
      `R2 usage graphql error token=${maskToken(config.apiToken)} err=${firstMessage}`
    );
    throw new Error(`R2 usage graphql error: ${firstMessage}`);
  }

  const group = json.data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups?.[0]?.max;
  const payloadBytes = toNumber(group?.payloadSize);
  const objectCount = toNumber(group?.objectCount);

  return {
    status: "ok",
    payloadGb: payloadBytes !== null ? payloadBytes / 1_000_000_000 : null,
    objectCount
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
