// 운영지표 v2 / S1 / AC10 — ProductMetricsCronService spec. mock PrismaService +
// mock MetricsService. 14 gauge emit / role group / 0 divisor / bigint coerce /
// PII no-emit / cron schedule decorator / dogstatsd dual-emit / 소스 파일 PII grep.

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { PrismaService } from "@study-note/persistence";
import { MetricsService } from "../metrics.service";
import { ProductMetricsCronService } from "../product-metrics-cron.service";

interface PrismaStubOpts {
  usersTotal?: number;
  pdfTotal?: number;
  annotationTotal?: number;
  termCount?: number;
  subjectCount?: number;
  roleGroups?: Array<{
    role: "MASTER" | "ADMIN" | "REVIEWER" | "NORMAL";
    _count: { _all: number };
  }>;
  /** Sequential return values for $queryRaw calls in collect() order:
   *  [DAU, new_today, new_7d, pdf_upload_24h]. Each entry is the unwrapped count. */
  rawCounts?: [unknown, unknown, unknown, unknown];
}

function buildPrismaStub(opts: PrismaStubOpts = {}): {
  prisma: PrismaService;
  queryRawCallCount: () => number;
} {
  const rawCounts = opts.rawCounts ?? [0, 0, 0, 0];
  let queryRawIndex = 0;
  const stub = {
    user: {
      count: async () => opts.usersTotal ?? 0,
      groupBy: async (_args: unknown) => opts.roleGroups ?? []
    },
    pdfMaterial: { count: async () => opts.pdfTotal ?? 0 },
    annotationSnapshot: { count: async () => opts.annotationTotal ?? 0 },
    term: { count: async () => opts.termCount ?? 0 },
    subject: { count: async () => opts.subjectCount ?? 0 },
    $queryRaw: async () => {
      const c = rawCounts[queryRawIndex];
      queryRawIndex += 1;
      return [{ c }];
    }
  };
  return {
    prisma: stub as unknown as PrismaService,
    queryRawCallCount: () => queryRawIndex
  };
}

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

