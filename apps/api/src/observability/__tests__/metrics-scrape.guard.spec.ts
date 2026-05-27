// 운영지표 v2 / AC14 — MetricsScrapeGuard spec. valid / invalid / missing header /
// missing env (fail-closed) / array header / 4 + 1 case.

import { strict as assert } from "node:assert";
import { afterEach, describe, it } from "node:test";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { MetricsScrapeGuard } from "../metrics-scrape.guard";

const ENV_KEY = "METRICS_INTERNAL_TOKEN";
const savedToken = process.env[ENV_KEY];

afterEach(() => {
  if (savedToken === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = savedToken;
  }
});

function makeContext(headers: Record<string, string | string[] | undefined>): ExecutionContext {
  const req = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => req })
  } as unknown as ExecutionContext;
}

describe("MetricsScrapeGuard", () => {
  it("returns true when token header matches METRICS_INTERNAL_TOKEN", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ "x-prometheus-token": "secret-token-abc" });
    assert.equal(guard.canActivate(ctx), true);
  });

  it("throws ForbiddenException(METRICS_FORBIDDEN) when token mismatches", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ "x-prometheus-token": "wrong-token" });
    assert.throws(
      () => guard.canActivate(ctx),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        const body = (err as ForbiddenException).getResponse() as { errorCode?: string };
        assert.equal(body.errorCode, "METRICS_FORBIDDEN");
        return true;
      }
    );
  });

  it("throws ForbiddenException(METRICS_FORBIDDEN) when header missing", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({});
    assert.throws(
      () => guard.canActivate(ctx),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        const body = (err as ForbiddenException).getResponse() as { errorCode?: string };
        assert.equal(body.errorCode, "METRICS_FORBIDDEN");
        return true;
      }
    );
  });

  it("fail-closed: throws METRICS_NOT_CONFIGURED when env unset", () => {
    delete process.env[ENV_KEY];
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ "x-prometheus-token": "anything" });
    assert.throws(
      () => guard.canActivate(ctx),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        const body = (err as ForbiddenException).getResponse() as { errorCode?: string };
        assert.equal(body.errorCode, "METRICS_NOT_CONFIGURED");
        return true;
      }
    );
  });

  it("fail-closed: empty env string is treated as unset", () => {
    process.env[ENV_KEY] = "";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ "x-prometheus-token": "anything" });
    assert.throws(
      () => guard.canActivate(ctx),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        const body = (err as ForbiddenException).getResponse() as { errorCode?: string };
        assert.equal(body.errorCode, "METRICS_NOT_CONFIGURED");
        return true;
      }
    );
  });

  it("array header takes the first element and validates", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ "x-prometheus-token": ["secret-token-abc", "extra"] });
    assert.equal(guard.canActivate(ctx), true);
  });

  it("rejects empty-string header even when env is set", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ "x-prometheus-token": "" });
    assert.throws(() => guard.canActivate(ctx), ForbiddenException);
  });

  it("accepts standard Authorization: Bearer <token> (Prom v3 native)", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ authorization: "Bearer secret-token-abc" });
    assert.equal(guard.canActivate(ctx), true);
  });

  it("rejects Bearer with wrong token", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ authorization: "Bearer not-the-token" });
    assert.throws(() => guard.canActivate(ctx), ForbiddenException);
  });

  it("ignores Authorization without Bearer prefix (Basic etc.)", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({ authorization: "Basic dXNlcjpwYXNz" });
    assert.throws(() => guard.canActivate(ctx), ForbiddenException);
  });

  it("Bearer header beats custom header when both present", () => {
    process.env[ENV_KEY] = "secret-token-abc";
    const guard = new MetricsScrapeGuard();
    const ctx = makeContext({
      authorization: "Bearer secret-token-abc",
      "x-prometheus-token": "wrong-but-ignored"
    });
    assert.equal(guard.canActivate(ctx), true);
  });
});
