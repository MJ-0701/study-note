// 운영지표 v2 / Cost cron — 6h 단위로 비용 source 4종 (MySQL row 합 / R2 storage /
// R2 object / DD ingestion) 을 수집해 MetricsService 의 dual-emit 으로 노출한다.
// sprint-W22-sprint-24 / S2 / AC2 + AC16. token 누락 시 `not_configured` 로 graceful
// 처리하고 gauge 는 emit 하지 않는다. 외부 API 오류 시 warn log (token mask) + 본 라운드
// 만 미수집, 다음 cycle 에서 자동 복구.

import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "@study-note/persistence";
import { MetricsService } from "./metrics.service";
import {
  fetchR2Usage,
  readR2UsageConfig,
  type R2UsageResult
} from "./cost-clients/r2-usage.client";
import {
  fetchDdIngestionGb,
  readDdUsageConfig,
  type DdUsageResult
} from "./cost-clients/dd-usage.client";

const SOURCE_TAG = "cost_metrics_cron";
const SCHEDULE_EVERY_6_HOURS = "0 */6 * * *";

@Injectable()
export class CostMetricsCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CostMetricsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // ProductMetricsCron 과 동일: 첫 6h tick 까지 빈 cost dashboard 방지.
    // R2/DD client 호출 (각 fetch ~수백 ms) 이 포함되지만 catch + graceful
    // 처리되어 boot crash 위험 없음.
    try {
      await this.collectAndEmit();
    } catch (err) {
      this.logger.warn(`bootstrap collect failed err=${(err as Error).message}`);
    }
  }

  @Cron(SCHEDULE_EVERY_6_HOURS)
  async runScheduled(): Promise<void> {
    try {
      await this.collectAndEmit();
    } catch (err) {
      this.logger.warn(`cron tick failed err=${(err as Error).message}`);
    }
  }

  /** Collect + emit. Each source failure is isolated so partial emission survives. */
  async collectAndEmit(): Promise<void> {
    let emitted = 0;
    const mysqlRows = await this.collectMysqlRowTotal().catch((err) => {
      this.logger.warn(`mysql_row_total collect failed err=${(err as Error).message}`);
      return null;
    });
    if (mysqlRows !== null) {
      this.metrics.emitGauge("study_note.cost.mysql_row_total", mysqlRows, {
        source: SOURCE_TAG
      });
      emitted += 1;
    }

    const r2 = await this.collectR2().catch((err) => {
      this.logger.warn(`r2 collect failed err=${(err as Error).message}`);
      return null as R2UsageResult | null;
    });
    if (r2 && r2.status === "ok") {
      if (r2.payloadGb !== null) {
        this.metrics.emitGauge("study_note.cost.r2_storage_gb", r2.payloadGb, {
          source: SOURCE_TAG
        });
        emitted += 1;
      }
      if (r2.objectCount !== null) {
        this.metrics.emitGauge("study_note.cost.r2_object_count", r2.objectCount, {
          source: SOURCE_TAG
        });
        emitted += 1;
      }
    }

    const dd = await this.collectDdIngestion().catch((err) => {
      this.logger.warn(`dd ingestion collect failed err=${(err as Error).message}`);
      return null as DdUsageResult | null;
    });
    if (dd && dd.status === "ok" && dd.ingestionGb !== null) {
      this.metrics.emitGauge("study_note.cost.dd_ingestion_gb", dd.ingestionGb, {
        source: SOURCE_TAG
      });
      emitted += 1;
    }

    this.logger.log(
      `CostMetricsCron emit ${emitted} gauges (mysql=${mysqlRows !== null ? "ok" : "skip"}, r2=${r2?.status ?? "skip"}, dd=${dd?.status ?? "skip"})`
    );
  }

  private async collectMysqlRowTotal(): Promise<number> {
    // information_schema.TABLES.TABLE_ROWS is an MySQL estimate (InnoDB) but is
    // 충분히 정확 for cost trending (not row-exact billing).
    const rows = await this.prisma.$queryRaw<Array<{ c: unknown }>>`
      SELECT IFNULL(SUM(TABLE_ROWS), 0) AS c
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    return readCount(rows);
  }

  private async collectR2(): Promise<R2UsageResult> {
    return fetchR2Usage(readR2UsageConfig());
  }

  private async collectDdIngestion(): Promise<DdUsageResult> {
    return fetchDdIngestionGb(readDdUsageConfig());
  }
}

function readCount(rows: Array<{ c: unknown }>): number {
  const v = rows[0]?.c;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