describe("ProductMetricsCronService.collectAndEmit", () => {
  it("emits all 14 gauges with source=product_metrics_cron", async () => {
    const { prisma } = buildPrismaStub({
      usersTotal: 42,
      pdfTotal: 100,
      annotationTotal: 250,
      termCount: 4,
      subjectCount: 12,
      roleGroups: [
        { role: "MASTER", _count: { _all: 1 } },
        { role: "ADMIN", _count: { _all: 3 } },
        { role: "REVIEWER", _count: { _all: 4 } },
        { role: "NORMAL", _count: { _all: 38 } }
      ],
      rawCounts: [7, 2, 5, 8]
    });
    const { metrics, calls } = spyMetrics();

    const cron = new ProductMetricsCronService(prisma, metrics);
    await cron.collectAndEmit();

    assert.equal(calls.length, 14);
    for (const call of calls) {
      assert.equal(call.tags.source, "product_metrics_cron");
      assert.ok(Number.isFinite(call.value), `value finite: ${call.name}`);
    }

    const byName = new Map(calls.map((c) => [c.name, c.value]));
    assert.equal(byName.get("study_note.product.users.total"), 42);
    assert.equal(byName.get("study_note.product.users.daily_active"), 7);
    assert.equal(byName.get("study_note.product.users.new_today"), 2);
    assert.equal(byName.get("study_note.product.users.new_7d"), 5);
    assert.equal(byName.get("study_note.product.content.pdf_total"), 100);
    assert.equal(byName.get("study_note.product.content.annotation_total"), 250);
    assert.equal(byName.get("study_note.product.content.pdf_upload_24h"), 8);
    assert.equal(byName.get("study_note.product.users.role_master"), 1);
    assert.equal(byName.get("study_note.product.users.role_admin"), 3);
    assert.equal(byName.get("study_note.product.users.role_reviewer"), 4);
    assert.equal(byName.get("study_note.product.users.role_normal"), 38);
    assert.equal(byName.get("study_note.product.org.term_active_count"), 4);
    assert.equal(byName.get("study_note.product.org.subject_avg_per_term"), 3);
    assert.equal(byName.get("study_note.product.org.material_avg_per_subject"), 100 / 12);
  });

  it("zero terms and zero subjects produce 0 averages (no NaN / Infinity)", async () => {
    const { prisma } = buildPrismaStub({
      termCount: 0,
      subjectCount: 0,
      pdfTotal: 0
    });
    const { metrics, calls } = spyMetrics();

    await new ProductMetricsCronService(prisma, metrics).collectAndEmit();

    const byName = new Map(calls.map((c) => [c.name, c.value]));
    assert.equal(byName.get("study_note.product.org.subject_avg_per_term"), 0);
    assert.equal(byName.get("study_note.product.org.material_avg_per_subject"), 0);
  });

  it("zero subjects but non-zero terms still yields material_avg_per_subject=0", async () => {
    const { prisma } = buildPrismaStub({ termCount: 2, subjectCount: 0, pdfTotal: 7 });
    const { metrics, calls } = spyMetrics();

    await new ProductMetricsCronService(prisma, metrics).collectAndEmit();

    const byName = new Map(calls.map((c) => [c.name, c.value]));
    assert.equal(byName.get("study_note.product.org.subject_avg_per_term"), 0);
    assert.equal(byName.get("study_note.product.org.material_avg_per_subject"), 0);
  });

  it("coerces bigint and string COUNT results from raw query", async () => {
    const { prisma } = buildPrismaStub({
      rawCounts: [11n as unknown, "23", 7n as unknown, 4]
    });
    const { metrics, calls } = spyMetrics();

    await new ProductMetricsCronService(prisma, metrics).collectAndEmit();

    const byName = new Map(calls.map((c) => [c.name, c.value]));
    assert.equal(byName.get("study_note.product.users.daily_active"), 11);
    assert.equal(byName.get("study_note.product.users.new_today"), 23);
    assert.equal(byName.get("study_note.product.users.new_7d"), 7);
    assert.equal(byName.get("study_note.product.content.pdf_upload_24h"), 4);
  });

  it("missing role rows default to 0 (no undefined emit)", async () => {
    const { prisma } = buildPrismaStub({ roleGroups: [] });
    const { metrics, calls } = spyMetrics();

    await new ProductMetricsCronService(prisma, metrics).collectAndEmit();

    const byName = new Map(calls.map((c) => [c.name, c.value]));
    assert.equal(byName.get("study_note.product.users.role_master"), 0);
    assert.equal(byName.get("study_note.product.users.role_admin"), 0);
    assert.equal(byName.get("study_note.product.users.role_normal"), 0);
  });
});

describe("ProductMetricsCronService runtime safety", () => {
  it("cron tick swallows errors (does not crash scheduler)", async () => {
    const failing = {
      user: {
        count: async () => {
          throw new Error("db down");
        },
        groupBy: async () => []
      },
      pdfMaterial: { count: async () => 0 },
      annotationSnapshot: { count: async () => 0 },
      term: { count: async () => 0 },
      subject: { count: async () => 0 },
      $queryRaw: async () => [{ c: 0 }]
    } as unknown as PrismaService;
    const { metrics } = spyMetrics();

    const cron = new ProductMetricsCronService(failing, metrics);
    await cron.runScheduled();
    await cron.onApplicationBootstrap();
    assert.ok(true, "no throw");
  });
});

