// 운영지표 v2 / S2 / AC16 — R2 GraphQL Analytics 클라이언트 negative + happy path.
// missing token / invalid token / 401 / 403 + token mask + happy payload parse.

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  fetchR2Usage,
  maskToken,
  readR2UsageConfig,
  type FetchLike
} from "../cost-clients/r2-usage.client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("maskToken", () => {
  it("masks long tokens to head + length", () => {
    assert.equal(maskToken("abcdefghijklmnop"), "abcd…(16 chars)");
  });
  it("handles empty / undefined gracefully", () => {
    assert.equal(maskToken(undefined), "(empty)");
    assert.equal(maskToken(""), "(empty)");
  });
});

describe("readR2UsageConfig", () => {
  it("reads CLOUDFLARE_* + S3_BUCKET from env", () => {
    const cfg = readR2UsageConfig({
      CLOUDFLARE_R2_API_TOKEN: "tok",
      CLOUDFLARE_ACCOUNT_TAG: "acct-1",
      S3_BUCKET: "bucket-x"
    });
    assert.equal(cfg.apiToken, "tok");
    assert.equal(cfg.accountTag, "acct-1");
    assert.equal(cfg.bucket, "bucket-x");
  });
});

describe("fetchR2Usage", () => {
  it("returns not_configured when token missing", async () => {
    const fetcher: FetchLike = async () => {
      throw new Error("fetch should not be called");
    };
    const result = await fetchR2Usage(
      { accountTag: "a", bucket: "b" },
      fetcher
    );
    assert.equal(result.status, "not_configured");
    assert.equal(result.payloadGb, null);
    assert.equal(result.objectCount, null);
  });

  it("returns not_configured when accountTag missing", async () => {
    const fetcher: FetchLike = async () => {
      throw new Error("fetch should not be called");
    };
    const result = await fetchR2Usage({ apiToken: "tok", bucket: "b" }, fetcher);
    assert.equal(result.status, "not_configured");
  });

  it("returns not_configured when bucket missing", async () => {
    const fetcher: FetchLike = async () => {
      throw new Error("fetch should not be called");
    };
    const result = await fetchR2Usage(
      { apiToken: "tok", accountTag: "a" },
      fetcher
    );
    assert.equal(result.status, "not_configured");
  });

  it("throws on 401 without leaking token in error message", async () => {
    const fetcher: FetchLike = async () => jsonResponse({ errors: [] }, 401);
    await assert.rejects(
      () =>
        fetchR2Usage(
          {
            apiToken: "super-secret-token-value",
            accountTag: "acct",
            bucket: "bucket"
          },
          fetcher
        ),
      (err: unknown) => {
        const msg = (err as Error).message;
        assert.ok(msg.includes("401"));
        assert.equal(
          msg.includes("super-secret-token-value"),
          false,
          "error message must not contain raw token"
        );
        return true;
      }
    );
  });

  it("throws on 403 without leaking token", async () => {
    const fetcher: FetchLike = async () => jsonResponse({ errors: [] }, 403);
    await assert.rejects(
      () =>
        fetchR2Usage(
          { apiToken: "tok-403", accountTag: "acct", bucket: "bucket" },
          fetcher
        ),
      (err: unknown) => {
        const msg = (err as Error).message;
        assert.ok(msg.includes("403"));
        assert.equal(msg.includes("tok-403"), false);
        return true;
      }
    );
  });

  it("throws on GraphQL errors without leaking token", async () => {
    const fetcher: FetchLike = async () =>
      jsonResponse(
        { data: null, errors: [{ message: "schema unknown" }] },
        200
      );
    await assert.rejects(
      () =>
        fetchR2Usage(
          { apiToken: "tok-gql", accountTag: "acct", bucket: "bucket" },
          fetcher
        ),
      (err: unknown) => {
        const msg = (err as Error).message;
        assert.ok(msg.includes("schema unknown"));
        assert.equal(msg.includes("tok-gql"), false);
        return true;
      }
    );
  });

  it("parses payloadSize bytes to GiB-equivalent and objectCount", async () => {
    const fetcher: FetchLike = async () =>
      jsonResponse({
        data: {
          viewer: {
            accounts: [
              {
                r2StorageAdaptiveGroups: [
                  { max: { payloadSize: 2_500_000_000, objectCount: 12345 } }
                ]
              }
            ]
          }
        }
      });
    const result = await fetchR2Usage(
      { apiToken: "tok", accountTag: "acct", bucket: "bucket" },
      fetcher
    );
    assert.equal(result.status, "ok");
    assert.equal(result.payloadGb, 2.5);
    assert.equal(result.objectCount, 12345);
  });

  it("returns ok with null values when payload group is absent", async () => {
    const fetcher: FetchLike = async () =>
      jsonResponse({ data: { viewer: { accounts: [{}] } } });
    const result = await fetchR2Usage(
      { apiToken: "tok", accountTag: "acct", bucket: "bucket" },
      fetcher
    );
    assert.equal(result.status, "ok");
    assert.equal(result.payloadGb, null);
    assert.equal(result.objectCount, null);
  });
});
