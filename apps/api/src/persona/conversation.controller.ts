// ConversationController: split REST API로 디공이 multi-turn 대화를 노출한다.
// codex PR review (P1 x3) 적용 — SessionAuthGuard 의무 + ownerId = req.user.id.
import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "@study-note/auth";
import type { UserProfile } from "@study-note/domain";
import {
  AppendConversationTurnRequestDto,
  ConversationHistoryResponse,
  ConversationService,
  ConversationSummaryResponse,
  CreateConversationRequestDto
} from "@study-note/persona-engine";
import { PersonaTurnHttpResult } from "@study-note/persona-engine";

interface NestRequest {
  user?: UserProfile;
}

@Controller("v1/conversations")
@UseGuards(SessionAuthGuard)
export class ConversationController {
  constructor(private readonly conversations: ConversationService) {}

  @Post()
  async create(
    @Body() dto: CreateConversationRequestDto,
    @Req() req: NestRequest
  ): Promise<ConversationSummaryResponse> {
    const owner = req.user as UserProfile;
    return this.conversations.create(dto, owner.id);
  }

  @Get(":id")
  async history(
    @Param("id") id: string,
    @Req() req: NestRequest
  ): Promise<ConversationHistoryResponse> {
    const owner = req.user as UserProfile;
    return this.conversations.history(id, owner.id);
  }

  @Post(":id/turns")
  async appendTurn(
    @Param("id") id: string,
    @Body() dto: AppendConversationTurnRequestDto,
    @Req() req: NestRequest
  ): Promise<PersonaTurnHttpResult> {
    const owner = req.user as UserProfile;
    return this.conversations.appendTurn(id, dto, owner.id);
  }
}
