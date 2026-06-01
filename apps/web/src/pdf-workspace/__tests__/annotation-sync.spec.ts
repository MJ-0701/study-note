/**
 * annotation-sync.spec.ts — sprint-2026-W22-sprint-1 / layer B/slice-1 AC2.
 *
 * fetch mock + callback spy + module state introspection 으로 characterization
 * (revision/CAS / STALE / batch / dedup / chain / auth-expired / silent 4xx /
 * malformed / unauthenticated / URL encoding / metric scrub).
 *
 * 실행:
 *   node --experimental-strip-types --no-warnings --test \
 *     apps/web/src/pdf-workspace/__tests__/annotation-sync.spec.ts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, it, beforeEach } from "node:test";
import { fileURLToPath } from "node:url";
import type { SubjectPdfWorkspace } from "@study-note/domain";
import {
  clearAnnotationSyncCaches,
  fetchAnnotationIfMissing,
  fetchAnnotationsForSubject,
  putAnnotationToBE,
  recordFetchFailure,
  recordFetchSuccess,
  recordSyncFailure,
  recordSyncSuccess,
  scheduleAnnotationPut,
  type AnnotationHydrationEntry,
  type AnnotationSyncCallbacks,
  type AnnotationSyncContext,
  type SyncMetricContext,
  type SyncMetricEvent
} from "../annotation-sync.ts";

// ─── shared fixtures ─────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FetchCall {
  url: string;
  init?: RequestInit;
}

interface MetricCall {
  event: SyncMetricEvent;
  ctx?: SyncMetricContext;
}

interface HydrationCall {
  subjectId: string;
  hydration: AnnotationHydrationEntry[];
}

function makeWorkspace(materialId?: string): SubjectPdfWorkspace {
  return {
    material: materialId
      ? ({ id: materialId, backendMaterialId: materialId } as SubjectPdfWorkspace["material"])
      : null,
    stickyNotes: [],
    inkStrokes: [],
    textBoxes: [],
    checklists: [],
    tables: [],
    charts: [],
    starMarks: [],
    pdfTool: "read",
    updatedAt: new Date(0).toISOString()
  } as unknown as SubjectPdfWorkspace;
}

function makeHarness(opts: {
  sessionUserId?: string | undefined;
  paused?: boolean;
  workspace?: SubjectPdfWorkspace;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  const fetchCalls: FetchCall[] = [];
  const metricCalls: MetricCall[] = [];
  const hydrationCalls: HydrationCall[] = [];
  const errorMessages: Array<string | undefined> = [];
  const errorReportedFlags: boolean[] = [];
  let renderCount = 0;
  let authExpiredCount = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    fetchCalls.push({ url, init });
    if (opts.fetchImpl) {
      return opts.fetchImpl(url, init);
    }
    return Promise.resolve(new Response(null, { status: 500 }));
  };

  const ctx: AnnotationSyncContext = {
    apiBaseUrl: "/api",
    getSessionUserId: () => opts.sessionUserId,
    getSyncBackendPaused: () => opts.paused ?? false,
    readSubjectWorkspace: () => opts.workspace
  };

  const cb: AnnotationSyncCallbacks = {
    setSyncBackendError: (msg) => errorMessages.push(msg),
    setSyncBackendErrorReported: (flag) => errorReportedFlags.push(flag),
    triggerRenderApp: () => {
      renderCount += 1;
    },
    applyAnnotationHydration: (subjectId, hydration) => {
      hydrationCalls.push({ subjectId, hydration });
    },
    handleAuthExpired: () => {
      authExpiredCount += 1;
    },
    onSyncMetricEvent: (event, context) => {
      metricCalls.push({ event, ctx: context });
    }
  };

  return {
    ctx,
    cb,
    fetchCalls,
    metricCalls,
    hydrationCalls,
    errorMessages,
    errorReportedFlags,
    getRenderCount: () => renderCount,
    getAuthExpiredCount: () => authExpiredCount,
    restore: () => {
      globalThis.fetch = originalFetch;
    }
  };
}

beforeEach(() => {
  clearAnnotationSyncCaches();
});

// ─── happy path PUT ──────────────────────────────────────────────────────

describe("AC2 (a) — happy path PUT", () => {
  it("PUT /v1/pdf-annotations/m1 succeeds, updates revision cache, records success", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            annotations: { m1: { payload: {}, updatedAt: "2026-05-25T01:00:00Z" } }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    });
    try {
      await putAnnotationToBE("m1", { hello: "world" }, harness.ctx, harness.cb);
      assert.equal(harness.fetchCalls.length, 1);
      assert.equal(harness.fetchCalls[0]?.url, "/api/v1/pdf-annotations/m1");
      assert.equal(harness.fetchCalls[0]?.init?.method, "PUT");
      assert.ok(harness.metricCalls.some((m) => m.event === "put.success"));
    } finally {
      harness.restore();
    }
  });
});

// ─── 413 PAYLOAD_TOO_LARGE → 사용자 경고 + 로컬 보존 ─────────────────────

describe("413 PAYLOAD_TOO_LARGE", () => {
  it("413 → setSyncBackendError 경고 + render, recordSyncFailure(pause) 미발생", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () => new Response(null, { status: 413 })
    });
    try {
      const before = harness.getRenderCount();
      await putAnnotationToBE("m1", { hello: "world" }, harness.ctx, harness.cb);
      // 사용자 경고 배너 메시지가 set 됨 (silent return 아님)
      const warning = harness.errorMessages.find(
        (m) => typeof m === "string" && m.includes("자동 저장에 실패")
      );
      assert.ok(warning, "413 은 사용자 경고 메시지를 set 해야 함");
      assert.ok(harness.getRenderCount() > before, "경고 표시 위해 render 트리거");
      // 413 은 retry 무의미 → pause/실패 카운트 대상 아님
      assert.equal(
        harness.metricCalls.some((m) => m.event === "put.failure"),
        false,
        "413 은 put.failure(pause) 를 발생시키면 안 됨"
      );
      // 단일 PUT — retry 없음 (로컬 payload 는 clear 안 됨 = 보존)
      assert.equal(harness.fetchCalls.length, 1);
    } finally {
      harness.restore();
    }
  });
});

// ─── (b) STALE_REVISION 복원 ─────────────────────────────────────────────

describe("AC2 (b) — STALE_REVISION 복원", () => {
  it("409 with canonical entry → hydration callback + recordSyncSuccess", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            annotations: {
              m1: { payload: { stickyNotes: [{ id: "n1" }] }, updatedAt: "2026-05-25T02:00:00Z" }
            }
          }),
          { status: 409, headers: { "content-type": "application/json" } }
        )
    });
    try {
      await putAnnotationToBE("m1", { hello: "world" }, harness.ctx, harness.cb);
      assert.ok(harness.metricCalls.some((m) => m.event === "put.success"));
    } finally {
      harness.restore();
    }
  });
});

// ─── (c) STALE_REVISION_NO_RECORD retry 실패 ──────────────────────────────

describe("AC2 (c) — STALE_REVISION_NO_RECORD retry 5xx 실패", () => {
  it("409 NO_RECORD + retry 5xx → recordSyncFailure 호출", async () => {
    let call = 0;
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () => {
        call += 1;
        if (call === 1) {
          // first PUT: 409 NO_RECORD (entry 없음)
          return new Response(JSON.stringify({ annotations: {} }), {
            status: 409,
            headers: { "content-type": "application/json" }
          });
        }
        // retry PUT: 503
        return new Response(null, { status: 503 });
      }
    });
    try {
      await putAnnotationToBE("m1", { hello: "world" }, harness.ctx, harness.cb);
      assert.equal(call, 2, "should retry once");
      assert.ok(harness.metricCalls.some((m) => m.event === "put.failure"));
      assert.ok(!harness.metricCalls.some((m) => m.event === "put.success"));
    } finally {
      harness.restore();
    }
  });
});

// ─── (d) batch hydrate ──────────────────────────────────────────────────

describe("AC2 (d) — batch hydrate /by-subject endpoint", () => {
  it("GET /v1/pdf-annotations/by-subject/s1 + apply hydration for active material", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            annotations: {
              m1: { payload: { stickyNotes: [{ id: "n1" }] }, updatedAt: "2026-05-25T03:00:00Z" }
            },
            truncated: false,
            total: 1,
            returned: 1
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    });
    try {
      await fetchAnnotationsForSubject("s1", harness.ctx, harness.cb);
      assert.equal(harness.fetchCalls[0]?.url, "/api/v1/pdf-annotations/by-subject/s1");
      assert.equal(harness.hydrationCalls.length, 1);
      assert.equal(harness.hydrationCalls[0]?.subjectId, "s1");
      assert.equal(harness.hydrationCalls[0]?.hydration[0]?.materialId, "m1");
      assert.ok(harness.metricCalls.some((m) => m.event === "fetch.success"));
    } finally {
      harness.restore();
    }
  });
});

// ─── (d1) hydration 전 빠른 편집 보존 ─────────────────────────────────

describe("AC2 (d1) — pending PUT + hydration merge", () => {
  it("single GET 중 pending PUT 이 있으면 canonical payload 와 병합해 저장한다", async () => {
    let putBody: string | undefined;
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async (_url, init) => {
        if (init?.method === "PUT") {
          putBody = typeof init.body === "string" ? init.body : undefined;
          return new Response(
            JSON.stringify({
              annotations: { m1: { payload: {}, updatedAt: "2026-05-25T04:01:00Z" } }
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            annotations: {
              m1: {
                payload: {
                  stickyNotes: [{ id: "server-note" }],
                  starMarks: [{ id: "server-star" }]
                },
                updatedAt: "2026-05-25T04:00:00Z"
              }
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
    });
    try {
      scheduleAnnotationPut(
        "m1",
        {
          stickyNotes: [{ id: "local-note" }],
          inkStrokes: [],
          textBoxes: [],
          checklists: [],
          tables: [],
          charts: [],
          starMarks: []
        },
        "s1",
        harness.ctx,
        harness.cb
      );
      await fetchAnnotationIfMissing("s1", "m1", harness.ctx, harness.cb);

      assert.equal(harness.hydrationCalls.length, 1);
      const hydrated = harness.hydrationCalls[0]!.hydration[0]!.payload;
      assert.deepEqual(
        (hydrated.stickyNotes ?? []).map((note) => (note as { id: string }).id),
        ["server-note", "local-note"]
      );
      assert.deepEqual(
        (hydrated.starMarks ?? []).map((mark) => (mark as { id: string }).id),
        ["server-star"]
      );

      await new Promise((resolve) => setTimeout(resolve, 800));
      assert.ok(putBody, "debounced PUT body captured");
      const saved = JSON.parse(putBody!) as { payload: SubjectPdfWorkspace };
      assert.deepEqual(
        (saved.payload.stickyNotes ?? []).map((note) => (note as { id: string }).id),
        ["server-note", "local-note"]
      );
      assert.deepEqual(
        (saved.payload.starMarks ?? []).map((mark) => (mark as { id: string }).id),
        ["server-star"]
      );
    } finally {
      harness.restore();
    }
  });

  it("hydrated material 의 pending snapshot 은 삭제를 되살리지 않는다", async () => {
    let putBody: string | undefined;
    const workspace = makeWorkspace("m1");
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace,
      fetchImpl: async (_url, init) => {
        if (init?.method === "PUT") {
          putBody = typeof init.body === "string" ? init.body : undefined;
          return new Response(
            JSON.stringify({
              annotations: { m1: { payload: {}, updatedAt: "2026-05-25T04:02:00Z" } }
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            annotations: {
              m1: {
                payload: { stickyNotes: [{ id: "server-note" }] },
                updatedAt: "2026-05-25T04:00:00Z"
              }
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
    });
    try {
      await fetchAnnotationIfMissing("s1", "m1", harness.ctx, harness.cb);
      assert.equal(harness.hydrationCalls.length, 1, "initial hydration 완료");

      scheduleAnnotationPut(
        "m1",
        {
          stickyNotes: [],
          inkStrokes: [],
          textBoxes: [],
          checklists: [],
          tables: [],
          charts: [],
          starMarks: []
        },
        "s1",
        harness.ctx,
        harness.cb
      );
      await fetchAnnotationsForSubject("s1", harness.ctx, harness.cb);
      assert.equal(harness.hydrationCalls.length, 2, "concurrent hydration callback");
      assert.deepEqual(harness.hydrationCalls[1]!.hydration[0]!.payload.stickyNotes ?? [], []);

      await new Promise((resolve) => setTimeout(resolve, 800));
      assert.ok(putBody, "debounced PUT body captured");
      const saved = JSON.parse(putBody!) as { payload: SubjectPdfWorkspace };
      assert.deepEqual(saved.payload.stickyNotes ?? [], []);
    } finally {
      harness.restore();
    }
  });
});

describe("AC2 (d2) — main hydration source guard", () => {
  it("applyAnnotationHydrationToStore 가 starMarks 도 payload 에서 복원한다", async () => {
    const src = await readFile(resolve(__dirname, "../../main.ts"), "utf-8");
    assert.match(
      src,
      /starMarks:\s*Array\.isArray\(incoming\.starMarks\)\s*\?\s*incoming\.starMarks\s*:\s*current\.starMarks/
    );
  });
});

// ─── (e) inflight dedup ─────────────────────────────────────────────────

describe("AC2 (e) — inflight dedup", () => {
  it("두 번 동시 호출 시 fetch 1번만 발사", async () => {
    let resolveFirst: (value: Response) => void = () => {};
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        })
    });
    try {
      const p1 = fetchAnnotationsForSubject("s1", harness.ctx, harness.cb);
      const p2 = fetchAnnotationsForSubject("s1", harness.ctx, harness.cb);
      // 두 번째 호출은 inflight set 으로 즉시 return — batch fetch 1번만
      assert.equal(harness.fetchCalls.length, 1);
      resolveFirst(
        new Response(JSON.stringify({ annotations: {} }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
      await Promise.all([p1, p2]);
      // batch GET 1회 + (empty annotations → active material 의 single-GET
      // fallback 1회) = total 2. dedup invariant = 두 번째 batch 호출이
      // fetch 발사하지 않은 것 (위 assert).
      assert.equal(harness.fetchCalls.length, 2);
      // batch fetch URL 만 1번
      const batchCalls = harness.fetchCalls.filter((c) =>
        c.url.includes("/by-subject/")
      );
      assert.equal(batchCalls.length, 1);
    } finally {
      harness.restore();
    }
  });
});

// ─── (f) auth-expired 401 ───────────────────────────────────────────────

describe("AC2 (f) — auth-expired 401", () => {
  it("PUT 401 → handleAuthExpired 호출 + recordSyncFailure 호출 안 함", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () => new Response(null, { status: 401 })
    });
    try {
      await putAnnotationToBE("m1", { hello: "world" }, harness.ctx, harness.cb);
      assert.equal(harness.getAuthExpiredCount(), 1);
      assert.ok(!harness.metricCalls.some((m) => m.event === "put.failure"));
    } finally {
      harness.restore();
    }
  });
});

// ─── (g) silent 413/400/404 ─────────────────────────────────────────────

describe("AC2 (g) — silent 413/400/404", () => {
  for (const status of [413, 400, 404]) {
    it(`PUT ${status} → recordSyncFailure 호출 안 함`, async () => {
      const harness = makeHarness({
        sessionUserId: "u1",
        workspace: makeWorkspace("m1"),
        fetchImpl: async () => new Response(null, { status })
      });
      try {
        await putAnnotationToBE("m1", { hello: "world" }, harness.ctx, harness.cb);
        assert.ok(!harness.metricCalls.some((m) => m.event === "put.failure"));
        assert.ok(!harness.metricCalls.some((m) => m.event === "put.success"));
      } finally {
        harness.restore();
      }
    });
  }
});

// ─── (h) PUT chain ordering ─────────────────────────────────────────────

describe("AC2 (h) — PUT chain ordering", () => {
  it("같은 materialId 두 번 PUT → 순차 fetch (chain)", async () => {
    const order: string[] = [];
    let resolveA: ((value: Response) => void) | null = null;
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: () =>
        new Promise<Response>((resolve) => {
          if (!resolveA) {
            resolveA = resolve;
            order.push("A_start");
          } else {
            order.push("B_start");
            resolve(new Response(JSON.stringify({ annotations: {} }), { status: 200 }));
          }
        })
    });
    try {
      const p1 = putAnnotationToBE("m1", { a: 1 }, harness.ctx, harness.cb);
      const p2 = putAnnotationToBE("m1", { b: 2 }, harness.ctx, harness.cb);
      // A fetch 발사, B 는 chain 에서 대기
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(order.length, 1, "B should not start until A resolves");
      resolveA!(new Response(JSON.stringify({ annotations: {} }), { status: 200 }));
      await Promise.all([p1, p2]);
      assert.deepEqual(order, ["A_start", "B_start"]);
    } finally {
      harness.restore();
    }
  });
});

// ─── (i) malformed canonical entry ──────────────────────────────────────

describe("AC2 (i) — malformed canonical entry skip", () => {
  it("batch entry 가 null payload 면 hydration 호출 안 함, 다른 정상 entry 는 계속", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m2"),
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            annotations: {
              m1: { payload: null, updatedAt: "ok" },
              m2: { payload: { stickyNotes: [] }, updatedAt: "2026-05-25T05:00:00Z" }
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    });
    try {
      await fetchAnnotationsForSubject("s1", harness.ctx, harness.cb);
      // m1 = null payload → hydration 미포함; m2 = active → hydration 포함
      assert.equal(harness.hydrationCalls.length, 1);
      assert.equal(harness.hydrationCalls[0]?.hydration.length, 1);
      assert.equal(harness.hydrationCalls[0]?.hydration[0]?.materialId, "m2");
    } finally {
      harness.restore();
    }
  });
});

// ─── (j) malformed stale response ───────────────────────────────────────

describe("AC2 (j) — malformed stale response", () => {
  it("409 with non-object annotations → handleAnnotationStaleResponse false", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () =>
        new Response(JSON.stringify({ annotations: "wrong" }), {
          status: 409,
          headers: { "content-type": "application/json" }
        })
    });
    try {
      await putAnnotationToBE("m1", { hello: "world" }, harness.ctx, harness.cb);
      assert.ok(!harness.metricCalls.some((m) => m.event === "put.success"));
    } finally {
      harness.restore();
    }
  });
});

// ─── (k) invalid revision token ─────────────────────────────────────────

describe("AC2 (k) — invalid revision token skipped", () => {
  it("entry.updatedAt 가 number → revision cache 에 set 안 함 (PUT body 에 clientRevision 없음)", async () => {
    let secondCallBody: string | undefined;
    let call = 0;
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async (_url, init) => {
        call += 1;
        if (call === 1) {
          // batch GET returns malformed updatedAt
          return new Response(
            JSON.stringify({
              annotations: { m1: { payload: {}, updatedAt: 42 } }
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        // PUT — capture body
        secondCallBody = typeof init?.body === "string" ? init.body : undefined;
        return new Response(JSON.stringify({ annotations: {} }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    });
    try {
      await fetchAnnotationsForSubject("s1", harness.ctx, harness.cb);
      await putAnnotationToBE("m1", { x: 1 }, harness.ctx, harness.cb);
      assert.ok(secondCallBody, "second call captured");
      const parsed = JSON.parse(secondCallBody!);
      assert.equal(parsed.clientRevision, undefined, "no clientRevision when malformed updatedAt");
    } finally {
      harness.restore();
    }
  });
});

// ─── (l) metric context scrub ───────────────────────────────────────────

describe("AC2 (l) — metric context scrub allowlist", () => {
  it("onSyncMetricEvent ctx 가 sensitive field (payload/userId/raw materialId/raw error.message) 미포함", async () => {
    const SECRET_USER_ID = "u1";
    const SECRET_MATERIAL_ID = "secret-material-id-abc-xyz-123";
    const SECRET_PAYLOAD_VALUE = "secret-payload-value-not-in-log";
    const SECRET_ERROR_MESSAGE = "network down — secret in message";
    const SECRET_REVISION = "secret-revision-token-2026-xyz";
    const harness = makeHarness({
      sessionUserId: SECRET_USER_ID,
      workspace: makeWorkspace(SECRET_MATERIAL_ID),
      fetchImpl: async () => {
        throw new TypeError(SECRET_ERROR_MESSAGE);
      }
    });
    try {
      await putAnnotationToBE(
        SECRET_MATERIAL_ID,
        { secret: SECRET_PAYLOAD_VALUE, revisionToken: SECRET_REVISION },
        harness.ctx,
        harness.cb
      );
      // (1) allowed key 만 사용
      for (const call of harness.metricCalls) {
        const keys = Object.keys(call.ctx ?? {});
        for (const k of keys) {
          assert.ok(
            ["materialIdHash", "subjectIdHash", "httpStatus", "errorClass", "durationMs", "retryCount"].includes(k),
            `metric ctx field ${k} must be in allowlist`
          );
        }
      }
      // (2) value-level non-leakage assertion (Gate 6 round-3 P1)
      const allMetricValues = harness.metricCalls.flatMap((c) =>
        Object.values(c.ctx ?? {}).map((v) => String(v))
      );
      const serializedMetrics = JSON.stringify(harness.metricCalls);
      const forbiddenValues = [
        SECRET_USER_ID,
        SECRET_MATERIAL_ID,
        SECRET_PAYLOAD_VALUE,
        SECRET_ERROR_MESSAGE,
        SECRET_REVISION
      ];
      for (const forbidden of forbiddenValues) {
        for (const value of allMetricValues) {
          assert.ok(
            !value.includes(forbidden),
            `metric value must not leak '${forbidden}' (got '${value}')`
          );
        }
        assert.ok(
          !serializedMetrics.includes(forbidden),
          `serialized metric must not leak '${forbidden}'`
        );
      }
    } finally {
      harness.restore();
    }
  });
});

// ─── (m) fail-closed unauthenticated ────────────────────────────────────

describe("AC2 (m) — fail-closed when getSessionUserId undefined", () => {
  it("PUT skip — no fetch, no hydration, no metric event", async () => {
    const harness = makeHarness({
      sessionUserId: undefined,
      workspace: makeWorkspace("m1")
    });
    try {
      await putAnnotationToBE("m1", { x: 1 }, harness.ctx, harness.cb);
      assert.equal(harness.fetchCalls.length, 0);
      assert.equal(harness.hydrationCalls.length, 0);
      assert.equal(harness.metricCalls.length, 0);
    } finally {
      harness.restore();
    }
  });

  it("batch GET skip — no fetch", async () => {
    const harness = makeHarness({
      sessionUserId: undefined,
      workspace: makeWorkspace("m1")
    });
    try {
      await fetchAnnotationsForSubject("s1", harness.ctx, harness.cb);
      assert.equal(harness.fetchCalls.length, 0);
    } finally {
      harness.restore();
    }
  });

  it("single GET skip — no fetch", async () => {
    const harness = makeHarness({
      sessionUserId: undefined,
      workspace: makeWorkspace("m1")
    });
    try {
      await fetchAnnotationIfMissing("s1", "m1", harness.ctx, harness.cb);
      assert.equal(harness.fetchCalls.length, 0);
    } finally {
      harness.restore();
    }
  });
});

// ─── (m1) URL path segment encoding ─────────────────────────────────────

describe("AC2 (m1) — URL path segment encoding", () => {
  it("materialId 의 reserved char 는 encodeURIComponent 적용", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("a/b?c#d%e"),
      fetchImpl: async () =>
        new Response(JSON.stringify({ annotations: {} }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    });
    try {
      await putAnnotationToBE("a/b?c#d%e", { x: 1 }, harness.ctx, harness.cb);
      assert.ok(harness.fetchCalls[0]?.url.endsWith("/api/v1/pdf-annotations/a%2Fb%3Fc%23d%25e"));
    } finally {
      harness.restore();
    }
  });

  it("subjectId 의 reserved char 는 encodeURIComponent 적용 (batch endpoint)", async () => {
    const harness = makeHarness({
      sessionUserId: "u1",
      workspace: makeWorkspace("m1"),
      fetchImpl: async () =>
        new Response(JSON.stringify({ annotations: {} }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    });
    try {
      await fetchAnnotationsForSubject("a/b?c", harness.ctx, harness.cb);
      assert.ok(harness.fetchCalls[0]?.url.endsWith("/api/v1/pdf-annotations/by-subject/a%2Fb%3Fc"));
    } finally {
      harness.restore();
    }
  });
});

// ─── clearAnnotationSyncCaches ──────────────────────────────────────────

describe("clearAnnotationSyncCaches — user 전환 reset", () => {
  it("Map/Set + chain/abort/timers 모두 0", async () => {
    // sync metric helper 로 일부 state 채우기
    const cb: AnnotationSyncCallbacks = {
      setSyncBackendError: () => {},
      setSyncBackendErrorReported: () => {},
      triggerRenderApp: () => {},
      applyAnnotationHydration: () => {},
      handleAuthExpired: () => {}
    };
    recordSyncFailure(cb);
    recordSyncFailure(cb);
    recordSyncFailure(cb);
    clearAnnotationSyncCaches();
    const { _inspectModuleState } = await import("../annotation-sync.ts");
    const state = _inspectModuleState();
    assert.equal(state.putTimersSize, 0);
    assert.equal(state.putAbortsSize, 0);
    assert.equal(state.putChainsSize, 0);
    assert.equal(state.fetchedKeysSize, 0);
    assert.equal(state.lastByMaterialSize, 0);
    assert.equal(state.lastRevisionSize, 0);
    assert.equal(state.pendingPutPayloadsSize, 0);
    assert.equal(state.subjectBatchFetchedSize, 0);
    assert.equal(state.subjectBatchInflightSize, 0);
    assert.equal(state.syncFailureTracker.recentFailuresCount, 0);
    assert.equal(state.syncFailureTracker.paused, false);
  });
});
