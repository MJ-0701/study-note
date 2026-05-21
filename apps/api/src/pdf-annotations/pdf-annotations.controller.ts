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
    if (body?.payload === undefined || body.payload === null) {
      throw new BadRequestException({
        errorCode: "INVALID_BODY",
        errorMessage: "payload field is required"
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
