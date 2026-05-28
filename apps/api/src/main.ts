import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";

async function bootstrap() {
  // sprint-2 round 4 finding F1 — startup-time fail-closed (lazy throw 만으로는 misconfigured
  // runtime 이 /api/health 까지 통과 가능). app boot 전에 명시 검증.
  const sessionPepper =
    process.env.SESSION_TOKEN_PEPPER ?? process.env.STUDY_NOTE_SESSION_TOKEN_PEPPER;
  if (!sessionPepper?.trim()) {
    throw new Error(
      "SESSION_TOKEN_PEPPER missing — fail-closed at startup (set SESSION_TOKEN_PEPPER or STUDY_NOTE_SESSION_TOKEN_PEPPER in .env / environment, see .env.example)."
    );
  }
  if (!process.env.STORAGE_PROVIDER?.trim()) {
    throw new Error(
      "STORAGE_PROVIDER missing — fail-closed at startup (set STORAGE_PROVIDER=local or s3 in .env / environment, see .env.example)."
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn", "log"]
  });
  // JSON body parser limit. 2026-05-28: 640kb → 10mb. annotation snapshot 의
  // MAX_PAYLOAD_BYTES(=4MB content)를 heavy JSON escape(`\"`,`\\`,UTF-8 multi-byte)
  // 포함해 raw 로 수용하려면 parser 한도 = content × ~2.5 = 10mb. 실제 content cap 은
  // pdf-annotations.service 의 MAX_PAYLOAD_BYTES 가 정확히 enforce (413 emission).
  app.useBodyParser("json", { limit: "10mb" });
  // slice-2: global exception filter — maps all HttpExceptions to {errorCode, errorMessage}
  // per CLAUDE.md API convention.
  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix("api");
  // sprint-2 plan §5.1 + §3 AC10(b) — CORS allowlist (prod 의 cloud 도메인은 별 운영 ADR 책임).
  // dev allowlist default = vite (5173) + docker-compose web (80). 추가 origin 은 env 로 inject.
  const defaultAllowedOrigins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://localhost"
  ];
  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultAllowedOrigins;
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });
  // sprint-5 plan §3 AC3 — DTO validation. CLAUDE.md API conv 의 errorResponse shape
  // (`{errorCode, errorMessage}`) 으로 emit (default Nest 의 `{statusCode, message, error}` 대신).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const first = errors[0];
        const constraint = first?.constraints
          ? Object.values(first.constraints)[0]
          : "validation failed";
        const field = first?.property ?? "request";
        return new BadRequestException({
          errorCode: "VALIDATION_ERROR",
          errorMessage: `${field}: ${constraint}`
        });
      }
    })
  );

  const port = Number(process.env.PORT ?? 3010);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen(port, host);
}

void bootstrap();
