// 운영지표 v2 / AC4 / S5 — widget create telemetry endpoint. FE 가 widget add 시
// fire-and-forget 으로 호출. body = { kind }. 본 controller 가 1줄 metric log 만 emit
// 한다 (AC15: event + kind 외 키 0). Datadog log-derived metric 5개의 단일 source.

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards
} from "@nestjs/common";
import { SessionAuthGuard } from "@study-note/auth";

const ALLOWED_KINDS = ["chart", "table", "star", "drill", "eraser"] as const;
type WidgetKind = (typeof ALLOWED_KINDS)[number];

interface WidgetCreateBody {
  kind: WidgetKind;
}

export function parseWidgetCreateBody(body: unknown): WidgetCreateBody {
  const kind = (body as { kind?: unknown } | null)?.kind;
  if (typeof kind !== "string" || !ALLOWED_KINDS.includes(kind as WidgetKind)) {
    throw new BadRequestException({
      errorCode: "INVALID_WIDGET_KIND",
      errorMessage: `kind must be one of ${ALLOWED_KINDS.join("|")}`
    });
  }
  return { kind: kind as WidgetKind };
}

@Controller("v1/telemetry")
@UseGuards(SessionAuthGuard)
export class TelemetryController {
  // 별도 context 로 Datadog pipeline 에서 식별. PII 0.
  private readonly metricsLogger = new Logger("study-note.metric-event");

  @Post("widget-create")
  @HttpCode(204)
  emitWidgetCreate(@Body() body: unknown): void {
    const { kind } = parseWidgetCreateBody(body);
    this.metricsLogger.log(`event=study_note.event.${kind}_create`);
  }
}
