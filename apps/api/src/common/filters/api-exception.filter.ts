import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";

// Minimal inline type — avoids importing @types/express which is not a dependency.
interface NestResponse {
  status(code: number): NestResponse;
  json(body: unknown): void;
}

interface ErrorResponseBody {
  errorCode: string;
  errorMessage: string;
}

/**
 * Converts all HttpExceptions to the canonical {errorCode, errorMessage} shape
 * mandated by CLAUDE.md API conventions.
 *
 * Detection logic for already-shaped bodies:
 *   If exception.getResponse() is an object with an `errorCode` string field
 *   the body is passed through untouched (ValidationPipe already shapes these).
 */
@Catch(HttpException)
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<NestResponse>();
    const status = exception.getStatus();
    const raw = exception.getResponse();

    // Pass-through if already in canonical shape (e.g. ValidationPipe or
    // explicit {errorCode, errorMessage} throws from controllers/services)
    if (
      raw &&
      typeof raw === "object" &&
      typeof (raw as Record<string, unknown>)["errorCode"] === "string"
    ) {
      const shaped = raw as ErrorResponseBody;
      this.logByStatus(status, shaped.errorCode, shaped.errorMessage);
      response.status(status).json(shaped);
      return;
    }

    const errorBody = this.toErrorResponse(status, raw);
    this.logByStatus(status, errorBody.errorCode, errorBody.errorMessage);
    response.status(status).json(errorBody);
  }

  private toErrorResponse(status: number, raw: unknown): ErrorResponseBody {
    // NestJS default: raw can be a string or { statusCode, message, error }
    if (typeof raw === "string") {
      return { errorCode: this.statusToCode(status), errorMessage: raw };
    }

    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const message =
        typeof obj["message"] === "string"
          ? obj["message"]
          : this.statusToMessage(status);
      return { errorCode: this.statusToCode(status), errorMessage: message };
    }

    return {
      errorCode: this.statusToCode(status),
      errorMessage: this.statusToMessage(status)
    };
  }

  private statusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "AUTH_REQUIRED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "SERVICE_UNAVAILABLE";
      default:
        return "HTTP_ERROR";
    }
  }

  private statusToMessage(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "bad request";
      case HttpStatus.UNAUTHORIZED:
        return "sign-in required";
      case HttpStatus.FORBIDDEN:
        return "forbidden";
      case HttpStatus.NOT_FOUND:
        return "not found";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "service unavailable";
      default:
        return "unexpected error";
    }
  }

  private logByStatus(status: number, code: string, message: string): void {
    if (status >= 500) {
      this.logger.error(`[${code}] ${message} (HTTP ${status})`);
    } else {
      this.logger.warn(`[${code}] ${message} (HTTP ${status})`);
    }
  }
}
