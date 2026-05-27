// sprint-W22-be-sync/B-1 — HTTP request middleware that records counter +
// histogram per request. NestExpress 의 모든 route 에 apply.
//
// route label cardinality 폭주 차단:
//   - express 의 req.route?.path 가 있으면 그것 (parametrized: /v1/subjects/:id).
//   - 없으면 req.baseUrl + req.path (notFound 등) 의 segmented form.
//   - 가능한 한 path param value 는 노출 X.
//
// status label = response.statusCode (string).

import type { IncomingMessage, ServerResponse } from "node:http";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

// Minimal Express-like request shape — avoids @types/express dependency
// (다른 controller 와 같은 pattern). 실제 runtime = NestExpressApplication 가
// 주입하는 Express Request 객체이지만, TS 시점엔 node:http + 추가 field interface 만.
interface ExpressLikeRequest extends IncomingMessage {
  method: string;
  baseUrl?: string;
  path?: string;
  originalUrl?: string;
  route?: { path?: string };
}

type ExpressLikeResponse = ServerResponse;

type NextFn = (err?: unknown) => void;

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: ExpressLikeRequest, res: ExpressLikeResponse, next: NextFn): void {
    const startNs = process.hrtime.bigint();

    res.on("finish", () => {
      const durationSec = Number(process.hrtime.bigint() - startNs) / 1e9;
      const method = req.method;
      const route = resolveRouteLabel(req);
      const status = res.statusCode;
      this.metrics.observeHttp(method, route, status, durationSec);
    });

    next();
  }
}

function resolveRouteLabel(req: ExpressLikeRequest): string {
  // Express populates req.route only after the router matched. For unmatched
  // (404) we fall back to a coarse path label so cardinality stays bounded.
  const routePath = req.route?.path;
  if (typeof routePath === "string" && routePath.length > 0) {
    const base = req.baseUrl ?? "";
    return `${base}${routePath}` || "/";
  }

  // notFound or pre-router middleware path — collapse to first segment.
  const path = req.path ?? req.url ?? "/";
  const firstSegment = path.split("?")[0]?.split("/").filter(Boolean)[0];
  return firstSegment ? `/${firstSegment}/*` : "/";
}
