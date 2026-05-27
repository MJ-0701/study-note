import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";
import { ROLES_KEY, RoleGuard, SessionAuthGuard } from "@study-note/auth";
import { AdminController } from "../admin.controller";
import {
  normalizeTraceDurationMs,
  OpsDashboardService,
  parseAggregateCount,
  parseMetricValue
} from "../ops-dashboard.service";

const ENV_KEYS = [
  "DD_API_KEY",
  "DATADOG_API_KEY",
  "DD_APP_KEY",
  "DATADOG_APP_KEY",
  "DD_SITE",
  "DD_ENV",
  "DD_SERVICE",
  "DD_RUM_SERVICE"
] as const;

const savedEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("OpsDashboardService Datadog parsers", () => {
  it("aggregates metric pointlists by sum or latest", () => {
    const response = {
      series: [
        {
          pointlist: [
            [1, 2],
            [2, null],
            [3, 5]
          ]
        }
      ]
    };

    assert.equal(parseMetricValue(response, "sum"), 7);
    assert.equal(parseMetricValue(response, "latest"), 5);
  });

  it("reads aggregate counts from logs/RUM responses", () => {
    assert.equal(parseAggregateCount({ data: { buckets: [{ computes: { c0: "12" } }] } }), 12);
    assert.equal(parseAggregateCount({ data: { buckets: [] } }), 0);
  });

  it("normalizes common Datadog trace duration scales to milliseconds", () => {
    assert.equal(normalizeTraceDurationMs(0.42), 420);
    assert.equal(normalizeTraceDurationMs(250_000_000), 250);
    // Codex P2 fix — sub-100ms healthy latency must pass through as ms.
    assert.equal(normalizeTraceDurationMs(50), 50);
    assert.equal(normalizeTraceDurationMs(1), 1);
    assert.equal(normalizeTraceDurationMs(0), 0);
    // Codex P3 fix — exact 1_000_000 ns boundary = 1ms.
    assert.equal(normalizeTraceDurationMs(1_000_000), 1);
  });
});

describe("OpsDashboardService", () => {
  it("returns not_configured without Datadog API credentials", async () => {
    for (const key of ENV_KEYS) delete process.env[key];

    const service = new OpsDashboardService();
    const snapshot = await service.getSnapshot(async () => {
      throw new Error("fetch should not be called without credentials");
    });

    assert.equal(snapshot.status, "not_configured");
    assert.equal(snapshot.source, "datadog");
    assert.ok(snapshot.cards.length > 0);
    assert.ok(snapshot.cards.every((card) => card.value === null));
  });

  it("queries APM metrics and logs/RUM aggregates with configured keys", async () => {
    process.env.DD_API_KEY = "api-key";
    process.env.DD_APP_KEY = "app-key";
    process.env.DD_SITE = "us5.datadoghq.com";
    process.env.DD_ENV = "production";
    process.env.DD_SERVICE = "study-note-api";
    process.env.DD_RUM_SERVICE = "study-note-web";

    const service = new OpsDashboardService();
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      calls.push({ url, init });

      if (url.includes("/api/v1/query")) {
        const query = new URL(url).searchParams.get("query") ?? "";
        const value = query.includes(".hits")
          ? 3
          : query.includes(".errors")
            ? 0
            : 0.25;

        return jsonResponse({
          series: [
            {
              pointlist: [[Date.now(), value]]
            }
          ]
        });
      }

      const body = JSON.parse(String(init?.body ?? "{}")) as { filter?: { query?: string } };
      const query = body.filter?.query ?? "";
      const count = query.includes("@type:session") ? 2 : 0;

      return jsonResponse({
        data: {
          buckets: [
            {
              computes: {
                c0: count
              }
            }
          ]
        }
      });
    };

    const snapshot = await service.getSnapshot(fetcher);

    assert.equal(snapshot.status, "ready");
    assert.equal(snapshot.services.site, "us5.datadoghq.com");
    assert.equal(snapshot.cards.find((card) => card.id === "api_requests")?.value, 3);
    assert.equal(snapshot.cards.find((card) => card.id === "api_p95_latency")?.value, 250);
    assert.ok(calls.some((call) => call.url.startsWith("https://api.us5.datadoghq.com/api/v1/query")));
    assert.ok(calls.some((call) => call.url.includes("/api/v2/logs/analytics/aggregate")));
    assert.ok(calls.some((call) => call.url.includes("/api/v2/rum/analytics/aggregate")));
    assert.ok(calls.every((call) => {
      const headers = call.init?.headers as Record<string, string> | undefined;
      return headers?.["DD-API-KEY"] === "api-key" && headers?.["DD-APPLICATION-KEY"] === "app-key";
    }));
  });
});

describe("AdminController ops dashboard guard", () => {
  it("keeps the Datadog snapshot master/admin only", () => {
    const fn = AdminController.prototype.getOpsDashboard;
    const guards = Reflect.getMetadata("__guards__", fn) as unknown[] | undefined;

    assert.ok(guards?.includes(SessionAuthGuard));
    assert.ok(guards?.includes(RoleGuard));
    assert.deepEqual(Reflect.getMetadata(ROLES_KEY, fn), ["master", "admin"]);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
