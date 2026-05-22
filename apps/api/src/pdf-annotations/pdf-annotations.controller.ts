import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { SessionAuthGuard } from "@study-note/auth";
import type { UserProfile } from "@study-note/domain";
import { PdfAnnotationsService } from "./pdf-annotations.service";

interface AuthenticatedRequest {
  user: UserProfile;
}

interface PutBody {
  payload?: unknown;
}

@Controller({ path: "v1/pdf-annotations" })
@UseGuards(SessionAuthGuard)
export class PdfAnnotationsController {
  constructor(private readonly annotations: PdfAnnotationsService) {}

  @Get()
  async listAllAnnotations(
    @Req() request: AuthenticatedRequest,
    @Query("cursor") cursor?: string
  ) {
    return this.annotations.listAnnotations(request.user.id, cursor ?? undefined);
  }

  @Get(":materialId")
  async getAnnotation(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    if (!materialId.trim()) {
      throw new BadRequestException({
        errorCode: "INVALID_MATERIAL_ID",
        errorMessage: "materialId is required"
      });
    }
    const record = await this.annotations.getAnnotation(request.user.id, materialId);
    if (!record) {
      throw new NotFoundException({
        errorCode: "ANNOTATION_NOT_FOUND",
        errorMessage: `annotation not found for materialId=${materialId}`
      });
    }
    return { materialId, ...record };
  }

  @Put(":materialId")
  @HttpCode(200)
  async putAnnotation(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string,
    @Body() body: PutBody
  ) {
    if (!materialId.trim()) {
      throw new BadRequestException({
        errorCode: "INVALID_MATERIAL_ID",
        errorMessage: "materialId is required"
      });
    }
    // sprint-2/S1 fix (codex P2): enforce object (or array) payload — primitives
    // (string/number/boolean) round-trip but the web hydrate path only applies
    // typeof === "object" payloads, so primitives would become silently
    // unreadable. Reject early at the controller.
    if (
      body?.payload === undefined ||
      body.payload === null ||
      typeof body.payload !== "object"
    ) {
      throw new BadRequestException({
        errorCode: "INVALID_BODY",
        errorMessage: "payload field must be an object"
      });
    }
    const record = await this.annotations.putAnnotation(
      request.user.id,
      materialId,
      body.payload
    );
    return { materialId, ...record };
  }
}
