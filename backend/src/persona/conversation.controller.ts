// ConversationController: split REST API로 디공이 multi-turn 대화를 노출한다.
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  AppendConversationTurnRequestDto,
  CreateConversationRequestDto
} from "./dto/conversation.dto";
import {
  ConversationHistoryResponse,
  ConversationService,
  ConversationSummaryResponse,
  PersonaTurnHttpResult
} from "./services/conversation.service";

@Controller("v1/conversations")
export class ConversationController {
  constructor(private readonly conversations: ConversationService) {}

  @Post()
  async create(@Body() dto: CreateConversationRequestDto): Promise<ConversationSummaryResponse> {
    return this.conversations.create(dto);
  }

  @Get(":id")
  async history(@Param("id") id: string): Promise<ConversationHistoryResponse> {
    return this.conversations.history(id);
  }

  @Post(":id/turns")
  async appendTurn(
    @Param("id") id: string,
    @Body() dto: AppendConversationTurnRequestDto
  ): Promise<PersonaTurnHttpResult> {
    return this.conversations.appendTurn(id, dto);
  }
}
