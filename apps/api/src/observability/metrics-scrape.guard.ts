// 운영지표 v2 / AC14 — `/api/metrics` 스크랩 token 게이트. unauth 노출 시 product
// / cost / org / SLO gauge 가 business intel leak surface 가 되므로 fail-closed.
// 별 ACA Prometheus scraper 가 `x-prometheus-token: ${METRICS_INTERNAL_TOKEN}`
// 헤더로 호출. 일치 시 next, 아니면 403.

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

const CUSTOM_HEADER = "x-prometheus-token";
const ENV_KEY = "METRICS_INTERNAL_TOKEN";
const BEARER_PREFIX = "Bearer ";

@Injectable()
export class MetricsScrapeGuard implements CanActivate {
  private readonly logger = new Logger(MetricsScrapeGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env[ENV_KEY];
    if (!expected || expected.length === 0) {
      this.logger.warn("metrics scrape rejected — METRICS_INTERNAL_TOKEN not configured");
      throw new ForbiddenException({
        errorCode: "METRICS_NOT_CONFIGURED",
        errorMessage: "metrics endpoint is not available"
      });
    }

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const presented = extractToken(req.headers);
    if (presented === null) {
      this.logger.warn(
        "metrics scrape rejected — missing Authorization Bearer / x-prometheus-token"
      );
      throw new ForbiddenException({
        errorCode: "METRICS_FORBIDDEN",
        errorMessage: "missing scrape token"
      });
    }

    if (!constantTimeEqual(presented, expected)) {
      this.logger.warn("metrics scrape rejected — invalid scrape token");
      throw new ForbiddenException({
        errorCode: "METRICS_FORBIDDEN",
        errorMessage: "invalid scrape token"
      });
    }

    return true;
  }
}

/** Returns the token presented by the scraper, or null if neither header is set.
 *  Prefers standard `Authorization: Bearer <token>` (Prometheus 3.x native).
 *  Falls back to legacy custom `x-prometheus-token` for non-Prom callers. */
function extractToken(
  headers: Record<string, string | string[] | undefined>
): string | null {
  const authRaw = headers["authorization"];
  const authHeader = Array.isArray(authRaw) ? authRaw[0] : authRaw;
  if (typeof authHeader === "string" && authHeader.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length);
    if (token.length > 0) return token;
  }
  const customRaw = headers[CUSTOM_HEADER];
  const customHeader = Array.isArray(customRaw) ? customRaw[0] : customRaw;
  if (typeof customHeader === "string" && customHeader.length > 0) {
    return customHeader;
  }
  return null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
