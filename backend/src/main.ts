import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
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

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen(port, host);
}

void bootstrap();
