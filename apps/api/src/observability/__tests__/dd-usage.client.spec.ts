// 운영지표 v2 / S2 / AC16 — Datadog Usage API 클라이언트 negative + happy path.
// missing key / 401 / 403 / 본문 합산 / API key + APP key mask.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  fetchDdIngestionGb,
  maskKey,
  readDdUsageConfig,
  type FetchLike
} from "../cost-clients/dd-usage.client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("maskKey", () => {
  it("masks tokens to head + length", () => {
    assert.equal(maskKey("abcdefghij"), "abcd…(10 chars)");
  });
  it("handles empty / undefined", () => {
    assert.equal(maskKey(undefined), "(empty)");
    assert.equal(maskKey(""), "(empty)");
  });
});

describe("readDdUsageConfig", () => {
  it("prefers DD_* env, falls back to DATADOG_*", () => {
    const cfg = readDdUsageConfig({
      DD_API_KEY: "api1",
      DATADOG_API_KEY: "api2",
      DD_APP_KEY: "app1",
      DD_SITE: "us5.datadoghq.com"
    });
    assert.equal(cfg.apiKey, "api1");
    assert.equal(cfg.appKey, "app1");
    assert.equal(cfg.site, "us5.datadoghq.com");
  });
  it("uses DATADOG_* fallback when DD_* is absent", () => {
    const cfg = readDdUsageConfig({
      DATADOG_API_KEY: "fallback-api",
      DATADOG_APP_KEY: "fallback-app"
    });
    assert.equal(cfg.apiKey, "fallback-api");
    assert.equal(cfg.appKey, "fallback-app");
  });
});

describe("fetchDdIngestionGb", () => {
  it("returns not_configured when api key missing", async () => {
    const fetcher: FetchLike = async () => {
      throw new Error("fetch should not be called");
    };
    const result = await fetchDdIngestionGb({ appKey: "app" }, fetcher);
    assert.equal(result.status, "not_configured");
    assert.equal(result.ingestionGb, null);
  });

  it("returns not_configured when app key missing", async () => {
    const fetcher: FetchLike = async () => {
      throw new Error("fetch should not be called");
    };
    const result = await fetchDdIngestionGb({ apiKey: "api" }, fetcher);
    assert.equal(result.status, "not_configured");
  });

  it("throws on 401 without leaking apiKey or appKey", async () => {
    const fetcher: FetchLike = async () => jsonResponse({}, 401);
    await assert.rejects(
      () =>
        fetchDdIngestionGb(
          { apiKey: "super-api-key-value", appKey: "super-app-key-value" },
          fetcher
        ),
      (err: unknown) => {
        const msg = (err as Error).message;
        assert.ok(msg.includes("401"));
        assert.equal(msg.includes("super-api-key-value"), false);
        assert.equal(msg.includes("super-app-key-value"), false);
        return true;
      }
    );
  });

  it("throws on 403 without leaking keys", async () => {
    const fetcher: FetchLike = async () => jsonResponse({}, 403);
    await assert.rejects(
      () =>
        fetchDdIngestionGb({ apiKey: "k-403", appKey: "a-403" }, fetcher),
      (err: unknown) => {
        const msg = (err as Error).message;
        assert.ok(msg.includes("403"));
        assert.equal(msg.includes("k-403"), false);
        assert.equal(msg.includes("a-403"), false);
        return true;
      }
    );
  });

  it("sums measurements across data rows and converts to GiB", async () => {
    const fetcher: FetchLike = async () =>
      jsonResponse({
        data: [
          {
            attributes: {
              measurements: [
                { usage_type: "logs_indexed", value: 1_000_000_000 },
                { usage_type: "logs_other", value: 500_000_000 }
              ]
            }
          },
          {
            attributes: {
              measurements: [{ usage_type: "infra_hosts", value: 500_000_000 }]
            }
          }
        ]
      });
    const result = await fetchDdIngestionGb(
      { apiKey: "k", appKey: "a" },
      fetcher
    );
    assert.equal(result.status, "ok");
    assert.equal(result.ingestionGb, 2);
  });

  it("returns ok with 0 when measurements are empty", async () => {
    const fetcher: FetchLike = async () => jsonResponse({ data: [] });
    const result = await fetchDdIngestionGb(
      { apiKey: "k", appKey: "a" },
      fetcher
    );
    assert.equal(result.status, "ok");
    assert.equal(result.ingestionGb, 0);
  });

  it("sends DD-API-KEY and DD-APPLICATION-KEY headers", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetcher: FetchLike = async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string> | undefined;
      return jsonResponse({ data: [] });
    };
    await fetchDdIngestionGb({ apiKey: "the-api", appKey: "the-app" }, fetcher);
    assert.ok(capturedHeaders);
    assert.equal(capturedHeaders!["DD-API-KEY"], "the-api");
    assert.equal(capturedHeaders!["DD-APPLICATION-KEY"], "the-app");
  });
});