describe("MetricsService dual-emit (Prom + dogstatsd)", () => {
  it("registers all 14 gauges in prom registry", () => {
    const svc = new MetricsService(null);
    const known = [
      "study_note.product.users.total",
      "study_note.product.users.daily_active",
      "study_note.product.users.new_today",
      "study_note.product.users.new_7d",
      "study_note.product.content.pdf_total",
      "study_note.product.content.annotation_total",
      "study_note.product.content.pdf_upload_24h",
      "study_note.product.users.role_master",
      "study_note.product.users.role_admin",
      "study_note.product.users.role_reviewer",
      "study_note.product.users.role_normal",
      "study_note.product.org.term_active_count",
      "study_note.product.org.subject_avg_per_term",
      "study_note.product.org.material_avg_per_subject"
    ];
    for (const name of known) {
      assert.equal(svc.hasGauge(name), true, `gauge registered: ${name}`);
    }
  });

  it("emitGauge writes to prom (source+env+version labels) and dogstatsd dual-emit", async () => {
    const ddCalls: Array<{ name: string; value: number; tags?: string[] }> = [];
    const svc = new MetricsService({
      gauge: (name, value, tags) => ddCalls.push({ name, value, tags })
    });
    svc.emitGauge("study_note.product.users.total", 17, { source: "test" });

    const exposition = await svc.render();
    // Prom: line carries app (default) + source + env + version, value 17.
    assert.match(
      exposition,
      /study_note_product_users_total\{[^}]*source="test"[^}]*\}\s+17/
    );
    assert.match(exposition, /env=/);
    assert.match(exposition, /version=/);

    assert.equal(ddCalls.length, 1);
    const first = ddCalls[0]!;
    assert.equal(first.name, "study_note.product.users.total");
    assert.equal(first.value, 17);
    assert.equal(first.tags?.includes("source:test"), true);
    assert.equal(
      first.tags?.some((t) => t.startsWith("env:")),
      true
    );
    assert.equal(
      first.tags?.some((t) => t.startsWith("version:")),
      true
    );
  });

  it("existing HTTP counter labels remain {app, method, route, status} (no env/version widening)", async () => {
    const svc = new MetricsService(null);
    svc.observeHttp("GET", "/api/health", 200, 0.01);
    const exposition = await svc.render();
    const httpLine = exposition
      .split("\n")
      .find((l) => l.startsWith("study_note_http_requests_total"));
    assert.ok(httpLine, "http counter exposed");
    assert.equal(httpLine.includes("env="), false, "env not on http counter");
    assert.equal(httpLine.includes("version="), false, "version not on http counter");
  });

  it("drops non-finite values without throwing", () => {
    const ddCalls: Array<unknown> = [];
    const svc = new MetricsService({
      gauge: (name, value) => ddCalls.push({ name, value })
    });
    svc.emitGauge("study_note.product.users.total", Number.NaN, { source: "test" });
    svc.emitGauge("study_note.product.users.total", Number.POSITIVE_INFINITY, {
      source: "test"
    });
    assert.equal(ddCalls.length, 0);
  });

  it("unknown gauge name is dropped (no exposition pollution)", async () => {
    const svc = new MetricsService(null);
    svc.emitGauge("study_note.bogus", 99, { source: "test" });
    const exposition = await svc.render();
    assert.equal(exposition.includes("study_note_bogus"), false);
  });
});

describe("PII source grep (AC12)", () => {
  it("product-metrics-cron.service.ts contains no PII identifier strings", async () => {
    // __dirname (CJS) = .../dist/observability/__tests__/ — ascend to dist/observability/.
    const distSrcPath = join(__dirname, "..", "product-metrics-cron.service.js");
    const distContent = await readFile(distSrcPath, "utf8");
    for (const token of ["studentNumber", "email", "displayName"]) {
      assert.equal(
        distContent.includes(token),
        false,
        `compiled cron must not reference ${token}`
      );
    }
    // 'userId' appears only inside a SQL string for COUNT(DISTINCT userId) — that
    // is a column reference, not a label / log value. Assert no occurrence outside
    // the raw SQL template literal context. Tightened invariant:
    const lines = distContent.split("\n");
    for (const line of lines) {
      if (line.includes("userId") && !line.includes("COUNT(DISTINCT userId)")) {
        assert.fail(`unexpected userId reference in cron: ${line.trim()}`);
      }
    }
  });
});
