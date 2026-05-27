// 운영지표 v2 / Product cron — 30min 단위로 MySQL row 기반 product/org gauge 13개를
// 수집하고 MetricsService 의 dual-emit (Prom + DD dogstatsd) 으로 노출한다.
// sprint-W22-sprint-24 / S1 / AC1 + AC8. 개인 식별자 0 invariant (AC12) — label
// 또는 SQL 어느 단계에서도 사용자 식별 컬럼을 노출하지 않는다 (DAU 는 익명 카운트만).

import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "@study-note/persistence";
import { MetricsService } from "./metrics.service";

const SOURCE_TAG = "product_metrics_cron";
const SCHEDULE_EVERY_30_MIN = "*/30 * * * *";

type RoleKey = "MASTER" | "ADMIN" | "NORMAL";

interface RoleGroup {
  role: RoleKey;
  _count: { _all: number };
}

@Injectable()
export class ProductMetricsCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductMetricsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Initial run on boot so first metric exposition happens before the first
    // :00 / :30 cron tick. Failure here is logged but never crashes boot.
    try {
      await this.collectAndEmit();
    } catch (err) {
      this.logger.warn(`bootstrap collect failed err=${(err as Error).message}`);
    }
  }

  @Cron(SCHEDULE_EVERY_30_MIN)
  async runScheduled(): Promise<void> {
    try {
      await this.collectAndEmit();
    } catch (err) {
      this.logger.warn(`cron tick failed err=${(err as Error).message}`);
    }
  }

  /** Collect + emit all 13 gauges. Public so spec can drive deterministically. */
  async collectAndEmit(): Promise<void> {
    const samples = await this.collect();
    for (const [name, value] of samples) {
      this.metrics.emitGauge(name, value, { source: SOURCE_TAG });
    }
    this.logger.log(`ProductMetricsCron emit ${samples.length} gauges`);
  }

  private async collect(): Promise<Array<[string, number]>> {
    const [
      usersTotal,
      pdfTotal,
      annotationTotal,
      termActiveCount,
      subjectCount,
      roleGroups,
      dauRows,
      newTodayRows,
      new7dRows,
      pdfUpload24hRows
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.pdfMaterial.count(),
      this.prisma.annotationSnapshot.count(),
      this.prisma.term.count(),
      this.prisma.subject.count(),
      this.prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true }
      }) as unknown as Promise<RoleGroup[]>,
      this.prisma.$queryRaw<Array<{ c: unknown }>>`
        SELECT COUNT(DISTINCT userId) AS c
        FROM Session
        WHERE createdAt >= (NOW() - INTERVAL 24 HOUR)
      `,
      this.prisma.$queryRaw<Array<{ c: unknown }>>`
        SELECT COUNT(*) AS c FROM User WHERE createdAt >= CURDATE()
      `,
      this.prisma.$queryRaw<Array<{ c: unknown }>>`
        SELECT COUNT(*) AS c FROM User WHERE createdAt >= (NOW() - INTERVAL 7 DAY)
      `,
      this.prisma.$queryRaw<Array<{ c: unknown }>>`
        SELECT COUNT(*) AS c FROM PdfMaterial WHERE createdAt >= (NOW() - INTERVAL 24 HOUR)
      `
    ]);

    const dau = readCount(dauRows);
    const newToday = readCount(newTodayRows);
    const new7d = readCount(new7dRows);
    const pdfUpload24h = readCount(pdfUpload24hRows);
    const roleCounts = countRoles(roleGroups);
    const subjectAvgPerTerm = termActiveCount > 0 ? subjectCount / termActiveCount : 0;
    const materialAvgPerSubject = subjectCount > 0 ? pdfTotal / subjectCount : 0;

    return [
      ["study_note.product.users.total", usersTotal],
      ["study_note.product.users.daily_active", dau],
      ["study_note.product.users.new_today", newToday],
      ["study_note.product.users.new_7d", new7d],
      ["study_note.product.content.pdf_total", pdfTotal],
      ["study_note.product.content.annotation_total", annotationTotal],
      ["study_note.product.content.pdf_upload_24h", pdfUpload24h],
      ["study_note.product.users.role_master", roleCounts.MASTER],
      ["study_note.product.users.role_admin", roleCounts.ADMIN],
      ["study_note.product.users.role_normal", roleCounts.NORMAL],
      ["study_note.product.org.term_active_count", termActiveCount],
      ["study_note.product.org.subject_avg_per_term", subjectAvgPerTerm],
      ["study_note.product.org.material_avg_per_subject", materialAvgPerSubject]
    ];
  }
}

/** mysql2 returns COUNT(*) as bigint or number depending on driver flag — coerce safely. */
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

function countRoles(groups: RoleGroup[]): Record<RoleKey, number> {
  const out: Record<RoleKey, number> = { MASTER: 0, ADMIN: 0, NORMAL: 0 };
  for (const g of groups) {
    out[g.role] = g._count._all;
  }
  return out;
}
