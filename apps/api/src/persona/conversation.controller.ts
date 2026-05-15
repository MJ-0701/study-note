// ConversationController: split REST API로 디공이 multi-turn 대화를 노출한다.
// codex PR review (P1 x3) 적용 — SessionAuthGuard 의무 + ownerId = req.user.id.
// sprint-8 slice-1: GET /v1/conversations (LIST) 추가 — ownerId filter + 무제한.
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "@study-note/auth";
import type { UserProfile } from "@study-note/domain";
import {
  AppendConversationTurnRequestDto,
  ConversationHistoryResponse,
  ConversationListItem,
  ConversationService,
  ConversationSummaryResponse,
  CreateConversationRequestDto,
  ListConversationsQueryDto
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

  // sprint-8 slice-1 — GET /v1/conversations[?subject=<slug>]
  // 응답 = ConversationListItem[] (CLAUDE.md 의 wrapper 없는 직접 반환).
  @Get()
  async list(
    @Query() query: ListConversationsQueryDto,
    @Req() req: NestRequest
  ): Promise<ConversationListItem[]> {
    const owner = req.user as UserProfile;
    return this.conversations.list(owner.id, query);
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
