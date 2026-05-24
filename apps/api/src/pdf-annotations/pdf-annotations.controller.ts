import { validateStarMarksInPayload } from "./starMark.dto";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
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
  clientRevision?: string;
}

@Controller({ path: "v1/pdf-annotations" })
@UseGuards(SessionAuthGuard)
export class PdfAnnotationsController {
  constructor(private readonly annotations: PdfAnnotationsService) {}

  /** GET /api/v1/pdf-annotations — opt-in cursor listing (admin/export). */
  @Get()
  async listAllAnnotations(
    @Req() request: AuthenticatedRequest,
    @Query("cursor") cursor?: string
  ) {
    return this.annotations.listAnnotations(request.user.id, cursor ?? undefined);
  }

  /**
   * GET /api/v1/pdf-annotations/by-subject/:subjectId — plan §R2 batch GET.
   * server-side material enumeration via `subjectId × ownerId`. fail-closed:
   * foreign/nonexistent/own-empty subject 모두 동일 응답
   * `{ annotations:{}, truncated:false, total:0, returned:0 }`.
   */
  @Get("by-subject/:subjectId")
  async batchBySubject(
    @Req() request: AuthenticatedRequest,
    @Param("subjectId") subjectId: string
  ) {
    if (!subjectId.trim()) {
      throw new BadRequestException({
        errorCode: "INVALID_SUBJECT_ID",
        errorMessage: "subjectId is required"
      });
    }
    return this.annotations.batchGetBySubject(request.user.id, subjectId);
  }

  /**
   * GET /api/v1/pdf-annotations/:materialId — plan §R6 single-material.
   * material ownership pre-check → not owned: 404. snapshot 없음: empty
   * canonical response.
   */
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
    return this.annotations.getSingleAnnotation(request.user.id, materialId);
  }

  /**
   * PUT /api/v1/pdf-annotations/:materialId — plan §R4 + §R9 (Hybrid CAS).
   * body = { payload, clientRevision? }. clientRevision 없으면 신규 create.
   * 409 = stale revision (canonical schema body 동봉).
   */
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
    // sprint-2/S1 fix (codex P2): enforce object (or array) payload.
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
    if (
      body.clientRevision !== undefined &&
      typeof body.clientRevision !== "string"
    ) {
      throw new BadRequestException({
        errorCode: "INVALID_REVISION",
        errorMessage: "clientRevision must be a string"
      });
    }
    // S6 AC25 + ADR-12 — starMark whole-reject. payload 안 starMarks 1개라도
    // invalid 면 전체 save 400 reject (개별 drop 폐기, audit 투명성).
    try {
      validateStarMarksInPayload(body.payload);
    } catch (err) {
      throw new BadRequestException({
        errorCode: "INVALID_ANNOTATION_PAYLOAD",
        errorMessage: err instanceof Error ? err.message : "invalid starMark payload"
      });
    }
    return this.annotations.putAnnotation(
      request.user.id,
      materialId,
      body.payload,
      body.clientRevision
    );
  }
}
