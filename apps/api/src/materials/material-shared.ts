// MaterialUploadService 와 MaterialsService 가 공유하는 검증/예외 헬퍼 (DDD F-3 분할 시 cross-service inject 대신 무상태 공유 모듈로 추출).
import { BadRequestException, NotFoundException } from "@nestjs/common";

export function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new BadRequestException("Request body is required");
  }

  return value as Record<string, unknown>;
}

export function materialNotFound(): NotFoundException {
  return new NotFoundException({
    errorCode: "MATERIAL_NOT_FOUND",
    errorMessage: "PDF material not found"
  });
}

export function requireString(value: string, name: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new BadRequestException(`${name} is required`);
  }

  return trimmed;
}

// S3 AC12 — canonical YYYY-MM-DD reparse. calendar overflow (2026-02-30) 차단.
export function parseIsoDateOrThrow(value: string, name: string): Date {
  const trimmed = requireString(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new BadRequestException(`${name} must be YYYY-MM-DD`);
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${name} invalid date`);
  }
  const canonical = parsed.toISOString().slice(0, 10);
  if (canonical !== trimmed) {
    throw new BadRequestException(`${name} calendar overflow (non-canonical)`);
  }
  return parsed;
}
