// 운영지표 v2 / S5 / AC4 — TelemetryController spec. valid 5 kind + invalid kind →
// 400 + missing body + PII no-emit (event 줄에 kind 외 키 0).

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { parseWidgetCreateBody, TelemetryController } from "../telemetry.controller";

describe("parseWidgetCreateBody", () => {
  it("accepts each of the 5 allowed kinds", () => {
    for (const kind of ["chart", "table", "star", "drill", "eraser"] as const) {
      assert.equal(parseWidgetCreateBody({ kind }).kind, kind);
    }
  });

  it("rejects unknown kind with BadRequestException(INVALID_WIDGET_KIND)", () => {
    assert.throws(
      () => parseWidgetCreateBody({ kind: "rectangle" }),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException);
        const body = (err as BadRequestException).getResponse() as { errorCode?: string };
        assert.equal(body.errorCode, "INVALID_WIDGET_KIND");
        return true;
      }
    );
  });

  it("rejects missing body / non-object", () => {
    assert.throws(() => parseWidgetCreateBody(undefined), BadRequestException);
    assert.throws(() => parseWidgetCreateBody(null), BadRequestException);
    assert.throws(() => parseWidgetCreateBody("chart"), BadRequestException);
  });

  it("rejects body without kind", () => {
    assert.throws(() => parseWidgetCreateBody({}), BadRequestException);
  });

  it("ignores extra fields (kind == valid → ok)", () => {
    assert.equal(
      parseWidgetCreateBody({ kind: "chart", userId: "leak-attempt" }).kind,
      "chart"
    );
  });
});

describe("TelemetryController.emitWidgetCreate", () => {
  it("invokes parseWidgetCreateBody and emits expected log line shape", () => {
    const ctrl = new TelemetryController();
    const emitted: string[] = [];
    (ctrl as unknown as { metricsLogger: { log: (m: string) => void } }).metricsLogger = {
      log: (m: string) => emitted.push(m)
    };
    ctrl.emitWidgetCreate({ kind: "chart" });
    ctrl.emitWidgetCreate({ kind: "star" });
    ctrl.emitWidgetCreate({ kind: "eraser" });

    assert.deepEqual(emitted, [
      "event=study_note.event.chart_create",
      "event=study_note.event.star_create",
      "event=study_note.event.eraser_create"
    ]);
    // PII invariant — emitted strings contain only "event=..._create" tokens.
    for (const line of emitted) {
      for (const banned of ["userId", "studentNumber", "email", "kind=", "payload"]) {
        if (banned === "kind=") continue; // allowed in future; not currently emitted
        assert.equal(line.includes(banned), false, `${banned} must not appear`);
      }
    }
  });

  it("propagates BadRequest for invalid kind without emitting", () => {
    const ctrl = new TelemetryController();
    const emitted: string[] = [];
    (ctrl as unknown as { metricsLogger: { log: (m: string) => void } }).metricsLogger = {
      log: (m: string) => emitted.push(m)
    };
    assert.throws(() => ctrl.emitWidgetCreate({ kind: "evil" }), BadRequestException);
    assert.equal(emitted.length, 0);
  });
});
