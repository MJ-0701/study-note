import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  GoneException,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  StreamableFile,
  UseGuards
} from "@nestjs/common";
import type { UserProfile } from "@study-note/domain";
import { RoleGuard, Roles, SessionAuthGuard } from "@study-note/auth";
import { MaterialsService, parseMaterialMetadataBody } from "./materials.service";
import { MaterialUploadService, parseUploadIntentBody } from "./material-upload.service";
import { toMaterialPublic } from "./material-public.dto";

interface AuthenticatedRequest {
  user: UserProfile;
}

interface AuthenticatedUploadRequest extends IncomingMessage {
  user: UserProfile;
  headers: IncomingHttpHeaders;
}

@Controller("materials")
@UseGuards(SessionAuthGuard)
export class MaterialsController {
  constructor(
    private readonly uploads: MaterialUploadService,
    private readonly materials: MaterialsService
  ) {}

  @Post("upload-intent")
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async createUploadIntent(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown
  ) {
    const { material, upload } = await this.uploads.createUploadIntent(
      request.user.id,
      parseUploadIntentBody(body)
    );
    return { material: toMaterialPublic(material), upload };
  }

  @Put(":materialId/file")
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async uploadFile(
    @Req() request: AuthenticatedUploadRequest,
    @Param("materialId") materialId: string
  ) {
    return {
      material: toMaterialPublic(
        await this.uploads.uploadFile(request.user.id, materialId, {
          body: request,
          contentType: readSingleHeader(request.headers["content-type"], "content-type"),
          contentLength: readContentLength(request.headers["content-length"])
        })
      )
    };
  }

  @Post(":materialId/complete")
  @HttpCode(200)
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async completeUpload(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    // sprint-W22-sprint-24 / AC4 — log emit 은 service 의 transition 분기 안에서.
    // controller 에서 emit 시 idempotent retry / duplicate callback 가 metric 부풀림
    // (Codex PR #85 round-2 P2 finding).
    return toMaterialPublic(
      await this.uploads.completeUpload(request.user.id, materialId)
    );
  }

  @Get()
  async listMaterials(@Req() request: AuthenticatedRequest) {
    const materials = await this.materials.listMaterials(request.user.id);
    return {
      materials: materials.map(toMaterialPublic)
    };
  }

  @Get(":materialId")
  async getMaterial(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    return {
      material: toMaterialPublic(
        await this.materials.getMaterial(request.user.id, materialId)
      )
    };
  }

  @Patch(":materialId")
  @UseGuards(SessionAuthGuard, RoleGuard)
  @Roles("master", "admin")
  async updateMaterialMetadata(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string,
    @Body() body: unknown
  ) {
    return toMaterialPublic(
      await this.materials.updateMaterialMetadata(
        request.user.id,
        materialId,
        parseMaterialMetadataBody(body)
      )
    );
  }

  @Get(":materialId/file")
  async getFile(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    const result = await this.materials.getFile(request.user.id, materialId);

    return new StreamableFile(result.object.body, {
      type: result.object.contentType,
      disposition: `inline; filename*=UTF-8''${encodeRFC5987ValueChars(result.material.fileName)}`,
      ...(typeof result.object.contentLength === "number"
        ? { length: result.object.contentLength }
        : {})
    });
  }

  @Get(":materialId/download")
  async getDownload(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    const { material, download } = await this.materials.getDownload(request.user.id, materialId);
    return { material: toMaterialPublic(material), download };
  }

  // sprint-W21-sprint-2/S2 R6: legacy annotation endpoints deprecated.
  // S3 stale-write 보호가 적용된 표준 path = `/api/v1/pdf-annotations/:materialId`.
  // 본 두 endpoint 는 revision check 없이 호출되면 cross-device race 보호 우회
  // 가능했음 → 410 Gone + Deprecation header 로 차단. controller layer 만
  // 닫고 service 의 saveAnnotation/getAnnotation 메서드는 보존 (data migration
  // 용도로 backfill 등에 재사용 가능).
  @Put(":materialId/annotation")
  @HttpCode(410)
  saveAnnotationDeprecated() {
    throw new GoneException({
      errorCode: "ANNOTATION_LEGACY_DEPRECATED",
      errorMessage: "Use PUT /api/v1/pdf-annotations/:materialId"
    });
  }

  @Get(":materialId/annotation")
  @HttpCode(410)
  getAnnotationDeprecated() {
    throw new GoneException({
      errorCode: "ANNOTATION_LEGACY_DEPRECATED",
      errorMessage: "Use GET /api/v1/pdf-annotations/:materialId"
    });
  }

  @Get(":materialId/export-bundle")
  async getExportBundle(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    const bundle = await this.materials.getExportBundle(request.user.id, materialId);
    return { ...bundle, material: toMaterialPublic(bundle.material) };
  }
}

function readSingleHeader(
  value: string | string[] | undefined,
  name: string
): string {
  const header = Array.isArray(value) ? value[0] : value;

  if (!header) {
    throw new BadRequestException(`${name} header is required`);
  }

  return header;
}

function readContentLength(value: string | string[] | undefined): number {
  return Number(readSingleHeader(value, "content-length"));
}

function encodeRFC5987ValueChars(value: string): string {
  return encodeURIComponent(value)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
}
