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
import { UserNotesService } from "./user-notes.service";

interface AuthenticatedRequest {
  user: UserProfile;
}

interface PutBody {
  body?: unknown;
}

@Controller({ path: "v1/notes" })
@UseGuards(SessionAuthGuard)
export class UserNotesController {
  constructor(private readonly notes: UserNotesService) {}

  // Bulk opt-in restore endpoint. Returns paginated items for the authenticated user.
  @Get()
  async listAllNotes(
    @Req() request: AuthenticatedRequest,
    @Query("cursor") cursor?: string
  ) {
    return this.notes.listNotes(request.user.id, cursor ?? undefined);
  }

  // Per-resource hot path (default).
  @Get("week/:weekId")
  async getWeekNote(
    @Req() request: AuthenticatedRequest,
    @Param("weekId") weekId: string
  ) {
    if (!weekId.trim()) {
      throw new BadRequestException({
        errorCode: "INVALID_WEEK_ID",
        errorMessage: "weekId is required"
      });
    }
    const record = await this.notes.getNote(request.user.id, weekId);
    if (!record) {
      throw new NotFoundException({
        errorCode: "NOTE_NOT_FOUND",
        errorMessage: `note not found for weekId=${weekId}`
      });
    }
    return { weekId, ...record };
  }

  @Put("week/:weekId")
  @HttpCode(200)
  async putWeekNote(
    @Req() request: AuthenticatedRequest,
    @Param("weekId") weekId: string,
    @Body() body: PutBody
  ) {
    if (!weekId.trim()) {
      throw new BadRequestException({
        errorCode: "INVALID_WEEK_ID",
        errorMessage: "weekId is required"
      });
    }
    if (typeof body?.body !== "string") {
      throw new BadRequestException({
        errorCode: "INVALID_BODY",
        errorMessage: "body field must be a string"
      });
    }
    const record = await this.notes.putNote(
      request.user.id,
      weekId,
      body.body
    );
    return { weekId, ...record };
  }
}
