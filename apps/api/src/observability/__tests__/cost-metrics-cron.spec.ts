// 운영지표 v2 / S2 / AC10 — CostMetricsCronService spec. partial emit (한 source 실패가
// 다른 source emit 을 막지 않음) + not_configured → emit 안함 + happy path.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { PrismaService } from "@study-note/persistence";
import { CostMetricsCronService } from "../cost-metrics-cron.service";
import { MetricsService } from "../metrics.service";

interface EmitRecord {
  name: string;
  value: number;
  tags: { source: string };
}

function spyMetrics(): { metrics: MetricsService; calls: EmitRecord[] } {
  const calls: EmitRecord[] = [];
  const service = new MetricsService(null);
  (service as unknown as { emitGauge: MetricsService["emitGauge"] }).emitGauge = (
    name,
    value,
    tags
  ) => {
    calls.push({ name, value, tags });
  };
  return { metrics: service, calls };
}

function prismaWithMysqlRows(value: unknown): PrismaService {
  return {
    $queryRaw: async () => [{ c: value }]
  } as unknown as PrismaService;
}

function buildCron(
  prisma: PrismaService,
  metrics: MetricsService,
  overrides: Partial<{
    collectR2: () => Promise<unknown>;
    collectDdIngestion: () => Promise<unknown>;
  }> = {}
): CostMetricsCronService {
  const cron = new CostMetricsCronService(prisma, metrics);
  if (overrides.collectR2) {
    (cron as unknown as { collectR2: () => Promise<unknown> }).collectR2 =
      overrides.collectR2;
  }
  if (overrides.collectDdIngestion) {
    (cron as unknown as {
      collectDdIngestion: () => Promise<unknown>;
    }).collectDdIngestion = overrides.collectDdIngestion;
  }
  return cron;
}

describe("CostMetricsCronService.collectAndEmit", () => {
  it("emits all 4 gauges when every source returns ok", async () => {
    const { metrics, calls } = spyMetrics();
    const cron = buildCron(prismaWithMysqlRows(123_456), metrics, {
      collectR2: async () => ({
        status: "ok",
        payloadGb: 1.25,
        objectCount: 4000
      }),
      collectDdIngestion: async () => ({ status: "ok", ingestionGb: 0.5 })
    });

    await cron.collectAndEmit();

    const byName = new Map(calls.map((c) => [c.name, c.value]));
    assert.equal(byName.get("study_note.cost.mysql_row_total"), 123_456);
    assert.equal(byName.get("study_note.cost.r2_storage_gb"), 1.25);
    assert.equal(byName.get("study_note.cost.r2_object_count"), 4000);
    assert.equal(byName.get("study_note.cost.dd_ingestion_gb"), 0.5);
    for (const c of calls) {
      assert.equal(c.tags.source, "cost_metrics_cron");
    }
  });

  it("skips R2 gauges when status=not_configured (no token), still emits mysql + dd", async () => {
    const { metrics, calls } = spyMetrics();
    const cron = buildCron(prismaWithMysqlRows(10), metrics, {
      collectR2: async () => ({
        status: "not_configured",
        payloadGb: null,
        objectCount: null
      }),
      collectDdIngestion: async () => ({ status: "ok", ingestionGb: 0.1 })
    });

    await cron.collectAndEmit();

    const names = new Set(calls.map((c) => c.name));
    assert.ok(names.has("study_note.cost.mysql_row_total"));
    assert.ok(names.has("study_note.cost.dd_ingestion_gb"));
    assert.equal(names.has("study_note.cost.r2_storage_gb"), false);
    assert.equal(names.has("study_note.cost.r2_object_count"), false);
  });

  it("R2 throw is isolated — does not block mysql / dd emission", async () => {
    const { metrics, calls } = spyMetrics();
    const cron = buildCron(prismaWithMysqlRows(7), metrics, {
      collectR2: async () => {
        throw new Error("403");
      },
      collectDdIngestion: async () => ({ status: "ok", ingestionGb: 0.2 })
    });

    await cron.collectAndEmit();

    const names = new Set(calls.map((c) => c.name));
    assert.ok(names.has("study_note.cost.mysql_row_total"));
    assert.ok(names.has("study_note.cost.dd_ingestion_gb"));
    assert.equal(names.has("study_note.cost.r2_storage_gb"), false);
  });

  it("mysql throw is isolated — still emits r2 + dd", async () => {
    const failingPrisma = {
      $queryRaw: async () => {
        throw new Error("db down");
      }
    } as unknown as PrismaService;
    const { metrics, calls } = spyMetrics();
    const cron = buildCron(failingPrisma, metrics, {
      collectR2: async () => ({
        status: "ok",
        payloadGb: 0.3,
        objectCount: 100
      }),
      collectDdIngestion: async () => ({ status: "ok", ingestionGb: 0.05 })
    });

    await cron.collectAndEmit();

    const names = new Set(calls.map((c) => c.name));
    assert.equal(names.has("study_note.cost.mysql_row_total"), false);
    assert.ok(names.has("study_note.cost.r2_storage_gb"));
    assert.ok(names.has("study_note.cost.r2_object_count"));
    assert.ok(names.has("study_note.cost.dd_ingestion_gb"));
  });

  it("runScheduled wraps collectAndEmit and swallows errors", async () => {
    const { metrics } = spyMetrics();
    const cron = buildCron(prismaWithMysqlRows(0), metrics, {
      collectR2: async () => {
        throw new Error("hard fail");
      },
      collectDdIngestion: async () => {
        throw new Error("hard fail");
      }
    });
    await cron.runScheduled();
    assert.ok(true);
  });
});
