import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  StreamableFile,
  UseGuards
} from "@nestjs/common";
import type { UserProfile } from "@study-note/domain";
import { SessionAuthGuard } from "@study-note/auth";
import { MaterialsService, parseAnnotationBody, parseUploadIntentBody } from "./materials.service";

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
  constructor(private readonly materials: MaterialsService) {}

  @Post("upload-intent")
  async createUploadIntent(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown
  ) {
    return this.materials.createUploadIntent(
      request.user.id,
      parseUploadIntentBody(body)
    );
  }

  @Put(":materialId/file")
  async uploadFile(
    @Req() request: AuthenticatedUploadRequest,
    @Param("materialId") materialId: string
  ) {
    return {
      material: await this.materials.uploadFile(request.user.id, materialId, {
        body: request,
        contentType: readSingleHeader(request.headers["content-type"], "content-type"),
        contentLength: readContentLength(request.headers["content-length"])
      })
    };
  }

  @Get()
  async listMaterials(@Req() request: AuthenticatedRequest) {
    return {
      materials: await this.materials.listMaterials(request.user.id)
    };
  }

  @Get(":materialId")
  async getMaterial(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    return {
      material: await this.materials.getMaterial(request.user.id, materialId)
    };
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
    return this.materials.getDownload(request.user.id, materialId);
  }

  @Put(":materialId/annotation")
  async saveAnnotation(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string,
    @Body() body: unknown
  ) {
    return {
      annotation: await this.materials.saveAnnotation(
        request.user.id,
        materialId,
        parseAnnotationBody(body)
      )
    };
  }

  @Get(":materialId/annotation")
  async getAnnotation(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    return {
      annotation: await this.materials.getAnnotation(request.user.id, materialId)
    };
  }

  @Get(":materialId/export-bundle")
  async getExportBundle(
    @Req() request: AuthenticatedRequest,
    @Param("materialId") materialId: string
  ) {
    return this.materials.getExportBundle(request.user.id, materialId);
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
